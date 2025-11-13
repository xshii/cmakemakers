import * as assert from 'assert';
import * as path from 'path';
import {
  findCommonPath,
  findCommonParentForTarget,
  findCommonParentDirectory,
  groupTargetsByDirectory,
  detectIntermediateDirectories,
  toCMakePath
} from '../../utils/pathUtils';
import { CMakeProject, Target } from '../../core/model/types';

suite('Path Utils Test Suite', () => {
  const isWindows = process.platform === 'win32';
  const projectRoot = isWindows ? 'C:\\project' : '/project';

  // Helper to create normalized paths
  function p(...parts: string[]): string {
    return path.join(...parts);
  }

  suite('findCommonPath', () => {
    test('Same path returns itself', () => {
      const path1 = p(projectRoot, 'src', 'core');
      const result = findCommonPath(path1, path1);
      assert.strictEqual(result, path1);
    });

    test('Common parent directory', () => {
      const path1 = p(projectRoot, 'src', 'core');
      const path2 = p(projectRoot, 'src', 'utils');
      const result = findCommonPath(path1, path2);
      assert.strictEqual(result, p(projectRoot, 'src'));
    });

    test('Different top-level directories', () => {
      const path1 = p(projectRoot, 'src', 'main.cpp');
      const path2 = p(projectRoot, 'lib', 'core.cpp');
      const result = findCommonPath(path1, path2);
      assert.strictEqual(result, projectRoot);
    });

    test('Nested subdirectories', () => {
      const path1 = p(projectRoot, 'modules', 'foo', 'impl', 'a.cpp');
      const path2 = p(projectRoot, 'modules', 'foo', 'impl', 'b.cpp');
      const result = findCommonPath(path1, path2);
      assert.strictEqual(result, p(projectRoot, 'modules', 'foo', 'impl'));
    });

    test('One path is parent of another', () => {
      const path1 = p(projectRoot, 'src');
      const path2 = p(projectRoot, 'src', 'core', 'impl');
      const result = findCommonPath(path1, path2);
      assert.strictEqual(result, p(projectRoot, 'src'));
    });
  });

  suite('findCommonParentForTarget', () => {
    test('Single file source', () => {
      const target: Target = {
        id: '1',
        name: 'app',
        type: 'executable',
        sources: [{ type: 'file', path: 'src/main.cpp' }]
      };

      const result = findCommonParentForTarget(target, projectRoot);
      assert.strictEqual(result, p(projectRoot, 'src'));
    });

    test('Multiple files in same directory', () => {
      const target: Target = {
        id: '1',
        name: 'app',
        type: 'executable',
        sources: [
          { type: 'file', path: 'src/main.cpp' },
          { type: 'file', path: 'src/app.cpp' },
          { type: 'file', path: 'src/utils.cpp' }
        ]
      };

      const result = findCommonParentForTarget(target, projectRoot);
      assert.strictEqual(result, p(projectRoot, 'src'));
    });

    test('Files in different subdirectories', () => {
      const target: Target = {
        id: '1',
        name: 'app',
        type: 'executable',
        sources: [
          { type: 'file', path: 'src/core/main.cpp' },
          { type: 'file', path: 'src/utils/helper.cpp' }
        ]
      };

      const result = findCommonParentForTarget(target, projectRoot);
      assert.strictEqual(result, p(projectRoot, 'src'));
    });

    test('Glob pattern source', () => {
      const target: Target = {
        id: '1',
        name: 'lib',
        type: 'static_library',
        sources: [{ type: 'glob', pattern: 'src/core/**/*.cpp', recursive: true }]
      };

      const result = findCommonParentForTarget(target, projectRoot);
      assert.strictEqual(result, p(projectRoot, 'src', 'core'));
    });

    test('Directory source', () => {
      const target: Target = {
        id: '1',
        name: 'lib',
        type: 'static_library',
        sources: [{ type: 'directory', directory: 'lib/utils', extensions: ['.cpp'] }]
      };

      const result = findCommonParentForTarget(target, projectRoot);
      assert.strictEqual(result, p(projectRoot, 'lib', 'utils'));
    });

    test('Mixed source types', () => {
      const target: Target = {
        id: '1',
        name: 'app',
        type: 'executable',
        sources: [
          { type: 'file', path: 'src/main.cpp' },
          { type: 'glob', pattern: 'src/**/*.cpp', recursive: true }
        ]
      };

      const result = findCommonParentForTarget(target, projectRoot);
      assert.strictEqual(result, p(projectRoot, 'src'));
    });

    test('Target with no sources returns project root', () => {
      const target: Target = {
        id: '1',
        name: 'app',
        type: 'executable',
        sources: []
      };

      const result = findCommonParentForTarget(target, projectRoot);
      assert.strictEqual(result, projectRoot);
    });
  });

  suite('groupTargetsByDirectory', () => {
    test('Single target', () => {
      const targets: Target[] = [
        {
          id: '1',
          name: 'app',
          type: 'executable',
          sources: [{ type: 'file', path: 'src/main.cpp' }]
        }
      ];

      const groups = groupTargetsByDirectory(targets, projectRoot);

      assert.strictEqual(groups.size, 1);
      assert.ok(groups.has(p(projectRoot, 'src')));
      assert.strictEqual(groups.get(p(projectRoot, 'src'))!.length, 1);
    });

    test('Multiple targets in same directory', () => {
      const targets: Target[] = [
        {
          id: '1',
          name: 'app1',
          type: 'executable',
          sources: [{ type: 'file', path: 'src/main1.cpp' }]
        },
        {
          id: '2',
          name: 'app2',
          type: 'executable',
          sources: [{ type: 'file', path: 'src/main2.cpp' }]
        }
      ];

      const groups = groupTargetsByDirectory(targets, projectRoot);

      assert.strictEqual(groups.size, 1);
      assert.ok(groups.has(p(projectRoot, 'src')));
      assert.strictEqual(groups.get(p(projectRoot, 'src'))!.length, 2);
    });

    test('Multiple targets in different directories', () => {
      const targets: Target[] = [
        {
          id: '1',
          name: 'app',
          type: 'executable',
          sources: [{ type: 'file', path: 'apps/tool/main.cpp' }]
        },
        {
          id: '2',
          name: 'core',
          type: 'static_library',
          sources: [{ type: 'glob', pattern: 'lib/core/**/*.cpp' }]
        },
        {
          id: '3',
          name: 'utils',
          type: 'shared_library',
          sources: [{ type: 'glob', pattern: 'lib/utils/**/*.cpp' }]
        }
      ];

      const groups = groupTargetsByDirectory(targets, projectRoot);

      assert.strictEqual(groups.size, 3);
      assert.ok(groups.has(p(projectRoot, 'apps', 'tool')));
      assert.ok(groups.has(p(projectRoot, 'lib', 'core')));
      assert.ok(groups.has(p(projectRoot, 'lib', 'utils')));
    });
  });

  suite('detectIntermediateDirectories', () => {
    test('No intermediate needed for 2 subdirectories', () => {
      const groups = new Map<string, Target[]>();
      groups.set(p(projectRoot, 'apps', 'tool1'), []);
      groups.set(p(projectRoot, 'apps', 'tool2'), []);

      const intermediates = detectIntermediateDirectories(groups, projectRoot);

      assert.strictEqual(intermediates.size, 0);
    });

    test('Intermediate needed for 3+ subdirectories', () => {
      const groups = new Map<string, Target[]>();
      groups.set(p(projectRoot, 'apps', 'tool1'), []);
      groups.set(p(projectRoot, 'apps', 'tool2'), []);
      groups.set(p(projectRoot, 'apps', 'tool3'), []);

      const intermediates = detectIntermediateDirectories(groups, projectRoot);

      assert.strictEqual(intermediates.size, 1);
      assert.ok(intermediates.has(p(projectRoot, 'apps')));

      const subdirs = intermediates.get(p(projectRoot, 'apps'))!;
      assert.strictEqual(subdirs.length, 3);
    });

    test('Multiple parent directories with 3+ children', () => {
      const groups = new Map<string, Target[]>();
      groups.set(p(projectRoot, 'apps', 'tool1'), []);
      groups.set(p(projectRoot, 'apps', 'tool2'), []);
      groups.set(p(projectRoot, 'apps', 'tool3'), []);
      groups.set(p(projectRoot, 'lib', 'core'), []);
      groups.set(p(projectRoot, 'lib', 'utils'), []);
      groups.set(p(projectRoot, 'lib', 'common'), []);

      const intermediates = detectIntermediateDirectories(groups, projectRoot);

      assert.strictEqual(intermediates.size, 2);
      assert.ok(intermediates.has(p(projectRoot, 'apps')));
      assert.ok(intermediates.has(p(projectRoot, 'lib')));
    });

    test('Skips project root', () => {
      const groups = new Map<string, Target[]>();
      groups.set(projectRoot, []);
      groups.set(p(projectRoot, 'src'), []);

      const intermediates = detectIntermediateDirectories(groups, projectRoot);

      assert.strictEqual(intermediates.size, 0);
    });
  });

  suite('toCMakePath', () => {
    test('Converts backslashes to forward slashes (Windows path)', () => {
      const result = toCMakePath('src\\core\\main.cpp');
      assert.strictEqual(result, 'src/core/main.cpp');
    });

    test('Preserves forward slashes (Unix path)', () => {
      const result = toCMakePath('src/core/main.cpp');
      assert.strictEqual(result, 'src/core/main.cpp');
    });

    test('Handles mixed slashes', () => {
      const result = toCMakePath('src\\core/impl\\main.cpp');
      assert.strictEqual(result, 'src/core/impl/main.cpp');
    });
  });

  suite('Integration: Complex Project Structure', () => {
    test('Real-world multi-module project', () => {
      const targets: Target[] = [
        {
          id: '1',
          name: 'core',
          type: 'static_library',
          sources: [{ type: 'glob', pattern: 'lib/core/**/*.cpp' }]
        },
        {
          id: '2',
          name: 'utils',
          type: 'shared_library',
          sources: [{ type: 'glob', pattern: 'lib/utils/**/*.cpp' }]
        },
        {
          id: '3',
          name: 'common',
          type: 'interface_library',
          sources: [{ type: 'glob', pattern: 'lib/common/**/*.cpp' }]
        },
        {
          id: '4',
          name: 'cli_tool',
          type: 'executable',
          sources: [{ type: 'file', path: 'apps/cli/main.cpp' }]
        },
        {
          id: '5',
          name: 'gui_tool',
          type: 'executable',
          sources: [{ type: 'file', path: 'apps/gui/main.cpp' }]
        },
        {
          id: '6',
          name: 'tests',
          type: 'executable',
          sources: [{ type: 'glob', pattern: 'tests/**/*_test.cpp' }]
        }
      ];

      // Group targets
      const groups = groupTargetsByDirectory(targets, projectRoot);
      assert.strictEqual(groups.size, 6);

      // Detect intermediates
      const intermediates = detectIntermediateDirectories(groups, projectRoot);

      // Should have 2 intermediate directories: lib/ and apps/
      assert.strictEqual(intermediates.size, 2);
      assert.ok(intermediates.has(p(projectRoot, 'lib')));
      assert.ok(intermediates.has(p(projectRoot, 'apps')));

      // lib/ should have 3 subdirectories
      const libSubdirs = intermediates.get(p(projectRoot, 'lib'))!;
      assert.strictEqual(libSubdirs.length, 3);

      // apps/ should have 2 subdirectories
      const appsSubdirs = intermediates.get(p(projectRoot, 'apps'))!;
      assert.strictEqual(appsSubdirs.length, 2);
    });

    test('Skip-directory scenario: src1/subsrc/app', () => {
      const target: Target = {
        id: '1',
        name: 'app',
        type: 'executable',
        sources: [{ type: 'glob', pattern: 'src1/subsrc/app/**/*.cpp' }]
      };

      const result = findCommonParentForTarget(target, projectRoot);

      // Should find the deepest directory with sources
      assert.strictEqual(result, p(projectRoot, 'src1', 'subsrc', 'app'));
    });
  });
});
