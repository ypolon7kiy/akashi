/**
 * Test fixtures captured from real Claude CLI v2.1.86 output.
 *
 * These are verbatim JSON shapes produced by `claude plugin list --json`,
 * `claude plugin list --available --json`, and `claude plugin marketplace list --json`.
 *
 * DO NOT "clean up" these fixtures — their value is in matching real CLI output exactly,
 * including version: "unknown", optional projectPath, and polymorphic source fields.
 */

import type {
  CliInstalledPlugin,
  CliAvailablePlugin,
  CliAvailableResult,
  CliMarketplace,
} from '@src/domains/addons/domain/cliTypes';

// ── claude --version ──────────────────────────────────────────────────

export const CLI_VERSION_OUTPUT = '2.1.86 (Claude Code)\n';

// ── claude plugin marketplace list --json ─────────────────────────────

export const CLI_MARKETPLACE_OFFICIAL: CliMarketplace = {
  name: 'claude-plugins-official',
  source: 'github',
  repo: 'anthropics/claude-plugins-official',
  installLocation: '/home/ubuntu/.claude/plugins/marketplaces/claude-plugins-official',
};

export const CLI_MARKETPLACE_LIST: readonly CliMarketplace[] = [CLI_MARKETPLACE_OFFICIAL];

// ── claude plugin list --json (mixed scopes) ──────────────────────────

/** Folder plugin (commands/), project-scoped — has projectPath. */
export const CLI_INSTALLED_COMMIT_COMMANDS: CliInstalledPlugin = {
  id: 'commit-commands@claude-plugins-official',
  version: 'unknown',
  scope: 'project',
  enabled: true,
  installPath: '/home/ubuntu/.claude/plugins/cache/claude-plugins-official/commit-commands/unknown',
  installedAt: '2026-03-28T22:50:59.796Z',
  lastUpdated: '2026-03-28T22:50:59.796Z',
  projectPath: '/home/ubuntu/dev/akashi',
};

/** Output-style plugin (hooks/), user-scoped — no projectPath. */
export const CLI_INSTALLED_EXPLANATORY: CliInstalledPlugin = {
  id: 'explanatory-output-style@claude-plugins-official',
  version: 'unknown',
  scope: 'user',
  enabled: true,
  installPath:
    '/home/ubuntu/.claude/plugins/cache/claude-plugins-official/explanatory-output-style/unknown',
  installedAt: '2026-03-28T22:51:00.331Z',
  lastUpdated: '2026-03-28T22:51:00.331Z',
};

/** LSP plugin, user-scoped — has real semver version. */
export const CLI_INSTALLED_TYPESCRIPT_LSP: CliInstalledPlugin = {
  id: 'typescript-lsp@claude-plugins-official',
  version: '1.0.0',
  scope: 'user',
  enabled: true,
  installPath: '/home/ubuntu/.claude/plugins/cache/claude-plugins-official/typescript-lsp/1.0.0',
  installedAt: '2026-03-25T23:35:34.792Z',
  lastUpdated: '2026-03-25T23:35:34.792Z',
};

export const CLI_INSTALLED_LIST: readonly CliInstalledPlugin[] = [
  CLI_INSTALLED_COMMIT_COMMANDS,
  CLI_INSTALLED_EXPLANATORY,
  CLI_INSTALLED_TYPESCRIPT_LSP,
];

// ── claude plugin list --available --json (3 source shapes) ───────────

/** String source — relative path within the marketplace repo. */
export const CLI_AVAILABLE_AGENT_SDK: CliAvailablePlugin = {
  pluginId: 'agent-sdk-dev@claude-plugins-official',
  name: 'agent-sdk-dev',
  description: 'Development kit for working with the Claude Agent SDK',
  marketplaceName: 'claude-plugins-official',
  source: './plugins/agent-sdk-dev',
  installCount: 42453,
};

/** Object source — url (external git repo). */
export const CLI_AVAILABLE_ADSPIRER: CliAvailablePlugin = {
  pluginId: 'adspirer-ads-agent@claude-plugins-official',
  name: 'adspirer-ads-agent',
  description:
    'Cross-platform ad management for Google Ads, Meta Ads, TikTok Ads, and LinkedIn Ads. 91 tools for keyword research, campaign creation, performance analysis, and budget optimization.',
  marketplaceName: 'claude-plugins-official',
  source: {
    source: 'url',
    url: 'https://github.com/amekala/adspirer-mcp-plugin.git',
    sha: 'aa70dbdbbbb843e94a794c10c2b13f5dd66b5e40',
  },
  installCount: 899,
};

/** Object source — git-subdir (monorepo subdirectory). */
export const CLI_AVAILABLE_AI_FIRSTIFY: CliAvailablePlugin = {
  pluginId: 'ai-firstify@claude-plugins-official',
  name: 'ai-firstify',
  description:
    'AI-first project auditor and re-engineer based on the 9 design principles and 7 design patterns from the TechWolf AI-First Bootcamp',
  marketplaceName: 'claude-plugins-official',
  source: {
    source: 'git-subdir',
    url: 'techwolf-ai/ai-first-toolkit',
    path: 'plugins/ai-firstify',
    ref: 'main',
    sha: '7f18e11d694b9ae62ea3009fbbc175f08ae913df',
  },
  installCount: 212,
};

/** String source — multi-agent PR review plugin, high install count. */
export const CLI_AVAILABLE_PR_REVIEW: CliAvailablePlugin = {
  pluginId: 'pr-review-toolkit@claude-plugins-official',
  name: 'pr-review-toolkit',
  description:
    'Comprehensive PR review agents specializing in comments, tests, error handling, type design, code quality, and code simplification',
  marketplaceName: 'claude-plugins-official',
  source: './plugins/pr-review-toolkit',
  installCount: 63722,
};

export const CLI_AVAILABLE_LIST: readonly CliAvailablePlugin[] = [
  CLI_AVAILABLE_AGENT_SDK,
  CLI_AVAILABLE_ADSPIRER,
  CLI_AVAILABLE_AI_FIRSTIFY,
  CLI_AVAILABLE_PR_REVIEW,
];

export const CLI_AVAILABLE_RESULT: CliAvailableResult = {
  installed: [...CLI_INSTALLED_LIST],
  available: [...CLI_AVAILABLE_LIST],
};

// ── pr-review-toolkit install/uninstall lifecycle ────────────────────

/** Project-scoped installed entry captured after `claude plugin install ... --scope project`. */
export const CLI_INSTALLED_PR_REVIEW: CliInstalledPlugin = {
  id: 'pr-review-toolkit@claude-plugins-official',
  version: 'unknown',
  scope: 'project',
  enabled: true,
  installPath:
    '/home/ubuntu/.claude/plugins/cache/claude-plugins-official/pr-review-toolkit/unknown',
  installedAt: '2026-03-28T23:18:32.817Z',
  lastUpdated: '2026-03-28T23:18:32.817Z',
  projectPath: '/home/ubuntu/dev/akashi',
};

/** Installed list after adding pr-review-toolkit to the project. */
export const CLI_INSTALLED_WITH_PR_REVIEW: readonly CliInstalledPlugin[] = [
  CLI_INSTALLED_PR_REVIEW,
  CLI_INSTALLED_TYPESCRIPT_LSP,
];

/** Available result reflecting that pr-review-toolkit moved to the installed section. */
export const CLI_AVAILABLE_RESULT_AFTER_INSTALL: CliAvailableResult = {
  installed: [...CLI_INSTALLED_WITH_PR_REVIEW],
  available: [CLI_AVAILABLE_AGENT_SDK, CLI_AVAILABLE_ADSPIRER, CLI_AVAILABLE_AI_FIRSTIFY],
};

// ── Third-party marketplace (installed but not in cached catalog) ─────

/** Third-party marketplace origin — not one of the built-in origins. */
export const CLI_MARKETPLACE_THIRD_PARTY: CliMarketplace = {
  name: 'codex-plugin-cc',
  source: 'github',
  repo: 'openai/codex-plugin-cc',
  installLocation: '/home/ubuntu/.claude/plugins/marketplaces/codex-plugin-cc',
};

/** Plugin from a third-party marketplace, installed project-scoped. */
export const CLI_INSTALLED_CODEX: CliInstalledPlugin = {
  id: 'openai-codex@codex-plugin-cc',
  version: 'unknown',
  scope: 'project',
  enabled: true,
  installPath: '/home/ubuntu/.claude/plugins/cache/codex-plugin-cc/openai-codex/unknown',
  installedAt: '2026-03-29T10:00:00.000Z',
  lastUpdated: '2026-03-29T10:00:00.000Z',
  projectPath: '/home/ubuntu/dev/akashi',
};

// ── Install/uninstall stdout ──────────────────────────────────────────

export const CLI_INSTALL_STDOUT =
  'Installing plugin "commit-commands@claude-plugins-official"...\n' +
  '\u2714 Successfully installed plugin: commit-commands@claude-plugins-official (scope: project)';

export const CLI_INSTALL_PR_REVIEW_STDOUT =
  'Installing plugin "pr-review-toolkit@claude-plugins-official"...\n' +
  '\u2714 Successfully installed plugin: pr-review-toolkit@claude-plugins-official (scope: project)';

export const CLI_UNINSTALL_STDOUT =
  '\u2714 Successfully uninstalled plugin: commit-commands (scope: project)';

export const CLI_UNINSTALL_PR_REVIEW_STDOUT =
  '\u2714 Successfully uninstalled plugin: pr-review-toolkit (scope: project)';
