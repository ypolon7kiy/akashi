/**
 * Addon installation infrastructure.
 *
 * - `installFromMarketplace`: Downloads content from the marketplace source.
 *   Detects plugin bundles (with plugin.json or standard directories) and
 *   installs each component (skills, commands, hooks, MCP) to its correct location.
 * - `installViaCreator`: Fallback that creates a stub via the existing ArtifactCreator.
 * - `removeTrackedFiles`: Removes files recorded in the installation ledger.
 */

import { mkdir, readdir, rm, rmdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { ToolUserRoots } from '../../../shared/toolUserRoots';
import type { WriteFileOp } from '../../sources/domain/artifactOperation';
import { findArtifactCreatorById } from '../../sources/registerSourcePresets';
import { executeCreationPlan } from '../../sources/infrastructure/executeCreationPlan';
import type { CatalogPlugin, PluginSourceRef } from '../domain/catalogPlugin';
import type { OriginSource } from '../domain/marketplaceOrigin';
import { parsePluginManifest, DEFAULT_PLUGIN_DIRS } from '../domain/pluginManifest';

export interface InstallResult {
  readonly ok: boolean;
  readonly createdPaths: readonly string[];
  readonly error?: string;
}

/**
 * Target directories for installing plugin components.
 * Resolved by the caller based on locality (workspace vs user).
 */
export interface InstallTargets {
  readonly skills: string;   // e.g. .claude/skills/
  readonly commands: string;  // e.g. .claude/commands/
  readonly hooks: string;     // e.g. .claude/hooks/
  readonly root: string;      // e.g. .claude/ (for .mcp.json, settings.json)
}

/**
 * Install a plugin/skill from a marketplace source.
 *
 * 1. Fetches all files from the source (GitHub, URL, etc.)
 * 2. Detects if it's a plugin bundle (has plugin.json or standard component dirs)
 * 3. Installs each component to its correct location
 */
export async function installFromMarketplace(
  plugin: CatalogPlugin,
  originSource: OriginSource,
  targets: InstallTargets
): Promise<InstallResult> {
  try {
    const files = await resolveAndFetchContent(plugin.source, originSource);
    if (files.length === 0) {
      return { ok: false, createdPaths: [], error: 'No content found at the plugin source' };
    }

    // Check for plugin.json manifest
    const manifestFile = files.find(
      (f) => f.relativePath === '.claude-plugin/plugin.json' || f.relativePath === 'plugin.json'
    );
    const manifest = manifestFile ? parsePluginManifest(JSON.parse(manifestFile.content)) : null;

    // Detect if this is a plugin bundle (has component directories) or a single skill
    const hasSkillsDir = files.some((f) => f.relativePath.startsWith('skills/'));
    const hasCommandsDir = files.some((f) => f.relativePath.startsWith('commands/'));
    const hasAgentsDir = files.some((f) => f.relativePath.startsWith('agents/'));
    const hasMcpJson = files.some((f) => f.relativePath === '.mcp.json');
    const hasSkillMd = files.some((f) => f.relativePath === 'SKILL.md');

    const isBundle = manifest !== null || hasSkillsDir || hasCommandsDir || hasAgentsDir;
    const createdPaths: string[] = [];

    if (isBundle) {
      // ── Plugin bundle: install each component to its correct location ──

      // Skills: skills/**/SKILL.md → .claude/skills/{name}/SKILL.md
      const skillFiles = files.filter((f) => f.relativePath.startsWith(resolveDir(manifest?.skills, DEFAULT_PLUGIN_DIRS.skills) + '/'));
      for (const file of skillFiles) {
        const relFromSkills = file.relativePath.slice(file.relativePath.indexOf('/') + 1);
        const filePath = join(targets.skills, relFromSkills);
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, file.content, 'utf-8');
        createdPaths.push(filePath);
      }

      // Commands: commands/*.md → .claude/commands/*.md
      const cmdFiles = files.filter((f) => f.relativePath.startsWith(resolveDir(manifest?.commands, DEFAULT_PLUGIN_DIRS.commands) + '/'));
      for (const file of cmdFiles) {
        const relFromCmds = file.relativePath.slice(file.relativePath.indexOf('/') + 1);
        const filePath = join(targets.commands, relFromCmds);
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, file.content, 'utf-8');
        createdPaths.push(filePath);
      }

      // Hooks: hooks/ scripts → .claude/hooks/
      const hookFiles = files.filter((f) =>
        f.relativePath.startsWith('hooks/') || f.relativePath.startsWith('scripts/')
      );
      for (const file of hookFiles) {
        const filePath = join(targets.hooks, '..', file.relativePath);
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, file.content, 'utf-8');
        createdPaths.push(filePath);
      }

      // MCP config: .mcp.json → merge with existing (write as plugin-specific file for now)
      if (hasMcpJson) {
        const mcpFile = files.find((f) => f.relativePath === '.mcp.json');
        if (mcpFile) {
          const filePath = join(targets.root, `${plugin.name}.mcp.json`);
          await writeFile(filePath, mcpFile.content, 'utf-8');
          createdPaths.push(filePath);
        }
      }

      // If bundle had no skills extracted but has a top-level SKILL.md, treat it as a skill too
      if (skillFiles.length === 0 && hasSkillMd) {
        const skillDir = join(targets.skills, manifest?.name ?? plugin.name);
        await writeSkillFiles(files, skillDir, createdPaths);
      }
    } else if (hasSkillMd) {
      // ── Single skill: install as folder-layout skill ──
      const skillDir = join(targets.skills, plugin.name);
      await writeSkillFiles(files, skillDir, createdPaths);
    } else {
      // ── Unknown structure: dump everything into a skill folder ──
      const skillDir = join(targets.skills, plugin.name);
      for (const file of files) {
        const filePath = join(skillDir, file.relativePath);
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, file.content, 'utf-8');
        createdPaths.push(filePath);
      }
    }

    if (createdPaths.length === 0) {
      return { ok: false, createdPaths: [], error: 'No installable content found' };
    }

    return { ok: true, createdPaths };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, createdPaths: [], error: msg };
  }
}

/** Write all fetched files into a single skill directory. */
async function writeSkillFiles(
  files: FetchedFile[],
  skillDir: string,
  createdPaths: string[]
): Promise<void> {
  await mkdir(skillDir, { recursive: true });
  for (const file of files) {
    // Skip plugin metadata files
    if (file.relativePath.startsWith('.claude-plugin/')) continue;
    const filePath = join(skillDir, file.relativePath);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, file.content, 'utf-8');
    createdPaths.push(filePath);
  }
}

/** Resolve a manifest path field to a directory name. */
function resolveDir(manifestPath: string | readonly string[] | undefined, fallback: string): string {
  if (typeof manifestPath === 'string') return manifestPath.replace(/^\.\//, '').replace(/\/$/, '');
  if (Array.isArray(manifestPath) && manifestPath.length > 0) {
    return (manifestPath[0] as string).replace(/^\.\//, '').replace(/\/$/, '');
  }
  return fallback;
}

// ── Content fetching ──────────────────────────────────────────────

interface FetchedFile {
  readonly relativePath: string;
  readonly content: string;
}

async function resolveAndFetchContent(
  pluginSource: PluginSourceRef,
  originSource: OriginSource
): Promise<FetchedFile[]> {
  if (pluginSource.kind === 'relative' && originSource.kind === 'github') {
    const { owner, repo } = originSource;
    const sourcePath = pluginSource.path.replace(/^\.\//, '');
    return fetchGithubDirectory(owner, repo, sourcePath, 'main');
  }

  if (pluginSource.kind === 'github') {
    const [owner, repo] = pluginSource.repo.split('/');
    if (!owner || !repo) return [];
    return fetchGithubDirectory(owner, repo, '', pluginSource.ref ?? 'main');
  }

  if (pluginSource.kind === 'url') {
    const content = await fetchText(pluginSource.url);
    if (content) {
      return [{ relativePath: 'SKILL.md', content }];
    }
    return [];
  }

  if (pluginSource.kind === 'git-subdir') {
    const content = await fetchText(`${pluginSource.url}/${pluginSource.path}/SKILL.md`);
    if (content) {
      return [{ relativePath: 'SKILL.md', content }];
    }
    return [];
  }

  return [];
}

async function fetchGithubDirectory(
  owner: string,
  repo: string,
  dirPath: string,
  ref: string
): Promise<FetchedFile[]> {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${dirPath}?ref=${ref}`;

  try {
    const response = await fetch(apiUrl, {
      headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'akashi-vscode' },
      signal: AbortSignal.timeout(15_000),
    });

    if (response.ok) {
      const entries = (await response.json()) as Array<{
        name: string;
        path: string;
        type: string;
        download_url: string | null;
      }>;

      const files: FetchedFile[] = [];

      for (const entry of entries) {
        if (entry.type === 'file' && entry.download_url) {
          const content = await fetchText(entry.download_url);
          if (content !== null) {
            const relPath = dirPath ? entry.path.slice(dirPath.length + 1) : entry.name;
            files.push({ relativePath: relPath, content });
          }
        } else if (entry.type === 'dir') {
          const subFiles = await fetchGithubDirectory(owner, repo, entry.path, ref);
          for (const sf of subFiles) {
            const relPath = dirPath
              ? entry.path.slice(dirPath.length + 1) + '/' + sf.relativePath
              : entry.name + '/' + sf.relativePath;
            files.push({ relativePath: relPath, content: sf.content });
          }
        }
      }

      return files;
    }
  } catch {
    // API failed — fall through to raw content fallback
  }

  // Fallback: try SKILL.md via raw content
  const rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}`;
  const skillMdPath = dirPath ? `${dirPath}/SKILL.md` : 'SKILL.md';
  const content = await fetchText(`${rawBase}/${skillMdPath}`);
  if (content) {
    return [{ relativePath: 'SKILL.md', content }];
  }

  return [];
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      headers: { 'User-Agent': 'akashi-vscode' },
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

// ── Legacy creator-based install (stub creation) ──────────────────

export type InstallViaCreatorResult = InstallResult;

export async function installViaCreator(
  creatorId: string,
  pluginName: string,
  description: string,
  workspaceRoot: string,
  roots: ToolUserRoots
): Promise<InstallResult> {
  const creator = findArtifactCreatorById(creatorId);
  if (!creator) {
    return { ok: false, createdPaths: [], error: `Unknown creator: ${creatorId}` };
  }

  const planned = creator.planWithProvidedInput(
    { workspaceRoot, roots },
    { userInput: pluginName, description }
  );

  if (planned.kind === 'error') {
    return { ok: false, createdPaths: [], error: planned.error };
  }
  if (planned.kind === 'cancelled') {
    return { ok: false, createdPaths: [], error: 'Cancelled' };
  }

  const result = await executeCreationPlan(planned.plan);
  if (!result.ok) {
    return { ok: false, createdPaths: [], error: result.error };
  }

  const createdPaths = planned.plan.operations
    .filter((op): op is WriteFileOp => op.type === 'writeFile')
    .map((op) => op.absolutePath);

  return { ok: true, createdPaths };
}

// ── Uninstall ─────────────────────────────────────────────────────

export async function removeTrackedFiles(
  paths: readonly string[]
): Promise<{ ok: boolean; error?: string }> {
  const errors: string[] = [];
  for (const filePath of paths) {
    try {
      await unlink(filePath);
      await tryRemoveEmptyDir(dirname(filePath));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${filePath}: ${msg}`);
    }
  }
  if (errors.length > 0) {
    return { ok: false, error: errors.join('; ') };
  }
  return { ok: true };
}

async function tryRemoveEmptyDir(dirPath: string): Promise<void> {
  try {
    const entries = await readdir(dirPath);
    if (entries.length === 0) {
      await rmdir(dirPath);
    }
  } catch {
    // fine
  }
}

export async function removeDirectory(
  dirPath: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await rm(dirPath, { recursive: true, force: true });
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `${dirPath}: ${msg}` };
  }
}
