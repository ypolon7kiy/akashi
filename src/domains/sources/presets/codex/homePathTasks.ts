import * as path from 'node:path';
import { SourceKind, type SourceKind as SourceKindType } from '../../domain/model';
import type { HomePathTask } from '../../domain/sourcePresetDefinition';

function kindsIntersect(
  allowed: ReadonlySet<SourceKindType>,
  probe: readonly SourceKindType[]
): boolean {
  return probe.some((k) => allowed.has(k));
}

async function collectCodexHomeDirectoryPaths(
  codexHomeDir: string,
  allowedKinds: ReadonlySet<SourceKindType>,
  add: (p: string) => void,
  fileExists: (p: string) => Promise<boolean>,
  collectShallowFilesWithSuffix: (dir: string, suffix: string) => Promise<string[]>
): Promise<void> {
  const files: { segments: string[]; kinds: readonly SourceKindType[] }[] = [
    { segments: ['AGENTS.md'], kinds: [SourceKind.AgentsMd] },
    { segments: ['agents.md'], kinds: [SourceKind.AgentsMd] },
    { segments: ['config.toml'], kinds: [SourceKind.CodexConfigToml] },
    { segments: ['AGENTS.override.md'], kinds: [SourceKind.CodexAgentsOverrideMd] },
  ];
  for (const row of files) {
    if (!kindsIntersect(allowedKinds, row.kinds)) {
      continue;
    }
    const abs = path.join(codexHomeDir, ...row.segments);
    if (await fileExists(abs)) {
      add(abs);
    }
  }
  if (kindsIntersect(allowedKinds, [SourceKind.CodexRulesFile])) {
    const rulesDir = path.join(codexHomeDir, 'rules');
    for (const f of await collectShallowFilesWithSuffix(rulesDir, '.rules')) {
      add(f);
    }
  }
}

export const codexHomePathTasks: readonly HomePathTask[] = [
  async (ctx) => {
    const { allowedKinds, roots, add, fileExists, collectShallowFilesWithSuffix } = ctx;
    const codexRoot = path.normalize(roots.codexUserRoot);
    await collectCodexHomeDirectoryPaths(
      codexRoot,
      allowedKinds,
      add,
      fileExists,
      collectShallowFilesWithSuffix
    );
  },
  async (ctx) => {
    const { allowedKinds, roots, add, collectSkillMdRecursiveUnderDir } = ctx;
    if (!kindsIntersect(allowedKinds, [SourceKind.CodexSkillMd])) {
      return;
    }
    const codexRoot = path.normalize(roots.codexUserRoot);
    const codexSkills = path.join(codexRoot, 'skills');
    for (const f of await collectSkillMdRecursiveUnderDir(codexSkills)) {
      add(f);
    }
  },
];
