import type { InstalledAddonDescriptor } from '../../../../../shared/types/addonsCatalogPayload';
import { PluginCard } from './PluginCard';

interface InstalledListProps {
  readonly addons: readonly InstalledAddonDescriptor[];
  readonly onOpen: (path: string) => void;
  readonly onDelete: (addonId: string) => void;
  readonly onMoveToGlobal: (addonId: string) => void;
}

export function InstalledList({ addons, onOpen, onDelete, onMoveToGlobal }: InstalledListProps) {
  if (addons.length === 0) {
    return (
      <div className="akashi-addons-empty">
        <span className="codicon codicon-extensions" />
        <p>No addons found.</p>
        <p className="akashi-addons-empty__hint">
          Try changing the filter or adding skills to your Claude configuration.
        </p>
      </div>
    );
  }

  return (
    <div className="akashi-addons-list">
      {addons.map((addon) => (
        <PluginCard
          key={addon.id}
          addon={addon}
          onOpen={onOpen}
          onDelete={onDelete}
          onMoveToGlobal={onMoveToGlobal}
        />
      ))}
    </div>
  );
}
