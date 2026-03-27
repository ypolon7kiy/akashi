import { useCallback, useEffect, useRef, useState } from 'react';
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

export type CategoryFilter = string | null;
export type ViewTab = 'installed' | 'available';

export interface AvailableSection {
  readonly key: string;
  readonly label: string;
  readonly icon: string;
  readonly matchCategories: readonly string[];
}

export const AVAILABLE_SECTIONS: readonly AvailableSection[] = [
  { key: 'skills', label: 'Skills', icon: 'codicon-lightbulb', matchCategories: ['skill'] },
  { key: 'plugins', label: 'Plugins', icon: 'codicon-extensions', matchCategories: ['command', 'hook', 'mcp', 'agent', 'bundle'] },
];

export function useAddonsState() {
  const [catalog, setCatalog] = useState<AddonsCatalogPayload | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(null);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<ViewTab>('installed');
  const [operationMessage, setOperationMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
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
      if (msg?.type === AddonsMessageType.OperationProgress) {
        const p = msg.payload as { message?: string } | undefined;
        if (p?.message) {
          setProgressMessage(p.message);
        }
      }
      if (msg?.type === AddonsMessageType.OperationResult) {
        clearBusy();
        setProgressMessage(null);
        const p = msg.payload as { operation?: string; ok?: boolean; error?: string; cancelled?: boolean } | undefined;
        if (p?.cancelled) {
          return;
        }
        if (p?.ok) {
          setOperationMessage(`${p.operation === 'install' ? 'Installed' : p.operation === 'move' ? 'Moved' : 'Deleted'} successfully`);
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
  }, []);

  // Use artifacts as the display unit (groups compound entries like hook+config)
  // Fall back to records if no artifacts available
  const installedItems = catalog ? buildInstalledItems(catalog) : [];

  const filteredInstalled = applyInstalledFilters(installedItems, categoryFilter, searchText);
  const filteredAvailable = catalog
    ? applyAvailableFilters(catalog.catalogPlugins, categoryFilter, searchText)
    : [];

  const availableSections = groupBySection(filteredAvailable);

  // Build category counts from installed items
  const categoryCounts = new Map<string, number>();
  for (const item of installedItems) {
    categoryCounts.set(item.category, (categoryCounts.get(item.category) ?? 0) + 1);
  }

  const openFile = useCallback((path: string) => {
    getVscodeApi()?.postMessage({ type: AddonsMessageType.OpenFile, payload: { path } });
  }, []);

  const refresh = useCallback(() => {
    getVscodeApi()?.postMessage({ type: AddonsMessageType.RefreshRequest });
  }, []);

  const addOrigin = useCallback((label: string, kind: string, value: string) => {
    getVscodeApi()?.postMessage({
      type: AddonsMessageType.AddOrigin,
      payload: { label, kind, value },
    });
  }, []);

  const removeOrigin = useCallback((originId: string) => {
    getVscodeApi()?.postMessage({ type: AddonsMessageType.RemoveOrigin, payload: { originId } });
  }, []);

  const toggleOrigin = useCallback((originId: string, enabled: boolean) => {
    getVscodeApi()?.postMessage({ type: AddonsMessageType.ToggleOrigin, payload: { originId, enabled } });
  }, []);

  const fetchOrigin = useCallback((originId: string) => {
    getVscodeApi()?.postMessage({ type: AddonsMessageType.FetchOrigin, payload: { originId } });
  }, []);

  const installPlugin = useCallback((pluginId: string, locality: 'workspace' | 'user') => {
    startBusy();
    getVscodeApi()?.postMessage({
      type: AddonsMessageType.InstallPlugin,
      payload: { pluginId, locality },
    });
  }, [startBusy]);

  const deleteAddon = useCallback((primaryPath?: string, pluginId?: string) => {
    startBusy();
    getVscodeApi()?.postMessage({
      type: AddonsMessageType.DeleteAddon,
      payload: { primaryPath, pluginId },
    });
  }, [startBusy]);

  const moveToGlobal = useCallback((addonId: string) => {
    startBusy();
    getVscodeApi()?.postMessage({ type: AddonsMessageType.MoveToGlobal, payload: { addonId } });
  }, [startBusy]);

  const switchTab = useCallback((tab: ViewTab) => {
    setActiveTab(tab);
    setCategoryFilter(null);
  }, []);

  return {
    catalog,
    isBusy,
    progressMessage,
    categoryFilter,
    searchText,
    activeTab,
    operationMessage,
    filteredInstalled,
    filteredAvailable,
    availableSections,
    categoryCounts,
    installedItems,
    setCategoryFilter,
    setSearchText,
    setActiveTab: switchTab,
    openFile,
    refresh,
    addOrigin,
    removeOrigin,
    toggleOrigin,
    fetchOrigin,
    installPlugin,
    deleteAddon,
    moveToGlobal,
  };
}

/** Installed item — directly from the snapshot, no custom type. */
export interface InstalledItem {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly locality: 'workspace' | 'user';
  readonly primaryPath: string;
}

/** Build installed items from snapshot data: prefer artifacts, fall back to records. */
function buildInstalledItems(catalog: AddonsCatalogPayload): readonly InstalledItem[] {
  if (catalog.artifacts && catalog.artifacts.length > 0) {
    return catalog.artifacts.map((a: ArtifactDescriptor) => ({
      id: a.id,
      name: deriveName(a.primaryPath),
      category: a.category,
      locality: a.locality,
      primaryPath: a.primaryPath,
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
  categoryFilter: CategoryFilter,
  searchText: string
): readonly InstalledItem[] {
  let result = items;
  if (categoryFilter) {
    result = result.filter((a) => a.category === categoryFilter);
  }
  if (searchText.length > 0) {
    const lower = searchText.toLowerCase();
    result = result.filter(
      (a) => a.name.toLowerCase().includes(lower) || a.category.toLowerCase().includes(lower)
    );
  }
  return result;
}

function applyAvailableFilters(
  plugins: readonly CatalogPluginDescriptor[],
  categoryFilter: CategoryFilter,
  searchText: string
): readonly CatalogPluginDescriptor[] {
  let result = plugins;
  if (categoryFilter) {
    result = result.filter((p) => p.category === categoryFilter);
  }
  if (searchText.length > 0) {
    const lower = searchText.toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.description.toLowerCase().includes(lower) ||
        p.tags.some((t) => t.toLowerCase().includes(lower))
    );
  }
  return result;
}

function groupBySection(
  plugins: readonly CatalogPluginDescriptor[]
): ReadonlyMap<string, readonly CatalogPluginDescriptor[]> {
  const grouped = new Map<string, CatalogPluginDescriptor[]>();
  for (const section of AVAILABLE_SECTIONS) {
    grouped.set(section.key, []);
  }
  for (const plugin of plugins) {
    const section = AVAILABLE_SECTIONS.find((s) =>
      s.matchCategories.includes(plugin.category)
    );
    const key = section?.key ?? 'plugins';
    grouped.get(key)!.push(plugin);
  }
  return grouped;
}
