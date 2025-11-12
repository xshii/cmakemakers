# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CMakeMakers is a VSCode extension that provides a visual editor for CMake configuration. It transforms CMake from command-line scripting to declarative YAML configuration with a table-based UI. The extension allows users to manage CMake targets, dependencies, and build configurations without memorizing CMake syntax.

**Core Workflow**: User edits via UI → Data Model (in-memory) → YAML config file (cmake/cmaker_config.yaml) → Generated CMakeLists.txt

## Quick Start for Users

The extension is now functional! To use it:

1. **Open VSCode** with a C++ project folder
2. **Create a new CMake project**:
   - `Ctrl/Cmd + Shift + P` → "CMakeMakers: New Project from Template"
   - Choose template (Console App / Static Library / Shared Library)
   - Enter project name
3. **Edit configuration**:
   - Open `cmake/cmaker_config.yaml` (created automatically)
   - Edit YAML directly (visual UI coming in next phase)
4. **Generate CMakeLists.txt**:
   - `Ctrl/Cmd + Shift + P` → "CMakeMakers: Generate CMakeLists.txt"
   - Or right-click `cmaker_config.yaml` → "CMakeMakers: Generate CMakeLists.txt"
5. **Build your project** using standard CMake commands

## Build & Development Commands

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch

# Lint code
npm run lint

# Run all tests
npm test

# Run a single test file
npm test -- --grep "Project"

# Full build pipeline (lint + compile + test)
npm run pretest

# Package extension as .vsix
npm run package
# Or use platform-specific scripts:
bash scripts/package.sh      # Linux/Mac
scripts\package.bat           # Windows
```

## Architecture

### Three-Layer Architecture

1. **Data Model Layer** (`src/core/model/`)
   - `Project.ts`: Central class managing CMakeProject data, target CRUD operations, validation, and circular dependency detection
   - `types.ts`: TypeScript definitions for all data structures (CMakeProject, Target, SourceEntry, etc.)
   - `Target.ts`, `Toolchain.ts`: Supporting model classes

2. **Serialization Layer** (`src/core/generator/`, `src/core/parser/`)
   - `YAMLSerializer.ts`: Bidirectional YAML ⇄ Data Model conversion
   - `CMakeGenerator.ts`: Generates CMakeLists.txt from Data Model
   - `YAMLParser.ts`, `CMakeParser.ts`: Parse existing config files

3. **Extension Layer** (`src/`)
   - `extension.ts`: VSCode extension entry point (currently minimal)
   - `providers/`: Custom editor providers and tree view providers
   - `services/`: File system operations, validation, source scanning, toolchain management

### Data Flow

**Edit Flow**: UI (React Webview) → postMessage → Extension Provider → Update Data Model → YAMLSerializer → Write YAML → CMakeGenerator → Write CMakeLists.txt

**File Watch Flow**: YAML file change → FileWatcher → YAMLParser → Update Data Model → postMessage → Update UI

## Key Implementation Details

### Source File Management

The plugin supports four ways to add source files to targets (defined in `SourceEntry` type):
- `type: 'file'`: Single file path
- `type: 'glob'`: Pattern matching with optional recursion and exclusions
- `type: 'directory'`: Directory scanning with extension filters
- Manual selection (planned)

Each SourceEntry can have exclusion patterns (`exclude`, `exclude_folders`, `exclude_patterns`).

### Target Dependencies & Circular Detection

The `Project.hasCircularDependency(targetId, newDependency)` method uses DFS to detect cycles before adding dependencies. It temporarily adds the proposed dependency, checks for cycles, then restores the original state. This prevents invalid dependency graphs.

### YAML Configuration Structure

Projects are stored as YAML in `cmake/cmaker_config.yaml`:
```yaml
project:
  name: MyProject
  version: 1.0.0
  cmake_minimum_required: "3.15"
  languages: [CXX]

global:
  cxx_standard: 17
  cxx_standard_required: true
  default_build_type: Release

targets:
  - name: my_app
    type: executable
    sources:
      - type: glob
        pattern: src/**/*.cpp
        recursive: true
    include_directories:
      - path: include
        scope: PUBLIC
    link_libraries:
      - name: pthread
        type: system
        scope: PRIVATE

metadata:
  generated_by: CMakeMakers
  version: 0.0.1
```

### Target Types

Supported CMake target types (see `TargetType` in types.ts):
- `executable`: Standard executables
- `static_library`: .a/.lib static libraries
- `shared_library`: .so/.dll shared libraries
- `module_library`: Loadable modules
- `interface_library`: Header-only libraries
- `object_library`: Compiled objects without linking

### Scope System

All include directories, link libraries, and compile options use scope qualifiers:
- `PUBLIC`: Interface requirements propagated to dependents
- `PRIVATE`: Internal requirements not propagated
- `INTERFACE`: Pure interface requirements (for interface libraries)

## Testing

The test suite (`src/test/suite/`) covers:
- `project.test.ts`: Target CRUD, validation, circular dependency detection
- `yaml.test.ts`: YAML serialization/deserialization, schema validation
- `cmake.test.ts`: CMakeLists.txt generation, formatting

All tests use Mocha and run via `npm test`.

## Current Development Status

**Implemented** (MVP - v0.0.1):
- ✅ Core data model (Project class)
- ✅ YAML serialization (bidirectional)
- ✅ CMakeLists.txt generation
- ✅ Target CRUD operations
- ✅ Circular dependency detection
- ✅ Comprehensive test suite (16 passing tests)
- ✅ Packaging scripts
- ✅ **VSCode extension activation and commands** (NEW)
- ✅ **Custom editor provider** (NEW)
- ✅ **File system watchers** (NEW)
- ✅ **Extension commands** (NEW):
  - `cmakemakers.openEditor` - Open config editor
  - `cmakemakers.generate` - Generate CMakeLists.txt
  - `cmakemakers.newProject` - Create project from template

**Not Yet Implemented**:
- React UI/Webview components (placeholder UI currently shown)
- Interactive visual editor
- CMakeLists.txt import/parsing

The project has completed Phase 0 (Data Layer) and Phase 1 (Extension Foundation). Next: Phase 2 (Webview UI).

## Project Templates

Located in `templates/` directory:
- `console-app.yaml`: Simple executable application
- `static-lib.yaml`: Static library project
- `shared-lib.yaml`: Shared library project

These serve as starting points for new projects and testing.

## Important Patterns

### Creating and Managing Targets

```typescript
const project = new Project();
const target = project.addTarget({
  name: 'my_app',
  type: 'executable',
  sources: [{ type: 'glob', pattern: 'src/**/*.cpp', recursive: true }],
  include_directories: [{ path: 'include', scope: 'PUBLIC' }],
  link_libraries: [{ name: 'pthread', scope: 'PRIVATE', type: 'system' }]
});
```

### Validating Before Adding Dependencies

```typescript
if (project.hasCircularDependency(targetId, dependencyName)) {
  throw new Error('Circular dependency detected');
}
```

### Serialization Roundtrip

```typescript
const serializer = new YAMLSerializer();
const yaml = serializer.serialize(project.getData());
const loaded = serializer.deserialize(yaml);
```

## Language & Localization

The project is bilingual:
- Primary documentation: Chinese (README.md, DESIGN.md, comments)
- Code: English (variables, functions, types, comments)
- User-facing strings: Currently Chinese, internationalization planned

When working with this codebase, maintain English for code and respect the existing documentation language choices.
