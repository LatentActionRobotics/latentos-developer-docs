# 在 C++ 工程中使用

C++ SDK 按模块提供 CMake package。示例采用一个 `core::Session` 加多个模块 Client：运动使用 `motion::MotionClient`，电源使用 `power::PowerClient`。这种写法同时适用于完整交付和模块裁剪交付。

## 最小工程

```text
my_latentos_cpp_project/
├── CMakeLists.txt
├── config/
│   └── client.yaml
└── src/
    └── main.cc
```

`client.yaml` 内容见 [连接机器人](/getting-started/connect)。`client_config_path` 必须指定；为空时构造会失败。正式程序建议捕获构造阶段的 `std::exception`。

## CMake

每个示例只链接用到的模块包。`core` 是必选，其它模块 `QUIET` 查找：

```cmake
cmake_minimum_required(VERSION 3.20)
project(my_latentos_cpp_project LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(latentos_sdk_core CONFIG REQUIRED)
find_package(latentos_sdk_motion CONFIG REQUIRED)
find_package(latentos_sdk_power CONFIG REQUIRED)

add_executable(my_latentos_app src/main.cc)
target_link_libraries(my_latentos_app PRIVATE
  latentos::sdk_motion
  latentos::sdk_power)

set(_latentos_rpath
    "/data/latentos/sdk_cpp/lib"
    "/data/latentos/sdk_cpp/lib64"
    "/data/latentos/sdk_runtime/lib"
    "/data/latentos/sdk_runtime/lib64")

set_target_properties(my_latentos_app PROPERTIES
    BUILD_RPATH "${_latentos_rpath}"
    INSTALL_RPATH "${_latentos_rpath}")
```

配置和编译：

```bash
cmake -S . -B build \
  -DCMAKE_PREFIX_PATH="/data/latentos/sdk_cpp;/data/latentos/sdk_runtime;/data/latentos/sdk_runtime/third_party"
cmake --build build -j
```

可选模块包名：`latentos_sdk_telemetry`、`latentos_sdk_low_level`、`latentos_sdk_camera`、`latentos_sdk_nav`。

## 创建 Session 与 Client

```cpp
#include <latentos/sdk/core/session.h>
#include <latentos/sdk/motion/motion_client.h>
#include <latentos/sdk/power/power_client.h>

latentos::sdk::SdkOptions options;
options.client_config_path = "config/client.yaml";
latentos::sdk::core::Session session(std::move(options));
latentos::sdk::motion::MotionClient motion(session);
latentos::sdk::power::PowerClient power(session);

auto result = motion.SwitchGroup("stand", "");
result = motion.SwitchGroup("locomotion", "default");
result = motion.SwitchCurrentPolicy("policy2");
motion.SendVelocity(0.1, 0.0, 0.0);

power.SubscribeBattery({});
auto battery = power.GetLatestBattery();
```

常用运动接口：

| 接口 | 说明 |
| --- | --- |
| `SwitchGroup(group, policy)` | 切换运动 group |
| `QueryMotionControlState()` | 查询当前/目标 group 与是否正在切换 |
| `SwitchCurrentPolicy(policy)` | 切换当前 group 的 policy |
| `SetVelocitySmoothing(enabled)` | 开启或关闭速度平滑 |
| `SetRemoteVelocityControl(enabled)` | 开启或关闭遥控速度控制 |
| `SendVelocity(x, y, yaw)` | 发送速度指令 |

电源侧常用 `SubscribeBattery` / `GetLatestBattery`。

完整模块交付也提供统一的 `latentos::sdk::Client`，可通过 `find_package(latentos_sdk CONFIG REQUIRED)` 和 `latentos::sdk` 使用。需要兼容模块裁剪或希望依赖更清晰时，推荐沿用本文的模块 Client 写法。

## 命令返回值

group、policy 和控制开关接口返回 `CommandResult`。常用字段：

| 字段 | 含义 |
| --- | --- |
| `ok` | SDK 是否成功收到并解析机器回复 |
| `accepted` | 机器是否接受该命令 |
| `completed` | 命令是否已经执行完成 |
| `result_code` | 结果码，0 通常表示成功 |
| `message` | 可读的结果或错误说明 |
| `command_id` | 本次命令 ID |
| `operation_id` | 异步操作 ID |

`ok=true` 只表示通信和回复解析成功，不等于机器已经执行成功。至少应同时检查 `ok` 和 `accepted`：

```cpp
auto result = motion.SwitchCurrentPolicy(policy, {});
if (!result.ok) {
  // 超时、传输失败或回复解析失败
} else if (!result.accepted) {
  // 机器收到请求，但拒绝执行
} else if (!result.completed) {
  // 已受理，仍在异步执行；可使用 operation_id 查询进度
} else {
  // 命令已经完成
}
```

出现问题时应记录 `result_code`、`message`、`command_id` 和 `operation_id`。

## 旧名称兼容

SDK 1.1 为 1.0.x 源码保留 `latentos_high_level_sdk*` CMake package、`<latentos/high_level_sdk/...>` 头文件和 `latentos::high_level_sdk` 命名空间别名。它们仅用于迁移；新代码使用本文中的规范名称。旧二进制程序不保证无需重新编译即可直接使用 1.1。
