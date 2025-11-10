import * as assert from 'assert';
import { Project } from '../../core/model/Project';
import { Target } from '../../core/model/types';

suite('Project Model Test Suite', () => {
  test('Create default project', () => {
    const project = new Project();
    const data = project.getData();

    assert.strictEqual(data.project.name, 'MyProject');
    assert.strictEqual(data.project.version, '1.0.0');
    assert.strictEqual(data.targets.length, 0);
  });

  test('Add target', () => {
    const project = new Project();

    const target: Omit<Target, 'id'> = {
      name: 'my_app',
      type: 'executable',
      sources: [{ type: 'file', path: 'src/main.cpp' }]
    };

    const added = project.addTarget(target);

    assert.strictEqual(added.name, 'my_app');
    assert.ok(added.id);
    assert.strictEqual(project.getTargets().length, 1);
  });

  test('Update target', () => {
    const project = new Project();
    const target = project.addTarget({
      name: 'my_app',
      type: 'executable',
      sources: []
    });

    const success = project.updateTarget(target.id, {
      name: 'new_app'
    });

    assert.strictEqual(success, true);
    assert.strictEqual(project.getTarget(target.id)?.name, 'new_app');
  });

  test('Delete target', () => {
    const project = new Project();
    const target = project.addTarget({
      name: 'my_app',
      type: 'executable',
      sources: []
    });

    const success = project.deleteTarget(target.id);

    assert.strictEqual(success, true);
    assert.strictEqual(project.getTargets().length, 0);
  });

  test('Validate target name uniqueness', () => {
    const project = new Project();
    project.addTarget({
      name: 'my_app',
      type: 'executable',
      sources: []
    });

    const isValid = project.validateTargetName('my_app');
    assert.strictEqual(isValid, false);

    const isValid2 = project.validateTargetName('other_app');
    assert.strictEqual(isValid2, true);
  });

  test('Detect circular dependency', () => {
    const project = new Project();

    const app = project.addTarget({
      name: 'app',
      type: 'executable',
      sources: []
    });

    const lib1 = project.addTarget({
      name: 'lib1',
      type: 'static_library',
      sources: [],
      dependencies: ['app']
    });

    const hasCycle = project.hasCircularDependency(app.id, 'lib1');
    assert.strictEqual(hasCycle, true);
  });

  test('No circular dependency', () => {
    const project = new Project();

    const app = project.addTarget({
      name: 'app',
      type: 'executable',
      sources: []
    });

    const lib1 = project.addTarget({
      name: 'lib1',
      type: 'static_library',
      sources: []
    });

    const hasCycle = project.hasCircularDependency(app.id, 'lib1');
    assert.strictEqual(hasCycle, false);
  });
});
