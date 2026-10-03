/**
 * @file 全局注入样式（见 docs/theme-shape-design.md）。
 *        inline style 无法表达 :hover/:active/字体继承，这里模块级一次性注入
 *        一小段全局 CSS（幂等），承担两件事：
 *        1. 字体基样式：body 显式声明无衬线系统字体栈与基准字号，表单控件
 *           强制继承——不声明时各浏览器默认字体不一致（衬线/无衬线），且
 *           button/input/textarea/select 按 UA 样式不继承文档字体
 *        2. 交互态层（state layer）：元素加 'hk-state' 类并以 CSS 变量
 *           --hk-hover/--hk-active 携带预算好的罩层色（stateLayerProps 按
 *           MD3 态层 8%/12% 透明度在 JS 侧合成 rgba），hover/active 时经
 *           background-image 渐变叠加在背景色之上
 *
 *        跨浏览器约束：不使用 color-mix / corner-shape 等尚未在各系统
 *        webview 普及的 CSS 特性；罩层色一律 JS 侧预算（hexToRgba），
 *        on-color 非 hex 时罩层缺省为 transparent（各浏览器一致地无变化）。
 */

import { hexToRgba } from './shape';

/** 注入标记（防重复注入） */
const STYLE_ID = 'hk-state-layer';

/** 无衬线系统字体栈（跨浏览器统一文档字体） */
const FONT_STACK = "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif";

/** 注入的全局样式 */
const GLOBAL_CSS = `
body { font-family: ${FONT_STACK}; font-size: 14px; }
button, input, textarea, select { font-family: inherit; }
.hk-state { transition: background-color .15s, box-shadow .15s, color .15s; }
.hk-state:hover { background-image: linear-gradient(var(--hk-hover, transparent), var(--hk-hover, transparent)); }
.hk-state:active { background-image: linear-gradient(var(--hk-active, transparent), var(--hk-active, transparent)); }
.hk-focus:focus-visible { outline: 2px solid var(--hk-focus, currentColor); outline-offset: 1px; }
.hk-focus::placeholder { color: var(--hk-placeholder, inherit); opacity: 1; }
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

/**
 * 取态层 props：className + 携带罩层色 CSS 变量的 style 片段。
 * 罩层色按 MD3 态层规范在 JS 侧预算：hover = on-color 8%，active = 12%；
 * onColor 非 hex（无法预算）时罩层缺省 transparent，各浏览器一致地无变化。
 * @param {string} onColor 内容上颜色（hover/active 罩层取色来源，如 on-primary / primary）
 * @param {Object} [extraStyle] 需要合并进 style 的附加片段
 * @returns {{className: string, style: Object}} 可展开到元素的 props
 */
function stateLayerProps(onColor, extraStyle) {
  ensureStateLayerStyle();
  const style = { ...extraStyle };
  const hover = hexToRgba(onColor, 0.08);
  const active = hexToRgba(onColor, 0.12);
  if (hover) style['--hk-hover'] = hover;
  if (active) style['--hk-active'] = active;
  return { className: 'hk-state', style };
}

export { ensureStateLayerStyle, stateLayerProps, FONT_STACK };
