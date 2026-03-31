# Reddit r/ClaudeAI Post Draft

**Title:** I built a VS Code extension that visualizes your Claude Code sessions -- conversation replay, Gantt charts, and token analytics

---

Two things frustrated me about Claude Code:
1. My CLAUDE.md + .claude/rules/ setup was getting complex and I couldn't
   see how files related
2. After long sessions I had no way to review what happened -- which tools
   ran, how tokens were spent, what subagents did

So I built Akashi. It has two parts:

**Rules sidebar** -- indexes CLAUDE.md, rules, hooks, skills, commands,
and MCP configs. Shows them in a tree view with an interactive graph and
search. Also works with Cursor, Codex, and Gemini.

**Pulse dashboard** -- reads your ~/.claude/projects/ session data and
shows conversation replay, a Gantt chart of tool executions, subagent
trees, activity heatmaps, and token usage breakdowns.

The Gantt view is what I find most useful -- you can see exactly when
Write, Bash, Read tools fired, which ran in parallel, and where time
was spent.

Free, open source (Apache 2.0): https://github.com/ypolon7kiy/akashi
VS Code Marketplace: https://marketplace.visualstudio.com/items?itemName=akashi.akashi

How do you all review and learn from your Claude Code sessions?
