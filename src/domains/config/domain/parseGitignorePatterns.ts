/**
 * Parses the text content of a `.gitignore` file into a list of simple exclusion
 * patterns (bare directory names or simple globs like `*.log`).
 *
 * Intentionally simplified — skips negation (`!`), path-containing patterns
 * (`foo/bar`), and other advanced gitignore features that don't map cleanly to
 * the VS Code `findFiles` exclude glob or the home directory walker.
 */
export function parseGitignorePatterns(content: string): readonly string[] {
  const out: string[] = [];
  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) {
      continue;
    }
    if (line.startsWith('!')) {
      continue;
    }
    const stripped = line.endsWith('/') ? line.slice(0, -1) : line;
    if (stripped === '') {
      continue;
    }
    // Skip patterns with internal path separators — we only handle simple names/globs.
    if (stripped.includes('/')) {
      continue;
    }
    out.push(stripped);
  }
  return out;
}
