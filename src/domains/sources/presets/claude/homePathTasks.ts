import * as path from 'node:path';
import { SourceKind, type SourceKind as SourceKindType } from '../../domain/model';
import type { HomePathTask } from '../../domain/sourcePresetDefinition';

function kindsIntersect(
  allowed: ReadonlySet<SourceKindType>,
  probe: readonly SourceKindType[]
): boolean {
  return probe.some((k) => allowed.has(k));
}

export const claudeHomePathTasks: readonly HomePathTask[] = [
  async (ctx) => {
    const { allowedKinds, roots, add, fileExists } = ctx;
    const rows: { abs: string; kinds: readonly SourceKindType[] }[] = [
      { abs: path.join(roots.claudeUserRoot, 'CLAUDE.md'), kinds: [SourceKind.ClaudeMd] },
      {
        abs: path.join(roots.claudeUserRoot, 'settings.json'),
        kinds: [SourceKind.ClaudeSettingsJson],
      },
      {
        abs: path.join(roots.claudeUserRoot, 'settings.local.json'),
        kinds: [SourceKind.ClaudeSettingsJson],
      },
    ];
    for (const row of rows) {
      if (!kindsIntersect(allowedKinds, row.kinds)) {
        continue;
      }
      if (await fileExists(row.abs)) {
        add(row.abs);
      }
    }
  },
  async (ctx) => {
    const { allowedKinds, roots, add, collectSkillMdRecursiveUnderDir } = ctx;
    if (!kindsIntersect(allowedKinds, [SourceKind.ClaudeSkillMd])) {
      return;
    }
    const claudeSkills = path.join(roots.claudeUserRoot, 'skills');
    for (const f of await collectSkillMdRecursiveUnderDir(claudeSkills)) {
      add(f);
    }
  },
  async (ctx) => {
    const { allowedKinds, roots, add, collectShallowFilesWithSuffix } = ctx;
    if (!kindsIntersect(allowedKinds, [SourceKind.ClaudeRulesMd])) {
      return;
    }
    const rulesDir = path.join(roots.claudeUserRoot, 'rules');
    for (const f of await collectShallowFilesWithSuffix(rulesDir, '.md')) {
      add(f);
    }
  },
  async (ctx) => {
    const { allowedKinds, roots, add, collectFilesRecursiveUnderDir } = ctx;
    if (!kindsIntersect(allowedKinds, [SourceKind.ClaudeHookFile])) {
      return;
    }
    const hooksDir = path.join(roots.claudeUserRoot, 'hooks');
    for (const f of await collectFilesRecursiveUnderDir(hooksDir)) {
      add(f);
    }
  },
];
