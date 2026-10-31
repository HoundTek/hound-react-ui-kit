/**
 * @file tree.jsx —— TreeCell（树）高级 Cell
 *
 * 菜单/列表族：树形结构（见 docs/basic-cell-design.md）。nodes 为任意嵌套的
 * [{id, title, children?}]，expanded 为展开节点 id 列表，selected 为选中
 * 节点 id（主色加粗高亮）。箭头标记（SVG 字形）切换展开/收起，点击节点行选中。
 * 递归渲染（TreeItemView 仅接收 props，不调 hooks）。
 * 键盘可达（WAI-ARIA tree 模式）：容器 role=tree，可见节点行 role=treeitem +
 * aria-expanded（可展开时）/ aria-selected + roving tabindex（焦点行 0，其余
 * -1）；ArrowDown/ArrowUp 在可见节点间移动焦点，ArrowRight 展开收起节点
 * （已展开则移入首子），ArrowLeft 收起展开节点（叶/收起态则移入父节点），
 * Enter/Space 经与行点击相同的 onSelect 路径选中。键盘处理集中在组装视图
 * 容器（事件委托按 data-tree-id 定位节点），TreeItemView 保持无 hooks。
 * 帧内纵向滚动（moveY true）。
 * 主题可经 theme.components.tree 整体重写呈现实现。
 *
 * Schema（数据契约，与旧版一致）：nodes / expanded / selected。
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useThemeColor } from '../core/theme/theme-react';
import { ensureStateLayerStyle } from '../core/theme/state-layer';
import { GlyphChevron } from '../basic-cells/glyphs';

/**
 * 按文档序拍平可见节点（收起的子树不计入），供键盘导航定位上下/父子关系。
 * @param {Array<object>} nodes 节点树
 * @param {string[]} expanded 展开节点 id 列表
 * @param {string|null} [parent=null] 所在层父节点 id
 * @param {Array<{id: string, hasChildren: boolean, isExpanded: boolean, parent: string|null}>} [out=[]] 输出累加
 * @returns {Array<{id: string, hasChildren: boolean, isExpanded: boolean, parent: string|null}>} 可见节点序表
 */
function flattenVisibleNodes(nodes, expanded, parent = null, out = []) {
  (nodes || []).forEach((node) => {
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    const isExpanded = hasChildren && expanded.includes(node.id);
    out.push({ id: node.id, hasChildren, isExpanded, parent });
    if (isExpanded) flattenVisibleNodes(node.children, expanded, node.id, out);
  });
  return out;
}

/**
 * 树节点行：递归渲染，接收普通 props（不调 hooks）；子节点展开时递归渲染。
 * 展开/收起钮保留 16px 定宽字形槽（ButtonImpl 的固定水平内边距无法落入
 * 该槽位，且会破坏叶节点与父节点的标题对齐）。
 * 行本身为可聚焦 treeitem（tabIndex 由 rovingId 决定，聚焦经容器 onFocus
 * 回报）；hk-focus 类提供键盘态焦点环（鼠标点击不显示）。
 * @param {{node: object, depth: number, expanded: string[], selected: string, primary: string, text: string, textMuted: string, rovingId: string|null, registerRow: Function, onToggle: Function, onSelect: Function}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TreeItemView({ node, depth, expanded, selected, primary, text, textMuted, rovingId, registerRow, onToggle, onSelect }) {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isExpanded = expanded.includes(node.id);
  const active = node.id === selected;
  return (
    <div style={{ width: '100%' }}>
      <div
        ref={(el) => registerRow(node.id, el)}
        data-tree-id={node.id}
        role="treeitem"
        aria-selected={active}
        aria-expanded={hasChildren ? isExpanded : undefined}
        tabIndex={node.id === rovingId ? 0 : -1}
        className="hk-focus"
        onClick={() => onSelect(node.id)}
        style={{
          display: 'flex', alignItems: 'center', height: 26, paddingLeft: depth * 14,
          fontSize: 13, cursor: 'pointer', userSelect: 'none',
          color: active ? primary : text, fontWeight: active ? 'bold' : 'normal',
          '--hk-focus': primary,
        }}
      >
        <span
          onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
          style={{
            width: 16, flexShrink: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: textMuted,
          }}
        >
          {hasChildren ? <GlyphChevron dir={isExpanded ? 'down' : 'right'} size={12} /> : null}
        </span>
        <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.title}</span>
      </div>
      {hasChildren && isExpanded ? (
        <div style={{ width: '100%' }}>
          {node.children.map(child => (
            <TreeItemView key={child.id} node={child} depth={depth + 1} expanded={expanded} selected={selected} primary={primary} text={text} textMuted={textMuted} rovingId={rovingId} registerRow={registerRow} onToggle={onToggle} onSelect={onSelect} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * 树组装视图（fallback）：订阅 nodes/expanded/selected，渲染根节点列表
 * （空时显示占位）；承担 tree 容器角色与键盘导航（事件委托按 data-tree-id
 * 定位行，roving tabindex 起点为焦点行，缺省选中行/首个可见行）。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TreeAssembledView({ cell }) {
  ensureStateLayerStyle();
  const nodes = useCellData(cell, 'nodes') || [];
  const expanded = useCellData(cell, 'expanded') || [];
  const selected = useCellData(cell, 'selected');
  const primary = useThemeColor('primary', '#4a90d9');
  const text = useThemeColor('text', '#333');
  const textMuted = useThemeColor('text-muted', '#999');
  const [focusedId, setFocusedId] = useState(null);
  const rowRefs = useRef(new Map());
  const pendingFocusRef = useRef(null);

  const onToggle = (id) => {
    const next = expanded.includes(id) ? expanded.filter(x => x !== id) : [...expanded, id];
    cell.setExpanded(next);
  };
  const onSelect = (id) => cell.setSelected(id);

  const registerRow = useCallback((id, el) => {
    if (el) rowRefs.current.set(id, el);
    else rowRefs.current.delete(id);
  }, []);

  const visible = flattenVisibleNodes(nodes, expanded);
  // roving 起点：焦点行（仍在可见集时），否则选中行（可见时），否则首个可见行
  const rovingId = (focusedId && visible.some(v => v.id === focusedId))
    ? focusedId
    : (visible.some(v => v.id === selected) ? selected : (visible.length > 0 ? visible[0].id : null));

  const focusNode = (id) => {
    setFocusedId(id);
    const el = rowRefs.current.get(id);
    if (el) {
      el.focus();
    } else {
      // 行尚未渲染（如展开后移入首子），渲染提交后经 effect 补焦
      pendingFocusRef.current = id;
    }
  };

  useEffect(() => {
    const id = pendingFocusRef.current;
    if (!id) return;
    const el = rowRefs.current.get(id);
    if (el) {
      pendingFocusRef.current = null;
      el.focus();
    }
  }, [focusedId, expanded]);

  const rowIdFromEvent = (e) => {
    const row = e.target && e.target.closest ? e.target.closest('[data-tree-id]') : null;
    return row ? row.getAttribute('data-tree-id') : null;
  };

  const onKeyDown = (e) => {
    const id = rowIdFromEvent(e);
    if (!id) return;
    const idx = visible.findIndex(v => v.id === id);
    if (idx < 0) return;
    const node = visible[idx];
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (idx < visible.length - 1) focusNode(visible[idx + 1].id);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (idx > 0) focusNode(visible[idx - 1].id);
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (!node.hasChildren) break;
        if (node.isExpanded) focusNode(visible[idx + 1].id); // 可见序中紧随其后即首子
        else onToggle(id);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (node.hasChildren && node.isExpanded) onToggle(id);
        else if (node.parent) focusNode(node.parent);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect(id); // 与行点击同一处理路径
        break;
      default:
        break;
    }
  };

  const onFocus = (e) => {
    const id = rowIdFromEvent(e);
    if (id) setFocusedId(id);
  };

  return (
    <div role={nodes.length > 0 ? 'tree' : undefined} onKeyDown={onKeyDown} onFocus={onFocus}
      style={{ width: '100%', height: '100%' }}>
      {nodes.length === 0 ? (
        <div style={{
          width: '100%', height: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 12, color: textMuted,
        }}>
          暂无数据
        </div>
      ) : (
        nodes.map(node => (
          <TreeItemView key={node.id} node={node} depth={0} expanded={expanded} selected={selected} primary={primary} text={text} textMuted={textMuted} rovingId={rovingId} registerRow={registerRow} onToggle={onToggle} onSelect={onSelect} />
        ))
      )}
    </div>
  );
}

/** kind 'tree' 的实现分发视图 */
const TreeDispatcher = createImplDispatcher('tree', TreeAssembledView);

/**
 * TreeCell：树。nodes 为任意嵌套的 [{id, title, children?}]，expanded 为展开
 * 节点 id 列表，selected 为选中节点 id；箭头标记切换展开，点击节点行选中。
 * 呈现实现由 kind 'tree' 分发（缺省为组装版）。
 */
class TreeCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.moveY(true).layout('vertical').color('surface')
      .schema({
        nodes: { type: 'array', default: [] },
        expanded: { type: 'array', default: [] },
        selected: { type: 'string', default: '' },
      })
      .renderContent(TreeDispatcher);
  }
}

export { TreeCell, TreeAssembledView };
