import * as path from 'node:path';
import { SourceKind, type SourceKind as SourceKindType } from '../../domain/model';
import type { HomePathTask } from '../../domain/sourcePresetDefinition';

function kindsIntersect(
  allowed: ReadonlySet<SourceKindType>,
  probe: readonly SourceKindType[]
): boolean {
  return probe.some((k) => allowed.has(k));
}

/** Copilot instructions under user `~/.github/`. */
export const sharedCopilotHomeTask: HomePathTask = async (ctx) => {
  const { allowedKinds, homeDir, add, fileExists } = ctx;
  if (!kindsIntersect(allowedKinds, [SourceKind.GithubCopilotInstructionsMd])) {
    return;
  }
  const abs = path.join(homeDir, '.github', 'copilot-instructions.md');
  if (await fileExists(abs)) {
    add(abs);
  }
};

export const sharedHomeAgentsTeamTasks: readonly HomePathTask[] = [
  async (ctx) => {
    const { allowedKinds, homeDir, add, fileExists } = ctx;
    if (!kindsIntersect(allowedKinds, [SourceKind.AgentsMd])) {
      return;
    }
    for (const name of ['AGENTS.md', 'agents.md'] as const) {
      const abs = path.join(homeDir, name);
      if (await fileExists(abs)) {
        add(abs);
      }
    }
  },
  async (ctx) => {
    const { allowedKinds, homeDir, add, fileExists } = ctx;
    if (!kindsIntersect(allowedKinds, [SourceKind.DotAgentsMd])) {
      return;
    }
    const abs = path.join(homeDir, '.agents.md');
    if (await fileExists(abs)) {
      add(abs);
    }
  },
  async (ctx) => {
    const { allowedKinds, homeDir, add, fileExists } = ctx;
    if (!kindsIntersect(allowedKinds, [SourceKind.TeamGuideMd])) {
      return;
    }
    for (const name of ['TEAM_GUIDE.md', 'team_guide.md'] as const) {
      const abs = path.join(homeDir, name);
      if (await fileExists(abs)) {
        add(abs);
      }
    }
  },
];
