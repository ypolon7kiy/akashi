import type { AddonsCatalogPayload } from '../../../shared/types/addonsCatalogPayload';

/** Dependency-injection interface for the AddonsPanel. */
export interface AddonsPanelEnvironment {
  getAddonsCatalog: () => Promise<AddonsCatalogPayload | null>;
  openAddonFile: (path: string) => Promise<void>;
  addOrigin: (label: string, source: { kind: string; value: string }) => Promise<void>;
  removeOrigin: (originId: string) => Promise<void>;
  toggleOrigin: (originId: string, enabled: boolean) => Promise<void>;
  fetchOrigin: (originId: string) => Promise<void>;
  installPlugin: (pluginId: string, locality: 'workspace' | 'user') => Promise<{ ok: boolean; error?: string }>;
  uninstallPlugin: (pluginId: string) => Promise<{ ok: boolean; error?: string }>;
}
