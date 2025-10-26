import { describe, it, expect, afterEach, vi } from 'vitest';
import { animateReorder } from './drag-utils';

class FakeElement {
  rect: { top: number; height: number };
  style: { transition: string; transform: string; willChange: string } = {
    transition: '',
    transform: '',
    willChange: ''
  };

  constructor(rect: { top: number; height: number }) {
    this.rect = rect;
  }

  setRect(rect: { top: number; height: number }) {
    this.rect = rect;
  }

  getBoundingClientRect(): DOMRect {
    return { top: this.rect.top, height: this.rect.height } as DOMRect;
  }

  get offsetWidth(): number {
    return 0;
  }
}

const originalWindow = globalThis.window;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (originalWindow === undefined) {
    delete (globalThis as { window?: unknown }).window;
  } else {
    (globalThis as { window?: unknown }).window = originalWindow;
  }
});

describe('animateReorder のアニメーション制御', () => {
  it('FLIP の変換指示を適用してインラインスタイルをリセットする', () => {
    const fake = new FakeElement({ top: 120, height: 40 });
    fake.setRect({ top: 60, height: 40 });
    const element = fake as unknown as HTMLElement;

    const previousRects = new Map<Element, DOMRect>([
      [element, { top: 120, height: 40 } as DOMRect]
    ]);

    const rafCallbacks: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    });

    animateReorder(previousRects, [element]);

    expect(element.style.transition).toBe('none');
    expect(element.style.transform).toBe('translateY(60px)');
    expect(element.style.willChange).toBe('transform');

    rafCallbacks.forEach((callback) => callback(performance.now()));

    expect(element.style.transition).toBe('');
    expect(element.style.transform).toBe('');
    expect(element.style.willChange).toBe('');
  });

  it('prefers-reduced-motion が有効な場合はアニメーションをスキップする', () => {
    (globalThis as { window?: unknown }).window = {
      matchMedia: () => ({ matches: true })
    };

    const fake = new FakeElement({ top: 80, height: 50 });
    fake.setRect({ top: 20, height: 50 });
    const element = fake as unknown as HTMLElement;

    const previousRects = new Map<Element, DOMRect>([
      [element, { top: 80, height: 50 } as DOMRect]
    ]);

    const raf = vi.fn();
    vi.stubGlobal('requestAnimationFrame', raf);

    animateReorder(previousRects, [element]);

    expect(element.style.transition).toBe('');
    expect(element.style.transform).toBe('');
    expect(element.style.willChange).toBe('');
    expect(raf).not.toHaveBeenCalled();
  });
});
