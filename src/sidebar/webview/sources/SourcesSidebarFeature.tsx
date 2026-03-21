import './sources-tree.css';
import { formatSnapshotHint } from './formatSnapshotHint';
import { SourceTreeView } from './SourceTreeView';
import { useSourcesSidebarState } from './useSourcesSidebarState';

export function SourcesSidebarFeature(): JSX.Element {
  const {
    sourceCount,
    lastUpdated,
    isIndexing,
    records,
    workspaceFolders,
    generatedAt,
    handleShowExample,
    handleShowGraph,
    handleIndexSources,
  } = useSourcesSidebarState();

  const snapshotHint = formatSnapshotHint(generatedAt);

  return (
    <>
      <header className="akashi-header">
        <div>
          <p className="akashi-overline">Akashi</p>
        </div>
      </header>

      <section className="akashi-card">
        <div className="akashi-row">
          <span className="akashi-label">Sources indexed</span>
          <span className="akashi-value">{sourceCount}</span>
        </div>
        <div className="akashi-divider" />
        {lastUpdated ? (
          <p className="akashi-muted">Last indexed at {lastUpdated}</p>
        ) : snapshotHint ? (
          <p className="akashi-muted">Saved snapshot · {snapshotHint}</p>
        ) : null}
      </section>

      <section className="akashi-tree-panel" aria-label="Indexed sources">
        <h2 className="akashi-tree-panel__title">Indexed sources</h2>
        <p className="akashi-muted akashi-tree-panel__hint">
          Filtered by Akashi presets; home-directory configs use &quot;Sources: Include Home
          Config&quot; (Settings → search &quot;Akashi&quot;).
        </p>
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
