import type { ProjectSummary } from '../../../domain/model';
import { formatTokenCount } from '../../../domain/format';
import { formatTimeAgo } from '../../../domain/format';

interface ProjectGridProps {
  projects: readonly ProjectSummary[];
  selectedProject: string | null;
  onSelect: (projectName: string) => void;
}

export function ProjectGrid({ projects, selectedProject, onSelect }: ProjectGridProps) {
  return (
    <div className="pulse-project-grid">
      {projects.map((project) => (
        <div
          key={project.path}
          className={`pulse-project-card${selectedProject === project.name ? ' pulse-project-card--selected' : ''}`}
          onClick={() => onSelect(project.name)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onSelect(project.name);
          }}
        >
          <div className="pulse-project-card__name" title={project.name}>
            {project.name}
          </div>
          <div className="pulse-project-card__stats">
            <span>
              <span className="pulse-project-card__stat-value">{project.sessionCount}</span>{' '}
              sessions
            </span>
            <span>
              <span className="pulse-project-card__stat-value">
                {formatTokenCount(project.totalTokens)}
              </span>{' '}
              tokens
            </span>
          </div>
          {project.lastActiveTime && (
            <div className="pulse-project-card__stats" style={{ marginTop: '4px' }}>
              <span>{formatTimeAgo(project.lastActiveTime)}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
