/**
 * Shape of each indexed source and snapshot payload fields shared by host and sidebar webview.
 */

export interface WorkspaceFolderInfo {
  readonly name: string;
  readonly path: string;
}

export interface SourceDescriptor {
  readonly id: string;
  readonly path: string;
  readonly kind: string;
  /** Presets whose kind list includes this file (derived from `SOURCE_PRESET_DEFINITIONS` / `SOURCE_KINDS_BY_PRESET` on the host). */
  readonly presets: readonly string[];
  readonly scope: string;
  readonly origin: 'workspace' | 'user';
  readonly metadata: { byteLength: number; updatedAt: string };
}

/** Payload for get-snapshot (non-null) and index-workspace responses. */
export interface SourcesSnapshotPayload {
  readonly generatedAt: string;
  readonly sourceCount: number;
  readonly records: SourceDescriptor[];
  readonly workspaceFolders: WorkspaceFolderInfo[];
}

export function isSourcesSnapshotPayload(value: unknown): value is SourcesSnapshotPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const o = value as Record<string, unknown>;
  return (
    typeof o.generatedAt === 'string' &&
    typeof o.sourceCount === 'number' &&
    Array.isArray(o.records) &&
    Array.isArray(o.workspaceFolders)
  );
}
