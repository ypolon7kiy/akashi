This folder contains the **extension host source code** for the Akashi VS Code extension.

- Organizes code **by domain first**, then by technical layer (domain, application, infrastructure, plus optional `ui/` when needed by the domain).
- Contains only TypeScript that runs in the VS Code **extension host** (Node.js) environment.
- Browser-side webview UI for a domain lives in that domain’s `webview/` folder (e.g. `domains/example/webview/`); it is bundled separately and runs in the webview, not in the extension host.
- App-level UI such as the **sidebar** lives in `sidebar/` (sibling to `domains/` and `shared/`). The **webview-shared/** folder holds the bridge used by all webviews to talk to the extension host (`getVscodeApi`).

See child folders and their **AGENTS.md** files (e.g. under `domains/`, `sidebar/`) for area-specific responsibilities and boundaries.

