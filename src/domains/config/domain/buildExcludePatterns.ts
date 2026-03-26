import type { ResolvedExcludePatterns } from '../../../shared/config/excludePatterns';

const ALWAYS_EXCLUDED = '.git';

/**
 * Converts a deduplicated list of exclusion pattern strings into the two
 * representations consumed by the source scanners.
 *
 * - **Directory names** (no glob metacharacters) go into both the `findFiles`
 *   exclude glob and the `homeScanSkipDirNames` set.
 * - **Glob patterns** (contain `*` or `?`) only go into the `findFiles` glob
 *   because the home directory walker checks directory names, not globs.
 */
export function buildResolvedExcludePatterns(patterns: readonly string[]): ResolvedExcludePatterns {
  const dirNames = new Set<string>();
  const globPatterns: string[] = [];

  for (const p of patterns) {
    if (p.includes('*') || p.includes('?')) {
      globPatterns.push(p);
    } else {
      dirNames.add(p);
    }
  }

  // .git must always be excluded.
  dirNames.add(ALWAYS_EXCLUDED);

  const findFilesExcludeGlob = buildFindFilesGlob(dirNames, globPatterns);
  return { findFilesExcludeGlob, homeScanSkipDirNames: dirNames };
}

function buildFindFilesGlob(
  dirNames: ReadonlySet<string>,
  globPatterns: readonly string[]
): string {
  const parts: string[] = [];

  // Directory-name patterns: **/{a,b,c}/**
  if (dirNames.size > 0) {
    const sorted = [...dirNames].sort();
    parts.push(sorted.length === 1 ? `**/${sorted[0]}/**` : `**/{${sorted.join(',')}}/**`);
  }

  // File-glob patterns: **/pattern
  for (const g of globPatterns) {
    parts.push(g.startsWith('**/') ? g : `**/${g}`);
  }

  // VS Code findFiles accepts a single GlobPattern string.
  // When we have multiple distinct patterns, join with comma inside braces.
  if (parts.length === 0) {
    return `**/${ALWAYS_EXCLUDED}/**`;
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return `{${parts.join(',')}}`;
}
