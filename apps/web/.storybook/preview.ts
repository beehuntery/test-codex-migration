import type { Preview } from '@storybook/react-vite';
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
      options: {
        surface: { name: 'surface', value: 'var(--color-base)' },
        white: { name: 'white', value: '#ffffff' }
      }
    }
  },

  initialGlobals: {
    backgrounds: {
      value: 'surface'
    }
  }
};

export default preview;
