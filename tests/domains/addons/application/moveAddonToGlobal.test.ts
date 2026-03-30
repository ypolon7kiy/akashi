import { describe, expect, it, vi } from 'vitest';
import { AddonsService } from '@src/domains/addons/application/AddonsService';
import type {
  SourceSnapshotPort,
  AddonsStorePort,
  AkashiMetaPort,
  MarketplaceFetcherPort,
  AddonInstallerPort,
} from '@src/domains/addons/application/ports';
import type { ToolUserRoots } from '@src/shared/toolUserRoots';
import { emptyMeta, addEntry, type AkashiMeta } from '@src/domains/addons/domain/akashiMeta';
import type { PluginCategory } from '@src/domains/addons/domain/catalogPlugin';

// ── Constants ──────────────────────────────────────────────────────

const WS_ROOT = '/ws';
const USER_ROOT = '/home/user/.claude';
const ROOTS: ToolUserRoots = {
  claudeUserRoot: USER_ROOT,
  cursorUserRoot: '/home/user/.cursor',
  geminiUserRoot: '/home/user/.gemini',
  codexUserRoot: '/home/user/.codex',
};

// ── Mock Port Factories ─────────────────────────────────────────────

function createMockPorts(wsMeta: AkashiMeta = emptyMeta(), userMeta: AkashiMeta = emptyMeta()) {
  const writtenMetas: { locality: string; meta: AkashiMeta }[] = [];
  const installedCreators: { creatorId: string; name: string }[] = [];

  const sourceSnapshot: SourceSnapshotPort = {
    getLastSnapshot: vi.fn(() => Promise.resolve(null)),
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
    readMeta: vi.fn((locality: string) => (locality === 'workspace' ? wsMeta : userMeta)),
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
    installViaCreator: vi.fn((creatorId: string, name: string) => {
      installedCreators.push({ creatorId, name });
      return Promise.resolve({
        ok: true,
        createdPaths: [`${USER_ROOT}/skills/${name}/SKILL.md`],
      });
    }),
    removeTrackedFiles: vi.fn(() => Promise.resolve({ ok: true })),
    removeDirectory: vi.fn(() => Promise.resolve({ ok: true })),
  };

  return {
    sourceSnapshot,
    store,
    metaStore,
    fetcher,
    installer,
    writtenMetas,
    installedCreators,
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

describe('AddonsService.moveAddonToGlobal', () => {
  it('installs skill at global scope via correct creator', async () => {
    const ports = createMockPorts();
    const service = createService(ports);

    const result = await service.moveAddonToGlobal('my-skill', 'skill', WS_ROOT, ROOTS);

    expect(result.ok).toBe(true);
    expect(ports.installedCreators).toEqual([
      { creatorId: 'claude/skill-folder/user', name: 'my-skill' },
    ]);
  });

  it('installs command at global scope via correct creator', async () => {
    const ports = createMockPorts();
    const service = createService(ports);

    const result = await service.moveAddonToGlobal('my-cmd', 'command', WS_ROOT, ROOTS);

    expect(result.ok).toBe(true);
    const calls = (ports.installer.installViaCreator as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe('claude/command/user');
    expect(calls[0][1]).toBe('my-cmd');
  });

  it('installs rule at global scope via correct creator', async () => {
    const ports = createMockPorts();
    const service = createService(ports);

    const result = await service.moveAddonToGlobal('my-rule', 'rule', WS_ROOT, ROOTS);

    expect(result.ok).toBe(true);
    const calls = (ports.installer.installViaCreator as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe('claude/rule/user');
    expect(calls[0][1]).toBe('my-rule');
  });

  it('adds user meta entry with correct installedPaths', async () => {
    const ports = createMockPorts();
    const service = createService(ports);

    const result = await service.moveAddonToGlobal('my-skill', 'skill', WS_ROOT, ROOTS);

    expect(result.ok).toBe(true);
    expect(result.createdPaths).toEqual([`${USER_ROOT}/skills/my-skill/SKILL.md`]);

    // Should have written user meta with the new entry
    const userWrite = ports.writtenMetas.find((m) => m.locality === 'user');
    expect(userWrite).toBeDefined();
    const entries = userWrite!.meta.installed.claude ?? [];
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      name: 'my-skill',
      category: 'skill',
      originId: '',
      version: '',
      installedPaths: [`${USER_ROOT}/skills/my-skill/SKILL.md`],
    });
    expect(entries[0].installedAt).toBeDefined();
  });

  it('removes workspace meta entry when it exists', async () => {
    const wsMeta = addEntry(emptyMeta(), 'claude', {
      name: 'my-skill',
      category: 'skill',
      originId: 'github:anthropics/skills',
      version: '1.0.0',
      installedPaths: ['/ws/.claude/skills/my-skill/SKILL.md'],
    });
    const ports = createMockPorts(wsMeta);
    const service = createService(ports);

    const result = await service.moveAddonToGlobal('my-skill', 'skill', WS_ROOT, ROOTS);

    expect(result.ok).toBe(true);

    // Should have written workspace meta with the entry removed
    const wsWrite = ports.writtenMetas.find((m) => m.locality === 'workspace');
    expect(wsWrite).toBeDefined();
    const wsEntries = wsWrite!.meta.installed.claude ?? [];
    expect(wsEntries).toHaveLength(0);
  });

  it('preserves originId and version from workspace meta entry', async () => {
    const wsMeta = addEntry(emptyMeta(), 'claude', {
      name: 'my-skill',
      category: 'skill',
      originId: 'github:anthropics/skills',
      version: '2.1.0',
      installedPaths: ['/ws/.claude/skills/my-skill/SKILL.md'],
    });
    const ports = createMockPorts(wsMeta);
    const service = createService(ports);

    const result = await service.moveAddonToGlobal('my-skill', 'skill', WS_ROOT, ROOTS);

    expect(result.ok).toBe(true);

    const userWrite = ports.writtenMetas.find((m) => m.locality === 'user');
    const entries = userWrite!.meta.installed.claude ?? [];
    expect(entries[0].originId).toBe('github:anthropics/skills');
    expect(entries[0].version).toBe('2.1.0');
  });

  it('handles addon not in workspace meta (manually created)', async () => {
    // No workspace meta entry — addon was created manually
    const ports = createMockPorts();
    const service = createService(ports);

    const result = await service.moveAddonToGlobal('manual-skill', 'skill', WS_ROOT, ROOTS);

    expect(result.ok).toBe(true);

    // Should NOT have written workspace meta (no entry to remove)
    const wsWrite = ports.writtenMetas.find((m) => m.locality === 'workspace');
    expect(wsWrite).toBeUndefined();

    // Should still have written user meta with defaults
    const userWrite = ports.writtenMetas.find((m) => m.locality === 'user');
    expect(userWrite).toBeDefined();
    const entries = userWrite!.meta.installed.claude ?? [];
    expect(entries[0].originId).toBe('');
    expect(entries[0].version).toBe('');
  });

  it('returns error when install fails — no meta writes', async () => {
    const ports = createMockPorts();
    (ports.installer.installViaCreator as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      createdPaths: [],
      error: 'disk full',
    });
    const service = createService(ports);

    const result = await service.moveAddonToGlobal('my-skill', 'skill', WS_ROOT, ROOTS);

    expect(result.ok).toBe(false);
    expect(result.error).toBe('disk full');
    expect(ports.writtenMetas).toHaveLength(0);
  });

  it('returns error for unsupported category', async () => {
    const ports = createMockPorts();
    const service = createService(ports);

    const result = await service.moveAddonToGlobal(
      'my-config',
      'config' as PluginCategory,
      WS_ROOT,
      ROOTS
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain('No global creator');
    expect(ports.writtenMetas).toHaveLength(0);
  });
});
