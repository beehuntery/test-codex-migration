// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import nextConfig from 'eslint-config-next';

const customConfig = [{
  ignores: [
    '.next/**',
    'dist/**',
    'storybook-static/**',
    'node_modules/**',
    'coverage/**',
    'test-results/**'
  ]
}, ...nextConfig, {
  rules: {
    'import/no-extraneous-dependencies': 'off',
    'import/no-anonymous-default-export': 'off',
    'react-hooks/set-state-in-effect': 'off',
    'react-hooks/exhaustive-deps': 'off'
  }
}, ...storybook.configs["flat/recommended"]];

export default customConfig;
