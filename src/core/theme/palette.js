/**
 * @file 种子色板派生（docs/improvement-plan.md 阶段 2「主题系统增强」）。
 *
 *        从单个种子色派生 MD3 风格的颜色角色表（light/dark 成对），
 *        供 Theme.fromSeed / createSeedThemePair 生成完整主题色板：
 *
 *        - 色调（tone）模型：以 HSL 亮度近似 MD3 的 L* 色调轴（0~100），
 *          同一色相/饱和度在亮度轴上取样得到角色色；纯 JS 实现、
 *          无运行时依赖，结果确定性可测。
 *        - 角色映射：primary/on-primary/primary-container/… 按 light/dark
 *          两套取色表；中性色饱和度收缩（×0.12，上限 10），
 *          次要色饱和度收缩（×0.35）——与 MD3 色板生成思路一致。
 *        - 兼容别名（text/border/danger/…）与规范角色同值双写，
 *          覆盖既有 Cell 的角色引用。
 *        - WCAG 相对亮度与对比度工具一并导出，供派生结果断言与
 *          无障碍审计使用。
 */

/**
 * hex（#rgb/#rrggbb）→ {r,g,b}（0~255）；非法输入返回 null。
 * @param {string} hex 颜色字面量
 * @returns {{r: number, g: number, b: number}|null}
 */
function hexToRgb(hex) {
  if (typeof hex !== 'string') return null;
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/**
 * RGB（0~255）→ [h(0~360), s(0~100), l(0~100)]。
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {[number, number, number]}
 */
function rgbToHsl(r, g, b) {
  const rn = r / 255; const gn = g / 255; const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
    else if (max === gn) h = ((bn - rn) / d + 2) * 60;
    else h = ((rn - gn) / d + 4) * 60;
  }
  return [h, s * 100, l * 100];
}

/**
 * HSL → hex 字面量。h 0~360，s/l 0~100。
 * @param {number} h
 * @param {number} s
 * @param {number} l
 * @returns {string} `#rrggbb`
 */
function hslToHex(h, s, l) {
  const hn = ((h % 360) + 360) % 360;
  const sn = Math.min(100, Math.max(0, s)) / 100;
  const ln = Math.min(100, Math.max(0, l)) / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = ln - c / 2;
  let r, g, b;
  if (hn < 60) [r, g, b] = [c, x, 0];
  else if (hn < 120) [r, g, b] = [x, c, 0];
  else if (hn < 180) [r, g, b] = [0, c, x];
  else if (hn < 240) [r, g, b] = [0, x, c];
  else if (hn < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to2 = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to2(r)}${to2(g)}${to2(b)}`.toLowerCase();
}

/** 解析种子色为 HSL；非法返回 null */
function seedToHsl(seed) {
  const rgb = hexToRgb(seed);
  if (!rgb) return null;
  return rgbToHsl(rgb.r, rgb.g, rgb.b);
}

/**
 * WCAG 2 相对亮度（0~1）。
 * @param {string} hex
 * @returns {number}
 */
function relativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const lin = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b);
}

/**
 * WCAG 对比度（1~21）。
 * @param {string} hexA 前景色
 * @param {string} hexB 背景色
 * @returns {number}
 */
function contrastRatio(hexA, hexB) {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * light/dark 两套角色 → 色调（亮度轴取值）映射。
 * 未列出的角色（success/warning/mask 等）走固定色相分支。
 */
const TONE_MAP = {
  light: {
    primary: 40, 'on-primary': 100, 'primary-container': 90, 'on-primary-container': 10,
    secondary: 40, 'on-secondary': 100, 'secondary-container': 90, 'on-secondary-container': 10,
    surface: 98, 'on-surface': 10, 'surface-variant': 90, 'on-surface-variant': 30,
    outline: 50, 'outline-variant': 80, 'inverse-surface': 20, 'inverse-on-surface': 95,
    'surface-muted': 94, 'primary-dark': 30,
  },
  dark: {
    primary: 80, 'on-primary': 20, 'primary-container': 30, 'on-primary-container': 90,
    secondary: 80, 'on-secondary': 20, 'secondary-container': 30, 'on-secondary-container': 90,
    surface: 10, 'on-surface': 90, 'surface-variant': 30, 'on-surface-variant': 80,
    outline: 60, 'outline-variant': 30, 'inverse-surface': 90, 'inverse-on-surface': 20,
    'surface-muted': 16, 'primary-dark': 60,
  },
};

/**
 * 从种子色派生颜色角色表。
 *
 * @param {Object} options
 * @param {string} options.seed 种子色（hex，如 '#6750A4'）；非法时抛错
 * @param {boolean} [options.dark=false] 是否取 dark 方案
 * @param {Object<string, string>} [options.overrides] 覆盖角色表（优先级最高，
 *   用于品牌色微调或兼容别名定制）
 * @returns {Object<string, string>} 颜色角色 → hex 字面量
 */
function deriveColorRoles({ seed, dark = false, overrides = {} }) {
  const hsl = seedToHsl(seed);
  if (!hsl) throw new Error(`[palette] 非法种子色: ${seed}`);
  const [h, s] = hsl;
  const neutralS = Math.min(s * 0.12, 10);
  const secondaryS = s * 0.35;
  const tones = TONE_MAP[dark ? 'dark' : 'light'];
  const out = {};
  for (const [role, tone] of Object.entries(tones)) {
    let hue = h;
    let sat = s;
    if (role.startsWith('surface') || role.startsWith('on-surface')
      || role === 'outline' || role === 'outline-variant'
      || role === 'inverse-surface' || role === 'inverse-on-surface') {
      sat = neutralS;
    } else if (role.startsWith('secondary')) {
      sat = secondaryS;
    }
    out[role] = hslToHex(hue, sat, tone);
  }
  // error：MD3 固定错误色相（≈hue 6）
  const errorHue = 6; const errorS = 68;
  out.error = hslToHex(errorHue, errorS, dark ? 80 : 40);
  out['on-error'] = hslToHex(errorHue, errorS, dark ? 20 : 100);
  out['error-container'] = hslToHex(errorHue, errorS, dark ? 30 : 90);
  out['on-error-container'] = hslToHex(errorHue, errorS, dark ? 90 : 10);
  // success / warning：固定色相，随方案取明暗
  out.success = hslToHex(152, 55, dark ? 80 : 35);
  out['on-success'] = hslToHex(152, 55, dark ? 20 : 100);
  out.warning = hslToHex(35, 80, dark ? 80 : 35);
  out['on-warning'] = hslToHex(35, 80, dark ? 20 : 100);
  // mask：遮罩基色（不透明度由 materials.mask 给出）
  out.mask = dark ? '#000000' : '#101418';
  // 兼容别名（既有 Cell/演示引用的角色名，与对应规范角色同值双写）
  out.text = out['on-surface'];
  out['text-secondary'] = out['on-surface-variant'];
  out['text-muted'] = out.outline;
  out.border = out['outline-variant'];
  out.danger = out.error;
  out['primary-soft'] = out['primary-container'];
  return { ...out, ...overrides };
}

export {
  hexToRgb,
  rgbToHsl,
  hslToHex,
  relativeLuminance,
  contrastRatio,
  deriveColorRoles,
};
