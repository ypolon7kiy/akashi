/**
 * Abstract artifact entity: a read-side projection that groups one or more
 * `IndexedSourceEntry` records into a single logical artifact.
 *
 * The linker in `artifactLinker.ts` builds these from structural path analysis
 * after indexing completes — no file content is read.
 */

import type { SourceLocality } from './artifactKind';
import type { SourcePresetId } from '../../../shared/sourcePresetId';
import type { SourceCategory } from './model';

/**
 * Structural shape of an artifact, derived from creator analysis.
 *
 * - `single-file` — One standalone file (most common)
 * - `folder-file` — Skill folder: SKILL.md marker plus any sibling files under the same folder
 * - `file-json`   — Standalone file + JSON entry in a config file (hooks)
 * - `json-only`   — Pure JSON entry, no standalone file (MCP configs)
 */
export type ArtifactShape = 'single-file' | 'folder-file' | 'file-json' | 'json-only';

/**
 * One logical artifact discovered in the index.
 * Groups one or more `IndexedSourceEntry` records into a coherent unit.
 */
export interface IndexedArtifact {
  /** Deterministic id computed from constituent member record ids. */
  readonly id: string;
  readonly presetId: SourcePresetId;
  readonly category: SourceCategory;
  readonly locality: SourceLocality;
  readonly shape: ArtifactShape;
  /**
   * Record ids of `IndexedSourceEntry` rows belonging to this artifact.
   * Single-file: exactly one. Folder-file: one (marker only) or more (marker + siblings). Compound: script + config.
   */
  readonly memberRecordIds: readonly string[];
  /** The "primary" file path — the file a user would open to work on this artifact. */
  readonly primaryPath: string;
}
