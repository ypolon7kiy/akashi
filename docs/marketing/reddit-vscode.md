# Reddit r/vscode Post Draft

**Title:** I built a VS Code extension that unifies AI agent rules + shows session analytics with Gantt charts

---

If you use Claude Code, Cursor, Codex, or Gemini, you probably have rules
scattered across CLAUDE.md, .cursor/rules/, AGENTS.md, GEMINI.md, and more.

I built Akashi -- a free VS Code extension that:

**1. Unifies all your AI rules in one sidebar**
- Tree view of every guideline file across all 4 providers
- Interactive D3 force-directed graph showing how rules relate
- Real-time search and filtering by provider, category, scope
- Community add-ons marketplace for Claude skills

**2. Pulse Analytics Dashboard**
- Browse your Claude Code sessions grouped by project
- Full conversation replay (prompts, responses, tool calls)
- Gantt chart of tool executions -- see parallelism and bottlenecks
- Subagent tree visualization
- Activity heatmaps and token breakdowns

Works with VS Code 1.85+ and Cursor (via Open VSX).

- VS Code Marketplace: https://marketplace.visualstudio.com/items?itemName=akashi.akashi
- Open source (Apache 2.0): https://github.com/ypolon7kiy/akashi

Would love feedback -- especially from anyone managing complex rule setups
across multiple AI tools.
