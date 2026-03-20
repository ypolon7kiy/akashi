import { useCallback, useEffect, useState } from 'react';
import { getVscodeApi, postRequest } from '../../../webview-shared/api';
import {
  isSourcesSnapshotPayload,
  type SourceDescriptor,
  type WorkspaceFolderInfo,
} from '../../bridge/sourceDescriptor';
import { SidebarMessageType, type SourcesResponseMessage } from '../../bridge/messages';
import { readPersistedSourcesState, type SidebarPersistedState } from './persistedSourcesState';

export interface SourcesSidebarState {
  sourceCount: number;
  lastUpdated: string | null;
  includeHomeConfig: boolean;
  isIndexing: boolean;
  records: SourceDescriptor[];
  workspaceFolders: WorkspaceFolderInfo[];
  generatedAt: string | null;
  setIncludeHomeConfig: (value: boolean) => void;
  handleShowExample: () => void;
  handleIndexSources: () => Promise<void>;
}

export function useSourcesSidebarState(): SourcesSidebarState {
  const persisted = readPersistedSourcesState();
  const initialIncludeHomeConfig = persisted.includeHomeConfig ?? false;
  const [sourceCount, setSourceCount] = useState<number>(persisted.sourceCount ?? 0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(persisted.lastUpdated ?? null);
  const [includeHomeConfig, setIncludeHomeConfig] = useState<boolean>(initialIncludeHomeConfig);
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
  }, [applySnapshotPayload, includeHomeConfig, isIndexing]);

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
  }, [applySnapshotPayload, initialIncludeHomeConfig]);

  return {
    sourceCount,
    lastUpdated,
    includeHomeConfig,
    isIndexing,
    records,
    workspaceFolders,
    generatedAt,
    setIncludeHomeConfig,
    handleShowExample,
    handleIndexSources,
  };
}
