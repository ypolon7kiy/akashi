import { describe, expect, it, vi } from 'vitest';
import { AddonsService } from '@src/domains/addons/application/AddonsService';
import type {
  SourceSnapshotPort,
  AddonsStorePort,
  AkashiMetaPort,
  MarketplaceFetcherPort,
  AddonInstallerPort,
} from '@src/domains/addons/application/ports';
import type { SourceIndexSnapshot, SourceFacetTag } from '@src/domains/sources/domain/model';
import type { IndexedArtifact } from '@src/domains/sources/domain/artifact';
import type { ToolUserRoots } from '@src/shared/toolUserRoots';
import { emptyMeta, addEntry, type AkashiMeta } from '@src/domains/addons/domain/akashiMeta';

// ── Test Factories ──────────────────────────────────────────────────

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
    topLevel: true,
  };
}

function snapshotRecord(path: string) {
  return {
    id: `rec-${path}`,
    path,
    preset: 'claude' as const,
    category: 'skill' as const,
    locality: 'workspace' as const,
    tags: [] as readonly SourceFacetTag[],
    metadata: { byteLength: 100, updatedAt: '2025-01-01T00:00:00.000Z' },
  };
}

function snapshot(
  artifacts: IndexedArtifact[] = [],
  records: ReturnType<typeof snapshotRecord>[] = []
): SourceIndexSnapshot {
  return {
    generatedAt: '2025-01-01T00:00:00.000Z',
    sourceCount: records.length,
    records,
    artifacts,
  };
}

// ── Mock Port Factories ─────────────────────────────────────────────

const WS_ROOT = '/ws';
const USER_ROOT = '/home/user/.claude';
const ROOTS: ToolUserRoots = {
  claudeUserRoot: USER_ROOT,
  cursorUserRoot: '/home/user/.cursor',
  geminiUserRoot: '/home/user/.gemini',
  codexUserRoot: '/home/user/.codex',
};

function createMockPorts(
  snap: SourceIndexSnapshot | null = null,
  wsMeta: AkashiMeta = emptyMeta()
) {
  const removedFiles: string[][] = [];
  const removedDirs: string[] = [];
  const writtenMetas: { locality: string; meta: AkashiMeta }[] = [];

  const sourceSnapshot: SourceSnapshotPort = {
    getLastSnapshot: vi.fn(() => Promise.resolve(snap)),
  };

  const store: AddonsStorePort = {
    getCustomOrigins: () => [],
    saveCustomOrigins: vi.fn(() => Promise.resolve()),
    getOriginOverrides: () => [],
    saveOriginOverrides: vi.fn(() => Promise.resolve()),
    getCachedCatalog: () => null,
    saveCachedCatalog: vi.fn(() => Promise.resolve()),
    clearCachedCatalog: vi.fn(() => Promise.resolve()),
  };

  const metaStore: AkashiMetaPort = {
    readMeta: vi.fn((locality: string) => (locality === 'workspace' ? wsMeta : emptyMeta())),
    writeMeta: vi.fn((locality: string, _ws: string, _ur: string, meta: AkashiMeta) => {
      writtenMetas.push({ locality, meta });
      return Promise.resolve();
    }),
  };

  const fetcher: MarketplaceFetcherPort = {
    fetch: vi.fn(() => Promise.resolve({ ok: true, data: {} })),
  };

  const installer: AddonInstallerPort = {
    installFromMarketplace: vi.fn(() => Promise.resolve({ ok: true, createdPaths: [] })),
    installViaCreator: vi.fn(() => Promise.resolve({ ok: true, createdPaths: [] })),
    removeTrackedFiles: vi.fn((paths: readonly string[]) => {
      removedFiles.push([...paths]);
      return Promise.resolve({ ok: true });
    }),
    removeDirectory: vi.fn((dir: string) => {
      removedDirs.push(dir);
      return Promise.resolve({ ok: true });
    }),
  };

  return {
    sourceSnapshot,
    store,
    metaStore,
    fetcher,
    installer,
    removedFiles,
    removedDirs,
    writtenMetas,
  };
}

function createService(ports: ReturnType<typeof createMockPorts>) {
  return new AddonsService(
    ports.sourceSnapshot,
    ports.store,
    ports.fetcher,
    ports.installer,
    ports.metaStore
  );
}

// ── Tests ───────────────────────────────────────────────────────────

describe('AddonsService.deleteAddon', () => {
  it('returns error when neither primaryPath nor pluginId is provided', async () => {
    const ports = createMockPorts();
    const service = createService(ports);

    const result = await service.deleteAddon(WS_ROOT, ROOTS);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('No addon found to delete');
  });

  it('deletes single file by primaryPath', async () => {
    const snap = snapshot(
      [artifact('/ws/.claude/commands/foo.md', 'single-file')],
      [snapshotRecord('/ws/.claude/commands/foo.md')]
    );
    const ports = createMockPorts(snap);
    const service = createService(ports);

    const result = await service.deleteAddon(WS_ROOT, ROOTS, '/ws/.claude/commands/foo.md');
    expect(result.ok).toBe(true);
    expect(ports.removedFiles).toEqual([['/ws/.claude/commands/foo.md']]);
    expect(ports.removedDirs).toHaveLength(0);
  });

  it('removes entire folder for folder-file artifact', async () => {
    const snap = snapshot(
      [artifact('/ws/.claude/skills/my-skill/SKILL.md', 'folder-file')],
      [snapshotRecord('/ws/.claude/skills/my-skill/SKILL.md')]
    );
    const ports = createMockPorts(snap);
    const service = createService(ports);

    const result = await service.deleteAddon(
      WS_ROOT,
      ROOTS,
      '/ws/.claude/skills/my-skill/SKILL.md'
    );
    expect(result.ok).toBe(true);
    expect(ports.removedDirs).toEqual(['/ws/.claude/skills/my-skill']);
    expect(ports.removedFiles).toHaveLength(0);
  });

  it('propagates error when file removal fails', async () => {
    const snap = snapshot(
      [artifact('/ws/.claude/commands/foo.md', 'single-file')],
      [snapshotRecord('/ws/.claude/commands/foo.md')]
    );
    const ports = createMockPorts(snap);
    (ports.installer.removeTrackedFiles as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      error: 'EACCES: permission denied',
    });
    const service = createService(ports);

    const result = await service.deleteAddon(WS_ROOT, ROOTS, '/ws/.claude/commands/foo.md');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('EACCES: permission denied');
    // Meta should NOT be modified on failure
    expect(ports.writtenMetas).toHaveLength(0);
  });

  it('propagates error when directory removal fails', async () => {
    const snap = snapshot(
      [artifact('/ws/.claude/skills/my-skill/SKILL.md', 'folder-file')],
      [snapshotRecord('/ws/.claude/skills/my-skill/SKILL.md')]
    );
    const ports = createMockPorts(snap);
    (ports.installer.removeDirectory as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      error: 'EACCES: permission denied',
    });
    const service = createService(ports);

    const result = await service.deleteAddon(
      WS_ROOT,
      ROOTS,
      '/ws/.claude/skills/my-skill/SKILL.md'
    );
    expect(result.ok).toBe(false);
    expect(result.error).toBe('EACCES: permission denied');
  });

  it('falls back to single-file delete when snapshot has no artifacts', async () => {
    const snap = snapshot([]);
    const ports = createMockPorts(snap);
    const service = createService(ports);

    const result = await service.deleteAddon(WS_ROOT, ROOTS, '/ws/.claude/commands/foo.md');
    expect(result.ok).toBe(true);
    expect(ports.removedFiles).toEqual([['/ws/.claude/commands/foo.md']]);
    expect(ports.removedDirs).toHaveLength(0);
  });

  it('falls back to single-file delete when snapshot is null', async () => {
    const ports = createMockPorts(null);
    const service = createService(ports);

    const result = await service.deleteAddon(WS_ROOT, ROOTS, '/ws/.claude/commands/foo.md');
    expect(result.ok).toBe(true);
    expect(ports.removedFiles).toEqual([['/ws/.claude/commands/foo.md']]);
  });

  it('resolves path from snapshot by plugin name when pluginId provided', async () => {
    const snap = snapshot(
      [artifact('/ws/.claude/commands/foo.md', 'single-file')],
      [snapshotRecord('/ws/.claude/commands/foo.md')]
    );
    const ports = createMockPorts(snap);
    const service = createService(ports);

    const result = await service.deleteAddon(WS_ROOT, ROOTS, undefined, 'foo@origin-a');
    expect(result.ok).toBe(true);
    expect(ports.removedFiles).toEqual([['/ws/.claude/commands/foo.md']]);
  });

  it('resolves folder-file artifact from snapshot by plugin name', async () => {
    const snap = snapshot(
      [artifact('/ws/.claude/skills/foo/SKILL.md', 'folder-file')],
      [snapshotRecord('/ws/.claude/skills/foo/SKILL.md')]
    );
    const ports = createMockPorts(snap);
    const service = createService(ports);

    const result = await service.deleteAddon(WS_ROOT, ROOTS, undefined, 'foo@origin-a');
    expect(result.ok).toBe(true);
    expect(ports.removedDirs).toEqual(['/ws/.claude/skills/foo']);
    expect(ports.removedFiles).toHaveLength(0);
  });

  it('cleans up meta file entry on successful delete', async () => {
    const snap = snapshot(
      [artifact('/ws/.claude/commands/foo.md', 'single-file')],
      [snapshotRecord('/ws/.claude/commands/foo.md')]
    );
    const wsMeta = addEntry(emptyMeta(), 'claude', {
      name: 'foo',
      category: 'skill',
      originId: 'origin-a',
      version: '1.0.0',
      installedPaths: ['/ws/.claude/commands/foo.md'],
    });
    const ports = createMockPorts(snap, wsMeta);
    const service = createService(ports);

    const result = await service.deleteAddon(WS_ROOT, ROOTS, '/ws/.claude/commands/foo.md');
    expect(result.ok).toBe(true);
    expect(ports.writtenMetas).toHaveLength(1);
    expect(ports.writtenMetas[0].locality).toBe('workspace');
  });
});
