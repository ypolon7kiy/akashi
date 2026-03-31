# Reddit r/cursor_ai Post Draft

**Title:** Managing .cursor/rules across projects + session analytics -- I built a VS Code extension

---

With the move from .cursorrules to .cursor/rules/ and .mdc files,
I found it harder to keep track of what rules were active where.

I built Akashi -- it scans your workspace and home config, shows
everything in a sidebar with search and a D3 graph view for
visualizing how rules relate. Works with Cursor, Claude, Codex,
and Gemini.

It also has a Pulse dashboard that shows Claude Code session
analytics (conversation replay, tool execution Gantt, token usage).
Planning to add Cursor session support too.

Open source: https://github.com/ypolon7kiy/akashi
Marketplace: https://marketplace.visualstudio.com/items?itemName=akashi.akashi
