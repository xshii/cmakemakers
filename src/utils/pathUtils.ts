import * as path from 'path';
import { CMakeProject, Target, SourceEntry } from '../core/model/types';

/**
 * Find the common parent directory of all source files in a single target.
 *
 * @param target The target to analyze
 * @param projectRoot The root directory of the project
 * @returns The optimal directory path for this target's CMakeLists.txt
 */
export function findCommonParentForTarget(target: Target, projectRoot: string): string {
  const sourcePaths: string[] = [];

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

      sourcePaths.push(sourceDir);
    }
  }

  // If no source files found, return project root
  if (sourcePaths.length === 0) {
    return projectRoot;
  }

  // Find common parent directory
  let commonDir = sourcePaths[0];

  // Iteratively find common parent
  for (const sourceDir of sourcePaths.slice(1)) {
    commonDir = findCommonPath(commonDir, sourceDir);
  }

  // Ensure commonDir is within projectRoot
  if (!commonDir.startsWith(projectRoot)) {
    return projectRoot;
  }

  return commonDir;
}

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

/**
 * Group targets by their optimal directory locations.
 * Each target is placed in the common parent directory of its source files.
 *
 * @param targets List of targets to group
 * @param projectRoot The root directory of the project
 * @returns Map of directory path to targets in that directory
 */
export function groupTargetsByDirectory(
  targets: Target[],
  projectRoot: string
): Map<string, Target[]> {
  const groups = new Map<string, Target[]>();

  for (const target of targets) {
    const dir = findCommonParentForTarget(target, projectRoot);

    if (!groups.has(dir)) {
      groups.set(dir, []);
    }
    groups.get(dir)!.push(target);
  }

  return groups;
}

/**
 * Information about a directory that needs an intermediate CMakeLists.txt
 */
interface IntermediateDirectory {
  path: string;
  subdirectories: string[];
}

/**
 * Detect intermediate directories that need CMakeLists.txt files.
 *
 * Rules:
 * - If a parent directory has 3+ child directories with targets, generate intermediate CMakeLists.txt
 * - If a parent directory has only 1 child, skip it (use direct path in main CMakeLists.txt)
 * - If a parent directory has 2 children, optional (currently skip for simplicity)
 *
 * @param targetGroups Map of directories to targets
 * @param projectRoot The root directory of the project
 * @returns Map of intermediate directory paths to their subdirectories
 */
export function detectIntermediateDirectories(
  targetGroups: Map<string, Target[]>,
  projectRoot: string
): Map<string, string[]> {
  const intermediates = new Map<string, string[]>();

  // Build a map of parent directories to child directories
  const parentToChildren = new Map<string, Set<string>>();

  for (const dir of targetGroups.keys()) {
    if (dir === projectRoot) {
      continue; // Skip root directory
    }

    const parentDir = path.dirname(dir);

    if (!parentToChildren.has(parentDir)) {
      parentToChildren.set(parentDir, new Set());
    }
    parentToChildren.get(parentDir)!.add(dir);
  }

  // Decide which parents need intermediate CMakeLists.txt
  for (const [parentDir, children] of parentToChildren) {
    const childArray = Array.from(children);

    // Rule: Generate intermediate file if 3+ subdirectories
    if (childArray.length >= 3) {
      intermediates.set(parentDir, childArray);
    }
    // For 1-2 subdirectories, skip intermediate file (direct reference from main)
  }

  return intermediates;
}

/**
 * Convert a path to CMake-compatible format (forward slashes).
 * CMake prefers forward slashes even on Windows.
 *
 * @param filePath The path to convert
 * @returns CMake-compatible path string
 */
export function toCMakePath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

/**
 * Get all unique parent directories from the root to a given directory.
 * Used to understand the directory hierarchy.
 *
 * @param dir The directory path
 * @param projectRoot The project root (stop at this level)
 * @returns Array of parent directories from root to dir
 */
export function getParentDirectories(dir: string, projectRoot: string): string[] {
  const parents: string[] = [];
  let current = dir;

  while (current !== projectRoot && current !== path.dirname(current)) {
    parents.push(current);
    current = path.dirname(current);
  }

  if (current === projectRoot) {
    parents.push(projectRoot);
  }

  return parents.reverse();
}
