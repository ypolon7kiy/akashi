import * as path from 'node:path';
import * as vscode from 'vscode';
import type { ToolUserRoots } from '../../../../shared/toolUserRoots';
import { validateSkillName } from '../../../../shared/validateSkillName';
import { buildSkillContent } from './buildSkillContent';
import {
  ConfigBasedCreator,
  type CreatorIdentityConfig,
  type ArtifactCreatorArgs,
  type CreatorContext,
  type CreatorResult,
} from '../artifactCreator';

export type SkillLayout =
  | { readonly kind: 'flat'; readonly suggestedExtension: string }
  | { readonly kind: 'folder'; readonly fixedFileName: string };

export interface SkillFileCreatorConfig extends CreatorIdentityConfig {
  readonly targetDir: (workspaceRoot: string, roots: ToolUserRoots) => string;
  readonly layout: SkillLayout;
}

export class SkillFileCreator extends ConfigBasedCreator {
  constructor(private readonly cfg: SkillFileCreatorConfig) {
    super(cfg);
  }

  planWithProvidedInput(ctx: CreatorContext, args: ArtifactCreatorArgs): CreatorResult {
    const dir = this.cfg.targetDir(ctx.workspaceRoot, ctx.roots);
    if (!dir) {
      return { kind: 'error', error: 'No target directory could be determined.' };
    }

    const name = args.userInput.trim();
    const nameErr = validateSkillName(name);
    if (nameErr) {
      return { kind: 'error', error: nameErr };
    }

    const absolutePath =
      this.cfg.layout.kind === 'flat'
        ? path.join(
            dir,
            name.endsWith(this.cfg.layout.suggestedExtension)
              ? name
              : `${name}${this.cfg.layout.suggestedExtension}`
          )
        : path.join(dir, name, this.cfg.layout.fixedFileName);

    const content = buildSkillContent(name, args.description ?? '');

    return {
      kind: 'plan',
      plan: { operations: [{ type: 'writeFile', absolutePath, content }] },
    };
  }

  async run(ctx: CreatorContext): Promise<CreatorResult> {
    const name = await vscode.window.showInputBox({
      title: 'Skill Name',
      prompt: 'Lowercase letters, numbers, and hyphens (e.g. code-review)',
      validateInput: (v) => validateSkillName(v.trim()) ?? undefined,
    });
    if (name === undefined) {
      return { kind: 'cancelled' };
    }

    const description = await vscode.window.showInputBox({
      title: 'Skill Description',
      prompt: 'What does this skill do and when should it be used?',
    });
    if (description === undefined) {
      return { kind: 'cancelled' };
    }

    return this.planWithProvidedInput(ctx, {
      userInput: name.trim(),
      description: description.trim(),
    });
  }
}
