import { useAddonsState } from './hooks/useAddonsState';
import { SearchBar } from './components/SearchBar';
import { InstalledList } from './components/InstalledList';
import { AvailableBrowse } from './components/AvailableBrowse';

export function AddonsApp() {
  const {
    catalog,
    isBusy,
    categoryFilter,
    searchText,
    activeTab,
    operationMessage,
    filteredInstalled,
    availableSections,
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
          showCategoryTabs={activeTab === 'installed'}
        />
      </header>

      <div className="akashi-addons-progress-slot" aria-busy={isBusy}>
        {isBusy && (
          <div
            className="akashi-progress"
            role="progressbar"
            aria-label="Operation in progress"
          />
        )}
      </div>

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
            disabled={isBusy}
          />
        ) : (
          <AvailableBrowse
            sections={availableSections}
            origins={catalog.origins}
            onInstall={installPlugin}
            onDelete={(pluginId) => deleteAddon(undefined, pluginId)}
            onToggleOrigin={toggleOrigin}
            onFetchOrigin={fetchOrigin}
            onAddOrigin={addOrigin}
            onRemoveOrigin={removeOrigin}
            disabled={isBusy}
          />
        )}
      </main>
    </div>
  );
}
