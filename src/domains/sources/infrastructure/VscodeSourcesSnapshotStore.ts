import type * as vscode from 'vscode';
import type { SourceIndexSnapshot } from '../domain/model';
import type { SourcesSnapshotStorePort } from '../application/ports';

/** Bumped when persisted snapshot contract changes (v6: `origin` → `locality`, removed `scope`). */
const SOURCES_SNAPSHOT_KEY = 'sources.lastSnapshot.v6';

export class VscodeSourcesSnapshotStore implements SourcesSnapshotStorePort {
  public constructor(private readonly context: vscode.ExtensionContext) {}

  public load(): Promise<SourceIndexSnapshot | null> {
    return Promise.resolve(
      this.context.globalState.get<SourceIndexSnapshot | null>(SOURCES_SNAPSHOT_KEY, null)
    );
  }

  public async save(snapshot: SourceIndexSnapshot): Promise<void> {
    await this.context.globalState.update(SOURCES_SNAPSHOT_KEY, snapshot);
  }
}
