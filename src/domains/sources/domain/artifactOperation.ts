/**
 * Discrete filesystem mutations produced by an artifact template's `plan()` function.
 * Pure data — no I/O. The executor in `infrastructure/executeCreationPlan.ts` performs the writes.
 */

/** Create a new file (parent directories created automatically). */
export interface WriteFileOp {
  readonly type: 'writeFile';
  /** Absolute path to the file to create. Must not already exist. */
  readonly absolutePath: string;
  /** UTF-8 content for the new file. */
  readonly content: string;
}

/**
 * Merge a value into a JSON file at a given path.
 * If the file does not exist, it is created with `{}` as the base.
 *
 * Merge semantics at `jsonPath`:
 * - object + object → shallow merge
 * - array + array → append
 * - otherwise → overwrite
 */
export interface JsonMergeOp {
  readonly type: 'jsonMerge';
  /** Absolute path to the JSON file. */
  readonly absolutePath: string;
  /** Dot-separated path into the JSON tree, e.g. `'hooks.PostToolUse'`. Empty string for root merge. */
  readonly jsonPath: string;
  /** The value to set or merge at `jsonPath`. */
  readonly value: unknown;
  /** Shown in a modal confirmation before the merge is applied. */
  readonly description: string;
}

export type ArtifactOperation = WriteFileOp | JsonMergeOp;

/**
 * A creation plan returned by `ArtifactTemplate.plan()`.
 * Contains one or more ordered operations for the executor to apply.
 */
export interface ArtifactCreationPlan {
  /** Ordered list of operations. At least one is required. */
  readonly operations: readonly [ArtifactOperation, ...ArtifactOperation[]];
  /** File to open in the editor after creation. Falls back to the first WriteFileOp path. */
  readonly openAfterCreate?: string;
}
