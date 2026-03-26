import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildSourceFacetTags } from '@src/domains/sources/domain/sourceTags';
import { SourceCategoryId } from '@src/domains/sources/domain/sourceTags';
import { sourceRecordId } from '@src/shared/sourceRecordId';
import type { ExcludePatternsGetter } from '@src/shared/config/excludePatterns';

const findFilesMock = vi.hoisted(() =>
  vi.fn<(glob: string, exclude?: string) => Promise<{ fsPath: string }[]>>()
);

vi.mock('vscode', () => {
  const Uri = { file: (fsPath: string) => ({ fsPath }) };
  return {
    Uri,
    workspace: {
      findFiles: (glob: string, exclude?: string) => findFilesMock(glob, exclude),
      getConfiguration: () => ({ get: () => undefined }),
    },
  };
});

vi.mock('../../../../src/log', () => ({
  appendLine: vi.fn(),
}));

vi.mock('node:os', () => ({
  homedir: () => path.normalize('/mock/home'),
}));

import * as sourceDiscoveryPlan from '@src/domains/sources/infrastructure/sourceDiscoveryPlan';
import { VscodeWorkspaceSourceScanner } from '@src/domains/sources/infrastructure/VscodeWorkspaceSourceScanner';

function mockToolUserRoots(homeDir: string) {
  return {
    claudeUserRoot: path.join(homeDir, '.claude'),
    cursorUserRoot: path.join(homeDir, '.cursor'),
    geminiUserRoot: path.join(homeDir, '.gemini'),
    codexUserRoot: path.join(homeDir, '.codex'),
  };
}

const mockGetExcludePatterns: ExcludePatternsGetter = () =>
  Promise.resolve({
    findFilesExcludeGlob: '**/{.git,dist,node_modules}/**',
    homeScanSkipDirNames: new Set(['.git', 'dist', 'node_modules']),
  });

describe('VscodeWorkspaceSourceScanner', () => {
  const wsRulePath = '/ws/.cursor/rules/x.mdc';

  // Return the sample rule path for workspace globs under .cursor/rules that target .mdc or .md rule files.
  function findFilesForCursorRulePath(glob: string): Promise<{ fsPath: string }[]> {
    if (glob.includes('.cursor/rules') && (glob.includes('mdc') || glob.endsWith('.md'))) {
      return Promise.resolve([{ fsPath: wsRulePath }]);
    }
    return Promise.resolve([]);
  }

  beforeEach(() => {
    findFilesMock.mockReset();
    findFilesMock.mockImplementation((g) => findFilesForCursorRulePath(g));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty and does not call findFiles when activePresets is empty', async () => {
    const scanner = new VscodeWorkspaceSourceScanner(mockToolUserRoots, mockGetExcludePatterns);
    const out = await scanner.scanWorkspace({
      activePresets: new Set(),
      includeHomeConfig: false,
    });
    expect(out).toEqual([]);
    expect(findFilesMock).not.toHaveBeenCalled();
  });

  it('calls findFiles once per selected glob row and maps workspace files with preset and category', async () => {
    const activePresets = new Set<'cursor'>(['cursor']);
    const expectedRows = sourceDiscoveryPlan.selectWorkspaceGlobRows(activePresets);
    expect(expectedRows.length).toBeGreaterThan(0);

    const scanner = new VscodeWorkspaceSourceScanner(mockToolUserRoots, mockGetExcludePatterns);
    const out = await scanner.scanWorkspace({
      activePresets,
      includeHomeConfig: false,
    });

    expect(findFilesMock).toHaveBeenCalledTimes(expectedRows.length);
    const rule = out.find((s) => s.path === wsRulePath);
    expect(rule).toEqual({
      id: sourceRecordId('cursor', 'workspace', wsRulePath),
      path: wsRulePath,
      preset: 'cursor',
      category: SourceCategoryId.Rule,
      locality: 'workspace',
      tags: buildSourceFacetTags({
        category: SourceCategoryId.Rule,
        preset: 'cursor',
        locality: 'workspace',
      }),
    });
  });

  it('dedupes when multiple globs return the same path', async () => {
    const activePresets = new Set<'cursor'>(['cursor']);
    const patternCount = sourceDiscoveryPlan.selectWorkspaceGlobRows(activePresets).length;
    findFilesMock.mockImplementation((g) => findFilesForCursorRulePath(g));

    const scanner = new VscodeWorkspaceSourceScanner(mockToolUserRoots, mockGetExcludePatterns);
    const out = await scanner.scanWorkspace({
      activePresets,
      includeHomeConfig: false,
    });

    expect(findFilesMock).toHaveBeenCalledTimes(patternCount);
    expect(out.length).toBe(1);
    expect(out[0].path).toBe(wsRulePath);
    expect(out[0].id).toBe(sourceRecordId('cursor', 'workspace', wsRulePath));
  });

  it('emits one row per preset when the same path matches multiple active presets', async () => {
    const sharedPath = '/ws/shared.md';
    findFilesMock.mockImplementation(() => Promise.resolve([{ fsPath: sharedPath }]));
    const scanner = new VscodeWorkspaceSourceScanner(mockToolUserRoots, mockGetExcludePatterns);
    const out = await scanner.scanWorkspace({
      activePresets: new Set(['cursor', 'claude']),
      includeHomeConfig: false,
    });
    const forPath = out.filter((s) => s.path === sharedPath);
    expect(forPath.length).toBe(2);
    expect(new Set(forPath.map((s) => s.preset))).toEqual(new Set(['cursor', 'claude']));
    expect(new Set(forPath.map((s) => s.id)).size).toBe(2);
  });

  it('skips home collection when includeHomeConfig is false', async () => {
    const collectSpy = vi.spyOn(sourceDiscoveryPlan, 'collectHomeSourcePaths');
    const activePresets = new Set<'cursor'>(['cursor']);

    const scanner = new VscodeWorkspaceSourceScanner(mockToolUserRoots, mockGetExcludePatterns);
    await scanner.scanWorkspace({ activePresets, includeHomeConfig: false });

    expect(collectSpy).not.toHaveBeenCalled();
  });

  it('includes user-scope paths from collectHomeSourcePaths when includeHomeConfig is true', async () => {
    const mcpPath = path.join('/mock/home', '.cursor', 'mcp.json');
    const collectSpy = vi
      .spyOn(sourceDiscoveryPlan, 'collectHomeSourcePaths')
      .mockResolvedValue([{ path: mcpPath, presetId: 'cursor', category: SourceCategoryId.Mcp }]);

    const activePresets = new Set<'cursor'>(['cursor']);
    const scanner = new VscodeWorkspaceSourceScanner(mockToolUserRoots, mockGetExcludePatterns);
    const out = await scanner.scanWorkspace({ activePresets, includeHomeConfig: true });

    expect(collectSpy).toHaveBeenCalled();
    const userMcp = out.find((s) => s.path === mcpPath);
    expect(userMcp).toMatchObject({
      id: sourceRecordId('cursor', 'user', mcpPath),
      path: mcpPath,
      preset: 'cursor',
      category: SourceCategoryId.Mcp,
      locality: 'user',
      tags: buildSourceFacetTags({
        category: SourceCategoryId.Mcp,
        preset: 'cursor',
        locality: 'user',
      }),
    });
  });
});
