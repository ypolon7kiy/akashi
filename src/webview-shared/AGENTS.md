**Shared webview bridge** (browser side): type-safe API to the extension host. All webviews use this instead of duplicating `acquireVsCodeApi` / `postMessage` logic.

- **api.ts** – `getVscodeApi()` (returns the VS Code API or undefined) and the `VscodeApi` interface.

Used by the example domain webview (`domains/example/webview/`) and the sidebar webview (`sidebar/webview/`).

Message flow (browser → host):

```
  Browser (webview iframe)                    Extension host
  ┌──────────────────────────┐                ┌──────────────────────────┐
  │ Example App.tsx          │── postMessage ──▶ ExamplePanel             │
  │ Sidebar App.tsx          │── postMessage ──▶ SidebarViewProvider      │
  └──────────────────────────┘                └──────────────────────────┘
         │ getVscodeApi() (shared)                    │ onDidReceiveMessage (per panel)
```
