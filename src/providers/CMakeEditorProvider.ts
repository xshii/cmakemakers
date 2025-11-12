import * as vscode from 'vscode';
import * as path from 'path';
import { YAMLSerializer } from '../core/generator/YAMLSerializer';
import { CMakeProject } from '../core/model/types';

export class CMakeEditorProvider implements vscode.CustomTextEditorProvider {
  private static readonly viewType = 'cmakemakers.configEditor';

  constructor(private readonly context: vscode.ExtensionContext) {}

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new CMakeEditorProvider(context);
    const providerRegistration = vscode.window.registerCustomEditorProvider(
      CMakeEditorProvider.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }
    );
    return providerRegistration;
  }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    // Setup webview options
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(this.context.extensionPath, 'webview'))
      ]
    };

    // Set webview HTML content
    webviewPanel.webview.html = this.getWebviewContent(webviewPanel.webview, document);

    // Parse the current document
    let projectData: CMakeProject;
    try {
      const serializer = new YAMLSerializer();
      projectData = serializer.deserialize(document.getText());
    } catch (error) {
      vscode.window.showErrorMessage(`解析配置文件失败: ${error}`);
      return;
    }

    // Send initial data to webview
    webviewPanel.webview.postMessage({
      type: 'init',
      data: projectData
    });

    // Handle messages from webview
    webviewPanel.webview.onDidReceiveMessage(
      async (message: any) => {
        switch (message.type) {
          case 'update':
            await this.updateDocument(document, message.data);
            break;
          case 'generate':
            await vscode.commands.executeCommand('cmakemakers.generate');
            break;
          case 'openText':
            // Close webview and open in text editor
            webviewPanel.dispose();
            await vscode.window.showTextDocument(document, { preview: false });
            break;
          case 'error':
            vscode.window.showErrorMessage(message.message);
            break;
          default:
            console.log('Unknown message type:', message.type);
        }
      },
      null,
      this.context.subscriptions
    );

    // Handle document changes (external edits)
    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
      if (e.document.uri.toString() === document.uri.toString()) {
        // Document was changed externally, update webview
        try {
          const serializer = new YAMLSerializer();
          const updatedData = serializer.deserialize(e.document.getText());
          webviewPanel.webview.postMessage({
            type: 'update',
            data: updatedData
          });
        } catch (error) {
          console.error('Failed to parse updated document:', error);
        }
      }
    });

    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });
  }

  private async updateDocument(document: vscode.TextDocument, data: CMakeProject): Promise<void> {
    const serializer = new YAMLSerializer();
    const yamlContent = serializer.serialize(data);

    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      yamlContent
    );

    await vscode.workspace.applyEdit(edit);
  }

  private getWebviewContent(_webview: vscode.Webview, document: vscode.TextDocument): string {
    // For now, return a placeholder HTML
    // This will be replaced with the actual React UI in the next phase
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CMakeMakers Config Editor</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      padding: 20px;
      margin: 0;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    h1 {
      color: var(--vscode-editor-foreground);
      border-bottom: 1px solid var(--vscode-panel-border);
      padding-bottom: 10px;
    }
    .info {
      background: var(--vscode-textBlockQuote-background);
      border-left: 3px solid var(--vscode-textLink-foreground);
      padding: 15px;
      margin: 20px 0;
    }
    .file-path {
      font-family: monospace;
      background: var(--vscode-textCodeBlock-background);
      padding: 2px 6px;
      border-radius: 3px;
    }
    .button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 8px 16px;
      cursor: pointer;
      border-radius: 2px;
      margin: 5px;
    }
    .button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .status {
      margin-top: 20px;
      padding: 10px;
      background: var(--vscode-inputValidation-infoBackground);
      border: 1px solid var(--vscode-inputValidation-infoBorder);
      border-radius: 3px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🛠️ CMakeMakers 配置编辑器</h1>

    <div class="info">
      <p><strong>当前文件:</strong> <span class="file-path">${document.uri.fsPath}</span></p>
      <p>可视化编辑界面正在开发中...</p>
    </div>

    <div class="status">
      <h3>✅ Extension 已激活</h3>
      <p>核心功能已就绪：</p>
      <ul>
        <li>✅ 数据模型层</li>
        <li>✅ YAML 序列化</li>
        <li>✅ CMake 生成器</li>
        <li>✅ Extension 命令注册</li>
        <li>⏳ Webview UI（下一步开发）</li>
      </ul>
    </div>

    <div style="margin-top: 30px;">
      <h3>可用命令：</h3>
      <button class="button" onclick="generateCMake()">生成 CMakeLists.txt</button>
      <button class="button" onclick="openInTextEditor()">在文本编辑器中打开</button>
    </div>

    <div style="margin-top: 30px; padding: 15px; background: var(--vscode-inputValidation-warningBackground); border-radius: 3px;">
      <p><strong>临时方案：</strong> 您可以直接编辑 YAML 文件，保存后使用 "CMakeMakers: Generate CMakeLists.txt" 命令生成构建文件。</p>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function generateCMake() {
      vscode.postMessage({ type: 'generate' });
    }

    function openInTextEditor() {
      // Close the webview and open in text editor
      vscode.postMessage({ type: 'openText' });
    }

    // Listen for messages from extension
    window.addEventListener('message', event => {
      const message = event.data;
      switch (message.type) {
        case 'init':
          console.log('Received project data:', message.data);
          break;
        case 'update':
          console.log('Project data updated:', message.data);
          break;
      }
    });
  </script>
</body>
</html>`;
  }
}
