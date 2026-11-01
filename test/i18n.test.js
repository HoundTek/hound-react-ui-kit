// @vitest-environment jsdom
/**
 * @file I18n 补强回归：内置 hk.* 语言包合并与覆盖、Intl 复数选择、
 *       数字/日期格式化、插值与回退链、预设默认文案随语言切换。
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { I18n, I18nProvider, DataDag, createRuntime } from '../src/index.jsx';
import { ConfirmCell, ConfirmAssembledView } from '../src/builtin-cells/confirm';

describe('内置语言包合并', () => {
  it('未提供 hk.* 文案时取内置译文（zh-CN / en）', () => {
    const zh = new I18n({}, 'zh-CN');
    expect(zh.t('hk.confirm.ok')).toBe('确定');
    const en = new I18n({ en: {} }, 'en');
    expect(en.t('hk.confirm.ok')).toBe('OK');
    expect(en.t('hk.upload.text')).toBe('Choose File');
  });

  it('应用同名 key 覆盖内置', () => {
    const i18n = new I18n({ 'zh-CN': { 'hk.confirm.ok': '好' } }, 'zh-CN');
    expect(i18n.t('hk.confirm.ok')).toBe('好');
    expect(i18n.t('hk.confirm.cancel')).toBe('取消'); // 未覆盖仍取内置
  });

  it('builtIn:false 关闭内置合并', () => {
    const i18n = new I18n({}, 'zh-CN', { builtIn: false });
    expect(i18n.t('hk.confirm.ok')).toBe('hk.confirm.ok');
  });
});

describe('Intl 复数', () => {
  it('en：count=1 走 .one，其余走 .other', () => {
    const i18n = new I18n({}, 'en');
    expect(i18n.t('hk.file.count', { count: 1 })).toBe('1 file');
    expect(i18n.t('hk.file.count', { count: 3 })).toBe('3 files');
  });

  it('zh：各类别同形（other 回退可用）', () => {
    const i18n = new I18n({}, 'zh-CN');
    expect(i18n.t('hk.file.count', { count: 1 })).toBe('1 个文件');
    expect(i18n.t('hk.file.count', { count: 12 })).toBe('12 个文件');
  });

  it('无复数变体时回退原 key 并插值 count', () => {
    const i18n = new I18n({ en: { 'x.items': '{count} items' } }, 'en');
    expect(i18n.t('x.items', { count: 2 })).toBe('2 items');
  });
});

describe('Intl 格式化', () => {
  it('n()：千分位与货币（按 locale）', () => {
    const en = new I18n({}, 'en');
    expect(en.n(12345.6)).toBe('12,345.6');
    expect(en.n(9.9, { style: 'currency', currency: 'USD' })).toBe('$9.90');
    const de = new I18n({ de: {} }, 'de');
    expect(de.n(1234.5)).toBe('1.234,5');
  });

  it('dt()：日期按 locale 格式化', () => {
    const en = new I18n({}, 'en');
    const d = new Date(2026, 10, 1);
    expect(en.dt(d, { year: 'numeric', month: 'short', day: 'numeric' })).toBe('Nov 1, 2026');
  });

  it('语言切换后 t/n/dt 即时反映新 locale', () => {
    const i18n = new I18n({}, 'zh-CN');
    i18n.setLocale('en');
    expect(i18n.t('hk.login.submit')).toBe('Sign In');
    expect(i18n.n(12345.6)).toBe('12,345.6');
  });
});

describe('回退链与插值（既有语义保持）', () => {
  it('当前语言缺失 → fallback 语言 → key 本身', () => {
    const i18n = new I18n({ en: { 'a.b': 'B' } }, 'fr', { fallbackLocale: 'en' });
    expect(i18n.t('a.b')).toBe('B');
    expect(i18n.t('missing.key')).toBe('missing.key');
  });

  it('插值未提供的变量保留原样', () => {
    const i18n = new I18n({ en: { k: 'Hi {name}, {x}' } }, 'en');
    expect(i18n.t('k', { name: 'F' })).toBe('Hi F, {x}');
  });
});

describe('预设默认文案随语言切换', () => {
  function renderConfirm(locale) {
    const dag = new DataDag({ runtime: createRuntime() });
    const cell = new ConfirmCell('c');
    cell.setText('msg').mount(dag._root);
    const i18n = new I18n({}, locale);
    const { container } = render(
      React.createElement(I18nProvider, { i18n }, React.createElement(ConfirmAssembledView, { cell })),
    );
    return Array.from(container.querySelectorAll('button')).map((b) => b.textContent);
  }

  it('zh-CN 默认按钮为 取消/确定', () => {
    expect(renderConfirm('zh-CN')).toEqual(['取消', '确定']);
  });

  it('en 默认按钮为 Cancel/OK', () => {
    expect(renderConfirm('en')).toEqual(['Cancel', 'OK']);
  });
});
