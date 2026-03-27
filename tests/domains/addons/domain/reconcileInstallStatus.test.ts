import { describe, expect, it } from 'vitest';
import {
  reconcile,
  deriveNameFromPath,
  type ReconcileInput,
} from '@src/domains/addons/domain/reconcileInstallStatus';
import {
  emptyLedger,
  type InstallationLedger,
  type InstalledAddonRecord,
} from '@src/domains/addons/domain/installationLedger';
import type { CatalogPlugin } from '@src/domains/addons/domain/catalogPlugin';
import type { IndexedSourceEntry } from '@src/domains/sources/domain/model';
import type { SourcePresetId } from '@src/shared/sourcePresetId';

// ── Test Factories ──────────────────────────────────────────────────

function snapshotRecord(path: string, preset: SourcePresetId = 'claude'): IndexedSourceEntry {
  return {
    id: `rec-${path}`,
    path,
    preset,
    category: 'skill',
    locality: 'workspace',
    tags: [],
    metadata: { byteLength: 100, updatedAt: '2025-01-01T00:00:00.000Z' },
  };
}

function catalogPlugin(
  name: string,
  originId = 'origin-a',
  overrides: Partial<CatalogPlugin> = {}
): CatalogPlugin {
  return {
    id: `${name}@${originId}`,
    originId,
    name,
    description: `Description of ${name}`,
    version: '1.0.0',
    category: 'skill',
    tags: [],
    keywords: [],
    source: { kind: 'relative', path: `./${name}` },
    installStatus: 'available',
    ...overrides,
  };
}

function ledgerRecord(
  name: string,
  originId = 'origin-a',
  installedFiles: readonly string[] = [],
  overrides: Partial<InstalledAddonRecord> = {}
): InstalledAddonRecord {
  return {
    id: `${name}@${originId}`,
    name,
    originId,
    presetId: 'claude',
    category: 'skill',
    version: '1.0.0',
    installedAt: '2025-01-01T00:00:00.000Z',
    installedFiles,
    installedJsonEntries: [],
    ...overrides,
  };
}

function ledgerWith(...records: InstalledAddonRecord[]): InstallationLedger {
  return { version: 1, records };
}

function input(overrides: Partial<ReconcileInput> = {}): ReconcileInput {
  return {
    targetPresetId: 'claude',
    snapshotRecords: [],
    ledger: emptyLedger(),
    catalogPlugins: [],
    ...overrides,
  };
}

// ── deriveNameFromPath ──────────────────────────────────────────────

describe('deriveNameFromPath', () => {
  it('extracts basename without extension for flat files', () => {
    expect(deriveNameFromPath('/home/user/.claude/commands/foo.md')).toBe('foo');
  });

  it('extracts folder name for SKILL.md layout', () => {
    expect(deriveNameFromPath('/home/user/.claude/skills/my-skill/SKILL.md')).toBe('my-skill');
  });

  it('handles Windows-style separators', () => {
    expect(deriveNameFromPath('C:\\Users\\me\\.claude\\commands\\bar.md')).toBe('bar');
  });

  it('handles bare filename without directory', () => {
    expect(deriveNameFromPath('notes.txt')).toBe('notes');
  });

  it('handles SKILL.md at root-like path', () => {
    expect(deriveNameFromPath('my-skill/SKILL.md')).toBe('my-skill');
  });
});

// ── reconcile ───────────────────────────────────────────────────────

describe('reconcile', () => {
  it('marks all plugins as available when ledger is empty and no name matches', () => {
    const result = reconcile(input({
      catalogPlugins: [catalogPlugin('foo'), catalogPlugin('bar')],
    }));

    expect(result.plugins).toHaveLength(2);
    expect(result.plugins.every((p) => p.installStatus === 'available')).toBe(true);
    expect(result.staleLedgerRecords).toHaveLength(0);
  });

  it('marks plugin as installed when ledger record exists and files are present', () => {
    const path = '/workspace/.claude/commands/foo.md';
    const result = reconcile(input({
      snapshotRecords: [snapshotRecord(path)],
      ledger: ledgerWith(ledgerRecord('foo', 'origin-a', [path])),
      catalogPlugins: [catalogPlugin('foo')],
    }));

    expect(result.plugins[0].installStatus).toBe('installed');
    expect(result.staleLedgerRecords).toHaveLength(0);
  });

  it('marks plugin as available and flags stale when ALL files are missing', () => {
    const missingPath = '/workspace/.claude/commands/foo.md';
    const result = reconcile(input({
      snapshotRecords: [],
      ledger: ledgerWith(ledgerRecord('foo', 'origin-a', [missingPath])),
      catalogPlugins: [catalogPlugin('foo')],
    }));

    expect(result.plugins[0].installStatus).toBe('available');
    expect(result.staleLedgerRecords).toHaveLength(1);
    expect(result.staleLedgerRecords[0].reason).toBe('files-missing');
    expect(result.staleLedgerRecords[0].missingPaths).toEqual([missingPath]);
  });

  it('marks plugin as installed via name-match heuristic when no ledger record exists', () => {
    const result = reconcile(input({
      snapshotRecords: [snapshotRecord('/workspace/.claude/commands/foo.md')],
      catalogPlugins: [catalogPlugin('foo')],
    }));

    expect(result.plugins[0].installStatus).toBe('installed');
  });

  it('does NOT re-mark installed via name-match when stale record was just pruned', () => {
    // A file named "foo" exists on disk, but the ledger record for foo@origin-a
    // pointed to a DIFFERENT path that's gone. The stale prune should block name-match.
    const result = reconcile(input({
      snapshotRecords: [snapshotRecord('/workspace/.claude/commands/foo.md')],
      ledger: ledgerWith(
        ledgerRecord('foo', 'origin-a', ['/workspace/.claude/skills/foo/SKILL.md'])
      ),
      catalogPlugins: [catalogPlugin('foo')],
    }));

    expect(result.plugins[0].installStatus).toBe('available');
    expect(result.staleLedgerRecords).toHaveLength(1);
  });

  it('classifies files-partially-missing correctly', () => {
    const presentPath = '/workspace/.claude/commands/foo.md';
    const missingPath = '/workspace/.claude/hooks/foo-hook.sh';
    const result = reconcile(input({
      snapshotRecords: [snapshotRecord(presentPath)],
      ledger: ledgerWith(
        ledgerRecord('foo', 'origin-a', [presentPath, missingPath])
      ),
      catalogPlugins: [catalogPlugin('foo')],
    }));

    expect(result.staleLedgerRecords).toHaveLength(1);
    expect(result.staleLedgerRecords[0].reason).toBe('files-partially-missing');
    expect(result.staleLedgerRecords[0].missingPaths).toEqual([missingPath]);
    // Plugin shows available since the record is stale
    expect(result.plugins[0].installStatus).toBe('available');
  });

  it('pruned ledger excludes only stale records', () => {
    const goodPath = '/workspace/.claude/commands/bar.md';
    const missingPath = '/workspace/.claude/commands/foo.md';
    const result = reconcile(input({
      snapshotRecords: [snapshotRecord(goodPath)],
      ledger: ledgerWith(
        ledgerRecord('foo', 'origin-a', [missingPath]),
        ledgerRecord('bar', 'origin-a', [goodPath])
      ),
      catalogPlugins: [catalogPlugin('foo'), catalogPlugin('bar')],
    }));

    expect(result.prunedLedger.records).toHaveLength(1);
    expect(result.prunedLedger.records[0].id).toBe('bar@origin-a');
  });

  it('does not flag ledger records from other presets as stale', () => {
    const cursorPath = '/workspace/.cursor/rules/foo.md';
    const result = reconcile(input({
      targetPresetId: 'claude',
      snapshotRecords: [],
      ledger: ledgerWith(
        ledgerRecord('foo', 'origin-a', [cursorPath], { presetId: 'cursor' })
      ),
      catalogPlugins: [catalogPlugin('foo')],
    }));

    // The cursor-preset record is not evaluated for staleness
    expect(result.staleLedgerRecords).toHaveLength(0);
    // But it IS treated as verified, so the plugin shows installed
    expect(result.plugins[0].installStatus).toBe('installed');
    expect(result.prunedLedger.records).toHaveLength(1);
  });

  it('handles same-name plugins from different origins independently', () => {
    const path = '/workspace/.claude/commands/foo.md';
    const result = reconcile(input({
      snapshotRecords: [snapshotRecord(path)],
      ledger: ledgerWith(
        ledgerRecord('foo', 'origin-a', [path])
      ),
      catalogPlugins: [
        catalogPlugin('foo', 'origin-a'),
        catalogPlugin('foo', 'origin-b'),
      ],
    }));

    const pluginA = result.plugins.find((p) => p.originId === 'origin-a')!;
    const pluginB = result.plugins.find((p) => p.originId === 'origin-b')!;

    // origin-a: installed via verified ledger record
    expect(pluginA.installStatus).toBe('installed');
    // origin-b: installed via name-match heuristic (file named "foo" exists)
    expect(pluginB.installStatus).toBe('installed');
  });

  it('derives correct name from folder-layout SKILL.md paths', () => {
    const path = '/workspace/.claude/skills/code-review/SKILL.md';
    const result = reconcile(input({
      snapshotRecords: [snapshotRecord(path)],
      catalogPlugins: [catalogPlugin('code-review')],
    }));

    expect(result.plugins[0].installStatus).toBe('installed');
  });
});
