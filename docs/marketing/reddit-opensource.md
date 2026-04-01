# Reddit r/opensource Post Draft

**Title:** Akashi -- open source VS Code extension for managing AI agent rules and visualizing Claude Code sessions (Apache 2.0)

---

I've been working on Akashi, an open source VS Code extension that solves
two problems I kept running into with AI coding tools:

**1. Scattered rules** -- CLAUDE.md, .cursor/rules, AGENTS.md, GEMINI.md
all live in different places with different formats. Akashi indexes them
all into one sidebar with a D3 graph view and search.

**2. No session visibility** -- After long Claude Code sessions, I had no
way to review what happened. Akashi's Pulse dashboard shows conversation
replay, tool-execution Gantt charts, subagent trees, and usage heatmaps.

The project is Apache 2.0 licensed, has ~160 commits, and is looking for
contributors. I've set up:
- CONTRIBUTING.md with full dev setup instructions
- GitHub issue templates (bug reports, feature requests)
- PR template
- Good first issues labeled and ready to claim

If you use Claude Code, Cursor, Codex, or Gemini CLI, I'd appreciate
feedback on what's useful and what's missing.

GitHub: https://github.com/ypolon7kiy/akashi

Tech stack: TypeScript, React, D3.js, VS Code Extension API.
Domain-driven architecture with 6 bounded contexts (sources, graph,
addons, pulse, search, config).
