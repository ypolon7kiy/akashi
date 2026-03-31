# Contributing to Akashi

Thanks for your interest in contributing! Akashi is an open source VS Code extension that unifies AI agent guidelines across Claude, Cursor, Codex, and Gemini, with a session analytics dashboard (Pulse).

## Getting Started

### Prerequisites

- Node.js 18+
- VS Code 1.85.0+

### Setup

```bash
git clone https://github.com/ypolon7kiy/akashi.git
cd akashi
npm install
npm run build
```

### Running Locally

1. Open the repo in VS Code
2. Press **F5** to launch the Extension Development Host
3. The Akashi sidebar appears in the Activity Bar of the new window

### Useful Scripts

| Script | Purpose |
|--------|---------|
| `npm run build` | Bundle extension + webviews into `dist/` |
| `npm run watch` | Watch mode for development |
| `npm test` | Run full test suite with coverage |
| `npm run test:quick` | Run tests without coverage (faster) |
| `npm run test:watch` | Vitest watch mode |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |
| `npm run fix` | Lint + format in one command |
| `npm run package` | Build `.vsix` package |

## Architecture

Akashi uses **Domain-Driven Design** with clear boundaries. See [AGENTS.md](AGENTS.md) for a full orientation.

```
src/
  domains/
    sources/    -- Workspace guideline file indexing & search
    graph/      -- D3 force-directed graph visualization
    addons/     -- Add-ons marketplace & skill installation
    pulse/      -- Claude Code session analytics dashboard
    config/     -- Configuration management
    search/     -- Search filtering logic
  sidebar/      -- App-level sidebar webview & host wiring
  shared/       -- Cross-domain types, utilities, contracts
  webview-shared/ -- Webview bridge utilities
```

**Key rule:** Domains must not import from each other. Use `src/shared/` for cross-domain contracts.

## Making Changes

### Workflow

1. Fork the repo and create a branch from `master`
2. Make your changes
3. Run `npm run fix` to auto-format
4. Run `npm test` and check coverage on files you touched
5. Commit with a descriptive message: `feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`
6. Open a pull request against `master`

### Code Style

- **ESLint + Prettier** are enforced by CI — run `npm run fix` before committing
- **Immutability** — create new objects, don't mutate existing ones
- **Small files** — prefer many focused files over large ones
- **TypeScript strict mode** — avoid `any`, use `unknown` and narrow safely

### Tests

- Test files live under `tests/`, mirroring the `src/` layout
- Import production code with the `@src/...` path alias
- Always run `npm test` (with coverage) before submitting a PR
- Webview components may show 0% coverage due to the Node test environment — this is expected

### What Makes a Good PR

- Focused on a single concern
- Includes tests for new behavior
- Passes CI (lint, format, tests, build)
- Has a clear description of what and why

## Finding Work

- Check [issues labeled `good first issue`](https://github.com/ypolon7kiy/akashi/labels/good%20first%20issue) for beginner-friendly tasks
- Browse the [roadmap in README.md](README.md#roadmap) for larger features
- Open an issue to discuss your idea before starting major work

## Questions?

Open a [GitHub Discussion](https://github.com/ypolon7kiy/akashi/discussions) or comment on the relevant issue.

## License

By contributing, you agree that your contributions will be licensed under the [Apache 2.0 License](LICENSE).
