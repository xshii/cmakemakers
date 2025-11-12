import * as assert from 'assert';
import * as path from 'path';
import { findCommonParentDirectory, findCommonPath } from '../../utils/pathUtils';
import { CMakeProject } from '../../core/model/types';

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

  suite('findCommonParentDirectory', () => {
    test('Empty project returns project root', () => {
      const project: CMakeProject = {
        project: {
          name: 'TestProject',
          version: '1.0.0',
          cmake_minimum_required: '3.15',
          languages: ['CXX']
        },
        global: {},
        targets: [],
        metadata: {
          generated_by: 'CMakeMakers',
          version: '0.0.1'
        }
      };

      const result = findCommonParentDirectory(project, projectRoot);
      assert.strictEqual(result, projectRoot);
    });

    test('Single file source', () => {
      const project: CMakeProject = {
        project: {
          name: 'TestProject',
          version: '1.0.0',
          cmake_minimum_required: '3.15',
          languages: ['CXX']
        },
        global: {},
        targets: [
          {
            id: '1',
            name: 'app',
            type: 'executable',
            sources: [
              { type: 'file', path: 'src/main.cpp' }
            ]
          }
        ],
        metadata: {
          generated_by: 'CMakeMakers',
          version: '0.0.1'
        }
      };

      const result = findCommonParentDirectory(project, projectRoot);
      assert.strictEqual(result, p(projectRoot, 'src'));
    });

    test('Multiple files in same directory', () => {
      const project: CMakeProject = {
        project: {
          name: 'TestProject',
          version: '1.0.0',
          cmake_minimum_required: '3.15',
          languages: ['CXX']
        },
        global: {},
        targets: [
          {
            id: '1',
            name: 'app',
            type: 'executable',
            sources: [
              { type: 'file', path: 'src/main.cpp' },
              { type: 'file', path: 'src/app.cpp' },
              { type: 'file', path: 'src/utils.cpp' }
            ]
          }
        ],
        metadata: {
          generated_by: 'CMakeMakers',
          version: '0.0.1'
        }
      };

      const result = findCommonParentDirectory(project, projectRoot);
      assert.strictEqual(result, p(projectRoot, 'src'));
    });

    test('Files in different subdirectories - common parent', () => {
      const project: CMakeProject = {
        project: {
          name: 'TestProject',
          version: '1.0.0',
          cmake_minimum_required: '3.15',
          languages: ['CXX']
        },
        global: {},
        targets: [
          {
            id: '1',
            name: 'app',
            type: 'executable',
            sources: [
              { type: 'file', path: 'src/core/main.cpp' },
              { type: 'file', path: 'src/utils/helper.cpp' }
            ]
          }
        ],
        metadata: {
          generated_by: 'CMakeMakers',
          version: '0.0.1'
        }
      };

      const result = findCommonParentDirectory(project, projectRoot);
      assert.strictEqual(result, p(projectRoot, 'src'));
    });

    test('Files in completely different directories - project root', () => {
      const project: CMakeProject = {
        project: {
          name: 'TestProject',
          version: '1.0.0',
          cmake_minimum_required: '3.15',
          languages: ['CXX']
        },
        global: {},
        targets: [
          {
            id: '1',
            name: 'app',
            type: 'executable',
            sources: [
              { type: 'file', path: 'src/main.cpp' },
              { type: 'file', path: 'lib/core.cpp' },
              { type: 'file', path: 'tools/cli.cpp' }
            ]
          }
        ],
        metadata: {
          generated_by: 'CMakeMakers',
          version: '0.0.1'
        }
      };

      const result = findCommonParentDirectory(project, projectRoot);
      assert.strictEqual(result, projectRoot);
    });

    test('Glob pattern source', () => {
      const project: CMakeProject = {
        project: {
          name: 'TestProject',
          version: '1.0.0',
          cmake_minimum_required: '3.15',
          languages: ['CXX']
        },
        global: {},
        targets: [
          {
            id: '1',
            name: 'app',
            type: 'executable',
            sources: [
              {
                type: 'glob',
                pattern: 'src/core/**/*.cpp',
                recursive: true
              }
            ]
          }
        ],
        metadata: {
          generated_by: 'CMakeMakers',
          version: '0.0.1'
        }
      };

      const result = findCommonParentDirectory(project, projectRoot);
      assert.strictEqual(result, p(projectRoot, 'src', 'core'));
    });

    test('Multiple glob patterns in different directories', () => {
      const project: CMakeProject = {
        project: {
          name: 'TestProject',
          version: '1.0.0',
          cmake_minimum_required: '3.15',
          languages: ['CXX']
        },
        global: {},
        targets: [
          {
            id: '1',
            name: 'app',
            type: 'executable',
            sources: [
              {
                type: 'glob',
                pattern: 'src/core/**/*.cpp',
                recursive: true
              },
              {
                type: 'glob',
                pattern: 'src/utils/*.cpp',
                recursive: false
              }
            ]
          }
        ],
        metadata: {
          generated_by: 'CMakeMakers',
          version: '0.0.1'
        }
      };

      const result = findCommonParentDirectory(project, projectRoot);
      assert.strictEqual(result, p(projectRoot, 'src'));
    });

    test('Directory source type', () => {
      const project: CMakeProject = {
        project: {
          name: 'TestProject',
          version: '1.0.0',
          cmake_minimum_required: '3.15',
          languages: ['CXX']
        },
        global: {},
        targets: [
          {
            id: '1',
            name: 'app',
            type: 'executable',
            sources: [
              {
                type: 'directory',
                directory: 'src/impl',
                extensions: ['.cpp']
              }
            ]
          }
        ],
        metadata: {
          generated_by: 'CMakeMakers',
          version: '0.0.1'
        }
      };

      const result = findCommonParentDirectory(project, projectRoot);
      assert.strictEqual(result, p(projectRoot, 'src', 'impl'));
    });

    test('Multiple targets with different source locations', () => {
      const project: CMakeProject = {
        project: {
          name: 'TestProject',
          version: '1.0.0',
          cmake_minimum_required: '3.15',
          languages: ['CXX']
        },
        global: {},
        targets: [
          {
            id: '1',
            name: 'core',
            type: 'static_library',
            sources: [
              { type: 'file', path: 'src/core/core.cpp' }
            ]
          },
          {
            id: '2',
            name: 'app',
            type: 'executable',
            sources: [
              { type: 'file', path: 'src/main.cpp' }
            ]
          }
        ],
        metadata: {
          generated_by: 'CMakeMakers',
          version: '0.0.1'
        }
      };

      const result = findCommonParentDirectory(project, projectRoot);
      assert.strictEqual(result, p(projectRoot, 'src'));
    });

    test('Multiple targets across different top-level directories', () => {
      const project: CMakeProject = {
        project: {
          name: 'TestProject',
          version: '1.0.0',
          cmake_minimum_required: '3.15',
          languages: ['CXX']
        },
        global: {},
        targets: [
          {
            id: '1',
            name: 'main_app',
            type: 'executable',
            sources: [
              { type: 'file', path: 'src/main.cpp' }
            ]
          },
          {
            id: '2',
            name: 'cli_tool',
            type: 'executable',
            sources: [
              { type: 'file', path: 'tools/cli.cpp' }
            ]
          },
          {
            id: '3',
            name: 'tests',
            type: 'executable',
            sources: [
              { type: 'file', path: 'tests/test_main.cpp' }
            ]
          }
        ],
        metadata: {
          generated_by: 'CMakeMakers',
          version: '0.0.1'
        }
      };

      const result = findCommonParentDirectory(project, projectRoot);
      assert.strictEqual(result, projectRoot);
    });

    test('Mixed source types - files and globs', () => {
      const project: CMakeProject = {
        project: {
          name: 'TestProject',
          version: '1.0.0',
          cmake_minimum_required: '3.15',
          languages: ['CXX']
        },
        global: {},
        targets: [
          {
            id: '1',
            name: 'app',
            type: 'executable',
            sources: [
              { type: 'file', path: 'src/main.cpp' },
              {
                type: 'glob',
                pattern: 'src/impl/*.cpp',
                recursive: false
              }
            ]
          }
        ],
        metadata: {
          generated_by: 'CMakeMakers',
          version: '0.0.1'
        }
      };

      const result = findCommonParentDirectory(project, projectRoot);
      assert.strictEqual(result, p(projectRoot, 'src'));
    });

    test('Deep nested structure with common ancestor', () => {
      const project: CMakeProject = {
        project: {
          name: 'TestProject',
          version: '1.0.0',
          cmake_minimum_required: '3.15',
          languages: ['CXX']
        },
        global: {},
        targets: [
          {
            id: '1',
            name: 'app',
            type: 'executable',
            sources: [
              { type: 'file', path: 'modules/foo/impl/a.cpp' },
              { type: 'file', path: 'modules/foo/impl/b.cpp' },
              { type: 'file', path: 'modules/foo/impl/sub/c.cpp' }
            ]
          }
        ],
        metadata: {
          generated_by: 'CMakeMakers',
          version: '0.0.1'
        }
      };

      const result = findCommonParentDirectory(project, projectRoot);
      assert.strictEqual(result, p(projectRoot, 'modules', 'foo', 'impl'));
    });

    test('Root-level source file', () => {
      const project: CMakeProject = {
        project: {
          name: 'TestProject',
          version: '1.0.0',
          cmake_minimum_required: '3.15',
          languages: ['CXX']
        },
        global: {},
        targets: [
          {
            id: '1',
            name: 'app',
            type: 'executable',
            sources: [
              { type: 'file', path: 'main.cpp' }
            ]
          }
        ],
        metadata: {
          generated_by: 'CMakeMakers',
          version: '0.0.1'
        }
      };

      const result = findCommonParentDirectory(project, projectRoot);
      assert.strictEqual(result, projectRoot);
    });

    test('Glob pattern with wildcards in middle', () => {
      const project: CMakeProject = {
        project: {
          name: 'TestProject',
          version: '1.0.0',
          cmake_minimum_required: '3.15',
          languages: ['CXX']
        },
        global: {},
        targets: [
          {
            id: '1',
            name: 'app',
            type: 'executable',
            sources: [
              {
                type: 'glob',
                pattern: 'src/*.cpp',
                recursive: false
              }
            ]
          }
        ],
        metadata: {
          generated_by: 'CMakeMakers',
          version: '0.0.1'
        }
      };

      const result = findCommonParentDirectory(project, projectRoot);
      assert.strictEqual(result, p(projectRoot, 'src'));
    });
  });
});
