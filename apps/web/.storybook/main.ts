// This file has been automatically migrated to valid ESM format by Storybook.
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';
import path, { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config: StorybookConfig = {
  stories: ['../app/**/*.mdx', '../app/**/*.stories.@(ts|tsx)'],
  addons: [getAbsolutePath("@storybook/addon-docs")],
  framework: {
    name: getAbsolutePath("@storybook/react-vite"),
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

function getAbsolutePath(value: string): any {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
