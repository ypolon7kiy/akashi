import * as vscode from 'vscode';
import { appendLine } from '../../../../log';
import { codiconsDistRoot } from '../../../../sidebar/host/sidebarWebviewHtml';
import { PulseMessageType } from '../../webview/pulse/messages';
import type { PulsePanelEnvironment } from '../pulsePanelEnvironment';
import { TASK_STATUSES } from '../../domain/taskData';
import type { TaskStatus } from '../../domain/taskData';

const viewType = 'akashi.pulsePanel';

export class PulsePanel {
  public static currentPanel: PulsePanel | undefined;

  private snapshotEnv: PulsePanelEnvironment;

  public static createOrShow(context: vscode.ExtensionContext, env: PulsePanelEnvironment): void {
    const extensionUri = context.extensionUri;
    const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;

    if (PulsePanel.currentPanel) {
      void PulsePanel.currentPanel.pushDashboardData(env);
      PulsePanel.currentPanel.panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(viewType, 'Akashi Sessions', column, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'pulse'),
        codiconsDistRoot(extensionUri),
      ],
    });

    PulsePanel.currentPanel = new PulsePanel(panel, extensionUri, env);
    context.subscriptions.push(panel);
  }

  public static async refreshIfOpen(env: PulsePanelEnvironment): Promise<void> {
    const p = PulsePanel.currentPanel;
    if (p) {
      await Promise.all([p.pushDashboardData(env), p.pushTaskData(env)]);
    }
  }

  public static async refreshDashboardIfOpen(env: PulsePanelEnvironment): Promise<void> {
    const p = PulsePanel.currentPanel;
    if (p) {
      await p.pushDashboardData(env);
    }
  }

  public static async refreshTasksIfOpen(env: PulsePanelEnvironment): Promise<void> {
    const p = PulsePanel.currentPanel;
    if (p) {
      await p.pushTaskData(env);
    }
  }

  private constructor(
    public readonly panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    initialEnv: PulsePanelEnvironment
  ) {
    this.snapshotEnv = initialEnv;
    this.panel.webview.html = this.getHtml(this.panel.webview);
    this.panel.onDidDispose(() => this.onDispose());
    this.panel.webview.onDidReceiveMessage(
      async (message: { type?: string; payload?: unknown }) => {
        try {
          if (message?.type === PulseMessageType.WebviewReady) {
            appendLine('[Akashi][Pulse] Webview ready — sending dashboard data.');
            await Promise.all([
              this.pushDashboardData(this.snapshotEnv),
              this.pushTaskData(this.snapshotEnv),
            ]);
            return;
          }
          if (message?.type === PulseMessageType.RefreshRequest) {
            await this.pushDashboardData(this.snapshotEnv);
            return;
          }
          if (message?.type === PulseMessageType.RequestTimeline) {
            const p = message.payload as { sessionId?: string } | undefined;
            if (p?.sessionId) {
              const timeline = await this.snapshotEnv.getSessionTimeline(p.sessionId);
              if (timeline) {
                await this.panel.webview.postMessage({
                  type: PulseMessageType.TimelineData,
                  payload: timeline,
                });
              }
            }
            return;
          }
          if (message?.type === PulseMessageType.RequestSubagentTimeline) {
            const p = message.payload as { sessionId?: string; agentId?: string } | undefined;
            if (p?.sessionId && p?.agentId) {
              const timeline = await this.snapshotEnv.getSubagentTimeline(p.sessionId, p.agentId);
              if (timeline) {
                await this.panel.webview.postMessage({
                  type: PulseMessageType.SubagentTimelineData,
                  payload: timeline,
                });
              }
            }
            return;
          }
          if (message?.type === PulseMessageType.DeleteSessions) {
            const p = message.payload as { sessionIds?: string[] } | undefined;
            if (p?.sessionIds && p.sessionIds.length > 0) {
              const count = p.sessionIds.length;
              const label = count === 1 ? '1 session' : `${count} sessions`;
              const confirm = await vscode.window.showWarningMessage(
                `Delete ${label}? This will permanently remove the session files from disk.`,
                { modal: true },
                'Delete'
              );
              if (confirm === 'Delete') {
                const updatedDashboard = await this.snapshotEnv.deleteSessions(p.sessionIds);
                await this.panel.webview.postMessage({
                  type: PulseMessageType.DashboardData,
                  payload: updatedDashboard,
                });
              }
            }
            return;
          }
          if (message?.type === PulseMessageType.ResumeSession) {
            const p = message.payload as { sessionId?: string; cwd?: string } | undefined;
            if (p?.sessionId && p?.cwd) {
              await this.snapshotEnv.resumeSession(p.sessionId, p.cwd);
            }
            return;
          }
          if (message?.type === PulseMessageType.TasksRefreshRequest) {
            await this.pushTaskData(this.snapshotEnv);
            return;
          }
          if (message?.type === PulseMessageType.CreateGroup) {
            const p = message.payload as { name?: string } | undefined;
            if (p?.name) {
              const result = await this.snapshotEnv.createGroup(p.name);
              await this.postTaskResult('createGroup', result);
              await this.pushTaskData(this.snapshotEnv);
            }
            return;
          }
          if (message?.type === PulseMessageType.CreateTask) {
            const p = message.payload as
              | { groupId?: string; name?: string; description?: string }
              | undefined;
            if (p?.groupId && p?.name) {
              const result = await this.snapshotEnv.createTask(
                p.groupId,
                p.name,
                p.description ?? ''
              );
              await this.postTaskResult('createTask', result);
              await this.pushTaskData(this.snapshotEnv);
            }
            return;
          }
          if (message?.type === PulseMessageType.UpdateTaskStatus) {
            const p = message.payload as { taskId?: string; status?: string } | undefined;
            if (p?.taskId && p?.status) {
              if (!TASK_STATUSES.includes(p.status as TaskStatus)) {
                await this.postTaskResult('updateStatus', {
                  ok: false,
                  error: `Invalid status: ${p.status}`,
                });
                return;
              }
              const result = await this.snapshotEnv.updateTaskStatus(
                p.taskId,
                p.status as TaskStatus
              );
              await this.postTaskResult('updateStatus', result);
              await this.pushTaskData(this.snapshotEnv);
            }
            return;
          }
          if (message?.type === PulseMessageType.DeleteGroup) {
            const p = message.payload as { groupId?: string } | undefined;
            if (p?.groupId) {
              const confirm = await vscode.window.showWarningMessage(
                'Delete this task group and all its tasks?',
                { modal: true },
                'Delete'
              );
              if (confirm === 'Delete') {
                const result = await this.snapshotEnv.deleteGroup(p.groupId);
                await this.postTaskResult('deleteGroup', result);
                await this.pushTaskData(this.snapshotEnv);
              } else {
                await this.postTaskResult('deleteGroup', { ok: true });
              }
            }
            return;
          }
          if (message?.type === PulseMessageType.DeleteTask) {
            const p = message.payload as { taskId?: string } | undefined;
            if (p?.taskId) {
              const result = await this.snapshotEnv.deleteTask(p.taskId);
              await this.postTaskResult('deleteTask', result);
              await this.pushTaskData(this.snapshotEnv);
            }
            return;
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          appendLine(`[Akashi][Pulse] Message handler error: ${msg}`);
        }
      }
    );
    void this.pushDashboardData(initialEnv).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      appendLine(`[Akashi][Pulse] Failed initial dashboard load: ${msg}`);
    });
  }

  public async pushTaskData(env: PulsePanelEnvironment): Promise<void> {
    this.snapshotEnv = env;
    try {
      const payload = await env.getTaskData();
      await this.panel.webview.postMessage({
        type: PulseMessageType.TaskData,
        payload,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      appendLine(`[Akashi][Pulse] Failed to load task data: ${msg}`);
    }
  }

  private async postTaskResult(
    operation: string,
    result: { ok: boolean; error?: string }
  ): Promise<void> {
    await this.panel.webview.postMessage({
      type: PulseMessageType.TaskOperationResult,
      payload: { operation, ...result },
    });
  }

  public async pushDashboardData(env: PulsePanelEnvironment): Promise<void> {
    this.snapshotEnv = env;
    const payload = await env.getDashboardData();
    await this.panel.webview.postMessage({
      type: PulseMessageType.DashboardData,
      payload,
    });
  }

  private onDispose(): void {
    PulsePanel.currentPanel = undefined;
  }

  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'pulse', 'pulse-main.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'pulse', 'pulse-main.css')
    );
    const codiconCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(codiconsDistRoot(this.extensionUri), 'codicon.css')
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; img-src ${webview.cspSource} data:;">
  <title>Akashi Sessions</title>
  <link rel="stylesheet" href="${codiconCssUri.toString()}">
  <link rel="stylesheet" href="${styleUri.toString()}">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${scriptUri.toString()}"></script>
</body>
</html>`;
  }
}
