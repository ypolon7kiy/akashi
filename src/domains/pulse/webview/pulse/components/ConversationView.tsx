import { useCallback, useEffect, useRef, useState } from 'react';
import type { SessionSummary, TimelineResponse, TimelineBlock } from '../../../domain/model';
import { TimelineEntry } from './TimelineEntry';
import { TimeGapIndicator } from './TimeGapIndicator';

const CHUNK_SIZE = 50;

interface ConversationViewProps {
  session: SessionSummary;
  timeline: TimelineResponse | null;
  loading: boolean;
  onBack: () => void;
}

export function ConversationView({ session, timeline, loading, onBack }: ConversationViewProps) {
  const [visibleCount, setVisibleCount] = useState(CHUNK_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset visible count when timeline changes
  useEffect(() => {
    setVisibleCount(CHUNK_SIZE);
  }, [timeline?.sessionId]);

  // IntersectionObserver for chunked loading
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !timeline) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + CHUNK_SIZE, timeline.blocks.length));
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [timeline]);

  if (loading) {
    return (
      <div className="pulse-detail">
        <button className="pulse-detail__back" onClick={onBack}>
          <span className="codicon codicon-chevron-left" aria-hidden />
          Back to session
        </button>
        <div className="pulse-loading">
          <span className="codicon codicon-loading codicon-modifier-spin" />
          <span className="pulse-loading__text">Loading conversation...</span>
        </div>
      </div>
    );
  }

  if (!timeline) {
    return (
      <div className="pulse-detail">
        <button className="pulse-detail__back" onClick={onBack}>
          <span className="codicon codicon-chevron-left" aria-hidden />
          Back to session
        </button>
        <div className="pulse-empty">
          <p>No conversation data available.</p>
        </div>
      </div>
    );
  }

  const visibleBlocks = timeline.blocks.slice(0, visibleCount);
  const hasMore = visibleCount < timeline.blocks.length;

  return (
    <div className="pulse-detail">
      <button className="pulse-detail__back" onClick={onBack}>
        <span className="codicon codicon-chevron-left" aria-hidden />
        Back to session
      </button>

      <div className="pulse-detail__title">{session.projectName} — Conversation</div>
      <div className="pulse-conversation__meta">
        {timeline.blocks.length} blocks · {timeline.totalRawMessages} raw messages
        {timeline.subagents.length > 0 && ` · ${timeline.subagents.length} subagents`}
      </div>

      <div className="pulse-conversation">
        {visibleBlocks.map((block, i) => (
          <ConversationBlock
            key={block.id}
            block={block}
            prevBlock={i > 0 ? visibleBlocks[i - 1] : undefined}
          />
        ))}
        {hasMore && (
          <div ref={sentinelRef} className="pulse-conversation__sentinel">
            <span className="codicon codicon-loading codicon-modifier-spin" />
            Loading more...
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationBlock({
  block,
  prevBlock,
}: {
  block: TimelineBlock;
  prevBlock?: TimelineBlock;
}) {
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => setExpanded((e) => !e), []);

  return (
    <>
      <TimeGapIndicator current={block} previous={prevBlock} />
      <TimelineEntry block={block} expanded={expanded} onToggle={toggle} />
    </>
  );
}
