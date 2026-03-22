import { useCallback, useEffect, useState } from 'react';
import { getVscodeApi, postRequest } from '../../../webview-shared/api';
import {
  isSourcesSnapshotPayload,
  type SourceDescriptor,
  type WorkspaceFolderInfo,
} from '../../bridge/sourceDescriptor';
import {
  SidebarMessageType,
  type SourcesIndexingStateMessage,
  type SourcesResponseMessage,
  type SourcesSnapshotPushMessage,
} from '../../bridge/messages';

export interface SourcesSidebarState {
  isIndexing: boolean;
  records: SourceDescriptor[];
  workspaceFolders: WorkspaceFolderInfo[];
}

export function useSourcesSidebarState(): SourcesSidebarState {
  /** Mount-time hydrate index (RPC); separate from title-bar refresh so busy flags do not race. */
  const [mountIndexBusy, setMountIndexBusy] = useState<boolean>(false);
  const [hostCommandIndexBusy, setHostCommandIndexBusy] = useState<boolean>(false);
  const isIndexing = mountIndexBusy || hostCommandIndexBusy;
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

  useEffect(() => {
    const onMessage = (event: MessageEvent): void => {
      const data = event.data as
        | SourcesSnapshotPushMessage
        | SourcesIndexingStateMessage
        | undefined;
      if (!data || typeof data !== 'object' || typeof data.type !== 'string') {
        return;
      }
      if (data.type === SidebarMessageType.SourcesSnapshotPush) {
        applySnapshotPayload(data.payload);
        return;
      }
      if (data.type === SidebarMessageType.SourcesIndexingState) {
        setHostCommandIndexBusy(data.busy);
      }
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

      let hadIndexedRows = false;
      try {
        const snapshotResponse = await postRequest<SourcesResponseMessage>(
          vscode,
          { type: SidebarMessageType.SourcesGetSnapshotRequest },
          SidebarMessageType.SourcesResponse
        );
        if (snapshotResponse.ok) {
          applySnapshotPayload(snapshotResponse.payload);
          const p = snapshotResponse.payload;
          hadIndexedRows =
            p != null && isSourcesSnapshotPayload(p) && p.records.length > 0;
        }
      } catch {
        // Keep existing UI state and continue with background refresh.
      }

      if (!hadIndexedRows) {
        setMountIndexBusy(true);
      }

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });

      void postRequest<SourcesResponseMessage>(
        vscode,
        { type: SidebarMessageType.SourcesIndexWorkspaceRequest },
        SidebarMessageType.SourcesResponse
      )
        .then((refreshResponse) => {
          if (refreshResponse.ok) {
            applySnapshotPayload(refreshResponse.payload);
          }
        })
        .catch(() => {
          // Keep existing values on transient indexing failures.
        })
        .finally(() => {
          if (!hadIndexedRows) {
            setMountIndexBusy(false);
          }
        });
    };

    void hydrateAndRefresh();
  }, [applySnapshotPayload]);

  return {
    isIndexing,
    records,
    workspaceFolders,
  };
}
