import type { ArtifactCreationPlan } from './artifactOperation';
import type { SourceCategory } from './model';
import type { SourcePresetId } from '../../../shared/sourcePresetId';
import type { ToolUserRoots } from '../../../shared/toolUserRoots';

/** Describes what user input to collect for this artifact type. */
export interface ArtifactInputDescriptor {
  /** Label shown in the input box title. Defaults to `'Name'` in the wizard. */
  readonly title?: string;
  /** Prompt / placeholder text for the input box. */
  readonly prompt: string;
  /** Extra validation beyond `validateSourceFileBaseName`. Return `null` if valid. */
  readonly validate?: (value: string) => string | null;
}

/** Context passed to `ArtifactTemplate.plan()`. */
export interface ArtifactPlannerContext {
  /** User-entered name (trimmed, base-validated by the caller). */
  readonly userInput: string;
  /** Absolute workspace root, or `''` when no workspace is open. */
  readonly workspaceRoot: string;
  /** Tool-specific user-home directories. */
  readonly roots: ToolUserRoots;
}

/**
 * A template for creating a new preset-aware artifact.
 * One template = one concrete artifact type in one preset at one scope.
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

  /** Describes what user input to collect. */
  readonly input: ArtifactInputDescriptor;

  /**
   * Pure function that produces a creation plan from validated user input.
   * No I/O allowed — the executor handles all filesystem mutations.
   */
  readonly plan: (
    ctx: ArtifactPlannerContext
  ) => { ok: true; plan: ArtifactCreationPlan } | { ok: false; error: string };
}
