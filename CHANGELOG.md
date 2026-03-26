# Changelog

All notable changes to the Akashi extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-26

### Added

- Source Index sidebar: unified tree view of all guideline files across workspace and home directories
- D3-based force-directed graph view showing relationships between guideline files
- Claude preset: CLAUDE.md, .claude/rules, hooks, commands, skills, .mcp.json
- Cursor preset: AGENTS.md, .cursorrules, .cursor/rules, hooks, commands, skills
- Codex preset: AGENTS.md, .codex/config.toml, rules, skills
- Antigravity (Gemini) preset: GEMINI.md, .gemini/settings.json, .agent/skills
- Artifact creation with preset-aware templates
- Real-time search with faceted filtering (preset, category, locality)
- File operations: rename, delete, reveal in explorer
- Configurable sidebar category colors
- Home path overrides for custom config directories
- Auto-refresh via file system watchers
