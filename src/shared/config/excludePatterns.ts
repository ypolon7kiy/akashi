/** Resolved exclusion patterns ready for consumption by source scanners. */
export interface ResolvedExcludePatterns {
  /** Glob string for vscode.workspace.findFiles exclude parameter. */
  readonly findFilesExcludeGlob: string;
  /** Simple directory names for the home directory walker's Set-based check. Always includes `.git`. */
  readonly homeScanSkipDirNames: ReadonlySet<string>;
}

/** Returns resolved exclude patterns (reads .gitignore + user settings). */
export type ExcludePatternsGetter = () => Promise<ResolvedExcludePatterns>;
