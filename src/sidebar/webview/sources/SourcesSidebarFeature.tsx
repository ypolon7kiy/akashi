import './tree/sources-tree.css';
import { SourceTreeView } from './tree/SourceTreeView';
import { useSourcesSidebarState } from './useSourcesSidebarState';

export function SourcesSidebarFeature(): JSX.Element {
  const { isIndexing, records, workspaceFolders } = useSourcesSidebarState();

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
