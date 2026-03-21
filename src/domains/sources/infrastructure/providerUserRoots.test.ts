import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const config = new Map<string, unknown>();

vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: (section: string) => ({
      get: (key: string) => config.get(`${section}\0${key}`),
    }),
  },
}));

import { readToolUserRoots } from './providerUserRoots';

describe('readToolUserRoots', () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    config.clear();
    for (const k of ['CLAUDE_CONFIG_DIR', 'GEMINI_CONFIG_DIR', 'CODEX_HOME'] as const) {
      savedEnv[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    config.clear();
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = v;
      }
    }
  });

  it('defaults tool roots under homeDir when settings and env are unset', () => {
    const homeDir = '/home/testuser';
    expect(readToolUserRoots(homeDir)).toEqual({
      claudeUserRoot: path.join(homeDir, '.claude'),
      cursorUserRoot: path.join(homeDir, '.cursor'),
      geminiUserRoot: path.join(homeDir, '.gemini'),
      codexUserRoot: path.join(homeDir, '.codex'),
    });
  });

  it('uses akashi.sources optional dirs when set (absolute paths)', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'akashi-roots-'));
    const c = path.join(tmp, 'my-claude');
    const cu = path.join(tmp, 'my-cursor');
    const g = path.join(tmp, 'my-gemini');
    const x = path.join(tmp, 'my-codex');
    await fs.mkdir(c, { recursive: true });
    await fs.mkdir(cu, { recursive: true });
    await fs.mkdir(g, { recursive: true });
    await fs.mkdir(x, { recursive: true });

    config.set('akashi.sources\0claudeConfigDir', c);
    config.set('akashi.sources\0cursorConfigDir', cu);
    config.set('akashi.sources\0geminiConfigDir', g);
    config.set('akashi.sources\0codexHome', x);

    const homeDir = '/unused/for-this-case';
    expect(readToolUserRoots(homeDir)).toEqual({
      claudeUserRoot: path.normalize(c),
      cursorUserRoot: path.normalize(cu),
      geminiUserRoot: path.normalize(g),
      codexUserRoot: path.normalize(x),
    });

    await fs.rm(tmp, { recursive: true, force: true });
  });

  it('expands tilde in optional dir settings relative to homeDir', () => {
    const homeDir = '/Users/me';
    config.set('akashi.sources\0claudeConfigDir', '~/Library/Claude');
    expect(readToolUserRoots(homeDir).claudeUserRoot).toBe(
      path.normalize(path.join(homeDir, 'Library/Claude'))
    );
  });

  it('prefers CLAUDE_CONFIG_DIR over default when setting unset', () => {
    const override = path.join(os.tmpdir(), 'claude-env-override');
    process.env.CLAUDE_CONFIG_DIR = override;
    expect(readToolUserRoots('/home/u').claudeUserRoot).toBe(path.normalize(override));
  });

  it('prefers GEMINI_CONFIG_DIR over default when setting unset', () => {
    const override = path.join(os.tmpdir(), 'gemini-env-override');
    process.env.GEMINI_CONFIG_DIR = override;
    expect(readToolUserRoots('/home/u').geminiUserRoot).toBe(path.normalize(override));
  });

  it('prefers CODEX_HOME over default when setting unset', () => {
    const override = path.join(os.tmpdir(), 'codex-env-override');
    process.env.CODEX_HOME = override;
    expect(readToolUserRoots('/home/u').codexUserRoot).toBe(path.normalize(override));
  });

  it('setting wins over CLAUDE_CONFIG_DIR env', () => {
    const fromSetting = path.join(os.tmpdir(), 'from-setting');
    process.env.CLAUDE_CONFIG_DIR = path.join(os.tmpdir(), 'from-env');
    config.set('akashi.sources\0claudeConfigDir', fromSetting);
    expect(readToolUserRoots('/home/u').claudeUserRoot).toBe(path.normalize(fromSetting));
  });
});
