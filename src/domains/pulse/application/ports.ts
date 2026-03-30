/** Port interface for reading Claude Code session files from the filesystem. */
export interface PulseFileReader {
  /** Return absolute paths of project directories under ~/.claude/projects/. */
  readProjectDirs(): Promise<readonly string[]>;

  /** Return absolute paths of session .jsonl files in a project directory (excluding subagents/). */
  readSessionFiles(projectDir: string): Promise<readonly string[]>;

  /** Read the full text content of a file. */
  readFileContent(filePath: string): Promise<string>;

  /** Count .jsonl files in a session's subagents/ directory. Returns 0 if directory doesn't exist. */
  countSubagentFiles(projectDir: string, sessionId: string): Promise<number>;

  /** Delete a session .jsonl file and its subagents/ directory if present. */
  deleteSessionFile(projectDir: string, sessionId: string): Promise<void>;

  /** Read subagent entries for a session. Returns agentId, content, and optional metadata. */
  readSubagentEntries(
    projectDir: string,
    sessionId: string
  ): Promise<
    readonly {
      agentId: string;
      content: string;
      metaContent?: string;
    }[]
  >;
}
