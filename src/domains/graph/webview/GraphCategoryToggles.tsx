import type { JSX } from 'react';

export function GraphCategoryToggles(props: {
  categoryIds: readonly string[];
  labelForId: (categoryId: string) => string;
  isCategoryEnabled: (categoryId: string) => boolean;
  onToggle: (categoryId: string) => void;
}): JSX.Element | null {
  if (props.categoryIds.length === 0) {
    return null;
  }
  return (
    <div className="akashi-graph-preset-toggles" role="group" aria-label="Show source categories">
      {props.categoryIds.map((id) => {
        const on = props.isCategoryEnabled(id);
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
            title={id}
          >
            {props.labelForId(id)}
          </button>
        );
      })}
    </div>
  );
}
