# Agent guidelines (Akashi)

This file orients LLM agents working in the Akashi codebase. It summarizes structure and conventions; respect domain boundaries and layers.

## Project

Akashi is a **DDD-style VS Code extension** in TypeScript. Extension host code lives under `src/`, organized by **domains** (then by layers such as domain, application, infrastructure, and optional ui). Domains with a webview panel have a **`webview/`** folder for browser-side UI (e.g. React). App-level UI (e.g. the sidebar) is in `src/sidebar/`; shared webview bridge utilities are in `src/webview-shared/`, with feature-specific message contracts co-located with their bridge modules. Bundling is done with **esbuild** (`esbuild.config.mjs`): one bundle for the extension, one or more for webviews → `dist/webview/<name>/`.

## Code map

- **Domains** — `src/domains/`. Includes **`graph`** (`ui/`, `webview/graph2d/` for the 2D panel) and **`sources`** (workspace source indexing; same layer rules as other domains, no domain `ui/` or `webview/` yet).
- **Shared code** — `src/shared/` (types, utils, vscode helpers, cross-domain contracts).
- **Sidebar** — `src/sidebar/` (app-level webview and host wiring).
- **Webview bridge** — shared bridge utilities in `src/webview-shared/`; feature-specific message contracts in bridge modules such as `src/sidebar/bridge/messages/` and `src/domains/graph/webview/graph2d/messages.ts`.

## Conventions (summary)

- **Domains must not import from each other.** Use `src/shared/` for contracts (interfaces, types, event shapes) and inject dependencies at the application layer; composition happens in `extension.ts` or a small bootstrap module.
- **Layers:** domain (pure business logic, no `vscode`) → application (use cases) → infrastructure (adapters), with optional ui (commands, views, webviews) when a domain exposes host-side interactions. Webview code runs in the browser and is bundled separately; it uses shared bridge helpers from `src/webview-shared/`, while message contracts are defined per feature bridge.
- When adding or changing code, follow the conventions below and match patterns in neighboring layers and folders.

## Scripts

- `npm run build` – bundle the extension host and webview code into `dist/`.
- `npm run watch` – watch mode for local development.
- `npm run package` – package the extension into a `.vsix` using `vsce`.
- `npm test` – run the full Vitest suite **with V8 coverage** (`@vitest/coverage-v8`). The terminal prints a per-file and summary report; use it to confirm touched code is exercised.
- `npm run test:quick` – same as `npm test` but **without** coverage (faster local iteration).
- `npm run test:watch` – Vitest watch mode (no coverage by default).

## Tests and coverage (for agents)

Any work that involves **tests**—writing them, editing them, or running them to verify a change—should be paired with **looking at the coverage output** from the installed coverage tool, not only pass/fail counts.

- After adding or changing tests or production code that is covered by tests, run **`npm test`** and read the **coverage report** (statements, branches, functions, lines, and uncovered line hints) in the command output. Use it to spot gaps, dead branches, and files that never load under the suite.
- Test files live under **`tests/`**, mirroring the **`src/`** layout (e.g. `tests/domains/sources/application/foo.test.ts` for code under `src/domains/sources/application/`). Import production code with the **`@src/...`** path alias (see `tsconfig.json` / `vitest.config.ts`).
- Coverage is configured in **`vitest.config.ts`** (`provider: 'v8'`; test `include` is `tests/**/*.test.ts`, coverage `include`/`exclude` target `src/**`). Adjust those patterns if new areas need to be tracked or excluded.
- The report covers **`src/**/*.ts` and `src/**/*.tsx`**, but Vitest runs in **Node**; sidebar/graph **webview** components often show **0%** because they are not mounted in this suite. Treat those lines as environment limits and focus coverage on **files you touched** and their neighbors.
- Prefer **`npm test`** (with coverage) before finishing a testing-related task. Use **`npm run test:quick`** only when you need a faster loop and will still run **`npm test`** before concluding.
