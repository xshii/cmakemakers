import * as yaml from 'js-yaml';
import { CMakeProject } from '../model/types';

export class YAMLSerializer {
  /**
   * Serialize CMakeProject to YAML string
   */
  serialize(project: CMakeProject): string {
    // Create a clean object without undefined values
    const cleanProject = this.cleanObject(project);

    return yaml.dump(cleanProject, {
      indent: 2,
      lineWidth: 100,
      sortKeys: false,
      noRefs: true
    });
  }

  /**
   * Deserialize YAML string to CMakeProject
   */
  deserialize(yamlContent: string): CMakeProject {
    const data = yaml.load(yamlContent) as any;

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid YAML content');
    }

    // Validate required fields
    if (!data.project || !data.project.name) {
      throw new Error('Missing required field: project.name');
    }

    // Convert to CMakeProject (with validation)
    const project: CMakeProject = {
      project: data.project,
      global: data.global || {},
      targets: data.targets || [],
      dependencies: data.dependencies || [],
      toolchain: data.toolchain,
      metadata: data.metadata || {
        generated_by: 'CMakeMakers',
        version: '0.0.1'
      }
    };

    return project;
  }

  /**
   * Remove undefined and null values from object recursively
   */
  private cleanObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanObject(item)).filter(item => item !== undefined);
    }

    if (obj !== null && typeof obj === 'object') {
      const cleaned: any = {};
      for (const key in obj) {
        const value = obj[key];
        if (value !== undefined && value !== null) {
          cleaned[key] = this.cleanObject(value);
        }
      }
      return cleaned;
    }

    return obj;
  }
}
