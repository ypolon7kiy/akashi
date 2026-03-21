import { SourceKind } from '../domain/model';
import type { ToolUserRoots } from '../domain/toolUserRoots';
import { SOURCE_PRESET_DEFINITIONS } from '../registerSourcePresets';
import {
  classifyCopilotInstructionsPath,
  classifyUniversalUserPath,
  classifyUniversalWorkspacePath,
  classifyUserSkillMdPath,
  classifyWorkspaceSkillMdPath,
} from '../presets/_shared/classifyPaths';

/** Workspace-relative path classification (legacy order; see `_shared/classifyPaths` for SKILL.md precedence). */
export function inferWorkspaceSourceKind(filePath: string): SourceKind {
  const u = classifyUniversalWorkspacePath(filePath);
  if (u !== undefined) {
    return u;
  }
  const sk = classifyWorkspaceSkillMdPath(filePath);
  if (sk !== undefined) {
    return sk;
  }
  for (const preset of SOURCE_PRESET_DEFINITIONS) {
    const k = preset.classifyWorkspacePath(filePath);
    if (k !== undefined) {
      return k;
    }
  }
  const copilot = classifyCopilotInstructionsPath(filePath);
  if (copilot !== undefined) {
    return copilot;
  }
  return SourceKind.Unknown;
}

/** User-home path classification (legacy order). */
export function inferUserSourceKind(filePath: string, roots: ToolUserRoots): SourceKind {
  const u = classifyUniversalUserPath(filePath);
  if (u !== undefined) {
    return u;
  }
  const sk = classifyUserSkillMdPath(filePath, roots);
  if (sk !== undefined) {
    return sk;
  }
  for (const preset of SOURCE_PRESET_DEFINITIONS) {
    const k = preset.classifyUserPath(filePath, roots);
    if (k !== undefined) {
      return k;
    }
  }
  const copilot = classifyCopilotInstructionsPath(filePath);
  if (copilot !== undefined) {
    return copilot;
  }
  return SourceKind.Unknown;
}
