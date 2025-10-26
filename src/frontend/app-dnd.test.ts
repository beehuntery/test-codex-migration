import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

describe('public/app.js のドラッグ＆ドロップ配線', () => {
  it('dragover 処理で隣接する要素と入れ替えるかを確認する', () => {
    const sourcePath = path.resolve(__dirname, '../../public/app.js');
    const source = readFileSync(sourcePath, 'utf-8');

    expect(source).toMatch(/closest\(\s*['"]\.task['"]\)/);
    expect(source).toMatch(/midpoint/);
    expect(source).toMatch(/nextElementSibling/);
    expect(source).not.toMatch(/getDragAfterElement\s*\(/);
    expect(source).toMatch(/fetch\(\s*['"]\/api\/tasks\/reorder['"]/);
  });
});
