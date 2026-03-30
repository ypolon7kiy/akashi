import { useMemo } from 'react';
import type { HourlyActivity } from '../../../domain/model';

interface HeatmapChartProps {
  hourlyActivity: readonly HourlyActivity[];
}

const CELL_SIZE = 20;
const CELL_GAP = 2;
const LABEL_WIDTH = 40;
const LABEL_HEIGHT = 20;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function HeatmapChart({ hourlyActivity }: HeatmapChartProps) {
  const { grid, maxTokens } = useMemo(() => {
    const g = new Map<string, number>();
    let max = 0;
    for (const h of hourlyActivity) {
      const key = `${h.dayOfWeek}-${h.hour}`;
      const val = h.tokenCount;
      g.set(key, val);
      max = Math.max(max, val);
    }
    return { grid: g, maxTokens: max };
  }, [hourlyActivity]);

  if (hourlyActivity.length === 0 || maxTokens === 0) {
    return null;
  }

  const svgWidth = LABEL_WIDTH + HOURS.length * (CELL_SIZE + CELL_GAP);
  const svgHeight = LABEL_HEIGHT + DAYS.length * (CELL_SIZE + CELL_GAP);

  return (
    <div className="pulse-heatmap-container">
      <svg
        width="100%"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="pulse-heatmap-svg"
        aria-label="Activity heatmap by day of week and hour"
      >
        {/* Hour labels */}
        {HOURS.map((hour) => {
          if (hour % 3 !== 0) return null;
          const x = LABEL_WIDTH + hour * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
          return (
            <text
              key={`h-${hour}`}
              x={x}
              y={LABEL_HEIGHT - 4}
              textAnchor="middle"
              className="pulse-heatmap-label"
            >
              {hour.toString().padStart(2, '0')}
            </text>
          );
        })}

        {/* Day labels + cells */}
        {DAYS.map((day, dayIdx) => {
          const y = LABEL_HEIGHT + dayIdx * (CELL_SIZE + CELL_GAP);
          return (
            <g key={day}>
              <text
                x={LABEL_WIDTH - 6}
                y={y + CELL_SIZE / 2}
                textAnchor="end"
                dominantBaseline="central"
                className="pulse-heatmap-label"
              >
                {day}
              </text>
              {HOURS.map((hour) => {
                const key = `${dayIdx}-${hour}`;
                const tokens = grid.get(key) ?? 0;
                const intensity = tokens / maxTokens;
                const x = LABEL_WIDTH + hour * (CELL_SIZE + CELL_GAP);

                return (
                  <rect
                    key={key}
                    x={x}
                    y={y}
                    width={CELL_SIZE}
                    height={CELL_SIZE}
                    rx={3}
                    fill={
                      intensity === 0
                        ? 'var(--vscode-panel-border)'
                        : `color-mix(in srgb, var(--vscode-charts-green) ${Math.round(intensity * 100)}%, var(--vscode-panel-border))`
                    }
                  >
                    <title>
                      {day} {hour.toString().padStart(2, '0')}:00 — {tokens.toLocaleString()} tokens
                    </title>
                  </rect>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
