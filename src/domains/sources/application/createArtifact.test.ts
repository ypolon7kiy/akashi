import { describe, expect, it } from 'vitest';
import type { ArtifactPlannerContext } from '../domain/artifactTemplate';
import type { WriteFileOp, JsonMergeOp } from '../domain/artifactOperation';
import { simpleFileTemplate, folderFileTemplate } from '../domain/artifactTemplateHelpers';

const ROOTS = {
  claudeUserRoot: '/home/user/.claude',
  cursorUserRoot: '/home/user/.cursor',
  geminiUserRoot: '/home/user/.config/gemini',
  codexUserRoot: '/home/user/.codex',
};

function ctx(overrides: Partial<ArtifactPlannerContext> = {}): ArtifactPlannerContext {
  return {
    userInput: 'my-skill',
    workspaceRoot: '/ws',
    roots: ROOTS,
    ...overrides,
  };
}

describe('simpleFileTemplate plan()', () => {
  const template = simpleFileTemplate({
    id: 'test/skill/workspace',
    label: 'New Skill',
    presetId: 'claude',
    category: 'skill',
    scope: 'workspace',
    targetDir: (ws) => (ws ? `${ws}/.claude/skills` : ''),
    suggestedExtension: '.md',
    initialContent: '# skill\n\n',
  });

  it('appends extension when missing', () => {
    const r = template.plan(ctx());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const op = r.plan.operations[0] as WriteFileOp;
    expect(op.type).toBe('writeFile');
    expect(op.absolutePath).toBe('/ws/.claude/skills/my-skill.md');
  });

  it('does not double-append extension', () => {
    const r = template.plan(ctx({ userInput: 'my-skill.md' }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const op = r.plan.operations[0] as WriteFileOp;
    expect(op.absolutePath).toBe('/ws/.claude/skills/my-skill.md');
  });

  it('writes verbatim string content', () => {
    const r = template.plan(ctx());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const op = r.plan.operations[0] as WriteFileOp;
    expect(op.content).toBe('# skill\n\n');
  });

  it('calls content factory with the final file name', () => {
    const tpl = simpleFileTemplate({
      id: 'test/skill/workspace',
      label: 'New Skill',
      presetId: 'claude',
      category: 'skill',
      scope: 'workspace',
      targetDir: (ws) => `${ws}/.claude/skills`,
      suggestedExtension: '.md',
      initialContent: (name) => `# ${name}\n`,
    });
    const r = tpl.plan(ctx({ userInput: 'cool-skill' }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect((r.plan.operations[0] as WriteFileOp).content).toBe('# cool-skill.md\n');
  });

  it('returns error when targetDir is empty', () => {
    const r = template.plan(ctx({ workspaceRoot: '' }));
    expect(r.ok).toBe(false);
  });

  it('returns error when userInput is blank', () => {
    const r = template.plan(ctx({ userInput: '   ' }));
    expect(r.ok).toBe(false);
  });
});

describe('folderFileTemplate plan()', () => {
  const template = folderFileTemplate({
    id: 'test/skill/workspace',
    label: 'New Skill',
    presetId: 'antigravity',
    category: 'skill',
    scope: 'workspace',
    targetDir: (ws) => (ws ? `${ws}/.agent/skills` : ''),
    fixedFileName: 'SKILL.md',
    initialContent: (folderName) => `# ${folderName}\n`,
  });

  it('creates <dir>/<folderName>/<fixedFileName> path', () => {
    const r = template.plan(ctx());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const op = r.plan.operations[0] as WriteFileOp;
    expect(op.absolutePath).toBe('/ws/.agent/skills/my-skill/SKILL.md');
  });

  it('passes folder name (not file name) to content factory', () => {
    const r = template.plan(ctx({ userInput: 'cool' }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect((r.plan.operations[0] as WriteFileOp).content).toBe('# cool\n');
  });
});

describe('hook-config template plan()', () => {
  it('produces writeFile + jsonMerge with Claude Code hooks shape', async () => {
    const { claudeArtifactTemplates, DEFAULT_CLAUDE_HOOK_EVENT } = await import(
      '../presets/claude/artifactTemplates'
    );
    const hookConfig = claudeArtifactTemplates.find(
      (t) => t.id === 'claude/hook-config/workspace'
    )!;
    expect(hookConfig).toBeDefined();

    const r = hookConfig.plan(ctx({ userInput: 'lint-on-save' }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.plan.operations).toHaveLength(2);
    const [writeOp, mergeOp] = r.plan.operations;
    expect(writeOp!.type).toBe('writeFile');
    expect((writeOp as WriteFileOp).absolutePath).toContain('lint-on-save.sh');
    expect(mergeOp!.type).toBe('jsonMerge');
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
    const { claudeArtifactTemplates } = await import('../presets/claude/artifactTemplates');
    const hookConfig = claudeArtifactTemplates.find(
      (t) => t.id === 'claude/hook-config/workspace'
    )!;
    const r = hookConfig.plan(
      ctx({
        userInput: 'x',
        hookLifecycleEvent: 'PreToolUse',
        hookMatcher: 'Write',
      })
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const mergeOp = r.plan.operations[1] as JsonMergeOp;
    expect(mergeOp.jsonPath).toBe('hooks.PreToolUse');
    const block = (mergeOp.value as { matcher: string }[])[0]!;
    expect(block.matcher).toBe('Write');
  });
});

describe('Cursor registered hook template plan()', () => {
  it('merges hooks.postToolUse with project-relative command', async () => {
    const { cursorArtifactTemplates, DEFAULT_CURSOR_HOOK_EVENT } = await import(
      '../presets/cursor/artifactTemplates'
    );
    const tpl = cursorArtifactTemplates.find((t) => t.id === 'cursor/hook/workspace')!;
    expect(tpl).toBeDefined();
    const r = tpl.plan(ctx({ userInput: 'format' }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.operations).toHaveLength(2);
    const merge = r.plan.operations[1] as JsonMergeOp;
    expect(merge.jsonPath).toBe(`hooks.${DEFAULT_CURSOR_HOOK_EVENT}`);
    expect(merge.ensureTopLevelVersionIfMissing).toBe(1);
    const entries = merge.value as { command: string }[];
    expect(entries[0]!.command).toBe('.cursor/hooks/format.sh');
  });
});

describe('Codex preset artifact plans', () => {
  it('AGENTS.md workspace targets .codex', async () => {
    const { codexArtifactTemplates } = await import('../presets/codex/artifactTemplates');
    const tpl = codexArtifactTemplates.find((t) => t.id === 'codex/agents-md/workspace')!;
    const r = tpl.plan(ctx({ userInput: 'AGENTS' }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect((r.plan.operations[0] as WriteFileOp).absolutePath).toBe('/ws/.codex/AGENTS.md');
  });

  it('config.toml workspace targets .codex', async () => {
    const { codexArtifactTemplates } = await import('../presets/codex/artifactTemplates');
    const tpl = codexArtifactTemplates.find((t) => t.id === 'codex/config-toml/workspace')!;
    const r = tpl.plan(ctx({ userInput: 'ignored' }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect((r.plan.operations[0] as WriteFileOp).absolutePath).toBe('/ws/.codex/config.toml');
  });
});

describe('fixed-path guideline templates', () => {
  it('claude CLAUDE.md workspace', async () => {
    const { claudeArtifactTemplates } = await import('../presets/claude/artifactTemplates');
    const tpl = claudeArtifactTemplates.find((t) => t.id === 'claude/claude-md/workspace')!;
    const r = tpl.plan(ctx({ userInput: 'My App' }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const op = r.plan.operations[0] as WriteFileOp;
    expect(op.absolutePath).toBe('/ws/CLAUDE.md');
    expect(op.content).toContain('# My App');
  });

  it('cursor AGENTS.md workspace', async () => {
    const { cursorArtifactTemplates } = await import('../presets/cursor/artifactTemplates');
    const tpl = cursorArtifactTemplates.find((t) => t.id === 'cursor/agents-md-fixed/workspace')!;
    const r = tpl.plan(ctx({ userInput: 'Agents' }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect((r.plan.operations[0] as WriteFileOp).absolutePath).toBe('/ws/AGENTS.md');
  });

  it('antigravity GEMINI.md workspace', async () => {
    const { antigravityArtifactTemplates } = await import(
      '../presets/antigravity/artifactTemplates'
    );
    const tpl = antigravityArtifactTemplates.find((t) => t.id === 'antigravity/gemini/workspace')!;
    const r = tpl.plan(ctx({ userInput: 'Doc' }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect((r.plan.operations[0] as WriteFileOp).absolutePath).toBe('/ws/GEMINI.md');
  });
});

describe('Antigravity user GEMINI template', () => {
  it('writes fixed GEMINI.md path under gemini user root', async () => {
    const { antigravityArtifactTemplates } = await import(
      '../presets/antigravity/artifactTemplates'
    );
    const tpl = antigravityArtifactTemplates.find((t) => t.id === 'antigravity/gemini/user')!;
    const r = tpl.plan(ctx({ userInput: 'My Project' }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const op = r.plan.operations[0] as WriteFileOp;
    expect(op.absolutePath).toBe('/home/user/.config/gemini/GEMINI.md');
    expect(op.content).toContain('# My Project');
  });
});

describe('mcp template plan()', () => {
  it('produces jsonMerge operation', async () => {
    const { claudeArtifactTemplates } = await import(
      '../presets/claude/artifactTemplates'
    );
    const mcpTpl = claudeArtifactTemplates.find(
      (t) => t.id === 'claude/mcp/workspace'
    )!;
    expect(mcpTpl).toBeDefined();

    const r = mcpTpl.plan(ctx({ userInput: 'my-server' }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.plan.operations).toHaveLength(1);
    const op = r.plan.operations[0] as JsonMergeOp;
    expect(op.type).toBe('jsonMerge');
    expect(op.jsonPath).toBe('mcpServers');
    expect(op.absolutePath).toBe('/ws/.mcp.json');
    expect((op.value as Record<string, unknown>)['my-server']).toBeDefined();
  });
});
