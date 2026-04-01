/** Message types for host <-> webview communication in the diff panel. */
export const DiffMessageType = {
  // Host -> Webview
  DiffData: 'diff/diffData',
  DiffError: 'diff/diffError',

  // Webview -> Host
  WebviewReady: 'diff/webviewReady',
  RefreshRequest: 'diff/refreshRequest',
  RequestDiff: 'diff/requestDiff',
} as const;
