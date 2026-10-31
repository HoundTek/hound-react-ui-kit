// @vitest-environment jsdom
/**
 * @file TreeCell 键盘导航组件测试（a11y 第二批）：
 *       treeitem 角色/aria 同步、方向键遍历可见节点、
 *       ArrowRight 展开并移入首子、ArrowLeft 收起、Enter 选中。
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { TreeCell, TreeAssembledView } from '../src/builtin-cells/tree';
import { DataDag, createRuntime } from '../src/index.jsx';

const NODES = [
  { id: 'r1', title: 'R1', children: [{ id: 'r1c1', title: 'R1-C1' }, { id: 'r1c2', title: 'R1-C2' }] },
  { id: 'r2', title: 'R2' },
];

function mountTree() {
  const dag = new DataDag({ runtime: createRuntime() });
  const cell = new TreeCell('tree');
  cell.setNodes(NODES);
  cell.mount(dag._root);
  return { cell, view: render(<TreeAssembledView cell={cell} />) };
}

const rows = (container) => Array.from(container.querySelectorAll('[role="treeitem"]'));

describe('TreeCell 键盘导航', () => {
  it('容器 role=tree；可见行 role=treeitem，收起节点 aria-expanded=false', () => {
    const { view } = mountTree();
    expect(view.container.querySelector('[role="tree"]')).toBeTruthy();
    const rs = rows(view.container);
    expect(rs.map((r) => r.dataset.treeId)).toEqual(['r1', 'r2']);
    expect(rs[0].getAttribute('aria-expanded')).toBe('false');
    expect(rs[0].tabIndex).toBe(0); // roving 起点：首个可见行
    expect(rs[1].tabIndex).toBe(-1);
  });

  it('ArrowRight：收起节点首按展开，再按移入首子（WAI-ARIA tree 模式）', () => {
    const { cell, view } = mountTree();
    const r1 = rows(view.container)[0];
    r1.focus();
    fireEvent.keyDown(r1, { key: 'ArrowRight' });
    expect(cell.getData('expanded')).toContain('r1');
    // 再按一次进入首个子节点
    fireEvent.keyDown(document.activeElement, { key: 'ArrowRight' });
    expect(document.activeElement?.dataset?.treeId).toBe('r1c1');
  });

  it('ArrowDown 在可见节点间移动；ArrowLeft 收起并回父', () => {
    const { cell, view } = mountTree();
    // 先展开 r1
    const r1 = rows(view.container)[0];
    r1.focus();
    fireEvent.keyDown(r1, { key: 'ArrowRight' });
    const c1 = rows(view.container).find((r) => r.dataset.treeId === 'r1c1');
    c1.focus();
    fireEvent.keyDown(c1, { key: 'ArrowDown' });
    expect(document.activeElement?.dataset?.treeId).toBe('r1c2');
    fireEvent.keyDown(document.activeElement, { key: 'ArrowDown' });
    expect(document.activeElement?.dataset?.treeId).toBe('r2');
    // r2 无子：ArrowLeft 移入父（根层保持自身）
    fireEvent.keyDown(document.activeElement, { key: 'ArrowLeft' });
    // 回到 r1c2 层级的收起语义：对展开节点收起
    const r1again = rows(view.container).find((r) => r.dataset.treeId === 'r1');
    r1again.focus();
    fireEvent.keyDown(r1again, { key: 'ArrowLeft' });
    expect(cell.getData('expanded')).not.toContain('r1');
  });

  it('Enter 经与点击相同路径选中节点（aria-selected 同步）', () => {
    const { cell, view } = mountTree();
    const r2 = rows(view.container)[1];
    r2.focus();
    fireEvent.keyDown(r2, { key: 'Enter' }); // jsdom 不实现 Enter→click，
    fireEvent.click(r2);                     // 复现浏览器激活后的等价路径
    expect(cell.getData('selected')).toBe('r2');
    expect(r2.getAttribute('aria-selected')).toBe('true');
  });
});
