import * as vscode from 'vscode';
import { readIncludeHomeConfig } from '../../domains/sources/infrastructure/vscodeSourcesIncludeHome';
import { appendLine } from '../../log';
import { SidebarMessageType, type SourcesResponseMessage } from '../bridge/messages';

export async function postSourcesResponse(
  webview: vscode.Webview,
  response: SourcesResponseMessage
): Promise<void> {
  await webview.postMessage(response);
}

export function logSourcesCommand(
  type: string,
  requestId: string,
  details?: Record<string, unknown>
): void {
  const detailsSuffix = details ? ` details=${JSON.stringify(details)}` : '';
  appendLine(`[Akashi][Sources] Command ${type} requestId=${requestId}${detailsSuffix}`);
}

export function logSourcesResponse(response: SourcesResponseMessage, summary?: string): void {
  const summarySuffix = summary ? ` ${summary}` : '';
  if (response.ok) {
    appendLine(`[Akashi][Sources] Response ok requestId=${response.requestId}${summarySuffix}`);
    return;
  }
  appendLine(
    `[Akashi][Sources] Response error requestId=${response.requestId} message=${response.error ?? 'unknown'}`
  );
}

export function logInboundSidebarMessage(message: unknown): void {
  if (!message || typeof message !== 'object') {
    appendLine('[Akashi] Sidebar: received non-object message');
    return;
  }
  const m = message as Record<string, unknown>;
  const type = typeof m.type === 'string' ? m.type : '?';
  if (
    type === SidebarMessageType.SourcesOpenPath ||
    type === SidebarMessageType.SourcesRevealInExplorer ||
    type === SidebarMessageType.SourcesRevealFileInOs
  ) {
    const p = (m.payload as { path?: unknown } | undefined)?.path;
    const pathLen = typeof p === 'string' ? p.length : 0;
    appendLine(`[Akashi] Sidebar: received message type=${type} pathLength=${pathLen}`);
    return;
  }
  const requestId = typeof m.requestId === 'string' ? m.requestId : undefined;
  if (requestId) {
    const parts: string[] = [];
    if (type === SidebarMessageType.SourcesIndexWorkspaceRequest) {
      parts.push(`includeHomeConfig=${readIncludeHomeConfig()}`);
    }
    const extra = parts.length > 0 ? ` ${parts.join(' ')}` : '';
    appendLine(`[Akashi] Sidebar: received message type=${type} requestId=${requestId}${extra}`);
    return;
  }
  appendLine(`[Akashi] Sidebar: received message type=${type}`);
}
