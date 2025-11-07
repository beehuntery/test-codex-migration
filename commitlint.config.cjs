module.exports = {
  extends: ['@commitlint/config-conventional'],
  ignores: [(message) => /^Bump .+ from .+ to .+$/.test(message)],
  rules: {
    'body-max-line-length': [0, 'always'],
    'footer-max-line-length': [0, 'always'],
  },
};
