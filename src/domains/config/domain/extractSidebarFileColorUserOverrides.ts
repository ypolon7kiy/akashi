export interface SidebarFileColorsInspectLike {
  globalValue?: unknown;
  workspaceValue?: unknown;
  workspaceFolderValue?: unknown;
}

/**
 * User-provided layers only (global/workspace/workspaceFolder), in VS Code precedence order.
 * Defaults are intentionally excluded so CSS injection reflects explicit overrides only.
 */
export function extractSidebarFileColorUserOverrides(
  inspect: SidebarFileColorsInspectLike | undefined
): Readonly<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  let sawAny = false;

  for (const raw of [
    inspect?.globalValue,
    inspect?.workspaceValue,
    inspect?.workspaceFolderValue,
  ]) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      continue;
    }
    Object.assign(out, raw as Record<string, unknown>);
    sawAny = true;
  }

  return sawAny ? out : {};
}
