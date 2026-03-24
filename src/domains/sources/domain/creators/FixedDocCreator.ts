import * as vscode from 'vscode';
import type { SourceCategory } from '../model';
import type { SourcePresetId } from '../../../../shared/sourcePresetId';
import {
  ArtifactCreator,
  type ArtifactCreatorArgs,
  type CreatorContext,
  type CreatorResult,
} from '../artifactCreator';

interface FixedDocCreatorConfigBase {
  readonly id: string;
  readonly label: string;
  readonly presetId: SourcePresetId;
  readonly category: SourceCategory;
  readonly scope: 'workspace' | 'user';
  readonly inputTitle?: string;
  readonly inputPrompt?: string;
  readonly absolutePath: (ctx: CreatorContext) => string;
  readonly contentForTitle: (title: string) => string;
}

export type FixedDocCreatorConfig =
  | (FixedDocCreatorConfigBase & {
      readonly requireNonEmptyTitle: true;
    })
  | (FixedDocCreatorConfigBase & {
      readonly requireNonEmptyTitle: false;
      readonly defaultTitleIfEmpty: string;
    });

export class FixedDocCreator extends ArtifactCreator {
  constructor(private readonly cfg: FixedDocCreatorConfig) {
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
    const abs = this.cfg.absolutePath(ctx);
    if (!abs) {
      return { kind: 'error', error: 'No target path could be determined.' };
    }
    let title = args.userInput.trim();
    if (this.cfg.requireNonEmptyTitle && title === '') {
      return { kind: 'error', error: 'Enter a title.' };
    }
    if (!this.cfg.requireNonEmptyTitle && title === '') {
      title = this.cfg.defaultTitleIfEmpty;
    }
    return {
      kind: 'plan',
      plan: {
        operations: [
          {
            type: 'writeFile',
            absolutePath: abs,
            content: this.cfg.contentForTitle(title),
          },
        ],
        openAfterCreate: abs,
      },
    };
  }

  async run(ctx: CreatorContext): Promise<CreatorResult> {
    const title = await vscode.window.showInputBox({
      title: this.cfg.inputTitle ?? 'Title',
      prompt: this.cfg.inputPrompt ?? 'Document title',
      validateInput: (v) => {
        if (!this.cfg.requireNonEmptyTitle) {
          return undefined;
        }
        const t = v.trim();
        if (t === '') {
          return 'Enter a title.';
        }
        return undefined;
      },
    });
    if (title === undefined) {
      return { kind: 'cancelled' };
    }
    const trimmed = title.trim();
    if (this.cfg.requireNonEmptyTitle && trimmed === '') {
      return { kind: 'error', error: 'Enter a title.' };
    }
    return this.planWithProvidedInput(ctx, { userInput: trimmed });
  }
}
