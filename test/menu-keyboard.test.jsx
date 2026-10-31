// @vitest-environment jsdom
/**
 * @file MenuImpl 键盘导航组件测试（a11y 第二批）：
 *       roving tabindex、方向键移动焦点、横向即时激活、Home/End、
 *       纵向 Enter 经原生 click 走与鼠标同一 onSelect 路径。
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MenuImpl } from '../src/builtin-cells/menu';

const ITEMS = [
  { id: 'a', title: 'A' },
  { id: 'b', title: 'B' },
  { id: 'c', title: 'C' },
];

const buttonsOf = (container) => Array.from(container.querySelectorAll('button'));

describe('MenuImpl 纵向（menu/listbox）', () => {
  it('角色与 roving tabindex：默认焦点项为选中项', () => {
    const { container } = render(<MenuImpl items={ITEMS} activeId="b" direction="vertical" onSelect={() => {}} />);
    const btns = buttonsOf(container);
    expect(container.querySelector('div[role="menu"]')).toBeTruthy();
    expect(btns.map((b) => b.getAttribute('role'))).toEqual(['menuitem', 'menuitem', 'menuitem']);
    expect(btns.map((b) => b.tabIndex)).toEqual([-1, 0, -1]);
  });

  it('ArrowDown/ArrowUp 移动焦点并环绕', () => {
    const { container } = render(<MenuImpl items={ITEMS} activeId="b" direction="vertical" onSelect={() => {}} />);
    const btns = buttonsOf(container);
    btns[1].focus();
    fireEvent.keyDown(btns[1], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(btns[2]);
    fireEvent.keyDown(btns[2], { key: 'ArrowDown' }); // 环绕回首项
    expect(document.activeElement).toBe(btns[0]);
    fireEvent.keyDown(btns[0], { key: 'ArrowUp' }); // 环绕回末项
    expect(document.activeElement).toBe(btns[2]);
  });

  it('Home/End 跳首尾；Enter 经原生 click 触发 onSelect（与鼠标同路径）', () => {
    const onSelect = vi.fn();
    const { container } = render(<MenuImpl items={ITEMS} activeId="a" direction="vertical" onSelect={onSelect} />);
    const btns = buttonsOf(container);
    btns[0].focus();
    fireEvent.keyDown(btns[0], { key: 'End' });
    expect(document.activeElement).toBe(btns[2]);
    fireEvent.keyDown(btns[2], { key: 'Home' });
    expect(document.activeElement).toBe(btns[0]);
    fireEvent.keyDown(btns[0], { key: 'Enter' }); // jsdom 不实现 Enter→click 激活行为，
    fireEvent.click(btns[0]);                     // 用 click 复现浏览器 Enter 后的等价路径
    expect(onSelect).toHaveBeenCalledWith('a');
  });

  it('role/itemRole 覆盖（listbox/option）+ aria-selected 同步', () => {
    const { container } = render(
      <MenuImpl items={ITEMS} activeId="b" direction="vertical" role="listbox" itemRole="option" onSelect={() => {}} />,
    );
    const btns = buttonsOf(container);
    expect(btns[1].getAttribute('role')).toBe('option');
    expect(btns[1].getAttribute('aria-selected')).toBe('true');
    expect(btns[0].getAttribute('aria-selected')).toBe('false');
  });
});

describe('MenuImpl 横向（tablist 组装）', () => {
  it('ArrowRight/ArrowLeft 移动焦点并即时激活（自动激活模式）', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <MenuImpl items={ITEMS} activeId="a" direction="horizontal" role="tablist" itemRole="tab" onSelect={onSelect} />,
    );
    const btns = buttonsOf(container);
    btns[0].focus();
    fireEvent.keyDown(btns[0], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(btns[1]);
    expect(onSelect).toHaveBeenCalledWith('b');
    fireEvent.keyDown(btns[1], { key: 'ArrowLeft' });
    expect(onSelect).toHaveBeenCalledWith('a');
  });
});
