import { defineConfig } from '@playwright/test';

/**
 * 视觉回归矩阵配置。
 * - 浏览器统一走系统 Chrome（channel: 'chrome'）——本地与 GitHub ubuntu-latest
 *   均预装，基线跨环境可比，避免 playwright 自带 chromium 的字体渲染差异
 * - webServer 复用已启动的 vite dev（reuseExistingServer），CI 中自动拉起
 * - 截图禁动画、整页捕获；1% 像素容差吸收抗锯齿抖动
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
    },
  },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5199',
    channel: 'chrome',
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: 'yarn dev --port 5199 --strictPort',
    url: 'http://localhost:5199',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
