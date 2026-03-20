import { useEffect, useState } from 'react';
import { getVscodeApi, postRequest } from '../../webview-shared/api';
import {
  isSourcesSnapshotPayload,
  type SourceDescriptor,
  type WorkspaceFolderInfo,
} from '../sourceDescriptor';
import { SidebarMessageType, type SourcesResponseMessage } from '../messages';
import { SourceTreeView } from './SourceTreeView';

interface SidebarPersistedState {
  includeHomeConfig?: boolean;
  sourceCount?: number;
  lastUpdated?: string | null;
}

function readPersistedState(): SidebarPersistedState {
  const vscode = getVscodeApi();
  if (!vscode) {
    return {};
  }
  const raw = vscode.getState() as SidebarPersistedState | null;
  return raw ?? {};
}

function formatSnapshotHint(iso: string | null): string | null {
  if (!iso) {
    return null;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d.toLocaleString();
}

export function SidebarApp(): JSX.Element {
  const persisted = readPersistedState();
  const initialIncludeHomeConfig = persisted.includeHomeConfig ?? false;
  const [sourceCount, setSourceCount] = useState<number>(persisted.sourceCount ?? 0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(persisted.lastUpdated ?? null);
  const [includeHomeConfig, setIncludeHomeConfig] = useState<boolean>(initialIncludeHomeConfig);
  const [isIndexing, setIsIndexing] = useState<boolean>(false);
  const [records, setRecords] = useState<SourceDescriptor[]>([]);
  const [workspaceFolders, setWorkspaceFolders] = useState<WorkspaceFolderInfo[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const applySnapshotPayload = (payload: unknown, options: { touchLastUpdated: boolean }): void => {
    if (payload == null) {
      setRecords([]);
      setWorkspaceFolders([]);
      setSourceCount(0);
      setGeneratedAt(null);
      if (options.touchLastUpdated) {
        setLastUpdated(new Date().toLocaleTimeString());
      }
      return;
    }
    if (isSourcesSnapshotPayload(payload)) {
      setRecords([...payload.records]);
      setWorkspaceFolders([...payload.workspaceFolders]);
      setSourceCount(payload.sourceCount);
      setGeneratedAt(payload.generatedAt);
      if (options.touchLastUpdated) {
        setLastUpdated(new Date().toLocaleTimeString());
      }
    }
  };

  const handleShowExample = (): void => {
    const vscode = getVscodeApi();
    if (vscode) {
      vscode.postMessage({ type: SidebarMessageType.ShowExamplePanel });
    }
  };

  const handleIndexSources = async (): Promise<void> => {
    if (isIndexing) {
      return;
    }
    const vscode = getVscodeApi();
    if (!vscode) {
      return;
    }
    setIsIndexing(true);
    try {
      const response = await postRequest<SourcesResponseMessage>(
        vscode,
        {
          type: SidebarMessageType.SourcesIndexWorkspaceRequest,
          payload: {
            includeHomeConfig,
          },
        },
        SidebarMessageType.SourcesResponse
      );
      if (!response.ok) {
        return;
      }
      applySnapshotPayload(response.payload, { touchLastUpdated: true });
    } catch {
      // Keep existing values on transient indexing failures.
    } finally {
      setIsIndexing(false);
    }
  };

  useEffect(() => {
    const vscode = getVscodeApi();
    if (!vscode) {
      return;
    }
    vscode.setState({
      includeHomeConfig,
      sourceCount,
      lastUpdated,
    } satisfies SidebarPersistedState);
  }, [includeHomeConfig, lastUpdated, sourceCount]);

  useEffect(() => {
    const hydrateAndRefresh = async (): Promise<void> => {
      const vscode = getVscodeApi();
      if (!vscode) {
        return;
      }

      try {
        const snapshotResponse = await postRequest<SourcesResponseMessage>(
          vscode,
          { type: SidebarMessageType.SourcesGetSnapshotRequest },
          SidebarMessageType.SourcesResponse
        );
        if (snapshotResponse.ok) {
          applySnapshotPayload(snapshotResponse.payload, { touchLastUpdated: false });
        }
      } catch {
        // Keep existing UI state and continue with background refresh.
      }

      setIsIndexing(true);
      try {
        const refreshResponse = await postRequest<SourcesResponseMessage>(
          vscode,
          {
            type: SidebarMessageType.SourcesIndexWorkspaceRequest,
            payload: {
              includeHomeConfig: initialIncludeHomeConfig,
            },
          },
          SidebarMessageType.SourcesResponse
        );
        if (!refreshResponse.ok) {
          return;
        }
        applySnapshotPayload(refreshResponse.payload, { touchLastUpdated: true });
      } catch {
        // Keep existing values on transient indexing failures.
      } finally {
        setIsIndexing(false);
      }
    };

    void hydrateAndRefresh();
  }, []);

  const snapshotHint = formatSnapshotHint(generatedAt);

  return (
    <div className="akashi-shell">
      <header className="akashi-header">
        <div>
          <p className="akashi-overline">Akashi</p>
          <h1 className="akashi-title">Source Index</h1>
        </div>
      </header>

      <section className="akashi-card">
        <div className="akashi-row">
          <span className="akashi-label">Sources indexed</span>
          <span className="akashi-value">{sourceCount}</span>
        </div>
        <div className="akashi-divider" />
        <label className="akashi-checkbox">
          <input
            type="checkbox"
            checked={includeHomeConfig}
            disabled={isIndexing}
            onChange={(event) => setIncludeHomeConfig(event.currentTarget.checked)}
          />
          <span>Include home configs</span>
        </label>
        {lastUpdated ? (
          <p className="akashi-muted">Last indexed at {lastUpdated}</p>
        ) : snapshotHint ? (
          <p className="akashi-muted">Saved snapshot · {snapshotHint}</p>
        ) : null}
      </section>

      <section className="akashi-tree-panel" aria-label="Indexed sources">
        <h2 className="akashi-tree-panel__title">Indexed sources</h2>
        <SourceTreeView records={records} workspaceFolders={workspaceFolders} isBusy={isIndexing} />
      </section>

      <section className="akashi-actions" aria-busy={isIndexing}>
        <button
          className="akashi-button akashi-button--primary"
          type="button"
          onClick={() => {
            void handleIndexSources();
          }}
          disabled={isIndexing}
          aria-busy={isIndexing}
        >
          Index sources
        </button>
        <button
          className="akashi-button akashi-button--secondary"
          type="button"
          onClick={handleShowExample}
          disabled={isIndexing}
        >
          Open example panel
        </button>
        {/* Fixed-height slot avoids layout jump when progress mounts */}
        <div className="akashi-progress-slot">
          {isIndexing ? (
            <div
              className="akashi-progress"
              role="progressbar"
              aria-label="Indexing sources"
              aria-valuetext="Indexing sources"
            />
          ) : null}
        </div>
      </section>

      <p className="akashi-help">
        Run indexing after config changes to keep retrieval results fresh. Click a file in the tree
        to open it.
      </p>
    </div>
  );
}
