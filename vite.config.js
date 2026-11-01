import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * 双用途配置：
 * - dev（vite）：仓库根为项目根，index.html 加载 playground/ 演示应用
 * - build（vite build）：库模式，入口 src/index.jsx，产出 ESM + CJS，
 *   react/react-dom 外部化（peerDependencies），demo 代码不进包
 */
export default defineConfig({
  plugins: [react()],
  // vitest 配置段：e2e/ 由 Playwright 执行，vitest 排除避免误捡 *.spec.js
  test: {
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
  build: {
    lib: {
      entry: 'src/index.jsx',
      formats: ['es', 'cjs'],
      fileName: (format) => `hound-ui-kit.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'],
      output: {
        globals: { react: 'React', 'react/jsx-runtime': 'jsxRuntime' },
      },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
});
