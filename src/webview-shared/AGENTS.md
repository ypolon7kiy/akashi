**Shared webview bridge** (browser side): type-safe API to the extension host. All webviews use this instead of duplicating `acquireVsCodeApi` / `postMessage` logic.

- **api.ts** – `getVscodeApi()` (returns the VS Code API or undefined) and the `VscodeApi` interface; **`newRequestId()`** and **`postRequest()`** for correlating webview → host requests with responses (used by the sources sidebar for snapshot/index calls).
- **vscode-tokens.css** – `:root` aliases (`--akashi-*`) mapping to `var(--vscode-*)` so UIs track the active theme.
- **webview-controls.css** – shared `.akashi-button*` / `.akashi-progress` using VS Code button and progress tokens. Import after `vscode-tokens.css` in each webview entry stylesheet.

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
