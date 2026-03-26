import { describe, expect, it } from 'vitest';
import {
  SOURCE_PRESET_DEFINITIONS,
  WORKSPACE_GLOB_SCAN_ROWS,
} from '@src/domains/sources/registerSourcePresets';
import { SourceCategoryId } from '@src/domains/sources/domain/sourceTags';

describe('SOURCE_PRESET_DEFINITIONS', () => {
  it('has four presets with ids and non-empty workspace globs or home tasks', () => {
    expect(SOURCE_PRESET_DEFINITIONS.length).toBe(4);
    const ids = SOURCE_PRESET_DEFINITIONS.map((p) => p.id).sort();
    expect(ids).toEqual(['antigravity', 'claude', 'codex', 'cursor']);
    for (const p of SOURCE_PRESET_DEFINITIONS) {
      expect(p.workspaceGlobContributions.length + p.homePathTasks.length).toBeGreaterThan(0);
    }
  });

  it('uses only known category strings on workspace rows', () => {
    const allowed = new Set<string>(Object.values(SourceCategoryId));
    for (const row of WORKSPACE_GLOB_SCAN_ROWS) {
      expect(allowed.has(row.category)).toBe(true);
    }
  });
});
