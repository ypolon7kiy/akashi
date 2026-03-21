/**
 * Path classification regression tests.
 *
 * SKILL.md disambiguation (workspace, legacy order):
 * 1. Path contains `/.gemini/antigravity/skills/` → gemini_antigravity_skill_md
 * 2. Path contains `/.agent/skills/` → gemini_antigravity_skill_md
 * 3. Path contains `/.agents/skills/` → agents_skill_md
 * 4. Path contains `/.cursor/skills/` → cursor_skill_md
 * 5. Path contains `/.claude/skills/` → claude_skill_md
 * 6. Path contains `/.codex/skills/` → codex_skill_md
 * 7. Otherwise → unknown
 *
 * SKILL.md under user home uses root-relative checks for `~/.cursor/skills`, `~/.claude/skills`,
 * `<codexHome>/skills`, and `~/.gemini/antigravity/skills` before the same segment rules as above.
 */
import { describe, expect, it } from 'vitest';
import * as path from 'node:path';
import { SourceKind } from './domain/model';
import type { ToolUserRoots } from './domain/toolUserRoots';
import { inferUserSourceKind, inferWorkspaceSourceKind } from './infrastructure/classifySourcePath';

const W = (...segments: string[]) => path.posix.join('/workspace', ...segments);

function roots(home = '/home/user'): ToolUserRoots {
  return {
    claudeUserRoot: path.posix.join(home, '.claude'),
    cursorUserRoot: path.posix.join(home, '.cursor'),
    geminiUserRoot: path.posix.join(home, '.gemini'),
    codexUserRoot: path.posix.join(home, '.codex'),
  };
}

describe('inferWorkspaceSourceKind', () => {
  it('classifies universal instruction filenames', () => {
    expect(inferWorkspaceSourceKind(W('AGENTS.md'))).toBe(SourceKind.AgentsMd);
    expect(inferWorkspaceSourceKind(W('.agents.md'))).toBe(SourceKind.DotAgentsMd);
    expect(inferWorkspaceSourceKind(W('TEAM_GUIDE.md'))).toBe(SourceKind.TeamGuideMd);
    expect(inferWorkspaceSourceKind(W('pkg/AGENTS.override.md'))).toBe(
      SourceKind.CodexAgentsOverrideMd
    );
  });

  it('classifies SKILL.md by path segment precedence', () => {
    expect(inferWorkspaceSourceKind(W('.gemini/antigravity/skills/x/SKILL.md'))).toBe(
      SourceKind.GeminiAntigravitySkillMd
    );
    expect(inferWorkspaceSourceKind(W('.agent/skills/a/SKILL.md'))).toBe(
      SourceKind.GeminiAntigravitySkillMd
    );
    expect(inferWorkspaceSourceKind(W('.agents/skills/b/SKILL.md'))).toBe(SourceKind.AgentsSkillMd);
    expect(inferWorkspaceSourceKind(W('.cursor/skills/c/SKILL.md'))).toBe(SourceKind.CursorSkillMd);
    expect(inferWorkspaceSourceKind(W('.claude/skills/d/SKILL.md'))).toBe(SourceKind.ClaudeSkillMd);
    expect(inferWorkspaceSourceKind(W('.codex/skills/e/SKILL.md'))).toBe(SourceKind.CodexSkillMd);
    expect(inferWorkspaceSourceKind(W('orphan/SKILL.md'))).toBe(SourceKind.Unknown);
  });

  it('classifies Claude, Gemini, Cursor, Codex workspace paths', () => {
    expect(inferWorkspaceSourceKind(W('CLAUDE.md'))).toBe(SourceKind.ClaudeMd);
    expect(inferWorkspaceSourceKind(W('.claude/hooks/run.sh'))).toBe(SourceKind.ClaudeHookFile);
    expect(inferWorkspaceSourceKind(W('.claude/rules/r.md'))).toBe(SourceKind.ClaudeRulesMd);
    expect(inferWorkspaceSourceKind(W('.claude/settings.json'))).toBe(
      SourceKind.ClaudeSettingsJson
    );
    expect(inferWorkspaceSourceKind(W('GEMINI.md'))).toBe(SourceKind.GeminiMd);
    expect(inferWorkspaceSourceKind(W('.cursorrules'))).toBe(SourceKind.CursorLegacyRules);
    expect(inferWorkspaceSourceKind(W('.cursor/rules/x.mdc'))).toBe(SourceKind.CursorRulesMdc);
    expect(inferWorkspaceSourceKind(W('.cursor/mcp.json'))).toBe(SourceKind.CursorMcpJson);
    expect(inferWorkspaceSourceKind(W('.codex/config.toml'))).toBe(SourceKind.CodexConfigToml);
    expect(inferWorkspaceSourceKind(W('.codex/rules/default.rules'))).toBe(
      SourceKind.CodexRulesFile
    );
    expect(inferWorkspaceSourceKind(W('.github/copilot-instructions.md'))).toBe(
      SourceKind.GithubCopilotInstructionsMd
    );
  });
});

describe('inferUserSourceKind', () => {
  const r = roots();

  it('classifies SKILL.md under user tool roots before segment rules', () => {
    const gSkill = path.posix.join(r.geminiUserRoot, 'antigravity/skills/p/SKILL.md');
    expect(inferUserSourceKind(gSkill, r)).toBe(SourceKind.GeminiAntigravitySkillMd);

    const cSkill = path.posix.join(r.cursorUserRoot, 'skills/q/SKILL.md');
    expect(inferUserSourceKind(cSkill, r)).toBe(SourceKind.CursorSkillMd);

    const clSkill = path.posix.join(r.claudeUserRoot, 'skills/r/SKILL.md');
    expect(inferUserSourceKind(clSkill, r)).toBe(SourceKind.ClaudeSkillMd);

    const cxSkill = path.posix.join(r.codexUserRoot, 'skills/s/SKILL.md');
    expect(inferUserSourceKind(cxSkill, r)).toBe(SourceKind.CodexSkillMd);
  });

  it('classifies user-scope tool files with root checks', () => {
    expect(inferUserSourceKind(path.posix.join(r.claudeUserRoot, 'CLAUDE.md'), r)).toBe(
      SourceKind.ClaudeMd
    );
    expect(inferUserSourceKind(path.posix.join(r.geminiUserRoot, 'GEMINI.md'), r)).toBe(
      SourceKind.GeminiMd
    );
    expect(inferUserSourceKind(path.posix.join(r.cursorUserRoot, 'mcp.json'), r)).toBe(
      SourceKind.CursorMcpJson
    );
    expect(inferUserSourceKind(path.posix.join(r.codexUserRoot, 'config.toml'), r)).toBe(
      SourceKind.CodexConfigToml
    );
    expect(inferUserSourceKind('/home/user/.github/copilot-instructions.md', r)).toBe(
      SourceKind.GithubCopilotInstructionsMd
    );
  });
});
