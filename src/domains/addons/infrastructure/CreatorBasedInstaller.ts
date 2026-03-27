/**
 * Bridges the addons domain to the existing ArtifactCreator + executeCreationPlan
 * infrastructure. Reuses the same code paths that the sidebar wizard, graph context
 * menu, and programmatic `akashi.sources.createArtifact` command use.
 */

import { readdir, rmdir, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { ToolUserRoots } from '../../../shared/toolUserRoots';
import type { WriteFileOp } from '../../sources/domain/artifactOperation';
import { findArtifactCreatorById } from '../../sources/registerSourcePresets';
import { executeCreationPlan } from '../../sources/infrastructure/executeCreationPlan';

export interface InstallViaCreatorResult {
  readonly ok: boolean;
  readonly createdPaths: readonly string[];
  readonly error?: string;
}

/**
 * Install an addon by driving an existing ArtifactCreator non-interactively.
 *
 * @param creatorId  Registered creator id, e.g. `'claude/skill/workspace'`
 * @param pluginName Name passed as `userInput` to the creator
 * @param description Optional description (used by SkillFileCreator)
 * @param workspaceRoot Project root for workspace-scope creators
 * @param roots User-home directories for user-scope creators
 */
export async function installViaCreator(
  creatorId: string,
  pluginName: string,
  description: string,
  workspaceRoot: string,
  roots: ToolUserRoots
): Promise<InstallViaCreatorResult> {
  const creator = findArtifactCreatorById(creatorId);
  if (!creator) {
    return { ok: false, createdPaths: [], error: `Unknown creator: ${creatorId}` };
  }

  const planned = creator.planWithProvidedInput(
    { workspaceRoot, roots },
    { userInput: pluginName, description }
  );

  if (planned.kind === 'error') {
    return { ok: false, createdPaths: [], error: planned.error };
  }
  if (planned.kind === 'cancelled') {
    return { ok: false, createdPaths: [], error: 'Cancelled' };
  }

  const result = await executeCreationPlan(planned.plan);
  if (!result.ok) {
    return { ok: false, createdPaths: [], error: result.error };
  }

  // Extract created file paths from plan operations for the installation ledger
  const createdPaths = planned.plan.operations
    .filter((op): op is WriteFileOp => op.type === 'writeFile')
    .map((op) => op.absolutePath);

  return { ok: true, createdPaths };
}

/**
 * Remove files that were tracked in the installation ledger.
 * For folder-layout skills (e.g. skill-name/SKILL.md), also removes
 * the parent directory if it becomes empty after file deletion.
 */
export async function removeTrackedFiles(
  paths: readonly string[]
): Promise<{ ok: boolean; error?: string }> {
  const errors: string[] = [];
  for (const filePath of paths) {
    try {
      await unlink(filePath);
      // Try to remove the parent dir if it's now empty (folder-layout cleanup)
      await tryRemoveEmptyDir(dirname(filePath));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${filePath}: ${msg}`);
    }
  }
  if (errors.length > 0) {
    return { ok: false, error: errors.join('; ') };
  }
  return { ok: true };
}

/** Remove a directory only if it's empty. Silently ignores errors. */
async function tryRemoveEmptyDir(dirPath: string): Promise<void> {
  try {
    const entries = await readdir(dirPath);
    if (entries.length === 0) {
      await rmdir(dirPath);
    }
  } catch {
    // Directory doesn't exist or isn't empty — fine
  }
}
