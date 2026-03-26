# Akashi -- System Instructions IDE

> Create, browse, validate, and visualize the system instructions and guidelines your AI coding agents rely on.

Akashi is purpose-built for teams building AI agents from repository-native guidelines. It provides a unified view of layered instruction sets across `AGENTS.md`, `CLAUDE.md`, provider-specific assets, and related configuration files -- so guidance stays correct as projects evolve.

## Features

### Source Index Sidebar

A unified tree view of every guideline file in your workspace and home config directories. Files are organized by provider preset and artifact kind:

- **Contexts** -- `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, and similar top-level instruction files
- **Rules** -- `.claude/rules/`, `.cursor/rules/`, `.codex/rules/`
- **Skills** -- `.claude/skills/`, `.cursor/skills/`, `.agents/skills/`
- **Hooks** -- `.claude/hooks/`, `.cursor/hooks/`
- **Commands** -- `.claude/commands/`, `.cursor/commands/`
- **MCP Servers** -- `.mcp.json`, `.cursor/mcp.json`
- **Configs** -- `settings.json`, `config.toml`, and other provider configuration

<!-- ![Source Index](media/screenshots/source-index.png) -->

### Graph View

An interactive D3-based force-directed graph that visualizes relationships between guideline files. Nodes are color-coded by artifact category. Zoom, pan, and click to explore complex instruction hierarchies.

<!-- ![Graph View](media/screenshots/graph-view.png) -->

### Multi-Provider Presets

Akashi supports four AI coding tool families out of the box:

| Preset | Key Files |
|--------|-----------|
| **Claude** | `CLAUDE.md`, `.claude/rules/`, `.claude/hooks/`, `.claude/commands/`, `.claude/skills/`, `.mcp.json` |
| **Cursor** | `AGENTS.md`, `.cursorrules`, `.cursor/rules/`, `.cursor/hooks/`, `.cursor/commands/`, `.cursor/skills/` |
| **Codex** | `AGENTS.md`, `.codex/config.toml`, `.codex/rules/`, `.codex/skills/` |
| **Antigravity (Gemini)** | `GEMINI.md`, `.gemini/settings.json`, `.agent/skills/` |

Toggle presets on or off in settings to focus on the tools your team uses.

### Artifact Creation

Create new guideline artifacts directly from the sidebar. Akashi provides preset-aware templates for contexts, rules, skills, hooks, MCP server configs, and more.

### Search and Filter

Real-time text search with faceted filtering by preset, category, and locality (workspace vs. user-home).

## Getting Started

1. Install Akashi from the VS Code Marketplace
2. Open a workspace that contains AI agent guidelines (e.g., a repo with `CLAUDE.md` or `.cursor/rules/`)
3. Click the Akashi icon in the Activity Bar
4. Browse your source index, open the graph view, or create new artifacts

## Extension Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `akashi.presets` | Which tool families appear in the Source Index | `["claude", "cursor", "antigravity", "codex"]` |
| `akashi.includeHomeConfig` | Include user-home tool configs in the index | `true` |
| `akashi.homePathOverrides` | Custom user config directory per tool | `{}` |
| `akashi.sidebar.fileColors` | Colors for source categories in the sidebar | *(see defaults in settings)* |

## Commands

| Command | Description |
|---------|-------------|
| `Akashi: Refresh source index` | Re-scan workspace and home directories |
| `Akashi: Show graph` | Open the force-directed graph panel |
| `Akashi: New source artifact...` | Create a new guideline file from templates |

## Requirements

- VS Code 1.85.0 or later

## License

See [LICENSE](LICENSE).
