import * as yaml from 'js-yaml';
import { CMakeProject } from '../model/types';

export class YAMLParser {
  /**
   * Parse YAML content into CMakeProject
   */
  static parse(content: string): CMakeProject {
    try {
      const data = yaml.load(content) as any;

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid YAML format: expected object');
      }

      // Validate required fields
      if (!data.project || !data.project.name) {
        throw new Error('Missing required field: project.name');
      }

      // Convert to CMakeProject with defaults
      const project: CMakeProject = {
        project: {
          name: data.project.name,
          version: data.project.version || '1.0.0',
          cmake_minimum_required: data.project.cmake_minimum_required || '3.15',
          languages: data.project.languages || ['CXX'],
          description: data.project.description,
          homepage_url: data.project.homepage_url,
        },
        global: data.global || {
          cxx_standard: 17,
          cxx_standard_required: true,
          default_build_type: 'Release',
        },
        targets: data.targets || [],
        dependencies: data.dependencies,
        toolchain: data.toolchain,
        metadata: data.metadata || {
          generated_by: 'CMakeMakers',
          version: '0.0.1',
          created_at: new Date().toISOString(),
        },
      };

      // Ensure all targets have IDs
      project.targets = project.targets.map((target, index) => ({
        ...target,
        id: target.id || `target-${index}`,
        sources: target.sources || [],
      }));

      return project;
    } catch (error) {
      if (error instanceof yaml.YAMLException) {
        throw new Error(`YAML parsing error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Validate YAML content without full parsing
   */
  static validate(content: string): { valid: boolean; error?: string } {
    try {
      this.parse(content);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
