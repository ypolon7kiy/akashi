import type { SourceIndexSnapshot, SourceKind, SourceScope } from '../domain/model';
import type { SourceDocument, SourceRecord } from '../domain/model';

export interface DiscoveredSource {
  id: string;
  path: string;
  kind: SourceKind;
  scope: SourceScope;
  origin: 'workspace' | 'user';
}

export interface SourceScanOptions {
  includeHomeConfig?: boolean;
}

export interface WorkspaceSourceScannerPort {
  scanWorkspace(options?: SourceScanOptions): Promise<DiscoveredSource[]>;
}

/** Reads file contents from disk (e.g. VS Code workspace FS). Not parsing. */
export interface SourceReaderPort {
  readUtf8(path: string): Promise<string>;
}

/**
 * Normalizes already-read UTF-8 (`SourceDocument.raw`) into blocks for the index.
 * Use different implementations (or a composite) per file shape: prose vs JSON/TOML, etc.
 */
export interface SourceParserPort {
  parse(document: SourceDocument): SourceRecord;
}

export interface SourcesSnapshotStorePort {
  load(): Promise<SourceIndexSnapshot | null>;
  save(snapshot: SourceIndexSnapshot): Promise<void>;
}

export interface SourcesLoggerPort {
  info(message: string): void;
}
