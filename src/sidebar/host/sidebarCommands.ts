/** Internal: opened from the sidebar webview via deferred `executeCommand` (avoids webview IPC re-entrancy). */
export const AKASHI_OPEN_EXTENSION_SETTINGS_COMMAND = 'akashi.openExtensionSettings' as const;
