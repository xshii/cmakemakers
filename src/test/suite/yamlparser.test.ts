import * as assert from 'assert';
import { YAMLParser } from '../../core/parser/YAMLParser';

suite('YAML Parser Test Suite', () => {
  const validYAML = `project:
  name: TestProject
  version: 1.0.0
  cmake_minimum_required: "3.15"
  languages:
    - CXX

global:
  cxx_standard: 17
  cxx_standard_required: true
  default_build_type: Release

targets:
  - id: test-1
    name: my_app
    type: executable
    sources:
      - type: file
        path: src/main.cpp

metadata:
  generated_by: CMakeMakers
  version: 0.0.1
`;

  test('Parse valid YAML config', () => {
    const project = YAMLParser.parse(validYAML);

    assert.strictEqual(project.project.name, 'TestProject');
    assert.strictEqual(project.project.version, '1.0.0');
    assert.strictEqual(project.project.cmake_minimum_required, '3.15');
    assert.deepStrictEqual(project.project.languages, ['CXX']);
  });

  test('Parse global configuration', () => {
    const project = YAMLParser.parse(validYAML);

    assert.strictEqual(project.global.cxx_standard, 17);
    assert.strictEqual(project.global.cxx_standard_required, true);
    assert.strictEqual(project.global.default_build_type, 'Release');
  });

  test('Parse targets', () => {
    const project = YAMLParser.parse(validYAML);

    assert.strictEqual(project.targets.length, 1);
    assert.strictEqual(project.targets[0].name, 'my_app');
    assert.strictEqual(project.targets[0].type, 'executable');
    assert.strictEqual(project.targets[0].sources.length, 1);
  });

  test('Parse metadata', () => {
    const project = YAMLParser.parse(validYAML);

    assert.strictEqual(project.metadata.generated_by, 'CMakeMakers');
    assert.strictEqual(project.metadata.version, '0.0.1');
  });

  test('Handle minimal config with defaults', () => {
    const minimalYAML = `project:
  name: MinimalProject
`;

    const project = YAMLParser.parse(minimalYAML);

    assert.strictEqual(project.project.name, 'MinimalProject');
    assert.strictEqual(project.project.version, '1.0.0'); // default
    assert.strictEqual(project.project.cmake_minimum_required, '3.15'); // default
    assert.deepStrictEqual(project.project.languages, ['CXX']); // default
    assert.strictEqual(project.global.cxx_standard, 17); // default
    assert.strictEqual(project.targets.length, 0);
  });

  test('Auto-generate target IDs if missing', () => {
    const yamlWithoutIds = `project:
  name: TestProject

targets:
  - name: app1
    type: executable
    sources: []
  - name: app2
    type: executable
    sources: []
`;

    const project = YAMLParser.parse(yamlWithoutIds);

    assert.strictEqual(project.targets.length, 2);
    assert.ok(project.targets[0].id); // ID should be generated
    assert.ok(project.targets[1].id);
    assert.notStrictEqual(project.targets[0].id, project.targets[1].id);
  });

  test('Throw error on invalid YAML syntax', () => {
    const invalidYAML = `project:
  name: Test
  invalid: yaml: syntax: here
`;

    assert.throws(() => {
      YAMLParser.parse(invalidYAML);
    }, /YAML parsing error/);
  });

  test('Throw error on missing required field', () => {
    const noNameYAML = `project:
  version: 1.0.0
targets: []
`;

    assert.throws(() => {
      YAMLParser.parse(noNameYAML);
    }, /Missing required field: project.name/);
  });

  test('Throw error on non-object YAML', () => {
    const invalidYAML = `"just a string"`;

    assert.throws(() => {
      YAMLParser.parse(invalidYAML);
    }, /Invalid YAML format: expected object/);
  });

  test('Validate returns success for valid YAML', () => {
    const result = YAMLParser.validate(validYAML);

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.error, undefined);
  });

  test('Validate returns error for invalid YAML', () => {
    const invalidYAML = `invalid: yaml: syntax`;

    const result = YAMLParser.validate(invalidYAML);

    assert.strictEqual(result.valid, false);
    assert.ok(result.error);
  });

  test('Validate returns error for missing required fields', () => {
    const noNameYAML = `global:
  cxx_standard: 17
`;

    const result = YAMLParser.validate(noNameYAML);

    assert.strictEqual(result.valid, false);
    assert.ok(result.error?.includes('Missing required field'));
  });

  test('Parse config with optional fields', () => {
    const yamlWithOptionals = `project:
  name: TestProject
  version: 2.0.0
  cmake_minimum_required: "3.20"
  languages:
    - C
    - CXX
  description: "A test project"
  homepage_url: "https://example.com"

global:
  cxx_standard: 20
  cxx_standard_required: true
  cxx_extensions: false
  default_build_type: Debug

targets: []

toolchain:
  preset: native
  file: toolchain.cmake

metadata:
  generated_by: CMakeMakers
  version: 0.0.1
`;

    const project = YAMLParser.parse(yamlWithOptionals);

    assert.strictEqual(project.project.description, 'A test project');
    assert.strictEqual(project.project.homepage_url, 'https://example.com');
    assert.strictEqual(project.global.cxx_extensions, false);
    assert.strictEqual(project.toolchain?.preset, 'native');
    assert.strictEqual(project.toolchain?.file, 'toolchain.cmake');
  });
});
