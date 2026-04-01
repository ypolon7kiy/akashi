# Reddit r/ChatGPTCoding Post Draft

**Title:** Managing AI coding rules across tools -- I built a VS Code extension that works with Claude, Cursor, Codex, and Gemini

---

If you use more than one AI coding tool, you've probably dealt with the
rules fragmentation problem -- CLAUDE.md for Claude Code, .cursor/rules
for Cursor, AGENTS.md for Codex, GEMINI.md for Gemini CLI. Different
files, different formats, different scoping rules.

I built Akashi to fix this. It's a VS Code extension that:

- **Indexes every AI guideline file** across all 4 tool families into
  one sidebar
- **Shows an interactive D3 graph** of how rules relate to each other
- **Search and filter** across hundreds of files by provider, category,
  or scope
- **Community add-ons marketplace** for reusable Claude skills

It also has a Pulse dashboard for Claude Code session analytics --
conversation replay, tool-execution Gantt charts, subagent trees, and
usage heatmaps. (Hoping to add support for other tools' session data too.)

Free and open source (Apache 2.0): https://github.com/ypolon7kiy/akashi
VS Code Marketplace: https://marketplace.visualstudio.com/items?itemName=akashi.akashi

What tools are you all using for managing your AI coding rules?
