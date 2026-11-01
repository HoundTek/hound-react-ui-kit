/**
 * commitlint 规则：conventional commits（type(scope): subject）。
 * subject 允许中文与英文专有名词开头，故关闭大小写类校验（中文无大小写语义）。
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [0],
  },
};
