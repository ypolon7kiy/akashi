import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getVscodeApi } from '../../../../../webview-shared/api';
import { AddonsMessageType } from '../messages';
import type {
  AddonsCatalogPayload,
  CatalogPluginDescriptor,
} from '../../../../../shared/types/addonsCatalogPayload';
import type {
  ArtifactDescriptor,
  SourceDescriptor,
} from '../../../../../shared/types/sourcesSnapshotPayload';

export type ViewTab = 'installed' | 'available';

export interface AvailableSection {
  readonly key: string;
  readonly label: string;
  readonly icon: string;
  readonly matchCategories: readonly string[];
}

export const AVAILABLE_SECTIONS: readonly AvailableSection[] = [
  { key: 'skills', label: 'Skills', icon: 'codicon-lightbulb', matchCategories: ['skill'] },
  {
    key: 'plugins',
    label: 'Plugins',
    icon: 'codicon-extensions',
    matchCategories: ['command', 'hook', 'mcp', 'agent', 'bundle', 'plugin'],
  },
];

export function useAddonsState() {
  const [catalog, setCatalog] = useState<AddonsCatalogPayload | null>(null);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<ViewTab>('installed');
  const [sidebarMatchedPaths, setSidebarMatchedPaths] = useState<readonly string[] | null>(null);
  const [operationMessage, setOperationMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const busyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startBusy = useCallback(() => {
    setIsBusy(true);
    if (busyTimeoutRef.current !== null) {
      clearTimeout(busyTimeoutRef.current);
    }
    busyTimeoutRef.current = setTimeout(() => {
      setIsBusy(false);
      busyTimeoutRef.current = null;
    }, 30_000);
  }, []);

  const clearBusy = useCallback(() => {
    setIsBusy(false);
    if (busyTimeoutRef.current !== null) {
      clearTimeout(busyTimeoutRef.current);
      busyTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (busyTimeoutRef.current !== null) {
        clearTimeout(busyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      const msg = event.data as { type?: string; payload?: unknown };
      if (msg?.type === AddonsMessageType.Catalog) {
        setCatalog(msg.payload as AddonsCatalogPayload);
      }
      if (msg?.type === AddonsMessageType.SidebarFilter) {
        setSidebarMatchedPaths(msg.payload as readonly string[] | null);
      }
      if (msg?.type === AddonsMessageType.OperationResult) {
        clearBusy();
        const p = msg.payload as
          | { operation?: string; ok?: boolean; error?: string; cancelled?: boolean }
          | undefined;
        if (p?.cancelled) {
          return;
        }
        if (p?.ok) {
          setOperationMessage(
            `${p.operation === 'install' ? 'Installed' : p.operation === 'move' ? 'Moved' : 'Deleted'} successfully`
          );
        } else {
          setOperationMessage(p?.error ?? 'Operation failed');
        }
        setTimeout(() => setOperationMessage(null), 4000);
      }
    };
    window.addEventListener('message', onMessage);
    const api = getVscodeApi();
    api?.postMessage({ type: AddonsMessageType.WebviewReady });
    return () => window.removeEventListener('message', onMessage);
  }, [clearBusy]);

  // Use artifacts as the display unit (groups compound entries like hook+config)
  // Fall back to records if no artifacts available
  const installedItems = catalog ? buildInstalledItems(catalog) : [];

  const matchedPathsSet = useMemo(
    () => (sidebarMatchedPaths !== null ? new Set(sidebarMatchedPaths) : null),
    [sidebarMatchedPaths]
  );

  const filteredInstalled = applyInstalledFilters(installedItems, matchedPathsSet, searchText);
  const filteredAvailable = catalog
    ? applyAvailableFilters(catalog.catalogPlugins, searchText)
    : [];

  const availableSections = groupBySection(filteredAvailable);

  const openFile = useCallback((path: string) => {
    getVscodeApi()?.postMessage({ type: AddonsMessageType.OpenFile, payload: { path } });
  }, []);

  const refresh = useCallback(() => {
    getVscodeApi()?.postMessage({ type: AddonsMessageType.RefreshRequest });
  }, []);

  const addOrigin = useCallback((kind: string, value: string) => {
    getVscodeApi()?.postMessage({
      type: AddonsMessageType.AddOrigin,
      payload: { kind, value },
    });
  }, []);

  const editOrigin = useCallback((originId: string, kind: string, value: string) => {
    getVscodeApi()?.postMessage({
      type: AddonsMessageType.EditOrigin,
      payload: { originId, kind, value },
    });
  }, []);

  const removeOrigin = useCallback((originId: string) => {
    getVscodeApi()?.postMessage({ type: AddonsMessageType.RemoveOrigin, payload: { originId } });
  }, []);

  const toggleOrigin = useCallback((originId: string, enabled: boolean) => {
    getVscodeApi()?.postMessage({
      type: AddonsMessageType.ToggleOrigin,
      payload: { originId, enabled },
    });
  }, []);

  const fetchOrigin = useCallback((originId: string) => {
    getVscodeApi()?.postMessage({ type: AddonsMessageType.FetchOrigin, payload: { originId } });
  }, []);

  const installPlugin = useCallback(
    (pluginId: string, locality: AddonLocality) => {
      startBusy();
      getVscodeApi()?.postMessage({
        type: AddonsMessageType.InstallPlugin,
        payload: { pluginId, locality },
      });
    },
    [startBusy]
  );

  const deleteAddon = useCallback(
    (primaryPath?: string, pluginId?: string) => {
      startBusy();
      getVscodeApi()?.postMessage({
        type: AddonsMessageType.DeleteAddon,
        payload: { primaryPath, pluginId },
      });
    },
    [startBusy]
  );

  const moveToGlobal = useCallback(
    (addonId: string) => {
      startBusy();
      getVscodeApi()?.postMessage({ type: AddonsMessageType.MoveToGlobal, payload: { addonId } });
    },
    [startBusy]
  );

  return {
    catalog,
    isBusy,
    searchText,
    activeTab,
    operationMessage,
    filteredInstalled,
    availableSections,
    installedItems,
    setSearchText,
    setActiveTab,
    openFile,
    refresh,
    addOrigin,
    editOrigin,
    removeOrigin,
    toggleOrigin,
    fetchOrigin,
    installPlugin,
    deleteAddon,
    moveToGlobal,
  };
}

/**
 * Addon locality matching Claude CLI's three scopes.
 *
 * - 'workspace' → project scope (team-shared, git-tracked)
 * - 'local'     → local scope (personal per-project, gitignored)
 * - 'user'      → user/global scope (machine-wide)
 */
export type AddonLocality = 'workspace' | 'local' | 'user';

/** Installed item — CLI-primary when CLI available, snapshot-based fallback. */
export interface InstalledItem {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly locality: AddonLocality;
  readonly primaryPath: string;
  readonly shape?: string;
  /** CLI plugin id for uninstall (e.g. "marketing-skills@claude-code-skills"). */
  readonly pluginId?: string;
  /** True for CLI-managed plugins (uses CLI uninstall). */
  readonly cliManaged?: boolean;
  /** Plugin version from CLI (absent or "unknown" filtered out). */
  readonly version?: string;
  /** Marketplace name from CLI id (e.g. "claude-code-skills"). */
  readonly marketplace?: string;
  /** Description cross-referenced from marketplace catalog. */
  readonly description?: string;
}

/**
 * Build installed items — CLI-primary when CLI is available,
 * snapshot-based fallback when it isn't.
 */
function buildInstalledItems(catalog: AddonsCatalogPayload): readonly InstalledItem[] {
  // CLI-primary: use CLI data exclusively
  if (catalog.cliAvailable) {
    const cliPlugins = catalog.cliInstalledPlugins ?? [];
    return cliPlugins.map((p) => ({
      id: `cli:${p.id}`,
      name: p.name,
      category: p.category ?? 'plugin',
      locality: cliScopeToAddonLocality(p.scope),
      primaryPath: p.installPath,
      pluginId: p.id,
      cliManaged: true,
      version: p.version !== 'unknown' ? p.version : undefined,
      marketplace: p.marketplace,
      description: p.description,
    }));
  }

  // Legacy fallback (CLI unavailable): snapshot-based items
  if (catalog.artifacts && catalog.artifacts.length > 0) {
    return catalog.artifacts
      .filter((a: ArtifactDescriptor) => a.topLevel !== false)
      .map((a: ArtifactDescriptor) => ({
        id: a.id,
        name: deriveName(a.primaryPath),
        category: a.category,
        locality: a.locality,
        primaryPath: a.primaryPath,
        shape: a.shape,
      }));
  }

  return catalog.records.map((r: SourceDescriptor) => ({
    id: r.id,
    name: deriveName(r.path),
    category: r.category,
    locality: r.locality,
    primaryPath: r.path,
  }));
}

/** Derive a display name from a file path using the snapshot data directly. */
function deriveName(path: string): string {
  const norm = path.replace(/\\/g, '/');
  // Folder-layout: .claude/skills/my-skill/SKILL.md → "my-skill"
  if (norm.endsWith('/SKILL.md')) {
    const withoutFile = norm.slice(0, norm.lastIndexOf('/'));
    const slash = withoutFile.lastIndexOf('/');
    return slash >= 0 ? withoutFile.slice(slash + 1) : withoutFile;
  }
  // Flat: basename minus extension
  const lastSlash = norm.lastIndexOf('/');
  const basename = lastSlash >= 0 ? norm.slice(lastSlash + 1) : norm;
  return basename.replace(/\.\w+$/i, '');
}

function applyInstalledFilters(
  items: readonly InstalledItem[],
  matchedPaths: ReadonlySet<string> | null,
  searchText: string
): readonly InstalledItem[] {
  let result = items;
  if (matchedPaths !== null) {
    result = result.filter((a) => a.cliManaged === true || matchedPaths.has(a.primaryPath));
  }
  if (searchText.length > 0) {
    const lower = searchText.toLowerCase();
    result = result.filter(
      (a) =>
        a.name.toLowerCase().includes(lower) ||
        a.category.toLowerCase().includes(lower) ||
        (a.description?.toLowerCase().includes(lower) ?? false)
    );
  }
  return result;
}

function applyAvailableFilters(
  plugins: readonly CatalogPluginDescriptor[],
  searchText: string
): readonly CatalogPluginDescriptor[] {
  if (searchText.length === 0) {
    return plugins;
  }
  const lower = searchText.toLowerCase();
  return plugins.filter(
    (p) =>
      p.name.toLowerCase().includes(lower) ||
      p.description.toLowerCase().includes(lower) ||
      p.tags.some((t) => t.toLowerCase().includes(lower))
  );
}

/** Map CLI scope string to AddonLocality, with fallback for unknown values. */
function cliScopeToAddonLocality(scope: string): AddonLocality {
  switch (scope) {
    case 'user':
      return 'user';
    case 'local':
      return 'local';
    default:
      return 'workspace';
  }
}

function groupBySection(
  plugins: readonly CatalogPluginDescriptor[]
): ReadonlyMap<string, readonly CatalogPluginDescriptor[]> {
  const grouped = new Map<string, CatalogPluginDescriptor[]>();
  for (const section of AVAILABLE_SECTIONS) {
    grouped.set(section.key, []);
  }
  for (const plugin of plugins) {
    const section = AVAILABLE_SECTIONS.find((s) => s.matchCategories.includes(plugin.category));
    const key = section?.key ?? 'plugins';
    grouped.get(key)!.push(plugin);
  }
  return grouped;
}
