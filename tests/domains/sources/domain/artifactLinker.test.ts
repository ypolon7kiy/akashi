import { describe, expect, it } from 'vitest';
import { linkArtifacts } from '@src/domains/sources/domain/artifactLinker';
import { sourceRecordId } from '@src/shared/sourceRecordId';
import type { IndexedSourceEntry, SourceCategory } from '@src/domains/sources/domain/model';
import type { SourcePresetId } from '@src/shared/sourcePresetId';
import type { SourceLocality } from '@src/domains/sources/domain/artifactKind';

function entry(
  path: string,
  preset: SourcePresetId,
  locality: SourceLocality,
  category: SourceCategory
): IndexedSourceEntry {
  return {
    id: sourceRecordId(preset, locality, path),
    path,
    preset,
    category,
    locality,
    tags: [],
    metadata: { byteLength: 1, updatedAt: '2025-01-01T00:00:00.000Z' },
  };
}

describe('linkArtifacts', () => {
  it('returns empty array for empty entries', () => {
    expect(linkArtifacts([])).toEqual([]);
  });

  it('marks all artifacts as topLevel regardless of shape', () => {
    const rule = entry('/ws/.claude/rules/foo.md', 'claude', 'workspace', 'rule');
    const skillMd = entry('/ws/.claude/skills/my-skill/SKILL.md', 'claude', 'workspace', 'skill');
    const skillHelper = entry('/ws/.claude/skills/my-skill/lib.js', 'claude', 'workspace', 'skill');
    const hookScript = entry('/ws/.claude/hooks/lint.sh', 'claude', 'workspace', 'hook');
    const hookConfig = entry('/ws/.claude/settings.json', 'claude', 'workspace', 'config');
    const mcp = entry('/ws/.mcp.json', 'claude', 'workspace', 'mcp');

    const artifacts = linkArtifacts([rule, skillMd, skillHelper, hookScript, hookConfig, mcp]);
    expect(artifacts.length).toBeGreaterThanOrEqual(4);
    expect(artifacts.every((a) => a.topLevel === true)).toBe(true);
  });

  describe('single-file (default)', () => {
    it('creates a single-file artifact for a plain entry', () => {
      const e = entry('/ws/.claude/rules/foo.md', 'claude', 'workspace', 'rule');
      const artifacts = linkArtifacts([e]);
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].shape).toBe('single-file');
      expect(artifacts[0].memberRecordIds).toEqual([e.id]);
      expect(artifacts[0].primaryPath).toBe(e.path);
      expect(artifacts[0].presetId).toBe('claude');
      expect(artifacts[0].category).toBe('rule');
      expect(artifacts[0].locality).toBe('workspace');
    });

    it('creates one artifact per entry', () => {
      const entries = [
        entry('/ws/.claude/rules/a.md', 'claude', 'workspace', 'rule'),
        entry('/ws/.claude/rules/b.md', 'claude', 'workspace', 'rule'),
      ];
      const artifacts = linkArtifacts(entries);
      expect(artifacts).toHaveLength(2);
      expect(artifacts.every((a) => a.shape === 'single-file')).toBe(true);
    });

    it('creates a single-file artifact for a context entry (CLAUDE.md)', () => {
      const e = entry('/ws/CLAUDE.md', 'claude', 'workspace', 'context');
      const artifacts = linkArtifacts([e]);
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].shape).toBe('single-file');
      expect(artifacts[0].category).toBe('context');
      expect(artifacts[0].primaryPath).toBe(e.path);
    });

    it('creates a single-file artifact for a command entry', () => {
      const e = entry('/ws/.claude/commands/deploy.md', 'claude', 'workspace', 'command');
      const artifacts = linkArtifacts([e]);
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].shape).toBe('single-file');
      expect(artifacts[0].category).toBe('command');
      expect(artifacts[0].primaryPath).toBe(e.path);
    });

    it('creates a single-file artifact for config not claimed by any hook', () => {
      const e = entry('/ws/.claude/settings.json', 'claude', 'workspace', 'config');
      const artifacts = linkArtifacts([e]);
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].shape).toBe('single-file');
      expect(artifacts[0].category).toBe('config');
      expect(artifacts[0].primaryPath).toBe(e.path);
    });
  });

  describe('file-json compound (hooks)', () => {
    it('links a Claude hook script with settings.json', () => {
      const script = entry('/ws/.claude/hooks/lint.sh', 'claude', 'workspace', 'hook');
      const config = entry('/ws/.claude/settings.json', 'claude', 'workspace', 'config');
      const artifacts = linkArtifacts([script, config]);

      const compound = artifacts.find((a) => a.shape === 'file-json');
      expect(compound).toBeDefined();
      expect(compound!.memberRecordIds).toContain(script.id);
      expect(compound!.memberRecordIds).toContain(config.id);
      expect(compound!.primaryPath).toBe(script.path);
      expect(compound!.presetId).toBe('claude');
      expect(compound!.category).toBe('hook');
    });

    it('links a Cursor hook script with hooks.json', () => {
      const script = entry('/ws/.cursor/hooks/format.sh', 'cursor', 'workspace', 'hook');
      const config = entry('/ws/.cursor/hooks.json', 'cursor', 'workspace', 'hook');
      const artifacts = linkArtifacts([script, config]);

      const compound = artifacts.find((a) => a.shape === 'file-json');
      expect(compound).toBeDefined();
      expect(compound!.memberRecordIds).toContain(script.id);
      expect(compound!.memberRecordIds).toContain(config.id);
      expect(compound!.primaryPath).toBe(script.path);
    });

    it('creates two compound artifacts for two scripts sharing one config', () => {
      const s1 = entry('/ws/.claude/hooks/lint.sh', 'claude', 'workspace', 'hook');
      const s2 = entry('/ws/.claude/hooks/format.sh', 'claude', 'workspace', 'hook');
      const config = entry('/ws/.claude/settings.json', 'claude', 'workspace', 'config');
      const artifacts = linkArtifacts([s1, s2, config]);

      const compounds = artifacts.filter((a) => a.shape === 'file-json');
      expect(compounds).toHaveLength(2);
      expect(compounds.every((c) => c.memberRecordIds.includes(config.id))).toBe(true);
      const primaryPaths = compounds.map((c) => c.primaryPath).sort();
      expect(primaryPaths).toEqual([s2.path, s1.path].sort());
    });

    it('falls back to single-file when config is not indexed', () => {
      const script = entry('/ws/.claude/hooks/lint.sh', 'claude', 'workspace', 'hook');
      const artifacts = linkArtifacts([script]);

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].shape).toBe('single-file');
    });

    it('does not create compound across different presets', () => {
      const script = entry('/ws/.claude/hooks/lint.sh', 'claude', 'workspace', 'hook');
      // Wrong preset for the config
      const config = entry('/ws/.claude/settings.json', 'cursor', 'workspace', 'config');
      const artifacts = linkArtifacts([script, config]);

      expect(artifacts.every((a) => a.shape === 'single-file')).toBe(true);
    });

    it('does not create compound across different localities', () => {
      const script = entry('/ws/.claude/hooks/lint.sh', 'claude', 'workspace', 'hook');
      const config = entry('/ws/.claude/settings.json', 'claude', 'user', 'config');
      const artifacts = linkArtifacts([script, config]);

      // Script falls back to single-file, config is single-file
      const compound = artifacts.find((a) => a.shape === 'file-json');
      expect(compound).toBeUndefined();
    });
  });

  describe('json-only (MCP)', () => {
    it('creates a json-only artifact for MCP config', () => {
      const mcp = entry('/ws/.mcp.json', 'claude', 'workspace', 'mcp');
      const artifacts = linkArtifacts([mcp]);

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].shape).toBe('json-only');
      expect(artifacts[0].memberRecordIds).toEqual([mcp.id]);
      expect(artifacts[0].primaryPath).toBe(mcp.path);
    });

    it('creates separate json-only artifacts for different preset MCP files', () => {
      const claude = entry('/ws/.mcp.json', 'claude', 'workspace', 'mcp');
      const cursor = entry('/ws/.cursor/mcp.json', 'cursor', 'workspace', 'mcp');
      const artifacts = linkArtifacts([claude, cursor]);

      expect(artifacts).toHaveLength(2);
      expect(artifacts.every((a) => a.shape === 'json-only')).toBe(true);
    });
  });

  describe('folder-file (Antigravity skills)', () => {
    it('creates a folder-file artifact for SKILL.md', () => {
      const skill = entry(
        '/ws/.agent/skills/my-skill/SKILL.md',
        'antigravity',
        'workspace',
        'skill'
      );
      const artifacts = linkArtifacts([skill]);

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].shape).toBe('folder-file');
      expect(artifacts[0].memberRecordIds).toEqual([skill.id]);
      expect(artifacts[0].primaryPath).toBe(skill.path);
    });

    it('does not match non-SKILL.md files in .agent/skills', () => {
      const other = entry(
        '/ws/.agent/skills/my-skill/README.md',
        'antigravity',
        'workspace',
        'skill'
      );
      const artifacts = linkArtifacts([other]);

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].shape).toBe('single-file');
    });
  });

  describe('folder-file (Claude/Cursor/Codex skill folders)', () => {
    it('creates a folder-file artifact for .claude/skills SKILL.md', () => {
      const skill = entry('/ws/.claude/skills/my-skill/SKILL.md', 'claude', 'workspace', 'skill');
      const artifacts = linkArtifacts([skill]);
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].shape).toBe('folder-file');
      expect(artifacts[0].memberRecordIds).toEqual([skill.id]);
      expect(artifacts[0].primaryPath).toBe(skill.path);
    });

    it('groups folder siblings under the same folder-file artifact', () => {
      const skillMd = entry('/ws/.claude/skills/my-skill/SKILL.md', 'claude', 'workspace', 'skill');
      const helper = entry(
        '/ws/.claude/skills/my-skill/helpers/util.js',
        'claude',
        'workspace',
        'skill'
      );
      const config = entry(
        '/ws/.claude/skills/my-skill/data/config.json',
        'claude',
        'workspace',
        'skill'
      );
      const artifacts = linkArtifacts([skillMd, helper, config]);

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].shape).toBe('folder-file');
      expect(artifacts[0].memberRecordIds).toHaveLength(3);
      expect(artifacts[0].memberRecordIds).toContain(skillMd.id);
      expect(artifacts[0].memberRecordIds).toContain(helper.id);
      expect(artifacts[0].memberRecordIds).toContain(config.id);
      expect(artifacts[0].primaryPath).toBe(skillMd.path);
    });

    it('groups multiple skill folders into separate artifacts', () => {
      const skill1Md = entry('/ws/.claude/skills/skill-a/SKILL.md', 'claude', 'workspace', 'skill');
      const skill1Helper = entry(
        '/ws/.claude/skills/skill-a/lib.js',
        'claude',
        'workspace',
        'skill'
      );
      const skill2Md = entry('/ws/.claude/skills/skill-b/SKILL.md', 'claude', 'workspace', 'skill');
      const skill2Helper = entry(
        '/ws/.claude/skills/skill-b/data.json',
        'claude',
        'workspace',
        'skill'
      );

      const artifacts = linkArtifacts([skill1Md, skill1Helper, skill2Md, skill2Helper]);

      expect(artifacts).toHaveLength(2);
      const a1 = artifacts.find((a) => a.primaryPath.includes('skill-a'))!;
      const a2 = artifacts.find((a) => a.primaryPath.includes('skill-b'))!;
      expect(a1.shape).toBe('folder-file');
      expect(a2.shape).toBe('folder-file');
      expect(a1.memberRecordIds).toHaveLength(2);
      expect(a2.memberRecordIds).toHaveLength(2);
      expect(a1.memberRecordIds).toContain(skill1Helper.id);
      expect(a2.memberRecordIds).toContain(skill2Helper.id);
    });

    it('flat skill file remains single-file alongside folder skill', () => {
      const folder = entry('/ws/.claude/skills/my-skill/SKILL.md', 'claude', 'workspace', 'skill');
      const folderHelper = entry(
        '/ws/.claude/skills/my-skill/lib.js',
        'claude',
        'workspace',
        'skill'
      );
      const flat = entry('/ws/.claude/skills/quick-fix.md', 'claude', 'workspace', 'skill');
      const artifacts = linkArtifacts([folder, folderHelper, flat]);

      expect(artifacts).toHaveLength(2);
      const folderArt = artifacts.find((a) => a.shape === 'folder-file')!;
      const flatArt = artifacts.find((a) => a.shape === 'single-file')!;
      expect(folderArt.memberRecordIds).toHaveLength(2);
      expect(flatArt.memberRecordIds).toEqual([flat.id]);
    });

    it('does not group skill folder siblings across different presets', () => {
      const skill = entry('/ws/.claude/skills/my-skill/SKILL.md', 'claude', 'workspace', 'skill');
      const foreign = entry('/ws/.claude/skills/my-skill/extra.js', 'cursor', 'workspace', 'skill');
      const artifacts = linkArtifacts([skill, foreign]);

      expect(artifacts).toHaveLength(2);
      const folderArt = artifacts.find((a) => a.shape === 'folder-file')!;
      expect(folderArt.memberRecordIds).toEqual([skill.id]);
    });

    it('does not group skill folder siblings across different localities', () => {
      const skill = entry('/ws/.claude/skills/my-skill/SKILL.md', 'claude', 'workspace', 'skill');
      const userEntry = entry('/ws/.claude/skills/my-skill/extra.js', 'claude', 'user', 'skill');
      const artifacts = linkArtifacts([skill, userEntry]);

      expect(artifacts).toHaveLength(2);
      const folderArt = artifacts.find((a) => a.shape === 'folder-file')!;
      expect(folderArt.memberRecordIds).toEqual([skill.id]);
    });

    it('handles nested SKILL.md — inner claims its files before outer', () => {
      const outerMd = entry('/ws/.claude/skills/outer/SKILL.md', 'claude', 'workspace', 'skill');
      const innerMd = entry(
        '/ws/.claude/skills/outer/inner/SKILL.md',
        'claude',
        'workspace',
        'skill'
      );
      const innerHelper = entry(
        '/ws/.claude/skills/outer/inner/lib.js',
        'claude',
        'workspace',
        'skill'
      );
      const artifacts = linkArtifacts([outerMd, innerMd, innerHelper]);

      // Inner SKILL.md should claim inner/lib.js; outer gets only itself
      expect(artifacts).toHaveLength(2);
      const inner = artifacts.find((a) => a.primaryPath.includes('/inner/SKILL.md'))!;
      const outer = artifacts.find((a) => a.primaryPath === outerMd.path)!;
      expect(inner.memberRecordIds).toHaveLength(2);
      expect(inner.memberRecordIds).toContain(innerHelper.id);
      expect(outer.memberRecordIds).toEqual([outerMd.id]);
    });

    it('produces deterministic folder-file IDs regardless of entry order', () => {
      const md = entry('/ws/.claude/skills/s/SKILL.md', 'claude', 'workspace', 'skill');
      const h = entry('/ws/.claude/skills/s/h.js', 'claude', 'workspace', 'skill');
      const run1 = linkArtifacts([md, h]);
      const run2 = linkArtifacts([h, md]);
      const f1 = run1.find((a) => a.shape === 'folder-file')!;
      const f2 = run2.find((a) => a.shape === 'folder-file')!;
      expect(f1.id).toBe(f2.id);
    });

    it('creates folder-file artifact for .cursor/skills SKILL.md', () => {
      const skill = entry('/ws/.cursor/skills/my-skill/SKILL.md', 'cursor', 'workspace', 'skill');
      const helper = entry('/ws/.cursor/skills/my-skill/util.js', 'cursor', 'workspace', 'skill');
      const artifacts = linkArtifacts([skill, helper]);
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].shape).toBe('folder-file');
      expect(artifacts[0].memberRecordIds).toHaveLength(2);
    });

    it('creates folder-file artifact for .agents/skills SKILL.md', () => {
      const skill = entry('/ws/.agents/skills/my-skill/SKILL.md', 'codex', 'workspace', 'skill');
      const artifacts = linkArtifacts([skill]);
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].shape).toBe('folder-file');
    });
  });

  describe('Cursor preset categories', () => {
    it('creates single-file for AGENTS.md context', () => {
      const e = entry('/ws/AGENTS.md', 'cursor', 'workspace', 'context');
      const artifacts = linkArtifacts([e]);
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].shape).toBe('single-file');
      expect(artifacts[0].category).toBe('context');
    });

    it('creates single-file for .cursorrules rule', () => {
      const e = entry('/ws/.cursorrules', 'cursor', 'workspace', 'rule');
      const artifacts = linkArtifacts([e]);
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].shape).toBe('single-file');
      expect(artifacts[0].category).toBe('rule');
    });

    it('creates single-file for .mdc rule in .cursor/rules', () => {
      const e = entry('/ws/.cursor/rules/coding.mdc', 'cursor', 'workspace', 'rule');
      const artifacts = linkArtifacts([e]);
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].shape).toBe('single-file');
      expect(artifacts[0].category).toBe('rule');
    });

    it('creates single-file for command in .cursor/commands', () => {
      const e = entry('/ws/.cursor/commands/deploy.md', 'cursor', 'workspace', 'command');
      const artifacts = linkArtifacts([e]);
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].shape).toBe('single-file');
      expect(artifacts[0].category).toBe('command');
    });

    it('creates single-file for hooks.json when no hook scripts exist', () => {
      const e = entry('/ws/.cursor/hooks.json', 'cursor', 'workspace', 'hook');
      const artifacts = linkArtifacts([e]);
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].shape).toBe('single-file');
      expect(artifacts[0].category).toBe('hook');
    });

    it('creates json-only for .cursor/mcp.json', () => {
      const e = entry('/ws/.cursor/mcp.json', 'cursor', 'workspace', 'mcp');
      const artifacts = linkArtifacts([e]);
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].shape).toBe('json-only');
      expect(artifacts[0].category).toBe('mcp');
    });
  });

  describe('Codex preset categories', () => {
    it('creates single-file for AGENTS.md context', () => {
      const e = entry('/ws/AGENTS.md', 'codex', 'workspace', 'context');
      const artifacts = linkArtifacts([e]);
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].shape).toBe('single-file');
      expect(artifacts[0].category).toBe('context');
    });

    it('creates single-file for .codex/config.toml', () => {
      const e = entry('/ws/.codex/config.toml', 'codex', 'workspace', 'config');
      const artifacts = linkArtifacts([e]);
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].shape).toBe('single-file');
      expect(artifacts[0].category).toBe('config');
    });

    it('creates single-file for .codex/rules/*.rules', () => {
      const e = entry('/ws/.codex/rules/coding.rules', 'codex', 'workspace', 'rule');
      const artifacts = linkArtifacts([e]);
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].shape).toBe('single-file');
      expect(artifacts[0].category).toBe('rule');
    });

    it('creates folder-file for .codex/skills SKILL.md with siblings', () => {
      const skillMd = entry('/ws/.codex/skills/my-skill/SKILL.md', 'codex', 'workspace', 'skill');
      const helper = entry('/ws/.codex/skills/my-skill/lib.js', 'codex', 'workspace', 'skill');
      const artifacts = linkArtifacts([skillMd, helper]);
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].shape).toBe('folder-file');
      expect(artifacts[0].memberRecordIds).toHaveLength(2);
      expect(artifacts[0].primaryPath).toBe(skillMd.path);
    });
  });

  describe('Antigravity preset categories', () => {
    it('creates single-file for GEMINI.md context', () => {
      const e = entry('/ws/GEMINI.md', 'antigravity', 'workspace', 'context');
      const artifacts = linkArtifacts([e]);
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].shape).toBe('single-file');
      expect(artifacts[0].category).toBe('context');
    });

    it('creates single-file for .gemini/settings.json config', () => {
      const e = entry('/ws/.gemini/settings.json', 'antigravity', 'workspace', 'config');
      const artifacts = linkArtifacts([e]);
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].shape).toBe('single-file');
      expect(artifacts[0].category).toBe('config');
    });

    it('creates folder-file for .agent/skills SKILL.md (single-member)', () => {
      const e = entry('/ws/.agent/skills/my-skill/SKILL.md', 'antigravity', 'workspace', 'skill');
      const artifacts = linkArtifacts([e]);
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].shape).toBe('folder-file');
      expect(artifacts[0].memberRecordIds).toHaveLength(1);
      expect(artifacts[0].primaryPath).toBe(e.path);
    });
  });

  describe('artifact IDs', () => {
    it('produces deterministic IDs', () => {
      const e = entry('/ws/.claude/rules/foo.md', 'claude', 'workspace', 'rule');
      const run1 = linkArtifacts([e]);
      const run2 = linkArtifacts([e]);
      expect(run1[0].id).toBe(run2[0].id);
    });

    it('produces deterministic IDs regardless of entry order for compounds', () => {
      const s = entry('/ws/.claude/hooks/lint.sh', 'claude', 'workspace', 'hook');
      const c = entry('/ws/.claude/settings.json', 'claude', 'workspace', 'config');
      const run1 = linkArtifacts([s, c]);
      const run2 = linkArtifacts([c, s]);
      const compound1 = run1.find((a) => a.shape === 'file-json');
      const compound2 = run2.find((a) => a.shape === 'file-json');
      expect(compound1!.id).toBe(compound2!.id);
    });
  });

  describe('mixed scenario', () => {
    it('correctly classifies a workspace with all artifact shapes', () => {
      const entries = [
        // single-file
        entry('/ws/.claude/rules/foo.md', 'claude', 'workspace', 'rule'),
        // file-json compound
        entry('/ws/.claude/hooks/lint.sh', 'claude', 'workspace', 'hook'),
        entry('/ws/.claude/settings.json', 'claude', 'workspace', 'config'),
        // json-only
        entry('/ws/.mcp.json', 'claude', 'workspace', 'mcp'),
        // folder-file
        entry('/ws/.agent/skills/my-skill/SKILL.md', 'antigravity', 'workspace', 'skill'),
      ];
      const artifacts = linkArtifacts(entries);

      const byShape = new Map<string, number>();
      for (const a of artifacts) {
        byShape.set(a.shape, (byShape.get(a.shape) ?? 0) + 1);
      }
      expect(byShape.get('single-file')).toBe(1);
      expect(byShape.get('file-json')).toBe(1);
      expect(byShape.get('json-only')).toBe(1);
      expect(byShape.get('folder-file')).toBe(1);
    });
  });
});
