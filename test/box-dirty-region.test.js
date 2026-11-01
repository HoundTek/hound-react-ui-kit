/**
 * @file reflow 脏区优化回归：容器尺寸不变且自身不脏的子树跳过重算（哨兵保留）、
 *       尺寸变化沿子树传播重算、self-dirty 强制重算、约束变更经祖先链置脏。
 *
 *       树形：root（纵排锁定，300×200）→ a（fixedHeight 100，纵排锁定，内含
 *       a1 弹性项）+ b（弹性，内含 b1）。a 锁定主轴使 a1._layoutHeight 由 a
 *       分配，哨兵覆写可精确观察「a 是否重算」。
 */
import { describe, it, expect } from 'vitest';
import BoxBuilder from '../src/core/box/box';

const mk = (path) => new BoxBuilder(`@dirty/${path}`);

function buildTree() {
  const root = mk('root').layout('vertical').moveY(false).moveX(false);
  const a1 = mk('a1').minHeight(10).maxHeight(90).defaultHeight(50);
  const a = mk('a').fixedHeight(100).layout('vertical').moveY(false).children([a1]);
  const b1 = mk('b1').defaultHeight(40);
  const b = mk('b').minHeight(0).maxHeight(1000).children([b1]);
  root.children([a, b]);
  root._containerSize = { width: 300, height: 200 };
  root._needsReflow = true;
  root._performReflow();
  return { root, a, a1, b, b1 };
}

describe('reflow 脏区跳过', () => {
  it('初始 reflow 收敛：a1 按弹性 max 分配（单弹性项填满分支）', () => {
    const { a1 } = buildTree();
    expect(a1._layoutHeight).toBe(90);
  });

  it('尺寸不变且子项不脏 → 子树跳过（哨兵保留）', () => {
    const { root, a1 } = buildTree();
    a1._layoutHeight = 999; // 哨兵：若 a 重算会被覆写回 90
    root._needsReflow = true;
    root._performReflow();
    expect(a1._layoutHeight).toBe(999);
  });

  it('容器尺寸变化传播 → 子树重算（哨兵覆写）', () => {
    const { root, a1 } = buildTree();
    a1._layoutHeight = 999;
    root._containerSize = { width: 320, height: 200 };
    root._needsReflow = true;
    root._performReflow();
    expect(a1._layoutHeight).toBe(90);
  });

  it('子项自身置脏 → 尺寸不变也重算', () => {
    const { root, a, a1 } = buildTree();
    a1._layoutHeight = 999;
    a._needsReflow = true;
    root._needsReflow = true;
    root._performReflow();
    expect(a1._layoutHeight).toBe(90);
  });

  it('深层置脏沿祖先链传播：路径重算、旁支不脏子树跳过', () => {
    const { root, a1, b1 } = buildTree();
    a1._layoutHeight = 999;
    b1._layoutHeight = 777;
    a1._requestReflow(); // a1/a/root 置脏，b 分支不脏
    root._performReflow();
    expect(a1._layoutHeight).toBe(90); // a 链重算覆写哨兵
    expect(b1._layoutHeight).toBe(777); // b 尺寸未变且不脏 → 跳过
  });

  it('λ 二分 0.5px 精度：弹性分配合计更贴近容器尺寸', () => {
    const root = mk('lam').layout('vertical').moveY(false);
    const c1 = mk('c1').minHeight(100).maxHeight(200);
    const c2 = mk('c2').minHeight(100).maxHeight(200);
    root.children([c1, c2]);
    const r = root._calculateLayout(300, 'Height');
    expect(Math.abs(r.sizes[0] + r.sizes[1] - 300)).toBeLessThanOrEqual(1);
  });
});
