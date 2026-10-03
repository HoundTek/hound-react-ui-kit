/**
 * @file tree.jsx —— TreeCell（树）高级 Cell
 *
 * 菜单/列表族：树形结构（见 docs/basic-cell-design.md）。nodes 为任意嵌套的
 * [{id, title, children?}]，expanded 为展开节点 id 列表，selected 为选中
 * 节点 id（主色加粗高亮）。箭头标记（SVG 字形）切换展开/收起，点击节点行选中。
 * 递归渲染（TreeItemView 仅接收 props，不调 hooks）。
 * 帧内纵向滚动（moveY true）。
 * 主题可经 theme.components.tree 整体重写呈现实现。
 *
 * Schema（数据契约，与旧版一致）：nodes / expanded / selected。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useThemeColor } from '../core/theme/theme-react';
import { GlyphChevron } from '../basic-cells/glyphs';

/**
 * 树节点行：递归渲染，接收普通 props（不调 hooks）；子节点展开时递归渲染。
 * 展开/收起钮保留 16px 定宽字形槽（ButtonImpl 的固定水平内边距无法落入
 * 该槽位，且会破坏叶节点与父节点的标题对齐）。
 * @param {{node: object, depth: number, expanded: string[], selected: string, primary: string, text: string, textMuted: string, onToggle: Function, onSelect: Function}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TreeItemView({ node, depth, expanded, selected, primary, text, textMuted, onToggle, onSelect }) {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isExpanded = expanded.includes(node.id);
  const active = node.id === selected;
  return (
    <div style={{ width: '100%' }}>
      <div
        onClick={() => onSelect(node.id)}
        style={{
          display: 'flex', alignItems: 'center', height: 26, paddingLeft: depth * 14,
          fontSize: 13, cursor: 'pointer', userSelect: 'none',
          color: active ? primary : text, fontWeight: active ? 'bold' : 'normal',
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
            <TreeItemView key={child.id} node={child} depth={depth + 1} expanded={expanded} selected={selected} primary={primary} text={text} textMuted={textMuted} onToggle={onToggle} onSelect={onSelect} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * 树组装视图（fallback）：订阅 nodes/expanded/selected，渲染根节点列表
 * （空时显示占位）。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TreeAssembledView({ cell }) {
  const nodes = useCellData(cell, 'nodes') || [];
  const expanded = useCellData(cell, 'expanded') || [];
  const selected = useCellData(cell, 'selected');
  const primary = useThemeColor('primary', '#4a90d9');
  const text = useThemeColor('text', '#333');
  const textMuted = useThemeColor('text-muted', '#999');
  const onToggle = (id) => {
    const next = expanded.includes(id) ? expanded.filter(x => x !== id) : [...expanded, id];
    cell.setExpanded(next);
  };
  const onSelect = (id) => cell.setSelected(id);
  return (
    <div style={{ width: '100%', height: '100%' }}>
      {nodes.length === 0 ? (
        <div style={{
          width: '100%', height: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 12, color: textMuted,
        }}>
          暂无数据
        </div>
      ) : (
        nodes.map(node => (
          <TreeItemView key={node.id} node={node} depth={0} expanded={expanded} selected={selected} primary={primary} text={text} textMuted={textMuted} onToggle={onToggle} onSelect={onSelect} />
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
