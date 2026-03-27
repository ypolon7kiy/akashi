/** Message types for host <-> webview communication in the addons panel. */
export const AddonsMessageType = {
  // Host -> Webview
  Catalog: 'addons/catalog',
  OperationResult: 'addons/operationResult',

  // Webview -> Host
  WebviewReady: 'addons/webviewReady',
  OpenFile: 'addons/openFile',
  RefreshRequest: 'addons/refreshRequest',

  // Origin management (Webview -> Host)
  AddOrigin: 'addons/addOrigin',
  RemoveOrigin: 'addons/removeOrigin',
  ToggleOrigin: 'addons/toggleOrigin',
  FetchOrigin: 'addons/fetchOrigin',

  // Install/Uninstall (Webview -> Host)
  InstallPlugin: 'addons/installPlugin',
  UninstallPlugin: 'addons/uninstallPlugin',

  // Installed addon actions (Webview -> Host)
  MoveToGlobal: 'addons/moveToGlobal',
} as const;
