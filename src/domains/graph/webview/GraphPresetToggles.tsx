import type { JSX } from 'react';

export function GraphPresetToggles(props: {
  presetIds: readonly string[];
  isPresetEnabled: (id: string) => boolean;
  onToggle: (id: string) => void;
}): JSX.Element | null {
  if (props.presetIds.length === 0) {
    return null;
  }
  return (
    <div className="akashi-graph-preset-toggles" role="group" aria-label="Show presets">
      {props.presetIds.map((id) => {
        const on = props.isPresetEnabled(id);
        return (
          <button
            key={id}
            type="button"
            className={
              on
                ? 'akashi-graph-preset-toggle akashi-graph-preset-toggle--on'
                : 'akashi-graph-preset-toggle'
            }
            aria-pressed={on}
            onClick={() => props.onToggle(id)}
          >
            {id}
          </button>
        );
      })}
    </div>
  );
}
