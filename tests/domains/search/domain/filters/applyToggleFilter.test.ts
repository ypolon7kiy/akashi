import { describe, expect, it } from 'vitest';
import { applyToggleFilter } from '@src/domains/search/domain/filters/applyToggleFilter';
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
  makeRecord({ id: 'r1', path: '/ws/a.md', category: 'context', preset: 'claude', locality: 'workspace' }),
  makeRecord({ id: 'r2', path: '/ws/b.md', category: 'rule', preset: 'cursor', locality: 'workspace' }),
  makeRecord({ id: 'r3', path: '/home/c.json', category: 'config', preset: 'claude', locality: 'user' }),
];

describe('applyToggleFilter', () => {
  it('all nulls pass all records through', () => {
    const step = applyToggleFilter(null, null, null);
    const result = step(RECORDS);
    expect(result).toBe(RECORDS);
  });

  it('filters by category', () => {
    const step = applyToggleFilter(new Set(['context']), null, null);
    const result = step(RECORDS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('r1');
  });

  it('filters by preset', () => {
    const step = applyToggleFilter(null, new Set(['cursor']), null);
    const result = step(RECORDS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('r2');
  });

  it('filters by locality', () => {
    const step = applyToggleFilter(null, null, new Set(['user']));
    const result = step(RECORDS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('r3');
  });

  it('combines multiple facets with AND logic', () => {
    const step = applyToggleFilter(new Set(['config']), new Set(['claude']), new Set(['user']));
    const result = step(RECORDS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('r3');
  });

  it('returns empty when no records match', () => {
    const step = applyToggleFilter(new Set(['skill']), null, null);
    const result = step(RECORDS);
    expect(result).toHaveLength(0);
  });

  it('multiple values in one facet uses OR within that facet', () => {
    const step = applyToggleFilter(new Set(['context', 'rule']), null, null);
    const result = step(RECORDS);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toEqual(['r1', 'r2']);
  });
});
