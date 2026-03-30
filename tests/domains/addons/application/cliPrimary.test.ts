import { describe, expect, it, vi } from 'vitest';
import { AddonsService } from '@src/domains/addons/application/AddonsService';
import type {
  SourceSnapshotPort,
  AddonsStorePort,
  AkashiMetaPort,
  MarketplaceFetcherPort,
  AddonInstallerPort,
  ClaudeCliPort,
} from '@src/domains/addons/application/ports';
import type { SourceIndexSnapshot, SourceFacetTag } from '@src/domains/sources/domain/model';
import type { CatalogPlugin } from '@src/domains/addons/domain/catalogPlugin';
import type { ToolUserRoots } from '@src/shared/toolUserRoots';
import type {
  CliInstalledPlugin,
  CliAvailablePlugin,
  CliMarketplace,
} from '@src/domains/addons/domain/cliTypes';
import { emptyMeta, addEntry, type AkashiMeta } from '@src/domains/addons/domain/akashiMeta';
import {
  CLI_INSTALLED_COMMIT_COMMANDS,
  CLI_INSTALLED_LIST,
  CLI_INSTALLED_PR_REVIEW,
  CLI_INSTALLED_WITH_PR_REVIEW,
  CLI_AVAILABLE_LIST,
  CLI_AVAILABLE_PR_REVIEW,
  CLI_AVAILABLE_RESULT_AFTER_INSTALL,
  CLI_MARKETPLACE_LIST,
} from '../__fixtures__/cliOutputs';

// ── Factories ──────────────────────────────────────────────────────

const WS_ROOT = '/ws';
const USER_ROOT = '/home/user/.claude';
const ROOTS: ToolUserRoots = {
  claudeUserRoot: USER_ROOT,
  cursorUserRoot: '/home/user/.cursor',
  geminiUserRoot: '/home/user/.gemini',
  codexUserRoot: '/home/user/.codex',
};

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

function createMockPorts(
  opts: {
    snap?: SourceIndexSnapshot | null;
    wsMeta?: AkashiMeta;
    userMeta?: AkashiMeta;
    cachedPlugins?: readonly CatalogPlugin[];
  } = {}
) {
  const {
    snap = snapshot(),
    wsMeta = emptyMeta(),
    userMeta = emptyMeta(),
    cachedPlugins = [],
  } = opts;

  const writtenMetas: { locality: string; meta: AkashiMeta }[] = [];

  const saveCachedCatalogSpy = vi.fn(() => Promise.resolve());
  const saveCustomOriginsSpy = vi.fn(() => Promise.resolve());
  const fetchSpy = vi.fn(
    (): Promise<{ ok: boolean; data: unknown; error?: string }> =>
      Promise.resolve({ ok: true, data: {} })
  );
  const installFromMarketplaceSpy = vi.fn(() =>
    Promise.resolve({ ok: true, createdPaths: ['/ws/.claude/skills/foo/SKILL.md'] })
  );
  const installViaCreatorSpy = vi.fn(() =>
    Promise.resolve({ ok: true, createdPaths: [] as string[] })
  );
  const removeTrackedFilesSpy = vi.fn(() => Promise.resolve({ ok: true }));
  const removeDirectorySpy = vi.fn(() => Promise.resolve({ ok: true }));
  const getCachedCatalogSpy = vi.fn((_originId: string) =>
    cachedPlugins.length > 0
      ? { originId: 'origin-a', fetchedAt: new Date().toISOString(), plugins: cachedPlugins }
      : null
  );

  const sourceSnapshot: SourceSnapshotPort = {
    getLastSnapshot: vi.fn(() => Promise.resolve(snap)),
  };

  const store: AddonsStorePort = {
    getCustomOrigins: () => [],
    saveCustomOrigins: saveCustomOriginsSpy,
    getOriginOverrides: () => [],
    saveOriginOverrides: vi.fn(() => Promise.resolve()),
    getCachedCatalog: getCachedCatalogSpy,
    saveCachedCatalog: saveCachedCatalogSpy,
    clearCachedCatalog: vi.fn(() => Promise.resolve()),
  };

  const metaStore: AkashiMetaPort = {
    readMeta: vi.fn((locality: string) => (locality === 'workspace' ? wsMeta : userMeta)),
    writeMeta: vi.fn((locality: string, _ws: string, _ur: string, meta: AkashiMeta) => {
      writtenMetas.push({ locality, meta });
      return Promise.resolve();
    }),
  };

  const fetcher: MarketplaceFetcherPort = { fetch: fetchSpy };

  const installer: AddonInstallerPort = {
    installFromMarketplace: installFromMarketplaceSpy,
    installViaCreator: installViaCreatorSpy,
    removeTrackedFiles: removeTrackedFilesSpy,
    removeDirectory: removeDirectorySpy,
  };

  return {
    sourceSnapshot,
    store,
    metaStore,
    fetcher,
    installer,
    writtenMetas,
    // Exposed spies for assertion without unbound-method lint errors
    saveCachedCatalogSpy,
    saveCustomOriginsSpy,
    fetchSpy,
    installFromMarketplaceSpy,
    installViaCreatorSpy,
    removeTrackedFilesSpy,
    removeDirectorySpy,
    getCachedCatalogSpy,
  };
}

// ── Mock CLI Port ──────────────────────────────────────────────────

function createMockCli() {
  const isAvailableSpy = vi.fn(() => Promise.resolve(true));
  const listInstalledSpy = vi.fn(() => Promise.resolve([] as readonly CliInstalledPlugin[]));
  const listAvailableSpy = vi.fn(() =>
    Promise.resolve({
      installed: [] as CliInstalledPlugin[],
      available: [] as CliAvailablePlugin[],
    })
  );
  const listMarketplacesSpy = vi.fn(() => Promise.resolve([] as readonly CliMarketplace[]));
  const installPluginSpy = vi.fn(() =>
    Promise.resolve({ ok: true } as { ok: boolean; error?: string })
  );
  const uninstallPluginSpy = vi.fn(() =>
    Promise.resolve({ ok: true } as { ok: boolean; error?: string })
  );
  const addMarketplaceSpy = vi.fn(() =>
    Promise.resolve({ ok: true } as { ok: boolean; error?: string })
  );
  const removeMarketplaceSpy = vi.fn(() =>
    Promise.resolve({ ok: true } as { ok: boolean; error?: string })
  );

  const cli: ClaudeCliPort = {
    isAvailable: isAvailableSpy,
    listInstalled: listInstalledSpy,
    listAvailable: listAvailableSpy,
    listMarketplaces: listMarketplacesSpy,
    installPlugin: installPluginSpy,
    uninstallPlugin: uninstallPluginSpy,
    addMarketplace: addMarketplaceSpy,
    removeMarketplace: removeMarketplaceSpy,
  };

  return {
    cli,
    isAvailableSpy,
    listInstalledSpy,
    listAvailableSpy,
    listMarketplacesSpy,
    installPluginSpy,
    uninstallPluginSpy,
    addMarketplaceSpy,
    removeMarketplaceSpy,
  };
}

function createServiceWithCli(ports: ReturnType<typeof createMockPorts>, cli: ClaudeCliPort) {
  return new AddonsService(
    ports.sourceSnapshot,
    ports.store,
    ports.fetcher,
    ports.installer,
    ports.metaStore,
    cli
  );
}

// ── 1. getOrigins with CLI ─────────────────────────────────────────

describe('AddonsService CLI-primary: getOrigins', () => {
  it('returns CLI marketplace origins when CLI is available', async () => {
    const { cli, listMarketplacesSpy } = createMockCli();
    listMarketplacesSpy.mockResolvedValue([...CLI_MARKETPLACE_LIST]);
    const ports = createMockPorts();
    const service = createServiceWithCli(ports, cli);

    const origins = await service.getOrigins();

    expect(listMarketplacesSpy).toHaveBeenCalled();
    expect(origins).toHaveLength(1);
    expect(origins[0].id).toBe('cli:claude-plugins-official');
    expect(origins[0].label).toBe('claude-plugins-official');
    expect(origins[0].enabled).toBe(true);
  });

  it('falls back to legacy origins when CLI fails', async () => {
    const { cli, listMarketplacesSpy } = createMockCli();
    listMarketplacesSpy.mockRejectedValue(new Error('CLI crashed'));
    const ports = createMockPorts();
    const service = createServiceWithCli(ports, cli);

    const origins = await service.getOrigins();

    // Should still return something (built-in origins from legacy path)
    expect(listMarketplacesSpy).toHaveBeenCalled();
    // Legacy path returns built-in origins; exact count depends on BUILT_IN_ORIGINS
    expect(Array.isArray(origins)).toBe(true);
  });
});

// ── 3. fetchOriginCatalog with CLI ─────────────────────────────────

describe('AddonsService CLI-primary: fetchOriginCatalog', () => {
  it('uses listAvailable and maps to CatalogPlugin when CLI is available', async () => {
    const { cli, listAvailableSpy } = createMockCli();
    listAvailableSpy.mockResolvedValue({ installed: [], available: [...CLI_AVAILABLE_LIST] });
    const ports = createMockPorts();
    const service = createServiceWithCli(ports, cli);

    const origin = {
      id: 'cli:claude-plugins-official' as const,
      label: 'claude-plugins-official',
      source: { kind: 'github' as const, owner: 'anthropics', repo: 'claude-plugins-official' },
      builtIn: false,
      enabled: true,
      lastFetchedAt: null,
      lastError: null,
    };

    const plugins = await service.fetchOriginCatalog(origin);

    expect(listAvailableSpy).toHaveBeenCalled();
    expect(plugins).toHaveLength(4);
    expect(plugins[0].name).toBe('agent-sdk-dev');
    expect(plugins[0].id).toBe('agent-sdk-dev@claude-plugins-official');
    expect(plugins[0].category).toBe('plugin');
    expect(plugins[0].installCount).toBe(42453);
    // Should cache the result
    expect(ports.saveCachedCatalogSpy).toHaveBeenCalled();
  });

  it('falls back to marketplace.json fetch when CLI fails', async () => {
    const { cli, listAvailableSpy } = createMockCli();
    listAvailableSpy.mockRejectedValue(new Error('CLI unavailable'));
    const ports = createMockPorts();
    const service = createServiceWithCli(ports, cli);

    const origin = {
      id: 'origin-a',
      label: 'My Origin',
      source: { kind: 'url' as const, url: 'https://example.com/marketplace.json' },
      builtIn: false,
      enabled: true,
      lastFetchedAt: null,
      lastError: null,
    };

    await service.fetchOriginCatalog(origin);

    expect(listAvailableSpy).toHaveBeenCalled();
    // Legacy path: fetcher.fetch should be called
    expect(ports.fetchSpy).toHaveBeenCalledWith(origin.source);
  });
});

// ── 5. installPlugin with CLI ──────────────────────────────────────

describe('AddonsService CLI-primary: installPlugin', () => {
  it('calls cli.installPlugin with project scope for workspace locality', async () => {
    const { cli, installPluginSpy } = createMockCli();
    const ports = createMockPorts();
    const service = createServiceWithCli(ports, cli);

    const plugin = catalogPlugin('commit-commands', 'claude-plugins-official');
    const result = await service.installPlugin(plugin, 'workspace', WS_ROOT, ROOTS);

    expect(result.ok).toBe(true);
    expect(installPluginSpy).toHaveBeenCalledWith(
      'commit-commands@claude-plugins-official',
      'project',
      WS_ROOT
    );
    // CLI manages tracking — no meta written
    expect(ports.writtenMetas).toHaveLength(0);
    // File-based installer should NOT be called
    expect(ports.installFromMarketplaceSpy).not.toHaveBeenCalled();
    expect(ports.installViaCreatorSpy).not.toHaveBeenCalled();
  });

  it('calls cli.installPlugin with local scope for local locality', async () => {
    const { cli, installPluginSpy } = createMockCli();
    const ports = createMockPorts();
    const service = createServiceWithCli(ports, cli);

    const plugin = catalogPlugin('commit-commands', 'claude-plugins-official');
    const result = await service.installPlugin(plugin, 'local', WS_ROOT, ROOTS);

    expect(result.ok).toBe(true);
    expect(installPluginSpy).toHaveBeenCalledWith(
      'commit-commands@claude-plugins-official',
      'local',
      WS_ROOT
    );
  });

  it('calls cli.installPlugin with user scope for user locality', async () => {
    const { cli, installPluginSpy } = createMockCli();
    const ports = createMockPorts();
    const service = createServiceWithCli(ports, cli);

    const plugin = catalogPlugin('commit-commands', 'claude-plugins-official');
    await service.installPlugin(plugin, 'user', WS_ROOT, ROOTS);

    expect(installPluginSpy).toHaveBeenCalledWith(
      'commit-commands@claude-plugins-official',
      'user',
      undefined
    );
  });

  it('falls back to file-based install + meta when CLI fails', async () => {
    const { cli, installPluginSpy } = createMockCli();
    installPluginSpy.mockResolvedValue({ ok: false, error: 'CLI error' });
    const ports = createMockPorts();
    const service = createServiceWithCli(ports, cli);

    const plugin = catalogPlugin('bar');
    const result = await service.installPlugin(plugin, 'workspace', WS_ROOT, ROOTS);

    expect(result.ok).toBe(true);
    expect(installPluginSpy).toHaveBeenCalled();
    // Fell through to legacy — meta should be written
    expect(ports.writtenMetas).toHaveLength(1);
    expect(ports.writtenMetas[0].locality).toBe('workspace');
  });
});

// ── 7. deleteAddon with CLI ────────────────────────────────────────

describe('AddonsService CLI-primary: deleteAddon', () => {
  it('calls cli.uninstallPlugin with project scope for CLI-tracked plugin', async () => {
    const { cli, listInstalledSpy, uninstallPluginSpy } = createMockCli();
    listInstalledSpy.mockResolvedValue([CLI_INSTALLED_COMMIT_COMMANDS]);
    const ports = createMockPorts({
      snap: snapshot([snapshotRecord('/ws/.claude/skills/commit-commands/SKILL.md')]),
    });
    const service = createServiceWithCli(ports, cli);

    const result = await service.deleteAddon(
      WS_ROOT,
      ROOTS,
      '/ws/.claude/skills/commit-commands/SKILL.md',
      'commit-commands@claude-plugins-official'
    );

    expect(result.ok).toBe(true);
    expect(uninstallPluginSpy).toHaveBeenCalledWith(
      'commit-commands@claude-plugins-official',
      'project',
      CLI_INSTALLED_COMMIT_COMMANDS.projectPath
    );
    // File-based removal should NOT be called
    expect(ports.removeTrackedFilesSpy).not.toHaveBeenCalled();
    expect(ports.removeDirectorySpy).not.toHaveBeenCalled();
  });

  it('resolves plugin name from pluginId when primaryPath is a CLI cache path', async () => {
    const { cli, listInstalledSpy, uninstallPluginSpy } = createMockCli();
    listInstalledSpy.mockResolvedValue([CLI_INSTALLED_COMMIT_COMMANDS]);
    const ports = createMockPorts({ snap: snapshot([]) });
    const service = createServiceWithCli(ports, cli);

    // Simulate what the webview sends for a CLI-installed plugin:
    // primaryPath is the CLI cache dir (ends in version segment like "unknown"),
    // pluginId is the correct CLI id like "commit-commands@claude-plugins-official"
    const result = await service.deleteAddon(
      WS_ROOT,
      ROOTS,
      '/home/ubuntu/.claude/plugins/cache/claude-plugins-official/commit-commands/unknown',
      'commit-commands@claude-plugins-official'
    );

    expect(result.ok).toBe(true);
    expect(uninstallPluginSpy).toHaveBeenCalledWith(
      'commit-commands@claude-plugins-official',
      'project',
      CLI_INSTALLED_COMMIT_COMMANDS.projectPath
    );
  });

  it('falls back to meta/file deletion for non-CLI plugin', async () => {
    // CLI is available but plugin is not in CLI installed list
    const { cli, listInstalledSpy, uninstallPluginSpy } = createMockCli();
    listInstalledSpy.mockResolvedValue([]);
    const wsMeta = addEntry(emptyMeta(), 'claude', {
      name: 'manual-addon',
      category: 'skill',
      originId: 'origin-a',
      version: '1.0.0',
      installedPaths: ['/ws/.claude/skills/manual-addon/SKILL.md'],
    });
    const ports = createMockPorts({
      snap: snapshot([snapshotRecord('/ws/.claude/skills/manual-addon/SKILL.md')]),
      wsMeta,
    });
    const service = createServiceWithCli(ports, cli);

    const result = await service.deleteAddon(
      WS_ROOT,
      ROOTS,
      '/ws/.claude/skills/manual-addon/SKILL.md'
    );

    expect(result.ok).toBe(true);
    // CLI uninstall should NOT be called (plugin not tracked by CLI)
    expect(uninstallPluginSpy).not.toHaveBeenCalled();
    // Legacy path: file removal + meta update
    expect(ports.removeTrackedFilesSpy).toHaveBeenCalledWith([
      '/ws/.claude/skills/manual-addon/SKILL.md',
    ]);
    expect(ports.writtenMetas).toHaveLength(1);
  });
});

// ── 9. getCatalog install status from CLI ──────────────────────────

describe('AddonsService CLI-primary: getCatalog', () => {
  it('uses cli.listInstalled to determine installed names', async () => {
    const { cli, listInstalledSpy, listMarketplacesSpy } = createMockCli();
    listInstalledSpy.mockResolvedValue([...CLI_INSTALLED_LIST]);
    listMarketplacesSpy.mockResolvedValue([...CLI_MARKETPLACE_LIST]);
    const ports = createMockPorts({
      snap: snapshot([snapshotRecord('/ws/.claude/skills/commit-commands/SKILL.md')]),
    });
    // Override getCachedCatalog to return plugins for the CLI origin id.
    // commit-commands matches a real installed plugin; the others remain available.
    ports.getCachedCatalogSpy.mockImplementation((originId: string) => {
      if (originId === 'cli:claude-plugins-official') {
        return {
          originId: 'cli:claude-plugins-official',
          fetchedAt: new Date().toISOString(),
          plugins: [
            catalogPlugin('commit-commands', 'cli:claude-plugins-official'),
            catalogPlugin('agent-sdk-dev', 'cli:claude-plugins-official'),
            catalogPlugin('ai-firstify', 'cli:claude-plugins-official'),
          ],
        };
      }
      return null;
    });
    const service = createServiceWithCli(ports, cli);

    const result = await service.getCatalog('claude', WS_ROOT, ROOTS);

    expect(result).not.toBeNull();
    expect(result!.cliAvailable).toBe(true);
    expect(listInstalledSpy).toHaveBeenCalled();

    // commit-commands is in CLI_INSTALLED_LIST, so it should be 'installed'
    const commitPlugin = result!.catalogPlugins.find((p) => p.name === 'commit-commands');
    expect(commitPlugin?.installStatus).toBe('installed');

    // agent-sdk-dev is NOT in CLI_INSTALLED_LIST, so it should be 'available'
    const agentSdkPlugin = result!.catalogPlugins.find((p) => p.name === 'agent-sdk-dev');
    expect(agentSdkPlugin?.installStatus).toBe('available');

    // ai-firstify is NOT in CLI_INSTALLED_LIST, so it should be 'available'
    const aiFirstifyPlugin = result!.catalogPlugins.find((p) => p.name === 'ai-firstify');
    expect(aiFirstifyPlugin?.installStatus).toBe('available');
  });

  it('falls back to meta-based install status when CLI listInstalled fails', async () => {
    const { cli, listInstalledSpy, listMarketplacesSpy } = createMockCli();
    listInstalledSpy.mockRejectedValue(new Error('CLI failed'));
    // getOrigins also uses CLI — make it fail too so we use legacy origins
    listMarketplacesSpy.mockRejectedValue(new Error('CLI failed'));
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
    const service = createServiceWithCli(ports, cli);

    const result = await service.getCatalog('claude', WS_ROOT, ROOTS);

    // Should fall back to meta-based resolution
    expect(result).not.toBeNull();
    expect(result!.cliAvailable).toBe(false);
    const fooPlugin = result!.catalogPlugins.find((p) => p.name === 'foo');
    expect(fooPlugin?.installStatus).toBe('installed');
  });
});

// ── 10. addOrigin with CLI ─────────────────────────────────────────

describe('AddonsService CLI-primary: addOrigin', () => {
  it('calls cli.addMarketplace and resolves canonical id from listMarketplaces', async () => {
    const { cli, addMarketplaceSpy, listMarketplacesSpy } = createMockCli();
    listMarketplacesSpy.mockResolvedValue([...CLI_MARKETPLACE_LIST]);
    const ports = createMockPorts();
    const service = createServiceWithCli(ports, cli);

    const source = {
      kind: 'github' as const,
      owner: 'anthropics',
      repo: 'claude-plugins-official',
    };
    const result = await service.addOrigin(source);

    expect(addMarketplaceSpy).toHaveBeenCalledWith('anthropics/claude-plugins-official');
    // ID should use the CLI's canonical short name, not the full owner/repo
    expect(result.id).toBe('cli:claude-plugins-official');
    expect(result.label).toBe('claude-plugins-official');
    expect(result.enabled).toBe(true);
    // Legacy store should NOT be called
    expect(ports.saveCustomOriginsSpy).not.toHaveBeenCalled();
  });

  it('falls back to legacy addOrigin when CLI addMarketplace fails', async () => {
    const { cli, addMarketplaceSpy } = createMockCli();
    addMarketplaceSpy.mockResolvedValue({ ok: false, error: 'denied' });
    const ports = createMockPorts();
    const service = createServiceWithCli(ports, cli);

    const source = { kind: 'url' as const, url: 'https://example.com/marketplace.json' };
    const result = await service.addOrigin(source);

    expect(addMarketplaceSpy).toHaveBeenCalled();
    // Legacy path: should save to custom origins store
    expect(ports.saveCustomOriginsSpy).toHaveBeenCalled();
    expect(result.label).toBe('example.com');
  });
});

// ── 11. editOrigin with CLI-managed origins ──────────────────────────

describe('AddonsService CLI-primary: editOrigin', () => {
  it('throws when editing a CLI-managed origin', async () => {
    const { cli } = createMockCli();
    const ports = createMockPorts();
    const service = createServiceWithCli(ports, cli);

    const source = { kind: 'github' as const, owner: 'other', repo: 'repo' };
    await expect(service.editOrigin('cli:my-marketplace', source)).rejects.toThrow(
      'CLI-managed origins cannot be edited'
    );
  });
});

// ── 12. removeOrigin with CLI-managed origins ────────────────────────

describe('AddonsService CLI-primary: removeOrigin', () => {
  it('removes a CLI-managed origin via CLI', async () => {
    const { cli, removeMarketplaceSpy } = createMockCli();
    const ports = createMockPorts();
    const service = createServiceWithCli(ports, cli);

    await service.removeOrigin('cli:my-marketplace');

    expect(removeMarketplaceSpy).toHaveBeenCalledWith('my-marketplace');
  });

  it('throws when CLI removeMarketplace fails for a CLI origin', async () => {
    const { cli, removeMarketplaceSpy } = createMockCli();
    removeMarketplaceSpy.mockResolvedValue({ ok: false, error: 'not found' });
    const ports = createMockPorts();
    const service = createServiceWithCli(ports, cli);

    await expect(service.removeOrigin('cli:my-marketplace')).rejects.toThrow('not found');
  });

  it('falls through to legacy for non-CLI origins when CLI fails', async () => {
    const { cli, removeMarketplaceSpy } = createMockCli();
    removeMarketplaceSpy.mockResolvedValue({ ok: false, error: 'unknown' });
    const ports = createMockPorts();
    const service = createServiceWithCli(ports, cli);

    // Non-CLI origin: should not throw, falls through to legacy store removal
    await service.removeOrigin('custom:my-origin');
    expect(removeMarketplaceSpy).toHaveBeenCalledWith('custom:my-origin');
  });
});

// ── pr-review-toolkit lifecycle (real CLI fixtures) ──────────────────

describe('AddonsService CLI-primary: pr-review-toolkit lifecycle', () => {
  it('shows pr-review-toolkit as available before install', async () => {
    const { cli, listInstalledSpy, listMarketplacesSpy, listAvailableSpy } = createMockCli();
    listInstalledSpy.mockResolvedValue([]); // nothing installed
    listMarketplacesSpy.mockResolvedValue([...CLI_MARKETPLACE_LIST]);
    listAvailableSpy.mockResolvedValue({ installed: [], available: [...CLI_AVAILABLE_LIST] });

    const ports = createMockPorts({ snap: snapshot([]) });
    // Seed the cache with the CLI available list mapped to catalog plugins
    ports.getCachedCatalogSpy.mockImplementation((originId: string) => {
      if (originId === 'cli:claude-plugins-official') {
        return {
          originId: 'cli:claude-plugins-official',
          fetchedAt: new Date().toISOString(),
          plugins: [catalogPlugin('pr-review-toolkit', 'cli:claude-plugins-official')],
        };
      }
      return null;
    });
    const service = createServiceWithCli(ports, cli);

    const result = await service.getCatalog('claude', WS_ROOT, ROOTS);
    const prPlugin = result!.catalogPlugins.find((p) => p.name === 'pr-review-toolkit');

    expect(prPlugin).toBeDefined();
    expect(prPlugin!.installStatus).toBe('available');
  });

  it('installs pr-review-toolkit via CLI with project scope', async () => {
    const { cli, installPluginSpy } = createMockCli();
    const ports = createMockPorts();
    const service = createServiceWithCli(ports, cli);

    const plugin = catalogPlugin('pr-review-toolkit', 'claude-plugins-official');
    const result = await service.installPlugin(plugin, 'workspace', WS_ROOT, ROOTS);

    expect(result.ok).toBe(true);
    expect(installPluginSpy).toHaveBeenCalledWith(
      'pr-review-toolkit@claude-plugins-official',
      'project',
      WS_ROOT
    );
    // CLI manages tracking — no legacy meta written
    expect(ports.writtenMetas).toHaveLength(0);
  });

  it('shows pr-review-toolkit as installed after install', async () => {
    const { cli, listInstalledSpy, listMarketplacesSpy } = createMockCli();
    // After install: pr-review-toolkit appears in installed list
    listInstalledSpy.mockResolvedValue([...CLI_INSTALLED_WITH_PR_REVIEW]);
    listMarketplacesSpy.mockResolvedValue([...CLI_MARKETPLACE_LIST]);

    const ports = createMockPorts({ snap: snapshot([]) });
    ports.getCachedCatalogSpy.mockImplementation((originId: string) => {
      if (originId === 'cli:claude-plugins-official') {
        return {
          originId: 'cli:claude-plugins-official',
          fetchedAt: new Date().toISOString(),
          plugins: [
            catalogPlugin('pr-review-toolkit', 'cli:claude-plugins-official'),
            catalogPlugin('agent-sdk-dev', 'cli:claude-plugins-official'),
          ],
        };
      }
      return null;
    });
    const service = createServiceWithCli(ports, cli);

    const result = await service.getCatalog('claude', WS_ROOT, ROOTS);
    const prPlugin = result!.catalogPlugins.find((p) => p.name === 'pr-review-toolkit');
    const sdkPlugin = result!.catalogPlugins.find((p) => p.name === 'agent-sdk-dev');

    expect(prPlugin!.installStatus).toBe('installed');
    expect(sdkPlugin!.installStatus).toBe('available');
  });

  it('uninstalls pr-review-toolkit via CLI', async () => {
    const { cli, listInstalledSpy, uninstallPluginSpy } = createMockCli();
    listInstalledSpy.mockResolvedValue([CLI_INSTALLED_PR_REVIEW]);

    const ports = createMockPorts({ snap: snapshot([]) });
    const service = createServiceWithCli(ports, cli);

    const result = await service.deleteAddon(
      WS_ROOT,
      ROOTS,
      undefined,
      'pr-review-toolkit@claude-plugins-official'
    );

    expect(result.ok).toBe(true);
    expect(uninstallPluginSpy).toHaveBeenCalledWith(
      'pr-review-toolkit@claude-plugins-official',
      'project',
      CLI_INSTALLED_PR_REVIEW.projectPath
    );
  });

  it('uses real fixture shapes: installed entry has projectPath and version "unknown"', () => {
    // Verify the real CLI output shapes are preserved in the fixture
    expect(CLI_INSTALLED_PR_REVIEW.version).toBe('unknown');
    expect(CLI_INSTALLED_PR_REVIEW.scope).toBe('project');
    expect(CLI_INSTALLED_PR_REVIEW.projectPath).toBe('/home/ubuntu/dev/akashi');
    expect(CLI_INSTALLED_PR_REVIEW.enabled).toBe(true);
  });

  it('uses real fixture shapes: available entry has installCount and relative source', () => {
    expect(CLI_AVAILABLE_PR_REVIEW.installCount).toBe(63722);
    expect(CLI_AVAILABLE_PR_REVIEW.source).toBe('./plugins/pr-review-toolkit');
    expect(CLI_AVAILABLE_PR_REVIEW.marketplaceName).toBe('claude-plugins-official');
  });

  it('available result after install excludes pr-review-toolkit from available section', () => {
    // Real CLI behavior: installed plugins are removed from the available array
    const availableNames = CLI_AVAILABLE_RESULT_AFTER_INSTALL.available.map((p) => p.name);
    expect(availableNames).not.toContain('pr-review-toolkit');

    const installedIds = CLI_AVAILABLE_RESULT_AFTER_INSTALL.installed.map((p) => p.id);
    expect(installedIds).toContain('pr-review-toolkit@claude-plugins-official');
  });
});
