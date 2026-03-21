import * as path from 'node:path';
import { SourceKind } from '../../domain/model';
import type { SourcePresetDefinition } from '../../domain/sourcePresetDefinition';
import type { ToolUserRoots } from '../../domain/toolUserRoots';
import { SHARED_SOURCE_KINDS } from '../_shared/kinds';
import { isUnderRoot } from '../_shared/classifyPaths';
import { codexHomePathTasks } from './homePathTasks';

const WORKSPACE_GLOBS = [
  {
    glob: '**/.codex/AGENTS.md',
    kinds: [SourceKind.AgentsMd] as const,
  },
  {
    glob: '**/.codex/agents.md',
    kinds: [SourceKind.AgentsMd] as const,
  },
  {
    glob: '**/.codex/config.toml',
    kinds: [SourceKind.CodexConfigToml] as const,
  },
  {
    glob: '**/AGENTS.override.md',
    kinds: [SourceKind.CodexAgentsOverrideMd] as const,
  },
  {
    glob: '**/.codex/rules/*.rules',
    kinds: [SourceKind.CodexRulesFile] as const,
  },
  {
    glob: '**/.codex/skills/**/SKILL.md',
    kinds: [SourceKind.CodexSkillMd] as const,
  },
] as const;

function classifyWorkspacePath(filePath: string): SourceKind | undefined {
  const basename = path.basename(filePath);
  const normalized = filePath.replace(/\\/g, '/');
  if (basename === 'config.toml' && normalized.includes('/.codex/')) {
    return SourceKind.CodexConfigToml;
  }
  if (basename.endsWith('.rules') && normalized.includes('/.codex/rules/')) {
    return SourceKind.CodexRulesFile;
  }
  return undefined;
}

function classifyUserPath(filePath: string, roots: ToolUserRoots): SourceKind | undefined {
  const basename = path.basename(filePath);
  const { codexUserRoot } = roots;
  if (basename === 'config.toml' && isUnderRoot(filePath, codexUserRoot)) {
    return SourceKind.CodexConfigToml;
  }
  const codexRules = path.join(codexUserRoot, 'rules');
  if (basename.endsWith('.rules') && isUnderRoot(filePath, codexRules)) {
    return SourceKind.CodexRulesFile;
  }
  return undefined;
}

export const codexPresetDefinition: SourcePresetDefinition = {
  id: 'codex',
  kinds: [
    ...SHARED_SOURCE_KINDS,
    SourceKind.CodexConfigToml,
    SourceKind.CodexAgentsOverrideMd,
    SourceKind.CodexRulesFile,
    SourceKind.CodexSkillMd,
  ],
  workspaceGlobContributions: [...WORKSPACE_GLOBS],
  homePathTasks: [...codexHomePathTasks],
  classifyWorkspacePath,
  classifyUserPath,
};
