import { useEffect, useState } from 'react';
import { getVscodeApi, postRequest } from '../../webview-shared/api';
import { SidebarMessageType, type SourcesResponseMessage } from '../messages';

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

export function SidebarApp(): JSX.Element {
  const persisted = readPersistedState();
  const initialIncludeHomeConfig = persisted.includeHomeConfig ?? false;
  const [sourceCount, setSourceCount] = useState<number>(persisted.sourceCount ?? 0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(persisted.lastUpdated ?? null);
  const [includeHomeConfig, setIncludeHomeConfig] = useState<boolean>(initialIncludeHomeConfig);
  const [isIndexing, setIsIndexing] = useState<boolean>(false);

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
      const payload = response.payload as { sourceCount?: number } | undefined;
      setSourceCount(payload?.sourceCount ?? 0);
      setLastUpdated(new Date().toLocaleTimeString());
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
          const payload = snapshotResponse.payload as { sourceCount?: number } | null;
          if (payload) {
            setSourceCount(payload.sourceCount ?? 0);
          }
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
        const refreshPayload = refreshResponse.payload as { sourceCount?: number } | undefined;
        setSourceCount(refreshPayload?.sourceCount ?? 0);
        setLastUpdated(new Date().toLocaleTimeString());
      } catch {
        // Keep existing values on transient indexing failures.
      } finally {
        setIsIndexing(false);
      }
    };

    void hydrateAndRefresh();
  }, []);

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
        {lastUpdated ? <p className="akashi-muted">Last indexed at {lastUpdated}</p> : null}
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
        Run indexing after config changes to keep retrieval results fresh.
      </p>
    </div>
  );
}
