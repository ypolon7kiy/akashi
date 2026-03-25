import { describe, expect, it } from 'vitest';
import { applyFilterChain, type SourceFilterStep } from '@src/domains/search/domain/filterChain';
import type { SourceDescriptor } from '@src/shared/types/sourcesSnapshotPayload';

function makeRecord(overrides: Partial<SourceDescriptor> & { id: string; path: string }): SourceDescriptor {
  return {
    preset: 'claude',
    category: 'context',
    locality: 'workspace',
    tags: [],
    metadata: { byteLength: 100, updatedAt: '2026-01-01T00:00:00Z' },
    ...overrides,
  };
}

const RECORDS: readonly SourceDescriptor[] = [
  makeRecord({ id: 'r1', path: '/ws/a.md', category: 'context' }),
  makeRecord({ id: 'r2', path: '/ws/b.md', category: 'rule' }),
  makeRecord({ id: 'r3', path: '/ws/c.md', category: 'skill' }),
];

describe('applyFilterChain', () => {
  it('returns input unchanged with zero steps', () => {
    const result = applyFilterChain(RECORDS, []);
    expect(result).toBe(RECORDS);
  });

  it('applies a single filter step', () => {
    const step: SourceFilterStep = (records) => records.filter((r) => r.category === 'rule');
    const result = applyFilterChain(RECORDS, [step]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('r2');
  });

  it('chains two steps sequentially — second narrows first', () => {
    const keepContextOrRule: SourceFilterStep = (records) =>
      records.filter((r) => r.category === 'context' || r.category === 'rule');
    const keepOnlyA: SourceFilterStep = (records) =>
      records.filter((r) => r.path.includes('a.md'));

    const result = applyFilterChain(RECORDS, [keepContextOrRule, keepOnlyA]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('r1');
  });

  it('pass-through step preserves all records', () => {
    const passThrough: SourceFilterStep = (records) => records;
    const result = applyFilterChain(RECORDS, [passThrough, passThrough]);
    expect(result).toHaveLength(3);
  });

  it('empty result from first step gives second step nothing', () => {
    const rejectAll: SourceFilterStep = () => [];
    const keepAll: SourceFilterStep = (records) => records;
    const result = applyFilterChain(RECORDS, [rejectAll, keepAll]);
    expect(result).toHaveLength(0);
  });
});
