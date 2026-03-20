# Example domain webview (browser bundle)

Browser-side React app for the example panel. This code runs **inside the webview**, not in the extension host.

- `index.tsx` – entry point; mounts the React app into `#root`; imports `styles.css` (bundled to `example-main.css`, linked from `ExamplePanel.ts`).
- `App.tsx` – root component; button sends `postMessage` to the extension host.
- `styles.css` – panel layout and typography on `editor-background` / `foreground`; imports shared theme tokens and controls from `src/webview-shared/`.
- Messaging to the extension host uses `getVscodeApi()` from **`src/webview-shared/api.ts`** (shared by all webviews). Local files: `index.tsx`, `App.tsx`, `messages.ts`.

The build (esbuild) bundles this folder into `dist/webview/example/example-main.js`. The panel HTML is generated in `../ui/webview/ExamplePanel.ts` and loads that script.
