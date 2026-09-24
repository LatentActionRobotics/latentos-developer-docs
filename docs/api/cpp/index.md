---
sidebar_label: 总览
---

# C++ API Reference

本参考对应 `latentos_sdk_cpp` **1.1.0**，只描述应用可使用的公开 C++ API。规范命名为：

- 头文件：`<latentos/sdk/...>`
- 命名空间：`latentos::sdk`
- CMake package：`latentos_sdk`、`latentos_sdk_<module>`
- CMake target：`latentos::sdk`、`latentos::sdk_<module>`

快速了解安装布局和调用方式，请先阅读 [C++ SDK 指南](/sdk/cpp)。

## 选择入口

### 统一 Client

完整模块交付提供 `latentos::sdk::Client`，适合希望用一个对象访问全部能力的应用：

```cmake
find_package(latentos_sdk CONFIG REQUIRED)
target_link_libraries(my_app PRIVATE latentos::sdk)
```

```cpp showLineNumbers
#include <latentos/sdk/client.h>

latentos::sdk::SdkOptions options;
options.client_config_path = "config/echo/mode/client.yaml";
latentos::sdk::Client client(std::move(options));
```

统一 Client 的方法与各模块 Client 能力一致。电源和相机方法为避免重名，使用更完整的方法名：

| 能力 | 统一 Client 方法 | 模块 Client 方法 |
| --- | --- | --- |
| PMU 状态 | `SubscribePowerStatus` / `GetLatestPowerStatus` | `SubscribeStatus` / `GetLatestStatus` |
| PMU 事件 | `SubscribePowerEvent` / `GetLatestPowerEvent` | `SubscribeEvent` / `GetLatestEvent` |
| 相机能力 | `QueryCameraCapabilities` | `QueryCapabilities` |
| 相机控件 | `SetCameraControl` | `SetControl` |
| 相机推流 | `SendCameraStreamCommand` | `SendStreamCommand` |
| 相机推流参数 | `SetCameraStreamParams` | `SetStreamParams` |

### 模块 Client

模块 Client 适用于完整交付和裁剪交付。一个 `core::Session` 可共享给多个模块：

```cpp showLineNumbers
latentos::sdk::core::Session session(std::move(options));
latentos::sdk::motion::MotionClient motion(session);
latentos::sdk::power::PowerClient power(session);
```

| 模块 | 类 | 参考 |
| --- | --- | --- |
| Core | `core::Session` | [Core](/api/cpp/core) |
| Motion | `motion::MotionClient` | [Motion](/api/cpp/motion) |
| Telemetry | `telemetry::TelemetryClient` | [Telemetry](/api/cpp/telemetry) |
| Low Level | `low_level::LowLevelClient` | [Low Level](/api/cpp/low-level) |
| Power | `power::PowerClient` | [Power](/api/cpp/power) |
| Camera | `camera::CameraClient` | [Camera](/api/cpp/camera) |
| Nav | `nav::NavClient` | [Nav](/api/cpp/nav) |

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
| Motion | `<latentos/sdk/motion/motion_client.h>`、`result.h`、`codes.h` |
| Telemetry | `<latentos/sdk/telemetry/telemetry_client.h>`、`imu.h`、`gnss.h` |
| Low Level | `<latentos/sdk/low_level/low_level_client.h>`、`joint_state.h`、`joint_command.h` |
| Power | `<latentos/sdk/power/power_client.h>` 及同目录数据类型头文件 |
| Camera | `<latentos/sdk/camera/camera_client.h>` 及同目录数据类型头文件 |
| Nav | `<latentos/sdk/nav/nav_client.h>` |

## 兼容说明

1.1 暂时保留 1.0.x 的旧名称供已有源码重新编译。API Reference 只展示规范名称；新工程不要继续使用 `high_level` 名称。旧二进制程序不保证可直接替换为 1.1 动态库。
