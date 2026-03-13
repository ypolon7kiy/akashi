The **Akashi sidebar** is the activity-bar webview: app-level UI, not a domain.

- **SidebarViewProvider.ts** – Registers the webview view with VS Code; resolves the view and handles messages from the webview.
- **webview/** – React app that runs inside the sidebar; can send messages (e.g. show example panel) to the extension host.
- **messages.ts** – Message type constants shared between the webview and the provider.

Build output: `dist/webview/sidebar/sidebar-main.js` and `sidebar-main.css` (esbuild emits CSS next to the JS when the entry imports a stylesheet). **`SidebarViewProvider` must `<link>` the CSS** in the webview HTML; importing CSS in React only produces the file—it is not inlined into the bundle.
