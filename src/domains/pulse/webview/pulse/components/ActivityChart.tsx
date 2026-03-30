import { useMemo } from 'react';
import type { DailyActivity } from '../../../domain/model';
import { formatTokenCount } from '../../../domain/format';

interface ActivityChartProps {
  dailyActivity: readonly DailyActivity[];
}

const CHART_WIDTH = 700;
const CHART_HEIGHT = 200;
const PADDING = { top: 20, right: 20, bottom: 30, left: 60 };
const INNER_W = CHART_WIDTH - PADDING.left - PADDING.right;
const INNER_H = CHART_HEIGHT - PADDING.top - PADDING.bottom;

// Consistent model color mapping
const MODEL_COLORS = [
  'var(--vscode-charts-blue)',
  'var(--vscode-charts-green)',
  'var(--vscode-charts-orange)',
  'var(--vscode-charts-purple)',
  'var(--vscode-charts-red)',
  'var(--vscode-charts-yellow)',
];

export function ActivityChart({ dailyActivity }: ActivityChartProps) {
  const { modelNames, maxTokens, stackedData } = useMemo(() => {
    // Collect all unique model names
    const nameSet = new Set<string>();
    for (const day of dailyActivity) {
      for (const model of Object.keys(day.tokensByModel)) {
        nameSet.add(model);
      }
    }
    const models = Array.from(nameSet).sort();

    // Calculate stacked values
    let max = 0;
    const stacked = dailyActivity.map((day) => {
      let cumulative = 0;
      const layers: { model: string; y0: number; y1: number }[] = [];
      for (const model of models) {
        const tokens = day.tokensByModel[model] ?? 0;
        layers.push({ model, y0: cumulative, y1: cumulative + tokens });
        cumulative += tokens;
      }
      max = Math.max(max, cumulative);
      return { date: day.date, layers };
    });

    return { modelNames: models, maxTokens: max, stackedData: stacked };
  }, [dailyActivity]);

  if (dailyActivity.length === 0 || maxTokens === 0) {
    return null;
  }

  const xScale = (i: number) => PADDING.left + (i / Math.max(stackedData.length - 1, 1)) * INNER_W;
  const yScale = (v: number) => PADDING.top + INNER_H - (v / maxTokens) * INNER_H;

  // Build area paths for each model (bottom-up stacking)
  const areas = modelNames.map((model, modelIdx) => {
    // Top line (left to right)
    const topPoints = stackedData.map((d, i) => {
      const layer = d.layers.find((l) => l.model === model);
      return `${xScale(i)},${yScale(layer?.y1 ?? 0)}`;
    });
    // Bottom line (right to left)
    const bottomPoints = [...stackedData].reverse().map((d, ri) => {
      const layer = d.layers.find((l) => l.model === model);
      return `${xScale(stackedData.length - 1 - ri)},${yScale(layer?.y0 ?? 0)}`;
    });

    const path = `M${topPoints.join('L')}L${bottomPoints.join('L')}Z`;
    return (
      <path key={model} d={path} fill={MODEL_COLORS[modelIdx % MODEL_COLORS.length]} opacity={0.7}>
        <title>{model}</title>
      </path>
    );
  });

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((frac) => {
    const val = frac * maxTokens;
    const y = yScale(val);
    return (
      <g key={frac}>
        <line
          x1={PADDING.left}
          y1={y}
          x2={PADDING.left + INNER_W}
          y2={y}
          stroke="var(--vscode-panel-border)"
          strokeDasharray="2,2"
        />
        <text
          x={PADDING.left - 8}
          y={y}
          textAnchor="end"
          dominantBaseline="central"
          className="pulse-heatmap-label"
        >
          {formatTokenCount(val)}
        </text>
      </g>
    );
  });

  // X-axis labels (show every Nth date to avoid crowding)
  const step = Math.max(1, Math.floor(stackedData.length / 8));
  const xLabels = stackedData
    .filter((_, i) => i % step === 0 || i === stackedData.length - 1)
    .map((d, _idx) => {
      const i = stackedData.indexOf(d);
      return (
        <text
          key={d.date}
          x={xScale(i)}
          y={PADDING.top + INNER_H + 16}
          textAnchor="middle"
          className="pulse-heatmap-label"
        >
          {d.date.slice(5)}
        </text>
      );
    });

  return (
    <div className="pulse-chart-container">
      <svg
        width="100%"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="pulse-chart-svg"
        aria-label="Daily token usage chart"
      >
        {yTicks}
        {areas}
        {xLabels}
      </svg>

      {/* Legend */}
      <div className="pulse-chart-legend">
        {modelNames.map((model, idx) => (
          <span key={model} className="pulse-chart-legend__item">
            <span
              className="pulse-chart-legend__swatch"
              style={{ background: MODEL_COLORS[idx % MODEL_COLORS.length] }}
            />
            {model}
          </span>
        ))}
      </div>
    </div>
  );
}
