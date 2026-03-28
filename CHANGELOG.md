# Changelog

All notable changes to the Akashi extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.3] - 2026-03-28

### Docs

- Align README Add-ons Marketplace section with actual feature support (Claude skills only)
- Move unsupported add-on types (hooks, commands, MCP, bundles) to Roadmap section

## [1.0.2] - 2026-03-28

### Marketplace

- Add-ons screenshot added to extension listing
- Add-ons Marketplace section featured before Graph View in README
- Tags in marketplace add-on cards now render as individual badges for better readability
- Improved meta row alignment in add-on cards (category, version, tags)

## [1.0.0] - 2026-03-26

First stable, open-source release of Akashi -- the system instructions IDE for teams building AI agents from repository-native guidelines. Licensed under Apache 2.0.

### Source Index

- Unified sidebar tree view of all guideline files across workspace and home directories
- Organized by provider preset and artifact kind (contexts, rules, skills, hooks, commands, MCP servers, configs)
- File operations: rename, delete, reveal in explorer
- Auto-refresh via file system watchers
- Configurable category colors per artifact kind

### Graph View

- D3-based force-directed graph showing relationships between guideline files
- Color-coded nodes by source category
- Interactive zoom, pan, and click-to-focus navigation

### Presets

- **Claude**: CLAUDE.md, .claude/rules, hooks, commands, skills, .mcp.json
- **Cursor**: AGENTS.md, .cursorrules, .cursor/rules, hooks, commands, skills
- **Codex**: AGENTS.md, .codex/config.toml, rules, skills
- **Antigravity (Gemini)**: GEMINI.md, .gemini/settings.json, .agent/skills

### Artifact Creation

- Preset-aware templates for creating new contexts, rules, skills, hooks, MCP configs, and more
- Accessible from the sidebar toolbar and command palette

### Search

- Real-time text search with faceted filtering by preset, category, and locality (workspace vs. user-home)

### Configuration

- Configurable preset selection (`akashi.presets`)
- Home config inclusion toggle (`akashi.includeHomeConfig`)
- Custom exclude patterns combined with .gitignore (`akashi.exclude`)
- Per-tool home path overrides (`akashi.homePathOverrides`)
