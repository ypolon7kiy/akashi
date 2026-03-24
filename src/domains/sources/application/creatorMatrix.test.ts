/**
 * Creator matrix tests (value-oriented layout):
 * - Registry: non-empty + unique ids (no brittle fixed count).
 * - Broad matrix: three aggregated checks over all creators (valid input, empty input, traversal).
 * - Hook/MCP semantics: exact paths, jsonPath, and merge payloads (highest signal).
 * - run() + mocked vscode: parity with planWithProvidedInput and cancellation.
 */
import * as path from 'node:path';
import * as vscode from 'vscode';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CreatorContext } from '../domain/artifactCreator';
import type { JsonMergeOp, WriteFileOp } from '../domain/artifactOperation';
import { FixedDocCreator } from '../domain/creators/FixedDocCreator';
import { FolderFileCreator } from '../domain/creators/FolderFileCreator';
import { SimpleFileCreator } from '../domain/creators/SimpleFileCreator';
import type { SourcePresetId } from '../../../shared/sourcePresetId';
import {
  ARTIFACT_CREATORS,
  findArtifactCreatorById,
  getArtifactCreatorsForContext,
} from '../registerSourcePresets';
import { ClaudeMcpCreator } from '../presets/claude/creators/ClaudeMcpCreator';
import { ClaudeRegisteredHookCreator } from '../presets/claude/creators/ClaudeRegisteredHookCreator';
import { CursorMcpCreator } from '../presets/cursor/creators/CursorMcpCreator';
import { CursorRegisteredHookCreator } from '../presets/cursor/creators/CursorRegisteredHookCreator';
import { CodexConfigTomlCreator } from '../presets/codex/creators/CodexConfigTomlCreator';
import { DEFAULT_CLAUDE_HOOK_EVENT } from '../presets/claude/creators/ClaudeRegisteredHookCreator';
import { DEFAULT_CURSOR_HOOK_EVENT } from '../presets/cursor/creators/CursorRegisteredHookCreator';
import { SourceCategoryId } from '../domain/sourceTags';

const ROOTS = {
  claudeUserRoot: '/home/user/.claude',
  cursorUserRoot: '/home/user/.cursor',
  geminiUserRoot: '/home/user/.config/gemini',
  codexUserRoot: '/home/user/.codex',
};

const WORKSPACE_ROOT = '/ws';

function ctx(overrides: Partial<CreatorContext> = {}): CreatorContext {
  return {
    workspaceRoot: WORKSPACE_ROOT,
    roots: ROOTS,
    ...overrides,
  };
}

const VALID_USER_INPUT = 'matrix-e2e-test';
const TRAVERSAL_INPUT = '../traversal';

/** Creators where empty userInput still yields a plan (programmatic path). */
const EMPTY_INPUT_ALLOWS_PLAN = new Set([
  'codex/config-toml/workspace',
  'codex/config-toml/user',
  'antigravity/gemini/user',
]);

/** Fixed-path docs do not run basename validation on title. */
const FIXED_DOC_IDS = new Set([
  'claude/claude-md/workspace',
  'claude/claude-md/user',
  'cursor/agents-md-fixed/workspace',
  'antigravity/gemini/workspace',
  'antigravity/gemini/user',
]);

const CODEX_CONFIG_IDS = new Set(['codex/config-toml/workspace', 'codex/config-toml/user']);

function userHomePrefixes(): string[] {
  return [
    path.normalize(ROOTS.claudeUserRoot),
    path.normalize(ROOTS.cursorUserRoot),
    path.normalize(ROOTS.geminiUserRoot),
    path.normalize(ROOTS.codexUserRoot),
  ];
}

function isPathUnderWorkspace(abs: string): boolean {
  const w = path.normalize(WORKSPACE_ROOT);
  const n = path.normalize(abs);
  return n === w || n.startsWith(w + path.sep);
}

function isPathUnderUserHome(abs: string): boolean {
  const n = path.normalize(abs);
  return userHomePrefixes().some((p) => n === p || n.startsWith(p + path.sep));
}

/** Returns human-readable violations (empty if structural checks pass). */
function collectStructuralViolations(
  creatorScope: 'workspace' | 'user',
  operations: readonly { type: string; absolutePath: string; content?: string; jsonPath?: string; description?: string }[]
): string[] {
  const out: string[] = [];
  for (const op of operations) {
    if (op.type === 'writeFile') {
      const w = op as WriteFileOp;
      if (!/^\//.test(w.absolutePath)) {
        out.push(`writeFile path not absolute: ${w.absolutePath}`);
      }
      if (w.content.length === 0) {
        out.push('writeFile content empty');
      }
      const under =
        creatorScope === 'workspace'
          ? isPathUnderWorkspace(w.absolutePath)
          : isPathUnderUserHome(w.absolutePath);
      if (!under) {
        out.push(`writeFile path outside allowed ${creatorScope} root: ${w.absolutePath}`);
      }
    } else if (op.type === 'jsonMerge') {
      const j = op as JsonMergeOp;
      if (j.jsonPath.length === 0) {
        out.push('jsonMerge jsonPath empty');
      }
      if (j.description.trim().length === 0) {
        out.push('jsonMerge description empty');
      }
      const under =
        creatorScope === 'workspace'
          ? isPathUnderWorkspace(j.absolutePath)
          : isPathUnderUserHome(j.absolutePath);
      if (!under) {
        out.push(`jsonMerge path outside allowed ${creatorScope} root: ${j.absolutePath}`);
      }
    }
  }
  return out;
}

function prefixViolations(creatorId: string, violations: string[]): string[] {
  return violations.map((v) => `${creatorId}: ${v}`);
}

function expectsBasenameValidationErrorOnTraversal(creatorId: string): boolean {
  if (FIXED_DOC_IDS.has(creatorId) || CODEX_CONFIG_IDS.has(creatorId)) {
    return false;
  }
  return true;
}

describe('Creator matrix registry', () => {
  it('is non-empty and has unique creator ids', () => {
    expect(ARTIFACT_CREATORS.length).toBeGreaterThan(0);
    const ids = ARTIFACT_CREATORS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Registry helpers', () => {
  it('getArtifactCreatorsForContext returns only matching preset and scope', () => {
    const ws = getArtifactCreatorsForContext('claude', 'workspace');
    expect(ws.length).toBeGreaterThan(0);
    for (const c of ws) {
      expect(c.presetId).toBe('claude');
      expect(c.scope).toBe('workspace');
    }
  });

  it('getArtifactCreatorsForContext with unknown preset id returns empty', () => {
    const r = getArtifactCreatorsForContext('not-a-preset' as SourcePresetId, 'workspace');
    expect(r).toEqual([]);
  });

  it('findArtifactCreatorById returns creator when id exists', () => {
    const c = findArtifactCreatorById('claude/skill/workspace');
    expect(c).toBeDefined();
    expect(c!.id).toBe('claude/skill/workspace');
  });

  it('findArtifactCreatorById returns undefined for unknown id', () => {
    expect(findArtifactCreatorById('nonexistent/id')).toBeUndefined();
  });
});

describe('Creator matrix: planWithProvidedInput (aggregated)', () => {
  it('all creators: valid userInput yields a structural plan', () => {
    const failures: string[] = [];
    for (const creator of ARTIFACT_CREATORS) {
      const r = creator.planWithProvidedInput(ctx(), { userInput: VALID_USER_INPUT });
      if (r.kind !== 'plan') {
        failures.push(`${creator.id}: expected kind 'plan', got '${r.kind}'`);
        continue;
      }
      if (r.plan.operations.length === 0) {
        failures.push(`${creator.id}: plan has no operations`);
        continue;
      }
      failures.push(...prefixViolations(creator.id, collectStructuralViolations(creator.scope, r.plan.operations)));
    }
    expect(failures).toEqual([]);
  });

  it('all creators: blank userInput matches error vs allowed-plan policy', () => {
    const failures: string[] = [];
    for (const creator of ARTIFACT_CREATORS) {
      const r = creator.planWithProvidedInput(ctx(), { userInput: '   ' });
      if (EMPTY_INPUT_ALLOWS_PLAN.has(creator.id)) {
        if (r.kind !== 'plan') {
          failures.push(`${creator.id}: expected kind 'plan' for empty input, got '${r.kind}'`);
          continue;
        }
        failures.push(
          ...prefixViolations(creator.id, collectStructuralViolations(creator.scope, r.plan.operations))
        );
      } else if (r.kind !== 'error') {
        failures.push(`${creator.id}: expected kind 'error' for empty input, got '${r.kind}'`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('all creators: traversal basename policy (error vs plan + structure)', () => {
    const failures: string[] = [];
    for (const creator of ARTIFACT_CREATORS) {
      const r = creator.planWithProvidedInput(ctx(), { userInput: TRAVERSAL_INPUT });
      if (expectsBasenameValidationErrorOnTraversal(creator.id)) {
        if (r.kind !== 'error') {
          failures.push(`${creator.id}: expected kind 'error' for traversal input, got '${r.kind}'`);
        }
      } else {
        if (r.kind !== 'plan') {
          failures.push(`${creator.id}: expected kind 'plan' for traversal input, got '${r.kind}'`);
          continue;
        }
        failures.push(
          ...prefixViolations(creator.id, collectStructuralViolations(creator.scope, r.plan.operations))
        );
      }
    }
    expect(failures).toEqual([]);
  });
});

/**
 * Exact plan semantics for programmatic hook/MCP args (paths, jsonPath, merge payloads).
 * The aggregated matrix above only checks coarse structure, not hook event or MCP stub shape.
 */
describe('Creator matrix: registered hook + MCP plan semantics (planWithProvidedInput)', () => {
  const HOOK_NAME = 'semantic-hook';

  describe('ClaudeRegisteredHookCreator (registry)', () => {
    it.each(['claude/hook-config/workspace', 'claude/hook-config/user'] as const)(
      '%s: default lifecycle event and command path match script',
      (id) => {
        const c = ARTIFACT_CREATORS.find((x) => x.id === id)!;
        const r = c.planWithProvidedInput(ctx(), { userInput: HOOK_NAME });
        expect(r.kind).toBe('plan');
        if (r.kind !== 'plan') return;
        const [writeOp, mergeOp] = r.plan.operations;
        expect(writeOp!.type).toBe('writeFile');
        expect(mergeOp!.type).toBe('jsonMerge');
        const merge = mergeOp as JsonMergeOp;
        expect(merge.jsonPath).toBe(`hooks.${DEFAULT_CLAUDE_HOOK_EVENT}`);
        expect(merge.absolutePath).toBe(
          id.endsWith('/workspace')
            ? path.join(WORKSPACE_ROOT, '.claude', 'settings.json')
            : path.join(ROOTS.claudeUserRoot, 'settings.json')
        );
        expect((writeOp as WriteFileOp).absolutePath).toBe(
          id.endsWith('/workspace')
            ? path.join(WORKSPACE_ROOT, '.claude', 'hooks', `${HOOK_NAME}.sh`)
            : path.join(ROOTS.claudeUserRoot, 'hooks', `${HOOK_NAME}.sh`)
        );
        const blocks = merge.value as { matcher: string; hooks: { type: string; command: string }[] }[];
        expect(blocks[0]).toMatchObject({
          matcher: '',
          hooks: [{ type: 'command', command: (writeOp as WriteFileOp).absolutePath }],
        });
      }
    );

    it.each(['claude/hook-config/workspace', 'claude/hook-config/user'] as const)(
      '%s: PreToolUse + matcher appear in jsonPath and merged block',
      (id) => {
        const c = ARTIFACT_CREATORS.find((x) => x.id === id)!;
        const r = c.planWithProvidedInput(ctx(), {
          userInput: HOOK_NAME,
          hookLifecycleEvent: 'PreToolUse',
          hookMatcher: 'Write',
        });
        expect(r.kind).toBe('plan');
        if (r.kind !== 'plan') return;
        const merge = r.plan.operations[1] as JsonMergeOp;
        expect(merge.jsonPath).toBe('hooks.PreToolUse');
        const blocks = merge.value as { matcher: string; hooks: { type: string; command: string }[] }[];
        expect(blocks[0]!.matcher).toBe('Write');
      }
    );

    it('claude/hook-config/workspace: unknown lifecycle falls back to default', () => {
      const c = ARTIFACT_CREATORS.find((x) => x.id === 'claude/hook-config/workspace')!;
      const r = c.planWithProvidedInput(ctx(), {
        userInput: HOOK_NAME,
        hookLifecycleEvent: 'TotallyFake',
      });
      expect(r.kind).toBe('plan');
      if (r.kind !== 'plan') return;
      expect((r.plan.operations[1] as JsonMergeOp).jsonPath).toBe(`hooks.${DEFAULT_CLAUDE_HOOK_EVENT}`);
    });
  });

  describe('CursorRegisteredHookCreator (registry)', () => {
    it.each(['cursor/hook/workspace', 'cursor/hook/user'] as const)(
      '%s: default lifecycle, command path, and version hint on merge',
      (id) => {
        const c = ARTIFACT_CREATORS.find((x) => x.id === id)!;
        const r = c.planWithProvidedInput(ctx(), { userInput: HOOK_NAME });
        expect(r.kind).toBe('plan');
        if (r.kind !== 'plan') return;
        const [writeOp, mergeOp] = r.plan.operations;
        const merge = mergeOp as JsonMergeOp;
        expect(merge.jsonPath).toBe(`hooks.${DEFAULT_CURSOR_HOOK_EVENT}`);
        expect(merge.ensureTopLevelVersionIfMissing).toBe(1);
        const entries = merge.value as { command: string; matcher?: string }[];
        expect(entries[0]!.command).toBe(
          id.endsWith('/workspace')
            ? `.cursor/hooks/${HOOK_NAME}.sh`
            : `./hooks/${HOOK_NAME}.sh`
        );
        expect(entries[0]!.matcher).toBeUndefined();
        expect((writeOp as WriteFileOp).absolutePath).toBe(
          id.endsWith('/workspace')
            ? path.join(WORKSPACE_ROOT, '.cursor', 'hooks', `${HOOK_NAME}.sh`)
            : path.join(ROOTS.cursorUserRoot, 'hooks', `${HOOK_NAME}.sh`)
        );
        expect(merge.absolutePath).toBe(
          id.endsWith('/workspace')
            ? path.join(WORKSPACE_ROOT, '.cursor', 'hooks.json')
            : path.join(ROOTS.cursorUserRoot, 'hooks.json')
        );
      }
    );

    it.each(['cursor/hook/workspace', 'cursor/hook/user'] as const)(
      '%s: preToolUse + matcher in jsonPath and entry',
      (id) => {
        const c = ARTIFACT_CREATORS.find((x) => x.id === id)!;
        const r = c.planWithProvidedInput(ctx(), {
          userInput: HOOK_NAME,
          hookLifecycleEvent: 'preToolUse',
          hookMatcher: 'shell',
        });
        expect(r.kind).toBe('plan');
        if (r.kind !== 'plan') return;
        const merge = r.plan.operations[1] as JsonMergeOp;
        expect(merge.jsonPath).toBe('hooks.preToolUse');
        const entries = merge.value as { command: string; matcher?: string }[];
        expect(entries[0]).toMatchObject({ matcher: 'shell' });
      }
    );

    it('cursor/hook/workspace: unknown lifecycle falls back to default', () => {
      const c = ARTIFACT_CREATORS.find((x) => x.id === 'cursor/hook/workspace')!;
      const r = c.planWithProvidedInput(ctx(), {
        userInput: HOOK_NAME,
        hookLifecycleEvent: 'notReal',
      });
      expect(r.kind).toBe('plan');
      if (r.kind !== 'plan') return;
      expect((r.plan.operations[1] as JsonMergeOp).jsonPath).toBe(`hooks.${DEFAULT_CURSOR_HOOK_EVENT}`);
    });
  });

  describe('MCP creators (registry)', () => {
    it.each(
      [
        ['claude/mcp/workspace', path.join(WORKSPACE_ROOT, '.mcp.json'), 'ws-srv'],
        ['claude/mcp/user', path.join(ROOTS.claudeUserRoot, '.mcp.json'), 'user-srv'],
        ['cursor/mcp/workspace', path.join(WORKSPACE_ROOT, '.cursor', 'mcp.json'), 'c-ws'],
        ['cursor/mcp/user', path.join(ROOTS.cursorUserRoot, 'mcp.json'), 'c-user'],
      ] as const
    )('%s: jsonMerge targets path and mcpServers[%s]', (id, expectedPath, serverKey) => {
      const c = ARTIFACT_CREATORS.find((x) => x.id === id)!;
      const r = c.planWithProvidedInput(ctx(), { userInput: serverKey });
      expect(r.kind).toBe('plan');
      if (r.kind !== 'plan') return;
      const op = r.plan.operations[0] as JsonMergeOp;
      expect(op.type).toBe('jsonMerge');
      expect(op.jsonPath).toBe('mcpServers');
      expect(op.absolutePath).toBe(expectedPath);
      const payload = op.value as Record<string, { command: string; args: string[] }>;
      expect(payload[serverKey]).toEqual({
        command: 'npx',
        args: ['-y', serverKey],
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Layer 2: run() with mocked vscode.window (same module as vitest alias)
// ---------------------------------------------------------------------------

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SimpleFileCreator.run()', () => {
  const simple = new SimpleFileCreator({
    id: 'test/simple/run',
    label: 'Test',
    presetId: 'claude',
    category: SourceCategoryId.Skill,
    scope: 'workspace',
    targetDir: (ws) => (ws ? path.join(ws, '.claude', 'skills') : ''),
    suggestedExtension: '.md',
    initialContent: '# x\n',
  });

  it('returns same plan as planWithProvidedInput when user provides a name', async () => {
    vi.spyOn(vscode.window, 'showInputBox').mockResolvedValue('my-run-skill');
    const fromRun = await simple.run(ctx());
    const fromPlan = simple.planWithProvidedInput(ctx(), { userInput: 'my-run-skill' });
    expect(fromRun.kind).toBe('plan');
    expect(fromPlan.kind).toBe('plan');
    if (fromRun.kind === 'plan' && fromPlan.kind === 'plan') {
      expect(fromRun.plan).toEqual(fromPlan.plan);
    }
  });

  it('returns cancelled when user dismisses input box', async () => {
    vi.spyOn(vscode.window, 'showInputBox').mockResolvedValue(undefined);
    const r = await simple.run(ctx());
    expect(r.kind).toBe('cancelled');
  });
});

describe('FolderFileCreator.run()', () => {
  const folder = new FolderFileCreator({
    id: 'test/folder/run',
    label: 'Test',
    presetId: 'antigravity',
    category: SourceCategoryId.Skill,
    scope: 'workspace',
    targetDir: (ws) => (ws ? path.join(ws, '.agent', 'skills') : ''),
    fixedFileName: 'SKILL.md',
    initialContent: (n) => `# ${n}\n`,
  });

  it('returns same plan as planWithProvidedInput when user provides folder name', async () => {
    vi.spyOn(vscode.window, 'showInputBox').mockResolvedValue('skill-folder');
    const fromRun = await folder.run(ctx());
    const fromPlan = folder.planWithProvidedInput(ctx(), { userInput: 'skill-folder' });
    expect(fromRun.kind).toBe('plan');
    expect(fromPlan.kind).toBe('plan');
    if (fromRun.kind === 'plan' && fromPlan.kind === 'plan') {
      expect(fromRun.plan).toEqual(fromPlan.plan);
    }
  });

  it('returns cancelled when user dismisses input box', async () => {
    vi.spyOn(vscode.window, 'showInputBox').mockResolvedValue(undefined);
    const r = await folder.run(ctx());
    expect(r.kind).toBe('cancelled');
  });
});

describe('FixedDocCreator.run()', () => {
  it('requireNonEmptyTitle: returns plan matching planWithProvidedInput', async () => {
    const fixed = new FixedDocCreator({
      id: 'test/fixed/run',
      label: 'Test',
      presetId: 'claude',
      category: SourceCategoryId.LlmGuideline,
      scope: 'workspace',
      requireNonEmptyTitle: true,
      absolutePath: (c) => (c.workspaceRoot ? path.join(c.workspaceRoot, 'DOC.md') : ''),
      contentForTitle: (t) => `# ${t}\n`,
    });
    vi.spyOn(vscode.window, 'showInputBox').mockResolvedValue('  Title  ');
    const fromRun = await fixed.run(ctx());
    const fromPlan = fixed.planWithProvidedInput(ctx(), { userInput: 'Title' });
    expect(fromRun.kind).toBe('plan');
    expect(fromPlan.kind).toBe('plan');
    if (fromRun.kind === 'plan' && fromPlan.kind === 'plan') {
      expect(fromRun.plan).toEqual(fromPlan.plan);
    }
  });

  it('requireNonEmptyTitle: cancelled when input dismissed', async () => {
    const fixed = new FixedDocCreator({
      id: 'test/fixed/run2',
      label: 'Test',
      presetId: 'claude',
      category: SourceCategoryId.LlmGuideline,
      scope: 'workspace',
      requireNonEmptyTitle: true,
      absolutePath: (c) => (c.workspaceRoot ? path.join(c.workspaceRoot, 'DOC.md') : ''),
      contentForTitle: (t) => `# ${t}\n`,
    });
    vi.spyOn(vscode.window, 'showInputBox').mockResolvedValue(undefined);
    const r = await fixed.run(ctx());
    expect(r.kind).toBe('cancelled');
  });

  it('requireNonEmptyTitle false: empty title uses defaultTitleIfEmpty', async () => {
    const fixed = new FixedDocCreator({
      id: 'test/fixed/run3',
      label: 'Test',
      presetId: 'antigravity',
      category: SourceCategoryId.LlmGuideline,
      scope: 'user',
      requireNonEmptyTitle: false,
      defaultTitleIfEmpty: 'DEFAULT',
      absolutePath: () => path.join(ROOTS.geminiUserRoot, 'X.md'),
      contentForTitle: (t) => `# ${t}\n`,
    });
    vi.spyOn(vscode.window, 'showInputBox').mockResolvedValue('   ');
    const fromRun = await fixed.run(ctx());
    const fromPlan = fixed.planWithProvidedInput(ctx(), { userInput: '' });
    expect(fromRun.kind).toBe('plan');
    expect(fromPlan.kind).toBe('plan');
    if (fromRun.kind === 'plan' && fromPlan.kind === 'plan') {
      expect(fromRun.plan).toEqual(fromPlan.plan);
      expect((fromRun.plan.operations[0] as WriteFileOp).content).toBe('# DEFAULT\n');
    }
  });

  it('requireNonEmptyTitle: returns error when input is empty string (not undefined)', async () => {
    const fixed = new FixedDocCreator({
      id: 'test/fixed/run4',
      label: 'Test',
      presetId: 'claude',
      category: SourceCategoryId.LlmGuideline,
      scope: 'workspace',
      requireNonEmptyTitle: true,
      absolutePath: (c) => (c.workspaceRoot ? path.join(c.workspaceRoot, 'DOC.md') : ''),
      contentForTitle: (t) => `# ${t}\n`,
    });
    vi.spyOn(vscode.window, 'showInputBox').mockResolvedValue('');
    const r = await fixed.run(ctx());
    expect(r.kind).toBe('error');
    if (r.kind === 'error') {
      expect(r.error).toBe('Enter a title.');
    }
  });
});

describe('ClaudeRegisteredHookCreator.run()', () => {
  const hook = new ClaudeRegisteredHookCreator({
    id: 'test/claude-hook/run',
    label: 'Test',
    scope: 'workspace',
    hooksDir: (c) => (c.workspaceRoot ? path.join(c.workspaceRoot, '.claude', 'hooks') : ''),
    settingsPath: (c) => path.join(c.workspaceRoot, '.claude', 'settings.json'),
  });

  it('returns plan matching planWithProvidedInput after quick pick + two input boxes', async () => {
    vi.spyOn(vscode.window, 'showQuickPick').mockResolvedValue({
      label: 'PreToolUse',
      event: 'PreToolUse',
    } as never);
    vi.spyOn(vscode.window, 'showInputBox')
      .mockResolvedValueOnce('Write')
      .mockResolvedValueOnce('hook-run');
    const fromRun = await hook.run(ctx());
    const fromPlan = hook.planWithProvidedInput(ctx(), {
      userInput: 'hook-run',
      hookLifecycleEvent: 'PreToolUse',
      hookMatcher: 'Write',
    });
    expect(fromRun.kind).toBe('plan');
    expect(fromPlan.kind).toBe('plan');
    if (fromRun.kind === 'plan' && fromPlan.kind === 'plan') {
      expect(fromRun.plan).toEqual(fromPlan.plan);
    }
  });

  it('cancelled when quick pick dismissed', async () => {
    vi.spyOn(vscode.window, 'showQuickPick').mockResolvedValue(undefined);
    const r = await hook.run(ctx());
    expect(r.kind).toBe('cancelled');
  });

  it('cancelled when matcher input dismissed', async () => {
    vi.spyOn(vscode.window, 'showQuickPick').mockResolvedValue({
      label: 'PostToolUse',
      event: 'PostToolUse',
    } as never);
    vi.spyOn(vscode.window, 'showInputBox').mockResolvedValueOnce(undefined);
    const r = await hook.run(ctx());
    expect(r.kind).toBe('cancelled');
  });
});

describe('CursorRegisteredHookCreator.run()', () => {
  const hook = new CursorRegisteredHookCreator({
    id: 'test/cursor-hook/run',
    label: 'Test',
    scope: 'workspace',
    hooksDir: (c) => (c.workspaceRoot ? path.join(c.workspaceRoot, '.cursor', 'hooks') : ''),
    hooksJsonPath: (c) =>
      c.workspaceRoot ? path.join(c.workspaceRoot, '.cursor', 'hooks.json') : '',
    commandInHooksJson: (base) => `.cursor/hooks/${base}.sh`,
  });

  it('returns plan with ensureTopLevelVersionIfMissing on json merge', async () => {
    vi.spyOn(vscode.window, 'showQuickPick').mockResolvedValue({
      label: 'preToolUse',
      event: 'preToolUse',
    } as never);
    vi.spyOn(vscode.window, 'showInputBox')
      .mockResolvedValueOnce('Edit')
      .mockResolvedValueOnce('c-hook');
    const fromRun = await hook.run(ctx());
    expect(fromRun.kind).toBe('plan');
    if (fromRun.kind !== 'plan') return;
    const merge = fromRun.plan.operations[1] as JsonMergeOp;
    expect(merge.type).toBe('jsonMerge');
    expect(merge.ensureTopLevelVersionIfMissing).toBe(1);
    const fromPlan = hook.planWithProvidedInput(ctx(), {
      userInput: 'c-hook',
      hookLifecycleEvent: 'preToolUse',
      hookMatcher: 'Edit',
    });
    expect(fromPlan.kind).toBe('plan');
    if (fromPlan.kind === 'plan') {
      expect(fromRun.plan).toEqual(fromPlan.plan);
    }
  });

  it('cancelled when quick pick dismissed', async () => {
    vi.spyOn(vscode.window, 'showQuickPick').mockResolvedValue(undefined);
    const r = await hook.run(ctx());
    expect(r.kind).toBe('cancelled');
  });

  it('cancelled when matcher input dismissed', async () => {
    vi.spyOn(vscode.window, 'showQuickPick').mockResolvedValue({
      label: 'preToolUse',
      event: 'preToolUse',
    } as never);
    vi.spyOn(vscode.window, 'showInputBox').mockResolvedValueOnce(undefined);
    const r = await hook.run(ctx());
    expect(r.kind).toBe('cancelled');
  });

  it('cancelled when hook name input dismissed', async () => {
    vi.spyOn(vscode.window, 'showQuickPick').mockResolvedValue({
      label: 'preToolUse',
      event: 'preToolUse',
    } as never);
    vi.spyOn(vscode.window, 'showInputBox')
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce(undefined);
    const r = await hook.run(ctx());
    expect(r.kind).toBe('cancelled');
  });
});

describe('ClaudeMcpCreator.run() and CursorMcpCreator.run()', () => {
  it('ClaudeMcpCreator: run matches planWithProvidedInput', async () => {
    const mcp = new ClaudeMcpCreator({
      id: 'test/claude-mcp/run',
      label: 'Test',
      scope: 'workspace',
      mcpPath: (c) => (c.workspaceRoot ? path.join(c.workspaceRoot, '.mcp.json') : ''),
    });
    vi.spyOn(vscode.window, 'showInputBox').mockResolvedValue('srv');
    const fromRun = await mcp.run(ctx());
    const fromPlan = mcp.planWithProvidedInput(ctx(), { userInput: 'srv' });
    expect(fromRun.kind).toBe('plan');
    expect(fromPlan.kind).toBe('plan');
    if (fromRun.kind === 'plan' && fromPlan.kind === 'plan') {
      expect(fromRun.plan).toEqual(fromPlan.plan);
    }
  });

  it('CursorMcpCreator: run matches planWithProvidedInput', async () => {
    const mcp = new CursorMcpCreator({
      id: 'test/cursor-mcp/run',
      label: 'Test',
      scope: 'workspace',
      mcpPath: (c) => (c.workspaceRoot ? path.join(c.workspaceRoot, '.cursor', 'mcp.json') : ''),
    });
    vi.spyOn(vscode.window, 'showInputBox').mockResolvedValue('srv2');
    const fromRun = await mcp.run(ctx());
    const fromPlan = mcp.planWithProvidedInput(ctx(), { userInput: 'srv2' });
    expect(fromRun.kind).toBe('plan');
    expect(fromPlan.kind).toBe('plan');
    if (fromRun.kind === 'plan' && fromPlan.kind === 'plan') {
      expect(fromRun.plan).toEqual(fromPlan.plan);
    }
  });

  it('ClaudeMcpCreator: cancelled when user dismisses input box', async () => {
    const mcp = new ClaudeMcpCreator({
      id: 'test/claude-mcp/cancel',
      label: 'Test',
      scope: 'workspace',
      mcpPath: (c) => (c.workspaceRoot ? path.join(c.workspaceRoot, '.mcp.json') : ''),
    });
    vi.spyOn(vscode.window, 'showInputBox').mockResolvedValue(undefined);
    const r = await mcp.run(ctx());
    expect(r.kind).toBe('cancelled');
  });

  it('CursorMcpCreator: cancelled when user dismisses input box', async () => {
    const mcp = new CursorMcpCreator({
      id: 'test/cursor-mcp/cancel',
      label: 'Test',
      scope: 'workspace',
      mcpPath: (c) => (c.workspaceRoot ? path.join(c.workspaceRoot, '.cursor', 'mcp.json') : ''),
    });
    vi.spyOn(vscode.window, 'showInputBox').mockResolvedValue(undefined);
    const r = await mcp.run(ctx());
    expect(r.kind).toBe('cancelled');
  });
});

describe('CodexConfigTomlCreator.run()', () => {
  const tom = new CodexConfigTomlCreator({
    id: 'test/codex-toml/run',
    label: 'Test',
    scope: 'workspace',
    absolutePath: (c) => (c.workspaceRoot ? path.join(c.workspaceRoot, '.codex', 'config.toml') : ''),
  });

  it('returns plan when user confirms Create', async () => {
    vi.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue('Create' as never);
    const fromRun = await tom.run(ctx());
    const fromPlan = tom.planWithProvidedInput(ctx(), { userInput: '' });
    expect(fromRun.kind).toBe('plan');
    expect(fromPlan.kind).toBe('plan');
    if (fromRun.kind === 'plan' && fromPlan.kind === 'plan') {
      expect(fromRun.plan).toEqual(fromPlan.plan);
    }
  });

  it('returns cancelled when user dismisses confirmation', async () => {
    vi.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(undefined);
    const r = await tom.run(ctx());
    expect(r.kind).toBe('cancelled');
  });
});
