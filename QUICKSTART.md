# CMakeMakers Quick Start Guide

快速开始使用 CMakeMakers 进行开发和测试。

## 📋 前置要求

- Node.js >= 16
- VSCode >= 1.80
- Git

## 🚀 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/xshii/cmakemakers.git
cd cmakemakers
```

### 2. 安装依赖

```bash
npm install
```

### 3. 编译项目

```bash
npm run compile
```

### 4. 运行测试

```bash
npm test
```

### 5. 打包扩展

#### Linux/Mac
```bash
bash scripts/package.sh
```

#### Windows
```cmd
scripts\package.bat
```

## 🧪 测试核心功能

### 测试 Project 模型

```typescript
import { Project } from './src/core/model/Project';

// 创建项目
const project = new Project();

// 添加目标
const target = project.addTarget({
  name: 'my_app',
  type: 'executable',
  sources: [{ type: 'file', path: 'src/main.cpp' }]
});

console.log(project.getData());
```

### 测试 YAML 序列化

```typescript
import { YAMLSerializer } from './src/core/generator/YAMLSerializer';
import { Project } from './src/core/model/Project';

const project = new Project();
project.addTarget({
  name: 'test_app',
  type: 'executable',
  sources: [{ type: 'file', path: 'main.cpp' }]
});

const serializer = new YAMLSerializer();
const yaml = serializer.serialize(project.getData());
console.log(yaml);

// 反序列化
const loaded = serializer.deserialize(yaml);
console.log(loaded);
```

### 测试 CMake 生成器

```typescript
import { CMakeGenerator } from './src/core/generator/CMakeGenerator';
import { Project } from './src/core/model/Project';

const project = new Project();
project.addTarget({
  name: 'my_app',
  type: 'executable',
  sources: [{ type: 'file', path: 'src/main.cpp' }],
  include_directories: [
    { path: 'include', scope: 'PUBLIC' }
  ]
});

const generator = new CMakeGenerator();
const cmake = generator.generate(project.getData());
console.log(cmake);
```

## 📦 已实现的功能

### ✅ 核心数据模型
- Project 类完整实现
- Target CRUD 操作
- 循环依赖检测
- 目标名称验证

### ✅ YAML 序列化
- 双向序列化（Project ⇄ YAML）
- Schema 验证
- 错误处理

### ✅ CMake 生成器
- 完整的 CMakeLists.txt 生成
- 支持所有 Target 类型
- Glob 模式源文件
- Include 目录和链接库
- 编译选项和定义

### ✅ 测试套件
- 12+ 单元测试
- Project 模型测试
- YAML 序列化测试
- CMake 生成器测试

### ✅ 打包脚本
- Linux/Mac 脚本 (package.sh)
- Windows 脚本 (package.bat)
- 自动化流程（lint → compile → test → package）

## 📝 示例：完整工作流

```typescript
import { Project } from './src/core/model/Project';
import { YAMLSerializer } from './src/core/generator/YAMLSerializer';
import { CMakeGenerator } from './src/core/generator/CMakeGenerator';
import * as fs from 'fs';

// 1. 创建项目
const project = new Project();
project.setProjectInfo({
  name: 'MyAwesomeProject',
  version: '1.0.0',
  cmake_minimum_required: '3.15',
  languages: ['CXX']
});

// 2. 添加可执行文件 Target
const app = project.addTarget({
  name: 'my_app',
  type: 'executable',
  sources: [
    { type: 'glob', pattern: 'src/**/*.cpp', recursive: true }
  ],
  include_directories: [
    { path: 'include', scope: 'PUBLIC' }
  ],
  link_libraries: [
    { name: 'pthread', scope: 'PRIVATE', type: 'system' }
  ]
});

// 3. 添加库 Target
const lib = project.addTarget({
  name: 'mylib',
  type: 'static_library',
  sources: [
    { type: 'file', path: 'lib/mylib.cpp' }
  ],
  include_directories: [
    { path: 'lib/include', scope: 'PUBLIC' }
  ]
});

// 4. 序列化为 YAML
const serializer = new YAMLSerializer();
const yamlContent = serializer.serialize(project.getData());
fs.writeFileSync('cmake/cmaker_config.yaml', yamlContent);
console.log('✅ YAML配置已保存');

// 5. 生成 CMakeLists.txt
const generator = new CMakeGenerator();
const cmakeContent = generator.generate(project.getData());
fs.writeFileSync('CMakeLists.txt', cmakeContent);
console.log('✅ CMakeLists.txt 已生成');

console.log('\n生成的 CMakeLists.txt:\n');
console.log(cmakeContent);
```

## 🔧 开发工作流

### 监听模式（开发时）

```bash
# Terminal 1: 编译监听
npm run watch

# Terminal 2: 运行测试
npm test
```

### 代码检查

```bash
npm run lint
```

### 完整构建

```bash
npm run compile
npm run lint
npm test
npm run package
```

## 📁 项目结构

```
cmakemakers/
├── src/
│   ├── core/
│   │   ├── model/           # 数据模型
│   │   │   ├── types.ts     # TypeScript 类型定义
│   │   │   └── Project.ts   # Project 类
│   │   ├── generator/       # 生成器
│   │   │   ├── YAMLSerializer.ts
│   │   │   └── CMakeGenerator.ts
│   │   └── parser/          # 解析器（待实现）
│   └── test/                # 测试
│       ├── suite/
│       │   ├── project.test.ts
│       │   ├── yaml.test.ts
│       │   └── cmake.test.ts
│       └── runTest.ts
├── scripts/                 # 打包脚本
│   ├── package.sh
│   └── package.bat
├── templates/               # 项目模板
│   ├── console-app.yaml
│   ├── static-lib.yaml
│   └── shared-lib.yaml
└── package.json
```

## 🧩 使用模板

### 从模板创建项目

```typescript
import { YAMLSerializer } from './src/core/generator/YAMLSerializer';
import * as fs from 'fs';

const serializer = new YAMLSerializer();

// 加载模板
const templateContent = fs.readFileSync('templates/console-app.yaml', 'utf-8');
const project = serializer.deserialize(templateContent);

// 修改项目信息
project.project.name = 'MyNewApp';

// 保存
const yaml = serializer.serialize(project);
fs.writeFileSync('cmake/cmaker_config.yaml', yaml);
```

## 🐛 常见问题

### Q: 测试失败？
A: 确保已运行 `npm install` 并 `npm run compile`

### Q: 打包失败？
A: 检查是否安装了所有依赖，特别是 `@vscode/vsce`

### Q: TypeScript 编译错误？
A: 运行 `npm run lint` 查看详细错误

## 📖 下一步

- 查看 [DESIGN.md](./DESIGN.md) 了解详细设计
- 查看 [README.md](./README.md) 了解项目概述
- 查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解贡献指南

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**注意**: 当前版本为 MVP (0.0.1)，仅实现了核心数据层功能。UI 和 Extension 功能将在后续版本中实现。
