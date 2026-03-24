import * as path from 'node:path';
import * as vscode from 'vscode';
import type { SourceCategory } from '../model';
import type { SourcePresetId } from '../../../../shared/sourcePresetId';
import type { ToolUserRoots } from '../../../../shared/toolUserRoots';
import { validateSourceFileBaseName } from '../../../../shared/validateSourceFileBaseName';
import {
  ArtifactCreator,
  type ArtifactCreatorArgs,
  type CreatorContext,
  type CreatorResult,
} from '../artifactCreator';

export interface SimpleFileCreatorConfig {
  readonly id: string;
  readonly label: string;
  readonly presetId: SourcePresetId;
  readonly category: SourceCategory;
  readonly scope: 'workspace' | 'user';
  readonly inputTitle?: string;
  readonly inputPrompt?: string;
  readonly targetDir: (workspaceRoot: string, roots: ToolUserRoots) => string;
  readonly suggestedExtension: string;
  readonly initialContent: string | ((fileName: string) => string);
}

export class SimpleFileCreator extends ArtifactCreator {
  constructor(private readonly cfg: SimpleFileCreatorConfig) {
    super();
  }

  get id(): string {
    return this.cfg.id;
  }
  get label(): string {
    return this.cfg.label;
  }
  get presetId(): SourcePresetId {
    return this.cfg.presetId;
  }
  get category(): SourceCategory {
    return this.cfg.category;
  }
  get scope(): 'workspace' | 'user' {
    return this.cfg.scope;
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
