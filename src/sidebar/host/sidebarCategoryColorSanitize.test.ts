import { describe, expect, it } from 'vitest';
import { sanitizeSidebarCategoryColorValue } from './sidebarCategoryColorSanitize';

describe('sanitizeSidebarCategoryColorValue', () => {
  it('accepts hex and var(--vscode-…)', () => {
    expect(sanitizeSidebarCategoryColorValue('#abc')).toBe('#abc');
    expect(sanitizeSidebarCategoryColorValue('#aabbcc')).toBe('#aabbcc');
    expect(sanitizeSidebarCategoryColorValue('var(--vscode-charts-orange)')).toBe(
      'var(--vscode-charts-orange)'
    );
  });

  it('rejects injection and bad hex', () => {
    expect(sanitizeSidebarCategoryColorValue('#ff;')).toBeUndefined();
    expect(sanitizeSidebarCategoryColorValue('red')).toBeUndefined();
    expect(sanitizeSidebarCategoryColorValue('')).toBeUndefined();
  });
});
