import { describe, expect, it } from 'vitest';
import { buildRecordToArtifactMap, getArtifactMembers } from '@src/domains/sources/domain/artifactLookup';
import { linkArtifacts } from '@src/domains/sources/domain/artifactLinker';
import { sourceRecordId } from '@src/shared/sourceRecordId';
import type { IndexedSourceEntry, SourceCategory } from '@src/domains/sources/domain/model';
import type { SourcePresetId } from '@src/shared/sourcePresetId';
import type { SourceLocality } from '@src/domains/sources/domain/artifactKind';

function entry(
  path: string,
  preset: SourcePresetId,
  locality: SourceLocality,
  category: SourceCategory,
): IndexedSourceEntry {
  return {
    id: sourceRecordId(preset, locality, path),
    path,
    preset,
    category,
    locality,
    tags: [],
    metadata: { byteLength: 1, updatedAt: '2025-01-01T00:00:00.000Z' },
  };
}

describe('buildRecordToArtifactMap', () => {
  it('maps every member record id to its artifact id', () => {
    const entries = [
      entry('/ws/.claude/hooks/lint.sh', 'claude', 'workspace', 'hook'),
      entry('/ws/.claude/settings.json', 'claude', 'workspace', 'config'),
      entry('/ws/.claude/rules/foo.md', 'claude', 'workspace', 'rule'),
    ];
    const artifacts = linkArtifacts(entries);
    const map = buildRecordToArtifactMap(artifacts);

    // Every entry should appear in the map
    for (const e of entries) {
      expect(map.has(e.id)).toBe(true);
    }
  });

  it('returns empty map for empty artifacts', () => {
    const map = buildRecordToArtifactMap([]);
    expect(map.size).toBe(0);
  });
});

describe('getArtifactMembers', () => {
  it('returns the member entries for a compound artifact', () => {
    const script = entry('/ws/.claude/hooks/lint.sh', 'claude', 'workspace', 'hook');
    const config = entry('/ws/.claude/settings.json', 'claude', 'workspace', 'config');
    const other = entry('/ws/.claude/rules/foo.md', 'claude', 'workspace', 'rule');
    const entries = [script, config, other];
    const artifacts = linkArtifacts(entries);
    const compound = artifacts.find((a) => a.shape === 'file-json')!;

    const members = getArtifactMembers(compound.id, artifacts, entries);
    expect(members).toHaveLength(2);
    expect(members.map((m) => m.id).sort()).toEqual([script.id, config.id].sort());
  });

  it('returns empty array for unknown artifact id', () => {
    const members = getArtifactMembers('nonexistent', [], []);
    expect(members).toEqual([]);
  });
});
