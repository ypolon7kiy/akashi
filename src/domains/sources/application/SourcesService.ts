import type { IndexedSourceEntry, SourceIndexSnapshot, SourceKind } from '../domain/model';
import type {
  SourcesLoggerPort,
  SourceFileStatsPort,
  SourcesSnapshotStorePort,
  WorkspaceSourceScannerPort,
} from './ports';

export interface IndexWorkspaceRequest {
  includeHomeConfig?: boolean;
  allowedKinds?: ReadonlySet<SourceKind>;
}

export class SourcesService {
  private snapshot: SourceIndexSnapshot | null = null;
  private indexingPromise: Promise<SourceIndexSnapshot> | null = null;

  public constructor(
    private readonly scanner: WorkspaceSourceScannerPort,
    private readonly fileStats: SourceFileStatsPort,
    private readonly snapshotStore: SourcesSnapshotStorePort,
    private readonly logger: SourcesLoggerPort,
    private readonly getAllowedSourceKinds: () => ReadonlySet<SourceKind>
  ) {}

  public async indexWorkspace(request: IndexWorkspaceRequest = {}): Promise<SourceIndexSnapshot> {
    if (this.indexingPromise) {
      this.logger.info('[Akashi][Sources] indexWorkspace reusing in-flight indexing promise.');
      return this.indexingPromise;
    }
    const allowedPreview = (request.allowedKinds ?? this.getAllowedSourceKinds()).size;
    this.logger.info(
      `[Akashi][Sources] indexWorkspace start includeHomeConfig=${request.includeHomeConfig ?? false} allowedKindCount=${allowedPreview}.`
    );

    this.indexingPromise = this.performIndexWorkspace(request);
    try {
      return await this.indexingPromise;
    } finally {
      this.indexingPromise = null;
    }
  }

  public async getLastSnapshot(): Promise<SourceIndexSnapshot | null> {
    if (this.snapshot) {
      this.logger.info(
        `[Akashi][Sources] getLastSnapshot hit memory cache generatedAt=${this.snapshot.generatedAt} sourceCount=${this.snapshot.sourceCount}.`
      );
      return this.snapshot;
    }
    this.snapshot = await this.snapshotStore.load();
    if (this.snapshot) {
      this.logger.info(
        `[Akashi][Sources] getLastSnapshot loaded persisted snapshot generatedAt=${this.snapshot.generatedAt} sourceCount=${this.snapshot.sourceCount}.`
      );
    } else {
      this.logger.info('[Akashi][Sources] getLastSnapshot no persisted snapshot found.');
    }
    return this.snapshot;
  }

  private async performIndexWorkspace(
    request: IndexWorkspaceRequest = {}
  ): Promise<SourceIndexSnapshot> {
    const allowedKinds = request.allowedKinds ?? this.getAllowedSourceKinds();
    const discovered = await this.scanner.scanWorkspace({
      includeHomeConfig: request.includeHomeConfig,
      allowedKinds,
    });
    const records: IndexedSourceEntry[] = await Promise.all(
      discovered.map(async (item) => {
        const metadata = await this.fileStats.statFile(item.path);
        const entry: IndexedSourceEntry = {
          id: item.id,
          path: item.path,
          kind: item.kind,
          scope: item.scope,
          origin: item.origin,
          tags: item.tags,
          metadata,
        };
        return entry;
      })
    );

    const snapshot: SourceIndexSnapshot = {
      generatedAt: new Date().toISOString(),
      sourceCount: records.length,
      records,
    };
    this.snapshot = snapshot;
    await this.snapshotStore.save(snapshot);
    this.logger.info(
      `[Akashi][Sources] indexWorkspace completed and persisted snapshot generatedAt=${snapshot.generatedAt} sourceCount=${snapshot.sourceCount}.`
    );
    return snapshot;
  }
}
