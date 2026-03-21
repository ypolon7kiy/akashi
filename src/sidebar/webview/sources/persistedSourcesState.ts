import { getVscodeApi } from '../../../webview-shared/api';

export interface SidebarPersistedState {
  sourceCount?: number;
  lastUpdated?: string | null;
}

export function readPersistedSourcesState(): SidebarPersistedState {
  const vscode = getVscodeApi();
  if (!vscode) {
    return {};
  }
  const raw = vscode.getState() as SidebarPersistedState | null;
  return raw ?? {};
}
