/**
 * Classifies a discovered file by convention (not MIME).
 * Values are stable for APIs/logs; names follow the cross-tool discovery checklist.
 *
 * Universal docs: AGENTS.md, .agents.md, TEAM_GUIDE.md
 * Tool instructions: CLAUDE.md, GEMINI.md
 * Claude Code: .claude/settings.json, .claude/settings.local.json, .claude/rules/*.md, .claude/hooks/** (+ ~/.claude/settings.json); discovery lives in `VscodeWorkspaceSourceScanner`.
 * Cursor: .cursorrules, .cursor/rules/*.mdc, .cursor/mcp.json (+ ~/.cursor/mcp.json)
 * Copilot: .github/copilot-instructions.md
 * Codex: .codex/config.toml (project or ~/.codex / $CODEX_HOME / setting akashi.sources.codexHome), AGENTS.override.md (any dir), .codex/rules/*.rules; not indexed: auth.json, history, logs/sessions.
 * Agent Skills: `SKILL.md` files under known skill roots only (catalog only, no frontmatter parse). Cursor loads `.agents/skills/`, `.cursor/skills/`, user `.cursor/skills/`, plus `.claude/skills/`, `.codex/skills/` and home counterparts. Antigravity-style layouts often use `.agent/skills/` (workspace) and user `.gemini/antigravity/skills/` (verify against your product version).
 */
export const SourceKind = {
  /** `AGENTS.md` / `agents.md` — universal agent instructions (repo, nested dirs). */
  AgentsMd: 'agents_md',
  /** `.agents.md` — universal / Codex fallback naming. */
  DotAgentsMd: 'dot_agents_md',
  /** `TEAM_GUIDE.md` / `team_guide.md` — team doc / Codex `project_doc_fallback_filenames`. */
  TeamGuideMd: 'team_guide_md',

  /** `CLAUDE.md` — Claude Code (project or `~/.claude/CLAUDE.md`). */
  ClaudeMd: 'claude_md',
  /** `.claude/settings.json` / `settings.local.json` (project or `~/.claude/settings.json`) — hooks and settings. */
  ClaudeSettingsJson: 'claude_settings_json',
  /** `.claude/rules/*.md` — project rules loaded with instructions. */
  ClaudeRulesMd: 'claude_rules_md',
  /** Files under `.claude/hooks/` — hook scripts referenced from settings. */
  ClaudeHookFile: 'claude_hook_file',
  /** `GEMINI.md` — Gemini CLI (project or `~/.gemini/GEMINI.md`). */
  GeminiMd: 'gemini_md',

  /** `.cursorrules` — Cursor legacy rules file. */
  CursorLegacyRules: 'cursor_legacy_rules',
  /** `.cursor/rules/*.mdc` — Cursor rules (MDC). */
  CursorRulesMdc: 'cursor_rules_mdc',
  /** `.cursor/mcp.json` or `~/.cursor/mcp.json` — MCP tool definitions. */
  CursorMcpJson: 'cursor_mcp_json',

  /** `.github/copilot-instructions.md` — GitHub Copilot guidance. */
  GithubCopilotInstructionsMd: 'github_copilot_instructions_md',

  /** `.codex/config.toml` (project or `~/.codex/config.toml`) — Codex TOML config. */
  CodexConfigToml: 'codex_config_toml',
  /** `AGENTS.override.md` — Codex per-directory instruction override (global, nested, or under `.codex/`). */
  CodexAgentsOverrideMd: 'codex_agents_override_md',
  /** `.codex/rules/*.rules` — Codex Starlark exec-policy rules (e.g. `default.rules`). */
  CodexRulesFile: 'codex_rules_file',

  /** Nested `.agents/skills/.../SKILL.md` — Agent Skills standard (project; Cursor and others). */
  AgentsSkillMd: 'agents_skill_md',
  /** `.cursor/skills/.../SKILL.md` or user `~/.cursor/skills/.../SKILL.md` — Cursor Agent Skills. */
  CursorSkillMd: 'cursor_skill_md',
  /** `.claude/skills/.../SKILL.md` or user `~/.claude/skills/.../SKILL.md` — Claude Code skills. */
  ClaudeSkillMd: 'claude_skill_md',
  /** `.codex/skills/.../SKILL.md` or Codex home `skills/.../SKILL.md`. */
  CodexSkillMd: 'codex_skill_md',
  /** `.agent/skills/.../SKILL.md` or user `~/.gemini/antigravity/skills/.../SKILL.md` — Antigravity-style skills. */
  GeminiAntigravitySkillMd: 'gemini_antigravity_skill_md',

  /** Matched path but no known convention (extend patterns / inference). */
  Unknown: 'unknown',
} as const;

export type SourceKind = (typeof SourceKind)[keyof typeof SourceKind];

export const SourceScope = {
  Workspace: 'workspace',
  File: 'file',
  User: 'user',
} as const;

export type SourceScope = (typeof SourceScope)[keyof typeof SourceScope];

/** One indexed source path: catalog entry only (no file body read into the index). */
export interface IndexedSourceEntry {
  id: string;
  path: string;
  kind: SourceKind;
  scope: SourceScope;
  origin: 'workspace' | 'user';
  metadata: {
    byteLength: number;
    updatedAt: string;
  };
}

export interface SourceIndexSnapshot {
  generatedAt: string;
  sourceCount: number;
  records: IndexedSourceEntry[];
}
