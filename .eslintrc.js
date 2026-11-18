module.exports = {
  extends: require.resolve('@umijs/max/eslint'),
  rules: {
    // 与 AGENTS.md 中沿用既有宽松比较的项目约定一致。
    eqeqeq: 'off',
  },
};
