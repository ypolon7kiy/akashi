import * as path from 'node:path';
import * as vscode from 'vscode';
import type { ToolUserRoots } from '../../../../shared/toolUserRoots';
import { validateSourceFileBaseName } from '../../../../shared/validateSourceFileBaseName';
import {
  ConfigBasedCreator,
  type CreatorIdentityConfig,
  type ArtifactCreatorArgs,
  type CreatorContext,
  type CreatorResult,
} from '../artifactCreator';

export interface FolderFileCreatorConfig extends CreatorIdentityConfig {
  readonly inputTitle?: string;
  readonly inputPrompt?: string;
  readonly targetDir: (workspaceRoot: string, roots: ToolUserRoots) => string;
  readonly fixedFileName: string;
  readonly initialContent: string | ((folderName: string) => string);
}

export class FolderFileCreator extends ConfigBasedCreator {
  constructor(private readonly cfg: FolderFileCreatorConfig) {
    super(cfg);
  }

  planWithProvidedInput(ctx: CreatorContext, args: ArtifactCreatorArgs): CreatorResult {
    const dir = this.cfg.targetDir(ctx.workspaceRoot, ctx.roots);
    if (!dir) {
      return { kind: 'error', error: 'No target directory could be determined.' };
    }
    const folderName = args.userInput.trim();
    if (!folderName) {
      return { kind: 'error', error: 'Enter a name.' };
    }
    const baseErr = validateSourceFileBaseName(folderName);
    if (baseErr) {
      return { kind: 'error', error: baseErr };
    }
    const absolutePath = path.join(dir, folderName, this.cfg.fixedFileName);
    const content =
      typeof this.cfg.initialContent === 'function'
        ? this.cfg.initialContent(folderName)
        : this.cfg.initialContent;
    return {
      kind: 'plan',
      plan: { operations: [{ type: 'writeFile', absolutePath, content }] },
    };
  }

  async run(ctx: CreatorContext): Promise<CreatorResult> {
    const name = await vscode.window.showInputBox({
      title: this.cfg.inputTitle ?? 'Name',
      prompt: this.cfg.inputPrompt ?? `Folder name (creates ${this.cfg.fixedFileName} inside)`,
      validateInput: (v) => validateSourceFileBaseName(v.trim()) ?? undefined,
    });
    if (name === undefined) {
      return { kind: 'cancelled' };
    }
    const trimmed = name.trim();
    const nameErr = validateSourceFileBaseName(trimmed);
    if (nameErr) {
      return { kind: 'error', error: nameErr };
    }
    return this.planWithProvidedInput(ctx, { userInput: trimmed });
  }
}
