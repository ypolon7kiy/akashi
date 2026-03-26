import * as path from 'node:path';
import * as os from 'node:os';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import type { SourcePresetId } from '@src/shared/sourcePresetId';
import { WORKSPACE_GLOB_SCAN_ROWS } from '@src/domains/sources/registerSourcePresets';
import {
  collectHomeSourcePaths,
  selectWorkspaceGlobRows,
} from '@src/domains/sources/infrastructure/sourceDiscoveryPlan';

function rootsForHome(homeDir: string) {
  return {
    claudeUserRoot: path.join(homeDir, '.claude'),
    cursorUserRoot: path.join(homeDir, '.cursor'),
    geminiUserRoot: path.join(homeDir, '.gemini'),
    codexUserRoot: path.join(homeDir, '.codex'),
    skipDirNames: new Set<string>(),
  };
}

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

  it('assigns claude commands glob to command category', () => {
    const row = WORKSPACE_GLOB_SCAN_ROWS.find(
      (r) => r.presetId === 'claude' && r.glob === '**/.claude/commands/**/*.md'
    );
    expect(row?.category).toBe('command');
  });

  it('assigns mcp globs for cursor and claude', () => {
    const cursorMcp = WORKSPACE_GLOB_SCAN_ROWS.find((r) => r.glob === '**/.cursor/mcp.json');
    expect(cursorMcp?.presetId).toBe('cursor');
    expect(cursorMcp?.category).toBe('mcp');

    const claudeMcp = WORKSPACE_GLOB_SCAN_ROWS.find((r) => r.glob === '**/.mcp.json');
    expect(claudeMcp?.presetId).toBe('claude');
    expect(claudeMcp?.category).toBe('mcp');
  });

  it('assigns cursor preset globs for rules markdown, hooks, commands, and .agents skills', () => {
    const cursor = (g: string) =>
      WORKSPACE_GLOB_SCAN_ROWS.find((r) => r.presetId === 'cursor' && r.glob === g);

    expect(cursor('**/.cursor/rules/**/*.md')?.category).toBe('rule');
    expect(cursor('**/.cursor/hooks.json')?.category).toBe('hook');
    expect(cursor('**/.cursor/commands/**/*.md')?.category).toBe('command');
    expect(cursor('**/.agents/skills/**/*')?.category).toBe('skill');
  });

  it('assigns codex preset globs for recursive rules, skill bundles, and instruction fallbacks', () => {
    const codex = (g: string) =>
      WORKSPACE_GLOB_SCAN_ROWS.find((r) => r.presetId === 'codex' && r.glob === g);

    expect(codex('**/.codex/rules/**/*.rules')?.category).toBe('rule');
    expect(codex('**/.codex/skills/**/*')?.category).toBe('skill');
    expect(codex('**/.agents/skills/**/*')?.category).toBe('skill');
    expect(codex('**/.agents.md')?.category).toBe('context');
  });

  it('assigns antigravity .gemini/settings.json glob to config category', () => {
    const row = WORKSPACE_GLOB_SCAN_ROWS.find(
      (r) => r.presetId === 'antigravity' && r.glob === '**/.gemini/settings.json'
    );
    expect(row?.category).toBe('config');
  });
});

describe('collectHomeSourcePaths', () => {
  it('discovers claude user-scope settings.json as config', async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), 'akashi-src-home-'));
    try {
      await mkdir(path.join(tmp, '.claude'), { recursive: true });
      const settingsPath = path.join(tmp, '.claude', 'settings.json');
      await writeFile(settingsPath, '{}');
      const out = await collectHomeSourcePaths(tmp, new Set<SourcePresetId>(['claude']), {
        ...rootsForHome(tmp),
      });
      const hit = out.find((d) => d.path === settingsPath);
      expect(hit).toMatchObject({ presetId: 'claude', category: 'config' });
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('discovers antigravity user-scope ~/.gemini/settings.json as config', async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), 'akashi-src-gem-'));
    try {
      await mkdir(path.join(tmp, '.gemini'), { recursive: true });
      const settingsPath = path.join(tmp, '.gemini', 'settings.json');
      await writeFile(settingsPath, '{}');
      const out = await collectHomeSourcePaths(tmp, new Set<SourcePresetId>(['antigravity']), {
        ...rootsForHome(tmp),
      });
      const hit = out.find((d) => d.path === settingsPath);
      expect(hit).toMatchObject({ presetId: 'antigravity', category: 'config' });
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});
