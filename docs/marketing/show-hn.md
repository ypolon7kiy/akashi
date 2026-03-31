# Show HN Post Draft

**Title:** Show HN: Akashi -- Manage AI agent rules + see your Claude Code session analytics in VS Code

---

I use Claude Code, Cursor, and Gemini for different projects. My rules were
scattered -- CLAUDE.md here, .cursorrules there, AGENTS.md somewhere else.
When rules conflicted, agents did unexpected things and I had no visibility.

So I built Akashi, a VS Code extension with two parts:

1. Rules management -- indexes every guideline file across Claude, Cursor,
   Codex, and Gemini. Shows them in one sidebar with an interactive D3
   graph, search/filter, and a community add-ons marketplace.

2. Pulse dashboard -- reads your ~/.claude/projects/ session data and shows:
   - Session browser with project grouping and search
   - Full conversation replay (user prompts, AI responses, tool calls)
   - Gantt chart of tool executions (see parallelism and bottlenecks)
   - Subagent tree visualization
   - Activity charts and usage heatmaps
   - Task management with groups and status tracking

Open source (Apache 2.0): https://github.com/ypolon7kiy/akashi
VS Code Marketplace: https://marketplace.visualstudio.com/items?itemName=akashi.akashi
Open VSX (for Cursor): https://open-vsx.org/extension/akashi/akashi

The Pulse Gantt view has been the most eye-opening for me -- you can see
exactly where tool calls overlap, which subagents ran in parallel, and
where the bottlenecks are. Would love feedback.
