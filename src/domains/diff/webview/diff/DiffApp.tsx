import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { html as diff2html } from 'diff2html';
import { useDiffState } from './hooks/useDiffState';
import type { DiffTarget, DiffOutputFormat } from '../../domain/model';

/* ═══════════════════════════════════════════════
   Data types & parsers
   ═══════════════════════════════════════════════ */

interface DiffStats {
  readonly filesChanged: number;
  readonly additions: number;
  readonly deletions: number;
}

interface FileSummary {
  readonly path: string;
  readonly status: 'modified' | 'added' | 'deleted' | 'renamed';
  readonly additions: number;
  readonly deletions: number;
}

function parseDiffStats(raw: string): DiffStats {
  let additions = 0;
  let deletions = 0;
  let filesChanged = 0;

  for (const line of raw.split('\n')) {
    if (line.startsWith('diff --git')) filesChanged++;
    else if (line.startsWith('+') && !line.startsWith('+++')) additions++;
    else if (line.startsWith('-') && !line.startsWith('---')) deletions++;
  }

  return { filesChanged, additions, deletions };
}

function parseFileSummaries(raw: string): readonly FileSummary[] {
  const files: FileSummary[] = [];
  const chunks = raw.split(/^(?=diff --git )/m);

  for (const chunk of chunks) {
    if (!chunk.startsWith('diff --git')) continue;

    const firstLine = chunk.split('\n')[0];
    const match = firstLine.match(/diff --git a\/(.+?) b\/(.+)/);
    const path = match ? match[2] : 'unknown';

    let status: FileSummary['status'] = 'modified';
    if (chunk.includes('new file mode')) status = 'added';
    else if (chunk.includes('deleted file mode')) status = 'deleted';
    else if (chunk.includes('rename from') || (match && match[1] !== match[2])) status = 'renamed';

    let additions = 0;
    let deletions = 0;
    for (const line of chunk.split('\n')) {
      if (line.startsWith('+') && !line.startsWith('+++')) additions++;
      else if (line.startsWith('-') && !line.startsWith('---')) deletions++;
    }

    files.push({ path, status, additions, deletions });
  }

  return files;
}

/* ═══════════════════════════════════════════════
   Subcomponents
   ═══════════════════════════════════════════════ */

const TARGETS: readonly { kind: DiffTarget['kind']; label: string; icon: string }[] = [
  { kind: 'working', label: 'Working', icon: 'codicon-file' },
  { kind: 'staged', label: 'Staged', icon: 'codicon-pass' },
];

const STATUS_COLORS: Record<FileSummary['status'], string> = {
  modified: 'var(--diff-modified)',
  added: 'var(--diff-add-fg)',
  deleted: 'var(--diff-del-fg)',
  renamed: 'var(--akashi-info)',
};

function StatsChip({ stats }: { stats: DiffStats }) {
  const total = stats.additions + stats.deletions;
  const addPct = total > 0 ? (stats.additions / total) * 100 : 50;

  return (
    <div className="diff-stats" aria-label={`${stats.filesChanged} files, ${stats.additions} additions, ${stats.deletions} deletions`}>
      <span className="diff-stats__files">
        <span className="codicon codicon-file" />
        <span>{stats.filesChanged}</span>
      </span>
      <span className="diff-stats__divider" />
      <span className="diff-stats__additions">+{stats.additions}</span>
      <span className="diff-stats__deletions">&minus;{stats.deletions}</span>
      <span className="diff-stats__bar" aria-hidden>
        <span className="diff-stats__bar-add" style={{ width: `${addPct}%` }} />
        <span className="diff-stats__bar-del" style={{ width: `${100 - addPct}%` }} />
      </span>
    </div>
  );
}

function SegmentedControl({
  active,
  onSelect,
}: {
  active: DiffTarget['kind'];
  onSelect: (kind: DiffTarget['kind']) => void;
}) {
  const activeIdx = TARGETS.findIndex((t) => t.kind === active);

  return (
    <div className="diff-segment" role="tablist">
      <div
        className="diff-segment__indicator"
        style={{ transform: `translateX(${activeIdx * 100}%)` }}
      />
      {TARGETS.map((t) => (
        <button
          key={t.kind}
          role="tab"
          aria-selected={active === t.kind}
          className={`diff-segment__btn ${active === t.kind ? 'diff-segment__btn--active' : ''}`}
          onClick={() => onSelect(t.kind)}
        >
          <span className={`codicon ${t.icon}`} />
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

function ViewToggle({
  format,
  onToggle,
}: {
  format: DiffOutputFormat;
  onToggle: () => void;
}) {
  const isUnified = format === 'line-by-line';
  return (
    <button
      className="diff-view-toggle"
      onClick={onToggle}
      title={isUnified ? 'Switch to side-by-side' : 'Switch to unified'}
      aria-label={isUnified ? 'Switch to side-by-side view' : 'Switch to unified view'}
    >
      <span className={`codicon ${isUnified ? 'codicon-split-horizontal' : 'codicon-list-flat'}`} />
      <span className="diff-view-toggle__label">{isUnified ? 'Split' : 'Unified'}</span>
    </button>
  );
}

function FileDrawer({
  files,
  viewedFiles,
  onScrollToFile,
  onToggleViewed,
}: {
  files: readonly FileSummary[];
  viewedFiles: ReadonlySet<string>;
  onScrollToFile: (index: number) => void;
  onToggleViewed: (path: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const viewedCount = viewedFiles.size;

  return (
    <div className={`diff-drawer ${isOpen ? 'diff-drawer--open' : ''}`}>
      <button
        className="diff-drawer__toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span className={`codicon codicon-chevron-${isOpen ? 'down' : 'right'}`} />
        <span className="diff-drawer__title">Changed Files</span>
        <span className="diff-drawer__count">{files.length}</span>
        {viewedCount > 0 && (
          <span className="diff-drawer__reviewed">
            <span className="codicon codicon-pass" />
            {viewedCount}/{files.length}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="diff-drawer__list">
          {files.map((file, idx) => {
            const isViewed = viewedFiles.has(file.path);
            const dotColor = STATUS_COLORS[file.status];
            return (
              <button
                key={file.path}
                className={`diff-file-card ${isViewed ? 'diff-file-card--viewed' : ''}`}
                onClick={() => {
                  onToggleViewed(file.path);
                  if (!isViewed) onScrollToFile(idx);
                }}
                title={isViewed ? 'Mark as unreviewed' : `Review ${file.path}`}
              >
                <span className="diff-file-card__status">
                  {isViewed ? (
                    <span className="codicon codicon-check diff-file-card__status-icon diff-file-card__status-icon--viewed" />
                  ) : (
                    <span
                      className="diff-file-card__dot"
                      style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}` }}
                    />
                  )}
                </span>
                <span className="diff-file-card__path">{file.path}</span>
                <span className="diff-file-card__stats">
                  {file.additions > 0 && (
                    <span className="diff-file-card__add">+{file.additions}</span>
                  )}
                  {file.deletions > 0 && (
                    <span className="diff-file-card__del">&minus;{file.deletions}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Main App
   ═══════════════════════════════════════════════ */

export function DiffApp() {
  const {
    diffResult,
    error,
    outputFormat,
    activeTarget,
    requestDiff,
    refresh,
    toggleFormat,
  } = useDiffState();

  const contentRef = useRef<HTMLDivElement>(null);
  const [viewedFiles, setViewedFiles] = useState<ReadonlySet<string>>(new Set());

  const handleTargetSelect = useCallback(
    (kind: DiffTarget['kind']) => {
      requestDiff({ kind } as DiffTarget);
    },
    [requestDiff]
  );

  const stats = useMemo(
    () => (diffResult?.raw ? parseDiffStats(diffResult.raw) : null),
    [diffResult?.raw]
  );

  const fileSummaries = useMemo(
    () => (diffResult?.raw ? parseFileSummaries(diffResult.raw) : []),
    [diffResult?.raw]
  );

  const renderedHtml = useMemo(() => {
    if (!diffResult?.raw) return '';
    return diff2html(diffResult.raw, {
      outputFormat,
      drawFileList: false,
      matching: 'lines',
      diffStyle: 'word',
      colorScheme: 'auto',
    });
  }, [diffResult?.raw, outputFormat]);

  // Reset viewed state when diff content changes
  useEffect(() => {
    setViewedFiles(new Set());
  }, [diffResult?.raw]);

  // Inject viewed toggle buttons into file headers (runs once per render)
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    container.querySelectorAll('.d2h-file-wrapper').forEach((wrapper, idx) => {
      const header = wrapper.querySelector('.d2h-file-header');
      if (!header || header.querySelector('.diff-header-viewed')) return;

      const btn = document.createElement('button');
      btn.className = 'diff-header-viewed';
      btn.type = 'button';
      btn.dataset.fileIdx = String(idx);
      btn.innerHTML =
        '<span class="diff-header-viewed__icon codicon codicon-eye"></span>' +
        '<span class="diff-header-viewed__label">Review</span>';
      header.appendChild(btn);
    });
  }, [renderedHtml]);

  // Delegated click handler for file-header viewed buttons
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const handleClick = (e: Event) => {
      const btn = (e.target as Element).closest('.diff-header-viewed') as HTMLElement | null;
      if (!btn?.dataset.fileIdx) return;
      e.stopPropagation();
      const idx = Number(btn.dataset.fileIdx);
      const path = fileSummaries[idx]?.path;
      if (path) {
        setViewedFiles((prev) => {
          const next = new Set(prev);
          if (next.has(path)) next.delete(path);
          else next.add(path);
          return next;
        });
      }
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [renderedHtml, fileSummaries]);

  // Sync visual state of header buttons + file wrappers with viewedFiles
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    container.querySelectorAll('.d2h-file-wrapper').forEach((wrapper, idx) => {
      const path = fileSummaries[idx]?.path ?? '';
      const isViewed = viewedFiles.has(path);

      wrapper.classList.toggle('d2h-file--viewed', isViewed);

      const btn = wrapper.querySelector('.diff-header-viewed');
      if (!btn) return;
      btn.classList.toggle('diff-header-viewed--checked', isViewed);
      btn.setAttribute('title', isViewed ? 'Mark as unreviewed' : 'Mark as viewed');

      const icon = btn.querySelector('.diff-header-viewed__icon');
      if (icon) {
        icon.classList.toggle('codicon-eye', !isViewed);
        icon.classList.toggle('codicon-eye-closed', isViewed);
      }
      const label = btn.querySelector('.diff-header-viewed__label');
      if (label) {
        label.textContent = isViewed ? 'Viewed' : 'Review';
      }
    });
  }, [viewedFiles, renderedHtml, fileSummaries]);

  const handleToggleViewed = useCallback((path: string) => {
    setViewedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleScrollToFile = useCallback((index: number) => {
    const container = contentRef.current;
    if (!container) return;
    const wrappers = container.querySelectorAll('.d2h-file-wrapper');
    const target = wrappers[index];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // ── Error state ──
  if (error) {
    return (
      <div className="diff-app">
        <div className="diff-state diff-state--error">
          <div className="diff-state__icon-ring diff-state__icon-ring--error">
            <span className="codicon codicon-error" />
          </div>
          <p className="diff-state__title">Unable to load diff</p>
          <p className="diff-state__detail">{error}</p>
        </div>
      </div>
    );
  }

  // ── Loading state ──
  if (!diffResult) {
    return (
      <div className="diff-app">
        <div className="diff-state diff-state--loading">
          <div className="diff-state__scan">
            <div className="diff-state__scan-line" />
          </div>
          <p className="diff-state__title">Analyzing changes</p>
          <p className="diff-state__detail">Reading working tree...</p>
        </div>
      </div>
    );
  }

  // ── Main view ──
  return (
    <div className="diff-app">
      <header className="diff-header">
        <div className="diff-header__left">
          <SegmentedControl active={activeTarget} onSelect={handleTargetSelect} />
          {stats && !diffResult.isEmpty && <StatsChip stats={stats} />}
        </div>
        <div className="diff-header__right">
          {!diffResult.isEmpty && (
            <ViewToggle format={outputFormat} onToggle={toggleFormat} />
          )}
          <button className="diff-action-btn" onClick={refresh} title="Refresh" aria-label="Refresh diff">
            <span className="codicon codicon-refresh" />
          </button>
        </div>
      </header>

      {diffResult.isEmpty ? (
        <div className="diff-state diff-state--clean">
          <div className="diff-state__icon-ring diff-state__icon-ring--success">
            <svg className="diff-state__check" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                className="diff-state__check-path"
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="diff-state__title">
            {activeTarget === 'staged' ? 'Nothing staged' : 'Working tree clean'}
          </p>
          <p className="diff-state__detail">No pending changes to review</p>
        </div>
      ) : (
        <>
          <FileDrawer
            files={fileSummaries}
            viewedFiles={viewedFiles}
            onScrollToFile={handleScrollToFile}
            onToggleViewed={handleToggleViewed}
          />
          <div
            ref={contentRef}
            className="diff-content"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        </>
      )}
    </div>
  );
}
