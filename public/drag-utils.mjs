const SELECTOR = '.task:not(.dragging)';

export function findInsertTarget(rects, mouseY) {
  return rects.reduce(
    (closest, entry) => {
      const offset = mouseY - entry.top - entry.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, entry };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, entry: null }
  ).entry;
}

export function getDragAfterElement(container, mouseY) {
  const draggableElements = [...container.querySelectorAll(SELECTOR)];
  const rects = draggableElements.map((element) => {
    const box = element.getBoundingClientRect();
    return { element, top: box.top, height: box.height };
  });
  const target = findInsertTarget(rects, mouseY);
  return target ? target.element : null;
}

function prefersReducedMotion() {
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

export function animateReorder(previousRects, elements) {
  const reduceMotion = prefersReducedMotion();

  elements.forEach((el) => {
    const prevRect = previousRects.get(el);
    if (!prevRect) {
      return;
    }
    const newRect = el.getBoundingClientRect();
    const deltaY = prevRect.top - newRect.top;
    if (!deltaY) {
      el.style.transform = '';
      el.style.transition = '';
      el.style.willChange = '';
      return;
    }

    if (reduceMotion) {
      el.style.transform = '';
      el.style.transition = '';
      el.style.willChange = '';
      return;
    }

    el.style.transition = 'none';
    el.style.transform = `translateY(${deltaY}px)`;
    el.style.willChange = 'transform';

    // Force layout before restoring transition to enable a smooth FLIP animation.
    void el.offsetWidth;

    requestAnimationFrame(() => {
      el.style.transition = '';
      el.style.transform = '';
      el.style.willChange = '';
    });
  });
}
