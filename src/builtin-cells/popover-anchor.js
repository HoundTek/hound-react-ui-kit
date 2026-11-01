/**
 * @file popover-anchor.js —— 伪窗口浮层落点计算（共享工具）
 *
 * 下拉选择、颜色选择、日期选择等「触发器 + 浮层」组件共用同一套落点规则：
 * 浮层作为独立浮动视口（伪窗口）挂到数据树根，按触发器的屏幕矩形定位。
 *   - 垂直：优先贴触发器下方；下方空间不足且上方更宽裕时翻到上方
 *   - 水平：与触发器左缘对齐，并钳制在可视区域内（左右各留 POPOVER_GAP）
 */

/** 触发元素与浮层的间隙（px），也是浮层距可视边缘的最小留白 */
const POPOVER_GAP = 4;

/**
 * 计算浮层落点（屏幕坐标）。
 * @param {DOMRect} rect 触发器的屏幕矩形
 * @param {number} w 浮层宽度
 * @param {number} h 浮层高度
 * @returns {{x: number, y: number}} 屏幕坐标
 */
function placePopover(rect, w, h) {
  const vw = typeof window === 'undefined' ? 0 : window.innerWidth;
  const vh = typeof window === 'undefined' ? 0 : window.innerHeight;
  const below = vh - rect.bottom - POPOVER_GAP;
  const above = rect.top - POPOVER_GAP;
  const y = (below >= h || above < h) ? rect.bottom + POPOVER_GAP : rect.top - h - POPOVER_GAP;
  const x = Math.min(
    Math.max(POPOVER_GAP, Math.round(rect.left)),
    Math.max(POPOVER_GAP, vw - w - POPOVER_GAP),
  );
  return { x, y };
}

export { POPOVER_GAP, placePopover };
