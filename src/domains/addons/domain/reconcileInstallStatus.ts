/**
 * Derive a plugin-comparable name from a filesystem path.
 *
 * - Folder-layout: `.claude/skills/my-skill/SKILL.md` → `my-skill`
 * - Flat file:     `.claude/commands/foo.md`           → `foo`
 */
export function deriveNameFromPath(filePath: string): string {
  const norm = filePath.replace(/\\/g, '/');

  if (norm.endsWith('/SKILL.md')) {
    const withoutFile = norm.slice(0, norm.lastIndexOf('/'));
    const slash = withoutFile.lastIndexOf('/');
    return slash >= 0 ? withoutFile.slice(slash + 1) : withoutFile;
  }

  const lastSlash = norm.lastIndexOf('/');
  const basename = lastSlash >= 0 ? norm.slice(lastSlash + 1) : norm;
  return basename.replace(/\.\w+$/i, '');
}
