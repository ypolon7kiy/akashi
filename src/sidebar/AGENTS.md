The **Akashi sidebar** is the activity-bar webview: app-level UI, not a domain.

## Layout

| Folder | Role |
|--------|------|
| [`bridge/`](bridge/) | Types shared by host and webview: [`sourceCategoryKeys.ts`](bridge/sourceCategoryKeys.ts), [`sourceDescriptor.ts`](bridge/sourceDescriptor.ts) (re-exports snapshot DTOs from [`shared/types/sourcesSnapshotPayload.ts`](../shared/types/sourcesSnapshotPayload.ts)), and [`messages/`](bridge/messages/) (`index.ts` — core + FS request kinds). No `vscode` imports. |
| [`host/`](host/) | [`SidebarViewProvider.ts`](host/SidebarViewProvider.ts) — registers the webview, resolves HTML, handles `postMessage`. Supporting modules: [`host/fs/`](host/fs/) (sidebar tree file ops + inbound payload parsing), [`host/sources/`](host/sources/) (snapshot payload + preset filter), [`host/styling/`](host/styling/) (category color CSS for the webview). |
| [`webview/`](webview/) | React bundle entry (`index.tsx`, `App.tsx`, shell `styles.css` — imports shared [`webview-shared/vscode-tokens.css`](../webview-shared/vscode-tokens.css) + [`webview-controls.css`](../webview-shared/webview-controls.css)). |
| [`test/`](test/) | Sidebar-only Vitest files mirroring `host/` and `webview/` layout (`*.test.ts`). |

Feature-sized UI lives under **`webview/<feature>/`**. Today: [`webview/sources/`](webview/sources/) — [`SourcesSidebarFeature.tsx`](webview/sources/SourcesSidebarFeature.tsx), [`useSourcesSidebarState.ts`](webview/sources/useSourcesSidebarState.ts), plus [`webview/sources/tree/`](webview/sources/tree/) (tree UI + `sources-tree.css`) and [`webview/sources/fs/`](webview/sources/fs/) (FS RPC helper, explorer model, context menu).

## Build

Output: `dist/webview/sidebar/sidebar-main.js` and `sidebar-main.css`. Esbuild emits CSS next to the JS when any module in the graph imports a stylesheet. **`SidebarViewProvider` must `<link>` the bundled CSS** in the webview HTML; importing CSS in React only produces the file—it is not inlined into JS.

## Adding another sidebar feature

1. Add `webview/<name>/` with a root component, optional hook(s), and colocated CSS if needed.
2. Import the feature from `App.tsx` (keep `App.tsx` as a thin shell).
3. Extend `bridge/messages/` if the host must handle new message types; extend the provider in `host/SidebarViewProvider.ts`.
