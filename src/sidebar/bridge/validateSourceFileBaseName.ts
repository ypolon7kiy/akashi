/**
 * Rules for a single path segment when creating or renaming a file/folder from the sources tree.
 * Shared by the webview (early UX) and the extension host (defense in depth).
 */

const INVALID_BASE_NAME_CHARS = /[/\\?%*:|"<>]/;

/** `null` if valid; otherwise a short user-facing reason. */
export function validateSourceFileBaseName(name: string): string | null {
  if (/\s$/.test(name)) {
    return 'Name cannot end with a space.';
  }
  const t = name.trim();
  if (t === '' || t === '.' || t === '..') {
    return 'Enter a valid name.';
  }
  if (t.endsWith('.')) {
    return 'Name cannot end with a period.';
  }
  if (INVALID_BASE_NAME_CHARS.test(t)) {
    return 'Name cannot contain / \\ : * ? " < > |';
  }
  return null;
}
