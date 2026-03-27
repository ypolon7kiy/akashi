import { useAddonsState } from './hooks/useAddonsState';
import { SearchBar } from './components/SearchBar';
import { InstalledList } from './components/InstalledList';
import { MarketplaceBar } from './components/MarketplaceBar';
import { PluginGrid } from './components/PluginGrid';

export function AddonsApp() {
  const {
    catalog,
    categoryFilter,
    searchText,
    activeTab,
    operationMessage,
    filteredInstalled,
    filteredAvailable,
    categoryCounts,
    installedItems,
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
    deleteAddon,
    moveToGlobal,
  } = useAddonsState();

  if (!catalog) {
    return (
      <div className="akashi-addons-app">
        <div className="akashi-addons-loading">
          <span className="akashi-addons-loading__text">Loading addons...</span>
          <span className="akashi-addons-loading__hint">Waiting for source index</span>
        </div>
      </div>
    );
  }

  const availableCount = catalog.catalogPlugins.filter(
    (p) => p.installStatus === 'available'
  ).length;

  return (
    <div className="akashi-addons-app">
      <header className="akashi-addons-header">
        <div className="akashi-addons-header__title-row">
          <span className="codicon codicon-extensions" />
          <h1 className="akashi-addons-header__title">Claude Addons</h1>
          <button className="akashi-addons-header__refresh" onClick={refresh} title="Refresh">
            <span className="codicon codicon-refresh" />
          </button>
        </div>

        <div className="akashi-addons-tabs">
          <button
            className={`akashi-addons-tab ${activeTab === 'installed' ? 'akashi-addons-tab--active' : ''}`}
            onClick={() => setActiveTab('installed')}
          >
            Installed ({installedItems.length})
          </button>
          <button
            className={`akashi-addons-tab ${activeTab === 'available' ? 'akashi-addons-tab--active' : ''}`}
            onClick={() => setActiveTab('available')}
          >
            Available ({availableCount})
          </button>
        </div>

        <SearchBar
          searchText={searchText}
          onSearchChange={setSearchText}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
          categoryCounts={categoryCounts}
          totalCount={
            activeTab === 'installed'
              ? installedItems.length
              : catalog.catalogPlugins.length
          }
        />
      </header>

      {operationMessage && (
        <div className="akashi-addons-toast">{operationMessage}</div>
      )}

      <main className="akashi-addons-main">
        {activeTab === 'installed' ? (
          <InstalledList
            addons={filteredInstalled}
            onOpen={openFile}
            onDelete={(primaryPath) => deleteAddon(primaryPath)}
            onMoveToGlobal={moveToGlobal}
          />
        ) : (
          <>
            <MarketplaceBar
              origins={catalog.origins}
              onToggle={toggleOrigin}
              onFetch={fetchOrigin}
              onAdd={addOrigin}
              onRemove={removeOrigin}
            />
            <PluginGrid
              plugins={filteredAvailable}
              onInstall={installPlugin}
              onDelete={(pluginId) => deleteAddon(undefined, pluginId)}
            />
          </>
        )}
      </main>
    </div>
  );
}
