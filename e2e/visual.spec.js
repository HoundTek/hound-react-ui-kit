// @ts-check
import { test, expect } from '@playwright/test';

/**
 * 视觉回归矩阵：主题（light/dark）× 页面（预设展示台/工作台）。
 * 基线目录 e2e/visual.spec.js-snapshots/（提交入库），
 * CI 与本地同用系统 Chrome（darwin 后缀基线，ubuntu CI 需同平台或
 * 在对应平台更新基线；GitHub ubuntu-latest 预装 Chrome，基线平台一致时可比）。
 */

const SETTLE = 700;

async function openPresets(page) {
  await page.goto('/');
  await page.waitForTimeout(SETTLE);
}

async function gotoWorkbench(page) {
  await page.getByText('工作台', { exact: true }).first().click();
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

test('工作台 · light', async ({ page }) => {
  await openPresets(page);
  await gotoWorkbench(page);
  await expect(page).toHaveScreenshot('workbench-light.png', { fullPage: true });
});

test('工作台 · dark（经预设页切换）', async ({ page }) => {
  await openPresets(page);
  await gotoDark(page);
  await expect(page).toHaveScreenshot('presets-dark.png', { fullPage: true });
  await gotoWorkbench(page);
  await expect(page).toHaveScreenshot('workbench-dark.png', { fullPage: true });
});
