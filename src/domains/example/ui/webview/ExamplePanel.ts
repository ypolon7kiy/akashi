import * as vscode from 'vscode';
import { ExampleMessageType } from '../../webview/messages';

const viewType = 'dddExample.examplePanel';

export class ExamplePanel {
  public static currentPanel: ExamplePanel | undefined;

  public static createOrShow(context: vscode.ExtensionContext): void {
    const extensionUri = context.extensionUri;
    const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;

    if (ExamplePanel.currentPanel) {
      ExamplePanel.currentPanel.panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(viewType, 'DDD Example Panel', column, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'example')],
    });

    ExamplePanel.currentPanel = new ExamplePanel(panel, extensionUri);
    context.subscriptions.push(panel);
  }

  private constructor(
    public readonly panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri
  ) {
    this.panel.webview.html = this.getHtml(this.panel.webview);
    this.panel.onDidDispose(() => this.onDispose());
    this.panel.webview.onDidReceiveMessage((message: { type: string; payload?: unknown }) => {
      if (message.type === ExampleMessageType.ButtonClicked) {
        vscode.window.showInformationMessage('Message from Example webview: button clicked.');
      }
    });
  }

  private onDispose(): void {
    ExamplePanel.currentPanel = undefined;
  }

  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'example', 'example-main.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'example', 'example-main.css')
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${webview.cspSource}; style-src ${webview.cspSource};">
  <title>DDD Example</title>
  <link rel="stylesheet" href="${styleUri.toString()}">
</head>
<body>
  <div id="root"></div>
  <script src="${scriptUri.toString()}"></script>
</body>
</html>`;
  }
}
