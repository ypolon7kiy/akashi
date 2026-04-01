/**
 * Core domain types for the diff viewer.
 *
 * We intentionally keep this lean — diff2html handles parsing and rendering.
 * These types represent the domain concepts we pass between layers.
 */

/** Diff comparison mode the user can select. */
export type DiffTarget =
  | { readonly kind: 'working' }
  | { readonly kind: 'staged' }
  | { readonly kind: 'commit'; readonly ref: string }
  | { readonly kind: 'range'; readonly from: string; readonly to: string };

/** The raw diff result returned from git. */
export interface DiffResult {
  readonly target: DiffTarget;
  readonly raw: string;
  readonly isEmpty: boolean;
}

/** Output format for diff2html rendering. */
export type DiffOutputFormat = 'line-by-line' | 'side-by-side';
