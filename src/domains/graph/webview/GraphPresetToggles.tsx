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
    <div
      className="akashi-graph-visibility-toggles akashi-graph-visibility-toggles--preset"
      role="group"
      aria-label="Show presets"
    >
      {props.presetIds.map((id) => {
        const on = props.isPresetEnabled(id);
        return (
          <button
            key={id}
            type="button"
            className={
              on
                ? 'akashi-graph-visibility-toggle akashi-graph-visibility-toggle--on'
                : 'akashi-graph-visibility-toggle'
            }
            aria-pressed={on}
            title={id}
            onClick={() => props.onToggle(id)}
          >
            {id}
          </button>
        );
      })}
    </div>
  );
}
