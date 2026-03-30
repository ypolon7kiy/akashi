import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { PulseFileReader } from '../application/ports';

export class NodePulseFileReader implements PulseFileReader {
  private readonly resolvedRoot: string;

  constructor(projectsDir: string) {
    this.resolvedRoot = path.resolve(projectsDir);
  }

  async readProjectDirs(): Promise<readonly string[]> {
    const entries = await fs.readdir(this.resolvedRoot, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => path.join(this.resolvedRoot, e.name));
  }

  async readSessionFiles(projectDir: string): Promise<readonly string[]> {
    this.assertWithinRoot(projectDir);
    const entries = await fs.readdir(projectDir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith('.jsonl'))
      .map((e) => path.join(projectDir, e.name));
  }

  async readFileContent(filePath: string): Promise<string> {
    this.assertWithinRoot(filePath);
    return fs.readFile(filePath, 'utf-8');
  }

  async countSubagentFiles(projectDir: string, sessionId: string): Promise<number> {
    this.assertWithinRoot(projectDir);
    const subagentDir = path.join(projectDir, sessionId, 'subagents');
    try {
      const entries = await fs.readdir(subagentDir, { withFileTypes: true });
      return entries.filter((e) => e.isFile() && e.name.endsWith('.jsonl')).length;
    } catch {
      return 0;
    }
  }

  async readSubagentEntries(
    projectDir: string,
    sessionId: string
  ): Promise<readonly { agentId: string; content: string; metaContent?: string }[]> {
    this.assertWithinRoot(projectDir);
    const subagentDir = path.join(projectDir, sessionId, 'subagents');
    let files: string[];
    try {
      const entries = await fs.readdir(subagentDir, { withFileTypes: true });
      files = entries.filter((e) => e.isFile() && e.name.endsWith('.jsonl')).map((e) => e.name);
    } catch {
      return [];
    }

    const results: { agentId: string; content: string; metaContent?: string }[] = [];
    for (const file of files) {
      const agentId = file.replace('.jsonl', '');
      const filePath = path.join(subagentDir, file);
      const metaPath = path.join(subagentDir, `${agentId}.meta.json`);

      let content: string;
      try {
        content = await fs.readFile(filePath, 'utf-8');
      } catch {
        continue;
      }

      let metaContent: string | undefined;
      try {
        metaContent = await fs.readFile(metaPath, 'utf-8');
      } catch {
        // meta file is optional
      }

      results.push({ agentId, content, metaContent });
    }

    return results;
  }

  async deleteSessionFile(projectDir: string, sessionId: string): Promise<void> {
    this.assertWithinRoot(projectDir);
    const jsonlPath = path.join(projectDir, `${sessionId}.jsonl`);
    await fs.rm(jsonlPath, { force: true });
    // Remove the session's subagent directory if present
    const subagentDir = path.join(projectDir, sessionId);
    await fs.rm(subagentDir, { recursive: true, force: true });
  }

  /** Reject any path that escapes the projects root directory. */
  private assertWithinRoot(targetPath: string): void {
    const resolved = path.resolve(targetPath);
    if (resolved !== this.resolvedRoot && !resolved.startsWith(this.resolvedRoot + path.sep)) {
      throw new Error(`Path traversal rejected: ${targetPath}`);
    }
  }
}
