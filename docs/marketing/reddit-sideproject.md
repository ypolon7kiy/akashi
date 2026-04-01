# Reddit r/SideProject Post Draft

**Title:** Akashi -- AI agent rules IDE + session analytics dashboard for VS Code (open source)

---

Hey! I've been building Akashi as a side project for the past few months
and just hit v1.0.13. It's a VS Code extension with two main features:

**The problem:** I use Claude Code, Cursor, and Gemini across different
projects. My AI rules were scattered everywhere -- CLAUDE.md, .cursor/rules,
AGENTS.md -- and after long coding sessions I had zero visibility into what
actually happened.

**What it does:**

1. **Rules Management** -- Indexes every AI guideline file across Claude,
   Cursor, Codex, and Gemini. Shows them in a unified sidebar with an
   interactive D3 graph, search, and a community add-ons marketplace.

2. **Pulse Dashboard** -- Reads Claude Code session data and shows
   conversation replay, tool-execution Gantt charts, subagent trees,
   activity heatmaps, and token usage breakdowns.

**Tech stack:** TypeScript, React, D3.js, VS Code Extension API

**Stats:** ~160 commits, Apache 2.0 license, published on VS Code
Marketplace and Open VSX

- GitHub: https://github.com/ypolon7kiy/akashi
- Marketplace: https://marketplace.visualstudio.com/items?itemName=akashi.akashi

Looking for contributors too -- good first issues are labeled on GitHub.
What do you think?
