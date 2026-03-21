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

/**
 * Absolute paths under the user home directory to scan when `includeHomeConfig` is true,
 * filtered by {@link allowedKinds}.
 */
export async function collectHomeSourcePaths(
  homeDir: string,
  allowedKinds: ReadonlySet<SourceKindType>
): Promise<string[]> {
  const paths: string[] = [];
  const seen = new Set<string>();

  const add = (p: string): void => {
    if (!seen.has(p)) {
      seen.add(p);
      paths.push(p);
    }
  };

  const homeFiles: { segments: string[]; kinds: readonly SourceKindType[] }[] = [
    { segments: ['.cursor', 'mcp.json'], kinds: [SourceKind.CursorMcpJson] },
    { segments: ['.codex', 'config.toml'], kinds: [SourceKind.CodexConfigToml] },
    { segments: ['.claude', 'CLAUDE.md'], kinds: [SourceKind.ClaudeMd] },
    { segments: ['.claude', 'settings.json'], kinds: [SourceKind.ClaudeSettingsJson] },
    { segments: ['.claude', 'settings.local.json'], kinds: [SourceKind.ClaudeSettingsJson] },
    { segments: ['.gemini', 'GEMINI.md'], kinds: [SourceKind.GeminiMd] },
    {
      segments: ['.github', 'copilot-instructions.md'],
      kinds: [SourceKind.GithubCopilotInstructionsMd],
    },
  ];

  for (const row of homeFiles) {
    if (!kindsIntersect(allowedKinds, row.kinds)) {
      continue;
    }
    const abs = path.join(homeDir, ...row.segments);
    if (await fileExists(abs)) {
      add(abs);
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
    const rulesDir = path.join(homeDir, '.claude', 'rules');
    for (const f of await collectShallowFilesWithSuffix(rulesDir, '.md')) {
      add(f);
    }
  }

  if (kindsIntersect(allowedKinds, [SourceKind.ClaudeHookFile])) {
    const hooksDir = path.join(homeDir, '.claude', 'hooks');
    for (const f of await collectFilesRecursiveUnderDir(hooksDir)) {
      add(f);
    }
  }

  if (kindsIntersect(allowedKinds, [SourceKind.CursorRulesMdc])) {
    const rulesDir = path.join(homeDir, '.cursor', 'rules');
    for (const f of await collectShallowFilesWithSuffix(rulesDir, '.mdc')) {
      add(f);
    }
  }

  return paths;
}
