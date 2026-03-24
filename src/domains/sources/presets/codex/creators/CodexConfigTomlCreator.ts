import * as vscode from 'vscode';
import {
  ArtifactCreator,
  type ArtifactCreatorArgs,
  type CreatorContext,
  type CreatorResult,
} from '../../../domain/artifactCreator';
import { SourceCategoryId } from '../../../domain/sourceTags';

const CODEX_CONFIG_TOML_STUB = `# Codex CLI configuration
# https://github.com/openai/codex

`;

export interface CodexConfigTomlCreatorConfig {
  readonly id: string;
  readonly label: string;
  readonly scope: 'workspace' | 'user';
  readonly absolutePath: (ctx: CreatorContext) => string;
}

export class CodexConfigTomlCreator extends ArtifactCreator {
  readonly presetId = 'codex' as const;
  readonly category = SourceCategoryId.Config;

  constructor(private readonly c: CodexConfigTomlCreatorConfig) {
    super();
  }

  get id(): string {
    return this.c.id;
  }
  get label(): string {
    return this.c.label;
  }
  get scope(): 'workspace' | 'user' {
    return this.c.scope;
  }

  planWithProvidedInput(ctx: CreatorContext, _args: ArtifactCreatorArgs): CreatorResult {
    const abs = this.c.absolutePath(ctx);
    if (!abs) {
      return { kind: 'error', error: 'No target path could be determined.' };
    }
    return {
      kind: 'plan',
      plan: {
        operations: [
          {
            type: 'writeFile',
            absolutePath: abs,
            content: CODEX_CONFIG_TOML_STUB,
          },
        ],
      },
    };
  }

  async run(ctx: CreatorContext): Promise<CreatorResult> {
    const abs = this.c.absolutePath(ctx);
    const choice = await vscode.window.showInformationMessage(
      `Create ${abs ? 'config.toml' : 'Codex config.toml'}?`,
      { modal: true },
      'Create'
    );
    if (choice !== 'Create') {
      return { kind: 'cancelled' };
    }
    return this.planWithProvidedInput(ctx, { userInput: '' });
  }
}
