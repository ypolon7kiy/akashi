The **Akashi sidebar** is the activity-bar webview: app-level UI, not a domain.

## Layout

| Folder | Role |
|--------|------|
| [`bridge/`](bridge/) | Types and message constants shared by the extension host and the webview (`messages.ts`, `sourceDescriptor.ts`). No `vscode` imports. |
| [`host/`](host/) | `SidebarViewProvider` — registers the webview view, resolves HTML, handles `postMessage` from the webview. |
| [`webview/`](webview/) | React bundle entry (`index.tsx`, `App.tsx`, shell `styles.css`). |

Feature-sized UI lives under **`webview/<feature>/`**. Today: [`webview/sources/`](webview/sources/) — source index card, tree, actions, `useSourcesSidebarState`, and feature-local CSS (`sources-tree.css`) imported from the feature root component.

## Build

Output: `dist/webview/sidebar/sidebar-main.js` and `sidebar-main.css`. Esbuild emits CSS next to the JS when any module in the graph imports a stylesheet. **`SidebarViewProvider` must `<link>` the bundled CSS** in the webview HTML; importing CSS in React only produces the file—it is not inlined into JS.

## Adding another sidebar feature

1. Add `webview/<name>/` with a root component, optional hook(s), and colocated CSS if needed.
2. Import the feature from `App.tsx` (keep `App.tsx` as a thin shell).
3. Extend `bridge/messages.ts` if the host must handle new message types; extend the provider in `host/SidebarViewProvider.ts`.
