import * as path from 'node:path';
import type { ArtifactTemplate, ArtifactPlannerContext } from './artifactTemplate';
import type { SourceCategory } from './model';
import type { SourcePresetId } from '../../../shared/sourcePresetId';
import type { ToolUserRoots } from '../../../shared/toolUserRoots';

/**
 * Config for the most common case: create a single file with an auto-appended extension.
 */
export interface SimpleFileTemplateConfig {
  readonly id: string;
  readonly label: string;
  readonly presetId: SourcePresetId;
  readonly category: SourceCategory;
  readonly scope: 'workspace' | 'user';
  /** Pure function returning the absolute target directory. */
  readonly targetDir: (workspaceRoot: string, roots: ToolUserRoots) => string;
  /** Extension to append when the user omits it, e.g. `'.md'`. */
  readonly suggestedExtension: string;
  /** Starter content — string or function of the final file name (with extension). */
  readonly initialContent: string | ((fileName: string) => string);
}

/**
 * Config for folder-based artifacts: user input becomes a folder name,
 * a fixed file is created inside (e.g. Antigravity `<name>/SKILL.md`).
 */
export interface FolderFileTemplateConfig {
  readonly id: string;
  readonly label: string;
  readonly presetId: SourcePresetId;
  readonly category: SourceCategory;
  readonly scope: 'workspace' | 'user';
  readonly targetDir: (workspaceRoot: string, roots: ToolUserRoots) => string;
  /** Fixed file name inside the user-named folder. */
  readonly fixedFileName: string;
  /** Starter content — string or function of the folder name. */
  readonly initialContent: string | ((folderName: string) => string);
}

/** Create an `ArtifactTemplate` for the standard single-file pattern. */
export function simpleFileTemplate(cfg: SimpleFileTemplateConfig): ArtifactTemplate {
  return {
    id: cfg.id,
    label: cfg.label,
    presetId: cfg.presetId,
    category: cfg.category,
    scope: cfg.scope,
    input: { prompt: 'File name (extension added if omitted)' },
    plan(ctx: ArtifactPlannerContext) {
      const dir = cfg.targetDir(ctx.workspaceRoot, ctx.roots);
      if (!dir) {
        return { ok: false, error: 'No target directory could be determined.' };
      }
      const name = ctx.userInput.trim();
      if (!name) {
        return { ok: false, error: 'Enter a name.' };
      }
      const withExt =
        cfg.suggestedExtension && !name.endsWith(cfg.suggestedExtension)
          ? `${name}${cfg.suggestedExtension}`
          : name;
      const absolutePath = path.join(dir, withExt);
      const content =
        typeof cfg.initialContent === 'function'
          ? cfg.initialContent(withExt)
          : cfg.initialContent;
      return {
        ok: true,
        plan: { operations: [{ type: 'writeFile', absolutePath, content }] },
      };
    },
  };
}

/** Create an `ArtifactTemplate` for the folder + fixed-file pattern. */
export function folderFileTemplate(cfg: FolderFileTemplateConfig): ArtifactTemplate {
  return {
    id: cfg.id,
    label: cfg.label,
    presetId: cfg.presetId,
    category: cfg.category,
    scope: cfg.scope,
    input: { prompt: `Folder name (creates ${cfg.fixedFileName} inside)` },
    plan(ctx: ArtifactPlannerContext) {
      const dir = cfg.targetDir(ctx.workspaceRoot, ctx.roots);
      if (!dir) {
        return { ok: false, error: 'No target directory could be determined.' };
      }
      const folderName = ctx.userInput.trim();
      if (!folderName) {
        return { ok: false, error: 'Enter a name.' };
      }
      const absolutePath = path.join(dir, folderName, cfg.fixedFileName);
      const content =
        typeof cfg.initialContent === 'function'
          ? cfg.initialContent(folderName)
          : cfg.initialContent;
      return {
        ok: true,
        plan: { operations: [{ type: 'writeFile', absolutePath, content }] },
      };
    },
  };
}
