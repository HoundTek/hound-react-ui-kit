// @vitest-environment jsdom
/**
 * @file a11y 第三批角色回归：Notice/Toast 动态通知 aria-live、
 *       Progress progressbar 值、Switch 开关角色与键盘切换、
 *       Checkbox/Radio 选项语义同步到原生按钮。
 */
import React, { act } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { DataDag, createRuntime } from '../src/index.jsx';
import { NoticeImpl } from '../src/builtin-cells/notice';
import { ProgressCell, ProgressAssembledView } from '../src/builtin-cells/progress';
import { SwitchCell, SwitchAssembledView } from '../src/builtin-cells/switch';
import { OptionImpl } from '../src/builtin-cells/checkbox';

function mountCell(CellCls, id, setup = () => {}) {
  const dag = new DataDag({ runtime: createRuntime() });
  const cell = new CellCls(id);
  setup(cell);
  cell.mount(dag._root);
  return cell;
}

describe('动态通知 aria-live', () => {
  it('error → role=alert + assertive；info → role=status + polite', () => {
    const { rerender } = render(<NoticeImpl text="出错了" type="error" />);
    let el = document.querySelector('[role="alert"]');
    expect(el).toBeTruthy();
    expect(el.getAttribute('aria-live')).toBe('assertive');
    rerender(<NoticeImpl text="提示" type="info" />);
    el = document.querySelector('[role="status"]');
    expect(el.getAttribute('aria-live')).toBe('polite');
  });
});

describe('Progress progressbar', () => {
  it('role=progressbar 且 aria-valuenow 随数据更新', () => {
    const cell = mountCell(ProgressCell, 'p', (c) => c.setPercent(40));
    const { container } = render(<ProgressAssembledView cell={cell} />);
    const bar = container.querySelector('[role="progressbar"]');
    expect(bar.getAttribute('aria-valuenow')).toBe('40');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
    act(() => { cell.setPercent(75); });
    expect(bar.getAttribute('aria-valuenow')).toBe('75');
  });
});

describe('Switch 开关角色与键盘', () => {
  it('role=switch + aria-checked；Enter/Space 切换 enabled', () => {
    const cell = mountCell(SwitchCell, 's', (c) => c.setLabel('通知').setEnabled(false));
    const { container } = render(<SwitchAssembledView cell={cell} />);
    const sw = container.querySelector('[role="switch"]');
    expect(sw.getAttribute('aria-checked')).toBe('false');
    expect(sw.tabIndex).toBe(0);
    fireEvent.keyDown(sw, { key: 'Enter' });
    expect(cell.getData('enabled')).toBe(true);
    fireEvent.keyDown(sw, { key: ' ' });
    expect(cell.getData('enabled')).toBe(false);
  });

  it('disabled：aria-disabled 且键盘不切换', () => {
    const cell = mountCell(SwitchCell, 's2', (c) => c.setEnabled(false).setDisabled(true));
    const { container } = render(<SwitchAssembledView cell={cell} />);
    const sw = container.querySelector('[role="switch"]');
    expect(sw.getAttribute('aria-disabled')).toBe('true');
    fireEvent.keyDown(sw, { key: 'Enter' });
    expect(cell.getData('enabled')).toBe(false);
  });
});

describe('Checkbox/Radio 选项语义', () => {
  it('role 与 aria-checked 同步到内部原生 button', () => {
    const onToggle = vi.fn();
    const { container, rerender } = render(
      <OptionImpl label="同意" checked={false} shape="checkbox" onToggle={onToggle} />,
    );
    let btn = container.querySelector('button');
    expect(btn.getAttribute('role')).toBe('checkbox');
    expect(btn.getAttribute('aria-checked')).toBe('false');
    rerender(<OptionImpl label="同意" checked onToggle={onToggle} />);
    btn = container.querySelector('button');
    expect(btn.getAttribute('aria-checked')).toBe('true');
    // 原生按钮键盘可达：Enter 后浏览器发 click → onToggle
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalled();
  });

  it('radio 形态 role=radio', () => {
    const { container } = render(<OptionImpl label="男" checked shape="radio" onToggle={() => {}} />);
    expect(container.querySelector('button').getAttribute('role')).toBe('radio');
  });
});
