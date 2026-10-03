/**
 * @file glyphs.jsx —— 共享 SVG 字形（跨浏览器一致性约定，见
 *        docs/basic-cell-design.md「跨浏览器一致性约定」）。
 *
 * 界面上的装饰性符号（箭头/勾叉/单选/复选等）一律用 SVG 固定几何绘制，
 * 不使用 ★▲▼◉○☑☐✕✓▾▸‹› 等文本字形——字形随浏览器回退字体渲染，
 * 尺寸与粗细不一致。颜色一律 currentColor（继承父级 color），
 * 尺寸经 size prop 显式指定（px）。
 *
 * 纯 SVG 组件，不依赖任何 Cell 或其他 Impl，基础/高级 Cell 均可使用。
 */
import React from 'react';

/**
 * 公共 SVG 属性
 * @param {number} size 边长（px）
 * @returns {Object} svg 元素属性
 */
const svgProps = (size) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  style: { display: 'block', flexShrink: 0 },
  'aria-hidden': true,
});

/** 描边公共属性（圆头圆角连接，几何一致） */
const STROKE = {
  fill: 'none', stroke: 'currentColor', strokeWidth: 2,
  strokeLinecap: 'round', strokeLinejoin: 'round',
};

/** 箭头路径（四方向，描边式） */
const CHEVRONS = {
  down: 'M6 9l6 6 6-6',
  up: 'M6 15l6-6 6 6',
  left: 'M15 6l-6 6 6 6',
  right: 'M9 6l6 6-6 6',
};

/**
 * 箭头（展开/收起、翻页、下拉指示等）。
 * @param {{dir: 'up'|'down'|'left'|'right', size?: number}} props 组件属性
 * @returns {JSX.Element} 箭头元素
 */
function GlyphChevron({ dir = 'down', size = 14 }) {
  return (
    <svg {...svgProps(size)}>
      <path d={CHEVRONS[dir] || CHEVRONS.down} {...STROKE} />
    </svg>
  );
}

/**
 * 叉号（关闭/删除）。
 * @param {{size?: number}} props 组件属性
 * @returns {JSX.Element} 叉号元素
 */
function GlyphClose({ size = 14 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M6 6l12 12M18 6L6 18" {...STROKE} />
    </svg>
  );
}

/**
 * 对勾（成功/确认）。
 * @param {{size?: number}} props 组件属性
 * @returns {JSX.Element} 对勾元素
 */
function GlyphCheck({ size = 14 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M5 13l4 4L19 7" {...STROKE} />
    </svg>
  );
}

/** 三角路径（排序指示等，填充式） */
const TRIANGLES = {
  up: 'M12 6l6 12H6z',
  down: 'M12 18L6 6h12z',
};

/**
 * 实心三角（排序方向等）。
 * @param {{dir: 'up'|'down', size?: number}} props 组件属性
 * @returns {JSX.Element} 三角元素
 */
function GlyphTriangle({ dir = 'up', size = 12 }) {
  return (
    <svg {...svgProps(size)}>
      <path d={TRIANGLES[dir] || TRIANGLES.up} fill="currentColor" />
    </svg>
  );
}

/**
 * 单选标记：未选为描边圆环，选中为圆环 + 实心圆点。
 * @param {{checked?: boolean, size?: number}} props 组件属性
 * @returns {JSX.Element} 单选标记元素
 */
function GlyphRadio({ checked = false, size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="12" cy="12" r="8" {...STROKE} />
      {checked ? <circle cx="12" cy="12" r="4.5" fill="currentColor" /> : null}
    </svg>
  );
}

/**
 * 复选标记：未选为描边圆角方框，选中为方框 + 对勾。
 * @param {{checked?: boolean, size?: number}} props 组件属性
 * @returns {JSX.Element} 复选标记元素
 */
function GlyphCheckbox({ checked = false, size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <rect x="4" y="4" width="16" height="16" rx="4" {...STROKE} />
      {checked ? <path d="M8.5 12.5l2.5 2.5 5-5" {...STROKE} /> : null}
    </svg>
  );
}

/**
 * 减号（步进器等）。
 * @param {{size?: number}} props 组件属性
 * @returns {JSX.Element} 减号元素
 */
function GlyphMinus({ size = 14 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M6 12h12" {...STROKE} />
    </svg>
  );
}

/**
 * 加号（步进器等）。
 * @param {{size?: number}} props 组件属性
 * @returns {JSX.Element} 加号元素
 */
function GlyphPlus({ size = 14 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M12 6v12M6 12h12" {...STROKE} />
    </svg>
  );
}

/**
 * 信息标记（notice/result 的 info 态）。
 * @param {{size?: number}} props 组件属性
 * @returns {JSX.Element} 信息标记元素
 */
function GlyphInfo({ size = 14 }) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="12" cy="12" r="9" {...STROKE} />
      <circle cx="12" cy="8" r="1.4" fill="currentColor" />
      <path d="M12 11v6" {...STROKE} />
    </svg>
  );
}

/**
 * 警告标记（notice/result 的 warning 态）。
 * @param {{size?: number}} props 组件属性
 * @returns {JSX.Element} 警告标记元素
 */
function GlyphWarning({ size = 14 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M12 4l9.5 16h-19z" {...STROKE} />
      <path d="M12 10v4" {...STROKE} />
      <circle cx="12" cy="17" r="1.2" fill="currentColor" />
    </svg>
  );
}

export { GlyphChevron, GlyphClose, GlyphCheck, GlyphTriangle, GlyphRadio, GlyphCheckbox, GlyphMinus, GlyphPlus, GlyphInfo, GlyphWarning };
