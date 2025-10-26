declare module '../../public/drag-utils.js' {
  interface DragRect<T = unknown> {
    element: T;
    top: number;
    height: number;
  }

  export function findInsertTarget<T = unknown>(rects: DragRect<T>[], mouseY: number): DragRect<T> | null;
  export function getDragAfterElement(container: Element, mouseY: number): Element | null;
  export function animateReorder(previousRects: Map<Element, DOMRect>, elements: Element[]): void;
}
