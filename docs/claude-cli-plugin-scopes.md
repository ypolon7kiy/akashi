# Claude Code CLI: Plugin & Skill Installation Scopes

> A comprehensive reference for how Claude Code CLI manages plugins and skills
> across its three installation scopes. Based on hands-on experimentation and
> filesystem analysis conducted on 2026-03-29 against Claude Code v2.1.87.

---

## Table of Contents

1. [Overview](#overview)
2. [The Three Scopes](#the-three-scopes)
3. [Filesystem Architecture](#filesystem-architecture)
4. [Plugin Installation Flow](#plugin-installation-flow)
5. [Scope-by-Scope Behavior](#scope-by-scope-behavior)
6. [The Marketplace System](#the-marketplace-system)
7. [Enable, Disable, and Uninstall Mechanics](#enable-disable-and-uninstall-mechanics)
8. [Plugins vs Skills](#plugins-vs-skills)
9. [Layered Configuration Precedence](#layered-configuration-precedence)
10. [Key Files Reference](#key-files-reference)
11. [Common Pitfalls](#common-pitfalls)

---

## Overview

Claude Code CLI uses a **layered configuration model** for managing plugins and
skills. This is the same pattern found in git config (system > global > local),
CSS specificity, or ESLint's cascading config files. The core principle is:

- **Plugin files** are always stored in a single, central cache directory
  regardless of scope.
- **Scope** only determines which settings file records the enablement, and
  therefore who sees the plugin and where.

Three scopes exist, each targeting a different audience:

| Scope | Audience | Shared via git? |
|-------|----------|-----------------|
| **User** (global) | You, across all projects on this machine | No |
| **Project** | Your entire team working on this repo | Yes |
| **Local** | Only you, only in this project | No (gitignored) |

---

## The Three Scopes

### 1. User (Global) Scope

- **Settings file**: `~/.claude/settings.json`
- **Purpose**: Personal preferences that follow you across every project.
- **Visibility**: Only on your machine. Not version-controlled.
- **Use case**: Plugins you always want active regardless of which repo you're
  working in (e.g., a personal productivity plugin, an output style you prefer).

When you install at user scope, the `enabledPlugins` key in your global
`settings.json` gets a new entry:

```json
{
  "enabledPlugins": {
    "marketing-skills@claude-code-skills": true
  }
}
```

The `installed_plugins.json` records:

```json
{
  "scope": "user",
  "installPath": "~/.claude/plugins/cache/claude-code-skills/marketing-skills/2.1.2",
  "version": "2.1.2",
  "gitCommitSha": "110348f..."
}
```

Note: **no `projectPath` field** is present for user-scoped plugins because they
are not tied to any specific project.

### 2. Project Scope

- **Settings file**: `<repo>/.claude/settings.json`
- **Purpose**: Team-shared plugin configuration committed to version control.
- **Visibility**: Everyone who clones the repo gets these plugins.
- **Use case**: Plugins the whole team needs (e.g., a code review toolkit, a
  TypeScript LSP integration, team-specific output styles).

When you install at project scope:

```json
// <repo>/.claude/settings.json
{
  "enabledPlugins": {
    "marketing-skills@claude-code-skills": true
  }
}
```

The `installed_plugins.json` records:

```json
{
  "scope": "project",
  "installPath": "~/.claude/plugins/cache/claude-code-skills/marketing-skills/2.1.2",
  "version": "2.1.2",
  "gitCommitSha": "110348f...",
  "projectPath": "/home/ubuntu/dev/akashi"
}
```

Note: `projectPath` is present and points to the repo root where the plugin was
installed.

### 3. Local Scope

- **Settings file**: `<repo>/.claude/settings.local.json`
- **Purpose**: Personal overrides for a specific project. This file is
  gitignored, so teammates never see it.
- **Visibility**: Only you, only in this project.
- **Use case**: Enabling a plugin you want for personal use in a specific
  project, or disabling a team plugin that doesn't apply to your workflow.

When you install at local scope:

```json
// <repo>/.claude/settings.local.json
{
  "enabledPlugins": {
    "marketing-skills@claude-code-skills": true
  },
  "outputStyle": "Explanatory"
}
```

The `installed_plugins.json` records:

```json
{
  "scope": "local",
  "installPath": "~/.claude/plugins/cache/claude-code-skills/marketing-skills/2.1.2",
  "version": "2.1.2",
  "gitCommitSha": "110348f...",
  "projectPath": "/home/ubuntu/dev/akashi"
}
```

---

## Filesystem Architecture

### Central Plugin Cache

All plugin files — regardless of installation scope — are stored in a single
location:

```
~/.claude/plugins/cache/<marketplace-name>/<plugin-name>/<version>/
```

For example:

```
~/.claude/plugins/
├── cache/
│   ├── claude-plugins-official/          # Official Anthropic plugins
│   │   ├── commit-commands/
│   │   ├── explanatory-output-style/
│   │   ├── pr-review-toolkit/
│   │   └── typescript-lsp/
│   └── claude-code-skills/               # Community marketplace plugins
│       └── marketing-skills/
│           └── 2.1.2/                    # Versioned directory
│               └── <plugin files>
├── marketplaces/                         # Cloned marketplace repos
│   ├── claude-code-skills/               # Full catalog of available plugins
│   └── anthropic-agent-skills/           # Official Anthropic skills catalog
├── installed_plugins.json                # Global registry of all installations
├── known_marketplaces.json               # Registered marketplace sources
└── blocklist.json                        # Blocked plugins (with reasons)
```

**Key insight**: The `installPath` in `installed_plugins.json` always points into
`~/.claude/plugins/cache/`, never into the project directory. Scope only affects
which settings file is modified.

### Settings File Locations

```
~/.claude/settings.json                   # User (global) scope
<repo>/.claude/settings.json              # Project scope (git-tracked)
<repo>/.claude/settings.local.json        # Local scope (gitignored)
```

### Skills Directories

Skills (standalone SKILL.md files, not distributed via marketplace) use
auto-discovery from these directories:

```
~/.claude/skills/                         # Global skills (available in all projects)
<repo>/.claude/skills/                    # Project skills (team-shared)
```

There is no separate "local" skills directory — local scope applies only to
plugin enablement via `settings.local.json`.

### Other Global Directories

```
~/.claude/
├── agents/                               # 15 agent definitions (.md files)
├── commands/                             # 36 slash commands (.md files)
├── hooks/hooks.json                      # Lifecycle hooks configuration
├── rules/                                # Coding rules (common/, typescript/)
├── cache/                                # CLI metadata cache (changelog.md only)
└── projects/                             # Per-project learned instincts/memory
```

Note: `~/.claude/cache/` is **not** related to plugin storage. It only holds the
CLI's own `changelog.md` for displaying release notes. The plugin cache is at
`~/.claude/plugins/cache/`.

---

## Plugin Installation Flow

When you run `claude plugin install <plugin>@<marketplace> --scope <scope>`:

### Step 1: Resolve the marketplace

The CLI looks up the marketplace in `known_marketplaces.json`. Each marketplace
entry contains a source (GitHub repo, git URL, npm package, or local path) and a
local clone location:

```json
{
  "claude-code-skills": {
    "source": { "source": "github", "repo": "alirezarezvani/claude-skills" },
    "installLocation": "~/.claude/plugins/marketplaces/claude-code-skills",
    "lastUpdated": "2026-03-28T23:37:21.170Z"
  }
}
```

### Step 2: Download and cache the plugin

The plugin is downloaded from the marketplace source and placed into:

```
~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/
```

If the plugin was previously cached (e.g., from a prior installation), the
existing cache is reused. **Cache persists after uninstall** — this makes
reinstallation fast.

### Step 3: Update the settings file

Based on the `--scope` flag, exactly one settings file is modified:

| `--scope` | File modified |
|-----------|---------------|
| `user` (default) | `~/.claude/settings.json` |
| `project` | `<repo>/.claude/settings.json` |
| `local` | `<repo>/.claude/settings.local.json` |

The modification adds `"<plugin>@<marketplace>": true` to the `enabledPlugins`
object in that file.

### Step 4: Update the global registry

`~/.claude/plugins/installed_plugins.json` gets a new entry recording:

- `scope` — which scope was used
- `installPath` — absolute path to the cached plugin directory
- `version` — semantic version
- `installedAt` / `lastUpdated` — timestamps
- `gitCommitSha` — the exact commit from the marketplace repo
- `projectPath` — (only for project and local scopes) the repo root

---

## Scope-by-Scope Behavior

### Experimental Results

The following table shows the exact file changes observed for each scope when
installing `marketing-skills@claude-code-skills`:

| | `~/.claude/settings.json` | `.claude/settings.json` | `.claude/settings.local.json` | `installed_plugins.json` |
|---|---|---|---|---|
| **--scope user** | `true` added | unchanged | unchanged | `scope: "user"`, no projectPath |
| **--scope project** | unchanged | `true` added | unchanged | `scope: "project"`, projectPath present |
| **--scope local** | unchanged | unchanged | `true` added | `scope: "local"`, projectPath present |

### What each scope looks like after uninstall

After uninstalling at any scope:

- The `enabledPlugins` entry is **removed entirely** (not set to `false`).
- The `installed_plugins.json` entry is **removed entirely**.
- The **cache directory is preserved** at `~/.claude/plugins/cache/`.

---

## The Marketplace System

### Two-Phase Architecture

Marketplaces follow a **register-then-install** pattern (similar to `apt`
adding a PPA before installing packages):

**Phase 1 — Register a marketplace (one-time)**:

```bash
# From GitHub
claude plugin marketplace add owner/repo

# From a git URL
claude plugin marketplace add https://gitlab.com/org/marketplace

# From a local directory
claude plugin marketplace add ./my-local-marketplace

# From a direct URL
claude plugin marketplace add https://example.com/marketplace.json
```

This clones/downloads the marketplace catalog to
`~/.claude/plugins/marketplaces/<name>/` and registers it in
`known_marketplaces.json`.

**Phase 2 — Install plugins from the catalog**:

```bash
claude plugin install plugin-name@marketplace-name
claude plugin install plugin-name@marketplace-name --scope project
```

### Marketplace Manifest

Each marketplace has a `.claude-plugin/marketplace.json` that lists available
plugins:

```json
{
  "name": "my-marketplace",
  "owner": { "name": "Author Name" },
  "plugins": [
    {
      "name": "quality-review-plugin",
      "source": "./plugins/quality-review-plugin",
      "description": "Automated code review tool"
    }
  ]
}
```

### Plugin Source Types

Marketplace entries support multiple source types:

| Source | Example | Use case |
|--------|---------|----------|
| Relative path | `"./plugins/my-plugin"` | Plugin in same repo as marketplace |
| GitHub | `{ "source": "github", "repo": "owner/repo" }` | Standalone GitHub repo |
| Git URL | `{ "source": "url", "url": "https://..." }` | GitLab, Bitbucket, etc. |
| Git subdirectory | `{ "source": "git-subdir", "url": "...", "path": "..." }` | Plugin in a monorepo |
| npm | `{ "source": "npm", "package": "@org/plugin" }` | Published npm package |

### Currently Registered Marketplaces

On this system, two marketplaces are registered:

| Marketplace | Source | Plugins |
|-------------|--------|---------|
| `claude-code-skills` | `alirezarezvani/claude-skills` | 26+ community plugins |
| `anthropic-agent-skills` | `anthropics/skills` | Official Anthropic skills |

The official Anthropic marketplace (`claude-plugins-official`) is automatically
available and includes plugins like `commit-commands`, `pr-review-toolkit`,
`typescript-lsp`, and `explanatory-output-style`.

---

## Enable, Disable, and Uninstall Mechanics

### Disable vs Uninstall

These are distinct operations with different behaviors:

**Disable** — sets the plugin to `false` in the target scope's settings file.
The plugin remains installed but is not loaded.

```bash
claude plugin disable marketing-skills@claude-code-skills --scope project
```

Result in `.claude/settings.json`:

```json
{
  "enabledPlugins": {
    "marketing-skills@claude-code-skills": false
  }
}
```

**Uninstall** — removes the `enabledPlugins` entry and the
`installed_plugins.json` entry. The cache is preserved.

```bash
claude plugin uninstall marketing-skills@claude-code-skills --scope user
```

### Uninstall Protection for Project-Scoped Plugins

The CLI **protects project-scoped plugins from accidental removal** because they
affect the entire team. If you try to uninstall a project-scoped plugin
directly:

```
$ claude plugin uninstall marketing-skills@claude-code-skills
  Failed: Plugin is enabled at project scope (.claude/settings.json, shared
  with your team). To disable just for you:
  claude plugin disable marketing-skills@claude-code-skills --scope local
```

To fully uninstall a project-scoped plugin, you must **disable it first**, then
uninstall:

```bash
claude plugin disable marketing-skills@claude-code-skills --scope project
claude plugin uninstall marketing-skills@claude-code-skills --scope project
```

### Override Behavior Across Scopes

Disabling at a lower scope **overrides** an enabled state at a higher scope
without modifying the higher scope's file:

```
User scope:    "marketing-skills": true     # Enabled globally
Project scope: "marketing-skills": false    # Override: disabled for this project
```

The plugin remains enabled for all other projects where project-level settings
don't override it.

### Cache Behavior

The `--keep-data` flag on uninstall controls whether the plugin's persistent
data directory is preserved:

```bash
# Remove plugin but keep its persistent data
claude plugin uninstall marketing-skills@claude-code-skills --keep-data

# Remove plugin and its persistent data
claude plugin uninstall marketing-skills@claude-code-skills
```

Persistent data lives at: `~/.claude/plugins/data/{plugin-id}/`

Note: The **cache** (downloaded plugin files in `plugins/cache/`) is always
preserved after uninstall regardless of this flag. Only the data directory is
affected.

---

## Plugins vs Skills

### Key Differences

| Aspect | Plugin | Skill |
|--------|--------|-------|
| **Structure** | Directory with `.claude-plugin/plugin.json` manifest | Single `SKILL.md` file (or directory with `SKILL.md`) |
| **Can contain** | Skills, agents, hooks, MCP servers, LSP servers, output styles, settings | Instructions only (Markdown with YAML frontmatter) |
| **Installation** | Via marketplace: `claude plugin install` | Auto-discovered from `skills/` directories |
| **Distribution** | Marketplace repos (GitHub, npm, git) | Version control or manual file copy |
| **Namespacing** | Namespaced: `/plugin-name:skill-name` | Direct: `/skill-name` |
| **Scoping** | Three scopes via `--scope` flag | Two locations (global `~/.claude/skills/`, project `.claude/skills/`) |

### Plugin Directory Structure

A plugin is a self-contained package:

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json           # Manifest (name, version, component paths)
├── skills/                   # Skills bundled with this plugin
│   └── my-skill/
│       └── SKILL.md
├── agents/                   # Agent definitions
├── hooks/
│   └── hooks.json            # Lifecycle hooks
├── .mcp.json                 # MCP server configs
├── .lsp.json                 # LSP server configs
├── output-styles/            # Output style definitions
├── settings.json             # Default settings
└── scripts/                  # Utility scripts for hooks
```

Important: component directories (`skills/`, `agents/`, `hooks/`, etc.) go at
the **plugin root**, not inside `.claude-plugin/`. Only `plugin.json` belongs in
`.claude-plugin/`.

### Skill File Structure

A standalone skill is minimal:

```markdown
---
name: my-skill
description: Brief description of what this skill does
---

Instructions for Claude when this skill is invoked...
```

Skills are auto-discovered — no installation command needed. Place the file in
the appropriate directory and it's immediately available:

```bash
# Global skill (all projects)
~/.claude/skills/my-skill/SKILL.md

# Project skill (team-shared)
<repo>/.claude/skills/my-skill/SKILL.md
```

---

## Layered Configuration Precedence

Settings are resolved using a **highest-scope-wins** model:

```
Priority (highest to lowest):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 1. Local     .claude/settings.local.json    (gitignored, personal)
 2. Project   .claude/settings.json          (version-controlled, team)
 3. User      ~/.claude/settings.json        (global, personal)
 4. Managed   (enterprise/admin-controlled)  (read-only, organizational)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

When the same `enabledPlugins` key exists at multiple levels, the lower (more
specific) scope wins:

```
User:    { "my-plugin": true  }   # Enabled globally
Project: { "my-plugin": false }   # Disabled for this project  <-- WINS
Local:   (not set)                # No override
```

Result: plugin is disabled in this project, enabled everywhere else.

```
User:    { "my-plugin": true  }   # Enabled globally
Project: { "my-plugin": true  }   # Also enabled at project level
Local:   { "my-plugin": false }   # Disabled just for you  <-- WINS
```

Result: plugin is disabled only for you in this project.

---

## Key Files Reference

| File | Location | Purpose |
|------|----------|---------|
| `settings.json` | `~/.claude/` | Global user settings, user-scoped `enabledPlugins` |
| `settings.json` | `<repo>/.claude/` | Project settings, project-scoped `enabledPlugins` |
| `settings.local.json` | `<repo>/.claude/` | Local overrides (gitignored), local-scoped `enabledPlugins` |
| `installed_plugins.json` | `~/.claude/plugins/` | Global registry of all installations (scope, version, SHA, paths) |
| `known_marketplaces.json` | `~/.claude/plugins/` | Registered marketplace sources and their local clone paths |
| `blocklist.json` | `~/.claude/plugins/` | Blocked plugins with reasons and timestamps |
| `plugin.json` | `<plugin>/.claude-plugin/` | Plugin manifest defining name, version, and component paths |
| `marketplace.json` | `<marketplace>/.claude-plugin/` | Marketplace catalog listing available plugins |

---

## Common Pitfalls

### 1. Confusing `~/.claude/cache/` with `~/.claude/plugins/cache/`

- `~/.claude/cache/` — CLI metadata only (contains `changelog.md`)
- `~/.claude/plugins/cache/` — actual downloaded plugin files

### 2. Installing from the wrong directory

The `projectPath` in `installed_plugins.json` is recorded based on your current
working directory at install time. If you install a "project" scoped plugin from
`/home/ubuntu` instead of `/home/ubuntu/dev/akashi`, the CLI records the wrong
project path. This can cause confusing errors when trying to uninstall later.

### 3. Uninstalling project-scoped plugins directly

The CLI refuses to uninstall project-scoped plugins without disabling them first.
This is intentional — project settings are shared with the team, so removal
requires explicit acknowledgment. Always disable first:

```bash
claude plugin disable <plugin> --scope project
claude plugin uninstall <plugin> --scope project
```

### 4. Assuming uninstall removes cached files

Uninstall only removes settings entries and the `installed_plugins.json` record.
The downloaded plugin files remain in `~/.claude/plugins/cache/` for fast
reinstallation. To fully purge, manually delete the cache directory.

### 5. Plugin skills appear namespaced

When a plugin contains skills, they appear as `/plugin-name:skill-name` (e.g.,
`/marketing-skills:marketing-skill`). Standalone skills in `.claude/skills/`
appear without namespace (e.g., `/webapp-testing`). This avoids collisions but
can be surprising if you're searching for a skill by its short name.

---

## CLI Command Reference

```bash
# List installed plugins
claude plugin list

# Install at different scopes
claude plugin install <plugin>@<marketplace>                  # default: user scope
claude plugin install <plugin>@<marketplace> --scope user
claude plugin install <plugin>@<marketplace> --scope project
claude plugin install <plugin>@<marketplace> --scope local

# Enable / disable
claude plugin enable <plugin>@<marketplace> --scope <scope>
claude plugin disable <plugin>@<marketplace> --scope <scope>

# Uninstall
claude plugin uninstall <plugin>@<marketplace> --scope <scope>
claude plugin uninstall <plugin>@<marketplace> --keep-data

# Marketplace management
claude plugin marketplace add owner/repo
claude plugin marketplace add https://git-url
claude plugin marketplace add ./local-path

# Update and validate
claude plugin update <plugin>@<marketplace>
claude plugin validate ./path-to-plugin
```
