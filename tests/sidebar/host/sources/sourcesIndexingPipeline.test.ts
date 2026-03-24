/**
 * Matrix E2E: mock disk (scanner) → SourcesService.indexWorkspace → buildSourcesSnapshotPayload.
 */
import { describe, expect, it, vi } from 'vitest';
import { SourcesService } from '@src/domains/sources/application/SourcesService';
import type { DiscoveredSource } from '@src/domains/sources/application/ports';
import type { SourceCategory } from '@src/domains/sources/domain/model';
import { SourceScope } from '@src/domains/sources/domain/model';
import type { SourceIndexSnapshot } from '@src/domains/sources/domain/model';
import { ALL_SOURCE_PRESET_IDS, type SourcePresetId } from '@src/shared/sourcePresetId';
import {
  buildSourceFacetTags,
  SourceCategoryId,
  SourceLocalityTagValue,
} from '@src/domains/sources/domain/sourceTags';
import { SourceTagType } from '@src/domains/sources/domain/model';
import { sourceRecordId } from '@src/shared/sourceRecordId';
import {
  isSourcesSnapshotPayload,
  type WorkspaceFolderInfo,
} from '@src/sidebar/bridge/sourceDescriptor';
import { buildSourcesSnapshotPayload } from '@src/sidebar/host/sources/sourcesSnapshotPayload';

const STAT = { byteLength: 10, updatedAt: '2025-01-01T00:00:00.000Z' };

function sortPaths(paths: readonly string[]): string[] {
  return [...paths].sort();
}

function discovered(
  path: string,
  preset: SourcePresetId,
  category: SourceCategory,
  origin: 'workspace' | 'user'
): DiscoveredSource {
  return {
    id: sourceRecordId(preset, origin, path),
    path,
    preset,
    category,
    scope: origin === 'user' ? SourceScope.User : SourceScope.File,
    origin,
    tags: buildSourceFacetTags({ category, preset, origin }),
  };
}

const MIXED_PRESETS: DiscoveredSource[] = [
  discovered('/ws/CLAUDE.md', 'claude', SourceCategoryId.LlmGuideline, 'workspace'),
  discovered('/ws/.cursor/rules/x.mdc', 'cursor', SourceCategoryId.Rule, 'workspace'),
  discovered('/ws/.cursor/commands/review.md', 'cursor', SourceCategoryId.Command, 'workspace'),
  discovered('/ws/.claude/settings.json', 'claude', SourceCategoryId.Config, 'workspace'),
  discovered('/ws/.codex/config.toml', 'codex', SourceCategoryId.Config, 'workspace'),
];

function effectiveMockDiscovered(
  world: DiscoveredSource[],
  includeHomeConfig: boolean
): DiscoveredSource[] {
  if (includeHomeConfig) {
    return world;
  }
  return world.filter((d) => d.origin !== 'user');
}

const WORLD_MIXED_WS_USER: DiscoveredSource[] = [
  discovered('/ws/.cursor/rules/a.mdc', 'cursor', SourceCategoryId.Rule, 'workspace'),
  discovered('/home/.cursor/mcp.json', 'cursor', SourceCategoryId.Mcp, 'user'),
];

const WORLD_ANTIGRAVITY_VS_CURSOR: DiscoveredSource[] = [
  discovered('/ws/GEMINI.md', 'antigravity', SourceCategoryId.LlmGuideline, 'workspace'),
  discovered('/ws/.cursor/rules/x.mdc', 'cursor', SourceCategoryId.Rule, 'workspace'),
  discovered('/ws/CLAUDE.md', 'claude', SourceCategoryId.LlmGuideline, 'workspace'),
];

function createPipeline(opts: {
  activePresets: ReadonlySet<SourcePresetId>;
  mockDiscovered: DiscoveredSource[];
  workspaceFolders: WorkspaceFolderInfo[];
}) {
  const scanner = {
    scanWorkspace: vi.fn(() => Promise.resolve(opts.mockDiscovered)),
  };
  const fileStats = { statFile: vi.fn(() => Promise.resolve(STAT)) };
  let persisted: SourceIndexSnapshot | null = null;
  const snapshotStore = {
    load: vi.fn(() => Promise.resolve(persisted)),
    save: vi.fn((s: SourceIndexSnapshot) => {
      persisted = s;
      return Promise.resolve();
    }),
  };
  const service = new SourcesService(
    scanner,
    fileStats,
    snapshotStore,
    { info: vi.fn() },
    () => opts.activePresets
  );

  function payloadFor(snap: SourceIndexSnapshot | null) {
    return buildSourcesSnapshotPayload(snap, opts.workspaceFolders, () => opts.activePresets);
  }

  return { service, scanner, snapshotStore, fileStats, payloadFor };
}

interface MatrixRow {
  label: string;
  activePresets: ReadonlySet<SourcePresetId>;
  includeHomeConfig: boolean;
  workspaceFolders: WorkspaceFolderInfo[];
  mockDiscovered: DiscoveredSource[];
  expectedPayloadPaths: string[];
  assertRawSnapshotCount?: number;
}

const MATRIX: MatrixRow[] = [
  {
    label: 'empty-disk-cursor-only',
    activePresets: new Set<SourcePresetId>(['cursor']),
    includeHomeConfig: false,
    workspaceFolders: [],
    mockDiscovered: [],
    expectedPayloadPaths: [],
  },
  {
    label: 'workspace-only-includeHome-false',
    activePresets: new Set<SourcePresetId>(['cursor']),
    includeHomeConfig: false,
    workspaceFolders: [],
    mockDiscovered: [
      discovered('/ws/.cursor/mcp.json', 'cursor', SourceCategoryId.Mcp, 'workspace'),
    ],
    expectedPayloadPaths: ['/ws/.cursor/mcp.json'],
  },
  {
    label: 'user-global-claude-includeHome-true',
    activePresets: new Set<SourcePresetId>(['claude']),
    includeHomeConfig: true,
    workspaceFolders: [],
    mockDiscovered: [
      discovered('/home/.claude/settings.json', 'claude', SourceCategoryId.Config, 'user'),
    ],
    expectedPayloadPaths: ['/home/.claude/settings.json'],
  },
  {
    label: 'three-presets-mixed-workspace',
    activePresets: new Set<SourcePresetId>(['cursor', 'claude', 'codex']),
    includeHomeConfig: true,
    workspaceFolders: [],
    mockDiscovered: MIXED_PRESETS,
    expectedPayloadPaths: sortPaths(MIXED_PRESETS.map((d) => d.path)),
  },
  {
    label: 'three-presets-mixed-but-cursor-active-filters-payload',
    activePresets: new Set<SourcePresetId>(['cursor']),
    includeHomeConfig: true,
    workspaceFolders: [],
    mockDiscovered: MIXED_PRESETS,
    expectedPayloadPaths: sortPaths(['/ws/.cursor/rules/x.mdc', '/ws/.cursor/commands/review.md']),
    assertRawSnapshotCount: 5,
  },
  {
    label: 'all-presets-full-mix',
    activePresets: new Set(ALL_SOURCE_PRESET_IDS),
    includeHomeConfig: true,
    workspaceFolders: [],
    mockDiscovered: MIXED_PRESETS,
    expectedPayloadPaths: sortPaths(MIXED_PRESETS.map((d) => d.path)),
  },
  {
    label: 'workspace-folders-passthrough',
    activePresets: new Set<SourcePresetId>(['cursor']),
    includeHomeConfig: true,
    workspaceFolders: [{ name: 'proj', path: '/projects/foo' }],
    mockDiscovered: [
      discovered('/ws/.cursor/rules/a.mdc', 'cursor', SourceCategoryId.Rule, 'workspace'),
      discovered('/ws/.cursor/mcp.json', 'cursor', SourceCategoryId.Mcp, 'workspace'),
    ],
    expectedPayloadPaths: sortPaths(['/ws/.cursor/rules/a.mdc', '/ws/.cursor/mcp.json']),
  },
  {
    label: 'cardinality-antigravity-only-filters-cursor-kind',
    activePresets: new Set<SourcePresetId>(['antigravity']),
    includeHomeConfig: true,
    workspaceFolders: [],
    mockDiscovered: WORLD_ANTIGRAVITY_VS_CURSOR,
    expectedPayloadPaths: ['/ws/GEMINI.md'],
    assertRawSnapshotCount: 3,
  },
  {
    label: 'cardinality-cursor-and-antigravity-union',
    activePresets: new Set<SourcePresetId>(['cursor', 'antigravity']),
    includeHomeConfig: true,
    workspaceFolders: [],
    mockDiscovered: WORLD_ANTIGRAVITY_VS_CURSOR,
    expectedPayloadPaths: sortPaths(['/ws/GEMINI.md', '/ws/.cursor/rules/x.mdc']),
  },
  {
    label: 'mixed-ws-user-includeHome-true-cursor',
    activePresets: new Set<SourcePresetId>(['cursor']),
    includeHomeConfig: true,
    workspaceFolders: [],
    mockDiscovered: effectiveMockDiscovered(WORLD_MIXED_WS_USER, true),
    expectedPayloadPaths: sortPaths(['/ws/.cursor/rules/a.mdc', '/home/.cursor/mcp.json']),
  },
  {
    label: 'mixed-ws-user-includeHome-false-drops-user-paths',
    activePresets: new Set<SourcePresetId>(['cursor']),
    includeHomeConfig: false,
    workspaceFolders: [],
    mockDiscovered: effectiveMockDiscovered(WORLD_MIXED_WS_USER, false),
    expectedPayloadPaths: ['/ws/.cursor/rules/a.mdc'],
  },
  {
    label: 'empty-active-presets-no-scan-rows',
    activePresets: new Set<SourcePresetId>(),
    includeHomeConfig: true,
    workspaceFolders: [],
    mockDiscovered: [],
    expectedPayloadPaths: [],
  },
  {
    label: 'same-path-two-presets-two-snapshot-rows',
    activePresets: new Set<SourcePresetId>(['claude', 'cursor']),
    includeHomeConfig: false,
    workspaceFolders: [],
    mockDiscovered: [
      discovered('/ws/overlap.md', 'claude', SourceCategoryId.LlmGuideline, 'workspace'),
      discovered('/ws/overlap.md', 'cursor', SourceCategoryId.Rule, 'workspace'),
    ],
    expectedPayloadPaths: sortPaths(['/ws/overlap.md', '/ws/overlap.md']),
  },
];

describe('sources indexing pipeline (matrix)', () => {
  it.each(MATRIX)('$label', async (row) => {
    const { service, scanner, snapshotStore, fileStats, payloadFor } = createPipeline({
      activePresets: row.activePresets,
      mockDiscovered: row.mockDiscovered,
      workspaceFolders: row.workspaceFolders,
    });

    const snap = await service.indexWorkspace({ includeHomeConfig: row.includeHomeConfig });

    expect(scanner.scanWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        includeHomeConfig: row.includeHomeConfig,
        activePresets: row.activePresets,
      })
    );

    if (row.assertRawSnapshotCount !== undefined) {
      expect(snap.sourceCount).toBe(row.assertRawSnapshotCount);
    } else {
      expect(snap.sourceCount).toBe(row.mockDiscovered.length);
    }
    expect(fileStats.statFile).toHaveBeenCalledTimes(row.mockDiscovered.length);
    expect(snapshotStore.save).toHaveBeenCalledTimes(1);

    const payload = payloadFor(snap);
    expect(payload).not.toBeNull();
    expect(isSourcesSnapshotPayload(payload)).toBe(true);
    expect(payload!.sourceCount).toBe(row.expectedPayloadPaths.length);
    expect(sortPaths(payload!.records.map((r) => r.path))).toEqual(row.expectedPayloadPaths);
    expect(payload!.workspaceFolders).toEqual(row.workspaceFolders);

    for (const r of payload!.records) {
      const src = row.mockDiscovered.find((d) => d.id === r.id);
      expect(src).toBeDefined();
      expect(r.preset).toBe(src!.preset);
      expect(r.category).toBe(src!.category);
    }
  });
});

describe('sources indexing pipeline (edge cases)', () => {
  it('buildSourcesSnapshotPayload returns null when snapshot is null', () => {
    expect(
      buildSourcesSnapshotPayload(null, [], () => new Set<SourcePresetId>(['cursor']))
    ).toBeNull();
  });

  it('isSourcesSnapshotPayload only rejects non-objects', () => {
    expect(isSourcesSnapshotPayload(null)).toBe(false);
    expect(isSourcesSnapshotPayload({})).toBe(true);
    expect(
      isSourcesSnapshotPayload({
        generatedAt: 'g',
        sourceCount: 0,
        records: 'bad',
        workspaceFolders: [],
      })
    ).toBe(true);
  });

  it('persists facet tags on snapshot and payload (locality, category, preset)', async () => {
    const mockDiscovered: DiscoveredSource[] = [
      discovered('/ws/.claude/hooks/run.sh', 'claude', SourceCategoryId.Hook, 'workspace'),
      discovered('/ws/.cursor/commands/x.md', 'cursor', SourceCategoryId.Command, 'workspace'),
      discovered('/home/.cursor/mcp.json', 'cursor', SourceCategoryId.Mcp, 'user'),
    ];
    const { service, payloadFor } = createPipeline({
      activePresets: new Set<SourcePresetId>(['claude', 'cursor']),
      mockDiscovered,
      workspaceFolders: [],
    });

    const snap = await service.indexWorkspace({ includeHomeConfig: true });

    const hook = snap.records.find((r) => r.path === '/ws/.claude/hooks/run.sh');
    expect(hook).toBeDefined();
    expect(hook!.tags).toContainEqual({
      type: SourceTagType.Locality,
      value: SourceLocalityTagValue.Project,
    });
    expect(hook!.tags).toContainEqual({
      type: SourceTagType.Category,
      value: SourceCategoryId.Hook,
    });
    expect(hook!.tags.some((t) => t.type === SourceTagType.Preset && t.value === 'claude')).toBe(
      true
    );

    const cmd = snap.records.find((r) => r.path === '/ws/.cursor/commands/x.md');
    expect(cmd).toBeDefined();
    expect(cmd!.tags).toContainEqual({
      type: SourceTagType.Category,
      value: SourceCategoryId.Command,
    });
    expect(cmd!.tags.some((t) => t.type === SourceTagType.Preset && t.value === 'cursor')).toBe(
      true
    );

    const mcp = snap.records.find((r) => r.path === '/home/.cursor/mcp.json');
    expect(mcp).toBeDefined();
    expect(mcp!.tags).toContainEqual({
      type: SourceTagType.Locality,
      value: SourceLocalityTagValue.Global,
    });
    expect(mcp!.tags).toContainEqual({
      type: SourceTagType.Category,
      value: SourceCategoryId.Mcp,
    });

    const payload = payloadFor(snap);
    expect(payload).not.toBeNull();
    const ph = payload!.records.find((r) => r.path === '/ws/.claude/hooks/run.sh');
    expect(ph!.tags).toEqual(hook!.tags);
    const pcmd = payload!.records.find((r) => r.path === '/ws/.cursor/commands/x.md');
    expect(pcmd!.tags).toEqual(cmd!.tags);
  });

  it('reuses in-flight indexWorkspace promise for concurrent callers', async () => {
    let resolveScan!: (v: DiscoveredSource[]) => void;
    const scanPromise = new Promise<DiscoveredSource[]>((r) => {
      resolveScan = r;
    });
    const scanner = { scanWorkspace: vi.fn(() => scanPromise) };
    const snapshotStore = {
      load: vi.fn(() => Promise.resolve(null)),
      save: vi.fn(() => Promise.resolve()),
    };
    const active = new Set<SourcePresetId>(['cursor']);
    const service = new SourcesService(
      scanner,
      { statFile: vi.fn(() => Promise.resolve(STAT)) },
      snapshotStore,
      { info: vi.fn() },
      () => active
    );
    const p1 = service.indexWorkspace();
    const p2 = service.indexWorkspace();
    expect(scanner.scanWorkspace).toHaveBeenCalledTimes(1);
    resolveScan([discovered('/a', 'cursor', SourceCategoryId.Rule, 'workspace')]);
    const [a, b] = await Promise.all([p1, p2]);
    expect(a).toBe(b);
    expect(snapshotStore.save).toHaveBeenCalledTimes(1);
  });
});
