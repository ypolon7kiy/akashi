import * as path from 'node:path';

/**
 * Resolves an optional `akashi.sources.*` directory setting to a single absolute path, or `null` if unset/invalid.
 * Accepts absolute paths or `~/…` / `~` relative to {@link homeDir}.
 */
export function resolveOptionalUserConfigDir(
  raw: string | undefined,
  homeDir: string
): string | null {
  if (raw == null) {
    return null;
  }
  const t = raw.trim();
  if (t === '') {
    return null;
  }
  let resolved: string;
  if (t.startsWith('~')) {
    const rest = t.slice(1).replace(/^[\\/]/, '');
    resolved = rest.length > 0 ? path.join(homeDir, rest) : homeDir;
  } else if (path.isAbsolute(t)) {
    resolved = t;
  } else {
    return null;
  }
  return path.normalize(resolved);
}
