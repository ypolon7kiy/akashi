import type { SourceFacetTag, SourceIndexSnapshot, SourceKind, SourceScope } from '../domain/model';

export interface DiscoveredSource {
  id: string;
  path: string;
  kind: SourceKind;
  scope: SourceScope;
  origin: 'workspace' | 'user';
  /** Facet tags built at scan time; propagated to index rows and snapshots unchanged. */
  tags: readonly SourceFacetTag[];
}

export interface SourceScanOptions {
  includeHomeConfig?: boolean;
  /** When empty, the scanner yields no sources. */
  allowedKinds: ReadonlySet<SourceKind>;
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
