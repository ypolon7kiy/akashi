import { describe, expect, it } from 'vitest';
import { SIDEBAR_SOURCE_CATEGORY_KEYS } from '../../../shared/sourceCategoryKeys';
import {
  GRAPH_SOURCE_CATEGORY_HOVER_FALLBACKS,
  deriveCategoryHoverFromFill,
  resolveGraphSourceCategoryPalette,
} from './sourceCategoryPalette';

describe('deriveCategoryHoverFromFill', () => {
  it('derives a brighter hover color for parseable fills', () => {
    expect(deriveCategoryHoverFromFill('#000000')).toBe('#808080');
    expect(deriveCategoryHoverFromFill('rgb(10, 20, 30)')).toBe('#858a8f');
  });

  it('returns undefined for non-parseable fills', () => {
    expect(deriveCategoryHoverFromFill('var(--vscode-charts-orange)')).toBeUndefined();
    expect(deriveCategoryHoverFromFill('hsl(0, 0%, 50%)')).toBeUndefined();
  });
});

describe('resolveGraphSourceCategoryPalette', () => {
  it('returns a fill/hover pair for every source category key', () => {
    const fills = {
      context: '#000000',
      rule: '#101010',
      skill: '#202020',
      hook: '#303030',
      config: '#404040',
      mcp: '#505050',
      command: '#5a5a5a',
      unknown: '#606060',
    } as const;
    const palette = resolveGraphSourceCategoryPalette(fills);
    for (const key of SIDEBAR_SOURCE_CATEGORY_KEYS) {
      expect(palette[key]).toBeDefined();
      expect(palette[key].fill).toBe(fills[key]);
      expect(palette[key].hover).toMatch(/^#/);
    }
  });

  it('uses static hover fallback when fill cannot be parsed', () => {
    const palette = resolveGraphSourceCategoryPalette({
      context: 'var(--vscode-charts-orange)',
      rule: '#101010',
      skill: '#202020',
      hook: '#303030',
      config: '#404040',
      mcp: '#505050',
      command: '#5a5a5a',
      unknown: '#606060',
    });
    expect(palette.context.hover).toBe(GRAPH_SOURCE_CATEGORY_HOVER_FALLBACKS.context.hover);
  });
});
