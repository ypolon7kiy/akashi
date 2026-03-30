import { useMemo } from 'react';
import type { SessionSummary, TimelineResponse } from '../../../domain/model';
import { buildToolExecutions, assignGanttRows } from '../../../domain/toolExecutionLayout';
import { formatDuration } from '../../../domain/format';

interface GanttViewProps {
  session: SessionSummary;
  timeline: TimelineResponse | null;
  loading: boolean;
  onBack: () => void;
}

const TOOL_COLORS: Record<string, string> = {
  Read: 'var(--vscode-charts-blue)',
  Write: 'var(--vscode-charts-green)',
  Edit: 'var(--vscode-charts-yellow)',
  Bash: 'var(--vscode-charts-orange)',
  Grep: 'var(--vscode-charts-purple)',
  Glob: 'var(--vscode-charts-purple)',
  Agent: 'var(--vscode-charts-red)',
};

const DEFAULT_COLOR = 'var(--vscode-descriptionForeground)';
const ROW_HEIGHT = 28;
const ROW_GAP = 4;
const LABEL_WIDTH = 120;
const MIN_BAR_WIDTH = 4;

export function GanttView({ session, timeline, loading, onBack }: GanttViewProps) {
  const executions = useMemo(() => {
    if (!timeline) return [];
    const raw = buildToolExecutions(timeline.blocks);
    return assignGanttRows(raw);
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
          <span className="pulse-loading__text">Loading tool timeline...</span>
        </div>
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <div className="pulse-detail">
        <button className="pulse-detail__back" onClick={onBack}>
          <span className="codicon codicon-chevron-left" aria-hidden />
          Back to session
        </button>
        <div className="pulse-empty">
          <p>No tool executions found in this session.</p>
        </div>
      </div>
    );
  }

  const startMs = Math.min(...executions.map((e) => new Date(e.startTime).getTime()));
  const endMs = Math.max(...executions.map((e) => new Date(e.endTime).getTime()));
  const totalMs = Math.max(endMs - startMs, 1);
  const maxRow = Math.max(...executions.map((e) => e.row ?? 0));
  const svgHeight = (maxRow + 1) * (ROW_HEIGHT + ROW_GAP) + ROW_GAP;
  const chartWidth = 800;

  const totalDurationMs = executions.reduce((sum, e) => sum + e.durationMs, 0);

  return (
    <div className="pulse-detail">
      <button className="pulse-detail__back" onClick={onBack}>
        <span className="codicon codicon-chevron-left" aria-hidden />
        Back to session
      </button>

      <div className="pulse-detail__title">{session.projectName} — Tool Timeline</div>
      <div className="pulse-conversation__meta">
        {executions.length} tool calls · {maxRow + 1} parallel rows · total{' '}
        {formatDuration(totalDurationMs)}
      </div>

      <div className="pulse-gantt-container">
        <svg
          width="100%"
          viewBox={`0 0 ${LABEL_WIDTH + chartWidth} ${svgHeight}`}
          className="pulse-gantt-svg"
        >
          {executions.map((exec) => {
            const row = exec.row ?? 0;
            const x0 =
              LABEL_WIDTH + ((new Date(exec.startTime).getTime() - startMs) / totalMs) * chartWidth;
            const barWidth = Math.max((exec.durationMs / totalMs) * chartWidth, MIN_BAR_WIDTH);
            const y = ROW_GAP + row * (ROW_HEIGHT + ROW_GAP);
            const color = TOOL_COLORS[exec.toolName] ?? DEFAULT_COLOR;

            return (
              <g key={exec.toolUseId}>
                <title>
                  {exec.toolName} — {formatDuration(exec.durationMs)}
                </title>
                {/* Bar */}
                <rect
                  x={x0}
                  y={y}
                  width={barWidth}
                  height={ROW_HEIGHT}
                  rx={3}
                  fill={color}
                  opacity={0.8}
                />
                {/* Label */}
                <text
                  x={LABEL_WIDTH - 8}
                  y={y + ROW_HEIGHT / 2}
                  textAnchor="end"
                  dominantBaseline="central"
                  fill="var(--vscode-foreground)"
                  fontSize="11"
                  className="pulse-gantt-label"
                >
                  {exec.toolName}
                </text>
                {/* Duration text on bar (if wide enough) */}
                {barWidth > 50 && (
                  <text
                    x={x0 + barWidth / 2}
                    y={y + ROW_HEIGHT / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="var(--vscode-editor-background)"
                    fontSize="10"
                    fontWeight="600"
                  >
                    {formatDuration(exec.durationMs)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
