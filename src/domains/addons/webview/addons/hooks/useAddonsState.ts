import { useCallback, useEffect, useState } from 'react';
import { getVscodeApi } from '../../../../../webview-shared/api';
import { AddonsMessageType } from '../messages';
import type {
  AddonsCatalogPayload,
  InstalledAddonDescriptor,
  CatalogPluginDescriptor,
} from '../../../../../shared/types/addonsCatalogPayload';

export type CategoryFilter = string | null;
export type ViewTab = 'installed' | 'available';

export function useAddonsState() {
  const [catalog, setCatalog] = useState<AddonsCatalogPayload | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(null);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<ViewTab>('installed');
  const [operationMessage, setOperationMessage] = useState<string | null>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      const msg = event.data as { type?: string; payload?: unknown };
      if (msg?.type === AddonsMessageType.Catalog) {
        setCatalog(msg.payload as AddonsCatalogPayload);
      }
      if (msg?.type === AddonsMessageType.OperationResult) {
        const p = msg.payload as { operation?: string; ok?: boolean; error?: string } | undefined;
        if (p?.ok) {
          setOperationMessage(`${p.operation === 'install' ? 'Installed' : 'Uninstalled'} successfully`);
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

  const filteredInstalled = catalog
    ? applyInstalledFilters(catalog.installedAddons, categoryFilter, searchText)
    : [];

  const filteredAvailable = catalog
    ? applyAvailableFilters(catalog.catalogPlugins, categoryFilter, searchText)
    : [];

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
    getVscodeApi()?.postMessage({
      type: AddonsMessageType.RemoveOrigin,
      payload: { originId },
    });
  }, []);

  const toggleOrigin = useCallback((originId: string, enabled: boolean) => {
    getVscodeApi()?.postMessage({
      type: AddonsMessageType.ToggleOrigin,
      payload: { originId, enabled },
    });
  }, []);

  const fetchOrigin = useCallback((originId: string) => {
    getVscodeApi()?.postMessage({
      type: AddonsMessageType.FetchOrigin,
      payload: { originId },
    });
  }, []);

  const installPlugin = useCallback((pluginId: string, locality: 'workspace' | 'user') => {
    getVscodeApi()?.postMessage({
      type: AddonsMessageType.InstallPlugin,
      payload: { pluginId, locality },
    });
  }, []);

  const uninstallPlugin = useCallback((pluginId: string) => {
    getVscodeApi()?.postMessage({
      type: AddonsMessageType.UninstallPlugin,
      payload: { pluginId },
    });
  }, []);

  // Delete uses the same backend as uninstall — removes tracked files via ledger
  const deleteAddon = useCallback((addonId: string) => {
    getVscodeApi()?.postMessage({
      type: AddonsMessageType.UninstallPlugin,
      payload: { pluginId: addonId },
    });
  }, []);

  const moveToGlobal = useCallback((addonId: string) => {
    getVscodeApi()?.postMessage({
      type: AddonsMessageType.MoveToGlobal,
      payload: { addonId },
    });
  }, []);

  return {
    catalog,
    categoryFilter,
    searchText,
    activeTab,
    operationMessage,
    filteredInstalled,
    filteredAvailable,
    setCategoryFilter,
    setSearchText,
    setActiveTab,
    openFile,
    refresh,
    addOrigin,
    removeOrigin,
    toggleOrigin,
    fetchOrigin,
    installPlugin,
    uninstallPlugin,
    deleteAddon,
    moveToGlobal,
  };
}

function applyInstalledFilters(
  addons: readonly InstalledAddonDescriptor[],
  categoryFilter: CategoryFilter,
  searchText: string
): readonly InstalledAddonDescriptor[] {
  let result = addons;
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
