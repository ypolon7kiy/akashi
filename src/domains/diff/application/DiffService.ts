/**
 * Application service for the diff domain.
 *
 * Orchestrates git diff calls and returns raw diff strings.
 * Intentionally thin — diff2html handles parsing and rendering in the webview.
 */

import type { DiffTarget, DiffResult } from '../domain/model';
import { runGitDiff } from '../infrastructure/gitDiff';

export class DiffService {
  constructor(private readonly cwd: string) {}

  async getDiff(target: DiffTarget): Promise<DiffResult> {
    return runGitDiff(this.cwd, target);
  }

  async getWorkingDiff(): Promise<DiffResult> {
    return this.getDiff({ kind: 'working' });
  }

  async getStagedDiff(): Promise<DiffResult> {
    return this.getDiff({ kind: 'staged' });
  }

  async getCommitDiff(ref: string): Promise<DiffResult> {
    return this.getDiff({ kind: 'commit', ref });
  }
}
