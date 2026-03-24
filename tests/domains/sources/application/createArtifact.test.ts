import { describe, expect, it } from 'vitest';
import type { CreatorContext } from '@src/domains/sources/domain/artifactCreator';
import type { WriteFileOp, JsonMergeOp } from '@src/domains/sources/domain/artifactOperation';
import { SimpleFileCreator } from '@src/domains/sources/domain/creators/SimpleFileCreator';
import { FolderFileCreator } from '@src/domains/sources/domain/creators/FolderFileCreator';

const ROOTS = {
  claudeUserRoot: '/home/user/.claude',
  cursorUserRoot: '/home/user/.cursor',
  geminiUserRoot: '/home/user/.config/gemini',
  codexUserRoot: '/home/user/.codex',
};

function ctx(overrides: Partial<CreatorContext> = {}): CreatorContext {
  return {
    workspaceRoot: '/ws',
    roots: ROOTS,
    ...overrides,
  };
}

describe('SimpleFileCreator planWithProvidedInput()', () => {
  const creator = new SimpleFileCreator({
    id: 'test/skill/workspace',
    label: 'New Skill',
    presetId: 'claude',
    category: 'skill',
    locality: 'workspace',
    targetDir: (ws) => (ws ? `${ws}/.claude/skills` : ''),
    suggestedExtension: '.md',
    initialContent: '# skill\n\n',
  });

  it('appends extension when missing', () => {
    const r = creator.planWithProvidedInput(ctx(), { userInput: 'my-skill' });
    expect(r.kind).toBe('plan');
    if (r.kind !== 'plan') return;
    const op = r.plan.operations[0] as WriteFileOp;
    expect(op.type).toBe('writeFile');
    expect(op.absolutePath).toBe('/ws/.claude/skills/my-skill.md');
  });

  it('does not double-append extension', () => {
    const r = creator.planWithProvidedInput(ctx(), { userInput: 'my-skill.md' });
    expect(r.kind).toBe('plan');
    if (r.kind !== 'plan') return;
    const op = r.plan.operations[0] as WriteFileOp;
    expect(op.absolutePath).toBe('/ws/.claude/skills/my-skill.md');
  });

  it('writes verbatim string content', () => {
    const r = creator.planWithProvidedInput(ctx(), { userInput: 'my-skill' });
    expect(r.kind).toBe('plan');
    if (r.kind !== 'plan') return;
    const op = r.plan.operations[0] as WriteFileOp;
    expect(op.content).toBe('# skill\n\n');
  });

  it('calls content factory with the final file name', () => {
    const tpl = new SimpleFileCreator({
      id: 'test/skill/workspace',
      label: 'New Skill',
      presetId: 'claude',
      category: 'skill',
      locality: 'workspace',
      targetDir: (ws) => `${ws}/.claude/skills`,
      suggestedExtension: '.md',
      initialContent: (name) => `# ${name}\n`,
    });
    const r = tpl.planWithProvidedInput(ctx(), { userInput: 'cool-skill' });
    expect(r.kind).toBe('plan');
    if (r.kind !== 'plan') return;
    expect((r.plan.operations[0] as WriteFileOp).content).toBe('# cool-skill.md\n');
  });

  it('returns error when targetDir is empty', () => {
    const r = creator.planWithProvidedInput(ctx({ workspaceRoot: '' }), { userInput: 'x' });
    expect(r.kind).toBe('error');
  });

  it('returns error when userInput is blank', () => {
    const r = creator.planWithProvidedInput(ctx(), { userInput: '   ' });
    expect(r.kind).toBe('error');
  });
});

describe('FolderFileCreator planWithProvidedInput()', () => {
  const creator = new FolderFileCreator({
    id: 'test/skill/workspace',
    label: 'New Skill',
    presetId: 'antigravity',
    category: 'skill',
    locality: 'workspace',
    targetDir: (ws) => (ws ? `${ws}/.agent/skills` : ''),
    fixedFileName: 'SKILL.md',
    initialContent: (folderName) => `# ${folderName}\n`,
  });

  it('creates <dir>/<folderName>/<fixedFileName> path', () => {
    const r = creator.planWithProvidedInput(ctx(), { userInput: 'my-skill' });
    expect(r.kind).toBe('plan');
    if (r.kind !== 'plan') return;
    const op = r.plan.operations[0] as WriteFileOp;
    expect(op.absolutePath).toBe('/ws/.agent/skills/my-skill/SKILL.md');
  });

  it('passes folder name (not file name) to content factory', () => {
    const r = creator.planWithProvidedInput(ctx(), { userInput: 'cool' });
    expect(r.kind).toBe('plan');
    if (r.kind !== 'plan') return;
    expect((r.plan.operations[0] as WriteFileOp).content).toBe('# cool\n');
  });
});

describe('Claude registered hook creator planWithProvidedInput()', () => {
  it('produces writeFile + jsonMerge with Claude Code hooks shape', async () => {
    const { claudeArtifactCreators, DEFAULT_CLAUDE_HOOK_EVENT } =
      await import('@src/domains/sources/presets/claude/creators');
    const hookConfig = claudeArtifactCreators.find((c) => c.id === 'claude/hook-config/workspace')!;
    expect(hookConfig).toBeDefined();

    const r = hookConfig.planWithProvidedInput(ctx(), { userInput: 'lint-on-save' });
    expect(r.kind).toBe('plan');
    if (r.kind !== 'plan') return;

    expect(r.plan.operations).toHaveLength(2);
    const [writeOp, mergeOp] = r.plan.operations;
    expect(writeOp.type).toBe('writeFile');
    expect((writeOp as WriteFileOp).absolutePath).toContain('lint-on-save.sh');
    expect(mergeOp.type).toBe('jsonMerge');
    expect((mergeOp as JsonMergeOp).jsonPath).toBe(`hooks.${DEFAULT_CLAUDE_HOOK_EVENT}`);
    const mergeVal = (mergeOp as JsonMergeOp).value as unknown[];
    expect(Array.isArray(mergeVal)).toBe(true);
    expect(mergeVal[0]).toMatchObject({
      matcher: '',
      hooks: [{ type: 'command', command: (writeOp as WriteFileOp).absolutePath }],
    });
    expect(r.plan.openAfterCreate).toContain('lint-on-save.sh');
  });

  it('respects hookLifecycleEvent and hookMatcher', async () => {
    const { claudeArtifactCreators } = await import('@src/domains/sources/presets/claude/creators');
    const hookConfig = claudeArtifactCreators.find((c) => c.id === 'claude/hook-config/workspace')!;
    const r = hookConfig.planWithProvidedInput(ctx(), {
      userInput: 'x',
      hookLifecycleEvent: 'PreToolUse',
      hookMatcher: 'Write',
    });
    expect(r.kind).toBe('plan');
    if (r.kind !== 'plan') return;
    const mergeOp = r.plan.operations[1] as JsonMergeOp;
    expect(mergeOp.jsonPath).toBe('hooks.PreToolUse');
    const block = (mergeOp.value as { matcher: string }[])[0];
    expect(block.matcher).toBe('Write');
  });
});

describe('Cursor registered hook creator planWithProvidedInput()', () => {
  it('merges hooks.postToolUse with project-relative command', async () => {
    const { cursorArtifactCreators, DEFAULT_CURSOR_HOOK_EVENT } =
      await import('@src/domains/sources/presets/cursor/creators');
    const c = cursorArtifactCreators.find((x) => x.id === 'cursor/hook/workspace')!;
    expect(c).toBeDefined();
    const r = c.planWithProvidedInput(ctx(), { userInput: 'format' });
    expect(r.kind).toBe('plan');
    if (r.kind !== 'plan') return;
    expect(r.plan.operations).toHaveLength(2);
    const merge = r.plan.operations[1] as JsonMergeOp;
    expect(merge.jsonPath).toBe(`hooks.${DEFAULT_CURSOR_HOOK_EVENT}`);
    expect(merge.ensureTopLevelVersionIfMissing).toBe(1);
    const entries = merge.value as { command: string }[];
    expect(entries[0].command).toBe('.cursor/hooks/format.sh');
  });
});

describe('Codex preset artifact plans', () => {
  it('AGENTS.md workspace targets .codex', async () => {
    const { codexArtifactCreators } = await import('@src/domains/sources/presets/codex/creators');
    const c = codexArtifactCreators.find((x) => x.id === 'codex/agents-md/workspace')!;
    const r = c.planWithProvidedInput(ctx(), { userInput: 'AGENTS' });
    expect(r.kind).toBe('plan');
    if (r.kind !== 'plan') return;
    expect((r.plan.operations[0] as WriteFileOp).absolutePath).toBe('/ws/.codex/AGENTS.md');
  });

  it('config.toml workspace targets .codex', async () => {
    const { codexArtifactCreators } = await import('@src/domains/sources/presets/codex/creators');
    const c = codexArtifactCreators.find((x) => x.id === 'codex/config-toml/workspace')!;
    const r = c.planWithProvidedInput(ctx(), { userInput: 'ignored' });
    expect(r.kind).toBe('plan');
    if (r.kind !== 'plan') return;
    expect((r.plan.operations[0] as WriteFileOp).absolutePath).toBe('/ws/.codex/config.toml');
  });
});

describe('fixed-path guideline creators', () => {
  it('claude CLAUDE.md workspace', async () => {
    const { claudeArtifactCreators } = await import('@src/domains/sources/presets/claude/creators');
    const c = claudeArtifactCreators.find((x) => x.id === 'claude/claude-md/workspace')!;
    const r = c.planWithProvidedInput(ctx(), { userInput: 'My App' });
    expect(r.kind).toBe('plan');
    if (r.kind !== 'plan') return;
    const op = r.plan.operations[0] as WriteFileOp;
    expect(op.absolutePath).toBe('/ws/CLAUDE.md');
    expect(op.content).toContain('# My App');
  });

  it('cursor AGENTS.md workspace', async () => {
    const { cursorArtifactCreators } = await import('@src/domains/sources/presets/cursor/creators');
    const c = cursorArtifactCreators.find((x) => x.id === 'cursor/agents-md-fixed/workspace')!;
    const r = c.planWithProvidedInput(ctx(), { userInput: 'Agents' });
    expect(r.kind).toBe('plan');
    if (r.kind !== 'plan') return;
    expect((r.plan.operations[0] as WriteFileOp).absolutePath).toBe('/ws/AGENTS.md');
  });

  it('antigravity GEMINI.md workspace', async () => {
    const { antigravityArtifactCreators } =
      await import('@src/domains/sources/presets/antigravity/creators');
    const c = antigravityArtifactCreators.find((x) => x.id === 'antigravity/gemini/workspace')!;
    const r = c.planWithProvidedInput(ctx(), { userInput: 'Doc' });
    expect(r.kind).toBe('plan');
    if (r.kind !== 'plan') return;
    expect((r.plan.operations[0] as WriteFileOp).absolutePath).toBe('/ws/GEMINI.md');
  });
});

describe('Antigravity user GEMINI creator', () => {
  it('writes fixed GEMINI.md path under gemini user root', async () => {
    const { antigravityArtifactCreators } =
      await import('@src/domains/sources/presets/antigravity/creators');
    const c = antigravityArtifactCreators.find((x) => x.id === 'antigravity/gemini/user')!;
    const r = c.planWithProvidedInput(ctx(), { userInput: 'My Project' });
    expect(r.kind).toBe('plan');
    if (r.kind !== 'plan') return;
    const op = r.plan.operations[0] as WriteFileOp;
    expect(op.absolutePath).toBe('/home/user/.config/gemini/GEMINI.md');
    expect(op.content).toContain('# My Project');
  });

  it('falls back to defaultTitleIfEmpty when userInput is empty', async () => {
    const { antigravityArtifactCreators } =
      await import('@src/domains/sources/presets/antigravity/creators');
    const c = antigravityArtifactCreators.find((x) => x.id === 'antigravity/gemini/user')!;
    const r = c.planWithProvidedInput(ctx(), { userInput: '  ' });
    expect(r.kind).toBe('plan');
    if (r.kind !== 'plan') return;
    const op = r.plan.operations[0] as WriteFileOp;
    expect(op.content).toBe('# GEMINI\n\n');
  });
});

describe('Claude MCP creator planWithProvidedInput()', () => {
  it('produces jsonMerge operation', async () => {
    const { claudeArtifactCreators } = await import('@src/domains/sources/presets/claude/creators');
    const mcp = claudeArtifactCreators.find((c) => c.id === 'claude/mcp/workspace')!;
    expect(mcp).toBeDefined();

    const r = mcp.planWithProvidedInput(ctx(), { userInput: 'my-server' });
    expect(r.kind).toBe('plan');
    if (r.kind !== 'plan') return;

    expect(r.plan.operations).toHaveLength(1);
    const op = r.plan.operations[0] as JsonMergeOp;
    expect(op.type).toBe('jsonMerge');
    expect(op.jsonPath).toBe('mcpServers');
    expect(op.absolutePath).toBe('/ws/.mcp.json');
    expect((op.value as Record<string, unknown>)['my-server']).toBeDefined();
  });
});

describe('Cursor MCP creator planWithProvidedInput()', () => {
  it('produces jsonMerge for .cursor/mcp.json', async () => {
    const { cursorArtifactCreators } = await import('@src/domains/sources/presets/cursor/creators');
    const mcp = cursorArtifactCreators.find((c) => c.id === 'cursor/mcp/workspace')!;
    expect(mcp).toBeDefined();

    const r = mcp.planWithProvidedInput(ctx(), { userInput: 'test-server' });
    expect(r.kind).toBe('plan');
    if (r.kind !== 'plan') return;

    expect(r.plan.operations).toHaveLength(1);
    const op = r.plan.operations[0] as JsonMergeOp;
    expect(op.type).toBe('jsonMerge');
    expect(op.jsonPath).toBe('mcpServers');
    expect(op.absolutePath).toBe('/ws/.cursor/mcp.json');
    expect((op.value as Record<string, unknown>)['test-server']).toBeDefined();
  });
});

describe('Codex config.toml creator content', () => {
  it('writes stub toml content', async () => {
    const { codexArtifactCreators } = await import('@src/domains/sources/presets/codex/creators');
    const c = codexArtifactCreators.find((x) => x.id === 'codex/config-toml/workspace')!;
    const r = c.planWithProvidedInput(ctx(), { userInput: '' });
    expect(r.kind).toBe('plan');
    if (r.kind !== 'plan') return;
    const op = r.plan.operations[0] as WriteFileOp;
    expect(op.content).toContain('# Codex CLI configuration');
    expect(op.content).toContain('https://github.com/openai/codex');
  });
});
