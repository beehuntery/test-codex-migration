module.exports = {
  extends: ['@commitlint/config-conventional'],
  ignores: [(message) => /^Bump .+ from .+ to .+$/.test(message)],
};
