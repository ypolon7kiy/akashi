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

export interface SourcesSidebarState {
  isIndexing: boolean;
  records: SourceDescriptor[];
  workspaceFolders: WorkspaceFolderInfo[];
  handleShowGraph: () => void;
  handleIndexSources: () => Promise<void>;
}

export function useSourcesSidebarState(): SourcesSidebarState {
  const [isIndexing, setIsIndexing] = useState<boolean>(false);
  const [records, setRecords] = useState<SourceDescriptor[]>([]);
  const [workspaceFolders, setWorkspaceFolders] = useState<WorkspaceFolderInfo[]>([]);

  const applySnapshotPayload = useCallback((payload: unknown): void => {
    if (payload == null) {
      setRecords([]);
      setWorkspaceFolders([]);
      return;
    }
    if (isSourcesSnapshotPayload(payload)) {
      setRecords([...payload.records]);
      setWorkspaceFolders([...payload.workspaceFolders]);
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
      applySnapshotPayload(response.payload);
    } catch {
      // Keep existing values on transient indexing failures.
    } finally {
      setIsIndexing(false);
    }
  }, [applySnapshotPayload, isIndexing]);

  useEffect(() => {
    const onMessage = (event: MessageEvent): void => {
      const data = event.data as SourcesSnapshotPushMessage | undefined;
      if (data?.type !== SidebarMessageType.SourcesSnapshotPush) {
        return;
      }
      applySnapshotPayload(data.payload);
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
          applySnapshotPayload(snapshotResponse.payload);
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
        applySnapshotPayload(refreshResponse.payload);
      } catch {
        // Keep existing values on transient indexing failures.
      } finally {
        setIsIndexing(false);
      }
    };

    void hydrateAndRefresh();
  }, [applySnapshotPayload]);

  return {
    isIndexing,
    records,
    workspaceFolders,
    handleShowGraph,
    handleIndexSources,
  };
}
