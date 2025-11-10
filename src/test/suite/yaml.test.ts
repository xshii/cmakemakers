import * as assert from 'assert';
import { YAMLSerializer } from '../../core/generator/YAMLSerializer';
import { CMakeProject } from '../../core/model/types';

suite('YAML Serializer Test Suite', () => {
  const serializer = new YAMLSerializer();

  const sampleProject: CMakeProject = {
    project: {
      name: 'TestProject',
      version: '1.0.0',
      cmake_minimum_required: '3.15',
      languages: ['CXX']
    },
    global: {
      cxx_standard: 17,
      cxx_standard_required: true
    },
    targets: [
      {
        id: 'test-id-1',
        name: 'test_app',
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

  test('Serialize project to YAML', () => {
    const yaml = serializer.serialize(sampleProject);

    assert.ok(yaml.includes('TestProject'));
    assert.ok(yaml.includes('test_app'));
    assert.ok(yaml.includes('src/main.cpp'));
  });

  test('Deserialize YAML to project', () => {
    const yaml = serializer.serialize(sampleProject);
    const project = serializer.deserialize(yaml);

    assert.strictEqual(project.project.name, 'TestProject');
    assert.strictEqual(project.targets.length, 1);
    assert.strictEqual(project.targets[0].name, 'test_app');
  });

  test('Round-trip serialization', () => {
    const yaml1 = serializer.serialize(sampleProject);
    const project = serializer.deserialize(yaml1);
    const yaml2 = serializer.serialize(project);

    const project1 = serializer.deserialize(yaml1);
    const project2 = serializer.deserialize(yaml2);

    assert.strictEqual(project1.project.name, project2.project.name);
    assert.strictEqual(project1.targets.length, project2.targets.length);
  });

  test('Handle invalid YAML', () => {
    assert.throws(() => {
      serializer.deserialize('invalid: yaml: content:');
    });
  });

  test('Handle missing required fields', () => {
    const invalidYAML = `
global:
  cxx_standard: 17
targets: []
`;

    assert.throws(() => {
      serializer.deserialize(invalidYAML);
    }, /Missing required field/);
  });
});
