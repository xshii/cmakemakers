import * as vscode from 'vscode';
import { YAMLParser } from '../core/parser/YAMLParser';
import { YAMLSerializer } from '../core/generator/YAMLSerializer';
import { CMakeProject } from '../core/model/types';

export class CMakeEditorProvider implements vscode.CustomTextEditorProvider {
  private static readonly viewType = 'cmakemakers.configEditor';
  private readonly serializer: YAMLSerializer;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.serializer = new YAMLSerializer();
  }

  /**
   * Called when custom editor is opened
   */
  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    // Setup webview
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'out'),
        vscode.Uri.joinPath(this.context.extensionUri, 'webview', 'dist'),
      ],
    };

    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    // Load initial data
    this.updateWebview(document, webviewPanel.webview);

    // Handle messages from webview
    webviewPanel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case 'save':
            await this.save(document, message.data);
            break;
          case 'load':
            this.updateWebview(document, webviewPanel.webview);
            break;
          case 'ready':
            // Webview is ready, send initial data
            this.updateWebview(document, webviewPanel.webview);
            break;
          default:
            console.warn('Unknown message type:', message.type);
        }
      },
      null,
      this.context.subscriptions
    );

    // Update webview when document changes externally
    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (e.document.uri.toString() === document.uri.toString()) {
          this.updateWebview(document, webviewPanel.webview);
        }
      }
    );

    // Clean up
    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });
  }

  /**
   * Update webview with document content
   */
  private updateWebview(
    document: vscode.TextDocument,
    webview: vscode.Webview
  ): void {
    try {
      const text = document.getText();
      const project = YAMLParser.parse(text);

      webview.postMessage({
        type: 'update',
        data: project,
      });
    } catch (error) {
      webview.postMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to parse config',
      });
    }
  }

  /**
   * Save data to document
   */
  private async save(
    document: vscode.TextDocument,
    data: CMakeProject
  ): Promise<void> {
    try {
      // Update metadata
      data.metadata.last_modified = new Date().toISOString();

      // Serialize to YAML
      const yamlContent = this.serializer.serialize(data);

      // Create edit
      const edit = new vscode.WorkspaceEdit();
      edit.replace(
        document.uri,
        new vscode.Range(0, 0, document.lineCount, 0),
        yamlContent
      );

      // Apply edit
      const success = await vscode.workspace.applyEdit(edit);

      if (success) {
        await document.save();
        vscode.window.showInformationMessage('Configuration saved successfully');
      } else {
        vscode.window.showErrorMessage('Failed to save configuration');
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get HTML for webview
   */
  private getHtmlForWebview(webview: vscode.Webview): string {
    // Get the local path to main script run in the webview
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'webview', 'dist', 'main.js')
    );

    // Get the local path to css
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'webview', 'dist', 'main.css')
    );

    // Use a nonce to whitelist which scripts can be run
    const nonce = getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="${styleUri}" rel="stylesheet">
      <title>CMakeMakers Config Editor</title>
    </head>
    <body>
      <div id="root"></div>
      <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
