import type { AddonLocality } from '../hooks/useAddonsState';

interface StatusBadgeProps {
  readonly locality: AddonLocality;
}

const LOCALITY_LABELS: Record<AddonLocality, string> = {
  workspace: 'project',
  local: 'local',
  user: 'global',
};

export function StatusBadge({ locality }: StatusBadgeProps) {
  const label = LOCALITY_LABELS[locality] ?? locality;
  return <span className="akashi-addons-badge">{label}</span>;
}
