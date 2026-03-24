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
  // Import the actual claude templates to test the hook-config template
  it('produces writeFile + jsonMerge operations', async () => {
    const { claudeArtifactTemplates } = await import(
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
    expect((mergeOp as JsonMergeOp).jsonPath).toBe('hooks');
    expect(r.plan.openAfterCreate).toContain('lint-on-save.sh');
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
