# CMake 多 Project 示例

## 场景：主项目包含子项目

### 项目结构
```
my_project/
├── CMakeLists.txt           # 主项目
├── main.cpp
├── lib_a/
│   ├── CMakeLists.txt       # 子项目 A
│   ├── lib_a.cpp
│   └── lib_a.h
└── lib_b/
    ├── CMakeLists.txt       # 子项目 B
    ├── lib_b.cpp
    └── lib_b.h
```

### 主 CMakeLists.txt
```cmake
cmake_minimum_required(VERSION 3.15)
project(MainProject
    VERSION 1.0.0
    LANGUAGES CXX
)

message("Main Project: ${PROJECT_NAME} v${PROJECT_VERSION}")

# 添加子目录（每个都有自己的 project()）
add_subdirectory(lib_a)
add_subdirectory(lib_b)

# 主程序
add_executable(main_app main.cpp)

# 链接子项目的库
target_link_libraries(main_app PRIVATE lib_a lib_b)
```

### lib_a/CMakeLists.txt
```cmake
project(LibraryA
    VERSION 2.5.0
    LANGUAGES CXX
)

message("Sub Project A: ${PROJECT_NAME} v${PROJECT_VERSION}")

add_library(lib_a lib_a.cpp)

target_include_directories(lib_a PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>
)
```

### lib_b/CMakeLists.txt
```cmake
project(LibraryB
    VERSION 3.1.0
    LANGUAGES CXX
)

message("Sub Project B: ${PROJECT_NAME} v${PROJECT_VERSION}")

add_library(lib_b lib_b.cpp)

target_include_directories(lib_b PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>
)
```

## 运行效果

```bash
$ cmake -B build
Main Project: MainProject v1.0.0
Sub Project A: LibraryA v2.5.0
Sub Project B: LibraryB v3.1.0
```

## 变量作用域

### PROJECT_* 变量的变化

```cmake
# 主 CMakeLists.txt 中
message("PROJECT_NAME = ${PROJECT_NAME}")        # MainProject
message("PROJECT_VERSION = ${PROJECT_VERSION}")  # 1.0.0

add_subdirectory(lib_a)

# lib_a/CMakeLists.txt 进入后
message("PROJECT_NAME = ${PROJECT_NAME}")        # LibraryA
message("PROJECT_VERSION = ${PROJECT_VERSION}")  # 2.5.0

# lib_a/CMakeLists.txt 退出后，回到主文件
message("PROJECT_NAME = ${PROJECT_NAME}")        # MainProject
message("PROJECT_VERSION = ${PROJECT_VERSION}")  # 1.0.0
```

### 访问父项目变量

在子项目中可以访问父项目的变量（使用特殊变量）：

```cmake
# lib_a/CMakeLists.txt
project(LibraryA VERSION 2.5.0)

# 当前项目
message("当前项目: ${PROJECT_NAME}")              # LibraryA
message("当前版本: ${PROJECT_VERSION}")            # 2.5.0

# 顶层项目（最外层的 project）
message("顶层项目: ${CMAKE_PROJECT_NAME}")        # MainProject
message("顶层版本: ${CMAKE_PROJECT_VERSION}")     # 1.0.0
```

## 实际使用场景

### 场景 1: 第三方库集成
```
my_app/
├── CMakeLists.txt       # 主项目
├── external/
│   ├── json/
│   │   └── CMakeLists.txt  # nlohmann/json 的 project
│   └── spdlog/
│       └── CMakeLists.txt  # spdlog 的 project
└── src/
```

### 场景 2: 多模块大型项目
```
company_software/
├── CMakeLists.txt       # 公司软件套件
├── product_a/
│   └── CMakeLists.txt   # 产品 A（独立项目）
├── product_b/
│   └── CMakeLists.txt   # 产品 B（独立项目）
└── shared_libs/
    └── CMakeLists.txt   # 共享库（独立项目）
```

### 场景 3: 可选组件
```
framework/
├── CMakeLists.txt       # 核心框架
├── core/
│   └── CMakeLists.txt   # 必需核心
├── plugins/
│   ├── plugin_a/
│   │   └── CMakeLists.txt  # 可选插件 A
│   └── plugin_b/
│       └── CMakeLists.txt  # 可选插件 B
```

## 优点

1. **版本独立性**：每个子项目可以有自己的版本号
2. **配置隔离**：语言、编译选项可以不同
3. **独立构建**：子项目可以单独构建（如果需要）
4. **清晰组织**：逻辑模块分离
5. **第三方集成**：方便集成外部项目

## 注意事项

### ⚠️ 变量污染
```cmake
# 主项目
set(MY_VAR "main")

add_subdirectory(sub)

# 子项目可能修改了 MY_VAR
message("${MY_VAR}")  # 可能不是 "main" 了
```

**解决方案**：使用 target 属性而不是全局变量

### ⚠️ 构建目录冲突
```cmake
# 不推荐：两个子项目生成同名 target
# lib_a/CMakeLists.txt
add_library(common ...)

# lib_b/CMakeLists.txt
add_library(common ...)  # 错误：target 名称冲突
```

**解决方案**：使用唯一的 target 名称或命名空间

### ⚠️ include 路径
子项目的 include 目录不会自动传播，需要明确指定：
```cmake
target_include_directories(lib_a PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>
)
```

## CMake 最佳实践

### 推荐方式：明确作用域
```cmake
# 子项目 CMakeLists.txt
cmake_minimum_required(VERSION 3.15)  # 指定自己的最低版本
project(SubProject VERSION 1.0.0)

# 使用 target 属性而不是全局变量
add_library(mylib src.cpp)

target_compile_features(mylib PUBLIC cxx_std_17)
target_include_directories(mylib PUBLIC include)
```

### 不推荐：依赖父项目的全局设置
```cmake
# 不好的做法
add_library(mylib src.cpp)
# 依赖父项目设置的全局 include 路径和编译选项
```

## 与 CMakeMakers 的关系

目前 CMakeMakers **不支持** `add_subdirectory`，但这是一个很好的未来特性！

### 可能的实现方式

```yaml
# 主项目 cmake/cmaker_config.yaml
project:
  name: MainProject
  version: 1.0.0

subdirectories:
  - path: lib_a
    config: lib_a/cmake/cmaker_config.yaml
  - path: lib_b
    config: lib_b/cmake/cmaker_config.yaml

targets:
  - name: main_app
    type: executable
    sources: [src/main.cpp]
    link_libraries:
      - name: lib_a
        type: internal
      - name: lib_b
        type: internal
```

这将是 **Phase 3 或更高版本** 的功能。
