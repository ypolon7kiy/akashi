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
