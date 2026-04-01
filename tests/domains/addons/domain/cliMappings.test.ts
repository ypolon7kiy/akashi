import { describe, expect, it } from 'vitest';
import {
  formatSourceForCli,
  isCliTracked,
  localityToCliScope,
  mapCliAvailableToCatalog,
  mapCliInstalledToSyntheticCatalog,
  mapCliMarketplaceToOrigin,
  parseCliPluginName,
  parseCliSource,
} from '@src/domains/addons/domain/cliMappings';
import type {
  CliAvailablePlugin,
  CliInstalledPlugin,
  CliMarketplace,
} from '@src/domains/addons/domain/cliTypes';
import type { OriginSource } from '@src/domains/addons/domain/marketplaceOrigin';
import {
  CLI_AVAILABLE_ADSPIRER,
  CLI_AVAILABLE_AGENT_SDK,
  CLI_AVAILABLE_AI_FIRSTIFY,
  CLI_INSTALLED_CODEX,
  CLI_INSTALLED_COMMIT_COMMANDS,
  CLI_INSTALLED_EXPLANATORY,
  CLI_INSTALLED_LIST,
  CLI_INSTALLED_TYPESCRIPT_LSP,
  CLI_MARKETPLACE_OFFICIAL,
} from '../__fixtures__/cliOutputs';

// ── parseCliSource ──────────────────────────────────────────────────

describe('parseCliSource', () => {
  it('maps a string source to a relative PluginSourceRef', () => {
    const result = parseCliSource(CLI_AVAILABLE_AGENT_SDK.source);

    expect(result).toEqual({ kind: 'relative', path: './plugins/agent-sdk-dev' });
  });

  it('maps a url object source to a url PluginSourceRef', () => {
    const result = parseCliSource(CLI_AVAILABLE_ADSPIRER.source);

    expect(result).toEqual({
      kind: 'url',
      url: 'https://github.com/amekala/adspirer-mcp-plugin.git',
      ref: undefined,
      sha: 'aa70dbdbbbb843e94a794c10c2b13f5dd66b5e40',
    });
  });

  it('maps a git-subdir object source to a git-subdir PluginSourceRef', () => {
    const result = parseCliSource(CLI_AVAILABLE_AI_FIRSTIFY.source);

    expect(result).toEqual({
      kind: 'git-subdir',
      url: 'techwolf-ai/ai-first-toolkit',
      path: 'plugins/ai-firstify',
      ref: 'main',
    });
  });

  it('falls back to relative with empty path for an unknown object shape', () => {
    const result = parseCliSource({ source: 'warp-drive', warpFactor: 9 });

    expect(result).toEqual({ kind: 'relative', path: '' });
  });

  it('falls back to relative with empty path for an empty object', () => {
    const result = parseCliSource({});

    expect(result).toEqual({ kind: 'relative', path: '' });
  });

  it('handles a github object source', () => {
    const result = parseCliSource({
      source: 'github',
      repo: 'anthropics/claude-plugins-official',
      ref: 'main',
      sha: 'abc123',
    });

    expect(result).toEqual({
      kind: 'github',
      repo: 'anthropics/claude-plugins-official',
      ref: 'main',
      sha: 'abc123',
    });
  });

  it('handles an empty string source', () => {
    const result = parseCliSource('');

    expect(result).toEqual({ kind: 'relative', path: '' });
  });
});

// ── mapCliAvailableToCatalog ────────────────────────────────────────

describe('mapCliAvailableToCatalog', () => {
  it('maps a plugin with string source (agent-sdk-dev)', () => {
    const result = mapCliAvailableToCatalog(CLI_AVAILABLE_AGENT_SDK);

    expect(result).toEqual({
      id: 'agent-sdk-dev@claude-plugins-official',
      originId: 'claude-plugins-official',
      name: 'agent-sdk-dev',
      description: 'Development kit for working with the Claude Agent SDK',
      version: '',
      category: 'plugin',
      tags: [],
      keywords: [],
      source: { kind: 'relative', path: './plugins/agent-sdk-dev' },
      installStatus: 'available',
      installCount: 42453,
    });
    expect(result.source.kind).toBe('relative');
  });

  it('maps a plugin with url object source (adspirer)', () => {
    const result = mapCliAvailableToCatalog(CLI_AVAILABLE_ADSPIRER);

    expect(result.id).toBe('adspirer-ads-agent@claude-plugins-official');
    expect(result.source.kind).toBe('url');
    expect(result.source).toEqual({
      kind: 'url',
      url: 'https://github.com/amekala/adspirer-mcp-plugin.git',
      ref: undefined,
      sha: 'aa70dbdbbbb843e94a794c10c2b13f5dd66b5e40',
    });
    expect(result.installCount).toBe(899);
  });

  it('maps a plugin with git-subdir object source (ai-firstify)', () => {
    const result = mapCliAvailableToCatalog(CLI_AVAILABLE_AI_FIRSTIFY);

    expect(result.id).toBe('ai-firstify@claude-plugins-official');
    expect(result.source.kind).toBe('git-subdir');
    expect(result.source).toEqual({
      kind: 'git-subdir',
      url: 'techwolf-ai/ai-first-toolkit',
      path: 'plugins/ai-firstify',
      ref: 'main',
    });
    expect(result.installCount).toBe(212);
  });

  it('defaults source path to empty string when source is undefined (via type escape)', () => {
    const plugin: CliAvailablePlugin = {
      ...CLI_AVAILABLE_AGENT_SDK,
      source: undefined as unknown as string,
    };

    const result = mapCliAvailableToCatalog(plugin);

    expect(result.source).toEqual({ kind: 'relative', path: '' });
  });

  it('handles empty description and name', () => {
    const plugin: CliAvailablePlugin = {
      ...CLI_AVAILABLE_AGENT_SDK,
      name: '',
      description: '',
    };

    const result = mapCliAvailableToCatalog(plugin);

    expect(result.name).toBe('');
    expect(result.description).toBe('');
  });

  it('handles zero install count', () => {
    const plugin: CliAvailablePlugin = { ...CLI_AVAILABLE_AGENT_SDK, installCount: 0 };

    expect(mapCliAvailableToCatalog(plugin).installCount).toBe(0);
  });

  it('uses category from CLI when valid', () => {
    const plugin: CliAvailablePlugin = { ...CLI_AVAILABLE_AGENT_SDK, category: 'plugin' };

    expect(mapCliAvailableToCatalog(plugin).category).toBe('plugin');
  });

  it('uses category "bundle" from CLI', () => {
    const plugin: CliAvailablePlugin = { ...CLI_AVAILABLE_AGENT_SDK, category: 'bundle' };

    expect(mapCliAvailableToCatalog(plugin).category).toBe('bundle');
  });

  it('defaults to plugin when category is absent', () => {
    // CLI_AVAILABLE_AGENT_SDK has no category field
    expect(mapCliAvailableToCatalog(CLI_AVAILABLE_AGENT_SDK).category).toBe('plugin');
  });

  it('defaults to plugin when category is invalid', () => {
    const plugin: CliAvailablePlugin = { ...CLI_AVAILABLE_AGENT_SDK, category: 'unknown-type' };

    expect(mapCliAvailableToCatalog(plugin).category).toBe('plugin');
  });
});

// ── mapCliInstalledToSyntheticCatalog ──────────────────────────────

describe('mapCliInstalledToSyntheticCatalog', () => {
  it('parses name and marketplace from the CLI plugin id', () => {
    const result = mapCliInstalledToSyntheticCatalog(CLI_INSTALLED_CODEX);

    expect(result.name).toBe('openai-codex');
    expect(result.originId).toBe('cli:codex-plugin-cc');
    expect(result.id).toBe('openai-codex@codex-plugin-cc');
  });

  it('sets installStatus to installed', () => {
    const result = mapCliInstalledToSyntheticCatalog(CLI_INSTALLED_CODEX);

    expect(result.installStatus).toBe('installed');
  });

  it('filters version "unknown" to empty string', () => {
    const result = mapCliInstalledToSyntheticCatalog(CLI_INSTALLED_CODEX);

    expect(result.version).toBe('');
  });

  it('passes through real semver version', () => {
    const result = mapCliInstalledToSyntheticCatalog(CLI_INSTALLED_TYPESCRIPT_LSP);

    expect(result.version).toBe('1.0.0');
  });

  it('sets safe defaults for missing metadata', () => {
    const result = mapCliInstalledToSyntheticCatalog(CLI_INSTALLED_CODEX);

    expect(result.description).toBe('');
    expect(result.category).toBe('plugin');
    expect(result.tags).toEqual([]);
    expect(result.keywords).toEqual([]);
    expect(result.source).toEqual({ kind: 'relative', path: '' });
  });

  it('handles plugin id without @ separator', () => {
    const plugin: CliInstalledPlugin = {
      ...CLI_INSTALLED_CODEX,
      id: 'standalone-plugin',
    };

    const result = mapCliInstalledToSyntheticCatalog(plugin);

    expect(result.name).toBe('standalone-plugin');
    expect(result.originId).toBe('cli:');
  });
});

// ── mapCliMarketplaceToOrigin ───────────────────────────────────────

describe('mapCliMarketplaceToOrigin', () => {
  it('builds a github source from the real CLI marketplace fixture', () => {
    const result = mapCliMarketplaceToOrigin(CLI_MARKETPLACE_OFFICIAL);

    expect(result).toEqual({
      id: 'cli:claude-plugins-official',
      label: 'claude-plugins-official',
      source: { kind: 'github', owner: 'anthropics', repo: 'claude-plugins-official' },
      builtIn: false,
      enabled: true,
      lastFetchedAt: null,
      lastError: null,
    });
  });

  it('falls back to URL source when repo is empty', () => {
    const mp: CliMarketplace = {
      name: 'custom',
      source: 'url',
      repo: '',
      installLocation: 'https://example.com/catalog.json',
    };

    const result = mapCliMarketplaceToOrigin(mp);

    expect(result.source).toEqual({ kind: 'url', url: 'https://example.com/catalog.json' });
    expect(result.id).toBe('cli:custom');
  });

  it('falls back to URL source when repo has no slash', () => {
    const mp: CliMarketplace = {
      name: 'oddrepo',
      source: 'other',
      repo: 'noslash',
      installLocation: 'https://fallback.com',
    };

    const result = mapCliMarketplaceToOrigin(mp);

    expect(result.source).toEqual({ kind: 'url', url: 'noslash' });
  });

  it('falls back to URL source when repo has trailing slash only', () => {
    const mp: CliMarketplace = {
      name: 'trailing',
      source: 'other',
      repo: 'owner/',
      installLocation: 'https://fallback.com',
    };

    const result = mapCliMarketplaceToOrigin(mp);

    // slash at end means empty repo portion — buildGithubSource falls back
    expect(result.source).toEqual({ kind: 'url', url: 'owner/' });
  });

  it('falls back to URL source when repo has leading slash only', () => {
    const mp: CliMarketplace = {
      name: 'leading',
      source: 'other',
      repo: '/repo',
      installLocation: 'https://fallback.com',
    };

    const result = mapCliMarketplaceToOrigin(mp);

    // slash at index 0 means slashIdx is not > 0 — falls back
    expect(result.source).toEqual({ kind: 'url', url: '/repo' });
  });
});

// ── localityToCliScope ──────────────────────────────────────────────

describe('localityToCliScope', () => {
  it('maps workspace to project', () => {
    expect(localityToCliScope('workspace')).toBe('project');
  });

  it('maps local to local', () => {
    expect(localityToCliScope('local')).toBe('local');
  });

  it('maps user to user', () => {
    expect(localityToCliScope('user')).toBe('user');
  });
});

// ── isCliTracked ────────────────────────────────────────────────────

describe('isCliTracked', () => {
  it('returns the matching project-scoped installed plugin', () => {
    const result = isCliTracked(CLI_INSTALLED_LIST, 'commit-commands');

    expect(result).toBe(CLI_INSTALLED_COMMIT_COMMANDS);
    expect(result?.scope).toBe('project');
    expect(result?.version).toBe('unknown');
  });

  it('returns the matching user-scoped installed plugin', () => {
    const result = isCliTracked(CLI_INSTALLED_LIST, 'explanatory-output-style');

    expect(result).toBe(CLI_INSTALLED_EXPLANATORY);
    expect(result?.scope).toBe('user');
    expect(result?.version).toBe('unknown');
  });

  it('returns undefined when plugin name is not found', () => {
    expect(isCliTracked(CLI_INSTALLED_LIST, 'nonexistent')).toBeUndefined();
  });

  it('returns undefined for an empty installed list', () => {
    expect(isCliTracked([], 'commit-commands')).toBeUndefined();
  });

  it('does not match partial prefixes that lack the @ boundary', () => {
    // "commit" should NOT match "commit-commands@claude-plugins-official"
    expect(isCliTracked(CLI_INSTALLED_LIST, 'commit')).toBeUndefined();
  });
});

// ── formatSourceForCli ──────────────────────────────────────────────

describe('formatSourceForCli', () => {
  it('formats a github source as owner/repo', () => {
    const source: OriginSource = { kind: 'github', owner: 'anthropics', repo: 'skills' };

    expect(formatSourceForCli(source)).toBe('anthropics/skills');
  });

  it('formats a url source as the raw URL', () => {
    const source: OriginSource = { kind: 'url', url: 'https://example.com/catalog.json' };

    expect(formatSourceForCli(source)).toBe('https://example.com/catalog.json');
  });

  it('formats a file source as the raw path', () => {
    const source: OriginSource = { kind: 'file', path: '/home/user/.claude/local-catalog.json' };

    expect(formatSourceForCli(source)).toBe('/home/user/.claude/local-catalog.json');
  });
});

// ── parseCliPluginName ──────────────────────────────────────────────

describe('parseCliPluginName', () => {
  it('extracts the name before @', () => {
    expect(parseCliPluginName('code-review@official')).toBe('code-review');
  });

  it('extracts the name from a real CLI plugin id', () => {
    expect(parseCliPluginName(CLI_INSTALLED_COMMIT_COMMANDS.id)).toBe('commit-commands');
  });

  it('returns the full string when there is no @', () => {
    expect(parseCliPluginName('standalone-plugin')).toBe('standalone-plugin');
  });

  it('returns the full string when @ is the first character', () => {
    // atIdx === 0 which is not > 0, so returns the full string
    expect(parseCliPluginName('@scoped/package')).toBe('@scoped/package');
  });

  it('handles multiple @ signs by splitting on the first', () => {
    expect(parseCliPluginName('name@market@extra')).toBe('name');
  });

  it('returns empty string when input is empty', () => {
    expect(parseCliPluginName('')).toBe('');
  });
});
