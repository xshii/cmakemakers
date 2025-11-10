import * as assert from 'assert';
import { CMakeGenerator } from '../../core/generator/CMakeGenerator';
import { CMakeProject } from '../../core/model/types';

suite('CMake Generator Test Suite', () => {
  const generator = new CMakeGenerator();

  test('Generate basic CMakeLists.txt', () => {
    const project: CMakeProject = {
      project: {
        name: 'MyProject',
        version: '1.0.0',
        cmake_minimum_required: '3.15',
        languages: ['CXX']
      },
      global: {
        cxx_standard: 17
      },
      targets: [],
      metadata: {
        generated_by: 'CMakeMakers',
        version: '0.0.1'
      }
    };

    const cmake = generator.generate(project);

    assert.ok(cmake.includes('cmake_minimum_required(VERSION 3.15)'));
    assert.ok(cmake.includes('project(MyProject VERSION 1.0.0 LANGUAGES CXX)'));
    assert.ok(cmake.includes('set(CMAKE_CXX_STANDARD 17)'));
  });

  test('Generate executable target', () => {
    const project: CMakeProject = {
      project: {
        name: 'MyProject',
        version: '1.0.0',
        cmake_minimum_required: '3.15',
        languages: ['CXX']
      },
      global: {},
      targets: [
        {
          id: '1',
          name: 'my_app',
          type: 'executable',
          sources: [
            { type: 'file', path: 'src/main.cpp' },
            { type: 'file', path: 'src/app.cpp' }
          ]
        }
      ],
      metadata: {
        generated_by: 'CMakeMakers',
        version: '0.0.1'
      }
    };

    const cmake = generator.generate(project);

    assert.ok(cmake.includes('add_executable(my_app'));
    assert.ok(cmake.includes('src/main.cpp'));
    assert.ok(cmake.includes('src/app.cpp'));
  });

  test('Generate target with includes and links', () => {
    const project: CMakeProject = {
      project: {
        name: 'MyProject',
        version: '1.0.0',
        cmake_minimum_required: '3.15',
        languages: ['CXX']
      },
      global: {},
      targets: [
        {
          id: '1',
          name: 'my_app',
          type: 'executable',
          sources: [{ type: 'file', path: 'src/main.cpp' }],
          include_directories: [
            { path: 'include', scope: 'PUBLIC' }
          ],
          link_libraries: [
            { name: 'pthread', scope: 'PRIVATE', type: 'system' }
          ]
        }
      ],
      metadata: {
        generated_by: 'CMakeMakers',
        version: '0.0.1'
      }
    };

    const cmake = generator.generate(project);

    assert.ok(cmake.includes('target_include_directories(my_app'));
    assert.ok(cmake.includes('PUBLIC'));
    assert.ok(cmake.includes('include'));
    assert.ok(cmake.includes('target_link_libraries(my_app'));
    assert.ok(cmake.includes('pthread'));
  });

  test('Generate glob sources', () => {
    const project: CMakeProject = {
      project: {
        name: 'MyProject',
        version: '1.0.0',
        cmake_minimum_required: '3.15',
        languages: ['CXX']
      },
      global: {},
      targets: [
        {
          id: '1',
          name: 'my_app',
          type: 'executable',
          sources: [
            {
              type: 'glob',
              pattern: 'src/**/*.cpp',
              recursive: true,
              configure_depends: true,
              exclude: ['**/*_test.cpp']
            }
          ]
        }
      ],
      metadata: {
        generated_by: 'CMakeMakers',
        version: '0.0.1'
      }
    };

    const cmake = generator.generate(project);

    assert.ok(cmake.includes('file(GLOB_RECURSE MY_APP_SOURCES CONFIGURE_DEPENDS'));
    assert.ok(cmake.includes('src/**/*.cpp'));
    assert.ok(cmake.includes('list(FILTER MY_APP_SOURCES EXCLUDE REGEX'));
    assert.ok(cmake.includes('**/*_test.cpp'));
  });
});
