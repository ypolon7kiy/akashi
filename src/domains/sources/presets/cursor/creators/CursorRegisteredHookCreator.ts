import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  ArtifactCreator,
  type ArtifactCreatorArgs,
  type CreatorContext,
  type CreatorResult,
} from '../../../domain/artifactCreator';
import { SourceCategoryId } from '../../../domain/sourceTags';
import { validateSourceFileBaseName } from '../../../../../shared/validateSourceFileBaseName';

export const DEFAULT_CURSOR_HOOK_EVENT = 'postToolUse' as const;

export const CURSOR_HOOK_LIFECYCLE_EVENTS = [
  'postToolUse',
  'preToolUse',
  'afterFileEdit',
  'beforeShellExecution',
  'afterShellExecution',
  'sessionStart',
  'sessionEnd',
  'stop',
] as const;

export interface CursorRegisteredHookCreatorConfig {
  readonly id: string;
  readonly label: string;
  readonly scope: 'workspace' | 'user';
  readonly hooksDir: (ctx: CreatorContext) => string;
  readonly hooksJsonPath: (ctx: CreatorContext) => string;
  /** Path written into hooks.json `command` field */
  readonly commandInHooksJson: (hookFileBaseName: string) => string;
}

type EventPick = vscode.QuickPickItem & { readonly event: string };

export class CursorRegisteredHookCreator extends ArtifactCreator {
  readonly presetId = 'cursor' as const;
  readonly category = SourceCategoryId.Hook;

  constructor(private readonly c: CursorRegisteredHookCreatorConfig) {
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
    const dir = this.c.hooksDir(ctx);
    const jsonFile = this.c.hooksJsonPath(ctx);
    if (!dir || !jsonFile) {
      return { kind: 'error', error: 'No target path could be determined.' };
    }
    const name = args.userInput.trim();
    if (!name) {
      return { kind: 'error', error: 'Enter a name.' };
    }
    const baseErr = validateSourceFileBaseName(name);
    if (baseErr) {
      return { kind: 'error', error: baseErr };
    }
    const scriptPath = path.join(dir, `${name}.sh`);
    const allowed = CURSOR_HOOK_LIFECYCLE_EVENTS as readonly string[];
    const event =
      args.hookLifecycleEvent && allowed.includes(args.hookLifecycleEvent)
        ? args.hookLifecycleEvent
        : DEFAULT_CURSOR_HOOK_EVENT;
    const hookEntry: Record<string, unknown> = { command: this.c.commandInHooksJson(name) };
    const m = args.hookMatcher?.trim();
    if (m) {
      hookEntry.matcher = m;
    }
    const matcherLabel = m ?? 'all tools';
    return {
      kind: 'plan',
      plan: {
        operations: [
          {
            type: 'writeFile',
            absolutePath: scriptPath,
            content: `#!/bin/bash\n# Cursor hook: ${name}\n# JSON on stdin; exit 0 = ok, 2 = block\ncat > /dev/null\nexit 0\n`,
          },
          {
            type: 'jsonMerge',
            absolutePath: jsonFile,
            jsonPath: `hooks.${event}`,
            value: [hookEntry],
            ensureTopLevelVersionIfMissing: 1,
            description: `Register Cursor hook "${name}" in hooks.json (${event}, matcher: ${matcherLabel})`,
          },
        ],
        openAfterCreate: scriptPath,
      },
    };
  }

  async run(ctx: CreatorContext): Promise<CreatorResult> {
    const evPick = await vscode.window.showQuickPick<EventPick>(
      CURSOR_HOOK_LIFECYCLE_EVENTS.map((e) => ({ label: e, event: e })),
      {
        title: 'Hook lifecycle event',
        placeHolder: `Default: ${DEFAULT_CURSOR_HOOK_EVENT}`,
      }
    );
    if (!evPick) {
      return { kind: 'cancelled' };
    }

    const matcherRaw = await vscode.window.showInputBox({
      title: 'Tool matcher (optional)',
      prompt: 'Restrict which tools fire this hook; leave empty for all tools',
    });
    if (matcherRaw === undefined) {
      return { kind: 'cancelled' };
    }

    const name = await vscode.window.showInputBox({
      title: 'Hook Name',
      prompt: 'Hook name (e.g. format-on-save)',
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

    return this.planWithProvidedInput(ctx, {
      userInput: trimmed,
      hookLifecycleEvent: evPick.event,
      hookMatcher: matcherRaw.trim(),
    });
  }
}
