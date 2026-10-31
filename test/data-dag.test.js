/**
 * @file DataDag/DataNode 回归用例：路径解析、ref 软链接、锚点、订阅语义、
 *       生命周期（removeChild/destroy）与快照（toJSON/restore）。
 */
import { describe, it, expect } from 'vitest';
import { DataDag, DataNode, createRuntime } from '../src/index.jsx';

describe('DataNode 路径解析', () => {
  it('绝对路径 / 相对路径 / 锚点', () => {
    const dag = new DataDag({ runtime: createRuntime() });
    const root = dag._root;
    const a = root.createChild('a');
    const b = a.createChild('b');
    b.setAnchor('bee');
    expect(dag.resolve('@/a/b')).toBe(b);
    expect(a.resolve('./b')).toBe(b);
    expect(b.resolve('../b')).toBe(b);
    expect(b.resolve('@bee')).toBe(b);
    expect(b.resolve('@')).toBe(root);
  });

  it('ref 软链接透明委托与多级跟随', () => {
    const dag = new DataDag({ runtime: createRuntime() });
    const target = dag._root.createChild('target');
    target.setData('v', 1);
    const link = dag._root.createChild('holder').createRefChild('link', '@/target');
    expect(link.getData('v')).toBe(1);
    link.setData('v', 2);
    expect(target.getData('v')).toBe(2);
    const chain = dag._root.createRefChild('chain', './holder/link');
    expect(chain.getData('v')).toBe(2);
  });

  it('循环 ref 返回 null 不挂死', () => {
    const dag = new DataDag({ runtime: createRuntime() });
    const r1 = dag._root.createRefChild('r1', './r2');
    dag._root.createRefChild('r2', './r1');
    expect(r1.getData('x')).toBeUndefined();
    expect(dag.resolve('@r1')).toBeNull();
  });

  it('订阅仅本节点触发，不向父冒泡；ref 订阅 payload 重写为 ref 自身', () => {
    const dag = new DataDag({ runtime: createRuntime() });
    const parent = dag._root.createChild('p');
    const child = parent.createChild('c');
    const parentEvents = [];
    parent.subscribe((p) => parentEvents.push(p.key));
    child.setData('k', 1);
    expect(parentEvents).toEqual([]);

    const link = dag._root.createRefChild('link', './p/c');
    const seen = [];
    const unsub = link.subscribe((p) => seen.push(p));
    child.setData('k', 2);
    expect(seen.length).toBe(1);
    expect(seen[0].node).toBe(link);
    expect(seen[0].value).toBe(2);
    unsub();
    child.setData('k', 3);
    expect(seen.length).toBe(1);
  });
});

describe('DataNode 生命周期与快照', () => {
  it('removeChild 摘除子树；destroy 清订阅与锚点', () => {
    const dag = new DataDag({ runtime: createRuntime() });
    const a = dag._root.createChild('a');
    const b = a.createChild('b');
    a.setAnchor('aa');
    let fired = 0;
    a.subscribe(() => fired++);
    expect(dag._root.removeChild('a')).toBe(true);
    expect(dag._root.getChild('a')).toBeUndefined();
    expect(b.destroyed).toBe(true);
    expect(dag.resolve('@aa')).toBeNull();
    a.setData('x', 1);
    expect(fired).toBe(0);
    expect(dag._root.removeChild('nope')).toBe(false);
  });

  it('toJSON / restore 往返', () => {
    const dag = new DataDag({ runtime: createRuntime() });
    const c = dag._root.createChild('c');
    c.setData('title', 'hello');
    c.setAnchor('cc');
    const snap = JSON.parse(JSON.stringify(dag.toJSON()));
    c.setData('title', 'changed');
    dag.restore(snap);
    expect(c.getData('title')).toBe('hello');
    expect(dag.resolve('@cc')).toBe(c);
  });

  it('独立 new DataNode 挂默认 runtime（向后兼容）', () => {
    const node = new DataNode('x');
    expect(node.runtime).toBeTruthy();
    // 无父节点即视为根（isRoot），path 口径为 '@'
    expect(node.path).toBe('@');
  });
});
