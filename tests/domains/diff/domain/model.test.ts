import { describe, it, expect } from 'vitest';
import type {
  DiffTarget,
  DiffResult,
  DiffOutputFormat,
} from '../../../../src/domains/diff/domain/model';

describe('Diff domain model types', () => {
  it('DiffTarget supports working tree', () => {
    const target: DiffTarget = { kind: 'working' };
    expect(target.kind).toBe('working');
  });

  it('DiffTarget supports staged', () => {
    const target: DiffTarget = { kind: 'staged' };
    expect(target.kind).toBe('staged');
  });

  it('DiffTarget supports single commit ref', () => {
    const target: DiffTarget = { kind: 'commit', ref: 'HEAD~1' };
    expect(target.kind).toBe('commit');
    expect(target.ref).toBe('HEAD~1');
  });

  it('DiffTarget supports commit range', () => {
    const target: DiffTarget = { kind: 'range', from: 'main', to: 'feature' };
    expect(target.kind).toBe('range');
    expect(target.from).toBe('main');
    expect(target.to).toBe('feature');
  });

  it('DiffResult represents an empty diff', () => {
    const result: DiffResult = {
      target: { kind: 'working' },
      raw: '',
      isEmpty: true,
    };
    expect(result.isEmpty).toBe(true);
    expect(result.raw).toBe('');
  });

  it('DiffResult represents a non-empty diff', () => {
    const rawDiff = `diff --git a/file.ts b/file.ts
index abc..def 100644
--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,4 @@
 line1
+added
 line2
 line3`;

    const result: DiffResult = {
      target: { kind: 'staged' },
      raw: rawDiff,
      isEmpty: false,
    };
    expect(result.isEmpty).toBe(false);
    expect(result.raw).toContain('+added');
  });

  it('DiffOutputFormat accepts valid values', () => {
    const unified: DiffOutputFormat = 'line-by-line';
    const split: DiffOutputFormat = 'side-by-side';
    expect(unified).toBe('line-by-line');
    expect(split).toBe('side-by-side');
  });
});
