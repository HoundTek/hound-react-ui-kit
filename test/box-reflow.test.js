/**
 * @file Box 主轴 reflow 数学模型回归用例（对应 docs/box-reflow-math.md）：
 *       固定尺寸守恒、亚像素容差、中值/默认分配、λ 二分收敛、非法判定。
 */
import { describe, it, expect } from 'vitest';
import BoxBuilder from '../src/core/box/box';

const mk = (path) => new BoxBuilder(`@test/${path}`);

describe('_calculateLayout（锁定主轴分配）', () => {
  it('全固定子项：尺寸精确守恒', () => {
    const root = mk('root');
    const a = mk('a').fixedWidth(100);
    const b = mk('b').fixedWidth(100);
    root.children([a, b]);
    const r = root._calculateLayout(200, 'Width');
    expect(r.isValid).toBe(true);
    expect(r.sizes).toEqual([100, 100]);
  });

  it('固定总和超出容器（>0.5px 容差）：判非法', () => {
    const root = mk('root');
    root.children([mk('a').fixedWidth(130), mk('b').fixedWidth(120)]);
    const r = root._calculateLayout(200, 'Width');
    expect(r.isValid).toBe(false);
    expect(r.error).toBe(true);
  });

  it('亚像素容差：固定总和仅超 0.3px 仍合法', () => {
    const root = mk('root');
    root.children([mk('a').fixedWidth(100), mk('b').fixedWidth(100.3)]);
    const r = root._calculateLayout(200, 'Width');
    expect(r.isValid).toBe(true);
  });

  it('无约束子项：剩余空间均分', () => {
    const root = mk('root');
    root.children([mk('a'), mk('b')]);
    const r = root._calculateLayout(300, 'Width');
    expect(r.isValid).toBe(true);
    expect(r.sizes[0] + r.sizes[1]).toBeCloseTo(300, 0);
    expect(r.sizes[0]).toBeCloseTo(150, 0);
  });

  it('显式 min/max 无默认：取中值目标经 λ 拟合，守恒且不越界', () => {
    const root = mk('root');
    const a = mk('a').minWidth(100).maxWidth(200);
    const b = mk('b').minWidth(100).maxWidth(200);
    root.children([a, b]);
    const r = root._calculateLayout(300, 'Width');
    expect(r.isValid).toBe(true);
    expect(r.sizes.every((s) => s >= 100 && s <= 200)).toBe(true);
    // λ 二分精度 LAMBDA_EPSILON=1px：合计允许 ≤2px 量化误差（引擎既有口径）
    expect(Math.abs(r.sizes[0] + r.sizes[1] - 300)).toBeLessThanOrEqual(2);
  });

  it('固定 + 弹性：弹性项吃满剩余但不越 max', () => {
    const root = mk('root');
    const a = mk('a').fixedWidth(100);
    const b = mk('b').minWidth(50).maxWidth(200);
    root.children([a, b]);
    const r = root._calculateLayout(300, 'Width');
    expect(r.sizes[0]).toBe(100);
    expect(r.sizes[1]).toBeCloseTo(200, 0);
  });

  it('剩余空间小于弹性子项 min 合计：判非法', () => {
    const root = mk('root');
    root.children([mk('a').minWidth(100).maxWidth(200)]);
    const r = root._calculateLayout(50, 'Width');
    expect(r.isValid).toBe(false);
    expect(r.error).toBe(true);
  });
});

describe('_performReflow（锁定横排端到端）', () => {
  it('横向锁定容器按容器宽分配子项', () => {
    const root = mk('root').layout('horizontal').moveX(false).moveY(false);
    const a = mk('a').fixedWidth(120);
    const b = mk('b').minWidth(0).maxWidth(1000).defaultWidth(300);
    root.children([a, b]);
    root._containerSize = { width: 400, height: 200 };
    root._needsReflow = true;
    root._performReflow();
    expect(a._layoutWidth).toBe(120);
    expect(b._layoutWidth).toBeCloseTo(280, 0);
  });

  it('gap 与 padding 参与主轴扣除', () => {
    const root = mk('root2').layout('horizontal').moveX(false).gap(10).padding(20);
    const a = mk('a').fixedWidth(100);
    const b = mk('b').fixedWidth(100);
    root.children([a, b]);
    root._containerSize = { width: 300, height: 100 };
    root._needsReflow = true;
    root._performReflow();
    // 可用 = 300 - 2*20(padding) - 10(gap) = 250；固定 200 ≤ 250 合法
    expect(a._layoutWidth).toBe(100);
    expect(b._layoutWidth).toBe(100);
  });
});
