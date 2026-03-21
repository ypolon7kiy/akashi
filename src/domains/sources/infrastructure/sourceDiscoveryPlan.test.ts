import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { SourceKind } from '../domain/model';
import { sourceKindsForPresets } from '../domain/sourcePresets';
import {
  collectHomeSourcePaths,
  kindsIntersect,
  selectWorkspaceGlobs,
  WORKSPACE_GLOB_DEFINITIONS,
} from './sourceDiscoveryPlan';

describe('kindsIntersect', () => {
  it('returns false for empty allowed set', () => {
    expect(kindsIntersect(new Set(), [SourceKind.ClaudeMd])).toBe(false);
  });

  it('returns true when any probe kind is allowed', () => {
    expect(
      kindsIntersect(new Set([SourceKind.CursorRulesMdc, SourceKind.AgentsMd]), [
        SourceKind.ClaudeMd,
        SourceKind.AgentsMd,
      ])
    ).toBe(true);
  });

  it('returns false when no overlap', () => {
    expect(kindsIntersect(new Set([SourceKind.CodexConfigToml]), [SourceKind.ClaudeMd])).toBe(
      false
    );
  });
});

describe('selectWorkspaceGlobs', () => {
  it('returns only globs whose kinds overlap allowed kinds', () => {
    const codexKinds = sourceKindsForPresets(new Set(['codex']));
    const globs = selectWorkspaceGlobs(codexKinds);
    expect(globs).toContain('**/.codex/config.toml');
    expect(globs).toContain('**/AGENTS.override.md');
    expect(globs.every((g) => typeof g === 'string' && g.length > 0)).toBe(true);
  });

  it('returns empty when allowed kinds match no glob row', () => {
    expect(selectWorkspaceGlobs(new Set([SourceKind.Unknown]))).toEqual([]);
  });

  it('narrows vs full union for cursor-only kinds', () => {
    const cursorOnly = sourceKindsForPresets(new Set(['cursor']));
    const allKinds = sourceKindsForPresets(new Set(['claude', 'cursor', 'codex', 'antigravity']));
    const cursorGlobs = selectWorkspaceGlobs(cursorOnly);
    const allGlobs = selectWorkspaceGlobs(allKinds);
    expect(cursorGlobs.length).toBeLessThan(allGlobs.length);
    expect(cursorGlobs).toContain('**/.cursor/rules/*.mdc');
  });
});

describe('WORKSPACE_GLOB_DEFINITIONS', () => {
  it('has unique glob strings after merge', () => {
    const globs = WORKSPACE_GLOB_DEFINITIONS.map((r) => r.glob);
    expect(new Set(globs).size).toBe(globs.length);
  });

  it('includes expected tool patterns with correct kind coverage', () => {
    const byGlob = new Map(WORKSPACE_GLOB_DEFINITIONS.map((r) => [r.glob, r.kinds]));

    const claudeSettings = byGlob.get('**/.claude/settings.json');
    expect(claudeSettings).toBeDefined();
    expect(claudeSettings!.includes(SourceKind.ClaudeSettingsJson)).toBe(true);

    const cursorRules = byGlob.get('**/.cursor/rules/*.mdc');
    expect(cursorRules).toBeDefined();
    expect(cursorRules!.includes(SourceKind.CursorRulesMdc)).toBe(true);

    const sharedAgents = byGlob.get(
      '**/{AGENTS.md,agents.md,.agents.md,TEAM_GUIDE.md,team_guide.md,CLAUDE.md,claude.md,GEMINI.md,gemini.md,.cursorrules}'
    );
    expect(sharedAgents).toBeDefined();
    expect(sharedAgents!.includes(SourceKind.AgentsMd)).toBe(true);
    expect(sharedAgents!.includes(SourceKind.GithubCopilotInstructionsMd)).toBe(false);

    const copilot = byGlob.get('**/.github/copilot-instructions.md');
    expect(copilot).toBeDefined();
    expect(copilot!.includes(SourceKind.GithubCopilotInstructionsMd)).toBe(true);
  });
});

describe('collectHomeSourcePaths', () => {
  let tmpBase: string;

  afterEach(async () => {
    if (tmpBase) {
      await fs.rm(tmpBase, { recursive: true, force: true });
      tmpBase = '';
    }
  });

  async function mkLayout(): Promise<{
    homeDir: string;
    roots: {
      claudeUserRoot: string;
      cursorUserRoot: string;
      geminiUserRoot: string;
      codexUserRoot: string;
    };
    claudeMd: string;
    claudeSkill: string;
    agentsMd: string;
  }> {
    tmpBase = await fs.mkdtemp(path.join(os.tmpdir(), 'akashi-home-'));
    const homeDir = path.join(tmpBase, 'home');
    await fs.mkdir(homeDir, { recursive: true });
    const claudeUserRoot = path.join(homeDir, '.claude');
    const cursorUserRoot = path.join(homeDir, '.cursor');
    const geminiUserRoot = path.join(homeDir, '.gemini');
    const codexUserRoot = path.join(homeDir, '.codex');
    await fs.mkdir(claudeUserRoot, { recursive: true });
    await fs.mkdir(path.join(claudeUserRoot, 'skills', 'pkg'), { recursive: true });
    await fs.mkdir(cursorUserRoot, { recursive: true });
    await fs.mkdir(geminiUserRoot, { recursive: true });
    await fs.mkdir(codexUserRoot, { recursive: true });

    const claudeMd = path.join(claudeUserRoot, 'CLAUDE.md');
    const claudeSkill = path.join(claudeUserRoot, 'skills', 'pkg', 'SKILL.md');
    const agentsMd = path.join(homeDir, 'AGENTS.md');
    await fs.writeFile(claudeMd, 'x', 'utf8');
    await fs.writeFile(claudeSkill, 'y', 'utf8');
    await fs.writeFile(agentsMd, 'z', 'utf8');

    return {
      homeDir,
      roots: { claudeUserRoot, cursorUserRoot, geminiUserRoot, codexUserRoot },
      claudeMd,
      claudeSkill,
      agentsMd,
    };
  }

  it('collects shallow Claude file when kind allowed but omits skills when ClaudeSkillMd excluded', async () => {
    const { homeDir, roots, claudeMd, claudeSkill } = await mkLayout();
    const allowed = new Set<SourceKind>([SourceKind.ClaudeMd]);
    const paths = await collectHomeSourcePaths(homeDir, allowed, roots);
    expect(paths).toContain(claudeMd);
    expect(paths).not.toContain(claudeSkill);
  });

  it('collects recursive SKILL.md under Claude skills when ClaudeSkillMd is allowed', async () => {
    const { homeDir, roots, claudeSkill } = await mkLayout();
    const allowed = new Set<SourceKind>([SourceKind.ClaudeSkillMd]);
    const paths = await collectHomeSourcePaths(homeDir, allowed, roots);
    expect(paths).toContain(claudeSkill);
  });

  it('collects home AGENTS.md via shared task when AgentsMd is allowed', async () => {
    const { homeDir, roots, agentsMd } = await mkLayout();
    const allowed = new Set<SourceKind>([SourceKind.AgentsMd]);
    const paths = await collectHomeSourcePaths(homeDir, allowed, roots);
    expect(paths).toContain(agentsMd);
  });

  it('returns deduped path list (no duplicate entries)', async () => {
    const { homeDir, roots } = await mkLayout();
    const allowed = new Set<SourceKind>([
      SourceKind.ClaudeMd,
      SourceKind.ClaudeSkillMd,
      SourceKind.AgentsMd,
    ]);
    const paths = await collectHomeSourcePaths(homeDir, allowed, roots);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
