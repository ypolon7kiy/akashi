/**
 * Effective user-scope tool directories (from settings / env / defaults).
 * Used by home-path collection and user-scope kind inference.
 */
export interface ToolUserRoots {
  readonly claudeUserRoot: string;
  readonly cursorUserRoot: string;
  readonly geminiUserRoot: string;
  readonly codexUserRoot: string;
}
