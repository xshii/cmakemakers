import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { CMakeEditorProvider } from './providers/CMakeEditorProvider';
import { YAMLSerializer } from './core/generator/YAMLSerializer';
import { CMakeGenerator } from './core/generator/CMakeGenerator';
import { Project } from './core/model/Project';

export function activate(context: vscode.ExtensionContext) {
  console.log('CMakeMakers extension is now active');

  // Register custom editor provider
  const editorProvider = new CMakeEditorProvider(context);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      'cmakemakers.configEditor',
      editorProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        },
        supportsMultipleEditorsPerDocument: false
      }
    )
  );

  // Register command: Open Config Editor
  context.subscriptions.push(
    vscode.commands.registerCommand('cmakemakers.openEditor', async () => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage('请先打开一个工作区');
        return;
      }

      const configPath = path.join(workspaceFolder.uri.fsPath, 'cmake', 'cmaker_config.yaml');

      // Check if config exists
      if (!fs.existsSync(configPath)) {
        const create = await vscode.window.showInformationMessage(
          '配置文件不存在，是否创建新配置？',
          '创建',
          '取消'
        );

        if (create === '创建') {
          await createDefaultConfig(configPath);
        } else {
          return;
        }
      }

      // Open the config file with custom editor
      const document = await vscode.workspace.openTextDocument(configPath);
      await vscode.window.showTextDocument(document);
    })
  );

  // Register command: Generate CMakeLists.txt
  context.subscriptions.push(
    vscode.commands.registerCommand('cmakemakers.generate', async (uri?: vscode.Uri) => {
      try {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          vscode.window.showErrorMessage('请先打开一个工作区');
          return;
        }

        // Determine config file path
        let configPath: string;
        if (uri && uri.fsPath.endsWith('cmaker_config.yaml')) {
          configPath = uri.fsPath;
        } else {
          configPath = path.join(workspaceFolder.uri.fsPath, 'cmake', 'cmaker_config.yaml');
        }

        if (!fs.existsSync(configPath)) {
          vscode.window.showErrorMessage('找不到配置文件: cmaker_config.yaml');
          return;
        }

        // Read and parse YAML
        const yamlContent = fs.readFileSync(configPath, 'utf-8');
        const serializer = new YAMLSerializer();
        const projectData = serializer.deserialize(yamlContent);

        // Generate CMakeLists.txt
        const generator = new CMakeGenerator();
        const cmakeContent = generator.generate(projectData);

        // Write to CMakeLists.txt
        const cmakeListsPath = path.join(workspaceFolder.uri.fsPath, 'CMakeLists.txt');
        fs.writeFileSync(cmakeListsPath, cmakeContent, 'utf-8');

        vscode.window.showInformationMessage('✅ CMakeLists.txt 已生成');

        // Open the generated file
        const doc = await vscode.workspace.openTextDocument(cmakeListsPath);
        await vscode.window.showTextDocument(doc, { preview: false });

      } catch (error) {
        vscode.window.showErrorMessage(`生成失败: ${error}`);
        console.error('Generate error:', error);
      }
    })
  );

  // Register command: New Project from Template
  context.subscriptions.push(
    vscode.commands.registerCommand('cmakemakers.newProject', async () => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage('请先打开一个工作区');
        return;
      }

      // Show template picker
      const templates = [
        { label: '控制台应用', description: 'Console Application', value: 'console-app' },
        { label: '静态库', description: 'Static Library', value: 'static-lib' },
        { label: '共享库', description: 'Shared Library', value: 'shared-lib' }
      ];

      const selected = await vscode.window.showQuickPick(templates, {
        placeHolder: '选择项目模板'
      });

      if (!selected) {
        return;
      }

      // Get project name
      const projectName = await vscode.window.showInputBox({
        prompt: '输入项目名称',
        value: 'MyProject',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return '项目名称不能为空';
          }
          if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
            return '项目名称只能包含字母、数字和下划线，且不能以数字开头';
          }
          return null;
        }
      });

      if (!projectName) {
        return;
      }

      try {
        // Load template
        const templatePath = path.join(context.extensionPath, 'templates', `${selected.value}.yaml`);

        if (!fs.existsSync(templatePath)) {
          vscode.window.showErrorMessage(`模板文件不存在: ${selected.value}.yaml`);
          return;
        }

        const templateContent = fs.readFileSync(templatePath, 'utf-8');
        const serializer = new YAMLSerializer();
        const projectData = serializer.deserialize(templateContent);

        // Update project name
        projectData.project.name = projectName;

        // Serialize back to YAML
        const yamlContent = serializer.serialize(projectData);

        // Create cmake directory if not exists
        const cmakeDir = path.join(workspaceFolder.uri.fsPath, 'cmake');
        if (!fs.existsSync(cmakeDir)) {
          fs.mkdirSync(cmakeDir, { recursive: true });
        }

        // Write config file
        const configPath = path.join(cmakeDir, 'cmaker_config.yaml');
        fs.writeFileSync(configPath, yamlContent, 'utf-8');

        vscode.window.showInformationMessage(`✅ 项目配置已创建: ${projectName}`);

        // Open the config file
        const doc = await vscode.workspace.openTextDocument(configPath);
        await vscode.window.showTextDocument(doc);

      } catch (error) {
        vscode.window.showErrorMessage(`创建项目失败: ${error}`);
        console.error('New project error:', error);
      }
    })
  );

  // Setup file watcher for config changes
  const configWatcher = vscode.workspace.createFileSystemWatcher(
    '**/cmake/cmaker_config.yaml'
  );

  configWatcher.onDidChange(async (uri) => {
    console.log('Config file changed:', uri.fsPath);
    // Auto-generate CMakeLists.txt if enabled
    const config = vscode.workspace.getConfiguration('cmakemakers');
    if (config.get('autoGenerate', false)) {
      await vscode.commands.executeCommand('cmakemakers.generate', uri);
    }
  });

  context.subscriptions.push(configWatcher);
}

export function deactivate() {
  console.log('CMakeMakers extension is now deactivated');
}

// Helper function to create default config
async function createDefaultConfig(configPath: string): Promise<void> {
  const project = new Project();
  const serializer = new YAMLSerializer();
  const yamlContent = serializer.serialize(project.getData());

  // Ensure directory exists
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(configPath, yamlContent, 'utf-8');
}
