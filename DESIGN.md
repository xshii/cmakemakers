# CMakeMakers 详细设计文档

本文档详细描述 CMakeMakers 插件的架构设计、功能模块和实现细节。

## 目录

- [设计理念](#设计理念)
- [核心架构](#核心架构)
- [数据模型](#数据模型)
- [功能模块详细设计](#功能模块详细设计)
- [UI/UX 设计](#uiux-设计)
- [实现细节](#实现细节)
- [性能考虑](#性能考虑)

---

## 设计理念

### 核心思想

**声明式配置 + 可视化编辑 + 自动生成**

```
用户意图 → 数据模型 → CMakeLists.txt
         ↓
    YAML 配置文件
```

### 设计原则

1. **零学习成本**: 可视化操作，不需要记忆 CMake 语法
2. **配置即代码**: YAML 配置文件版本控制友好
3. **双向同步**: YAML ⇄ CMakeLists.txt
4. **智能验证**: 实时检测错误和最佳实践
5. **渐进增强**: MVP 简单，后续逐步增强

---

## 核心架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    VSCode Extension Host                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────┐      ┌──────────────────────┐    │
│  │  Webview UI (React)  │◄────►│  Extension Provider  │    │
│  │  - ProjectSettings   │      │  - Commands          │    │
│  │  - TargetTable       │      │  - FileWatcher       │    │
│  │  - SourceManager     │      │  - Validation        │    │
│  │  - DependencyView    │      └──────────┬───────────┘    │
│  │  - ToolchainConfig   │                 │                │
│  └──────────────────────┘                 │                │
│           │                                │                │
│           │ postMessage                    │                │
│           ▼                                ▼                │
│  ┌──────────────────────┐      ┌──────────────────────┐    │
│  │   Message Handler    │◄────►│   Core Services      │    │
│  │  - UI State Sync     │      │  - FileSystemService │    │
│  └──────────────────────┘      │  - ValidationService │    │
│                                 │  - SourceScanner     │    │
│                                 └──────────┬───────────┘    │
│                                            │                │
│                                            ▼                │
│              ┌─────────────────────────────────────────┐   │
│              │         Data Model (In-Memory)          │   │
│              │  - CMakeProject                         │   │
│              │  - Target[]                             │   │
│              │  - Toolchain                            │   │
│              └─────────────────┬───────────────────────┘   │
│                                │                            │
│                    ┌───────────┴───────────┐               │
│                    │                       │               │
│                    ▼                       ▼               │
│         ┌──────────────────┐   ┌──────────────────┐       │
│         │  YAML Serializer │   │  CMake Generator │       │
│         │  - Parse YAML    │   │  - Generate      │       │
│         │  - Serialize     │   │  - Format        │       │
│         └────────┬─────────┘   └────────┬─────────┘       │
│                  │                      │                  │
│                  ▼                      ▼                  │
│       ┌──────────────────┐   ┌──────────────────┐         │
│       │ cmaker_config    │   │  CMakeLists.txt  │         │
│       │    .yaml         │   │                  │         │
│       └──────────────────┘   └──────────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 数据流

#### 用户编辑流程

```
1. 用户在 UI 中编辑
   ↓
2. React 组件更新本地状态
   ↓
3. postMessage 发送到 Extension
   ↓
4. Extension 更新 Data Model
   ↓
5. 验证配置
   ↓
6. 序列化为 YAML
   ↓
7. 写入 cmaker_config.yaml
   ↓
8. 触发 CMake Generator
   ↓
9. 生成 CMakeLists.txt
```

#### 文件变化流程

```
1. FileWatcher 检测到 YAML 文件变化
   ↓
2. 读取并解析 YAML
   ↓
3. 更新 Data Model
   ↓
4. postMessage 通知 Webview
   ↓
5. Webview 更新 UI
```

---

## 数据模型

### 核心类型定义

```typescript
// 项目配置
interface CMakeProject {
  project: ProjectInfo;
  global: GlobalConfig;
  targets: Target[];
  dependencies?: DependencyConfig[];
  toolchain?: ToolchainConfig;
  metadata: Metadata;
}

// 项目信息
interface ProjectInfo {
  name: string;
  version: string;
  cmake_minimum_required: string;
  languages: Language[];
  description?: string;
  homepage_url?: string;
}

type Language = 'C' | 'CXX' | 'CUDA' | 'Fortran' | 'ASM';

// 全局配置
interface GlobalConfig {
  cxx_standard?: number;
  cxx_standard_required?: boolean;
  cxx_extensions?: boolean;
  default_build_type?: BuildType;
  variables?: Variable[];
  options?: Option[];
}

type BuildType = 'Debug' | 'Release' | 'RelWithDebInfo' | 'MinSizeRel';

// Target 定义
interface Target {
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

type TargetType =
  | 'executable'
  | 'static_library'
  | 'shared_library'
  | 'module_library'
  | 'interface_library'
  | 'object_library';

// 源文件条目
interface SourceEntry {
  // 方式 1: 单个文件
  path?: string;
  type?: 'file';

  // 方式 2: Glob 模式
  pattern?: string;
  type?: 'glob';
  recursive?: boolean;
  configure_depends?: boolean;
  exclude?: string[];

  // 方式 3: 目录扫描
  directory?: string;
  type?: 'directory';
  extensions?: string[];
  exclude_folders?: string[];
  exclude_patterns?: string[];
}

// Include 目录
interface IncludeDirectory {
  path: string;
  scope: Scope;
}

type Scope = 'PUBLIC' | 'PRIVATE' | 'INTERFACE';

// 链接库
interface LinkLibrary {
  name: string;
  scope: Scope;
  type: 'system' | 'package' | 'internal' | 'fetch';
  find_package?: FindPackageConfig;
}

interface FindPackageConfig {
  package: string;
  version?: string;
  required?: boolean;
  components?: string[];
}

// 编译定义
interface CompileDefinition {
  name: string;
  value?: string;
  scope: Scope;
  condition?: string;
}

// 编译选项
interface CompileOption {
  option: string;
  scope: Scope;
  condition?: string;
}

// 工具链配置
interface ToolchainConfig {
  preset?: string;
  file?: string;
  variables?: Record<string, string>;
}

// 元数据
interface Metadata {
  generated_by: string;
  version: string;
  created_at?: string;
  last_modified?: string;
}
```

---

## 功能模块详细设计

### 1. Target 管理模块

#### 表格设计

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Targets                                              [+ Add Target]         │
├──────┬──────────────┬──────────────┬────────────────┬─────────────┬─────────┤
│ Type │ Name         │ Sources      │ Include Dirs   │ Link Libs   │ Actions │
├──────┼──────────────┼──────────────┼────────────────┼─────────────┼─────────┤
│ 📦   │ my_app       │ 3 files ✏️   │ 2 dirs ✏️      │ 2 libs ✏️   │ ✏️ 🗑️  │
│ 📚   │ mylib        │ 5 files ✏️   │ 1 dir ✏️       │ 1 lib ✏️    │ ✏️ 🗑️  │
└──────┴──────────────┴──────────────┴────────────────┴─────────────┴─────────┘
```

#### CRUD 操作

**创建 Target**:
```typescript
async function createTarget(config: {
  name: string;
  type: TargetType;
  applyRules?: boolean;
}): Promise<Target> {
  // 1. 验证名称唯一性
  validateUniqueName(config.name);

  // 2. 创建 Target 对象
  const target: Target = {
    id: generateId(),
    name: config.name,
    type: config.type,
    sources: [],
    include_directories: [],
    link_libraries: []
  };

  // 3. 应用目录规则（可选）
  if (config.applyRules) {
    applyDirectoryRules(target);
  }

  // 4. 添加到项目
  project.targets.push(target);

  // 5. 保存
  await saveProject();

  return target;
}
```

**删除 Target**:
```typescript
async function deleteTarget(targetId: string): Promise<void> {
  // 1. 检查是否被其他 Target 依赖
  const dependencies = findDependentTargets(targetId);

  if (dependencies.length > 0) {
    // 询问用户
    const choice = await showWarning(
      `Target is used by ${dependencies.length} other targets. Delete anyway?`
    );

    if (choice !== 'Yes') {
      return;
    }

    // 移除依赖关系
    removeDependencies(targetId);
  }

  // 2. 从项目中移除
  project.targets = project.targets.filter(t => t.id !== targetId);

  // 3. 保存
  await saveProject();
}
```

---

### 2. 源文件管理模块

#### 添加源文件对话框

```typescript
interface SourceAddConfig {
  mode: 'directory' | 'pattern' | 'name' | 'manual';

  directory?: {
    path: string;
    recursive: boolean;
  };

  patterns?: {
    include: string[];
    exclude: string[];
  };

  filters: {
    extensions: string[];
    excludeFolders: string[];
    excludePatterns: string[];
  };
}
```

#### 目录扫描实现

```typescript
class SourceFileScanner {
  async scanDirectory(config: SourceAddConfig): Promise<FilePreviewItem[]> {
    const basePath = resolve(config.directory.path);
    const files: FilePreviewItem[] = [];

    // 递归扫描
    await this.walkDirectory(basePath, config, files);

    // 应用过滤器
    return files.map(file => ({
      ...file,
      matched: this.isFileMatched(file, config),
      excluded: this.isFileExcluded(file, config)
    }));
  }

  private async walkDirectory(
    dirPath: string,
    config: SourceAddConfig,
    files: FilePreviewItem[]
  ): Promise<void> {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // 检查是否排除
        if (this.isFolderExcluded(entry.name, config)) {
          continue;
        }

        if (config.directory.recursive) {
          await this.walkDirectory(fullPath, config, files);
        }
      } else if (entry.isFile()) {
        files.push(await this.createFileItem(fullPath));
      }
    }
  }
}
```

---

### 3. 依赖管理模块

#### 依赖关系表格

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Target Dependencies                                [+ Add Dependency]      │
├────────────────┬────────────────────────────┬─────────────────────┬─────────┤
│ Target         │ Depends On                 │ Status              │ Actions │
├────────────────┼────────────────────────────┼─────────────────────┼─────────┤
│ my_app         │ mylib, utils               │ ✓ Valid             │ ✏️      │
│ mylib          │ shared                     │ ✓ Valid             │ ✏️      │
│ shared         │ (no dependencies)          │ ✓ Valid             │ ✏️      │
└────────────────┴────────────────────────────┴─────────────────────┴─────────┘
```

#### 循环依赖检测

```typescript
class DependencyValidator {
  detectCircularDependency(
    targetId: string,
    newDependency: string
  ): CircularDependencyResult {
    // 使用 DFS 检测环
    const visited = new Set<string>();
    const path: string[] = [];

    const hasCycle = (current: string): boolean => {
      if (path.includes(current)) {
        // 找到环
        const cycleStart = path.indexOf(current);
        return true;
      }

      if (visited.has(current)) {
        return false;
      }

      visited.add(current);
      path.push(current);

      const deps = this.getDependencies(current);
      for (const dep of deps) {
        if (hasCycle(dep)) {
          return true;
        }
      }

      path.pop();
      return false;
    };

    // 临时添加新依赖
    this.addTemporaryDependency(targetId, newDependency);
    const result = hasCycle(targetId);
    this.removeTemporaryDependency(targetId, newDependency);

    return {
      hasCycle: result,
      cyclePath: result ? path : undefined
    };
  }
}
```

---

### 4. 工具链管理模块

#### 预设工具链模板

```typescript
const TOOLCHAIN_PRESETS: Record<string, ToolchainConfig> = {
  'native': {
    preset: 'native',
    variables: {}
  },

  'arm-linux-gnu': {
    preset: 'arm-linux-gnu',
    variables: {
      CMAKE_SYSTEM_NAME: 'Linux',
      CMAKE_SYSTEM_PROCESSOR: 'arm',
      CMAKE_C_COMPILER: 'arm-linux-gnueabihf-gcc',
      CMAKE_CXX_COMPILER: 'arm-linux-gnueabihf-g++',
      CMAKE_FIND_ROOT_PATH: '/usr/arm-linux-gnueabihf'
    }
  },

  'arm-bare-metal': {
    preset: 'arm-bare-metal',
    variables: {
      CMAKE_SYSTEM_NAME: 'Generic',
      CMAKE_SYSTEM_PROCESSOR: 'arm',
      CMAKE_C_COMPILER: 'arm-none-eabi-gcc',
      CMAKE_CXX_COMPILER: 'arm-none-eabi-g++',
      CMAKE_EXE_LINKER_FLAGS: '-specs=nosys.specs'
    }
  },

  'riscv-gcc': {
    preset: 'riscv-gcc',
    variables: {
      CMAKE_SYSTEM_NAME: 'Generic',
      CMAKE_SYSTEM_PROCESSOR: 'riscv64',
      CMAKE_C_COMPILER: 'riscv64-unknown-elf-gcc',
      CMAKE_CXX_COMPILER: 'riscv64-unknown-elf-g++'
    }
  }
};
```

---

### 5. YAML 序列化模块

#### YAML → Data Model

```typescript
class YAMLParser {
  parse(yamlContent: string): CMakeProject {
    const raw = yaml.load(yamlContent);

    // 验证 schema
    this.validateSchema(raw);

    // 转换为 Data Model
    return {
      project: this.parseProject(raw.project),
      global: this.parseGlobal(raw.global),
      targets: raw.targets?.map(t => this.parseTarget(t)) || [],
      toolchain: this.parseToolchain(raw.toolchain),
      metadata: raw.metadata
    };
  }

  private parseTarget(raw: any): Target {
    return {
      id: raw.id || generateId(),
      name: raw.name,
      type: raw.type,
      sources: this.parseSources(raw.sources),
      include_directories: this.parseIncludeDirs(raw.include_directories),
      link_libraries: this.parseLinkLibs(raw.link_libraries),
      // ... 其他字段
    };
  }
}
```

#### Data Model → YAML

```typescript
class YAMLSerializer {
  serialize(project: CMakeProject): string {
    const obj = {
      project: this.serializeProject(project.project),
      global: this.serializeGlobal(project.global),
      targets: project.targets.map(t => this.serializeTarget(t)),
      toolchain: this.serializeToolchain(project.toolchain),
      metadata: {
        ...project.metadata,
        last_modified: new Date().toISOString()
      }
    };

    return yaml.dump(obj, {
      indent: 2,
      lineWidth: 100,
      sortKeys: false,
      noRefs: true
    });
  }
}
```

---

### 6. CMake 生成器模块

#### 生成 CMakeLists.txt

```typescript
class CMakeGenerator {
  generate(project: CMakeProject): string {
    const lines: string[] = [];

    // Header
    lines.push(this.generateHeader(project));

    // cmake_minimum_required
    lines.push(`cmake_minimum_required(VERSION ${project.project.cmake_minimum_required})`);
    lines.push('');

    // project()
    lines.push(this.generateProjectCommand(project));
    lines.push('');

    // 全局配置
    lines.push(...this.generateGlobalConfig(project.global));
    lines.push('');

    // find_package
    lines.push(...this.generateFindPackages(project));
    lines.push('');

    // Targets
    for (const target of project.targets) {
      lines.push(...this.generateTarget(target));
      lines.push('');
    }

    return lines.join('\n');
  }

  private generateTarget(target: Target): string[] {
    const lines: string[] = [];

    // add_executable / add_library
    lines.push(`# Target: ${target.name}`);

    if (target.type === 'executable') {
      lines.push(`add_executable(${target.name}`);
    } else if (target.type === 'static_library') {
      lines.push(`add_library(${target.name} STATIC`);
    } else if (target.type === 'shared_library') {
      lines.push(`add_library(${target.name} SHARED`);
    }

    // Sources
    for (const source of target.sources) {
      if (source.type === 'file') {
        lines.push(`    ${source.path}`);
      } else if (source.type === 'glob') {
        lines.push(`    # Generated by glob: ${source.pattern}`);
      }
    }

    lines.push(')');
    lines.push('');

    // target_include_directories
    if (target.include_directories && target.include_directories.length > 0) {
      lines.push(`target_include_directories(${target.name}`);

      for (const scope of ['PUBLIC', 'PRIVATE', 'INTERFACE']) {
        const dirs = target.include_directories.filter(d => d.scope === scope);
        if (dirs.length > 0) {
          lines.push(`    ${scope}`);
          dirs.forEach(d => lines.push(`        ${d.path}`));
        }
      }

      lines.push(')');
      lines.push('');
    }

    // target_link_libraries
    if (target.link_libraries && target.link_libraries.length > 0) {
      lines.push(`target_link_libraries(${target.name}`);

      for (const scope of ['PUBLIC', 'PRIVATE', 'INTERFACE']) {
        const libs = target.link_libraries.filter(l => l.scope === scope);
        if (libs.length > 0) {
          lines.push(`    ${scope}`);
          libs.forEach(l => lines.push(`        ${l.name}`));
        }
      }

      lines.push(')');
    }

    return lines;
  }
}
```

---

## UI/UX 设计

### Tab 布局

```
Tab 1: 📋 Project Settings
  - 项目名称、版本
  - CMake 版本
  - 语言选择
  - C++ 标准
  - 全局变量和选项

Tab 2: 🎯 Targets
  - Target 主表格
  - 点击展开源文件、Include、链接库子表格

Tab 3: 🔗 Dependencies
  - 依赖关系表格
  - 或依赖矩阵

Tab 4: ⚙️ Toolchain
  - 工具链预设选择
  - 工具链变量表格
```

### 表格交互

```typescript
// 主表格
<TargetTable
  data={targets}
  onAdd={handleAddTarget}
  onEdit={handleEditTarget}
  onDelete={handleDeleteTarget}
  onExpandSources={(target) => setExpandedTarget(target)}
/>

// 展开的子表格
{expandedTarget && (
  <SourceTable
    target={expandedTarget}
    onAdd={handleAddSource}
    onRemove={handleRemoveSource}
  />
)}
```

### 对话框设计

```typescript
// 添加源文件对话框
<SourceAddDialog
  mode={addMode}
  onModeChange={setAddMode}
  config={addConfig}
  preview={previewFiles}
  onConfirm={handleAddSources}
/>
```

---

## 实现细节

### Extension 入口

```typescript
// src/extension.ts
export function activate(context: vscode.ExtensionContext) {
  // 注册命令
  context.subscriptions.push(
    vscode.commands.registerCommand('cmakemakers.openEditor', openEditor),
    vscode.commands.registerCommand('cmakemakers.generate', generateCMake),
    vscode.commands.registerCommand('cmakemakers.importCMake', importCMake)
  );

  // 注册 Custom Editor Provider
  const provider = new CMakeEditorProvider(context);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      'cmakemakers.editor',
      provider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  // 文件监听
  const watcher = new ConfigFileWatcher();
  watcher.start();
  context.subscriptions.push(watcher);
}
```

### Webview 通信

```typescript
// Extension → Webview
webview.postMessage({
  type: 'updateProject',
  data: project
});

// Webview → Extension
window.addEventListener('message', event => {
  const message = event.data;

  switch (message.command) {
    case 'addTarget':
      handleAddTarget(message.data);
      break;
    case 'updateTarget':
      handleUpdateTarget(message.data);
      break;
    case 'deleteTarget':
      handleDeleteTarget(message.data);
      break;
  }
});
```

---

## 性能考虑

### 1. 大型项目优化

- **虚拟滚动**: 使用 `react-window` 处理大量文件列表
- **分页加载**: 源文件预览分批加载
- **防抖**: 编辑输入使用 debounce

### 2. 文件监听优化

```typescript
// 只监听必要的文件
const watcher = vscode.workspace.createFileSystemWatcher(
  new vscode.RelativePattern(workspaceRoot, 'cmake/cmaker_config*.yaml')
);

// 防抖处理
let timeoutId: NodeJS.Timeout;
watcher.onDidChange(uri => {
  clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    reloadConfig(uri);
  }, 300);
});
```

### 3. YAML 解析缓存

```typescript
class ConfigCache {
  private cache = new Map<string, { content: string; parsed: CMakeProject }>();

  get(path: string, content: string): CMakeProject | null {
    const cached = this.cache.get(path);
    if (cached && cached.content === content) {
      return cached.parsed;
    }
    return null;
  }

  set(path: string, content: string, parsed: CMakeProject): void {
    this.cache.set(path, { content, parsed });
  }
}
```

---

## 总结

本设计文档涵盖了 CMakeMakers 插件的核心架构、数据模型、功能模块和实现细节。

**关键设计决策**:

1. ✅ **表格化 UI** - 简单直观，适合 MVP
2. ✅ **YAML 配置** - 人类可读，版本控制友好
3. ✅ **无拖拽** - P0 阶段用按钮操作，降低复杂度
4. ✅ **智能文件扫描** - 支持多种添加方式，灵活强大
5. ✅ **模块化架构** - 易于扩展和测试

**下一步**:

- [ ] 搭建项目框架
- [ ] 实现核心数据模型
- [ ] 开发 YAML 序列化器
- [ ] 构建基础 UI 组件
- [ ] 实现 CMake 生成器
- [ ] 集成测试

---

*最后更新: 2025-11-10*
