import * as path from 'node:path';
import { SourceKind } from '../../domain/model';
import type { ToolUserRoots } from '../../domain/toolUserRoots';

export function isUnderRoot(filePath: string, rootDir: string): boolean {
  const rel = path.relative(path.normalize(rootDir), path.normalize(filePath));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/** Universal workspace filenames (any tool). Runs before SKILL.md and tool-specific rules. */
export function classifyUniversalWorkspacePath(filePath: string): SourceKind | undefined {
  const basename = path.basename(filePath);
  if (basename === 'AGENTS.md' || basename === 'agents.md') {
    return SourceKind.AgentsMd;
  }
  if (basename === '.agents.md') {
    return SourceKind.DotAgentsMd;
  }
  if (basename === 'TEAM_GUIDE.md' || basename === 'team_guide.md') {
    return SourceKind.TeamGuideMd;
  }
  if (basename === 'AGENTS.override.md') {
    return SourceKind.CodexAgentsOverrideMd;
  }
  return undefined;
}

/** Universal user-home filenames (any tool). Order matches legacy scanner. */
export function classifyUniversalUserPath(filePath: string): SourceKind | undefined {
  return classifyUniversalWorkspacePath(filePath);
}

/**
 * SKILL.md workspace paths: first matching segment wins (legacy order).
 * Precedence: `.gemini/antigravity/skills` → `.agent/skills` → `.agents/skills` →
 * `.cursor/skills` → `.claude/skills` → `.codex/skills` → unknown.
 */
export function classifyWorkspaceSkillMdPath(filePath: string): SourceKind | undefined {
  const basename = path.basename(filePath);
  if (basename.toLowerCase() !== 'skill.md') {
    return undefined;
  }
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.includes('/.gemini/antigravity/skills/')) {
    return SourceKind.GeminiAntigravitySkillMd;
  }
  if (normalized.includes('/.agent/skills/')) {
    return SourceKind.GeminiAntigravitySkillMd;
  }
  if (normalized.includes('/.agents/skills/')) {
    return SourceKind.AgentsSkillMd;
  }
  if (normalized.includes('/.cursor/skills/')) {
    return SourceKind.CursorSkillMd;
  }
  if (normalized.includes('/.claude/skills/')) {
    return SourceKind.ClaudeSkillMd;
  }
  if (normalized.includes('/.codex/skills/')) {
    return SourceKind.CodexSkillMd;
  }
  return SourceKind.Unknown;
}

/**
 * SKILL.md under user home: gemini antigravity dir → `.agent/skills` → `.agents/skills` →
 * `~/.cursor/skills` → `~/.claude/skills` → `<codex>/skills` → unknown.
 */
export function classifyUserSkillMdPath(
  filePath: string,
  roots: ToolUserRoots
): SourceKind | undefined {
  const basename = path.basename(filePath);
  if (basename.toLowerCase() !== 'skill.md') {
    return undefined;
  }
  const normalized = filePath.replace(/\\/g, '/');
  const { claudeUserRoot, cursorUserRoot, geminiUserRoot, codexUserRoot } = roots;

  const geminiSkills = path.join(geminiUserRoot, 'antigravity', 'skills');
  if (isUnderRoot(filePath, geminiSkills)) {
    return SourceKind.GeminiAntigravitySkillMd;
  }
  if (normalized.includes('/.agent/skills/')) {
    return SourceKind.GeminiAntigravitySkillMd;
  }
  if (normalized.includes('/.agents/skills/')) {
    return SourceKind.AgentsSkillMd;
  }
  const cursorSkills = path.join(cursorUserRoot, 'skills');
  if (isUnderRoot(filePath, cursorSkills)) {
    return SourceKind.CursorSkillMd;
  }
  const claudeSkills = path.join(claudeUserRoot, 'skills');
  if (isUnderRoot(filePath, claudeSkills)) {
    return SourceKind.ClaudeSkillMd;
  }
  const codexSkills = path.join(codexUserRoot, 'skills');
  if (isUnderRoot(filePath, codexSkills)) {
    return SourceKind.CodexSkillMd;
  }
  return SourceKind.Unknown;
}

/** GitHub Copilot instructions (workspace or under `~/.github/`). */
export function classifyCopilotInstructionsPath(filePath: string): SourceKind | undefined {
  const basename = path.basename(filePath);
  const normalized = filePath.replace(/\\/g, '/');
  if (basename === 'copilot-instructions.md' && normalized.includes('/.github/')) {
    return SourceKind.GithubCopilotInstructionsMd;
  }
  return undefined;
}
