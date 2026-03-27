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
import type { CatalogPlugin } from '@src/domains/addons/domain/catalogPlugin';
import { emptyMeta, addEntry, type AkashiMeta } from '@src/domains/addons/domain/akashiMeta';

// ── Factories ──────────────────────────────────────────────────────

const WS_ROOT = '/ws';
const USER_ROOT = '/home/user/.claude';
const ROOTS = { claudeUserRoot: USER_ROOT } as any;

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

function snapshot(records: ReturnType<typeof snapshotRecord>[] = []): SourceIndexSnapshot {
  return {
    generatedAt: '2025-01-01T00:00:00.000Z',
    sourceCount: records.length,
    records,
    artifacts: [],
  };
}

function catalogPlugin(name: string, originId = 'origin-a'): CatalogPlugin {
  return {
    id: `${name}@${originId}`,
    originId,
    name,
    description: `Desc of ${name}`,
    version: '1.0.0',
    category: 'skill',
    tags: [],
    keywords: [],
    source: { kind: 'relative', path: `./${name}` },
    installStatus: 'available',
  };
}

// ── Mock Ports ─────────────────────────────────────────────────────

function createMockPorts(opts: {
  snap?: SourceIndexSnapshot | null;
  wsMeta?: AkashiMeta;
  userMeta?: AkashiMeta;
  cachedPlugins?: readonly CatalogPlugin[];
} = {}) {
  const {
    snap = snapshot(),
    wsMeta = emptyMeta(),
    userMeta = emptyMeta(),
    cachedPlugins = [],
  } = opts;

  const writtenMetas: Array<{ locality: string; meta: AkashiMeta }> = [];

  const sourceSnapshot: SourceSnapshotPort = {
    getLastSnapshot: vi.fn(async () => snap),
  };

  const store: AddonsStorePort = {
    getCustomOrigins: () => [],
    saveCustomOrigins: vi.fn(async () => {}),
    getOriginOverrides: () => [],
    saveOriginOverrides: vi.fn(async () => {}),
    getCachedCatalog: vi.fn(() =>
      cachedPlugins.length > 0
        ? { originId: 'origin-a', fetchedAt: new Date().toISOString(), plugins: cachedPlugins }
        : null
    ),
    saveCachedCatalog: vi.fn(async () => {}),
    clearCachedCatalog: vi.fn(async () => {}),
  };

  const metaStore: AkashiMetaPort = {
    readMeta: vi.fn((locality: string) => (locality === 'workspace' ? wsMeta : userMeta)),
    writeMeta: vi.fn(async (locality: string, _ws: string, _ur: string, meta: AkashiMeta) => {
      writtenMetas.push({ locality, meta });
    }),
  };

  const fetcher: MarketplaceFetcherPort = {
    fetch: vi.fn(async () => ({ ok: true, data: {} })),
  };

  const installer: AddonInstallerPort = {
    installFromMarketplace: vi.fn(async () => ({ ok: true, createdPaths: ['/ws/.claude/skills/foo/SKILL.md'] })),
    installViaCreator: vi.fn(async () => ({ ok: true, createdPaths: [] })),
    removeTrackedFiles: vi.fn(async () => ({ ok: true })),
    removeDirectory: vi.fn(async () => ({ ok: true })),
  };

  return { sourceSnapshot, store, metaStore, fetcher, installer, writtenMetas };
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

// ── getCatalog ─────────────────────────────────────────────────────

describe('AddonsService.getCatalog', () => {
  it('returns null when snapshot is null', async () => {
    const ports = createMockPorts({ snap: null });
    const service = createService(ports);
    const result = await service.getCatalog('claude', WS_ROOT, ROOTS);
    expect(result).toBeNull();
  });

  it('marks plugin as available when not in meta', async () => {
    const ports = createMockPorts({
      snap: snapshot([snapshotRecord('/ws/.claude/skills/foo/SKILL.md')]),
      cachedPlugins: [catalogPlugin('bar')],
    });
    const service = createService(ports);
    const result = await service.getCatalog('claude', WS_ROOT, ROOTS);
    expect(result!.catalogPlugins[0].installStatus).toBe('available');
  });

  it('marks plugin as installed when name matches workspace meta entry', async () => {
    const wsMeta = addEntry(emptyMeta(), 'claude', {
      name: 'foo',
      category: 'skill',
      originId: 'origin-a',
      version: '1.0.0',
      installedPaths: [],
    });
    const ports = createMockPorts({
      snap: snapshot([snapshotRecord('/ws/.claude/skills/foo/SKILL.md')]),
      wsMeta,
      cachedPlugins: [catalogPlugin('foo')],
    });
    const service = createService(ports);
    const result = await service.getCatalog('claude', WS_ROOT, ROOTS);
    expect(result!.catalogPlugins[0].installStatus).toBe('installed');
  });

  it('marks plugin as installed when name matches user meta entry', async () => {
    const userMeta = addEntry(emptyMeta(), 'claude', {
      name: 'bar',
      category: 'skill',
      originId: 'origin-a',
      version: '1.0.0',
      installedPaths: [],
    });
    const ports = createMockPorts({
      snap: snapshot([snapshotRecord('/home/user/.claude/skills/bar/SKILL.md')]),
      userMeta,
      cachedPlugins: [catalogPlugin('bar')],
    });
    const service = createService(ports);
    const result = await service.getCatalog('claude', WS_ROOT, ROOTS);
    expect(result!.catalogPlugins[0].installStatus).toBe('installed');
  });

  it('auto-cleans stale workspace meta entry when files are gone from snapshot', async () => {
    const wsMeta = addEntry(emptyMeta(), 'claude', {
      name: 'gone-skill',
      category: 'skill',
      originId: 'origin-a',
      version: '1.0.0',
      installedPaths: [],
    });
    const ports = createMockPorts({
      snap: snapshot([]), // no files on disk
      wsMeta,
      cachedPlugins: [catalogPlugin('gone-skill')],
    });
    const service = createService(ports);
    const result = await service.getCatalog('claude', WS_ROOT, ROOTS);

    // Plugin should show as available (stale entry cleaned)
    expect(result!.catalogPlugins[0].installStatus).toBe('available');
    // Meta file should have been written to remove stale entry
    expect(ports.writtenMetas).toHaveLength(1);
    expect(ports.writtenMetas[0].locality).toBe('workspace');
    expect(ports.writtenMetas[0].meta.installed.claude ?? []).toHaveLength(0);
  });

  it('auto-cleans stale user meta entry when files are gone from snapshot', async () => {
    const userMeta = addEntry(emptyMeta(), 'claude', {
      name: 'gone-skill',
      category: 'skill',
      originId: 'origin-a',
      version: '1.0.0',
      installedPaths: [],
    });
    const ports = createMockPorts({
      snap: snapshot([]),
      userMeta,
      cachedPlugins: [catalogPlugin('gone-skill')],
    });
    const service = createService(ports);
    const result = await service.getCatalog('claude', WS_ROOT, ROOTS);

    expect(result!.catalogPlugins[0].installStatus).toBe('available');
    expect(ports.writtenMetas).toHaveLength(1);
    expect(ports.writtenMetas[0].locality).toBe('user');
  });

  it('does not write meta when no stale entries exist', async () => {
    const wsMeta = addEntry(emptyMeta(), 'claude', {
      name: 'foo',
      category: 'skill',
      originId: 'origin-a',
      version: '1.0.0',
      installedPaths: [],
    });
    const ports = createMockPorts({
      snap: snapshot([snapshotRecord('/ws/.claude/skills/foo/SKILL.md')]),
      wsMeta,
      cachedPlugins: [catalogPlugin('foo')],
    });
    const service = createService(ports);
    await service.getCatalog('claude', WS_ROOT, ROOTS);

    // No writes — meta is in sync with snapshot
    expect(ports.writtenMetas).toHaveLength(0);
  });

  it('handles empty catalog plugins list', async () => {
    const ports = createMockPorts({
      snap: snapshot([snapshotRecord('/ws/.claude/skills/foo/SKILL.md')]),
    });
    const service = createService(ports);
    const result = await service.getCatalog('claude', WS_ROOT, ROOTS);
    expect(result!.catalogPlugins).toEqual([]);
  });
});

// ── installPlugin ──────────────────────────────────────────────────

describe('AddonsService.installPlugin', () => {
  it('writes entry to meta file on successful install', async () => {
    const ports = createMockPorts();
    const service = createService(ports);

    const plugin = catalogPlugin('foo');
    const result = await service.installPlugin(plugin, 'workspace', WS_ROOT, ROOTS);

    expect(result.ok).toBe(true);
    expect(ports.writtenMetas).toHaveLength(1);
    expect(ports.writtenMetas[0].locality).toBe('workspace');
    const entries = ports.writtenMetas[0].meta.installed.claude;
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe('foo');
    expect(entries[0].category).toBe('skill');
    expect(entries[0].originId).toBe('origin-a');
  });

  it('writes to user meta when locality is user', async () => {
    const ports = createMockPorts();
    const service = createService(ports);

    const plugin = catalogPlugin('bar');
    const result = await service.installPlugin(plugin, 'user', WS_ROOT, ROOTS);

    expect(result.ok).toBe(true);
    expect(ports.writtenMetas).toHaveLength(1);
    expect(ports.writtenMetas[0].locality).toBe('user');
  });

  it('does not write meta when install fails', async () => {
    const ports = createMockPorts();
    // Both install paths must fail — installFromMarketplace won't be called
    // because origin-a isn't in built-in origins, so the fallback installViaCreator runs
    (ports.installer.installViaCreator as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      createdPaths: [],
      error: 'Download failed',
    });
    const service = createService(ports);

    const plugin = catalogPlugin('foo');
    const result = await service.installPlugin(plugin, 'workspace', WS_ROOT, ROOTS);

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Download failed');
    expect(ports.writtenMetas).toHaveLength(0);
  });
});
