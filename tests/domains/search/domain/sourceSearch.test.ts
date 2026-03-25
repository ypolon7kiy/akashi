import { describe, expect, it } from 'vitest';
import {
  EMPTY_SEARCH_QUERY,
  isEmptySearchQuery,
  type SourceSearchQuery,
} from '@src/domains/search/domain/model';
import { searchSourceRecords } from '@src/domains/search/domain/searchRecords';
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
  makeRecord({ id: 'r1', path: '/ws/CLAUDE.md', preset: 'claude', category: 'context', locality: 'workspace' }),
  makeRecord({ id: 'r2', path: '/ws/.cursor/rules/style.md', preset: 'cursor', category: 'rule', locality: 'workspace' }),
  makeRecord({ id: 'r3', path: '/home/.claude/settings.json', preset: 'claude', category: 'config', locality: 'user' }),
  makeRecord({ id: 'r4', path: '/ws/.claude/skills/lint/SKILL.md', preset: 'claude', category: 'skill', locality: 'workspace' }),
  makeRecord({ id: 'r5', path: '/ws/.codex/config.toml', preset: 'codex', category: 'config', locality: 'workspace' }),
];

describe('isEmptySearchQuery', () => {
  it('returns true for EMPTY_SEARCH_QUERY', () => {
    expect(isEmptySearchQuery(EMPTY_SEARCH_QUERY)).toBe(true);
  });

  it('returns false when text is non-empty', () => {
    expect(isEmptySearchQuery({ ...EMPTY_SEARCH_QUERY, text: 'foo' })).toBe(false);
  });

  it('returns false when a facet set is non-null', () => {
    expect(isEmptySearchQuery({ ...EMPTY_SEARCH_QUERY, categories: new Set(['rule']) })).toBe(false);
  });
});

describe('searchSourceRecords', () => {
  it('returns all records for empty query', () => {
    const result = searchSourceRecords(RECORDS, EMPTY_SEARCH_QUERY);
    expect(result.matchCount).toBe(5);
    expect(result.totalRecords).toBe(5);
    expect(result.matchedRecordIds.size).toBe(5);
    expect(result.matchedPaths.size).toBe(5);
  });

  it('filters by category', () => {
    const q: SourceSearchQuery = { ...EMPTY_SEARCH_QUERY, categories: new Set(['config']) };
    const result = searchSourceRecords(RECORDS, q);
    expect(result.matchCount).toBe(2);
    expect(result.matchedRecordIds).toEqual(new Set(['r3', 'r5']));
  });

  it('filters by preset', () => {
    const q: SourceSearchQuery = { ...EMPTY_SEARCH_QUERY, presets: new Set(['cursor']) };
    const result = searchSourceRecords(RECORDS, q);
    expect(result.matchCount).toBe(1);
    expect(result.matchedRecordIds).toEqual(new Set(['r2']));
  });

  it('filters by locality', () => {
    const q: SourceSearchQuery = { ...EMPTY_SEARCH_QUERY, localities: new Set(['user']) };
    const result = searchSourceRecords(RECORDS, q);
    expect(result.matchCount).toBe(1);
    expect(result.matchedRecordIds).toEqual(new Set(['r3']));
  });

  it('filters by free text (case-insensitive path match)', () => {
    const q: SourceSearchQuery = { ...EMPTY_SEARCH_QUERY, text: 'skill' };
    const result = searchSourceRecords(RECORDS, q);
    expect(result.matchCount).toBe(1);
    expect(result.matchedRecordIds).toEqual(new Set(['r4']));
  });

  it('combines facet + text filters', () => {
    const q: SourceSearchQuery = {
      text: 'claude',
      categories: new Set(['config']),
      presets: null,
      localities: null,
    };
    const result = searchSourceRecords(RECORDS, q);
    expect(result.matchCount).toBe(1);
    expect(result.matchedRecordIds).toEqual(new Set(['r3']));
  });

  it('returns empty when no records match', () => {
    const q: SourceSearchQuery = { ...EMPTY_SEARCH_QUERY, text: 'nonexistent' };
    const result = searchSourceRecords(RECORDS, q);
    expect(result.matchCount).toBe(0);
    expect(result.matchedRecordIds.size).toBe(0);
  });

  it('handles empty records array', () => {
    const result = searchSourceRecords([], EMPTY_SEARCH_QUERY);
    expect(result.matchCount).toBe(0);
    expect(result.totalRecords).toBe(0);
  });

  it('combines all three facets', () => {
    const q: SourceSearchQuery = {
      text: '',
      categories: new Set(['config']),
      presets: new Set(['claude']),
      localities: new Set(['user']),
    };
    const result = searchSourceRecords(RECORDS, q);
    expect(result.matchCount).toBe(1);
    expect(result.matchedRecordIds).toEqual(new Set(['r3']));
  });

  it('matchedPaths contains the file paths of matched records', () => {
    const q: SourceSearchQuery = { ...EMPTY_SEARCH_QUERY, presets: new Set(['codex']) };
    const result = searchSourceRecords(RECORDS, q);
    expect(result.matchedPaths).toEqual(new Set(['/ws/.codex/config.toml']));
  });
});
