/**
 * @file 受控语义糖 controlled() 回归：值注入、内部变更回写、
 *       外部回灌无循环、重复调用覆盖、未挂载防护。
 */
import { describe, it, expect, vi } from 'vitest';
import { DataDag, CellBaseBuilder, createRuntime } from '../src/index.jsx';

class ValueCell extends CellBaseBuilder {
  constructor(id) {
    super(id);
    this.schema({ value: { type: 'string', default: '' }, count: { type: 'number', default: 0 } });
  }
}

const mount = (id) => {
  const dag = new DataDag({ runtime: createRuntime() });
  const cell = new ValueCell(id);
  cell.mount(dag._root);
  return cell;
};

describe('controlled()', () => {
  it('注入值写入字段；内部变更触发 onCommit', () => {
    const cell = mount('c1');
    const onCommit = vi.fn();
    cell.controlled('ab', onCommit);
    expect(cell.getData('value')).toBe('ab');
    cell.setData('value', 'xy');
    expect(onCommit).toHaveBeenCalledWith('xy');
  });

  it('外部回灌（同值）不再触发 onCommit，无循环', () => {
    const cell = mount('c2');
    const onCommit = vi.fn((v) => cell.controlled(v, onCommit));
    cell.controlled('', onCommit);
    cell.setData('value', 'typed');
    expect(onCommit).toHaveBeenCalledTimes(1);
    cell.setData('value', 'typed2');
    expect(onCommit).toHaveBeenCalledTimes(2);
    expect(cell.getData('value')).toBe('typed2');
  });

  it('三参签名指定字段；重复调用覆盖旧回调', () => {
    const cell = mount('c3');
    const first = vi.fn(); const second = vi.fn();
    cell.controlled('count', 5, first);
    expect(cell.getData('count')).toBe(5);
    cell.controlled('count', 7, second);
    cell.setData('count', 9);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(9);
  });

  it('未挂载时忽略并告警，不抛错', () => {
    const cell = new ValueCell('c4');
    expect(() => cell.controlled('v', () => {})).not.toThrow();
    expect(cell.getData('value')).toBeUndefined();
  });

  it('destroy 后受控订阅随数据节点释放', () => {
    const cell = mount('c5');
    const onCommit = vi.fn();
    cell.controlled('a', onCommit);
    cell.destroy();
    expect(onCommit).not.toHaveBeenCalled();
  });
});
