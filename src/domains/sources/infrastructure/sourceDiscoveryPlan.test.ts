import { describe, expect, it } from 'vitest';
import type { SourcePresetId } from '../domain/sourcePresetDefinition';
import { WORKSPACE_GLOB_SCAN_ROWS } from '../registerSourcePresets';
import { selectWorkspaceGlobRows } from './sourceDiscoveryPlan';

describe('selectWorkspaceGlobRows', () => {
  it('returns no rows when no active presets', () => {
    expect(selectWorkspaceGlobRows(new Set())).toEqual([]);
  });

  it('returns only rows for active presets', () => {
    const cursor = selectWorkspaceGlobRows(new Set<SourcePresetId>(['cursor']));
    expect(cursor.every((r) => r.presetId === 'cursor')).toBe(true);
    expect(cursor.length).toBeGreaterThan(0);

    const claude = selectWorkspaceGlobRows(new Set<SourcePresetId>(['claude']));
    expect(claude.every((r) => r.presetId === 'claude')).toBe(true);

    const both = selectWorkspaceGlobRows(new Set<SourcePresetId>(['cursor', 'claude']));
    const ids = new Set(both.map((r) => r.presetId));
    expect(ids.has('cursor')).toBe(true);
    expect(ids.has('claude')).toBe(true);
  });
});

describe('WORKSPACE_GLOB_SCAN_ROWS', () => {
  it('has unique (glob, presetId) pairs; same glob may appear on multiple presets', () => {
    const keys = WORKSPACE_GLOB_SCAN_ROWS.map((r) => `${r.glob}\0${r.presetId}`);
    expect(keys.length).toBe(new Set(keys).size);
  });

  it('includes **/AGENTS.md only for cursor and codex presets', () => {
    const agentsMd = WORKSPACE_GLOB_SCAN_ROWS.filter((r) => r.glob === '**/AGENTS.md');
    expect(agentsMd.map((r) => r.presetId).sort()).toEqual(['codex', 'cursor']);
    expect(agentsMd.every((r) => r.category === 'context')).toBe(true);
  });

  it('assigns categories to claude tool paths', () => {
    const settings = WORKSPACE_GLOB_SCAN_ROWS.find((r) => r.glob.includes('claude/settings.json'));
    expect(settings?.presetId).toBe('claude');
    expect(settings?.category).toBe('config');
  });

  it('assigns cursor mcp glob', () => {
    const mcp = WORKSPACE_GLOB_SCAN_ROWS.find((r) => r.glob.includes('mcp.json'));
    expect(mcp?.presetId).toBe('cursor');
    expect(mcp?.category).toBe('mcp');
  });
});
