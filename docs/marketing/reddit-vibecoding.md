# Reddit r/vibecoding Post Draft

**Title:** Built a "flight recorder" for vibe coding sessions -- see exactly what your AI agents did

---

When I'm deep in a vibe coding flow with Claude Code, I lose track
of what happened during long sessions. Which tools fired? How many
tokens did I burn? What did the subagents actually do?

I built Akashi -- a VS Code extension with a "Pulse" dashboard that
reads your Claude session data and shows:
- Full conversation replay
- Gantt chart of tool executions (see parallelism!)
- Subagent tree visualization
- Activity heatmaps and token breakdowns

It also manages your AI rules (CLAUDE.md, .cursor/rules, AGENTS.md)
across all tools in one sidebar with an interactive graph view.

Free, open source: https://github.com/ypolon7kiy/akashi

Anyone else want better visibility into their vibe coding sessions?
