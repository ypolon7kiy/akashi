import * as path from 'node:path';
import { SourceKind } from '../../domain/model';
import type { SourcePresetDefinition } from '../../domain/sourcePresetDefinition';
import type { ToolUserRoots } from '../../domain/toolUserRoots';
import { SHARED_SOURCE_KINDS } from '../_shared/kinds';
import { isUnderRoot } from '../_shared/classifyPaths';
import { antigravityHomePathTasks } from './homePathTasks';

const WORKSPACE_GLOBS = [
  {
    glob: '**/.agent/skills/**/SKILL.md',
    kinds: [SourceKind.GeminiAntigravitySkillMd] as const,
  },
] as const;

function classifyWorkspacePath(filePath: string): SourceKind | undefined {
  const basename = path.basename(filePath);
  if (basename === 'GEMINI.md' || basename === 'gemini.md') {
    return SourceKind.GeminiMd;
  }
  return undefined;
}

function classifyUserPath(filePath: string, roots: ToolUserRoots): SourceKind | undefined {
  const basename = path.basename(filePath);
  if (
    (basename === 'GEMINI.md' || basename === 'gemini.md') &&
    isUnderRoot(filePath, roots.geminiUserRoot)
  ) {
    return SourceKind.GeminiMd;
  }
  return undefined;
}

export const antigravityPresetDefinition: SourcePresetDefinition = {
  id: 'antigravity',
  kinds: [
    ...SHARED_SOURCE_KINDS,
    SourceKind.GeminiMd,
    SourceKind.AgentsSkillMd,
    SourceKind.GeminiAntigravitySkillMd,
  ],
  workspaceGlobContributions: [...WORKSPACE_GLOBS],
  homePathTasks: [...antigravityHomePathTasks],
  classifyWorkspacePath,
  classifyUserPath,
};
