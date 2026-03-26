import type { ResolvedExcludePatterns } from '../../../shared/config/excludePatterns';
import { buildResolvedExcludePatterns } from '../domain/buildExcludePatterns';
import { readUserExcludePatterns } from './vscodeAkashiExclude';
import { readWorkspaceGitignorePatterns } from './readWorkspaceGitignore';

/**
 * Combines `.gitignore` patterns from workspace roots with the user-defined
 * `akashi.exclude` setting, deduplicates, and produces the resolved patterns
 * ready for consumption by the source scanners.
 */
export async function resolveExcludePatterns(): Promise<ResolvedExcludePatterns> {
  const [gitignorePatterns, userPatterns] = await Promise.all([
    readWorkspaceGitignorePatterns(),
    Promise.resolve(readUserExcludePatterns()),
  ]);
  const combined = [...new Set([...gitignorePatterns, ...userPatterns])];
  return buildResolvedExcludePatterns(combined);
}
