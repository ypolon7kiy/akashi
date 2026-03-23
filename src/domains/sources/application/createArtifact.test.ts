import { describe, expect, it } from 'vitest';
import { resolveArtifactCreation } from './createArtifact';
import type { ArtifactTemplate } from '../domain/artifactTemplate';

function makeTemplate(overrides: Partial<ArtifactTemplate> = {}): ArtifactTemplate {
  return {
    id: 'claude/skill/workspace',
    label: 'New Skill',
    presetId: 'claude',
    category: 'skill',
    scope: 'workspace',
    targetDirResolver: () => '/ws/.claude/skills',
    suggestedExtension: '.md',
    initialContent: '# skill\n\n',
    ...overrides,
  };
}

describe('resolveArtifactCreation', () => {
  it('appends extension when missing', () => {
    const r = resolveArtifactCreation({
      template: makeTemplate(),
      fileName: 'my-skill',
      resolvedDir: '/ws/.claude/skills',
    });
    expect(r).toMatchObject({ ok: true, absolutePath: '/ws/.claude/skills/my-skill.md' });
  });

  it('does not double-append extension already present', () => {
    const r = resolveArtifactCreation({
      template: makeTemplate(),
      fileName: 'my-skill.md',
      resolvedDir: '/ws/.claude/skills',
    });
    expect(r).toMatchObject({ ok: true, absolutePath: '/ws/.claude/skills/my-skill.md' });
  });

  it('writes verbatim string content', () => {
    const r = resolveArtifactCreation({
      template: makeTemplate({ initialContent: '# hello\n' }),
      fileName: 'x',
      resolvedDir: '/ws/.claude/skills',
    });
    expect(r).toMatchObject({ ok: true, content: '# hello\n' });
  });

  it('calls content factory with the final file name', () => {
    const r = resolveArtifactCreation({
      template: makeTemplate({ initialContent: (name) => `# ${name}\n` }),
      fileName: 'cool-skill',
      resolvedDir: '/ws/.claude/skills',
    });
    expect(r).toMatchObject({ ok: true, content: '# cool-skill.md\n' });
  });

  it('returns error when resolvedDir is empty', () => {
    const r = resolveArtifactCreation({
      template: makeTemplate(),
      fileName: 'x',
      resolvedDir: '',
    });
    expect(r).toMatchObject({ ok: false });
  });

  it('returns error when fileName is blank', () => {
    const r = resolveArtifactCreation({
      template: makeTemplate(),
      fileName: '   ',
      resolvedDir: '/ws/.claude/skills',
    });
    expect(r).toMatchObject({ ok: false });
  });

  describe('fixedFileName (e.g. antigravity SKILL.md)', () => {
    const skillTemplate = makeTemplate({
      suggestedExtension: '',
      fixedFileName: 'SKILL.md',
      initialContent: (folderName) => `# ${folderName}\n`,
    });

    it('creates <dir>/<folderName>/<fixedFileName> path', () => {
      const r = resolveArtifactCreation({
        template: skillTemplate,
        fileName: 'my-skill',
        resolvedDir: '/ws/.agent/skills',
      });
      expect(r).toMatchObject({ ok: true, absolutePath: '/ws/.agent/skills/my-skill/SKILL.md' });
    });

    it('passes folder name (not file name) to content factory', () => {
      const r = resolveArtifactCreation({
        template: skillTemplate,
        fileName: 'cool',
        resolvedDir: '/ws/.agent/skills',
      });
      expect(r).toMatchObject({ ok: true, content: '# cool\n' });
    });
  });
});
