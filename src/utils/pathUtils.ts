import * as path from 'path';
import { CMakeProject } from '../core/model/types';

/**
 * Find the common parent directory of all source files in the project.
 *
 * Strategy:
 * - Extract all source file paths from all targets
 * - Find the deepest common parent directory
 * - Fall back to project root if no common subdirectory exists
 *
 * @param projectData The parsed CMake project configuration
 * @param projectRoot The root directory of the project
 * @returns The optimal directory path for CMakeLists.txt
 */
export function findCommonParentDirectory(projectData: CMakeProject, projectRoot: string): string {
  const allSourcePaths: string[] = [];

  // Extract all source directory paths from all targets
  if (projectData.targets && Array.isArray(projectData.targets)) {
    for (const target of projectData.targets) {
      if (target.sources && Array.isArray(target.sources)) {
        for (const source of target.sources) {
          let sourceDir: string;

          if (source.type === 'file' && source.path) {
            // For file sources, get the directory containing the file
            const absolutePath = path.isAbsolute(source.path)
              ? source.path
              : path.join(projectRoot, source.path);
            sourceDir = path.dirname(absolutePath);
          } else if (source.type === 'glob' && source.pattern) {
            // For glob patterns, extract the base directory
            const pattern = source.pattern;
            // Remove glob wildcards to get base directory
            let baseDir = pattern.split('**')[0].split('*')[0];
            // Remove trailing slash
            baseDir = baseDir.replace(/[\/\\]+$/, '');
            // If empty after removing wildcards, use current directory
            if (!baseDir) {
              baseDir = '.';
            }
            sourceDir = path.isAbsolute(baseDir)
              ? baseDir
              : path.join(projectRoot, baseDir);
          } else if (source.type === 'directory' && source.directory) {
            // For directory sources, use the directory directly
            sourceDir = path.isAbsolute(source.directory)
              ? source.directory
              : path.join(projectRoot, source.directory);
          } else {
            continue;
          }

          allSourcePaths.push(sourceDir);
        }
      }
    }
  }

  // If no source files found, return project root
  if (allSourcePaths.length === 0) {
    return projectRoot;
  }

  // Find common parent directory
  // Start with the first directory
  let commonDir = allSourcePaths[0];

  // Iteratively find common parent
  for (const sourceDir of allSourcePaths.slice(1)) {
    commonDir = findCommonPath(commonDir, sourceDir);
  }

  // Ensure commonDir is within projectRoot
  if (!commonDir.startsWith(projectRoot)) {
    return projectRoot;
  }

  return commonDir;
}

/**
 * Find the common path between two directory paths.
 *
 * @param path1 First directory path
 * @param path2 Second directory path
 * @returns The deepest common parent directory
 */
export function findCommonPath(path1: string, path2: string): string {
  const parts1 = path1.split(path.sep);
  const parts2 = path2.split(path.sep);

  const commonParts: string[] = [];
  const minLength = Math.min(parts1.length, parts2.length);

  for (let i = 0; i < minLength; i++) {
    if (parts1[i] === parts2[i]) {
      commonParts.push(parts1[i]);
    } else {
      break;
    }
  }

  // If no common parts, return root
  if (commonParts.length === 0) {
    return path.sep;
  }

  return commonParts.join(path.sep);
}
