import { describe, it, expect } from 'vitest';
import { findInsertTarget } from './drag-utils';

describe('findInsertTarget の判定ロジック', () => {
  const rects = [
    { element: { id: 'first' }, top: 100, height: 60 },
    { element: { id: 'second' }, top: 180, height: 60 },
    { element: { id: 'third' }, top: 260, height: 60 }
  ];

  it('ポインタが全要素の下側にある場合は null を返す', () => {
    const result = findInsertTarget(rects, 400);
    expect(result).toBeNull();
  });

  it('ポインタが最上段より上にある場合は先頭要素を返す', () => {
    const result = findInsertTarget(rects, 80);
    expect(result?.element.id).toBe('first');
  });

  it('1番目と2番目の間にある場合は2番目の要素を返す', () => {
    const result = findInsertTarget(rects, 160);
    expect(result?.element.id).toBe('second');
  });

  it('2番目と3番目の間にある場合は3番目の要素を返す', () => {
    const result = findInsertTarget(rects, 240);
    expect(result?.element.id).toBe('third');
  });
});
