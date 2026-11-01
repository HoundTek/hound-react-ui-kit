/**
 * @file 全局注入样式（见 docs/theme-shape-design.md）。
 *        inline style 无法表达 :hover/:active/字体继承，这里模块级一次性注入
 *        一小段全局 CSS（幂等），承担两件事：
 *        1. 字体基样式：kit 渲染根（[data-hk-scope]，由 CellRoot/FloatingLayer
 *           标记）声明无衬线系统字体栈与基准字号，表单控件强制继承——不声明时
 *           各浏览器默认字体不一致（衬线/无衬线），且 button/input/textarea/select
 *           按 UA 样式不继承文档字体。作用域收敛于 kit 子树，不触碰宿主 body
 *           （见 docs/improvement-plan.md P2-4）
 *        2. 交互态层（state layer）：元素加 'hk-state' 类并以 CSS 变量
 *           --hk-hover/--hk-active 携带预算好的罩层色（MD3 态层 8%/12% 透明度）：
 *           hex 色 JS 侧预算 rgba；非 hex 色经 CSS color-mix 合成（特性检测，
 *           不支持时一致降级为透明，见 stateLayerProps），hover/active 时
 *           background-image 渐变叠加在背景色之上
 */

import { hexToRgba } from './shape';

/** 注入标记（防重复注入） */
const STYLE_ID = 'hk-state-layer';

/** 无衬线系统字体栈（跨浏览器统一文档字体） */
const FONT_STACK = "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif";

/**
 * 等宽数字样式片段：数值、时间、计数、页码等需要纵向对齐且变化时不跳动
 * 的文本统一展开本片段（tabular-nums 让各数字字形同宽）。
 */
const TABULAR_NUMS = { fontVariantNumeric: 'tabular-nums' };

/** 注入的全局样式（字体规则限定 [data-hk-scope] 作用域，不改写宿主 body） */
const GLOBAL_CSS = `
[data-hk-scope] { font-family: ${FONT_STACK}; font-size: 14px; }
[data-hk-scope] button, [data-hk-scope] input, [data-hk-scope] textarea, [data-hk-scope] select { font-family: inherit; }
.hk-state { transition: background-color .15s ease, box-shadow .15s ease, color .15s ease, border-color .15s ease; }
.hk-state:hover { background-image: linear-gradient(var(--hk-hover, transparent), var(--hk-hover, transparent)); }
.hk-state:active { background-image: linear-gradient(var(--hk-active, transparent), var(--hk-active, transparent)); }
.hk-press { transition: transform .12s ease; }
.hk-press:active:not(:disabled) { transform: scale(.97); }
/* 键盘焦点环统一：kit 作用域内全部可交互元素取同一描边宽度/偏移/颜色
   （--hk-focus 由元素或祖先声明），不再依赖各浏览器 UA 高亮样式 */
[data-hk-scope] button:focus-visible,
[data-hk-scope] a[href]:focus-visible,
[data-hk-scope] input:focus-visible,
[data-hk-scope] textarea:focus-visible,
[data-hk-scope] select:focus-visible,
[data-hk-scope] [tabindex="0"]:focus-visible {
  outline: 2px solid var(--hk-focus, currentColor);
  outline-offset: 2px;
}
.hk-focus:focus-visible { outline: 2px solid var(--hk-focus, currentColor); outline-offset: 2px; }
.hk-focus::placeholder { color: var(--hk-placeholder, inherit); opacity: 1; }
/* 等宽数字工具类（与 TABULAR_NUMS 同口径） */
.hk-num { font-variant-numeric: tabular-nums; }
/* 文本选择限制：控件类文本（按钮/开关/选项行等）不参与拖选——用户拖拽交互
   时不会意外选中标签文字；正文/输入区仍可正常选择。.hk-noselect 供组件在
   非 button 元素上显式声明同一语义 */
[data-hk-scope] button,
[data-hk-scope] [role="option"],
[data-hk-scope] .hk-noselect { user-select: none; -webkit-user-select: none; }
/* 滑块/开关的滑块位移动效：轨道内绝对定位滑块的 left/top/尺寸与底色过渡，
   不影响外层布局（轨道本身尺寸固定） */
.hk-slide { transition: left .16s ease, top .16s ease, width .16s ease, height .16s ease, background-color .16s ease; }
@media (prefers-reduced-motion: reduce) {
  .hk-state, .hk-press, .hk-slide { transition: none; }
  .hk-press:active:not(:disabled) { transform: none; }
}
`;

/**
 * 确保全局样式已注入文档（幂等；无 DOM 环境直接跳过）
 */
function ensureStateLayerStyle() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = GLOBAL_CSS;
  document.head.appendChild(el);
}

/** color-mix 特性检测结果缓存（null = 未检测） */
let _supportsColorMix = null;

/**
 * 检测当前引擎是否支持 background-image 内的 color-mix()。
 * @returns {boolean}
 */
function supportsColorMix() {
  if (_supportsColorMix === null) {
    _supportsColorMix = typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
      && CSS.supports('background-image', 'color-mix(in srgb, red 8%, transparent)');
  }
  return _supportsColorMix;
}

/**
 * 取态层 props：className + 携带罩层色 CSS 变量的 style 片段。
 * 罩层色按 MD3 态层规范：hover = on-color 8%，active = 12%。
 * hex 色 JS 侧预算 rgba；非 hex（命名色/hsl/rgb() 等）经 CSS color-mix 合成，
 * 引擎不支持时罩层缺省 transparent（各浏览器一致地无变化）。
 * @param {string} onColor 内容上颜色（hover/active 罩层取色来源，如 on-primary / primary）
 * @param {Object} [extraStyle] 需要合并进 style 的附加片段
 * @returns {{className: string, style: Object}} 可展开到元素的 props
 */
function stateLayerProps(onColor, extraStyle) {
  ensureStateLayerStyle();
  const style = { ...extraStyle };
  let hover = hexToRgba(onColor, 0.08);
  let active = hexToRgba(onColor, 0.12);
  if (!hover && typeof onColor === 'string' && onColor && supportsColorMix()) {
    hover = `color-mix(in srgb, ${onColor} 8%, transparent)`;
    active = `color-mix(in srgb, ${onColor} 12%, transparent)`;
  }
  if (hover) style['--hk-hover'] = hover;
  if (active) style['--hk-active'] = active;
  return { className: 'hk-state', style };
}

export { ensureStateLayerStyle, stateLayerProps, FONT_STACK, TABULAR_NUMS, supportsColorMix };
