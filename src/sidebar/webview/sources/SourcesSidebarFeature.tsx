import './sources-tree.css';
import { SourceTreeView } from './SourceTreeView';
import { useSourcesSidebarState } from './useSourcesSidebarState';

export function SourcesSidebarFeature(): JSX.Element {
  const {
    isIndexing,
    records,
    workspaceFolders,
    handleShowExample,
    handleShowGraph,
    handleIndexSources,
  } = useSourcesSidebarState();

  return (
    <>
      <section className="akashi-tree-panel" aria-label="Indexed sources">
        <div className="akashi-tree-panel__scroll">
          <SourceTreeView
            records={records}
            workspaceFolders={workspaceFolders}
            isBusy={isIndexing}
          />
        </div>
      </section>

      <section className="akashi-actions" aria-busy={isIndexing}>
        <button
          className="akashi-button akashi-button--primary"
          type="button"
          onClick={() => {
            void handleIndexSources();
          }}
          disabled={isIndexing}
          aria-busy={isIndexing}
        >
          Index sources
        </button>
        <button
          className="akashi-button akashi-button--secondary"
          type="button"
          onClick={handleShowExample}
          disabled={isIndexing}
        >
          Open example panel
        </button>
        <button
          className="akashi-button akashi-button--secondary"
          type="button"
          onClick={handleShowGraph}
          disabled={isIndexing}
        >
          Show 3D graph
        </button>
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
