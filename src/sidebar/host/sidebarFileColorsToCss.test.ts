import { describe, expect, it } from 'vitest';
import { fileColorsObjectToCssLines } from './sidebarFileColorsToCss';

describe('fileColorsObjectToCssLines', () => {
  it('maps known keys to CSS vars and skips invalid or empty', () => {
    expect(
      fileColorsObjectToCssLines({
        context: '#abc',
        rule: '',
        skill: 'bad',
        hook: '#f14c4c',
      })
    ).toEqual(['  --akashi-source-cat-context: #abc;', '  --akashi-source-cat-hook: #f14c4c;']);
  });

  it('returns empty for non-object', () => {
    expect(fileColorsObjectToCssLines(undefined)).toEqual([]);
    expect(fileColorsObjectToCssLines([])).toEqual([]);
  });
});
