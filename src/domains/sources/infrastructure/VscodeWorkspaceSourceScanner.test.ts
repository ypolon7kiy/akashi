import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SourceKind, SourceScope } from '../domain/model';
import { sourceKindsForPresets } from '../domain/sourcePresets';
import { buildSourceFacetTags } from '../domain/sourceTags';

const findFilesMock = vi.hoisted(() =>
  vi.fn<(glob: string, exclude?: string) => Promise<{ fsPath: string }[]>>()
);

vi.mock('vscode', () => {
  const Uri = { file: (fsPath: string) => ({ fsPath }) };
  return {
    Uri,
    workspace: {
      findFiles: (glob: string, exclude?: string) => findFilesMock(glob, exclude),
      /** `readToolUserRoots` reads optional dirs; unset => default roots under homedir. */
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
  beforeEach(() => {
    findFilesMock.mockReset();
    findFilesMock.mockImplementation(() => Promise.resolve([{ fsPath: '/ws/AGENTS.md' }]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty and does not call findFiles when allowedKinds is empty', async () => {
    const scanner = new VscodeWorkspaceSourceScanner();
    const out = await scanner.scanWorkspace({
      allowedKinds: new Set(),
      includeHomeConfig: false,
    });
    expect(out).toEqual([]);
    expect(findFilesMock).not.toHaveBeenCalled();
  });

  it('calls findFiles once per selected glob and maps workspace files with kind and origin', async () => {
    const allowedKinds = sourceKindsForPresets(new Set(['cursor']));
    const expectedPatterns = sourceDiscoveryPlan.selectWorkspaceGlobs(allowedKinds);
    expect(expectedPatterns.length).toBeGreaterThan(0);

    const scanner = new VscodeWorkspaceSourceScanner();
    const out = await scanner.scanWorkspace({
      allowedKinds,
      includeHomeConfig: false,
    });

    expect(findFilesMock).toHaveBeenCalledTimes(expectedPatterns.length);
    const agents = out.find((s) => s.path === '/ws/AGENTS.md');
    expect(agents).toEqual({
      id: '/ws/AGENTS.md',
      path: '/ws/AGENTS.md',
      kind: SourceKind.AgentsMd,
      scope: SourceScope.File,
      origin: 'workspace',
      tags: buildSourceFacetTags(SourceKind.AgentsMd, 'workspace'),
    });
  });

  it('dedupes when multiple globs return the same path', async () => {
    const allowedKinds = sourceKindsForPresets(new Set(['cursor']));
    const patternCount = sourceDiscoveryPlan.selectWorkspaceGlobs(allowedKinds).length;
    findFilesMock.mockImplementation(() => Promise.resolve([{ fsPath: '/ws/AGENTS.md' }]));

    const scanner = new VscodeWorkspaceSourceScanner();
    const out = await scanner.scanWorkspace({
      allowedKinds,
      includeHomeConfig: false,
    });

    expect(findFilesMock).toHaveBeenCalledTimes(patternCount);
    expect(out.length).toBe(1);
    expect(out[0].path).toBe('/ws/AGENTS.md');
  });

  it('skips home collection when includeHomeConfig is false', async () => {
    const collectSpy = vi.spyOn(sourceDiscoveryPlan, 'collectHomeSourcePaths');
    const allowedKinds = sourceKindsForPresets(new Set(['cursor']));

    const scanner = new VscodeWorkspaceSourceScanner();
    await scanner.scanWorkspace({ allowedKinds, includeHomeConfig: false });

    expect(collectSpy).not.toHaveBeenCalled();
  });

  it('includes user-scope paths from collectHomeSourcePaths when includeHomeConfig is true', async () => {
    const mcpPath = path.join('/mock/home', '.cursor', 'mcp.json');
    const collectSpy = vi
      .spyOn(sourceDiscoveryPlan, 'collectHomeSourcePaths')
      .mockResolvedValue([mcpPath]);

    const allowedKinds = sourceKindsForPresets(new Set(['cursor']));
    const scanner = new VscodeWorkspaceSourceScanner();
    const out = await scanner.scanWorkspace({ allowedKinds, includeHomeConfig: true });

    expect(collectSpy).toHaveBeenCalled();
    const userMcp = out.find((s) => s.path === mcpPath);
    expect(userMcp).toMatchObject({
      path: mcpPath,
      kind: SourceKind.CursorMcpJson,
      origin: 'user',
      scope: SourceScope.User,
      tags: buildSourceFacetTags(SourceKind.CursorMcpJson, 'user'),
    });
  });
});
