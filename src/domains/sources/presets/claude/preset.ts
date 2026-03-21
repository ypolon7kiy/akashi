import * as path from 'node:path';
import { SourceKind } from '../../domain/model';
import type { SourcePresetDefinition } from '../../domain/sourcePresetDefinition';
import type { ToolUserRoots } from '../../domain/toolUserRoots';
import { SHARED_SOURCE_KINDS } from '../_shared/kinds';
import { isUnderRoot } from '../_shared/classifyPaths';
import { claudeHomePathTasks } from './homePathTasks';

const WORKSPACE_GLOBS = [
  {
    glob: '**/.claude/settings.json',
    kinds: [SourceKind.ClaudeSettingsJson] as const,
  },
  {
    glob: '**/.claude/settings.local.json',
    kinds: [SourceKind.ClaudeSettingsJson] as const,
  },
  {
    glob: '**/.claude/rules/*.md',
    kinds: [SourceKind.ClaudeRulesMd] as const,
  },
  {
    glob: '**/.claude/hooks/**',
    kinds: [SourceKind.ClaudeHookFile] as const,
  },
  {
    glob: '**/.claude/skills/**/SKILL.md',
    kinds: [SourceKind.ClaudeSkillMd] as const,
  },
] as const;

function classifyWorkspacePath(filePath: string): SourceKind | undefined {
  const basename = path.basename(filePath);
  const normalized = filePath.replace(/\\/g, '/');
  if (basename === 'CLAUDE.md' || basename === 'claude.md') {
    return SourceKind.ClaudeMd;
  }
  if (normalized.includes('/.claude/hooks/')) {
    return SourceKind.ClaudeHookFile;
  }
  if (normalized.includes('/.claude/rules/') && basename.endsWith('.md')) {
    return SourceKind.ClaudeRulesMd;
  }
  if (
    (basename === 'settings.json' || basename === 'settings.local.json') &&
    normalized.includes('/.claude/')
  ) {
    return SourceKind.ClaudeSettingsJson;
  }
  return undefined;
}

function classifyUserPath(filePath: string, roots: ToolUserRoots): SourceKind | undefined {
  const basename = path.basename(filePath);
  const { claudeUserRoot } = roots;
  if (
    (basename === 'CLAUDE.md' || basename === 'claude.md') &&
    isUnderRoot(filePath, claudeUserRoot)
  ) {
    return SourceKind.ClaudeMd;
  }
  const claudeHooks = path.join(claudeUserRoot, 'hooks');
  if (isUnderRoot(filePath, claudeHooks)) {
    return SourceKind.ClaudeHookFile;
  }
  const claudeRules = path.join(claudeUserRoot, 'rules');
  if (isUnderRoot(filePath, claudeRules) && basename.endsWith('.md')) {
    return SourceKind.ClaudeRulesMd;
  }
  if (
    (basename === 'settings.json' || basename === 'settings.local.json') &&
    isUnderRoot(filePath, claudeUserRoot)
  ) {
    return SourceKind.ClaudeSettingsJson;
  }
  return undefined;
}

export const claudePresetDefinition: SourcePresetDefinition = {
  id: 'claude',
  kinds: [
    ...SHARED_SOURCE_KINDS,
    SourceKind.ClaudeMd,
    SourceKind.ClaudeSettingsJson,
    SourceKind.ClaudeRulesMd,
    SourceKind.ClaudeHookFile,
    SourceKind.AgentsSkillMd,
    SourceKind.ClaudeSkillMd,
    SourceKind.CodexSkillMd,
  ],
  workspaceGlobContributions: [...WORKSPACE_GLOBS],
  homePathTasks: [...claudeHomePathTasks],
  classifyWorkspacePath,
  classifyUserPath,
};
