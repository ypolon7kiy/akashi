import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SIDEBAR_FILE_COLORS,
  normalizeSidebarFileColors,
} from '@src/domains/config/domain/normalizeSidebarFileColors';

describe('normalizeSidebarFileColors', () => {
  it('merges valid user strings over package defaults', () => {
    const n = normalizeSidebarFileColors({ context: '#abc', hook: '#f14c4c' });
    expect(n.context).toBe('#abc');
    expect(n.hook).toBe('#f14c4c');
    expect(n.skill).toBe(DEFAULT_SIDEBAR_FILE_COLORS.skill);
  });

  it('ignores invalid values', () => {
    const n = normalizeSidebarFileColors({ context: 'nope', skill: '#b180d7' });
    expect(n.context).toBe(DEFAULT_SIDEBAR_FILE_COLORS.context);
    expect(n.skill).toBe('#b180d7');
  });

  it('returns defaults for non-object input', () => {
    expect(normalizeSidebarFileColors(undefined)).toEqual(DEFAULT_SIDEBAR_FILE_COLORS);
  });
});
