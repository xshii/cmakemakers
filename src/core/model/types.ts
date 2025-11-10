// Core type definitions for CMakeMakers

export type Language = 'C' | 'CXX' | 'CUDA' | 'Fortran' | 'ASM';
export type BuildType = 'Debug' | 'Release' | 'RelWithDebInfo' | 'MinSizeRel';
export type Scope = 'PUBLIC' | 'PRIVATE' | 'INTERFACE';
export type TargetType =
  | 'executable'
  | 'static_library'
  | 'shared_library'
  | 'module_library'
  | 'interface_library'
  | 'object_library';

export interface ProjectInfo {
  name: string;
  version: string;
  cmake_minimum_required: string;
  languages: Language[];
  description?: string;
  homepage_url?: string;
}

export interface Variable {
  name: string;
  value: string;
  cache?: boolean;
  type?: 'STRING' | 'BOOL' | 'PATH' | 'FILEPATH';
  description?: string;
}

export interface Option {
  name: string;
  value: boolean;
  description?: string;
}

export interface GlobalConfig {
  cxx_standard?: number;
  cxx_standard_required?: boolean;
  cxx_extensions?: boolean;
  default_build_type?: BuildType;
  variables?: Variable[];
  options?: Option[];
}

export interface SourceEntry {
  type: 'file' | 'glob' | 'directory';
  path?: string;
  pattern?: string;
  directory?: string;
  recursive?: boolean;
  configure_depends?: boolean;
  exclude?: string[];
  extensions?: string[];
  exclude_folders?: string[];
  exclude_patterns?: string[];
}

export interface IncludeDirectory {
  path: string;
  scope: Scope;
}

export interface FindPackageConfig {
  package: string;
  version?: string;
  required?: boolean;
  components?: string[];
}

export interface LinkLibrary {
  name: string;
  scope: Scope;
  type: 'system' | 'package' | 'internal' | 'fetch';
  find_package?: FindPackageConfig;
}

export interface CompileDefinition {
  name: string;
  value?: string;
  scope: Scope;
  condition?: string;
}

export interface CompileOption {
  option: string;
  scope: Scope;
  condition?: string;
}

export interface LinkOption {
  option: string;
  scope: Scope;
}

export interface TargetProperty {
  name: string;
  value: string;
}

export interface Target {
  id: string;
  name: string;
  type: TargetType;
  sources: SourceEntry[];
  include_directories?: IncludeDirectory[];
  link_libraries?: LinkLibrary[];
  compile_definitions?: CompileDefinition[];
  compile_options?: CompileOption[];
  link_options?: LinkOption[];
  properties?: TargetProperty[];
  dependencies?: string[];
}

export interface ToolchainConfig {
  preset?: string;
  file?: string;
  variables?: Record<string, string>;
}

export interface DependencyConfig {
  name: string;
  type: 'find_package' | 'fetch_content' | 'external_project';
  find_package?: FindPackageConfig;
  fetch_content?: {
    git_repository?: string;
    git_tag?: string;
    url?: string;
    url_hash?: string;
  };
}

export interface Metadata {
  generated_by: string;
  version: string;
  created_at?: string;
  last_modified?: string;
}

export interface CMakeProject {
  project: ProjectInfo;
  global: GlobalConfig;
  targets: Target[];
  dependencies?: DependencyConfig[];
  toolchain?: ToolchainConfig;
  metadata: Metadata;
}
