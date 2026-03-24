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

export interface FolderFileCreatorConfig {
  readonly id: string;
  readonly label: string;
  readonly presetId: SourcePresetId;
  readonly category: SourceCategory;
  readonly scope: 'workspace' | 'user';
  readonly inputTitle?: string;
  readonly inputPrompt?: string;
  readonly targetDir: (workspaceRoot: string, roots: ToolUserRoots) => string;
  readonly fixedFileName: string;
  readonly initialContent: string | ((folderName: string) => string);
}

export class FolderFileCreator extends ArtifactCreator {
  constructor(private readonly cfg: FolderFileCreatorConfig) {
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
