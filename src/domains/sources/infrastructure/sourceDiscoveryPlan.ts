import type { Dirent } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { SourceKind, type SourceKind as SourceKindType } from '../domain/model';

const SKIP_DIR_NAMES = new Set(['node_modules', '.git', 'dist']);

function kindsIntersect(
  allowed: ReadonlySet<SourceKindType>,
  probeKinds: readonly SourceKindType[]
): boolean {
  return probeKinds.some((k) => allowed.has(k));
}

/** Each VS Code workspace glob and the {@link SourceKind} values it can produce. */
export const WORKSPACE_GLOB_DEFINITIONS: readonly {
  readonly glob: string;
  readonly kinds: readonly SourceKindType[];
}[] = [
  {
    glob: '**/{AGENTS.md,agents.md,.agents.md,TEAM_GUIDE.md,team_guide.md,CLAUDE.md,claude.md,GEMINI.md,gemini.md,.cursorrules}',
    kinds: [
      SourceKind.AgentsMd,
      SourceKind.DotAgentsMd,
      SourceKind.TeamGuideMd,
      SourceKind.ClaudeMd,
      SourceKind.GeminiMd,
      SourceKind.CursorLegacyRules,
    ],
  },
  {
    glob: '**/.claude/settings.json',
    kinds: [SourceKind.ClaudeSettingsJson],
  },
  {
    glob: '**/.claude/settings.local.json',
    kinds: [SourceKind.ClaudeSettingsJson],
  },
  {
    glob: '**/.claude/rules/*.md',
    kinds: [SourceKind.ClaudeRulesMd],
  },
  {
    glob: '**/.claude/hooks/**',
    kinds: [SourceKind.ClaudeHookFile],
  },
  {
    glob: '**/.cursor/rules/*.mdc',
    kinds: [SourceKind.CursorRulesMdc],
  },
  {
    glob: '**/.cursor/mcp.json',
    kinds: [SourceKind.CursorMcpJson],
  },
  {
    glob: '**/.github/copilot-instructions.md',
    kinds: [SourceKind.GithubCopilotInstructionsMd],
  },
  {
    glob: '**/.codex/AGENTS.md',
    kinds: [SourceKind.AgentsMd],
  },
  {
    glob: '**/.codex/agents.md',
    kinds: [SourceKind.AgentsMd],
  },
  {
    glob: '**/.codex/config.toml',
    kinds: [SourceKind.CodexConfigToml],
  },
  {
    glob: '**/AGENTS.override.md',
    kinds: [SourceKind.CodexAgentsOverrideMd],
  },
  {
    glob: '**/.codex/rules/*.rules',
    kinds: [SourceKind.CodexRulesFile],
  },
  {
    glob: '**/.agents/skills/**/SKILL.md',
    kinds: [SourceKind.AgentsSkillMd],
  },
  {
    glob: '**/.cursor/skills/**/SKILL.md',
    kinds: [SourceKind.CursorSkillMd],
  },
  {
    glob: '**/.claude/skills/**/SKILL.md',
    kinds: [SourceKind.ClaudeSkillMd],
  },
  {
    glob: '**/.codex/skills/**/SKILL.md',
    kinds: [SourceKind.CodexSkillMd],
  },
  {
    glob: '**/.agent/skills/**/SKILL.md',
    kinds: [SourceKind.GeminiAntigravitySkillMd],
  },
];

export function selectWorkspaceGlobs(allowedKinds: ReadonlySet<SourceKindType>): string[] {
  return WORKSPACE_GLOB_DEFINITIONS.filter((row) => kindsIntersect(allowedKinds, row.kinds)).map(
    (row) => row.glob
  );
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

async function collectFilesRecursiveUnderDir(rootDir: string): Promise<string[]> {
  const out: string[] = [];
  const stack: string[] = [rootDir];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries: Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIR_NAMES.has(e.name)) {
          continue;
        }
        stack.push(full);
      } else if (e.isFile()) {
        out.push(full);
      }
    }
  }
  return out;
}

async function collectShallowFilesWithSuffix(dir: string, suffix: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith(suffix))
      .map((e) => path.join(dir, e.name));
  } catch {
    return [];
  }
}

/** Recursive files under `rootDir` whose basename is `SKILL.md` (case-insensitive). */
async function collectSkillMdRecursiveUnderDir(rootDir: string): Promise<string[]> {
  const all = await collectFilesRecursiveUnderDir(rootDir);
  return all.filter((p) => path.basename(p).toLowerCase() === 'skill.md');
}

/**
 * Codex CLI “home” directory (default `~/.codex`, or `CODEX_HOME`): `AGENTS.md`, `config.toml`,
 * `AGENTS.override.md`, and shallow `rules/*.rules`.
 */
async function collectCodexHomeDirectoryPaths(
  codexHomeDir: string,
  allowedKinds: ReadonlySet<SourceKindType>,
  add: (p: string) => void
): Promise<void> {
  const files: { segments: string[]; kinds: readonly SourceKindType[] }[] = [
    { segments: ['AGENTS.md'], kinds: [SourceKind.AgentsMd] },
    { segments: ['agents.md'], kinds: [SourceKind.AgentsMd] },
    { segments: ['config.toml'], kinds: [SourceKind.CodexConfigToml] },
    { segments: ['AGENTS.override.md'], kinds: [SourceKind.CodexAgentsOverrideMd] },
  ];
  for (const row of files) {
    if (!kindsIntersect(allowedKinds, row.kinds)) {
      continue;
    }
    const abs = path.join(codexHomeDir, ...row.segments);
    if (await fileExists(abs)) {
      add(abs);
    }
  }
  if (kindsIntersect(allowedKinds, [SourceKind.CodexRulesFile])) {
    const rulesDir = path.join(codexHomeDir, 'rules');
    for (const f of await collectShallowFilesWithSuffix(rulesDir, '.rules')) {
      add(f);
    }
  }
}

export interface CollectHomeSourcePathsOptions {
  /** Absolute user-scope Claude Code config directory (may differ from `~/.claude`). */
  readonly claudeUserRoot: string;
  /** Absolute user-scope Cursor config directory (may differ from `~/.cursor`). */
  readonly cursorUserRoot: string;
  /** Absolute user-scope Gemini config directory (may differ from `~/.gemini`). */
  readonly geminiUserRoot: string;
  /** Absolute user-scope Codex CLI directory (may differ from `~/.codex` / `CODEX_HOME`). */
  readonly codexUserRoot: string;
}

/**
 * Absolute paths under the user home directory to scan when `includeHomeConfig` is true,
 * filtered by {@link allowedKinds}.
 */
export async function collectHomeSourcePaths(
  homeDir: string,
  allowedKinds: ReadonlySet<SourceKindType>,
  options: CollectHomeSourcePathsOptions
): Promise<string[]> {
  const { claudeUserRoot, cursorUserRoot, geminiUserRoot, codexUserRoot } = options;
  const paths: string[] = [];
  const seen = new Set<string>();

  const add = (p: string): void => {
    if (!seen.has(p)) {
      seen.add(p);
      paths.push(p);
    }
  };

  const toolHomeFiles: { abs: string; kinds: readonly SourceKindType[] }[] = [
    { abs: path.join(cursorUserRoot, 'mcp.json'), kinds: [SourceKind.CursorMcpJson] },
    { abs: path.join(claudeUserRoot, 'CLAUDE.md'), kinds: [SourceKind.ClaudeMd] },
    { abs: path.join(claudeUserRoot, 'settings.json'), kinds: [SourceKind.ClaudeSettingsJson] },
    {
      abs: path.join(claudeUserRoot, 'settings.local.json'),
      kinds: [SourceKind.ClaudeSettingsJson],
    },
    { abs: path.join(geminiUserRoot, 'GEMINI.md'), kinds: [SourceKind.GeminiMd] },
    {
      abs: path.join(homeDir, '.github', 'copilot-instructions.md'),
      kinds: [SourceKind.GithubCopilotInstructionsMd],
    },
  ];

  for (const row of toolHomeFiles) {
    if (!kindsIntersect(allowedKinds, row.kinds)) {
      continue;
    }
    if (await fileExists(row.abs)) {
      add(row.abs);
    }
  }

  const codexRoot = path.normalize(codexUserRoot);
  await collectCodexHomeDirectoryPaths(codexRoot, allowedKinds, add);

  if (kindsIntersect(allowedKinds, [SourceKind.CodexSkillMd])) {
    const codexSkills = path.join(codexRoot, 'skills');
    for (const f of await collectSkillMdRecursiveUnderDir(codexSkills)) {
      add(f);
    }
  }

  if (kindsIntersect(allowedKinds, [SourceKind.CursorSkillMd])) {
    const cursorSkills = path.join(cursorUserRoot, 'skills');
    for (const f of await collectSkillMdRecursiveUnderDir(cursorSkills)) {
      add(f);
    }
  }

  if (kindsIntersect(allowedKinds, [SourceKind.ClaudeSkillMd])) {
    const claudeSkills = path.join(claudeUserRoot, 'skills');
    for (const f of await collectSkillMdRecursiveUnderDir(claudeSkills)) {
      add(f);
    }
  }

  if (kindsIntersect(allowedKinds, [SourceKind.GeminiAntigravitySkillMd])) {
    const antigravitySkills = path.join(geminiUserRoot, 'antigravity', 'skills');
    for (const f of await collectSkillMdRecursiveUnderDir(antigravitySkills)) {
      add(f);
    }
  }

  if (kindsIntersect(allowedKinds, [SourceKind.CursorLegacyRules])) {
    const cursorrules = path.join(homeDir, '.cursorrules');
    if (await fileExists(cursorrules)) {
      add(cursorrules);
    }
  }

  if (kindsIntersect(allowedKinds, [SourceKind.AgentsMd])) {
    for (const name of ['AGENTS.md', 'agents.md'] as const) {
      const abs = path.join(homeDir, name);
      if (await fileExists(abs)) {
        add(abs);
      }
    }
  }
  if (kindsIntersect(allowedKinds, [SourceKind.DotAgentsMd])) {
    const abs = path.join(homeDir, '.agents.md');
    if (await fileExists(abs)) {
      add(abs);
    }
  }
  if (kindsIntersect(allowedKinds, [SourceKind.TeamGuideMd])) {
    for (const name of ['TEAM_GUIDE.md', 'team_guide.md'] as const) {
      const abs = path.join(homeDir, name);
      if (await fileExists(abs)) {
        add(abs);
      }
    }
  }

  if (kindsIntersect(allowedKinds, [SourceKind.ClaudeRulesMd])) {
    const rulesDir = path.join(claudeUserRoot, 'rules');
    for (const f of await collectShallowFilesWithSuffix(rulesDir, '.md')) {
      add(f);
    }
  }

  if (kindsIntersect(allowedKinds, [SourceKind.ClaudeHookFile])) {
    const hooksDir = path.join(claudeUserRoot, 'hooks');
    for (const f of await collectFilesRecursiveUnderDir(hooksDir)) {
      add(f);
    }
  }

  if (kindsIntersect(allowedKinds, [SourceKind.CursorRulesMdc])) {
    const rulesDir = path.join(cursorUserRoot, 'rules');
    for (const f of await collectShallowFilesWithSuffix(rulesDir, '.mdc')) {
      add(f);
    }
  }

  return paths;
}
