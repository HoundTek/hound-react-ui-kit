// @vitest-environment jsdom
/**
 * @file 过滚期间浮动滚动条滑块的换算（floating-scrollbar.jsx 的
 *       resolveDrawThumbSize / resolveThumbShift）：过滚时滑块按过滚位移缩短
 *       （内容每移 1px，滑块长度缩 track/main px，最多缩掉一半且不短于
 *       MIN_THUMB），并且**末端固定**——过滚方向指向的那一端不动，滑块从另一端
 *       缩短；不过滚（位移 0）时长度与位置都维持基准。
 */
import { describe, expect, it } from 'vitest';
import { resolveDrawThumbSize, resolveThumbShift } from '../src/core/box/floating-scrollbar';

/** 视口 800 / 轨道 776（INSET 12）的垂直滚动条 */
const metrics = { mainSize: 800, trackSize: 776 };
/** 基准滑块长度（776 * 800/6058 ≈ 102.5） */
const BASE = 102.5;

describe('过滚滑块缩短（长度）', () => {
  it('不过滚时维持基准长度', () => {
    expect(resolveDrawThumbSize(BASE, metrics, 0)).toBe(BASE);
  });

  it('缩短量与过滚位移同尺度（换算到轨道尺度）', () => {
    // 位移 -6.2px → 轨道尺度 6.2 * 776/800 ≈ 6.01 → 102.5 - 6.01 ≈ 96.5
    expect(resolveDrawThumbSize(BASE, metrics, -6.2)).toBeCloseTo(96.49, 1);
    expect(resolveDrawThumbSize(BASE, metrics, 6.2)).toBeCloseTo(96.49, 1);
  });

  it('最多缩掉自身一半（拉到底也还是个滑块）', () => {
    expect(resolveDrawThumbSize(BASE, metrics, -1000)).toBeCloseTo(51.25, 2);
  });

  it('不短于最小长度（基准已很短时缩放量按剩余空间收敛）', () => {
    expect(resolveDrawThumbSize(30, metrics, -100)).toBe(28);
  });

  it('轨道短于最小长度时不缩短（滑块本来就填满轨道）', () => {
    expect(resolveDrawThumbSize(20, { mainSize: 40, trackSize: 16 }, -50)).toBe(20);
  });

  it('尺寸未知（尚未布局）时按原位（不缩短）', () => {
    expect(resolveDrawThumbSize(BASE, { mainSize: 0, trackSize: 0 }, -6.2)).toBe(BASE);
  });
});

describe('过滚滑块位移（末端固定）', () => {
  it('不过滚时不产生位移', () => {
    expect(resolveThumbShift(BASE, BASE, 0)).toBe(0);
  });

  it('越过末端（向下/向右，位移为负）：位移等于缩短量，末端贴住轨道末端', () => {
    const draw = resolveDrawThumbSize(BASE, metrics, -6.2);
    expect(resolveThumbShift(BASE, draw, -6.2)).toBeCloseTo(BASE - draw, 5);
    // 末端（起点 + 长度）始终等于基准末端：起点后移多少，长度就缩多少
    expect(6.2 * (metrics.trackSize / metrics.mainSize)).toBeCloseTo(BASE - draw, 1);
  });

  it('越过起点（向上/向左，位移为正）：起点不动，只有长度变短', () => {
    const draw = resolveDrawThumbSize(BASE, metrics, 6.2);
    expect(resolveThumbShift(BASE, draw, 6.2)).toBe(0);
  });

  it('长度未变（未缩到边界）时也不产生位移', () => {
    expect(resolveThumbShift(20, 20, -50)).toBe(0);
  });
});
