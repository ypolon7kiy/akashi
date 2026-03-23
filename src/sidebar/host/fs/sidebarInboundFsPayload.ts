import { SidebarMessageType } from '../../bridge/messages';

export interface InboundFsRenamePayload {
  readonly fromPath: string;
  readonly toPath: string;
  readonly confirmDragAndDrop: boolean;
}

export interface InboundFsDeletePayload {
  readonly path: string;
  readonly isDirectory: boolean;
}

export interface InboundFsCreateFilePayload {
  readonly parentPath: string;
  readonly fileName: string;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

/**
 * Strict validation for webview → host FS RPC (defense in depth; webview is trusted but not typed at runtime).
 */
export function parseInboundSourcesFsRename(message: unknown): InboundFsRenamePayload | null {
  if (!message || typeof message !== 'object') {
    return null;
  }
  const m = message as Record<string, unknown>;
  if (m.type !== SidebarMessageType.SourcesFsRename) {
    return null;
  }
  const payload = m.payload;
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const p = payload as Record<string, unknown>;
  if (!isNonEmptyString(p.fromPath) || !isNonEmptyString(p.toPath)) {
    return null;
  }
  return {
    fromPath: p.fromPath,
    toPath: p.toPath,
    confirmDragAndDrop: p.confirmDragAndDrop === true,
  };
}

export function parseInboundSourcesFsDelete(message: unknown): InboundFsDeletePayload | null {
  if (!message || typeof message !== 'object') {
    return null;
  }
  const m = message as Record<string, unknown>;
  if (m.type !== SidebarMessageType.SourcesFsDelete) {
    return null;
  }
  const payload = m.payload;
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const p = payload as Record<string, unknown>;
  if (!isNonEmptyString(p.path)) {
    return null;
  }
  return {
    path: p.path,
    isDirectory: p.isDirectory === true,
  };
}

export function parseInboundSourcesFsCreateFile(
  message: unknown
): InboundFsCreateFilePayload | null {
  if (!message || typeof message !== 'object') {
    return null;
  }
  const m = message as Record<string, unknown>;
  if (m.type !== SidebarMessageType.SourcesFsCreateFile) {
    return null;
  }
  const payload = m.payload;
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const p = payload as Record<string, unknown>;
  if (!isNonEmptyString(p.parentPath) || !isNonEmptyString(p.fileName)) {
    return null;
  }
  return {
    parentPath: p.parentPath,
    fileName: p.fileName,
  };
}

export interface InboundFsCreateArtifactPayload {
  readonly templateId: string;
  readonly fileName: string;
  readonly workspaceRoot: string;
}

export function parseInboundSourcesFsCreateArtifact(
  message: unknown
): InboundFsCreateArtifactPayload | null {
  if (!message || typeof message !== 'object') {
    return null;
  }
  const m = message as Record<string, unknown>;
  if (m.type !== SidebarMessageType.SourcesFsCreateArtifact) {
    return null;
  }
  const payload = m.payload;
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const p = payload as Record<string, unknown>;
  if (!isNonEmptyString(p.templateId) || !isNonEmptyString(p.fileName)) {
    return null;
  }
  return {
    templateId: p.templateId,
    fileName: p.fileName,
    workspaceRoot: typeof p.workspaceRoot === 'string' ? p.workspaceRoot : '',
  };
}
