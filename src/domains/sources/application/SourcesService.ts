import type { SourceIndexSnapshot, SourceRecord } from '../domain/model';
import type {
  SourcesLoggerPort,
  SourceParserPort,
  SourceReaderPort,
  SourcesSnapshotStorePort,
  WorkspaceSourceScannerPort,
} from './ports';

export interface IndexWorkspaceRequest {
  includeHomeConfig?: boolean;
}

export class SourcesService {
  private snapshot: SourceIndexSnapshot | null = null;
  private indexingPromise: Promise<SourceIndexSnapshot> | null = null;

  public constructor(
    private readonly scanner: WorkspaceSourceScannerPort,
    private readonly reader: SourceReaderPort,
    private readonly parser: SourceParserPort,
    private readonly snapshotStore: SourcesSnapshotStorePort,
    private readonly logger: SourcesLoggerPort
  ) {}

  public async indexWorkspace(request: IndexWorkspaceRequest = {}): Promise<SourceIndexSnapshot> {
    if (this.indexingPromise) {
      this.logger.info('[Akashi][Sources] indexWorkspace reusing in-flight indexing promise.');
      return this.indexingPromise;
    }
    this.logger.info(
      `[Akashi][Sources] indexWorkspace start includeHomeConfig=${request.includeHomeConfig ?? false}.`
    );

    this.indexingPromise = this.performIndexWorkspace(request);
    try {
      return await this.indexingPromise;
    } finally {
      this.indexingPromise = null;
    }
  }

  public async listSources(): Promise<SourceRecord[]> {
    const snapshot = (await this.getLastSnapshot()) ?? (await this.indexWorkspace());
    this.logger.info(
      `[Akashi][Sources] listSources using snapshot generatedAt=${snapshot.generatedAt} sourceCount=${snapshot.sourceCount}.`
    );
    return this.filterRecords(snapshot.records);
  }

  public async getSourceById(id: string): Promise<SourceRecord | null> {
    const snapshot = (await this.getLastSnapshot()) ?? (await this.indexWorkspace());
    this.logger.info(
      `[Akashi][Sources] getSourceById using snapshot generatedAt=${snapshot.generatedAt} sourceCount=${snapshot.sourceCount}.`
    );
    return snapshot.records.find((record) => record.document.id === id) ?? null;
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

  private filterRecords(records: SourceRecord[]): SourceRecord[] {
    return records;
  }

  private async performIndexWorkspace(
    request: IndexWorkspaceRequest = {}
  ): Promise<SourceIndexSnapshot> {
    const discovered = await this.scanner.scanWorkspace({
      includeHomeConfig: request.includeHomeConfig,
    });
    const records = await Promise.all(
      discovered.map(async (item) => {
        const raw = await this.reader.readUtf8(item.path);
        return this.parser.parse({
          id: item.id,
          path: item.path,
          kind: item.kind,
          scope: item.scope,
          origin: item.origin,
          raw,
        });
      })
    );

    const filtered = this.filterRecords(records);
    const snapshot: SourceIndexSnapshot = {
      generatedAt: new Date().toISOString(),
      sourceCount: filtered.length,
      records: filtered,
    };
    this.snapshot = snapshot;
    await this.snapshotStore.save(snapshot);
    this.logger.info(
      `[Akashi][Sources] indexWorkspace completed and persisted snapshot generatedAt=${snapshot.generatedAt} sourceCount=${snapshot.sourceCount}.`
    );
    return snapshot;
  }
}
