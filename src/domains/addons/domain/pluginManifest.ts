/**
 * Parsed plugin.json manifest.
 * Optional — if absent, components are auto-discovered from standard directories.
 *
 * See: https://code.claude.com/docs/en/plugins-reference
 */

export interface PluginManifest {
  readonly name: string;
  readonly version?: string;
  readonly description?: string;
  readonly skills?: string | readonly string[];
  readonly commands?: string | readonly string[];
  readonly agents?: string | readonly string[];
  readonly hooks?: string | readonly string[] | Record<string, unknown>;
  readonly mcpServers?: string | readonly string[] | Record<string, unknown>;
  readonly outputStyles?: string | readonly string[];
  readonly lspServers?: string | readonly string[] | Record<string, unknown>;
}

/** Standard auto-discovery directories when no manifest is present. */
export const DEFAULT_PLUGIN_DIRS = {
  skills: 'skills',
  commands: 'commands',
  agents: 'agents',
  hooks: 'hooks',
  outputStyles: 'output-styles',
} as const;

/** Parse a plugin.json blob. Returns null if invalid. */
export function parsePluginManifest(raw: unknown): PluginManifest | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === 'string' ? obj.name.trim() : '';
  if (!name) return null;

  return {
    name,
    version: typeof obj.version === 'string' ? obj.version : undefined,
    description: typeof obj.description === 'string' ? obj.description : undefined,
    skills: parsePathOrArray(obj.skills),
    commands: parsePathOrArray(obj.commands),
    agents: parsePathOrArray(obj.agents),
    hooks: obj.hooks as PluginManifest['hooks'],
    mcpServers: obj.mcpServers as PluginManifest['mcpServers'],
    outputStyles: parsePathOrArray(obj.outputStyles),
    lspServers: obj.lspServers as PluginManifest['lspServers'],
  };
}

function parsePathOrArray(val: unknown): string | readonly string[] | undefined {
  if (typeof val === 'string') return val;
  if (Array.isArray(val) && val.every((v) => typeof v === 'string')) return val;
  return undefined;
}
