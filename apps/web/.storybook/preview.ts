import type { Preview } from '@storybook/react';
import '../app/globals.css';

declare const global: typeof globalThis & { process?: { env: Record<string, string | undefined> } };

// Provide sensible defaults for environment variables when running in Storybook
if (typeof global.process === 'undefined') {
  global.process = { env: {} } as { env: Record<string, string | undefined> };
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/
      }
    },
    backgrounds: {
      default: 'surface',
      values: [
        { name: 'surface', value: 'var(--color-base)' },
        { name: 'white', value: '#ffffff' }
      ]
    }
  }
};

export default preview;
