---
sidebar_label: C++ SDK 指南
---

# C++ SDK 指南

`latentos_sdk_cpp` 是面向 C++ 应用的 LatentOS SDK。应用通过它连接机器狗或本机仿真，调用运动控制、电源、传感器、关节、相机和导航能力，而不需要直接处理底层通信协议。

本页介绍应用开发需要了解的接口与使用规则。SDK 的内部实现不属于公开接口；开发时应只依赖安装包提供的头文件、CMake package 和动态库。

## 使用前准备

- CMake 3.20 或以上
- 支持 C++20 的编译器
- 与开发机架构匹配的 C++ SDK 和 Runtime
- 可访问目标机器狗的 Echo client YAML 配置

安装和版本配套方法见 [安装 SDK](/getting-started/install)，网络配置见 [连接机器狗](/getting-started/connect)。

## 安装后的位置

使用默认前缀安装后，应用只需要关注以下路径：

| 内容 | 默认位置 |
| --- | --- |
| C++ SDK | `/data/latentos/sdk_cpp` |
| Runtime | `/data/latentos/sdk_runtime` |
| SDK 头文件 | `/data/latentos/sdk_cpp/include/latentos/sdk` |
| SDK 动态库 | `/data/latentos/sdk_cpp/lib` 或 `lib64` |
| SDK CMake package | `/data/latentos/sdk_cpp/lib/cmake` |

`/data/latentos/sdk_cpp` 通常是当前启用版本的符号链接。查看实际版本：

```bash
readlink -f /data/latentos/sdk_cpp
readlink -f /data/latentos/sdk_runtime
```

构建应用时同时提供 SDK 与 Runtime 搜索前缀：

```bash
cmake -S . -B build \
  -DCMAKE_PREFIX_PATH="/data/latentos/sdk_cpp;/data/latentos/sdk_runtime;/data/latentos/sdk_runtime/third_party"
cmake --build build -j
```

## 模块划分

`core` 是所有模块的公共基础。其余模块可按交付需求裁剪，因此应用应只查找和链接实际使用的模块。

| 模块 | CMake package / target | 主要能力 |
| --- | --- | --- |
| `core` | `latentos_sdk_core` / `latentos::sdk_core` | `SdkOptions`、连接会话及公共订阅能力 |
| `motion` | `latentos_sdk_motion` / `latentos::sdk_motion` | Group/Policy 切换、运动状态查询、SE(2) 速度 |
| `telemetry` | `latentos_sdk_telemetry` / `latentos::sdk_telemetry` | IMU、GNSS 状态 |
| `low_level` | `latentos_sdk_low_level` / `latentos::sdk_low_level` | 关节状态、直接关节命令 |
| `power` | `latentos_sdk_power` / `latentos::sdk_power` | 电池、PMU 状态/事件及电源控制 |
| `camera` | `latentos_sdk_camera` / `latentos::sdk_camera` | 相机能力、控制、推流及参数设置 |
| `nav` | `latentos_sdk_nav` / `latentos::sdk_nav` | 点云流端点广播 |

例如，仅使用运动和电源模块：

```cmake
find_package(latentos_sdk_motion CONFIG REQUIRED)
find_package(latentos_sdk_power CONFIG REQUIRED)

target_link_libraries(my_app PRIVATE
  latentos::sdk_motion
  latentos::sdk_power)
```

模块 target 会自动带上 `core` 依赖，无需重复链接 `latentos::sdk_core`。

## 创建 Session 和模块 Client

一个进程通常创建一个 `core::Session`，再把它共享给需要的模块 Client。YAML 路径不能为空，且 Session 的生命周期必须覆盖各模块 Client。

```cpp showLineNumbers
#include <latentos/sdk/core/session.h>
#include <latentos/sdk/motion/motion_client.h>
#include <latentos/sdk/power/power_client.h>

#include <utility>

namespace sdk = latentos::sdk;

sdk::SdkOptions options;
options.client_config_path = "config/echo/mode/client.yaml";

sdk::core::Session session(std::move(options));
sdk::motion::MotionClient motion(session);
sdk::power::PowerClient power(session);
```

创建 Session 时可能因配置文件缺失或内容无效而抛出异常，正式应用应在程序入口捕获 `std::exception` 并记录错误。

完整模块交付还提供统一入口：

```cmake
find_package(latentos_sdk CONFIG REQUIRED)
target_link_libraries(my_app PRIVATE latentos::sdk)
```

```cpp showLineNumbers
#include <latentos/sdk/client.h>

latentos::sdk::Client client(std::move(options));
```

统一 `Client` 使用更简洁；模块 Client 同时适用于完整交付和裁剪交付，也是配套示例采用的方式。不要假定每个安装包都包含统一 `Client`。

## API 调用模型

### 命令与查询

运动切换、电源控制和能力查询等接口采用请求/回复方式，并在调用线程中等待结果或超时。可通过对应 Options 类型设置超时，默认通常为 1000 ms。

运动命令返回 `CommandResult`。判断结果时至少区分：

| 字段 | 含义 |
| --- | --- |
| `ok` | 是否成功收到并解析回复 |
| `accepted` | 目标端是否接受命令 |
| `completed` | 命令是否已经执行完成 |
| `result_code` | 结构化结果码 |
| `message` | 可读的结果或错误信息 |
| `command_id` | 命令标识 |
| `operation_id` | 异步操作标识，可用于查询进度 |

`ok == true` 不代表动作一定执行成功，还要检查 `accepted`、`completed` 和 `result_code`。

### 订阅与最新值

IMU、GNSS、关节、电池及 PMU 状态等流式数据采用相同模式：

1. 调用 `Subscribe*()` 启动订阅，可选择传入回调。
2. 调用 `GetLatest*()` 读取 SDK 缓存的最新值。

`GetLatest*()` 返回 `std::optional<T>`；尚未收到第一条数据时为空。它读取本地缓存，不会主动向机器狗发起一次查询。

```cpp showLineNumbers
power.SubscribeBattery({});
auto battery = power.GetLatestBattery();
if (battery && battery->ok && !battery->stale) {
  // 使用 battery->power_state、soc_percent、voltage_v、current_a 等字段。
}
```

订阅期间应保持 Session、模块 Client 以及回调所依赖对象存活。

### 持续发送与异步状态

- `SendVelocity()` 是实时速度输入，应按照控制周期持续发送；只调用一次不能替代持续控制。
- `SendJointCommand()` 是绕过运动控制仲裁的底层指令，只能在确认机器狗已进入直接关节控制模式后使用。
- `AdvertisePointCloudStream()` 应周期调用，例如 1 Hz，使后加入或重连的接收端能获得有效端点。
- 相机设置接口返回 `seq`。应用应订阅对应的状态接口，用相同 `seq` 关联异步执行结果。

## 各模块 API

### Motion

类：`latentos::sdk::motion::MotionClient`

| API | 说明 |
| --- | --- |
| `SwitchGroup(group, policy, options)` | 切换运动 Group；部分 Group 必须提供 Policy |
| `SwitchCurrentPolicy(policy, options)` | 在当前 Group 内切换 Policy |
| `QueryMotionControlState(options)` | 查询当前/目标 Group 与切换状态 |
| `QueryPolicyOperation(operation_id, options)` | 查询异步 Policy 操作进度 |
| `SetVelocitySmoothing(enabled, options)` | 设置速度平滑 |
| `SetRemoteVelocityControl(enabled, options)` | 设置遥控速度控制 |
| `SendVelocity(x, y, yaw)` | 发送 SE(2) 速度，单位分别为 m/s、m/s、rad/s |
| `VelocityCandidateTopic()` | 获取速度 Publisher 使用的只读 Topic 元数据 |

Group、Policy 规则见 [Group 与 Policy](/concepts/groups-and-policies)。

### Telemetry

类：`latentos::sdk::telemetry::TelemetryClient`

| API | 说明 |
| --- | --- |
| `SubscribeImu(callback)` / `GetLatestImu()` | 订阅/读取加速度、角速度和姿态四元数 |
| `SubscribeGnss(callback)` / `GetLatestGnss()` | 订阅/读取定位、速度、精度与卫星状态 |

### Low Level

类：`latentos::sdk::low_level::LowLevelClient`

| API | 说明 |
| --- | --- |
| `SubscribeJointState(callback)` / `GetLatestJointState()` | 订阅/读取关节状态 |
| `SendJointCommand(command)` | 发送 MIT 风格的直接关节命令 |

:::warning
`SendJointCommand()` 不经过运动控制仲裁，错误的目标值或控制模式可能导致机器狗突然运动或摔倒。仅在吊架、急停和直接关节控制模式均已确认时使用。
:::

### Power

类：`latentos::sdk::power::PowerClient`

| API | 说明 |
| --- | --- |
| `SubscribeSummary(callback)` / `GetLatestSummary()` | 整机电源摘要 |
| `SubscribeStatus(callback)` / `GetLatestStatus()` | 电源轨、故障、风扇及固件状态 |
| `SubscribeBattery(callback)` / `GetLatestBattery()` | 当前活动电池的电量、电压、电流及充放电状态 |
| `SubscribeEvent(callback)` / `GetLatestEvent()` | PMU 事件 |
| `SetPowerRail()` | 开关指定电源轨 |
| `SetPowerLight()` | 开关指定灯光 |
| `SetPowerFanSpeed()` | 设置风扇速度百分比 |
| `ClearPowerFaults()` | 清除当前故障 |
| `QueryPowerVersion()` | 查询 PMU 固件版本 |

电源控制会影响真实硬件。执行前应确认目标、当前状态以及现场安全条件，并检查 `PowerControlResult.ok`、`accepted` 和 `result_code`。

#### 电池充放电状态

`GetLatestBattery()` 返回的 `BatteryStatus.power_state` 是归一化后的整机状态：

| 枚举值 | `ToString()` | 含义 |
| --- | --- | --- |
| `BatteryPowerState::Charging` | `charging` | 正在充电 |
| `BatteryPowerState::Discharging` | `discharging` | 正在放电 |
| `BatteryPowerState::NotCharging` | `not_charging` | 当前既未充电也未放电 |
| `BatteryPowerState::Full` | `full` | 电池已充满 |
| `BatteryPowerState::Unknown` | `unknown` | 数据过期、状态冲突或无法识别 |

```cpp showLineNumbers
power.SubscribeBattery({});
if (auto battery = power.GetLatestBattery();
    battery && battery->ok && battery->present && !battery->stale) {
  if (battery->power_state == latentos::sdk::BatteryPowerState::Charging) {
    // 正在充电。
  }
}
```

这不是向机器狗发起的独立查询：先调用 `SubscribeBattery()`，收到数据后再由 `GetLatestBattery()` 读取本地最新值。

### Camera

类：`latentos::sdk::camera::CameraClient`

| API | 说明 |
| --- | --- |
| `QueryCapabilities()` | 查询全部或指定相机的能力 |
| `SetControl()` | 设置曝光、增益等受支持控件，返回 `seq` |
| `SendStreamCommand()` | 启动、停止或重启推流，返回 `seq` |
| `SetStreamParams()` | 设置分辨率、帧率和码率，返回 `seq` |
| `Subscribe*Status(callback)` / `GetLatest*Status()` | 订阅/读取上述异步操作的状态 |

调用前先通过 `QueryCapabilities()` 判断相机与功能是否可用。设置接口成功发送不等于相机已经完成操作，应继续核对对应状态中的 `seq` 和结果码。

完整使用流程（网络配置、能力表、开流演示、官方示例命令）见 [相机控制](/examples/camera)。类型与结果码见 [Camera API](/api/cpp/camera)。

### Nav

类：`latentos::sdk::nav::NavClient`

| API | 说明 |
| --- | --- |
| `AdvertisePointCloudStream(ip, port, enabled)` | 周期广播点云流端点及启用状态 |

## 下一步

- [C++ API Reference](/api/cpp)：公开类、方法、数据类型和枚举索引
- [在 C++ 工程中使用](/integrate/cpp)：完整的 CMake 与代码示例
- [运行示例](/examples)：按模块验证安装和连接
- [相机控制](/examples/camera)：查询能力、推流与热控件
- [常见问题](/faq)：排查 CMake、动态库和连接问题

## 1.0.x 名称兼容

SDK 1.1 暂时保留旧 CMake package、头文件路径和命名空间别名，供已有 1.0.x 源码重新编译。新项目只使用本页所列的 `latentos_sdk*`、`latentos::sdk*` 和 `<latentos/sdk/...>` 名称；旧二进制程序不保证可直接替换为 1.1 动态库。
