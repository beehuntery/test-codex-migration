import nextConfig from 'eslint-config-next';

const customConfig = [
  {
    ignores: [
      '.next/**',
      'dist/**',
      'storybook-static/**',
      'node_modules/**',
      'coverage/**',
      'test-results/**'
    ]
  },
  ...nextConfig,
  {
    rules: {
      'import/no-extraneous-dependencies': 'off',
      'import/no-anonymous-default-export': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/exhaustive-deps': 'off'
    }
  }
];

export default customConfig;
