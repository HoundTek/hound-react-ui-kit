// @ts-check
import { test, expect } from '@playwright/test';

/**
 * 视觉回归矩阵：主题（light/dark）× 预设展示台。
 * 基线目录 e2e/visual.spec.js-snapshots/（提交入库），
 * CI 与本地同用系统 Chrome（darwin 后缀基线，ubuntu CI 需同平台或
 * 在对应平台更新基线；GitHub ubuntu-latest 预装 Chrome，基线平台一致时可比）。
 *
 * 页面导航现仅保留「预设展示台 / 文档」两项：文档页为 React 内联样式实现，
 * 其退出入口（← 返回展示台）与焦点/动效不在本视觉基线覆盖范围内，
 * 由人工验收（端到端测试交人工执行）。
 */

const SETTLE = 700;

async function openPresets(page) {
  await page.goto('/');
  await page.waitForTimeout(SETTLE);
}

async function gotoDark(page) {
  await page.getByText('🌙 切至深色').click();
  await page.waitForTimeout(SETTLE);
}

test('预设展示台 · light', async ({ page }) => {
  await openPresets(page);
  await expect(page).toHaveScreenshot('presets-light.png', { fullPage: true });
});

test('预设展示台 · dark', async ({ page }) => {
  await openPresets(page);
  await gotoDark(page);
  await expect(page).toHaveScreenshot('presets-dark.png', { fullPage: true });
});
