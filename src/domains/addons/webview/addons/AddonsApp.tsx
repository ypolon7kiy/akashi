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
            Installed ({catalog.installedAddons.length})
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
          categories={catalog.categorySummaries}
          totalCount={
            activeTab === 'installed'
              ? catalog.installedAddons.length
              : catalog.catalogPlugins.length
          }
        />
      </header>

      {operationMessage && (
        <div className="akashi-addons-toast">{operationMessage}</div>
      )}

      <main className="akashi-addons-main">
        {activeTab === 'installed' ? (
          <InstalledList addons={filteredInstalled} onOpen={openFile} />
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
              onUninstall={uninstallPlugin}
            />
          </>
        )}
      </main>
    </div>
  );
}
