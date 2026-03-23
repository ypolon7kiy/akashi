import type { SourceCategory } from './model';
import type { SourcePresetId } from './sourcePresetDefinition';
import type { ToolUserRoots } from './toolUserRoots';

/**
 * A template for creating a new preset-aware artifact (file) on the file system.
 * One template = one concrete file type in one preset at one scope.
 *
 * Templates are defined alongside their preset's discovery rules in
 * `presets/<name>/artifactTemplates.ts` and registered centrally.
 */
export interface ArtifactTemplate {
  /** Stable id: `<presetId>/<category>/<scope>`, e.g. `claude/skill/workspace`. */
  readonly id: string;
  /** Display label shown in context menus, e.g. "New Skill". */
  readonly label: string;
  readonly presetId: SourcePresetId;
  readonly category: SourceCategory;
  readonly scope: 'workspace' | 'user';
  /**
   * Pure function that returns the absolute target directory.
   * Returns an empty string when `workspaceRoot` is needed but was not provided —
   * the host handler treats that as "no workspace open" and returns an error.
   */
  readonly targetDirResolver: (workspaceRoot: string, roots: ToolUserRoots) => string;
  /** Extension to append when the user omits it, e.g. `'.md'`. */
  readonly suggestedExtension: string;
  /**
   * When set, the user's input becomes a **folder name** and this value becomes the fixed
   * file name inside it. E.g. `'SKILL.md'` → creates `<resolvedDir>/<userInput>/SKILL.md`.
   * Use for presets that require a named folder per artifact (Antigravity skills).
   */
  readonly fixedFileName?: string;
  /**
   * Starter content for the created file.
   * - `string`: written verbatim.
   * - `(fileName: string) => string`: called with the final file name (including extension).
   */
  readonly initialContent: string | ((fileName: string) => string);
}
