import type { TimelineBlock } from '../../../domain/model';

const GAP_THRESHOLD_MS = 60_000; // show indicator for gaps >= 1 minute

interface TimeGapIndicatorProps {
  current: TimelineBlock;
  previous?: TimelineBlock;
}

export function TimeGapIndicator({ current, previous }: TimeGapIndicatorProps) {
  if (!previous) return null;

  const prevMs = new Date(previous.timestamp).getTime();
  const curMs = new Date(current.timestamp).getTime();
  const gapMs = curMs - prevMs;

  if (isNaN(gapMs) || gapMs < GAP_THRESHOLD_MS) return null;

  return (
    <div className="pulse-time-gap" aria-label={`${formatGap(gapMs)} gap`}>
      <span className="pulse-time-gap__line" />
      <span className="pulse-time-gap__label">{formatGap(gapMs)}</span>
      <span className="pulse-time-gap__line" />
    </div>
  );
}

function formatGap(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}
