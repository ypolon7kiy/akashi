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

export const DEFAULT_CLAUDE_HOOK_EVENT = 'PostToolUse' as const;

export const CLAUDE_HOOK_LIFECYCLE_EVENTS = [
  'PostToolUse',
  'PreToolUse',
  'Stop',
  'SubagentStop',
  'SessionStart',
  'SessionEnd',
  'Notification',
] as const;

export interface ClaudeRegisteredHookCreatorConfig {
  readonly id: string;
  readonly label: string;
  readonly scope: 'workspace' | 'user';
  readonly hooksDir: (ctx: CreatorContext) => string;
  readonly settingsPath: (ctx: CreatorContext) => string;
}

type EventPick = vscode.QuickPickItem & { readonly event: string };

export class ClaudeRegisteredHookCreator extends ArtifactCreator {
  readonly presetId = 'claude' as const;
  readonly category = SourceCategoryId.Hook;

  constructor(private readonly c: ClaudeRegisteredHookCreatorConfig) {
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
    const scriptPath = path.join(dir, `${name}.sh`);
    const allowed = CLAUDE_HOOK_LIFECYCLE_EVENTS as readonly string[];
    const hookEvent =
      args.hookLifecycleEvent && allowed.includes(args.hookLifecycleEvent)
        ? args.hookLifecycleEvent
        : DEFAULT_CLAUDE_HOOK_EVENT;
    const matcher = args.hookMatcher?.trim() ?? '';
    const newBlock = {
      matcher,
      hooks: [{ type: 'command', command: scriptPath }],
    };
    const matcherLabel = matcher === '' ? 'all tools' : matcher;
    const settingsAbs = this.c.settingsPath(ctx);
    if (!settingsAbs) {
      return { kind: 'error', error: 'No settings path could be determined.' };
    }
    return {
      kind: 'plan',
      plan: {
        operations: [
          {
            type: 'writeFile',
            absolutePath: scriptPath,
            content: `#!/bin/bash\n# Hook: ${name}\n\n`,
          },
          {
            type: 'jsonMerge',
            absolutePath: settingsAbs,
            jsonPath: `hooks.${hookEvent}`,
            value: [newBlock],
            description: `Register hook "${name}" in settings.json (hooks.${hookEvent}, matcher: ${matcherLabel})`,
          },
        ],
        openAfterCreate: scriptPath,
      },
    };
  }

  async run(ctx: CreatorContext): Promise<CreatorResult> {
    const evPick = await vscode.window.showQuickPick<EventPick>(
      CLAUDE_HOOK_LIFECYCLE_EVENTS.map((e) => ({ label: e, event: e })),
      {
        title: 'Hook lifecycle event',
        placeHolder: `Default: ${DEFAULT_CLAUDE_HOOK_EVENT}`,
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
      prompt: 'Hook name (e.g. lint-on-save)',
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
