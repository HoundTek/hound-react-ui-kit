/**
 * @file 统一事件 API（on/off/emit）回归用例：注册顺序、多处理器、off、
 *       预设 Cell 语义命名（press/select/change/…）、tab-bar 废弃别名、destroy 清理。
 */
import { describe, it, expect, vi } from 'vitest';
import {
  DataDag, CellBaseBuilder, createRuntime,
  ButtonCell, NavBarCell, TabBarCell, PaginationCell,
} from '../src/index.jsx';

class Plain extends CellBaseBuilder {}

describe('on / off / emit', () => {
  it('多处理器按注册顺序触发，emit 返回是否有处理器', () => {
    const c = new Plain('c');
    const order = [];
    c.on('press', () => order.push(1));
    c.on('press', () => order.push(2));
    expect(c.emit('press')).toBe(true);
    expect(order).toEqual([1, 2]);
    expect(c.emit('nope')).toBe(false);
  });

  it('off 移除单个或全部处理器', () => {
    const c = new Plain('c');
    const h1 = vi.fn(); const h2 = vi.fn();
    c.on('change', h1).on('change', h2);
    c.off('change', h1);
    c.emit('change', 5);
    expect(h1).not.toHaveBeenCalled();
    expect(h2).toHaveBeenCalledWith(5);
    c.off('change');
    c.emit('change', 6);
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it('处理器内 off 安全（遍历副本）', () => {
    const c = new Plain('c');
    const h2 = vi.fn();
    c.on('ok', () => c.off('ok', h2));
    c.on('ok', h2);
    c.emit('ok');
    expect(h2).toHaveBeenCalledTimes(1);
    c.emit('ok');
    expect(h2).toHaveBeenCalledTimes(1);
  });
});

describe('预设 Cell 事件语义', () => {
  const mountInto = (cell) => {
    const dag = new DataDag({ runtime: createRuntime() });
    cell.mount(dag._root);
    return cell;
  };

  it('ButtonCell.onPress 注册 press 事件（可多个）', () => {
    const btn = mountInto(new ButtonCell('btn'));
    const h1 = vi.fn(); const h2 = vi.fn();
    btn.onPress(h1).onPress(h2);
    btn.emit('press');
    expect(h1).toHaveBeenCalled();
    expect(h2).toHaveBeenCalled();
  });

  it('NavBarCell.onSelect 注册 select 事件并携带 id', () => {
    const nav = mountInto(new NavBarCell('nav'));
    const h = vi.fn();
    nav.onSelect(h);
    nav.emit('select', 'workbench');
    expect(h).toHaveBeenCalledWith('workbench');
  });

  it('PaginationCell.onChange 注册 change 事件', () => {
    const p = mountInto(new PaginationCell('p'));
    const h = vi.fn();
    p.onChange(h);
    p.emit('change', 3);
    expect(h).toHaveBeenCalledWith(3);
  });

  it('TabBarCell 规范 onSelect；onChange 为别名（同触发 select 事件）', () => {
    const t = mountInto(new TabBarCell('t'));
    const hs = vi.fn(); const hc = vi.fn();
    t.onSelect(hs);
    t.onChange(hc); // deprecated alias
    t.emit('select', 'b2');
    expect(hs).toHaveBeenCalledWith('b2');
    expect(hc).toHaveBeenCalledWith('b2');
  });

  it('destroy 清空事件注册表', () => {
    const dag = new DataDag({ runtime: createRuntime() });
    const c = new Plain('c2');
    const h = vi.fn();
    c.on('press', h);
    c.mount(dag._root);
    c.destroy();
    expect(c.emit('press')).toBe(false);
    expect(h).not.toHaveBeenCalled();
  });
});
