import { describe, expect, it, vi } from 'vitest';
import { AddonsService } from '@src/domains/addons/application/AddonsService';
import {
  emptyLedger,
  addToLedger,
  type InstalledAddonRecord,
  type InstallationLedger,
} from '@src/domains/addons/domain/installationLedger';
import type { SourceSnapshotPort, AddonsStorePort, MarketplaceFetcherPort, AddonInstallerPort } from '@src/domains/addons/application/ports';
import type { SourceIndexSnapshot } from '@src/domains/sources/domain/model';
import type { IndexedArtifact } from '@src/domains/sources/domain/artifact';

// ── Test Factories ──────────────────────────────────────────────────

function ledgerRecord(
  name: string,
  installedFiles: readonly string[],
  overrides: Partial<InstalledAddonRecord> = {}
): InstalledAddonRecord {
  return {
    id: `${name}@origin-a`,
    name,
    originId: 'origin-a',
    presetId: 'claude',
    category: 'skill',
    version: '1.0.0',
    installedAt: '2025-01-01T00:00:00.000Z',
    installedFiles,
    installedJsonEntries: [],
    ...overrides,
  };
}

function artifact(
  primaryPath: string,
  shape: IndexedArtifact['shape'] = 'single-file'
): IndexedArtifact {
  return {
    id: `artifact:${shape}:test`,
    presetId: 'claude',
    category: 'skill',
    locality: 'workspace',
    shape,
    memberRecordIds: ['rec-1'],
    primaryPath,
  };
}

function snapshot(artifacts: IndexedArtifact[] = []): SourceIndexSnapshot {
  return {
    generatedAt: '2025-01-01T00:00:00.000Z',
    sourceCount: 0,
    records: [],
    artifacts,
  };
}

// ── Mock Port Factories ─────────────────────────────────────────────

function createMockPorts(ledger: InstallationLedger = emptyLedger(), snap: SourceIndexSnapshot | null = null) {
  const savedLedgers: InstallationLedger[] = [];
  const removedFiles: string[][] = [];
  const removedDirs: string[] = [];

  const sourceSnapshot: SourceSnapshotPort = {
    getLastSnapshot: vi.fn(async () => snap),
  };

  const store: AddonsStorePort = {
    getCustomOrigins: () => [],
    saveCustomOrigins: vi.fn(async () => {}),
    getOriginOverrides: () => [],
    saveOriginOverrides: vi.fn(async () => {}),
    getLedger: () => ledger,
    saveLedger: vi.fn(async (l: InstallationLedger) => { savedLedgers.push(l); }),
    getCachedCatalog: () => null,
    saveCachedCatalog: vi.fn(async () => {}),
    clearCachedCatalog: vi.fn(async () => {}),
  };

  const fetcher: MarketplaceFetcherPort = {
    fetch: vi.fn(async () => ({ ok: true, data: {} })),
  };

  const installer: AddonInstallerPort = {
    installFromMarketplace: vi.fn(async () => ({ ok: true, createdPaths: [] })),
    installViaCreator: vi.fn(async () => ({ ok: true, createdPaths: [] })),
    removeTrackedFiles: vi.fn(async (paths: readonly string[]) => {
      removedFiles.push([...paths]);
      return { ok: true };
    }),
    removeDirectory: vi.fn(async (dir: string) => {
      removedDirs.push(dir);
      return { ok: true };
    }),
  };

  return { sourceSnapshot, store, fetcher, installer, savedLedgers, removedFiles, removedDirs };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('AddonsService.deleteAddon', () => {
  it('returns error when neither primaryPath nor pluginId is provided', async () => {
    const ports = createMockPorts();
    const service = new AddonsService(ports.sourceSnapshot, ports.store, ports.fetcher, ports.installer);

    const result = await service.deleteAddon(undefined, undefined);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('No addon found to delete');
  });

  it('deletes single file by primaryPath when no ledger record exists', async () => {
    const snap = snapshot([artifact('/ws/.claude/commands/foo.md', 'single-file')]);
    const ports = createMockPorts(emptyLedger(), snap);
    const service = new AddonsService(ports.sourceSnapshot, ports.store, ports.fetcher, ports.installer);

    const result = await service.deleteAddon('/ws/.claude/commands/foo.md');
    expect(result.ok).toBe(true);
    expect(ports.removedFiles).toEqual([['/ws/.claude/commands/foo.md']]);
    expect(ports.removedDirs).toHaveLength(0);
    expect(ports.savedLedgers).toHaveLength(0);
  });

  it('deletes tracked files + cleans ledger when pluginId matches a ledger record (single-file)', async () => {
    const rec = ledgerRecord('foo', ['/ws/.claude/commands/foo.md']);
    const ledger = addToLedger(emptyLedger(), rec);
    const snap = snapshot([artifact('/ws/.claude/commands/foo.md', 'single-file')]);
    const ports = createMockPorts(ledger, snap);
    const service = new AddonsService(ports.sourceSnapshot, ports.store, ports.fetcher, ports.installer);

    const result = await service.deleteAddon(undefined, 'foo@origin-a');
    expect(result.ok).toBe(true);
    expect(ports.removedFiles).toEqual([['/ws/.claude/commands/foo.md']]);
    expect(ports.savedLedgers).toHaveLength(1);
    expect(ports.savedLedgers[0].records).toHaveLength(0);
  });

  it('finds ledger record by path when pluginId is not provided', async () => {
    const rec = ledgerRecord('foo', ['/ws/.claude/commands/foo.md']);
    const ledger = addToLedger(emptyLedger(), rec);
    const snap = snapshot([artifact('/ws/.claude/commands/foo.md', 'single-file')]);
    const ports = createMockPorts(ledger, snap);
    const service = new AddonsService(ports.sourceSnapshot, ports.store, ports.fetcher, ports.installer);

    const result = await service.deleteAddon('/ws/.claude/commands/foo.md');
    expect(result.ok).toBe(true);
    expect(ports.removedFiles).toEqual([['/ws/.claude/commands/foo.md']]);
    expect(ports.savedLedgers).toHaveLength(1);
    expect(ports.savedLedgers[0].records).toHaveLength(0);
  });

  it('removes entire folder for folder-file artifact WITHOUT ledger record', async () => {
    const snap = snapshot([artifact('/ws/.claude/skills/my-skill/SKILL.md', 'folder-file')]);
    const ports = createMockPorts(emptyLedger(), snap);
    const service = new AddonsService(ports.sourceSnapshot, ports.store, ports.fetcher, ports.installer);

    const result = await service.deleteAddon('/ws/.claude/skills/my-skill/SKILL.md');
    expect(result.ok).toBe(true);
    expect(ports.removedDirs).toEqual(['/ws/.claude/skills/my-skill']);
    expect(ports.removedFiles).toHaveLength(0);
    expect(ports.savedLedgers).toHaveLength(0);
  });

  it('removes entire folder for folder-file artifact WITH ledger record', async () => {
    const rec = ledgerRecord('my-skill', [
      '/ws/.claude/skills/my-skill/SKILL.md',
      '/ws/.claude/skills/my-skill/README.md',
    ]);
    const ledger = addToLedger(emptyLedger(), rec);
    const snap = snapshot([artifact('/ws/.claude/skills/my-skill/SKILL.md', 'folder-file')]);
    const ports = createMockPorts(ledger, snap);
    const service = new AddonsService(ports.sourceSnapshot, ports.store, ports.fetcher, ports.installer);

    const result = await service.deleteAddon('/ws/.claude/skills/my-skill/SKILL.md');
    expect(result.ok).toBe(true);
    // Should use removeDirectory, not removeTrackedFiles
    expect(ports.removedDirs).toEqual(['/ws/.claude/skills/my-skill']);
    expect(ports.removedFiles).toHaveLength(0);
    // Ledger should still be cleaned
    expect(ports.savedLedgers).toHaveLength(1);
    expect(ports.savedLedgers[0].records).toHaveLength(0);
  });

  it('propagates error when file removal fails', async () => {
    const snap = snapshot([artifact('/ws/.claude/commands/foo.md', 'single-file')]);
    const ports = createMockPorts(emptyLedger(), snap);
    (ports.installer.removeTrackedFiles as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      error: 'EACCES: permission denied',
    });
    const service = new AddonsService(ports.sourceSnapshot, ports.store, ports.fetcher, ports.installer);

    const result = await service.deleteAddon('/ws/.claude/commands/foo.md');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('EACCES: permission denied');
    // Ledger should NOT be modified on failure
    expect(ports.savedLedgers).toHaveLength(0);
  });

  it('propagates error when directory removal fails', async () => {
    const snap = snapshot([artifact('/ws/.claude/skills/my-skill/SKILL.md', 'folder-file')]);
    const ports = createMockPorts(emptyLedger(), snap);
    (ports.installer.removeDirectory as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      error: 'EACCES: permission denied',
    });
    const service = new AddonsService(ports.sourceSnapshot, ports.store, ports.fetcher, ports.installer);

    const result = await service.deleteAddon('/ws/.claude/skills/my-skill/SKILL.md');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('EACCES: permission denied');
  });

  it('does not clean ledger when removal fails even if record exists', async () => {
    const rec = ledgerRecord('foo', ['/ws/.claude/commands/foo.md']);
    const ledger = addToLedger(emptyLedger(), rec);
    const snap = snapshot([artifact('/ws/.claude/commands/foo.md', 'single-file')]);
    const ports = createMockPorts(ledger, snap);
    (ports.installer.removeTrackedFiles as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      error: 'ENOENT',
    });
    const service = new AddonsService(ports.sourceSnapshot, ports.store, ports.fetcher, ports.installer);

    const result = await service.deleteAddon(undefined, 'foo@origin-a');
    expect(result.ok).toBe(false);
    // Ledger must NOT be modified when deletion fails
    expect(ports.savedLedgers).toHaveLength(0);
  });

  it('falls back to single-file delete when snapshot has no artifacts', async () => {
    const snap = snapshot([]);
    const ports = createMockPorts(emptyLedger(), snap);
    const service = new AddonsService(ports.sourceSnapshot, ports.store, ports.fetcher, ports.installer);

    const result = await service.deleteAddon('/ws/.claude/commands/foo.md');
    expect(result.ok).toBe(true);
    expect(ports.removedFiles).toEqual([['/ws/.claude/commands/foo.md']]);
    expect(ports.removedDirs).toHaveLength(0);
  });

  it('falls back to single-file delete when snapshot is null', async () => {
    const ports = createMockPorts(emptyLedger(), null);
    const service = new AddonsService(ports.sourceSnapshot, ports.store, ports.fetcher, ports.installer);

    const result = await service.deleteAddon('/ws/.claude/commands/foo.md');
    expect(result.ok).toBe(true);
    expect(ports.removedFiles).toEqual([['/ws/.claude/commands/foo.md']]);
  });
});
