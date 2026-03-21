# Agent guidelines (Akashi)

This file orients LLM agents working in the Akashi codebase. Read the area AGENTS below for structure and conventions; respect domain boundaries and layers.

## Project

Akashi is a **DDD-style VS Code extension** in TypeScript. Extension host code lives under `src/`, organized by **domains** (then by layers such as domain, application, infrastructure, and optional ui). Domains with a webview panel have a **`webview/`** folder for browser-side UI (e.g. React). App-level UI (e.g. the sidebar) is in `src/sidebar/`; the shared webview bridge is in `src/webview-shared/`. Bundling is done with **esbuild** (`esbuild.config.mjs`): one bundle for the extension, one or more for webviews → `dist/webview/<name>/`.

## Where to read more

Use these AGENTS for structure and conventions in each area:

| Area | AGENTS |
|------|--------|
| Extension host layout | `src/AGENTS.md` |
| Domains and layers | `src/domains/AGENTS.md` |
| Graph domain (2D panel) | `src/domains/graph/` (`ui/`, `webview/`) |
| Shared code (types, utils, vscode) | `src/shared/AGENTS.md` |
| Sidebar (app-level webview) | `src/sidebar/AGENTS.md` |
| Webview shared bridge | `src/webview-shared/AGENTS.md` |

The **`sources`** domain (workspace source indexing) follows the same layer rules as other domains; details and wiring live in **`src/domains/AGENTS.md`** (not a separate `sources/AGENTS.md`).

## Conventions (summary)

- **Domains must not import from each other.** Use `src/shared/` for contracts (interfaces, types, event shapes) and inject dependencies at the application layer; composition happens in `extension.ts` or a small bootstrap module.
- **Layers:** domain (pure business logic, no `vscode`) → application (use cases) → infrastructure (adapters), with optional ui (commands, views, webviews) when a domain exposes host-side interactions. Webview code runs in the browser and is bundled separately; it talks to the host via `src/webview-shared/`.
- When adding or changing code, read the relevant area AGENTS first to keep boundaries and layering correct.

## Scripts

- `npm run build` – bundle the extension host and webview code into `dist/`.
- `npm run watch` – watch mode for local development.
- `npm run package` – package the extension into a `.vsix` using `vsce`.
