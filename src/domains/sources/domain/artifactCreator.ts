import type { ArtifactCreatorMenuEntry } from '../../../shared/types/artifactCreatorMenuEntry';
import type { ArtifactCreationPlan } from './artifactOperation';
import type { SourceCategory } from './model';
import type { SourcePresetId } from '../../../shared/sourcePresetId';
import type { ToolUserRoots } from '../../../shared/toolUserRoots';

/** Context for planning and executing artifact creation (workspace + tool home roots). */
export interface CreatorContext {
  readonly workspaceRoot: string;
  readonly roots: ToolUserRoots;
}

/**
 * Arguments supplied when creating without the interactive wizard
 * (e.g. `akashi.sources.createArtifact` from another command).
 */
export interface ArtifactCreatorArgs {
  readonly userInput: string;
  readonly hookLifecycleEvent?: string;
  readonly hookMatcher?: string;
}

export type CreatorResult =
  | { readonly kind: 'plan'; readonly plan: ArtifactCreationPlan }
  | { readonly kind: 'error'; readonly error: string }
  | { readonly kind: 'cancelled' };

/**
 * One preset-scoped artifact kind. Subclasses own UX in {@link run} and expose
 * {@link planWithProvidedInput} for programmatic callers and tests.
 *
 * This base class is pure (no vscode import). Concrete subclasses in
 * domain/creators/ and presets/(preset)/creators/ import vscode for interactive
 * UI (showInputBox, showQuickPick, etc.). They are host-side creation
 * workflows, intentionally co-located with preset domain definitions rather
 * than placed in the application/ or ui/ layer.
 */
export abstract class ArtifactCreator implements ArtifactCreatorMenuEntry {
  abstract readonly id: string;
  abstract readonly label: string;
  abstract readonly presetId: SourcePresetId;
  abstract readonly category: SourceCategory;
  abstract readonly scope: 'workspace' | 'user';

  /**
   * Interactive flow: prompt the user, then return a plan (or cancel).
   * Each subclass calls VS Code UI APIs as needed.
   */
  abstract run(ctx: CreatorContext): Promise<CreatorResult>;

  /**
   * Non-interactive planning (wizard bypass, graph/command callers, unit tests).
   */
  abstract planWithProvidedInput(ctx: CreatorContext, args: ArtifactCreatorArgs): CreatorResult;
}
