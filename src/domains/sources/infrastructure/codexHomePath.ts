import * as path from 'node:path';

/**
 * Resolves `akashi.sources.codexHome` to a single absolute directory, or `null` if unset/invalid.
 * Accepts absolute paths or `~/…` / `~` relative to {@link homeDir}.
 */
export function resolveCodexHomeSettingPath(
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
