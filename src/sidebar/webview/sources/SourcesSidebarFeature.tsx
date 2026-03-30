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
import { sidebarCategoryMetaModifier } from './tree/categorySidebarLabel';
import {
  serializeSearchQuery,
  type SerializedSourceSearchQuery,
} from '../../../domains/search/domain/model';
import type {
  SourceDescriptor,
  WorkspaceFolderInfo,
} from '../../../shared/types/sourcesSnapshotPayload';
import { SidebarCoreMessageType, type SourcesResponseMessage } from '../../bridge/messages/core';
import { getVscodeApi, postRequest } from '../../../webview-shared/api';

/**
 * Requests saved filter state from the host via RPC, avoiding the race
 * condition of the host pushing before the webview listener is ready.
 */
function useHydratedFilterState(): {
  initialFilter: SerializedSourceSearchQuery | null;
  hydrated: boolean;
} {
  const [initialFilter, setInitialFilter] = useState<SerializedSourceSearchQuery | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const vscode = getVscodeApi();
    if (!vscode) {
      setHydrated(true);
      return;
    }
    postRequest<SourcesResponseMessage>(
      vscode,
      { type: SidebarCoreMessageType.SourcesGetFilterStateRequest },
      SidebarCoreMessageType.SourcesResponse
    )
      .then((response) => {
        if (response.ok && response.payload != null) {
          setInitialFilter(response.payload as SerializedSourceSearchQuery);
        }
      })
      .catch(() => {
        // Graceful degradation: proceed without saved state.
      })
      .finally(() => {
        setHydrated(true);
      });
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

const categoryItemClassName = (id: string): string =>
  `akashi-search-bar__toggle--cat-${sidebarCategoryMetaModifier(id)}`;

function SourcesSidebarFeatureInner(props: {
  isIndexing: boolean;
  records: readonly SourceDescriptor[];
  workspaceFolders: readonly WorkspaceFolderInfo[];
  initialFilter: SerializedSourceSearchQuery | null;
}): JSX.Element {
  const { isIndexing, records, workspaceFolders, initialFilter } = props;
  const search = useSourceSearch(records, initialFilter);

  // Persist filter state and relay matched paths to host (debounced 300ms).
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
        payload: {
          ...serializeSearchQuery(search.query),
          matchedPaths: search.isActive ? [...search.result.matchedPaths] : null,
        },
      });
    }, 300);
    return () => window.clearTimeout(t);
  }, [search.query, search.isActive, search.result.matchedPaths]);

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
          categoryItemClassName={categoryItemClassName}
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
