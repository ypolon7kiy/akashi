/**
 * Thin infrastructure function that shells out to `git diff`.
 *
 * Uses `execFile` (not `exec`) to avoid shell injection — all arguments
 * are passed as an array directly to the git binary.
 */

import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import type { DiffTarget, DiffResult } from '../domain/model';

const execFile = promisify(execFileCb);

const DIFF_TIMEOUT_MS = 15_000;
const MAX_BUFFER = 10 * 1024 * 1024; // 10 MB

/** Build the argument list for `git diff` based on the target. */
export function buildDiffArgs(target: DiffTarget): readonly string[] {
  const base = ['diff', '--no-color', '-U3'];

  switch (target.kind) {
    case 'working':
      return base;
    case 'staged':
      return [...base, '--cached'];
    case 'commit':
      return [...base, `${target.ref}^`, target.ref];
    case 'range':
      return [...base, target.from, target.to];
  }
}

/** Run `git diff` in the given working directory and return a DiffResult. */
export async function runGitDiff(cwd: string, target: DiffTarget): Promise<DiffResult> {
  const args = buildDiffArgs(target);

  const { stdout } = await execFile('git', [...args], {
    cwd,
    timeout: DIFF_TIMEOUT_MS,
    maxBuffer: MAX_BUFFER,
  });

  return {
    target,
    raw: stdout,
    isEmpty: stdout.trim().length === 0,
  };
}
