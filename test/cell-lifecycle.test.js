/**
 * @file Cell 生命周期与 runtime 隔离回归用例：
 *       mount 级联、destroy 递归、single-slot 覆盖销毁、浮动窗口注册/注销、
 *       结构变更通知、多 runtime 隔离、实现注册表 runtime 化。
 */
import { describe, it, expect } from 'vitest';
import {
  DataDag, CellBaseBuilder, createRuntime, getDefaultRuntime,
  registerCellImpl, getCellImpl,
} from '../src/index.jsx';

class SimpleCell extends CellBaseBuilder {
  constructor(id) {
    super(id);
    this.schema({ title: { type: 'string', default: 'x' } });
  }
}

describe('Cell mount / destroy', () => {
  it('mount 级联挂载 slot 子 Cell 的数据与 Box', () => {
    const dag = new DataDag({ runtime: createRuntime() });
    const parent = new SimpleCell('parent');
    const child = new SimpleCell('child');
    parent.fill('_default', child);
    parent.mount(dag._root);
    expect(parent.data).not.toBeNull();
    expect(child.data).not.toBeNull();
    expect(child.data.parent).toBe(parent.data);
    expect(parent._mounts.length).toBe(1);
    expect(child._mounts.length).toBe(1);
  });

  it('destroy 递归释放：子 Cell、Box 挂载、数据子树', () => {
    const dag = new DataDag({ runtime: createRuntime() });
    const parent = new SimpleCell('parent');
    const child = new SimpleCell('child');
    parent.fill('_default', child);
    parent.mount(dag._root);
    parent.destroy();
    expect(child.destroyed).toBe(true);
    expect(parent.destroyed).toBe(true);
    expect(parent.data).toBeNull();
    expect(dag._root.getChild('parent')).toBeUndefined();
    parent.destroy(); // 幂等
  });

  it('floatingViewport 挂载注册进 runtime 树，destroy 注销', () => {
    const rt = createRuntime();
    const dag = new DataDag({ runtime: rt });
    const win = new SimpleCell('win');
    win.floatingViewport();
    win.mount(dag._root);
    expect(rt.getFloatingChildren(null)).toContain(win._mounts[0].box);
    win.destroy();
    expect(rt.getFloatingChildren(null)).not.toContain(win._mounts?.[0]?.box);
    expect(rt.getFloatingChildren(null).length).toBe(0);
  });

  it('single-slot 覆盖自动销毁旧子 Cell（新实例除外）', () => {
    const dag = new DataDag({ runtime: createRuntime() });
    const host = new SimpleCell('host');
    host.defineSlot('body', { single: true });
    const oldChild = new SimpleCell('old');
    const newChild = new SimpleCell('new');
    host.fill('body', oldChild);
    host.mount(dag._root);
    host.fill('body', newChild);
    expect(oldChild.destroyed).toBe(true);
    expect(newChild.destroyed).toBe(false);
    expect(host._slots.get('body').children).toEqual([newChild]);
  });

  it('覆盖重填同一实例不销毁自身', () => {
    const dag = new DataDag({ runtime: createRuntime() });
    const host = new SimpleCell('host2');
    host.defineSlot('body', { single: true });
    const c = new SimpleCell('same');
    host.fill('body', c);
    host.mount(dag._root);
    host.fill('body', c);
    expect(c.destroyed).toBe(false);
  });
});

describe('结构变更通知', () => {
  it('mount / fill / destroy 触发 runtime 结构订阅', () => {
    const rt = createRuntime();
    const dag = new DataDag({ runtime: rt });
    let count = 0;
    const unsub = rt.subscribeStructural(() => count++);
    const a = new SimpleCell('a');
    a.mount(dag._root);
    expect(count).toBe(1);
    a.fill('_default', new SimpleCell('b'));
    expect(count).toBe(2);
    a.destroy();
    // 子 Cell 与父 Cell 各自销毁时通知一次（b → a 共 2 次）
    expect(count).toBe(4);
    unsub();
    const c = new SimpleCell('c');
    c.mount(dag._root);
    expect(count).toBe(4);
  });
});

describe('runtime 隔离', () => {
  it('两个 DataDag 各用独立 runtime 时浮动树互不可见', () => {
    const rtA = createRuntime();
    const rtB = createRuntime();
    const dagA = new DataDag({ runtime: rtA });
    const dagB = new DataDag({ runtime: rtB });
    const winA = new SimpleCell('winA');
    winA.floatingViewport().mount(dagA._root);
    expect(rtA.getFloatingChildren(null).length).toBe(1);
    expect(rtB.getFloatingChildren(null).length).toBe(0);
  });

  it('实现注册表按 runtime 隔离', () => {
    const rtA = createRuntime();
    const rtB = createRuntime();
    const implA = () => null;
    registerCellImpl('switch', 'custom', implA, rtA);
    expect(getCellImpl('switch', 'custom', rtA)).toBe(implA);
    expect(getCellImpl('switch', 'custom', rtB)).toBeNull();
    // 缺省 runtime 与注入 runtime 互不干扰
    expect(getCellImpl('switch', 'custom')).toBeNull();
    expect(getDefaultRuntime()).not.toBe(rtA);
  });

  it('未注入 runtime 的 DataDag 共享默认 runtime（向后兼容）', () => {
    const d1 = new DataDag();
    const d2 = new DataDag();
    expect(d1.runtime).toBe(getDefaultRuntime());
    expect(d2.runtime).toBe(getDefaultRuntime());
  });
});

describe('bind 绑定数据契约', () => {
  it('绑定字段读写透明转发到目标节点', () => {
    const dag = new DataDag({ runtime: createRuntime() });
    const profile = new SimpleCell('profile');
    profile.setAnchor('userProfile');
    profile.mount(dag._root);
    const view = new CellBaseBuilder('view');
    view.schema({ name: { type: 'string', bind: '@userProfile#title' } });
    view.mount(dag._root);
    profile.setData('title', 'Frank');
    expect(view.getData('name')).toBe('Frank');
    view.setData('name', 'Steven');
    expect(profile.getData('title')).toBe('Steven');
  });
});
