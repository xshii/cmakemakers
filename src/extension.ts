import * as vscode from 'vscode';
import { CMakeEditorProvider } from './providers/CMakeEditorProvider';

export function activate(context: vscode.ExtensionContext) {
  console.log('CMakeMakers extension is now active');

  // Register the custom editor provider for YAML config files
  const editorProvider = new CMakeEditorProvider(context);
  const editorDisposable = vscode.window.registerCustomEditorProvider(
    'cmakemakers.configEditor',
    editorProvider,
    {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
      supportsMultipleEditorsPerDocument: false,
    }
  );

  // Register command to open the config editor
  const openEditorCommand = vscode.commands.registerCommand(
    'cmakemakers.openEditor',
    async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        vscode.window.showErrorMessage('Please open a workspace first');
        return;
      }

      const configPath = vscode.Uri.joinPath(
        workspaceFolders[0].uri,
        'cmake',
        'cmaker_config.yaml'
      );

      try {
        // Check if file exists
        try {
          await vscode.workspace.fs.stat(configPath);
        } catch {
          // File doesn't exist, create a default one
          const defaultConfig = createDefaultConfig();
          await vscode.workspace.fs.writeFile(
            configPath,
            Buffer.from(defaultConfig, 'utf8')
          );
        }

        // Open with custom editor
        await vscode.commands.executeCommand(
          'vscode.openWith',
          configPath,
          'cmakemakers.configEditor'
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to open config: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  );

  // Register command to generate CMakeLists.txt
  const generateCommand = vscode.commands.registerCommand(
    'cmakemakers.generateCMakeLists',
    async () => {
      vscode.window.showInformationMessage(
        'Generate CMakeLists.txt command triggered'
      );
      // This will be handled by the webview
    }
  );

  context.subscriptions.push(
    editorDisposable,
    openEditorCommand,
    generateCommand
  );
}

export function deactivate() {
  console.log('CMakeMakers extension is now deactivated');
}

function createDefaultConfig(): string {
  return `project:
  name: MyProject
  version: 1.0.0
  cmake_minimum_required: "3.15"
  languages:
    - CXX

global:
  cxx_standard: 17
  cxx_standard_required: true
  default_build_type: Release

targets: []

metadata:
  generated_by: CMakeMakers
  version: 0.0.1
  created_at: ${new Date().toISOString()}
`;
}
