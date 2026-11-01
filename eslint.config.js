import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

/**
 * ESLint 扁平配置（CI 门禁）。分级策略：
 * - error：正确性向规则（no-unused-expressions、可能的 bug、hooks 规则）
 * - warn：风格与卫生类（unused vars、React 版本相关），存量代码渐进清零
 * - off：与本项目约定冲突项（prop-types 用 JSDoc 替代；jsx-uses-react 由
 *   react-jsx runtime 自动处理）
 */
export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'playground/**/tmp*'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      // process：vite 构建期替换 process.env.NODE_ENV（runtime.js isDev 判定）
      globals: { ...globals.browser, ...globals.es2022, process: 'readonly' },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, 'react-hooks': reactHooks },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/prop-types': 'off',
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      // Cell 架构约定：视图持有 builder/cell 可变实例并经其读写状态
      //（外部 store 模式），编译器式 immutability 检查与本架构冲突，关闭
      'react-hooks/immutability': 'off',
      // 订阅前同步 setState 补漏是 useCellData/useNodeData 的有意模式，降级观察
      'react-hooks/set-state-in-effect': 'warn',
      'no-unused-vars': ['warn', { args: 'after-used', caughtErrors: 'none' }],
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'warn',
    },
  },
  {
    files: ['test/**/*.{js,jsx}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      'no-unused-expressions': 'off',
    },
  },
  {
    files: ['*.config.js', 'eslint.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
];
