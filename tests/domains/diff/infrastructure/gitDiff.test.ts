import { describe, it, expect } from 'vitest';
import { buildDiffArgs } from '../../../../src/domains/diff/infrastructure/gitDiff';
import type { DiffTarget } from '../../../../src/domains/diff/domain/model';

describe('buildDiffArgs', () => {
  it('builds args for working tree diff', () => {
    const target: DiffTarget = { kind: 'working' };
    expect(buildDiffArgs(target)).toEqual(['diff', '--no-color', '-U3']);
  });

  it('builds args for staged diff', () => {
    const target: DiffTarget = { kind: 'staged' };
    expect(buildDiffArgs(target)).toEqual(['diff', '--no-color', '-U3', '--cached']);
  });

  it('builds args for single commit diff', () => {
    const target: DiffTarget = { kind: 'commit', ref: 'abc123' };
    expect(buildDiffArgs(target)).toEqual(['diff', '--no-color', '-U3', 'abc123^', 'abc123']);
  });

  it('builds args for commit range diff', () => {
    const target: DiffTarget = { kind: 'range', from: 'HEAD~3', to: 'HEAD' };
    expect(buildDiffArgs(target)).toEqual(['diff', '--no-color', '-U3', 'HEAD~3', 'HEAD']);
  });
});
