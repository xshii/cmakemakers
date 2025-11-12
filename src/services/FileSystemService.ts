import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class FileSystemService {
  /**
   * Read a file from the file system
   */
  static async readFile(filePath: string): Promise<string> {
    return fs.promises.readFile(filePath, 'utf-8');
  }

  /**
   * Write content to a file
   */
  static async writeFile(filePath: string, content: string): Promise<void> {
    await fs.promises.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Check if a file exists
   */
  static fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  /**
   * Check if a directory exists
   */
  static directoryExists(dirPath: string): boolean {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  }

  /**
   * Create a directory (and parent directories if needed)
   */
  static async createDirectory(dirPath: string): Promise<void> {
    await fs.promises.mkdir(dirPath, { recursive: true });
  }

  /**
   * Delete a file
   */
  static async deleteFile(filePath: string): Promise<void> {
    await fs.promises.unlink(filePath);
  }

  /**
   * List files in a directory
   */
  static async listFiles(dirPath: string): Promise<string[]> {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    return entries.filter((entry: fs.Dirent) => entry.isFile()).map((entry: fs.Dirent) => entry.name);
  }

  /**
   * List directories in a directory
   */
  static async listDirectories(dirPath: string): Promise<string[]> {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    return entries.filter((entry: fs.Dirent) => entry.isDirectory()).map((entry: fs.Dirent) => entry.name);
  }

  /**
   * Get the config file path for the current workspace
   */
  static getConfigPath(workspaceFolder?: vscode.WorkspaceFolder): string | null {
    if (!workspaceFolder) {
      const folders = vscode.workspace.workspaceFolders;
      if (!folders || folders.length === 0) {
        return null;
      }
      workspaceFolder = folders[0];
    }

    return path.join(workspaceFolder.uri.fsPath, 'cmake', 'cmaker_config.yaml');
  }

  /**
   * Get the CMakeLists.txt path for the current workspace
   */
  static getCMakeListsPath(workspaceFolder?: vscode.WorkspaceFolder): string | null {
    if (!workspaceFolder) {
      const folders = vscode.workspace.workspaceFolders;
      if (!folders || folders.length === 0) {
        return null;
      }
      workspaceFolder = folders[0];
    }

    return path.join(workspaceFolder.uri.fsPath, 'CMakeLists.txt');
  }

  /**
   * Find files matching a pattern in a directory
   */
  static async findFiles(
    dirPath: string,
    pattern: RegExp,
    recursive: boolean = false
  ): Promise<string[]> {
    const results: string[] = [];

    async function scan(currentPath: string): Promise<void> {
      const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isFile() && pattern.test(entry.name)) {
          results.push(fullPath);
        } else if (entry.isDirectory() && recursive) {
          await scan(fullPath);
        }
      }
    }

    await scan(dirPath);
    return results;
  }

  /**
   * Copy a file
   */
  static async copyFile(sourcePath: string, destPath: string): Promise<void> {
    await fs.promises.copyFile(sourcePath, destPath);
  }

  /**
   * Get file stats
   */
  static async getFileStats(filePath: string): Promise<fs.Stats> {
    return fs.promises.stat(filePath);
  }

  /**
   * Normalize path separators for the current platform
   */
  static normalizePath(filePath: string): string {
    return path.normalize(filePath);
  }

  /**
   * Get relative path from workspace root
   */
  static getRelativePath(
    filePath: string,
    workspaceFolder?: vscode.WorkspaceFolder
  ): string | null {
    if (!workspaceFolder) {
      const folders = vscode.workspace.workspaceFolders;
      if (!folders || folders.length === 0) {
        return null;
      }
      workspaceFolder = folders[0];
    }

    return path.relative(workspaceFolder.uri.fsPath, filePath);
  }

  /**
   * Resolve absolute path from workspace root
   */
  static resolveAbsolutePath(
    relativePath: string,
    workspaceFolder?: vscode.WorkspaceFolder
  ): string | null {
    if (!workspaceFolder) {
      const folders = vscode.workspace.workspaceFolders;
      if (!folders || folders.length === 0) {
        return null;
      }
      workspaceFolder = folders[0];
    }

    return path.resolve(workspaceFolder.uri.fsPath, relativePath);
  }
}
