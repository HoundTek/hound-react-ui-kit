/**
 * @file 形状渲染解析（见 docs/theme-shape-design.md）。把主题的形状描述
 *       （包裹层规范）与 Box 的形状声明（rect/capsule/circle、
 *       颜色角色、材质、不透明度）解析为具体 CSS 样式。
 *
 *       圆角一律 g1 border-radius：g2 曲率平滑依赖 CSS corner-shape
 *      （仅 Chromium 支持，各系统 webview 未普及），已按跨浏览器一致性
 *       约定舍弃（见 docs/basic-cell-design.md）。
 *
 *       本模块为纯函数，不依赖 React；渲染层（box-component）与 Cell 内容组件共用。
 */

/**
 * 胶囊/全圆角半径值。border-radius 会按盒尺寸自动钳制到短边一半，
 * 超大值即胶囊形；circle 在此基础上由调用方补充 1:1 宽高约束。
 */
const CAPSULE_RADIUS = '9999px';

/**
 * 阴影档位表（MD3 elevation level0–3 的 umbra/penumbra 近似）。
 * 供元素级样式表（theme.elements.*.elevation）与实现组件引用。
 * @type {string[]}
 */
const ELEVATIONS = [
  'none',
  '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15)',
  '0 1px 2px rgba(0,0,0,0.3), 0 2px 6px 2px rgba(0,0,0,0.15)',
  '0 1px 3px rgba(0,0,0,0.3), 0 4px 8px 3px rgba(0,0,0,0.15)',
];

/**
 * 取阴影档样式片段（box-shadow）
 * @param {number} level 阴影档（0–3，越界钳制）
 * @returns {Object} 样式片段（{boxShadow}）
 */
function elevationStyle(level) {
  const l = Math.min(ELEVATIONS.length - 1, Math.max(0, level || 0));
  return { boxShadow: ELEVATIONS[l] };
}

/**
 * 解析元素级圆角声明为具体半径。声明形式：
 * - number：显式 px
 * - 'capsule'：全圆角胶囊值
 * - 其他字符串：形状尺度角色名（'control' 等），走 theme.getBaseRadius
 * @param {Theme|null} theme 当前主题
 * @param {number|string|undefined} decl 圆角声明（theme.elements.*.radius）
 * @param {number|string} fallback 声明缺省时的回退值
 * @returns {number|string} 圆角半径
 */
function resolveElementRadius(theme, decl, fallback) {
  if (typeof decl === 'number') return decl;
  if (decl === 'capsule') return CAPSULE_RADIUS;
  if (typeof decl === 'string') {
    const r = theme?.getBaseRadius(decl);
    if (typeof r === 'number') return r;
  }
  return fallback;
}

/** @type {boolean|null} corner-shape 能力检测结果（惰性缓存） */

/**
 * 生成圆角样式（g1 border-radius）。
 * 跨浏览器约束：不使用 CSS corner-shape（g2 曲率平滑仅 Chromium 支持，
 * 各系统 webview 未普及，已按一致性约定舍弃）；cornerType 参数保留仅为
 * 调用点兼容，不再产生任何差异。
 * @param {'g1'|'g2'} cornerType 圆角类型（已忽略，恒按 g1 渲染）
 * @param {string|number} radius 圆角半径（px 数值或 CSS 长度）
 * @returns {Object} 圆角样式片段
 */
function cornerStyle(cornerType, radius) {
  return { borderRadius: typeof radius === 'number' ? `${radius}px` : radius };
}

/**
 * hex 色值转 rgba 字符串（材质 baseOpacity 等透明度合成用）
 * @param {string} hex #rgb / #rrggbb 色值
 * @param {number} alpha 透明度（0~1）
 * @returns {string|null} rgba 字符串；非 hex 输入返回 null
 */
function hexToRgba(hex, alpha) {
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * 求解包裹层规范：返回每层的累计内缩偏移与解析后的圆角半径。
 * - inset 为与向外一层的间距，逐层累计为绝对偏移
 * - radius 为显式 px 或 'concentric'（外层半径 − 本层 inset，即同心圆角规则）；
 *   胶囊/圆形下全部层半径取全圆角值
 * @param {Array<{inset: number, radius: number|'concentric', color?: string, opacity?: number}>} layersSpec 层规范
 * @param {'rect'|'capsule'|'circle'} shape 基础形状
 * @returns {Array<{offset: number, radius: number|string, color?: string, opacity?: number}>} 解析后的层列表
 */
function resolveShapeLayers(layersSpec, shape) {
  const isRound = shape === 'capsule' || shape === 'circle';
  let offset = 0;
  let outerRadius = 0;
  return layersSpec.map((layer, i) => {
    offset += i === 0 ? 0 : (layer.inset || 0);
    let radius;
    if (isRound) {
      radius = CAPSULE_RADIUS;
    } else if (i === 0 || layer.radius !== 'concentric') {
      radius = typeof layer.radius === 'number' ? layer.radius : 0;
    } else {
      radius = Math.max(0, outerRadius - (layer.inset || 0));
    }
    if (typeof radius === 'number') outerRadius = radius;
    return { offset, radius, color: layer.color, opacity: layer.opacity };
  });
}

/**
 * 解析 Box 的形状声明为自身样式 + 包裹层壳列表。
 * 形状来源：builder._shape（rect/capsule/circle）与 builder._styleRole（组件角色，
 * 查询主题层规范）；主题未声明层规范时按单层零圆角处理。
 * @param {BoxBuilder} builder Box 构建器
 * @param {Theme|null} theme 当前主题；null 时按 g1/无层规范降级
 * @returns {{selfStyle: Object, shells: Array<{offset: number, radiusCss: string, style: Object}>}}
 *   selfStyle 合并到盒元素自身；shells 为第 1 层起的视觉壳（绝对定位内缩，pointer-events: none）
 */
function resolveBoxShape(builder, theme) {
  const corner = theme?.getCornerType() || 'g1';
  // 普适样式默认值表：Cell 未显式声明形状时取角色样式表的 shape（见 docs/theme-shape-design.md）
  const roleStyle = builder._styleRole ? theme?.getRoleStyle(builder._styleRole) : null;
  const shape = builder._shape || roleStyle?.shape || 'rect';
  // 仅声明了组件角色或基础形状的 Box 参与层规范解析：
  // 未声明者不受主题层规范影响（避免 default 角色半径波及全部布局 Box）
  const layersSpec = (builder._styleRole || builder._shape)
    ? theme?.getShapeLayers(builder._styleRole) || null
    : null;

  const selfStyle = {};
  const shells = [];

  if (shape === 'circle') {
    // 圆形：胶囊全圆角 + 1:1 宽高约束
    Object.assign(selfStyle, cornerStyle(corner, CAPSULE_RADIUS), { aspectRatio: '1 / 1' });
  } else if (shape === 'capsule') {
    Object.assign(selfStyle, cornerStyle(corner, CAPSULE_RADIUS));
  }

  if (layersSpec) {
    const layers = resolveShapeLayers(layersSpec, shape);
    if (shape === 'rect') {
      Object.assign(selfStyle, cornerStyle(corner, layers[0].radius));
    }
    // 第 1 层起渲染为视觉壳（纯视觉内缩，不参与 reflow）
    for (let i = 1; i < layers.length; i++) {
      const layer = layers[i];
      const shellStyle = {
        position: 'absolute',
        top: layer.offset, left: layer.offset, right: layer.offset, bottom: layer.offset,
        pointerEvents: 'none',
        ...cornerStyle(corner, layer.radius),
      };
      const color = layer.color ? theme?.resolveColor(layer.color) : null;
      if (color) shellStyle.backgroundColor = color;
      if (layer.opacity != null) shellStyle.opacity = layer.opacity;
      shells.push({ key: i, style: shellStyle });
    }
  }

  return { selfStyle, shells };
}

/**
 * 解析 Box 的普适配置（材质 / 颜色角色 / 不透明度）为样式片段。
 * 取值优先级：builder 显式声明 > 主题角色样式表（styles，按 styleRole 查询）> 内建降级。
 * 背景色优先级：builder._backgroundColor（裸色值，逃生通道）> 颜色角色解析。
 * frosted 材质：backdrop-filter 模糊 + 底色按 baseOpacity 半透明（不支持时回退 solid，
 * 即仅底色不模糊——backdrop-filter 本身被浏览器忽略即天然降级）。
 * @param {BoxBuilder} builder Box 构建器
 * @param {Theme|null} theme 当前主题
 * @returns {Object} 样式片段（可能为空对象）
 */
function resolveBoxPaint(builder, theme) {
  const style = {};
  const roleStyle = builder._styleRole ? theme?.getRoleStyle(builder._styleRole) : null;
  const colorRole = builder._colorRole ?? roleStyle?.color;
  const material = builder._material ?? roleStyle?.material;
  const opacity = builder._opacity ?? roleStyle?.opacity;
  let backgroundColor = builder._backgroundColor;
  if (backgroundColor == null && colorRole) {
    backgroundColor = theme?.resolveColor(colorRole) ?? undefined;
  }

  if (material && material !== 'solid') {
    const spec = theme?.getMaterial(material);
    if (spec && material === 'frosted') {
      const blur = spec.blur ?? 20;
      style.backdropFilter = `blur(${blur}px)`;
      style.WebkitBackdropFilter = `blur(${blur}px)`;
      if (backgroundColor && spec.baseOpacity != null) {
        backgroundColor = hexToRgba(backgroundColor, spec.baseOpacity) || backgroundColor;
      }
    }
    // 主题未声明该材质：降级 solid（仅底色，无附加效果）
  }

  if (backgroundColor != null) style.backgroundColor = backgroundColor;
  if (opacity != null) style.opacity = opacity;
  return style;
}

export { CAPSULE_RADIUS, ELEVATIONS, elevationStyle, resolveElementRadius, cornerStyle, hexToRgba, resolveShapeLayers, resolveBoxShape, resolveBoxPaint };
