import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SourceScope } from '../domain/model';
import { buildSourceFacetTags } from '../domain/sourceTags';
import { SourceCategoryId } from '../domain/sourceTags';
import { sourceRecordId } from '../../../shared/sourceRecordId';

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

vi.mock('../../../log', () => ({
  appendLine: vi.fn(),
}));

vi.mock('node:os', () => ({
  homedir: () => path.normalize('/mock/home'),
}));

import * as sourceDiscoveryPlan from './sourceDiscoveryPlan';
import { VscodeWorkspaceSourceScanner } from './VscodeWorkspaceSourceScanner';

describe('VscodeWorkspaceSourceScanner', () => {
  const wsRulePath = '/ws/.cursor/rules/x.mdc';

  /** Only globs that target recursive .cursor/rules .mdc files should return the rule path; other patterns return []. */
  function findFilesForCursorRulePath(glob: string): Promise<{ fsPath: string }[]> {
    if (glob.includes('rules') && glob.includes('mdc')) {
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
    const scanner = new VscodeWorkspaceSourceScanner();
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

    const scanner = new VscodeWorkspaceSourceScanner();
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
      scope: SourceScope.File,
      origin: 'workspace',
      tags: buildSourceFacetTags({
        category: SourceCategoryId.Rule,
        preset: 'cursor',
        origin: 'workspace',
      }),
    });
  });

  it('dedupes when multiple globs return the same path', async () => {
    const activePresets = new Set<'cursor'>(['cursor']);
    const patternCount = sourceDiscoveryPlan.selectWorkspaceGlobRows(activePresets).length;
    findFilesMock.mockImplementation((g) => findFilesForCursorRulePath(g));

    const scanner = new VscodeWorkspaceSourceScanner();
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
    const scanner = new VscodeWorkspaceSourceScanner();
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

    const scanner = new VscodeWorkspaceSourceScanner();
    await scanner.scanWorkspace({ activePresets, includeHomeConfig: false });

    expect(collectSpy).not.toHaveBeenCalled();
  });

  it('includes user-scope paths from collectHomeSourcePaths when includeHomeConfig is true', async () => {
    const mcpPath = path.join('/mock/home', '.cursor', 'mcp.json');
    const collectSpy = vi
      .spyOn(sourceDiscoveryPlan, 'collectHomeSourcePaths')
      .mockResolvedValue([{ path: mcpPath, presetId: 'cursor', category: SourceCategoryId.Mcp }]);

    const activePresets = new Set<'cursor'>(['cursor']);
    const scanner = new VscodeWorkspaceSourceScanner();
    const out = await scanner.scanWorkspace({ activePresets, includeHomeConfig: true });

    expect(collectSpy).toHaveBeenCalled();
    const userMcp = out.find((s) => s.path === mcpPath);
    expect(userMcp).toMatchObject({
      id: sourceRecordId('cursor', 'user', mcpPath),
      path: mcpPath,
      preset: 'cursor',
      category: SourceCategoryId.Mcp,
      origin: 'user',
      scope: SourceScope.User,
      tags: buildSourceFacetTags({
        category: SourceCategoryId.Mcp,
        preset: 'cursor',
        origin: 'user',
      }),
    });
  });
});
