/**
 * @file tree.jsx —— TreeCell（树）预设
 *
 * 树形结构：nodes 为任意嵌套的 [{id, title, children?}]，expanded 为展开节点
 * id 列表，selected 为选中节点 id（主色加粗高亮）。▶/▼ 切换展开/收起，
 * 点击节点行选中。递归渲染（TreeItemView 仅接收 props，不调 hooks）。
 * 帧内纵向滚动（moveY true）。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';

/**
 * 树节点行：递归渲染，接收普通 props（不调 hooks）；子节点展开时递归渲染。
 * @param {{node: object, depth: number, expanded: string[], selected: string, onToggle: Function, onSelect: Function}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TreeItemView({ node, depth, expanded, selected, onToggle, onSelect }) {
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
          color: active ? '#4a90d9' : '#333', fontWeight: active ? 'bold' : 'normal',
        }}
      >
        <span
          onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
          style={{ width: 16, flexShrink: 0, textAlign: 'center', color: '#999' }}
        >
          {hasChildren ? (isExpanded ? '▼' : '▶') : ''}
        </span>
        <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.title}</span>
      </div>
      {hasChildren && isExpanded ? (
        <div style={{ width: '100%' }}>
          {node.children.map(child => (
            <TreeItemView key={child.id} node={child} depth={depth + 1} expanded={expanded} selected={selected} onToggle={onToggle} onSelect={onSelect} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * 树视图：订阅 nodes/expanded/selected，渲染根节点列表（空时显示占位）。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TreeView({ cell }) {
  const nodes = useCellData(cell, 'nodes') || [];
  const expanded = useCellData(cell, 'expanded') || [];
  const selected = useCellData(cell, 'selected');
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
          justifyContent: 'center', fontSize: 12, color: '#999',
        }}>
          暂无数据
        </div>
      ) : (
        nodes.map(node => (
          <TreeItemView key={node.id} node={node} depth={0} expanded={expanded} selected={selected} onToggle={onToggle} onSelect={onSelect} />
        ))
      )}
    </div>
  );
}

/**
 * TreeCell：树。nodes 为任意嵌套的 [{id, title, children?}]，expanded 为展开
 * 节点 id 列表，selected 为选中节点 id；▶/▼ 切换展开，点击节点行选中。
 */
class TreeCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.moveY(true).layout('vertical').backgroundColor('#ffffff')
      .schema({
        nodes: { type: 'array', default: [] },
        expanded: { type: 'array', default: [] },
        selected: { type: 'string', default: '' },
      })
      .renderContent(TreeView);
  }
}

export { TreeCell };
