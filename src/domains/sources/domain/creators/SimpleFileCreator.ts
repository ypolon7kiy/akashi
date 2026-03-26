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

export interface SimpleFileCreatorConfig extends CreatorIdentityConfig {
  readonly inputTitle?: string;
  readonly inputPrompt?: string;
  readonly targetDir: (workspaceRoot: string, roots: ToolUserRoots) => string;
  readonly suggestedExtension: string;
  readonly initialContent: string | ((fileName: string) => string);
}

export class SimpleFileCreator extends ConfigBasedCreator {
  constructor(private readonly cfg: SimpleFileCreatorConfig) {
    super(cfg);
  }

  planWithProvidedInput(ctx: CreatorContext, args: ArtifactCreatorArgs): CreatorResult {
    const dir = this.cfg.targetDir(ctx.workspaceRoot, ctx.roots);
    if (!dir) {
      return { kind: 'error', error: 'No target directory could be determined.' };
    }
    const name = args.userInput.trim();
    if (!name) {
      return { kind: 'error', error: 'Enter a name.' };
    }
    const baseErr = validateSourceFileBaseName(name);
    if (baseErr) {
      return { kind: 'error', error: baseErr };
    }
    const ext = this.cfg.suggestedExtension;
    const withExt = ext && !name.toLowerCase().endsWith(ext.toLowerCase()) ? `${name}${ext}` : name;
    const absolutePath = path.join(dir, withExt);
    const content =
      typeof this.cfg.initialContent === 'function'
        ? this.cfg.initialContent(withExt)
        : this.cfg.initialContent;
    return {
      kind: 'plan',
      plan: { operations: [{ type: 'writeFile', absolutePath, content }] },
    };
  }

  async run(ctx: CreatorContext): Promise<CreatorResult> {
    const name = await vscode.window.showInputBox({
      title: this.cfg.inputTitle ?? 'Name',
      prompt: this.cfg.inputPrompt ?? 'File name (extension added if omitted)',
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
