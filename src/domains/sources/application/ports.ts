import type { SourceCategory } from '../domain/model';
import type { SourceFacetTag, SourceIndexSnapshot, SourceScope } from '../domain/model';
import type { SourcePresetId } from '../../../shared/sourcePresetId';

export interface DiscoveredSource {
  /** Stable row id (`sourceRecordId` in `shared/sourceRecordId`); not always equal to `path`. */
  id: string;
  path: string;
  preset: SourcePresetId;
  category: SourceCategory;
  scope: SourceScope;
  origin: 'workspace' | 'user';
  /** Facet tags built at scan time; propagated to index rows and snapshots unchanged. */
  tags: readonly SourceFacetTag[];
}

export interface SourceScanOptions {
  includeHomeConfig?: boolean;
  /** When empty, the scanner yields no sources. */
  activePresets: ReadonlySet<SourcePresetId>;
}

export interface WorkspaceSourceScannerPort {
  scanWorkspace(options: SourceScanOptions): Promise<DiscoveredSource[]>;
}

/** File size and mtime from `stat` only — no file content read. */
export interface SourceFileStatsPort {
  statFile(path: string): Promise<{ byteLength: number; updatedAt: string }>;
}

export interface SourcesSnapshotStorePort {
  load(): Promise<SourceIndexSnapshot | null>;
  save(snapshot: SourceIndexSnapshot): Promise<void>;
}

export interface SourcesLoggerPort {
  info(message: string): void;
}
