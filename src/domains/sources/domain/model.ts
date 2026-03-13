/**
 * Classifies a discovered file by convention (not MIME).
 * Values are stable for APIs/logs; names follow the cross-tool discovery checklist.
 *
 * Universal docs: AGENTS.md, .agents.md, TEAM_GUIDE.md
 * Tool instructions: CLAUDE.md, GEMINI.md
 * Cursor: .cursorrules, .cursor/rules/*.mdc, .cursor/mcp.json (+ ~/.cursor/mcp.json)
 * Copilot: .github/copilot-instructions.md
 * Codex: ~/.codex/config.toml
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

  /** `~/.codex/config.toml` — Codex config (e.g. fallback doc names). */
  CodexConfigToml: 'codex_config_toml',

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

export interface SourceDocument {
  id: string;
  path: string;
  kind: SourceKind;
  scope: SourceScope;
  origin: 'workspace' | 'user';
  raw: string;
}

export interface NormalizedBlock {
  id: string;
  text: string;
}

export interface SourceRecord {
  document: SourceDocument;
  blocks: NormalizedBlock[];
  metadata: {
    byteLength: number;
    updatedAt: string;
  };
}

export interface SourceIndexSnapshot {
  generatedAt: string;
  sourceCount: number;
  records: SourceRecord[];
}
