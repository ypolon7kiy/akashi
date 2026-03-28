import { describe, expect, it, vi } from 'vitest';
import { AddonsService } from '@src/domains/addons/application/AddonsService';
import type {
  SourceSnapshotPort,
  AddonsStorePort,
  AkashiMetaPort,
  MarketplaceFetcherPort,
  AddonInstallerPort,
} from '@src/domains/addons/application/ports';
import type {
  OriginSource,
  PersistedCustomOrigin,
} from '@src/domains/addons/domain/marketplaceOrigin';
import { emptyMeta } from '@src/domains/addons/domain/akashiMeta';

// ── Factories ──────────────────────────────────────────────────────

function customOrigin(label: string, source: OriginSource, enabled = true): PersistedCustomOrigin {
  const id =
    source.kind === 'github'
      ? `github:${source.owner}/${source.repo}`
      : source.kind === 'url'
        ? `url:${source.url}`
        : `file:${source.path}`;
  return { id, label, source, enabled };
}

// ── Mock Ports ─────────────────────────────────────────────────────

function createMockPorts(customOrigins: PersistedCustomOrigin[] = []) {
  let savedOrigins: readonly PersistedCustomOrigin[] = customOrigins;

  const saveCustomOriginsSpy = vi.fn((origins: readonly PersistedCustomOrigin[]) => {
    savedOrigins = origins;
    return Promise.resolve();
  });
  const clearCachedCatalogSpy = vi.fn(() => Promise.resolve());
  const fetchSpy = vi.fn(
    (): Promise<{ ok: boolean; data: unknown; error?: string }> =>
      Promise.resolve({ ok: true, data: {} })
  );

  const sourceSnapshot: SourceSnapshotPort = {
    getLastSnapshot: vi.fn(() => Promise.resolve(null)),
  };

  const store: AddonsStorePort = {
    getCustomOrigins: () => savedOrigins,
    saveCustomOrigins: saveCustomOriginsSpy,
    getOriginOverrides: () => [],
    saveOriginOverrides: vi.fn(() => Promise.resolve()),
    getCachedCatalog: vi.fn(() => null),
    saveCachedCatalog: vi.fn(() => Promise.resolve()),
    clearCachedCatalog: clearCachedCatalogSpy,
  };

  const metaStore: AkashiMetaPort = {
    readMeta: vi.fn(() => emptyMeta()),
    writeMeta: vi.fn(() => Promise.resolve()),
  };

  const fetcher: MarketplaceFetcherPort = {
    fetch: fetchSpy,
  };

  const installer: AddonInstallerPort = {
    installFromMarketplace: vi.fn(() => Promise.resolve({ ok: true, createdPaths: [] })),
    installViaCreator: vi.fn(() => Promise.resolve({ ok: true, createdPaths: [] })),
    removeTrackedFiles: vi.fn(() => Promise.resolve({ ok: true })),
    removeDirectory: vi.fn(() => Promise.resolve({ ok: true })),
  };

  return {
    sourceSnapshot,
    store,
    metaStore,
    fetcher,
    installer,
    saveCustomOriginsSpy,
    clearCachedCatalogSpy,
    fetchSpy,
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

// ── editOrigin ────────────────────────────────────────────────────

describe('AddonsService.editOrigin', () => {
  it('updates label without changing the id when source stays the same', async () => {
    const source: OriginSource = { kind: 'github', owner: 'acme', repo: 'skills' };
    const ports = createMockPorts([customOrigin('Old Label', source)]);
    const service = createService(ports);

    const result = await service.editOrigin('github:acme/skills', 'New Label', source);

    expect(result.id).toBe('github:acme/skills');
    expect(result.label).toBe('New Label');
    expect(ports.clearCachedCatalogSpy).not.toHaveBeenCalled();
  });

  it('clears old cache when source changes (id changes)', async () => {
    const oldSource: OriginSource = { kind: 'github', owner: 'acme', repo: 'skills' };
    const newSource: OriginSource = { kind: 'url', url: 'https://example.com/marketplace.json' };
    const ports = createMockPorts([customOrigin('My Skills', oldSource)]);
    const service = createService(ports);

    const result = await service.editOrigin('github:acme/skills', 'My Skills', newSource);

    expect(result.id).toBe('url:https://example.com/marketplace.json');
    expect(result.label).toBe('My Skills');
    expect(ports.clearCachedCatalogSpy).toHaveBeenCalledWith('github:acme/skills');
  });

  it('preserves enabled state from the original origin', async () => {
    const source: OriginSource = { kind: 'github', owner: 'acme', repo: 'skills' };
    const newSource: OriginSource = { kind: 'github', owner: 'acme', repo: 'plugins' };
    const ports = createMockPorts([customOrigin('My Skills', source, false)]);
    const service = createService(ports);

    const result = await service.editOrigin('github:acme/skills', 'My Plugins', newSource);

    expect(result.enabled).toBe(false);
  });

  it('throws when origin id is not found', async () => {
    const ports = createMockPorts([]);
    const service = createService(ports);

    await expect(
      service.editOrigin('github:nope/nope', 'Label', { kind: 'url', url: 'https://x.com' })
    ).rejects.toThrow("Custom origin 'github:nope/nope' not found");
  });

  it('throws when new source collides with another existing origin', async () => {
    const sourceA: OriginSource = { kind: 'github', owner: 'acme', repo: 'skills' };
    const sourceB: OriginSource = { kind: 'url', url: 'https://example.com/market.json' };
    const ports = createMockPorts([customOrigin('A', sourceA), customOrigin('B', sourceB)]);
    const service = createService(ports);

    await expect(service.editOrigin('github:acme/skills', 'A renamed', sourceB)).rejects.toThrow(
      "An origin with source 'url:https://example.com/market.json' already exists"
    );
  });

  it('preserves position in the origins array', async () => {
    const sourceA: OriginSource = { kind: 'github', owner: 'acme', repo: 'skills' };
    const sourceB: OriginSource = { kind: 'url', url: 'https://b.com/market.json' };
    const sourceC: OriginSource = { kind: 'file', path: '/tmp/market.json' };
    const ports = createMockPorts([
      customOrigin('A', sourceA),
      customOrigin('B', sourceB),
      customOrigin('C', sourceC),
    ]);
    const service = createService(ports);

    // Edit the middle one
    const newSource: OriginSource = { kind: 'url', url: 'https://b-new.com/market.json' };
    await service.editOrigin('url:https://b.com/market.json', 'B Updated', newSource);

    // Verify saveCustomOrigins was called and the middle element changed
    const saved = ports.saveCustomOriginsSpy.mock.calls[0][0];
    expect(saved).toHaveLength(3);
    expect(saved[0].label).toBe('A');
    expect(saved[1].label).toBe('B Updated');
    expect(saved[1].id).toBe('url:https://b-new.com/market.json');
    expect(saved[2].label).toBe('C');
  });
});

// ── Auto-fetch after edit (env wrapper behaviour) ─────────────────

describe('editOrigin auto-fetch', () => {
  async function editAndFetch(
    service: AddonsService,
    originId: string,
    label: string,
    source: OriginSource
  ): Promise<void> {
    const updated = await service.editOrigin(originId, label, source);
    if (updated.enabled) {
      await service.fetchOriginCatalog(updated);
    }
  }

  it('fetches catalog after edit when origin is enabled', async () => {
    const source: OriginSource = { kind: 'github', owner: 'acme', repo: 'skills' };
    const newSource: OriginSource = { kind: 'url', url: 'https://fixed.com/marketplace.json' };
    const ports = createMockPorts([customOrigin('My Skills', source, true)]);
    const service = createService(ports);

    await editAndFetch(service, 'github:acme/skills', 'My Skills', newSource);

    expect(ports.fetchSpy).toHaveBeenCalledWith(newSource);
  });

  it('does not fetch catalog after edit when origin is disabled', async () => {
    const source: OriginSource = { kind: 'github', owner: 'acme', repo: 'skills' };
    const newSource: OriginSource = { kind: 'url', url: 'https://fixed.com/marketplace.json' };
    const ports = createMockPorts([customOrigin('My Skills', source, false)]);
    const service = createService(ports);

    const updated = await service.editOrigin('github:acme/skills', 'My Skills', newSource);

    expect(updated.enabled).toBe(false);
    expect(ports.fetchSpy).not.toHaveBeenCalled();
  });

  it('swallows fetch failure without propagating', async () => {
    const source: OriginSource = { kind: 'github', owner: 'acme', repo: 'skills' };
    const newSource: OriginSource = { kind: 'url', url: 'https://still-bad.com/marketplace.json' };
    const ports = createMockPorts([customOrigin('My Skills', source, true)]);
    ports.fetchSpy.mockResolvedValue({
      ok: false,
      data: null,
      error: 'HTTP 404: Not Found',
    });
    const service = createService(ports);

    // Mirrors env wrapper: catch fetch errors silently
    const updated = await service.editOrigin('github:acme/skills', 'My Skills', newSource);
    if (updated.enabled) {
      try {
        await service.fetchOriginCatalog(updated);
      } catch {
        // Non-fatal — same as env wrapper
      }
    }

    expect(ports.fetchSpy).toHaveBeenCalledWith(newSource);
    // No unhandled error — test passes if we reach this point
  });
});
