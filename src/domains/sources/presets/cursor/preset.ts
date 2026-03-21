import * as path from 'node:path';
import { SourceKind } from '../../domain/model';
import type { SourcePresetDefinition } from '../../domain/sourcePresetDefinition';
import type { ToolUserRoots } from '../../domain/toolUserRoots';
import { SHARED_SOURCE_KINDS } from '../_shared/kinds';
import { isUnderRoot } from '../_shared/classifyPaths';
import { cursorHomePathTasks } from './homePathTasks';

const WORKSPACE_GLOBS = [
  {
    glob: '**/.cursor/rules/*.mdc',
    kinds: [SourceKind.CursorRulesMdc] as const,
  },
  {
    glob: '**/.cursor/mcp.json',
    kinds: [SourceKind.CursorMcpJson] as const,
  },
  {
    glob: '**/.cursor/skills/**/SKILL.md',
    kinds: [SourceKind.CursorSkillMd] as const,
  },
] as const;

function classifyWorkspacePath(filePath: string): SourceKind | undefined {
  const basename = path.basename(filePath);
  const normalized = filePath.replace(/\\/g, '/');
  if (basename === '.cursorrules') {
    return SourceKind.CursorLegacyRules;
  }
  if (basename.endsWith('.mdc') && normalized.includes('/.cursor/rules/')) {
    return SourceKind.CursorRulesMdc;
  }
  if (basename === 'mcp.json' && normalized.includes('/.cursor/')) {
    return SourceKind.CursorMcpJson;
  }
  return undefined;
}

function classifyUserPath(filePath: string, roots: ToolUserRoots): SourceKind | undefined {
  const basename = path.basename(filePath);
  const { cursorUserRoot } = roots;
  if (basename === '.cursorrules') {
    return SourceKind.CursorLegacyRules;
  }
  const cursorRules = path.join(cursorUserRoot, 'rules');
  if (basename.endsWith('.mdc') && isUnderRoot(filePath, cursorRules)) {
    return SourceKind.CursorRulesMdc;
  }
  if (basename === 'mcp.json' && isUnderRoot(filePath, cursorUserRoot)) {
    return SourceKind.CursorMcpJson;
  }
  return undefined;
}

export const cursorPresetDefinition: SourcePresetDefinition = {
  id: 'cursor',
  kinds: [
    ...SHARED_SOURCE_KINDS,
    SourceKind.CursorLegacyRules,
    SourceKind.CursorRulesMdc,
    SourceKind.CursorMcpJson,
    SourceKind.AgentsSkillMd,
    SourceKind.CursorSkillMd,
    SourceKind.ClaudeSkillMd,
    SourceKind.CodexSkillMd,
  ],
  workspaceGlobContributions: [...WORKSPACE_GLOBS],
  homePathTasks: [...cursorHomePathTasks],
  classifyWorkspacePath,
  classifyUserPath,
};
