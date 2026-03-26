import * as path from 'node:path';
import * as vscode from 'vscode';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CreatorContext } from '@src/domains/sources/domain/artifactCreator';
import type { WriteFileOp } from '@src/domains/sources/domain/artifactOperation';
import { SkillFileCreator } from '@src/domains/sources/domain/creators/SkillFileCreator';
import { SourceCategoryId } from '@src/domains/sources/domain/sourceTags';

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

describe('SkillFileCreator (flat layout) planWithProvidedInput()', () => {
  const creator = new SkillFileCreator({
    id: 'test/skill/flat',
    label: 'New Skill',
    presetId: 'claude',
    category: SourceCategoryId.Skill,
    locality: 'workspace',
    targetDir: (ws) => (ws ? path.join(ws, '.claude', 'skills') : ''),
    layout: { kind: 'flat', suggestedExtension: '.md' },
  });

  it('produces correct path with extension appended', () => {
    const r = creator.planWithProvidedInput(ctx(), {
      userInput: 'my-skill',
      description: 'A test skill',
    });
    expect(r.kind).toBe('plan');
    if (r.kind !== 'plan') return;
    const op = r.plan.operations[0] as WriteFileOp;
    expect(op.absolutePath).toBe('/ws/.claude/skills/my-skill.md');
  });

  it('does not double-append extension', () => {
    const r = creator.planWithProvidedInput(ctx(), {
      userInput: 'my-skill.md',
    });
    // my-skill.md fails validation (dots not allowed in skill names)
    expect(r.kind).toBe('error');
  });

  it('content includes YAML frontmatter with name and description', () => {
    const r = creator.planWithProvidedInput(ctx(), {
      userInput: 'code-review',
      description: 'Reviews code for quality issues.',
    });
    expect(r.kind).toBe('plan');
    if (r.kind !== 'plan') return;
    const op = r.plan.operations[0] as WriteFileOp;
    expect(op.content).toContain('---\n');
    expect(op.content).toContain('name: code-review');
    expect(op.content).toContain('description: Reviews code for quality issues.');
  });

  it('uses placeholder when description is empty', () => {
    const r = creator.planWithProvidedInput(ctx(), { userInput: 'my-skill' });
    expect(r.kind).toBe('plan');
    if (r.kind !== 'plan') return;
    const op = r.plan.operations[0] as WriteFileOp;
    expect(op.content).toContain('name: my-skill');
    expect(op.content).toContain('description: TODO:');
  });

  it('returns error for invalid skill name (uppercase)', () => {
    const r = creator.planWithProvidedInput(ctx(), { userInput: 'MySkill' });
    expect(r.kind).toBe('error');
    if (r.kind === 'error') {
      expect(r.error).toContain('lowercase');
    }
  });

  it('returns error for invalid skill name (consecutive hyphens)', () => {
    const r = creator.planWithProvidedInput(ctx(), { userInput: 'my--skill' });
    expect(r.kind).toBe('error');
  });

  it('returns error when targetDir is empty', () => {
    const r = creator.planWithProvidedInput(ctx({ workspaceRoot: '' }), {
      userInput: 'x',
    });
    expect(r.kind).toBe('error');
  });

  it('returns error when userInput is blank', () => {
    const r = creator.planWithProvidedInput(ctx(), { userInput: '   ' });
    expect(r.kind).toBe('error');
  });
});

describe('SkillFileCreator (folder layout) planWithProvidedInput()', () => {
  const creator = new SkillFileCreator({
    id: 'test/skill/folder',
    label: 'New Skill',
    presetId: 'antigravity',
    category: SourceCategoryId.Skill,
    locality: 'workspace',
    targetDir: (ws) => (ws ? path.join(ws, '.agent', 'skills') : ''),
    layout: { kind: 'folder', fixedFileName: 'SKILL.md' },
  });

  it('creates <dir>/<name>/SKILL.md path', () => {
    const r = creator.planWithProvidedInput(ctx(), {
      userInput: 'my-skill',
      description: 'Test',
    });
    expect(r.kind).toBe('plan');
    if (r.kind !== 'plan') return;
    const op = r.plan.operations[0] as WriteFileOp;
    expect(op.absolutePath).toBe('/ws/.agent/skills/my-skill/SKILL.md');
  });

  it('content includes YAML frontmatter', () => {
    const r = creator.planWithProvidedInput(ctx(), {
      userInput: 'pdf-processing',
      description: 'Extract PDF text and fill forms.',
    });
    expect(r.kind).toBe('plan');
    if (r.kind !== 'plan') return;
    const op = r.plan.operations[0] as WriteFileOp;
    expect(op.content).toContain('name: pdf-processing');
    expect(op.content).toContain('description: Extract PDF text and fill forms.');
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SkillFileCreator.run()', () => {
  const creator = new SkillFileCreator({
    id: 'test/skill/run',
    label: 'New Skill',
    presetId: 'claude',
    category: SourceCategoryId.Skill,
    locality: 'workspace',
    targetDir: (ws) => (ws ? path.join(ws, '.claude', 'skills') : ''),
    layout: { kind: 'flat', suggestedExtension: '.md' },
  });

  it('returns plan matching planWithProvidedInput when user provides name + description', async () => {
    vi.spyOn(vscode.window, 'showInputBox')
      .mockResolvedValueOnce('my-skill')
      .mockResolvedValueOnce('Does cool things.');
    const fromRun = await creator.run(ctx());
    const fromPlan = creator.planWithProvidedInput(ctx(), {
      userInput: 'my-skill',
      description: 'Does cool things.',
    });
    expect(fromRun.kind).toBe('plan');
    expect(fromPlan.kind).toBe('plan');
    if (fromRun.kind === 'plan' && fromPlan.kind === 'plan') {
      expect(fromRun.plan).toEqual(fromPlan.plan);
    }
  });

  it('returns plan with placeholder when description is empty', async () => {
    vi.spyOn(vscode.window, 'showInputBox')
      .mockResolvedValueOnce('my-skill')
      .mockResolvedValueOnce('');
    const r = await creator.run(ctx());
    expect(r.kind).toBe('plan');
    if (r.kind !== 'plan') return;
    const op = r.plan.operations[0] as WriteFileOp;
    expect(op.content).toContain('description: TODO:');
  });

  it('returns cancelled when name input is dismissed', async () => {
    vi.spyOn(vscode.window, 'showInputBox').mockResolvedValueOnce(undefined);
    const r = await creator.run(ctx());
    expect(r.kind).toBe('cancelled');
  });

  it('returns cancelled when description input is dismissed', async () => {
    vi.spyOn(vscode.window, 'showInputBox')
      .mockResolvedValueOnce('my-skill')
      .mockResolvedValueOnce(undefined);
    const r = await creator.run(ctx());
    expect(r.kind).toBe('cancelled');
  });
});
