# Agent guidelines (Akashi)

This file orients LLM agents working in the Akashi codebase. It summarizes structure and conventions; respect domain boundaries and layers.

## Project

Akashi is a **DDD-style VS Code extension** in TypeScript. Extension host code lives under `src/`, organized by **domains** (then by layers such as domain, application, infrastructure, and optional ui). Domains with a webview panel have a **`webview/`** folder for browser-side UI (e.g. React). App-level UI (e.g. the sidebar) is in `src/sidebar/`; the shared webview bridge is in `src/webview-shared/`. Bundling is done with **esbuild** (`esbuild.config.mjs`): one bundle for the extension, one or more for webviews → `dist/webview/<name>/`.

## Code map

- **Domains** — `src/domains/`. Includes **`graph`** (`ui/`, `webview/graph2d/` for the 2D panel) and **`sources`** (workspace source indexing; same layer rules as other domains, no domain `ui/` or `webview/` yet).
- **Shared code** — `src/shared/` (types, utils, vscode helpers, cross-domain contracts).
- **Sidebar** — `src/sidebar/` (app-level webview and host wiring).
- **Webview bridge** — `src/webview-shared/` (messaging from webviews to the host).

## Conventions (summary)

- **Domains must not import from each other.** Use `src/shared/` for contracts (interfaces, types, event shapes) and inject dependencies at the application layer; composition happens in `extension.ts` or a small bootstrap module.
- **Layers:** domain (pure business logic, no `vscode`) → application (use cases) → infrastructure (adapters), with optional ui (commands, views, webviews) when a domain exposes host-side interactions. Webview code runs in the browser and is bundled separately; it talks to the host via `src/webview-shared/`.
- When adding or changing code, follow the conventions below and match patterns in neighboring layers and folders.

## Scripts

- `npm run build` – bundle the extension host and webview code into `dist/`.
- `npm run watch` – watch mode for local development.
- `npm run package` – package the extension into a `.vsix` using `vsce`.
