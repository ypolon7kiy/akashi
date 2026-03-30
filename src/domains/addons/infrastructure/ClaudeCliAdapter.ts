/**
 * Infrastructure adapter that shells out to the Claude CLI binary
 * for plugin and marketplace management.
 *
 * Uses `execFile` (not `exec`) to avoid shell injection — arguments
 * are passed as an array directly to the binary.
 */

import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import type { ClaudeCliPort } from '../application/ports';
import type {
  CliAvailableResult,
  CliCommandResult,
  CliInstalledPlugin,
  CliMarketplace,
  CliScope,
} from '../domain/cliTypes';

const execFile = promisify(execFileCb);

const VERSION_TIMEOUT_MS = 5_000;
const COMMAND_TIMEOUT_MS = 30_000;

interface DetectResult {
  readonly available: boolean;
  readonly version?: string;
  readonly binaryPath?: string;
}

export class ClaudeCliAdapter implements ClaudeCliPort {
  private detectResult: DetectResult | null = null;
  private detectPromise: Promise<DetectResult> | null = null;
  private readonly log: (message: string) => void;

  constructor(log?: (message: string) => void) {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    this.log = log ?? (() => {});
  }

  // ── Detection ───────────────────────────────────────────────────────

  /** Detect the Claude CLI binary. Caches result for the session. */
  async detectCli(): Promise<DetectResult> {
    if (this.detectResult) return this.detectResult;
    if (this.detectPromise) return this.detectPromise;

    this.detectPromise = this.probeCliBinary();
    this.detectResult = await this.detectPromise;
    this.detectPromise = null;
    return this.detectResult;
  }

  async isAvailable(): Promise<boolean> {
    const result = await this.detectCli();
    return result.available;
  }

  // ── JSON queries ────────────────────────────────────────────────────

  async listInstalled(): Promise<readonly CliInstalledPlugin[]> {
    const { stdout } = await this.runCli(['plugin', 'list', '--json']);
    return parseJson<CliInstalledPlugin[]>(stdout, []);
  }

  async listAvailable(): Promise<CliAvailableResult> {
    const { stdout } = await this.runCli(['plugin', 'list', '--available', '--json']);
    return parseJson<CliAvailableResult>(stdout, { installed: [], available: [] });
  }

  async listMarketplaces(): Promise<readonly CliMarketplace[]> {
    const { stdout } = await this.runCli(['plugin', 'marketplace', 'list', '--json']);
    return parseJson<CliMarketplace[]>(stdout, []);
  }

  // ── Action commands ─────────────────────────────────────────────────

  async installPlugin(id: string, scope: CliScope, cwd?: string): Promise<CliCommandResult> {
    return this.runAction(['plugin', 'install', id, '--scope', scope], cwd);
  }

  async uninstallPlugin(id: string, scope?: CliScope, cwd?: string): Promise<CliCommandResult> {
    const args = ['plugin', 'uninstall', id];
    if (scope) args.push('--scope', scope);
    return this.runAction(args, cwd);
  }

  async addMarketplace(source: string): Promise<CliCommandResult> {
    return this.runAction(['plugin', 'marketplace', 'add', source]);
  }

  async removeMarketplace(name: string): Promise<CliCommandResult> {
    return this.runAction(['plugin', 'marketplace', 'remove', name]);
  }

  // ── Internal helpers ────────────────────────────────────────────────

  private async probeCliBinary(): Promise<DetectResult> {
    try {
      const { stdout } = await execFile('claude', ['--version'], {
        timeout: VERSION_TIMEOUT_MS,
      });
      const version = stdout.trim();
      return { available: true, version, binaryPath: 'claude' };
    } catch {
      return { available: false };
    }
  }

  private async runCli(
    args: readonly string[],
    cwd?: string
  ): Promise<{ stdout: string; stderr: string }> {
    const detect = await this.detectCli();
    if (!detect.available) {
      throw new Error('Claude CLI not available');
    }
    const binary = detect.binaryPath ?? 'claude';
    const cmd = `${binary} ${args.join(' ')}`;
    this.log(`[CLI] > ${cmd}${cwd ? ` (cwd=${cwd})` : ''}`);
    const { stdout, stderr } = await execFile(binary, [...args], {
      timeout: COMMAND_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024, // 10 MB — available list can be large
      ...(cwd ? { cwd } : {}),
    });
    const outLen = stdout.length;
    this.log(`[CLI] < ${cmd} — OK (${outLen} bytes)`);
    return { stdout, stderr };
  }

  private async runAction(args: readonly string[], cwd?: string): Promise<CliCommandResult> {
    const cmd = args.join(' ');
    try {
      const { stdout } = await this.runCli(args, cwd);
      const firstLine = stdout.split('\n').find((l) => l.trim()) ?? '';
      this.log(`[CLI] ${cmd} — OK: ${firstLine}`);
      return { ok: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const stderr =
        err !== null && typeof err === 'object' && 'stderr' in err
          ? String((err as { stderr: unknown }).stderr).trim()
          : '';
      const error = stderr || msg;
      this.log(`[CLI] ${cmd} — ERROR: ${error}`);
      return { ok: false, error };
    }
  }
}

function parseJson<T>(stdout: string, fallback: T): T {
  try {
    return JSON.parse(stdout) as T;
  } catch {
    return fallback;
  }
}
