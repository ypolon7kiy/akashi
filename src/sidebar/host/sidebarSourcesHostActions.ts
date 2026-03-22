import * as vscode from 'vscode';
import type { SourcesService } from '../../domains/sources/application/SourcesService';
import type { ActiveSourcePresetsGetter } from '../../domains/sources/domain/sourcePresets';
import { readIncludeHomeConfig } from '../../domains/sources/infrastructure/vscodeSourcesIncludeHome';
import { SidebarMessageType, type SourcesResponseMessage } from '../bridge/messages';
import { SIDEBAR_FS_CANCELLED } from './fs/handleSourcesFsRequest';
import { logSourcesResponse, postSourcesResponse } from './sidebarHostMessagingLog';
import { snapshotWorkspaceFolders } from './sidebarWorkspaceFolders';
import { buildSourcesSnapshotPayload } from './sources/sourcesSnapshotPayload';

export type FsHandlerResult = { ok: true } | { ok: false; error: string };

export type SidebarSourcesHostActionsDeps = {
  sourcesService: SourcesService;
  getActiveSourcePresets: ActiveSourcePresetsGetter;
  getWebview: () => vscode.Webview | undefined;
  notifySnapshotRefreshed: () => void;
};

export function createSidebarSourcesHostActions(deps: SidebarSourcesHostActionsDeps) {
  const { sourcesService, getActiveSourcePresets, getWebview, notifySnapshotRefreshed } = deps;

  async function postFilteredSnapshotPush(webview: vscode.Webview): Promise<void> {
    const snap = await sourcesService.getLastSnapshot();
    const payload = buildSourcesSnapshotPayload(
      snap,
      snapshotWorkspaceFolders(),
      getActiveSourcePresets
    );
    await webview.postMessage({
      type: SidebarMessageType.SourcesSnapshotPush,
      payload,
    });
  }

  /** Shared path: full index, push snapshot to sidebar webview if visible, notify graph. */
  async function refreshSourcesIndexFromHost(opts?: {
    notifyWebviewBusy?: boolean;
  }): Promise<void> {
    const w = getWebview();
    const showBusy = Boolean(opts?.notifyWebviewBusy && w);
    if (showBusy) {
      await w!.postMessage({ type: SidebarMessageType.SourcesIndexingState, busy: true });
    }
    try {
      await sourcesService.indexWorkspace({ includeHomeConfig: readIncludeHomeConfig() });
      if (w) {
        await postFilteredSnapshotPush(w);
      }
      notifySnapshotRefreshed();
    } finally {
      if (showBusy) {
        await w!.postMessage({ type: SidebarMessageType.SourcesIndexingState, busy: false });
      }
    }
  }

  async function completeSidebarFsMutation(
    webview: vscode.Webview,
    requestId: string,
    result: FsHandlerResult
  ): Promise<void> {
    if (!result.ok && result.error === SIDEBAR_FS_CANCELLED) {
      const response: SourcesResponseMessage = {
        type: SidebarMessageType.SourcesResponse,
        requestId,
        ok: true,
        payload: { cancelled: true },
      };
      await postSourcesResponse(webview, response);
      logSourcesResponse(response);
      return;
    }
    if (!result.ok) {
      const response: SourcesResponseMessage = {
        type: SidebarMessageType.SourcesResponse,
        requestId,
        ok: false,
        error: result.error,
      };
      await postSourcesResponse(webview, response);
      logSourcesResponse(response);
      return;
    }
    await refreshSourcesIndexFromHost();
    const response: SourcesResponseMessage = {
      type: SidebarMessageType.SourcesResponse,
      requestId,
      ok: true,
    };
    await postSourcesResponse(webview, response);
    logSourcesResponse(response);
  }

  return {
    postFilteredSnapshotPush,
    refreshSourcesIndexFromHost,
    completeSidebarFsMutation,
  };
}

export type SidebarSourcesHostActions = ReturnType<typeof createSidebarSourcesHostActions>;
