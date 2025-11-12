# CMakeMakers 项目模板

本目录包含了各种类型的项目模板，帮助你快速开始使用 CMakeMakers。

## 📁 模板列表

### 1. `console-app.yaml` - 控制台应用
**适用场景**：
- 命令行工具
- 简单的可执行程序
- 学习和测试

**特点**：
- 单个 executable target
- 最小化配置
- 包含常用选项的注释示例

**快速开始**：
```bash
# 在 VSCode 命令面板中：
CMakeMakers: New Project from Template → 选择 "控制台应用"
```

---

### 2. `static-lib.yaml` - 静态库
**适用场景**：
- 创建可重用的库组件
- 嵌入式系统（静态链接）
- 内部工具库

**特点**：
- static_library target
- PUBLIC/PRIVATE include 目录示例
- Glob 模式匹配源文件

**快速开始**：
```bash
# 在 VSCode 命令面板中：
CMakeMakers: New Project from Template → 选择 "静态库"
```

---

### 3. `shared-lib.yaml` - 共享库
**适用场景**：
- 动态链接库（DLL/SO）
- 插件系统
- 运行时可替换的库

**特点**：
- shared_library target
- VERSION 和 SOVERSION 配置
- POSITION_INDEPENDENT_CODE
- 符号导出配置

**快速开始**：
```bash
# 在 VSCode 命令面板中：
CMakeMakers: New Project from Template → 选择 "共享库"
```

---

### 4. `complete-example.yaml` - 完整示例
**适用场景**：
- 学习 CMakeMakers 所有功能
- 复杂多 target 项目参考
- 高级功能示例

**特点**：
- 4 个 target：core 库、utils 库、app 应用、tests 测试
- 展示所有配置选项
- 详细的注释说明
- target 间依赖关系
- find_package 使用示例

**内容**：
```yaml
targets:
  - core (static_library)    # 核心库
  - utils (shared_library)   # 工具库，依赖 core
  - app (executable)         # 主程序，依赖 core 和 utils
  - tests (executable)       # 测试程序
```

---

## 🎯 典型使用场景

### 场景 1: 创建简单的 Hello World 程序
```bash
1. 创建项目：选择 "console-app.yaml" 模板
2. 创建源文件：src/main.cpp
3. 生成 CMake：CMakeMakers: Generate CMakeLists.txt
4. 构建：mkdir build && cd build && cmake .. && make
```

### 场景 2: 创建可重用的工具库
```bash
1. 创建项目：选择 "static-lib.yaml" 模板
2. 组织代码：
   include/mylib/   # 公共头文件（PUBLIC）
   src/             # 实现文件和私有头文件（PRIVATE）
3. 配置 YAML：
   - 设置 PUBLIC include 目录
   - 使用 glob 匹配所有 .cpp 文件
4. 生成和构建
```

### 场景 3: 创建带依赖的应用程序
```bash
1. 从 "console-app.yaml" 开始
2. 添加依赖库：
   link_libraries:
     - name: Boost::filesystem
       type: package
       find_package:
         package: Boost
         version: "1.70"
         components: [filesystem]
3. 生成 CMakeLists.txt
4. 确保系统已安装 Boost
5. 构建项目
```

### 场景 4: 多模块项目
参考 `complete-example.yaml`，它展示了：
- 多个库和应用的组织
- target 间的依赖关系
- 不同 target 的不同配置
- 测试程序的集成

---

## 📝 配置文件结构说明

### 基本结构
```yaml
# 项目信息
project:
  name: MyProject
  version: 1.0.0
  cmake_minimum_required: "3.15"
  languages: [CXX]

# 全局配置
global:
  cxx_standard: 17
  default_build_type: Release

# Target 定义
targets:
  - name: my_target
    type: executable
    sources: [...]
    include_directories: [...]
    link_libraries: [...]

# 元数据（自动生成）
metadata:
  generated_by: CMakeMakers
```

### 源文件的三种添加方式

#### 1. 单个文件（适合少量文件）
```yaml
sources:
  - type: file
    path: src/main.cpp
```

#### 2. Glob 模式（推荐，适合大型项目）
```yaml
sources:
  - type: glob
    pattern: src/**/*.cpp     # 递归匹配
    recursive: true
    configure_depends: true   # 推荐开启
    exclude:
      - "**/*_test.cpp"      # 排除测试
```

#### 3. 目录扫描
```yaml
sources:
  - type: directory
    directory: src
    extensions: [".cpp", ".cc"]
    exclude_folders: [test, third_party]
```

### Scope 说明

- **PUBLIC**: 对外可见，使用此 target 的其他 target 也能访问
  - 用于：公共头文件目录、接口库

- **PRIVATE**: 仅内部使用，不传递给依赖者
  - 用于：实现细节、内部头文件、系统库

- **INTERFACE**: 仅接口，target 自身不使用
  - 用于：header-only 库

---

## 💡 最佳实践

### 1. 项目结构建议
```
my_project/
├── cmake/
│   └── cmaker_config.yaml    # CMakeMakers 配置
├── include/                  # 公共头文件（PUBLIC）
│   └── mylib/
│       └── mylib.h
├── src/                      # 实现文件（PRIVATE）
│   ├── main.cpp
│   └── impl/
├── tests/                    # 测试文件
│   └── test_main.cpp
├── CMakeLists.txt           # 生成的文件
└── README.md
```

### 2. 命名规范
- **Target 名称**: 小写，使用下划线分隔（如 `my_app`）
- **库名称**: 与 target 名称一致
- **头文件**: 使用项目命名空间（如 `mylib/header.h`）

### 3. 源文件管理
- **推荐使用 glob 模式**：自动包含新文件
- **启用 configure_depends**：文件变化自动重新配置
- **明确排除测试文件**：避免将测试代码编译进库

### 4. 依赖管理
- **内部依赖**: 使用 `type: internal`
- **系统库**: 使用 `type: system`
- **第三方库**: 优先使用 `find_package`

### 5. Include 目录
- **库的公共接口**: 使用 PUBLIC scope
- **库的内部实现**: 使用 PRIVATE scope
- **组织清晰**: public 头文件放 `include/`，private 放 `src/`

---

## 🚀 从模板开始

### 方式 1: VSCode 命令面板（推荐）
```
1. Ctrl/Cmd + Shift + P
2. 输入: CMakeMakers: New Project from Template
3. 选择模板
4. 输入项目名称
5. 自动创建 cmake/cmaker_config.yaml
```

### 方式 2: 手动复制
```bash
# 复制模板文件
cp templates/console-app.yaml cmake/cmaker_config.yaml

# 修改项目名称
# 编辑 cmake/cmaker_config.yaml

# 生成 CMakeLists.txt
# 在 VSCode 中: CMakeMakers: Generate CMakeLists.txt
```

---

## 📚 进一步学习

- **TEST_GUIDE.md**: 完整的测试和使用指南
- **CLAUDE.md**: 开发者文档
- **complete-example.yaml**: 所有功能的示例代码

---

## ❓ 常见问题

**Q: 如何添加新的源文件？**
A: 如果使用 glob 模式，新文件会自动包含。否则手动添加到 `sources` 列表。

**Q: 如何链接第三方库？**
A: 使用 `link_libraries` 配置，指定 `type: package` 和 `find_package` 详情。

**Q: 如何创建多个 target？**
A: 在 `targets` 列表中添加多个 target 定义，参考 `complete-example.yaml`。

**Q: 如何设置编译选项？**
A: 使用 `compile_options` 字段，注意设置正确的 scope。

**Q: PUBLIC 和 PRIVATE 的区别？**
A: PUBLIC 会传递给使用者，PRIVATE 只在 target 内部使用。

---

**Happy Coding with CMakeMakers! 🎉**
