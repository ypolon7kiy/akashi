import { postRequest, type VscodeApi } from '../../../../webview-shared/api';
import { SidebarMessageType, type SourcesResponseMessage } from '../../../bridge/messages';

export type SidebarFsRpcOutcome =
  | { kind: 'success' }
  | { kind: 'cancelled' }
  | { kind: 'error'; message: string };

const FS_RPC_TIMEOUT_MS = 60_000;

function interpretFsResponse(r: SourcesResponseMessage): SidebarFsRpcOutcome {
  const payload = r.payload as { cancelled?: boolean } | undefined;
  if (payload?.cancelled) {
    return { kind: 'cancelled' };
  }
  if (!r.ok) {
    return { kind: 'error', message: r.error ?? 'Operation failed' };
  }
  return { kind: 'success' };
}

export async function postSidebarFsRename(
  vscode: VscodeApi,
  fromPath: string,
  toPath: string,
  confirmDragAndDrop?: boolean
): Promise<SidebarFsRpcOutcome> {
  try {
    const r = await postRequest<SourcesResponseMessage>(
      vscode,
      {
        type: SidebarMessageType.SourcesFsRename,
        payload: { fromPath, toPath, confirmDragAndDrop },
      },
      SidebarMessageType.SourcesResponse,
      FS_RPC_TIMEOUT_MS
    );
    return interpretFsResponse(r);
  } catch (e) {
    return { kind: 'error', message: e instanceof Error ? e.message : 'Rename failed' };
  }
}

export async function postSidebarFsDelete(
  vscode: VscodeApi,
  path: string,
  isDirectory: boolean
): Promise<SidebarFsRpcOutcome> {
  try {
    const r = await postRequest<SourcesResponseMessage>(
      vscode,
      {
        type: SidebarMessageType.SourcesFsDelete,
        payload: { path, isDirectory },
      },
      SidebarMessageType.SourcesResponse,
      FS_RPC_TIMEOUT_MS
    );
    return interpretFsResponse(r);
  } catch (e) {
    return { kind: 'error', message: e instanceof Error ? e.message : 'Delete failed' };
  }
}

export async function postSidebarFsCreateFile(
  vscode: VscodeApi,
  parentPath: string,
  fileName: string
): Promise<SidebarFsRpcOutcome> {
  try {
    const r = await postRequest<SourcesResponseMessage>(
      vscode,
      {
        type: SidebarMessageType.SourcesFsCreateFile,
        payload: { parentPath, fileName },
      },
      SidebarMessageType.SourcesResponse,
      FS_RPC_TIMEOUT_MS
    );
    return interpretFsResponse(r);
  } catch (e) {
    return { kind: 'error', message: e instanceof Error ? e.message : 'Create file failed' };
  }
}
