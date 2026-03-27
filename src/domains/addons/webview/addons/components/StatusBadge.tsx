interface StatusBadgeProps {
  readonly locality: 'workspace' | 'user';
}

const LOCALITY_LABELS: Record<string, string> = {
  workspace: 'project',
  user: 'global',
};

export function StatusBadge({ locality }: StatusBadgeProps) {
  const label = LOCALITY_LABELS[locality] ?? locality;
  return <span className="akashi-addons-badge">{label}</span>;
}
