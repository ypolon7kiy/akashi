import * as vscode from 'vscode';
import {
  ArtifactCreator,
  type ArtifactCreatorArgs,
  type CreatorContext,
  type CreatorResult,
} from '../../../domain/artifactCreator';
import { SourceCategoryId } from '../../../domain/sourceTags';
import { validateSourceFileBaseName } from '../../../../../shared/validateSourceFileBaseName';

export interface ClaudeMcpCreatorConfig {
  readonly id: string;
  readonly label: string;
  readonly scope: 'workspace' | 'user';
  readonly mcpPath: (ctx: CreatorContext) => string;
}

export class ClaudeMcpCreator extends ArtifactCreator {
  readonly presetId = 'claude' as const;
  readonly category = SourceCategoryId.Mcp;

  constructor(private readonly c: ClaudeMcpCreatorConfig) {
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

  planWithProvidedInput(ctx: CreatorContext, args: ArtifactCreatorArgs): CreatorResult {
    const target = this.c.mcpPath(ctx);
    if (!target) {
      return { kind: 'error', error: 'No target path could be determined.' };
    }
    const server = args.userInput.trim();
    if (!server) {
      return { kind: 'error', error: 'Enter a name.' };
    }
    const baseErr = validateSourceFileBaseName(server);
    if (baseErr) {
      return { kind: 'error', error: baseErr };
    }
    return {
      kind: 'plan',
      plan: {
        operations: [
          {
            type: 'jsonMerge',
            absolutePath: target,
            jsonPath: 'mcpServers',
            value: {
              [server]: {
                command: 'npx',
                args: ['-y', server],
              },
            },
            description: `Add starter MCP entry "${server}" (npx stub — edit .mcp.json for a real server config).`,
          },
        ],
      },
    };
  }

  async run(ctx: CreatorContext): Promise<CreatorResult> {
    const server = await vscode.window.showInputBox({
      title: 'MCP Server',
      prompt: 'Server name (e.g. my-mcp-server)',
      validateInput: (v) => validateSourceFileBaseName(v.trim()) ?? undefined,
    });
    if (server === undefined) {
      return { kind: 'cancelled' };
    }
    const trimmed = server.trim();
    const nameErr = validateSourceFileBaseName(trimmed);
    if (nameErr) {
      return { kind: 'error', error: nameErr };
    }
    return this.planWithProvidedInput(ctx, { userInput: trimmed });
  }
}
