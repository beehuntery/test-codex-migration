export interface DragRect<T = unknown> {
  element: T;
  top: number;
  height: number;
}

export function findInsertTarget<T = unknown>(rects: DragRect<T>[], mouseY: number): DragRect<T> | null {
  const result = rects.reduce<{ offset: number; entry: DragRect<T> | null }>(
    (closest, entry) => {
      const offset = mouseY - entry.top - entry.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, entry };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, entry: null }
  );

  return result.entry;
}

export function getDragAfterElement(container: Element, mouseY: number): Element | null {
  const draggableElements = [...container.querySelectorAll('.task:not(.dragging)')];
  const rects = draggableElements.map((element) => {
    const box = element.getBoundingClientRect();
    return { element, top: box.top, height: box.height };
  });
  const target = findInsertTarget(rects, mouseY);
  return target ? target.element : null;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (err) {
    console.warn('Failed to evaluate prefers-reduced-motion media query', err);
    return false;
  }
}

export function animateReorder(previousRects: Map<Element, DOMRect>, elements: Element[]): void {
  const reduceMotion = prefersReducedMotion();

  elements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const prevRect = previousRects.get(el);
    if (!prevRect) {
      return;
    }

    const newRect = el.getBoundingClientRect();
    const deltaY = prevRect.top - newRect.top;
    if (!deltaY) {
      htmlEl.style.transform = '';
      htmlEl.style.transition = '';
      htmlEl.style.willChange = '';
      return;
    }

    if (reduceMotion) {
      htmlEl.style.transform = '';
      htmlEl.style.transition = '';
      htmlEl.style.willChange = '';
      return;
    }

    htmlEl.style.transition = 'none';
    htmlEl.style.transform = `translateY(${deltaY}px)`;
    htmlEl.style.willChange = 'transform';

    // Force layout before restoring transition to enable a smooth FLIP animation.
    void htmlEl.offsetWidth;

    requestAnimationFrame(() => {
      htmlEl.style.transition = '';
      htmlEl.style.transform = '';
      htmlEl.style.willChange = '';
    });
  });
}
