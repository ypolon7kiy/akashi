import type { SourceKind } from './model';
import type { ToolUserRoots } from './toolUserRoots';

/** VS Code workspace glob and which {@link SourceKind} values it can yield. */
export interface WorkspaceGlobContribution {
  readonly glob: string;
  readonly kinds: readonly SourceKind[];
}

/**
 * Shared context while scanning user-home paths for the source index (`collectHomeSourcePaths`).
 */
export interface HomePathsContext {
  readonly homeDir: string;
  readonly allowedKinds: ReadonlySet<SourceKind>;
  readonly roots: ToolUserRoots;
  readonly add: (p: string) => void;
  readonly fileExists: (filePath: string) => Promise<boolean>;
  readonly collectShallowFilesWithSuffix: (dir: string, suffix: string) => Promise<string[]>;
  readonly collectFilesRecursiveUnderDir: (rootDir: string) => Promise<string[]>;
  readonly collectSkillMdRecursiveUnderDir: (rootDir: string) => Promise<string[]>;
}

/** One async unit of user-home path discovery; runs in parallel with sibling tasks. */
export type HomePathTask = (ctx: HomePathsContext) => Promise<void>;

export type SourcePresetId = 'claude' | 'cursor' | 'antigravity' | 'codex';

/**
 * One tool preset: kinds for settings union, workspace globs, user-home scan tasks, and
 * path classification (workspace / user) for tool-specific paths only.
 * Universal filenames (e.g. AGENTS.md) are handled in shared classifiers before these run.
 */
export interface SourcePresetDefinition {
  readonly id: SourcePresetId;
  readonly kinds: readonly SourceKind[];
  readonly workspaceGlobContributions: readonly WorkspaceGlobContribution[];
  readonly homePathTasks: readonly HomePathTask[];
  /** Return a kind only for workspace paths this preset owns; otherwise `undefined`. */
  readonly classifyWorkspacePath: (filePath: string) => SourceKind | undefined;
  /** Return a kind only for user-scope paths this preset owns; otherwise `undefined`. */
  readonly classifyUserPath: (filePath: string, roots: ToolUserRoots) => SourceKind | undefined;
}
