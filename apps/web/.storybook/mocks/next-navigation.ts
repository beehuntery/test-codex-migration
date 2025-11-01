import { useSyncExternalStore } from 'react';
import { action } from '@storybook/addon-actions';

let currentPathname = '/';
let currentParams = new URLSearchParams();
const listeners = new Set<() => void>();

function notify() {
  const callbacks = Array.from(listeners);
  callbacks.forEach((listener) => listener());
}

function resolveUrl(href: string) {
  try {
    return new URL(href, 'http://storybook.local');
  } catch (error) {
    console.warn('[storybook] failed to resolve url for next/navigation mock:', error);
    return new URL('http://storybook.local');
  }
}

export function __setMockUrl(href: string) {
  const url = resolveUrl(href);
  const nextPathname = url.pathname;
  const nextParams = new URLSearchParams(url.search);

  if (nextPathname === currentPathname && nextParams.toString() === currentParams.toString()) {
    return;
  }

  currentPathname = nextPathname;
  currentParams = nextParams;
  notify();
}

export function usePathname(): string {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => currentPathname,
    () => currentPathname
  );
}

export function useSearchParams(): URLSearchParams {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => currentParams,
    () => currentParams
  );
}

export function useRouter() {
  return {
    replace: (href: string) => {
      action('router.replace')(href);
      __setMockUrl(href);
    }
  };
}

export function useParams() {
  return {};
}

export function useSelectedLayoutSegments(): string[] {
  return [];
}

export function __resetMockNavigation() {
  const nextPathname = '/';
  const nextParams = new URLSearchParams();

  if (nextPathname === currentPathname && nextParams.toString() === currentParams.toString()) {
    return;
  }

  currentPathname = nextPathname;
  currentParams = nextParams;
  notify();
}
