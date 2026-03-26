import { describe, expect, it } from 'vitest';
import { applyTextFilter } from '@src/domains/search/domain/filters/applyTextFilter';
import type { SourceDescriptor } from '@src/shared/types/sourcesSnapshotPayload';

function makeRecord(
  overrides: Partial<SourceDescriptor> & { id: string; path: string }
): SourceDescriptor {
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
  makeRecord({ id: 'r1', path: '/ws/CLAUDE.md' }),
  makeRecord({ id: 'r2', path: '/ws/.cursor/rules/style.md' }),
  makeRecord({ id: 'r3', path: '/home/.claude/settings.json' }),
];

describe('applyTextFilter', () => {
  it('empty text passes all records through', () => {
    const step = applyTextFilter('');
    const result = step(RECORDS);
    expect(result).toBe(RECORDS);
  });

  it('matches case-insensitively on path', () => {
    const step = applyTextFilter('claude');
    const result = step(RECORDS);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toEqual(['r1', 'r3']);
  });

  it('matches substring', () => {
    const step = applyTextFilter('cursor');
    const result = step(RECORDS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('r2');
  });

  it('returns empty when no records match', () => {
    const step = applyTextFilter('nonexistent');
    const result = step(RECORDS);
    expect(result).toHaveLength(0);
  });

  it('matches with mixed case input', () => {
    const step = applyTextFilter('SETTINGS');
    const result = step(RECORDS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('r3');
  });
});
