import { useEffect, useMemo, useRef, useState } from 'react';
import './tree/sources-tree.css';
import '../../../domains/search/webview/search-bar.css';
import { SourceTreeView } from './tree/SourceTreeView';
import { buildSourceTree } from './tree/sourceTree';
import { filterSourceTree } from './tree/filterSourceTree';
import { useSourcesSidebarState } from './useSourcesSidebarState';
import { useSourceSearch } from '../../../domains/search/webview/useSourceSearch';
import { SearchFacetBar } from '../../../domains/search/webview/SearchFacetBar';
import { labelGraphSourceCategory } from '../../../domains/graph/domain/graphSourceCategoryLabels';
import {
  serializeSearchQuery,
  type SerializedSourceSearchQuery,
} from '../../../domains/search/domain/model';
import { SidebarCoreMessageType } from '../../bridge/messages/core';
import { getVscodeApi } from '../../../webview-shared/api';

/**
 * Waits for the host to push saved filter state (SourcesFilterState message),
 * or falls back after a short timeout.
 */
function useHydratedFilterState(): {
  initialFilter: SerializedSourceSearchQuery | null;
  hydrated: boolean;
} {
  const [initialFilter, setInitialFilter] = useState<SerializedSourceSearchQuery | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let settled = false;
    const onMessage = (event: MessageEvent<unknown>): void => {
      const data = event.data as { type?: string; payload?: unknown } | undefined;
      if (!settled && data?.type === SidebarCoreMessageType.SourcesFilterState) {
        settled = true;
        setInitialFilter(data.payload as SerializedSourceSearchQuery | null);
        setHydrated(true);
      }
    };
    window.addEventListener('message', onMessage);

    // If no message arrives within 200ms, proceed without saved state.
    const timeout = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        setHydrated(true);
      }
    }, 200);

    return () => {
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timeout);
    };
  }, []);

  return { initialFilter, hydrated };
}

export function SourcesSidebarFeature(): JSX.Element {
  const { isIndexing, records, workspaceFolders } = useSourcesSidebarState();
  const { initialFilter, hydrated } = useHydratedFilterState();

  // Don't render the search-powered UI until hydration settles
  // so useSourceSearch receives the correct initial state.
  if (!hydrated) {
    return (
      <section className="akashi-tree-panel" aria-label="Indexed sources">
        <div className="akashi-tree-panel__scroll" />
      </section>
    );
  }

  return (
    <SourcesSidebarFeatureInner
      isIndexing={isIndexing}
      records={records}
      workspaceFolders={workspaceFolders}
      initialFilter={initialFilter}
    />
  );
}

function SourcesSidebarFeatureInner(props: {
  isIndexing: boolean;
  records: readonly import('../../../shared/types/sourcesSnapshotPayload').SourceDescriptor[];
  workspaceFolders: readonly import('../../../shared/types/sourcesSnapshotPayload').WorkspaceFolderInfo[];
  initialFilter: SerializedSourceSearchQuery | null;
}): JSX.Element {
  const { isIndexing, records, workspaceFolders, initialFilter } = props;
  const search = useSourceSearch(records, initialFilter);

  // Relay filter result (matched paths) to graph (immediate).
  useEffect(() => {
    const vscode = getVscodeApi();
    if (!vscode) return;
    vscode.postMessage({
      type: SidebarCoreMessageType.SourcesFilterChanged,
      payload: search.isActive ? [...search.result.matchedPaths] : null,
    });
  }, [search.isActive, search.result.matchedPaths]);

  // Persist filter state to globalState (debounced 300ms).
  const skipInitialSaveRef = useRef(true);
  useEffect(() => {
    if (skipInitialSaveRef.current) {
      skipInitialSaveRef.current = false;
      return;
    }
    const vscode = getVscodeApi();
    if (!vscode) return;
    const t = window.setTimeout(() => {
      vscode.postMessage({
        type: SidebarCoreMessageType.SourcesSaveFilterState,
        payload: serializeSearchQuery(search.query),
      });
    }, 300);
    return () => window.clearTimeout(t);
  }, [search.query]);

  const fullTree = useMemo(
    () => buildSourceTree(records, workspaceFolders),
    [records, workspaceFolders]
  );

  const filteredTree = useMemo(
    () => (search.isActive ? filterSourceTree(fullTree, search.result.matchedPaths) : undefined),
    [search.isActive, fullTree, search.result.matchedPaths]
  );

  return (
    <>
      {records.length > 0 ? (
        <SearchFacetBar
          query={search.query}
          onQueryTextChange={search.setQueryText}
          onToggleCategory={search.toggleCategory}
          onTogglePreset={search.togglePreset}
          onToggleLocality={search.toggleLocality}
          onResetAll={search.resetAll}
          isActive={search.isActive}
          matchCount={search.result.matchCount}
          totalRecords={search.result.totalRecords}
          categoryIds={search.availableCategories}
          presetIds={search.availablePresets}
          localityIds={search.availableLocalities}
          labelForCategory={labelGraphSourceCategory}
        />
      ) : null}
      <section className="akashi-tree-panel" aria-label="Indexed sources">
        <div className="akashi-tree-panel__scroll">
          <SourceTreeView
            records={records}
            workspaceFolders={workspaceFolders}
            isBusy={isIndexing}
            filteredRoots={filteredTree}
          />
        </div>
      </section>

      <section className="akashi-actions" aria-busy={isIndexing}>
        <div className="akashi-progress-slot">
          {isIndexing ? (
            <div
              className="akashi-progress"
              role="progressbar"
              aria-label="Indexing sources"
              aria-valuetext="Indexing sources"
            />
          ) : null}
        </div>
      </section>
    </>
  );
}
