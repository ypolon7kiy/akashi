import { describe, expect, it } from 'vitest';
import { userOverridesSidebarFileColorsToCssLines } from '@src/domains/config/domain/userOverridesSidebarFileColorsToCssLines';

describe('userOverridesSidebarFileColorsToCssLines', () => {
  it('maps known keys to CSS vars and skips invalid or empty', () => {
    expect(
      userOverridesSidebarFileColorsToCssLines({
        context: '#abc',
        rule: '',
        skill: 'bad',
        hook: '#f14c4c',
      })
    ).toEqual(['  --akashi-source-cat-context: #abc;', '  --akashi-source-cat-hook: #f14c4c;']);
  });

  it('returns empty for non-object input', () => {
    expect(userOverridesSidebarFileColorsToCssLines(undefined)).toEqual([]);
    expect(userOverridesSidebarFileColorsToCssLines([])).toEqual([]);
  });
});
