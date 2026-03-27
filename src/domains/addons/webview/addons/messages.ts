/** Message types for host <-> webview communication in the addons panel. */
export const AddonsMessageType = {
  // Host -> Webview
  Catalog: 'addons/catalog',
  OperationResult: 'addons/operationResult',
  OperationProgress: 'addons/operationProgress',

  // Webview -> Host
  WebviewReady: 'addons/webviewReady',
  OpenFile: 'addons/openFile',
  RefreshRequest: 'addons/refreshRequest',

  // Origin management (Webview -> Host)
  AddOrigin: 'addons/addOrigin',
  RemoveOrigin: 'addons/removeOrigin',
  ToggleOrigin: 'addons/toggleOrigin',
  FetchOrigin: 'addons/fetchOrigin',

  // Install/Delete (Webview -> Host)
  InstallPlugin: 'addons/installPlugin',
  DeleteAddon: 'addons/deleteAddon',

  // Installed addon actions (Webview -> Host)
  MoveToGlobal: 'addons/moveToGlobal',
} as const;
