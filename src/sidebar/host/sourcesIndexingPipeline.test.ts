/**
 * Matrix E2E: mock disk (scanner) → SourcesService.indexWorkspace → buildSourcesSnapshotPayload.
 */
import { describe, expect, it, vi } from 'vitest';
import { SourcesService } from '../../domains/sources/application/SourcesService';
import type { DiscoveredSource } from '../../domains/sources/application/ports';
import type { SourceIndexSnapshot } from '../../domains/sources/domain/model';
import {
  SourceKind,
  SourceScope,
  type SourceKind as SourceKindT,
} from '../../domains/sources/domain/model';
import {
  ALL_SOURCE_PRESET_IDS,
  presetsContainingKind,
  sourceKindsForPresets,
  type SourcePresetId,
} from '../../domains/sources/domain/sourcePresets';
import { isSourcesSnapshotPayload, type WorkspaceFolderInfo } from '../bridge/sourceDescriptor';
import { buildSourcesSnapshotPayload } from './sourcesSnapshotPayload';

const STAT = { byteLength: 10, updatedAt: '2025-01-01T00:00:00.000Z' };

function sortKinds(kinds: readonly string[]): string[] {
  return [...kinds].sort();
}

function discovered(
  path: string,
  kind: SourceKindT,
  origin: 'workspace' | 'user'
): DiscoveredSource {
  return {
    id: path,
    path,
    kind,
    scope: origin === 'user' ? SourceScope.User : SourceScope.File,
    origin,
  };
}

const MIXED_CURSOR_CLAUDE_CODEX: DiscoveredSource[] = [
  discovered('/ws/AGENTS.md', SourceKind.AgentsMd, 'workspace'),
  discovered('/ws/.cursor/rules/x.mdc', SourceKind.CursorRulesMdc, 'workspace'),
  discovered('/ws/.claude/settings.json', SourceKind.ClaudeSettingsJson, 'workspace'),
  discovered('/ws/.codex/config.toml', SourceKind.CodexConfigToml, 'workspace'),
];

/** Mirrors VscodeWorkspaceSourceScanner: home branch omitted when includeHomeConfig is false. */
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
  discovered('/ws/AGENTS.md', SourceKind.AgentsMd, 'workspace'),
  discovered('/home/.cursor/mcp.json', SourceKind.CursorMcpJson, 'user'),
];

const WORLD_ANTIGRAVITY_VS_CURSOR: DiscoveredSource[] = [
  discovered('/ws/AGENTS.md', SourceKind.AgentsMd, 'workspace'),
  discovered('/ws/GEMINI.md', SourceKind.GeminiMd, 'workspace'),
  discovered('/ws/.cursor/rules/x.mdc', SourceKind.CursorRulesMdc, 'workspace'),
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
  const service = new SourcesService(scanner, fileStats, snapshotStore, { info: vi.fn() }, () =>
    sourceKindsForPresets(opts.activePresets)
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
  expectedPayloadKinds: string[];
  assertRawSnapshotCount?: number;
}

const MATRIX: MatrixRow[] = [
  {
    label: 'empty-disk-cursor-only',
    activePresets: new Set<SourcePresetId>(['cursor']),
    includeHomeConfig: false,
    workspaceFolders: [],
    mockDiscovered: [],
    expectedPayloadKinds: [],
  },
  {
    label: 'workspace-only-includeHome-false',
    activePresets: new Set<SourcePresetId>(['cursor']),
    includeHomeConfig: false,
    workspaceFolders: [],
    mockDiscovered: [discovered('/ws/AGENTS.md', SourceKind.AgentsMd, 'workspace')],
    expectedPayloadKinds: [SourceKind.AgentsMd],
  },
  {
    label: 'user-global-claude-includeHome-true',
    activePresets: new Set<SourcePresetId>(['claude']),
    includeHomeConfig: true,
    workspaceFolders: [],
    mockDiscovered: [
      discovered('/home/.claude/settings.json', SourceKind.ClaudeSettingsJson, 'user'),
    ],
    expectedPayloadKinds: [SourceKind.ClaudeSettingsJson],
  },
  {
    label: 'three-presets-mixed-workspace',
    activePresets: new Set<SourcePresetId>(['cursor', 'claude', 'codex']),
    includeHomeConfig: true,
    workspaceFolders: [],
    mockDiscovered: MIXED_CURSOR_CLAUDE_CODEX,
    expectedPayloadKinds: sortKinds([
      SourceKind.AgentsMd,
      SourceKind.CursorRulesMdc,
      SourceKind.ClaudeSettingsJson,
      SourceKind.CodexConfigToml,
    ]),
  },
  {
    label: 'three-presets-mixed-but-cursor-active-filters-payload',
    activePresets: new Set<SourcePresetId>(['cursor']),
    includeHomeConfig: true,
    workspaceFolders: [],
    mockDiscovered: MIXED_CURSOR_CLAUDE_CODEX,
    expectedPayloadKinds: sortKinds([SourceKind.AgentsMd, SourceKind.CursorRulesMdc]),
    assertRawSnapshotCount: 4,
  },
  {
    label: 'all-presets-full-mix',
    activePresets: new Set(ALL_SOURCE_PRESET_IDS),
    includeHomeConfig: true,
    workspaceFolders: [],
    mockDiscovered: MIXED_CURSOR_CLAUDE_CODEX,
    expectedPayloadKinds: sortKinds([
      SourceKind.AgentsMd,
      SourceKind.CursorRulesMdc,
      SourceKind.ClaudeSettingsJson,
      SourceKind.CodexConfigToml,
    ]),
  },
  {
    label: 'workspace-folders-passthrough',
    activePresets: new Set<SourcePresetId>(['cursor']),
    includeHomeConfig: true,
    workspaceFolders: [{ name: 'proj', path: '/projects/foo' }],
    mockDiscovered: [
      discovered('/ws/AGENTS.md', SourceKind.AgentsMd, 'workspace'),
      discovered('/ws/.cursor/rules/a.mdc', SourceKind.CursorRulesMdc, 'workspace'),
    ],
    expectedPayloadKinds: sortKinds([SourceKind.AgentsMd, SourceKind.CursorRulesMdc]),
  },
  {
    label: 'cardinality-antigravity-only-filters-cursor-kind',
    activePresets: new Set<SourcePresetId>(['antigravity']),
    includeHomeConfig: true,
    workspaceFolders: [],
    mockDiscovered: WORLD_ANTIGRAVITY_VS_CURSOR,
    expectedPayloadKinds: sortKinds([SourceKind.AgentsMd, SourceKind.GeminiMd]),
    assertRawSnapshotCount: 3,
  },
  {
    label: 'cardinality-cursor-and-antigravity-union',
    activePresets: new Set<SourcePresetId>(['cursor', 'antigravity']),
    includeHomeConfig: true,
    workspaceFolders: [],
    mockDiscovered: WORLD_ANTIGRAVITY_VS_CURSOR,
    expectedPayloadKinds: sortKinds([
      SourceKind.AgentsMd,
      SourceKind.GeminiMd,
      SourceKind.CursorRulesMdc,
    ]),
  },
  {
    label: 'mixed-ws-user-includeHome-true-cursor',
    activePresets: new Set<SourcePresetId>(['cursor']),
    includeHomeConfig: true,
    workspaceFolders: [],
    mockDiscovered: effectiveMockDiscovered(WORLD_MIXED_WS_USER, true),
    expectedPayloadKinds: sortKinds([SourceKind.AgentsMd, SourceKind.CursorMcpJson]),
  },
  {
    label: 'mixed-ws-user-includeHome-false-drops-user-paths',
    activePresets: new Set<SourcePresetId>(['cursor']),
    includeHomeConfig: false,
    workspaceFolders: [],
    mockDiscovered: effectiveMockDiscovered(WORLD_MIXED_WS_USER, false),
    expectedPayloadKinds: [SourceKind.AgentsMd],
  },
  {
    label: 'empty-active-presets-no-kinds-empty-snapshot',
    activePresets: new Set<SourcePresetId>(),
    includeHomeConfig: true,
    workspaceFolders: [],
    mockDiscovered: [],
    expectedPayloadKinds: [],
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
        allowedKinds: sourceKindsForPresets(row.activePresets),
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
    expect(payload!.sourceCount).toBe(row.expectedPayloadKinds.length);
    expect(sortKinds(payload!.records.map((r) => r.kind))).toEqual(row.expectedPayloadKinds);
    expect(payload!.workspaceFolders).toEqual(row.workspaceFolders);

    for (const r of payload!.records) {
      expect(sortKinds(r.presets)).toEqual(sortKinds(presetsContainingKind(r.kind as SourceKindT)));
    }
  });
});

describe('sources indexing pipeline (edge cases)', () => {
  it('buildSourcesSnapshotPayload returns null when snapshot is null', () => {
    expect(
      buildSourcesSnapshotPayload(null, [], () => new Set<SourcePresetId>(['cursor']))
    ).toBeNull();
  });

  it('isSourcesSnapshotPayload rejects invalid shapes', () => {
    expect(isSourcesSnapshotPayload(null)).toBe(false);
    expect(isSourcesSnapshotPayload({})).toBe(false);
    expect(
      isSourcesSnapshotPayload({
        generatedAt: 'g',
        sourceCount: 0,
        records: 'bad',
        workspaceFolders: [],
      })
    ).toBe(false);
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
      () => sourceKindsForPresets(active)
    );
    const p1 = service.indexWorkspace();
    const p2 = service.indexWorkspace();
    expect(scanner.scanWorkspace).toHaveBeenCalledTimes(1);
    resolveScan([discovered('/a', SourceKind.AgentsMd, 'workspace')]);
    const [a, b] = await Promise.all([p1, p2]);
    expect(a).toBe(b);
    expect(snapshotStore.save).toHaveBeenCalledTimes(1);
  });
});
