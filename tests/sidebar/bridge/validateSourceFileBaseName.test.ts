import { describe, expect, it } from 'vitest';
import { validateSourceFileBaseName } from '@src/sidebar/bridge/validateSourceFileBaseName';

describe('validateSourceFileBaseName', () => {
  it('accepts simple names', () => {
    expect(validateSourceFileBaseName('foo.ts')).toBeNull();
    expect(validateSourceFileBaseName('  bar')).toBeNull();
  });

  it('rejects empty and reserved', () => {
    expect(validateSourceFileBaseName('')).not.toBeNull();
    expect(validateSourceFileBaseName('.')).not.toBeNull();
    expect(validateSourceFileBaseName('..')).not.toBeNull();
  });

  it('rejects path separators and illegal chars', () => {
    expect(validateSourceFileBaseName('a/b')).not.toBeNull();
    expect(validateSourceFileBaseName('a\\b')).not.toBeNull();
    expect(validateSourceFileBaseName('a:b')).not.toBeNull();
  });

  it('rejects trailing space or period', () => {
    expect(validateSourceFileBaseName('x ')).not.toBeNull();
    expect(validateSourceFileBaseName('x.')).not.toBeNull();
  });
});
