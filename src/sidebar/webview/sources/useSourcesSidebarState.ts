import { useCallback, useEffect, useState } from 'react';
import { getVscodeApi, postRequest } from '../../../webview-shared/api';
import {
  isSourcesSnapshotPayload,
  type SourceDescriptor,
  type WorkspaceFolderInfo,
} from '../../bridge/sourceDescriptor';
import {
  SidebarMessageType,
  type SourcesResponseMessage,
  type SourcesSnapshotPushMessage,
} from '../../bridge/messages';
import { readPersistedSourcesState, type SidebarPersistedState } from './persistedSourcesState';

export interface SourcesSidebarState {
  sourceCount: number;
  lastUpdated: string | null;
  isIndexing: boolean;
  records: SourceDescriptor[];
  workspaceFolders: WorkspaceFolderInfo[];
  generatedAt: string | null;
  handleShowExample: () => void;
  handleShowGraph: () => void;
  handleIndexSources: () => Promise<void>;
}

export function useSourcesSidebarState(): SourcesSidebarState {
  const persisted = readPersistedSourcesState();
  const [sourceCount, setSourceCount] = useState<number>(persisted.sourceCount ?? 0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(persisted.lastUpdated ?? null);
  const [isIndexing, setIsIndexing] = useState<boolean>(false);
  const [records, setRecords] = useState<SourceDescriptor[]>([]);
  const [workspaceFolders, setWorkspaceFolders] = useState<WorkspaceFolderInfo[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const applySnapshotPayload = useCallback(
    (payload: unknown, options: { touchLastUpdated: boolean }): void => {
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
    },
    []
  );

  const handleShowExample = useCallback((): void => {
    const vscode = getVscodeApi();
    if (vscode) {
      vscode.postMessage({ type: SidebarMessageType.ShowExamplePanel });
    }
  }, []);

  const handleShowGraph = useCallback((): void => {
    const vscode = getVscodeApi();
    if (vscode) {
      vscode.postMessage({ type: SidebarMessageType.OpenGraphPanel });
    }
  }, []);

  const handleIndexSources = useCallback(async (): Promise<void> => {
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
  }, [applySnapshotPayload, isIndexing]);

  useEffect(() => {
    const vscode = getVscodeApi();
    if (!vscode) {
      return;
    }
    vscode.setState({
      sourceCount,
      lastUpdated,
    } satisfies SidebarPersistedState);
  }, [lastUpdated, sourceCount]);

  useEffect(() => {
    const onMessage = (event: MessageEvent): void => {
      const data = event.data as SourcesSnapshotPushMessage | undefined;
      if (data?.type !== SidebarMessageType.SourcesSnapshotPush) {
        return;
      }
      applySnapshotPayload(data.payload, { touchLastUpdated: false });
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
    };
  }, [applySnapshotPayload]);

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
  }, [applySnapshotPayload]);

  return {
    sourceCount,
    lastUpdated,
    isIndexing,
    records,
    workspaceFolders,
    generatedAt,
    handleShowExample,
    handleShowGraph,
    handleIndexSources,
  };
}
