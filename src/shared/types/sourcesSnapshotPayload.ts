/**
 * Sources index snapshot shape for host ↔ webview messaging and graph panel.
 * Kept in `shared/` so domains do not depend on `sidebar/bridge`.
 * Tag shape aligns structurally with `IndexedSourceEntry.tags` in the sources domain.
 */

import type { ArtifactCreatorMenuEntry } from './artifactCreatorMenuEntry';

export interface SourceFacetTagPayload {
  readonly type: string;
  readonly value: string;
}

export interface WorkspaceFolderInfo {
  readonly name: string;
  readonly path: string;
}

/** Artifact linkage DTO for graph/sidebar compound display. */
export interface ArtifactDescriptor {
  readonly id: string;
  readonly presetId: string;
  readonly category: string;
  readonly locality: 'workspace' | 'user';
  readonly shape: string;
  readonly memberRecordIds: readonly string[];
  readonly primaryPath: string;
}

export interface SourceDescriptor {
  /** Stable index row id; not necessarily equal to `path` when one path matches multiple presets. */
  readonly id: string;
  readonly path: string;
  /** Preset that owns the discovery rule for this path. */
  readonly preset: string;
  /** Artifact category (context, rule, skill, …). */
  readonly category: string;
  /** Workspace-local vs user-home. */
  readonly locality: 'workspace' | 'user';
  /** Facet tags: locality, category, preset (mirrors `IndexedSourceEntry.tags`). */
  readonly tags: readonly SourceFacetTagPayload[];
  readonly metadata: { byteLength: number; updatedAt: string };
}

/** Payload for get-snapshot (non-null) and index-workspace responses. */
export interface SourcesSnapshotPayload {
  readonly generatedAt: string;
  readonly sourceCount: number;
  readonly records: SourceDescriptor[];
  readonly workspaceFolders: WorkspaceFolderInfo[];
  /** Optional: graph panel merges this for artifact context menu (sidebar snapshots omit it). */
  readonly artifactCreators?: readonly ArtifactCreatorMenuEntry[];
  /** Artifact linkage for graph/sidebar compound display. Absent until v7. */
  readonly artifacts?: readonly ArtifactDescriptor[];
}

/**
 * Minimal guard: non-null object (not an array). Full shape is trusted from our extension host.
 */
export function isSourcesSnapshotPayload(value: unknown): value is SourcesSnapshotPayload {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
