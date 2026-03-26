/**
 * Accepts hex, rgb(a), hsl(a), or `var(--vscode-…)` for theme-linked overrides.
 * Rejects values that could break out of a `color:` declaration.
 */
export function sanitizeSidebarCategoryColorValue(raw: string): string | undefined {
  const s = raw.trim();
  if (s.length === 0 || s.length > 160) {
    return undefined;
  }
  if (/[;{}<>]/.test(s)) {
    return undefined;
  }
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(s)) {
    return s;
  }
  if (/^(rgb|rgba|hsl|hsla)\s*\([^)]*\)$/.test(s)) {
    return s;
  }
  if (/^var\s*\(\s*--[a-zA-Z][a-zA-Z0-9_.-]*\s*\)$/.test(s)) {
    return s;
  }
  return undefined;
}
