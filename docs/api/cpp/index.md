---
sidebar_label: 总览
---

# C++ API Reference

本参考对应 `latentos_sdk_cpp` **1.2.0**，只描述应用可使用的公开 C++ API。规范命名为：

- 头文件：`<latentos/sdk/...>`
- 命名空间：`latentos::sdk`
- CMake package：`latentos_sdk`、`latentos_sdk_<module>`
- CMake target：`latentos::sdk`、`latentos::sdk_<module>`

快速了解安装布局和调用方式，请先阅读 [C++ SDK 指南](../../sdk/cpp.md)。各模块页按同一结构组织：模块说明 → 头文件 / CMake → 方法表 → 数据类型 → 调用示例。

## 选择入口

### 统一 Client

完整模块交付提供 `latentos::sdk::Client`，适合希望用一个对象访问全部能力的应用。CMake 中链接聚合包：

```cmake
find_package(latentos_sdk CONFIG REQUIRED)
target_link_libraries(my_app PRIVATE latentos::sdk)
```

构造时传入 `SdkOptions`（至少设置 Echo client YAML）：

```cpp showLineNumbers
#include <latentos/sdk/client.h>

latentos::sdk::SdkOptions options;
options.client_config_path = "config/echo/mode/client.yaml";
latentos::sdk::Client client(std::move(options));
```

整机状态通过 core 中独立的 `robot_status::RobotStatusClient` 使用，目前统一 Client 尚未提供对应便利方法；见 [Robot Status](./robot-status.md)。其他模块中，电源和相机方法为避免重名，使用更完整的方法名：

| 能力 | 统一 Client 方法 | 模块 Client 方法 |
| --- | --- | --- |
| PMU 状态 | `SubscribePowerStatus` / `GetLatestPowerStatus` | `SubscribeStatus` / `GetLatestStatus` |
| PMU 事件 | `SubscribePowerEvent` / `GetLatestPowerEvent` | `SubscribeEvent` / `GetLatestEvent` |
| 相机能力 | `QueryCameraCapabilities` | `QueryCapabilities` |
| 相机控件 | `SetCameraControl` | `SetControl` |
| 相机推流 | `SendCameraStreamCommand` | `SendStreamCommand` |
| 相机推流参数 | `SetCameraStreamParams` | `SetStreamParams` |

### 模块 Client

模块 Client 可按已安装模块单独使用。一个 `core::Session` 可共享给多个模块：

```cpp showLineNumbers
latentos::sdk::core::Session session(std::move(options));
latentos::sdk::motion::MotionClient motion(session);
latentos::sdk::power::PowerClient power(session);
```

| 模块 | 类 | 参考 |
| --- | --- | --- |
| Core | `core::Session` | [Core](./core.md) |
| Robot Status | `robot_status::RobotStatusClient` | [Robot Status](./robot-status.md) |
| Motion | `motion::MotionClient` | [Motion](./motion.md) |
| Power | `power::PowerClient` | [Power](./power.md) |
| Telemetry | `telemetry::TelemetryClient` | [Telemetry](./telemetry.md) |
| Camera | `camera::CameraClient` | [Camera](./camera.md) |
| Low Level | `low_level::LowLevelClient` | [Low Level](./low-level.md) |
| 导航与点云（Nav） | `nav::NavClient` | [导航与点云（Nav）](./nav.md) |

## 通用约定

- 请求/回复接口会等待回复或超时；通过对应 Options 的 `timeout_ms` 调整超时。
- `ok` 表示通信和回复解析是否成功，不等于目标端接受或完成操作。
- `Subscribe*()` 启动订阅；`GetLatest*()` 只读取本地缓存，第一帧到达前返回空值。
- `ToString(enum_value)` 可将公开枚举转为适合日志和界面展示的字符串。
- Session 和模块 Client 应在订阅、回调及请求期间保持存活。

## 头文件索引

| 内容 | 头文件 |
| --- | --- |
| 统一 Client | `<latentos/sdk/client.h>` |
| Core | `<latentos/sdk/core/options.h>`、`<latentos/sdk/core/session.h>` |
| Robot Status | `<latentos/sdk/core/robot_status/robot_status_client.h>` 及同目录数据类型头文件 |
| Motion | `<latentos/sdk/motion/motion_client.h>`、`result.h`、`codes.h` |
| Power | `<latentos/sdk/power/power_client.h>` 及同目录数据类型头文件 |
| Telemetry | `<latentos/sdk/telemetry/telemetry_client.h>`、`imu.h`、`gnss.h` |
| Camera | `<latentos/sdk/camera/camera_client.h>` 及同目录数据类型头文件 |
| Low Level | `<latentos/sdk/low_level/low_level_client.h>`、`joint_state.h`、`joint_command.h` |
| 导航与点云（Nav） | `<latentos/sdk/nav/nav_client.h>` |

## 兼容说明

自 1.1 起，规范名为 `latentos::sdk` / `<latentos/sdk/...>`；仍保留 1.0.x 的 `high_level` 旧名称供已有源码重新编译。API Reference 只展示规范名称，新工程不要继续使用 `high_level`。旧二进制程序不保证可直接替换为新版动态库。
