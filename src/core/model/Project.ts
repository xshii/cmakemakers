import { CMakeProject, ProjectInfo, GlobalConfig, Target, Metadata } from './types';
import { v4 as uuidv4 } from 'uuid';

export class Project {
  private data: CMakeProject;

  constructor(data?: Partial<CMakeProject>) {
    this.data = {
      project: data?.project || this.createDefaultProjectInfo(),
      global: data?.global || this.createDefaultGlobalConfig(),
      targets: data?.targets || [],
      dependencies: data?.dependencies || [],
      toolchain: data?.toolchain,
      metadata: data?.metadata || this.createDefaultMetadata()
    };
  }

  private createDefaultProjectInfo(): ProjectInfo {
    return {
      name: 'MyProject',
      version: '1.0.0',
      cmake_minimum_required: '3.15',
      languages: ['CXX']
    };
  }

  private createDefaultGlobalConfig(): GlobalConfig {
    return {
      cxx_standard: 17,
      cxx_standard_required: true,
      default_build_type: 'Release'
    };
  }

  private createDefaultMetadata(): Metadata {
    return {
      generated_by: 'CMakeMakers',
      version: '0.0.1',
      created_at: new Date().toISOString()
    };
  }

  // Getters
  getData(): CMakeProject {
    return this.data;
  }

  getTargets(): Target[] {
    return this.data.targets;
  }

  getTarget(id: string): Target | undefined {
    return this.data.targets.find(t => t.id === id);
  }

  getTargetByName(name: string): Target | undefined {
    return this.data.targets.find(t => t.name === name);
  }

  // Setters
  setProjectInfo(info: ProjectInfo): void {
    this.data.project = info;
    this.updateMetadata();
  }

  setGlobalConfig(config: GlobalConfig): void {
    this.data.global = config;
    this.updateMetadata();
  }

  // Target operations
  addTarget(target: Omit<Target, 'id'>): Target {
    const newTarget: Target = {
      ...target,
      id: uuidv4()
    };

    this.data.targets.push(newTarget);
    this.updateMetadata();
    return newTarget;
  }

  updateTarget(id: string, updates: Partial<Target>): boolean {
    const index = this.data.targets.findIndex(t => t.id === id);
    if (index === -1) {
      return false;
    }

    this.data.targets[index] = {
      ...this.data.targets[index],
      ...updates,
      id // Preserve ID
    };
    this.updateMetadata();
    return true;
  }

  deleteTarget(id: string): boolean {
    const index = this.data.targets.findIndex(t => t.id === id);
    if (index === -1) {
      return false;
    }

    this.data.targets.splice(index, 1);

    // Remove dependencies referencing this target
    this.data.targets.forEach(target => {
      if (target.dependencies) {
        const targetName = this.getTarget(id)?.name;
        target.dependencies = target.dependencies.filter(dep => dep !== targetName);
      }
    });

    this.updateMetadata();
    return true;
  }

  // Validation
  validateTargetName(name: string, excludeId?: string): boolean {
    return !this.data.targets.some(t => t.name === name && t.id !== excludeId);
  }

  // Dependency checking
  getDependentTargets(targetName: string): Target[] {
    return this.data.targets.filter(t =>
      t.dependencies?.includes(targetName) ||
      t.link_libraries?.some(lib => lib.type === 'internal' && lib.name === targetName)
    );
  }

  hasCircularDependency(targetId: string, newDependency: string): boolean {
    const target = this.getTarget(targetId);
    if (!target) {
      return false;
    }

    const visited = new Set<string>();
    const path: string[] = [];

    const hasCycle = (currentName: string): boolean => {
      if (path.includes(currentName)) {
        return true;
      }

      if (visited.has(currentName)) {
        return false;
      }

      visited.add(currentName);
      path.push(currentName);

      const currentTarget = this.getTargetByName(currentName);
      if (!currentTarget) {
        path.pop();
        return false;
      }

      const deps = currentTarget.dependencies || [];
      for (const dep of deps) {
        if (hasCycle(dep)) {
          return true;
        }
      }

      path.pop();
      return false;
    };

    // Temporarily add new dependency
    const originalDeps = target.dependencies || [];
    target.dependencies = [...originalDeps, newDependency];

    const result = hasCycle(target.name);

    // Restore
    target.dependencies = originalDeps;

    return result;
  }

  private updateMetadata(): void {
    this.data.metadata.last_modified = new Date().toISOString();
  }

  // JSON serialization
  toJSON(): CMakeProject {
    return this.data;
  }

  static fromJSON(data: CMakeProject): Project {
    return new Project(data);
  }
}
