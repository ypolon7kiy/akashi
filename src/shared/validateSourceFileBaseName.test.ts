import { describe, expect, it } from 'vitest';
import { validateSourceFileBaseName } from './validateSourceFileBaseName';

describe('validateSourceFileBaseName', () => {
  it('returns null for valid names', () => {
    expect(validateSourceFileBaseName('my-file')).toBeNull();
    expect(validateSourceFileBaseName('hello.md')).toBeNull();
    expect(validateSourceFileBaseName('dot.name.ext')).toBeNull();
    expect(validateSourceFileBaseName('a')).toBeNull();
  });

  it('rejects trailing space before trim', () => {
    expect(validateSourceFileBaseName('foo ')).toBe('Name cannot end with a space.');
  });

  it('rejects empty, dot, and dot-dot after trim', () => {
    expect(validateSourceFileBaseName('')).toBe('Enter a valid name.');
    expect(validateSourceFileBaseName('.')).toBe('Enter a valid name.');
    expect(validateSourceFileBaseName('..')).toBe('Enter a valid name.');
  });

  it('rejects whitespace-only input (trailing whitespace rule runs before trim)', () => {
    expect(validateSourceFileBaseName('   ')).toBe('Name cannot end with a space.');
  });

  it('rejects trailing period', () => {
    expect(validateSourceFileBaseName('foo.')).toBe('Name cannot end with a period.');
  });

  it.each(['/', '\\', '?', '%', '*', ':', '|', '"', '<', '>'])(
    'rejects invalid character %s',
    (ch) => {
      expect(validateSourceFileBaseName(`bad${ch}name`)).toBe(
        'Name cannot contain / \\ : * ? " < > |'
      );
    }
  );
});
