import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';
import path from 'path';

const config: StorybookConfig = {
  stories: ['../app/**/*.mdx', '../app/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-interactions'],
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  core: {
    disableTelemetry: true
  },
  async viteFinal(baseConfig) {
    return mergeConfig(baseConfig, {
      resolve: {
        alias: {
          '@shared': path.resolve(__dirname, '../../../src/shared'),
          '@shared/*': path.resolve(__dirname, '../../../src/shared/*'),
          '@app': path.resolve(__dirname, '../app'),
          '@styles': path.resolve(__dirname, '../styles'),
          'server-only': path.resolve(__dirname, './mocks/server-only.ts'),
          'next/cache': path.resolve(__dirname, './mocks/next-cache.ts'),
          'next/navigation': path.resolve(__dirname, './mocks/next-navigation.ts')
        }
      }
    });
  }
};

export default config;
