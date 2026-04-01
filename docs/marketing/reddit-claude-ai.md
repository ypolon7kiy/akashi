# Reddit r/ClaudeAI Post Draft (v2 — updated for showcase rules)

**Title:** I used Claude Code to build a VS Code extension that visualizes your Claude Code sessions -- conversation replay, Gantt charts, subagent trees, and more

---

I've been using Claude Code daily for months, and two things kept
frustrating me:

1. My CLAUDE.md + .claude/rules/ + hooks + skills setup was getting complex.
   I couldn't see how all the files related to each other or spot conflicts.
2. After long Claude Code sessions I had no way to review what happened --
   which tools ran, how many tokens were spent, what subagents actually did.

So I used Claude Code itself to build **Akashi**, a VS Code extension that
solves both problems. The entire codebase -- TypeScript, React webviews,
D3 visualizations -- was built with Claude Code as my primary coding partner.

## What it does

**Part 1: Rules sidebar**

Akashi scans your workspace and home config, then indexes every guideline
file -- CLAUDE.md, .claude/rules/, .claude/hooks/, .claude/skills/,
.claude/commands/, .mcp.json, and settings. It shows them in a unified
tree view with:

- An interactive D3 force-directed graph that visualizes how rule files
  relate (containment, siblings, cross-references)
- Real-time search and filtering by provider, category, and scope
  (workspace vs. user-home)
- A community add-ons marketplace for installing Claude skills with one click
- Support for Cursor, Codex, and Gemini rules too (4 tool families total)

**Part 2: Pulse analytics dashboard**

Pulse reads your ~/.claude/projects/ JSONL session data and turns it into
a visual dashboard inside VS Code:

- **Session browser** -- browse sessions grouped by project, with search
  and date filtering
- **Conversation replay** -- step through full conversations: your prompts,
  Claude's responses, and every tool call
- **Gantt chart** -- see exactly when Read, Write, Bash, Edit, and other
  tools fired, which ran in parallel, and where bottlenecks are
- **Subagent tree** -- visualize how subagents spawned and what each one did
- **Activity heatmaps** -- spot your usage patterns across days and hours
- **Infographics** -- token usage breakdowns, tool-call frequency charts,
  and session duration stats

The Gantt view has been the most eye-opening for me -- you can actually see
Claude Code's parallelism in action and identify where sessions slow down.

## How Claude Code helped build it

Claude Code was involved in virtually every part of development:

- Designed the domain-driven architecture (6 bounded contexts: sources,
  graph, addons, pulse, search, config)
- Built the React webview panels and D3 graph rendering
- Implemented the JSONL session parser that powers Pulse
- Wrote the file system watchers and VS Code extension API integrations
- Helped with test coverage and CI pipeline setup

The project has ~160 commits and the extension's display name literally
includes "Built using Claude" because it genuinely was.

## Try it (completely free, open source)

- **VS Code Marketplace:** https://marketplace.visualstudio.com/items?itemName=akashi.akashi
- **Open VSX (for Cursor):** https://open-vsx.org/extension/akashi/akashi
- **GitHub (Apache 2.0):** https://github.com/ypolon7kiy/akashi

Install it, open a workspace with Claude Code files, and the sidebar
populates automatically. For Pulse, run "Akashi: Show Pulse dashboard"
from the command palette.

100% free, no paid tiers, no telemetry. Contributions welcome -- there
are good-first-issue labels on GitHub.

How do you all review and learn from your Claude Code sessions? I'm curious
what visibility tools others are using.
