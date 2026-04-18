# Changelog

All notable changes to the Akashi extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.15] - 2026-04-19

### Changelog

- Backfill release history for v1.0.5 – v1.0.14

## [1.0.14] - 2026-04-01

### Add-ons

- Show installed plugins in the Available tab alongside catalog entries
- Remove stale CLI catalog cache on refresh
- Add loading feedback for add-ons refresh and per-origin fetch

### Diff Viewer

- Add diff viewer domain with diff2html integration, file drawer, and reviewed-state tracking
- Fix lint errors in diff viewer and add-ons tests

### Pulse

- Remove excessive Pulse domain logging on session/task file changes

## [1.0.13] - 2026-03-31

### Docs

- Add contributor-readiness scaffolding, Pulse documentation, and marketplace marketing templates

## [1.0.12] - 2026-03-30

- Internal build bump (no user-facing changes)

## [1.0.11] - 2026-03-30

### Core

- Rebrand extension description: AI Prompt, Rules, Add-ons, Skills & Message Visualizer

## [1.0.10] - 2026-03-29

### Graph View

- Add `topLevel` artifact flag; connect primary artifacts directly to category nodes
- Show top-level artifact name in installed add-ons view

### Add-ons

- Add edit functionality for custom marketplace connector origins
- Auto-fetch catalog after adding or editing a connector origin
- Only show `.../prefix` path shortening for folder-type add-ons

### Tests

- Add linker coverage for all preset categories (Claude, Cursor, Codex, Antigravity)

## [1.0.9] - 2026-03-28

### UI

- Elevate frontend design system with brand identity, motion, and typography

## [1.0.8] - 2026-03-28

- Internal build bump (no user-facing changes)

## [1.0.7] - 2026-03-28

### Add-ons

- Add Claude Skills preset support
- Fix: update `akashi-meta.json` when moving an add-on to global scope

## [1.0.6] - 2026-03-28

### Sidebar

- Move sidebar filter toggles into a collapsible dropdown panel

## [1.0.5] - 2026-03-28

### Docs

- Update extension title to include Add-ons, Skills & Message Visualizer

## [1.0.4] - 2026-03-28

### Add-ons

- Show informational message when Claude preset is not enabled in add-ons panel
- Add `presetActive` flag to addons catalog payload

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
