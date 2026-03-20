The `example` domain is a **minimal reference** for structuring a domain in this extension.

- **Reduced layout** (for brevity): `ui/` and `webview/`. No `domain/`, `application/`, or `infrastructure/` — minimal slice: one command and a webview panel.
- **Vertical slice:** one command (show panel) and a **React webview** panel (bundle in `webview/`, host in `ui/webview/ExamplePanel.ts`).
- For domains that need host-side interaction entrypoints, add `ui/` alongside `domain/`, `application/`, and `infrastructure/`; see `src/domains/AGENTS.md`.

**Files**

- `ui/register.ts` – registers the show-panel command.
- `ui/webview/ExamplePanel.ts` – webview panel lifecycle and message handling; HTML links bundled `example-main.css` (theme-aligned styles from `webview/styles.css` + shared tokens).
- `webview/` – React app and message types; talks to host via `src/webview-shared/`.
