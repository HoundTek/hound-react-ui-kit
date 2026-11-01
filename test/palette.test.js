/**
 * @file 种子色板派生回归用例：色彩换算往返、light/dark 角色映射方向性、
 *       WCAG 对比度健全性、覆盖优先级、确定性、Theme.fromSeed/配对工厂。
 */
import { describe, it, expect } from 'vitest';
import {
  contrastRatio, relativeLuminance, deriveColorRoles,
} from '../src/index.jsx';
import { hexToRgb, rgbToHsl, hslToHex } from '../src/core/theme/palette';
import Theme, { createSeedThemePair } from '../src/core/theme/theme';

const SEED = '#6750a4';

describe('色彩换算', () => {
  it('hex → rgb → hsl → hex 往返稳定', () => {
    const rgb = hexToRgb(SEED);
    const [h, s, l] = rgbToHsl(rgb.r, rgb.g, rgb.b);
    expect(hslToHex(h, s, l)).toBe(SEED);
  });

  it('非法 hex 返回 null', () => {
    expect(hexToRgb('not-a-color')).toBeNull();
    expect(hexToRgb(123)).toBeNull();
  });

  it('相对亮度边界：黑 0 / 白 1', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
  });
});

describe('deriveColorRoles', () => {
  it('light：primary 为深色、on-primary 为白、对比度达 WCAG AA', () => {
    const roles = deriveColorRoles({ seed: SEED });
    expect(relativeLuminance(roles.primary)).toBeLessThan(0.5);
    expect(roles['on-primary']).toBe('#ffffff');
    expect(contrastRatio(roles['on-primary'], roles.primary)).toBeGreaterThanOrEqual(4.5);
  });

  it('light：on-surface 与 surface 高对比', () => {
    const roles = deriveColorRoles({ seed: SEED });
    expect(contrastRatio(roles['on-surface'], roles.surface)).toBeGreaterThanOrEqual(7);
  });

  it('dark：primary 亮于 surface、on-primary 转深', () => {
    const roles = deriveColorRoles({ seed: SEED, dark: true });
    expect(relativeLuminance(roles.primary)).toBeGreaterThan(relativeLuminance(roles.surface));
    expect(relativeLuminance(roles['on-primary'])).toBeLessThan(0.5);
  });

  it('中性/次要色饱和度收缩：surface 比 primary 更灰', () => {
    const roles = deriveColorRoles({ seed: SEED });
    const [, sp] = rgbToHsl(...Object.values(hexToRgb(roles.primary)));
    const [, ss] = rgbToHsl(...Object.values(hexToRgb(roles.surface)));
    expect(ss).toBeLessThan(sp);
  });

  it('兼容别名与规范角色同值双写', () => {
    const roles = deriveColorRoles({ seed: SEED });
    expect(roles.text).toBe(roles['on-surface']);
    expect(roles.border).toBe(roles['outline-variant']);
    expect(roles.danger).toBe(roles.error);
    expect(roles['primary-soft']).toBe(roles['primary-container']);
  });

  it('overrides 优先级最高', () => {
    const roles = deriveColorRoles({ seed: SEED, overrides: { primary: '#ff0000' } });
    expect(roles.primary).toBe('#ff0000');
  });

  it('非法种子抛错；同输入确定性', () => {
    expect(() => deriveColorRoles({ seed: 'oops' })).toThrow(/非法种子色/);
    expect(deriveColorRoles({ seed: SEED })).toEqual(deriveColorRoles({ seed: SEED }));
  });
});

describe('Theme.fromSeed / createSeedThemePair', () => {
  it('fromSeed 生成可解析角色的 Theme，colors 覆盖优先', () => {
    const t = Theme.fromSeed({
      seed: SEED,
      materials: { colors: { surface: '#123456' }, mask: { color: '#000', opacity: 0.5 } },
    });
    expect(t.name).toBe('seed-light');
    expect(t.resolveColor('surface')).toBe('#123456');
    expect(t.resolveColor('primary')).toBe(deriveColorRoles({ seed: SEED }).primary);
    expect(t.getMask()).toEqual({ color: '#000', opacity: 0.5 });
  });

  it('配对主题：共享形状/角色表，色板明暗方向相反', () => {
    const shape = { layers: { default: [{ inset: 0, radius: 12 }] } };
    const pair = createSeedThemePair({ seed: SEED, name: 'demo', shape });
    expect(pair.light.name).toBe('demo-light');
    expect(pair.dark.name).toBe('demo-dark');
    expect(pair.light.getShapeLayers('default')).toEqual(shape.layers.default);
    expect(pair.dark.getShapeLayers('default')).toEqual(shape.layers.default);
    const ls = relativeLuminance(pair.light.resolveColor('surface'));
    const ds = relativeLuminance(pair.dark.resolveColor('surface'));
    expect(ls).toBeGreaterThan(ds);
    expect(contrastRatio(pair.dark.resolveColor('on-surface'), pair.dark.resolveColor('surface')))
      .toBeGreaterThanOrEqual(7);
  });
});
