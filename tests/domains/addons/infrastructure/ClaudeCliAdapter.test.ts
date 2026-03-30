import { describe, expect, it, vi, beforeEach } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockExecFile = vi.hoisted(() => vi.fn<any>());

vi.mock('node:child_process', () => ({
  execFile: mockExecFile,
}));

import { ClaudeCliAdapter } from '@src/domains/addons/infrastructure/ClaudeCliAdapter';
import {
  CLI_VERSION_OUTPUT,
  CLI_INSTALLED_LIST,
  CLI_AVAILABLE_RESULT,
  CLI_MARKETPLACE_LIST,
  CLI_INSTALL_STDOUT,
  CLI_UNINSTALL_STDOUT,
} from '../__fixtures__/cliOutputs';

// ── Helpers ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CbFn = (...args: any[]) => void;

function resolveCallback(args: unknown[]): CbFn {
  // execFile(bin, args, opts, cb) or execFile(bin, args, cb)
  const last = args[args.length - 1];
  const secondLast = args[args.length - 2];
  return (typeof last === 'function' ? last : secondLast) as CbFn;
}

function succeedWith(stdout: string, stderr = ''): void {
  mockExecFile.mockImplementation((...args: unknown[]) => {
    resolveCallback(args)(null, { stdout, stderr });
    return undefined as never;
  });
}

function failWith(message: string, stderr = '', code = 1): void {
  mockExecFile.mockImplementation((...args: unknown[]) => {
    resolveCallback(args)(Object.assign(new Error(message), { stderr, code }));
    return undefined as never;
  });
}

function detectThenDo(impl: (...args: unknown[]) => void): void {
  let callCount = 0;
  mockExecFile.mockImplementation((...args: unknown[]) => {
    callCount++;
    if (callCount === 1) {
      resolveCallback(args)(null, { stdout: CLI_VERSION_OUTPUT, stderr: '' });
    } else {
      impl(...args);
    }
    return undefined as never;
  });
}

function succeedAfterDetect(stdout: string, stderr = ''): void {
  detectThenDo((...args: unknown[]) => {
    resolveCallback(args)(null, { stdout, stderr });
  });
}

function failAfterDetect(message: string, stderr = '', code = 1): void {
  detectThenDo((...args: unknown[]) => {
    resolveCallback(args)(Object.assign(new Error(message), { stderr, code }));
  });
}

// ── Tests ────────────────────────────────────────────────────────────

let adapter: ClaudeCliAdapter;

beforeEach(() => {
  mockExecFile.mockReset();
  adapter = new ClaudeCliAdapter();
});

// ── 1. detectCli / isAvailable ───────────────────────────────────────

describe('detectCli / isAvailable', () => {
  it('returns available: true with version when binary responds', async () => {
    succeedWith(CLI_VERSION_OUTPUT);
    const result = await adapter.detectCli();
    expect(result).toEqual({
      available: true,
      version: '2.1.86 (Claude Code)',
      binaryPath: 'claude',
    });
  });

  it('returns available: true from isAvailable()', async () => {
    succeedWith(CLI_VERSION_OUTPUT);
    expect(await adapter.isAvailable()).toBe(true);
  });

  it('returns available: false when binary is not found', async () => {
    failWith('ENOENT: claude not found');
    const result = await adapter.detectCli();
    expect(result).toEqual({ available: false });
  });

  it('returns false from isAvailable() when binary is missing', async () => {
    failWith('ENOENT');
    expect(await adapter.isAvailable()).toBe(false);
  });

  it('caches the detect result on subsequent calls', async () => {
    succeedWith(CLI_VERSION_OUTPUT);
    await adapter.detectCli();
    await adapter.detectCli();
    expect(mockExecFile).toHaveBeenCalledTimes(1);
  });
});

// ── 2. listInstalled ─────────────────────────────────────────────────

describe('listInstalled', () => {
  it('parses JSON stdout into CliInstalledPlugin[]', async () => {
    succeedAfterDetect(JSON.stringify(CLI_INSTALLED_LIST));
    const result = await adapter.listInstalled();
    expect(result).toHaveLength(3);
    expect(result).toEqual(CLI_INSTALLED_LIST);
  });

  it('returns plugins with correct shapes', async () => {
    succeedAfterDetect(JSON.stringify(CLI_INSTALLED_LIST));
    const result = await adapter.listInstalled();

    // project-scoped plugin has projectPath
    expect(result[0]).toMatchObject({
      id: 'commit-commands@claude-plugins-official',
      scope: 'project',
      enabled: true,
      projectPath: '/home/ubuntu/dev/akashi',
    });

    // user-scoped plugin without projectPath
    expect(result[1]).toMatchObject({
      id: 'explanatory-output-style@claude-plugins-official',
      scope: 'user',
      enabled: true,
    });
    expect(result[1]).not.toHaveProperty('projectPath');

    // plugin with real semver version
    expect(result[2]).toMatchObject({
      id: 'typescript-lsp@claude-plugins-official',
      version: '1.0.0',
      scope: 'user',
    });
  });

  it('returns empty array when stdout is not valid JSON', async () => {
    succeedAfterDetect('<<not json>>');
    const result = await adapter.listInstalled();
    expect(result).toEqual([]);
  });
});

// ── 3. listAvailable ─────────────────────────────────────────────────

describe('listAvailable', () => {
  it('parses JSON stdout into CliAvailableResult', async () => {
    succeedAfterDetect(JSON.stringify(CLI_AVAILABLE_RESULT));
    const result = await adapter.listAvailable();
    expect(result).toEqual(CLI_AVAILABLE_RESULT);
  });

  it('contains installed and available sections', async () => {
    succeedAfterDetect(JSON.stringify(CLI_AVAILABLE_RESULT));
    const result = await adapter.listAvailable();
    expect(result.installed).toHaveLength(CLI_AVAILABLE_RESULT.installed.length);
    expect(result.available).toHaveLength(CLI_AVAILABLE_RESULT.available.length);
  });

  it('preserves polymorphic source shapes in available plugins', async () => {
    succeedAfterDetect(JSON.stringify(CLI_AVAILABLE_RESULT));
    const result = await adapter.listAvailable();

    // String source
    expect(result.available[0]).toMatchObject({
      pluginId: 'agent-sdk-dev@claude-plugins-official',
      source: './plugins/agent-sdk-dev',
    });

    // Object source — url
    expect(result.available[1]).toMatchObject({
      pluginId: 'adspirer-ads-agent@claude-plugins-official',
      source: { source: 'url', url: 'https://github.com/amekala/adspirer-mcp-plugin.git' },
    });

    // Object source — git-subdir
    expect(result.available[2]).toMatchObject({
      pluginId: 'ai-firstify@claude-plugins-official',
      source: { source: 'git-subdir', url: 'techwolf-ai/ai-first-toolkit' },
    });
  });

  it('returns fallback when stdout is not valid JSON', async () => {
    succeedAfterDetect('');
    const result = await adapter.listAvailable();
    expect(result).toEqual({ installed: [], available: [] });
  });
});

// ── 4. listMarketplaces ──────────────────────────────────────────────

describe('listMarketplaces', () => {
  it('parses JSON stdout into CliMarketplace[]', async () => {
    succeedAfterDetect(JSON.stringify(CLI_MARKETPLACE_LIST));
    const result = await adapter.listMarketplaces();
    expect(result).toEqual(CLI_MARKETPLACE_LIST);
  });

  it('returns marketplace with correct shape', async () => {
    succeedAfterDetect(JSON.stringify(CLI_MARKETPLACE_LIST));
    const result = await adapter.listMarketplaces();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: 'claude-plugins-official',
      source: 'github',
      repo: 'anthropics/claude-plugins-official',
    });
  });
});

// ── 5. installPlugin ─────────────────────────────────────────────────

describe('installPlugin', () => {
  it('returns { ok: true } on exit 0', async () => {
    succeedAfterDetect(CLI_INSTALL_STDOUT);
    const result = await adapter.installPlugin(
      'commit-commands@claude-plugins-official',
      'project'
    );
    expect(result).toEqual({ ok: true });
  });

  it('returns { ok: false, error } on non-zero exit', async () => {
    failAfterDetect('exit code 1', 'Plugin not found');
    const result = await adapter.installPlugin('bad@market', 'user');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Plugin not found');
  });

  it('uses error.message when stderr is empty', async () => {
    failAfterDetect('Something broke', '');
    const result = await adapter.installPlugin('bad@market', 'project');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Something broke');
  });
});

// ── 6. uninstallPlugin ───────────────────────────────────────────────

describe('uninstallPlugin', () => {
  it('returns { ok: true } on success', async () => {
    succeedAfterDetect(CLI_UNINSTALL_STDOUT);
    const result = await adapter.uninstallPlugin(
      'commit-commands@claude-plugins-official',
      'project'
    );
    expect(result).toEqual({ ok: true });
  });

  it('returns { ok: false, error } on failure', async () => {
    failAfterDetect('fail', 'Not installed');
    const result = await adapter.uninstallPlugin('foo@market', 'user');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Not installed');
  });
});

// ── 7. addMarketplace ────────────────────────────────────────────────

describe('addMarketplace', () => {
  it('returns { ok: true } on success', async () => {
    succeedAfterDetect('Added');
    const result = await adapter.addMarketplace('https://example.com/marketplace.json');
    expect(result).toEqual({ ok: true });
  });

  it('returns { ok: false, error } on failure', async () => {
    failAfterDetect('fail', 'Invalid source');
    const result = await adapter.addMarketplace('bad-source');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Invalid source');
  });
});

// ── 8. removeMarketplace ─────────────────────────────────────────────

describe('removeMarketplace', () => {
  it('returns { ok: true } on success', async () => {
    succeedAfterDetect('Removed');
    const result = await adapter.removeMarketplace('my-market');
    expect(result).toEqual({ ok: true });
  });

  it('returns { ok: false, error } on failure', async () => {
    failAfterDetect('fail', 'Marketplace not found');
    const result = await adapter.removeMarketplace('nonexistent');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Marketplace not found');
  });
});

// ── 9. CLI not available ─────────────────────────────────────────────

describe('CLI not available', () => {
  beforeEach(() => {
    failWith('ENOENT: claude not found');
  });

  it('listInstalled throws when CLI is unavailable', async () => {
    await expect(adapter.listInstalled()).rejects.toThrow('Claude CLI not available');
  });

  it('listAvailable throws when CLI is unavailable', async () => {
    await expect(adapter.listAvailable()).rejects.toThrow('Claude CLI not available');
  });

  it('listMarketplaces throws when CLI is unavailable', async () => {
    await expect(adapter.listMarketplaces()).rejects.toThrow('Claude CLI not available');
  });

  it('installPlugin returns error when CLI is unavailable', async () => {
    const result = await adapter.installPlugin('foo@market', 'user');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Claude CLI not available');
  });

  it('uninstallPlugin returns error when CLI is unavailable', async () => {
    const result = await adapter.uninstallPlugin('foo@market', 'user');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Claude CLI not available');
  });

  it('addMarketplace returns error when CLI is unavailable', async () => {
    const result = await adapter.addMarketplace('https://example.com');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Claude CLI not available');
  });

  it('removeMarketplace returns error when CLI is unavailable', async () => {
    const result = await adapter.removeMarketplace('my-market');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Claude CLI not available');
  });
});
