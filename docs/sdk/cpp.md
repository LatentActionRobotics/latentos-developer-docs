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

```cpp
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

```cpp
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

```cpp
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

```cpp
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

### Nav

类：`latentos::sdk::nav::NavClient`

| API | 说明 |
| --- | --- |
| `AdvertisePointCloudStream(ip, port, enabled)` | 周期广播点云流端点及启用状态 |

## 相机 SDK 使用流程

机器狗上往往存在多个相机，我们用方向 + index 来区分某个相机，如果前后各一个相机，则为 front_0 和 back_0。下面以 `front_0` 为例，完成连接机器狗、查询相机能力、打开视频流、调整热控件、修改流参数和关闭流。

### 1. 配置连接和网络

修改示例中的 `config/echo/mode/client.yaml`，将 `connect.endpoints` 指向机器狗可达的 IP 和 Echo 监听端口。保留文件中的其他配置：

```yaml
mode: client
connect:
  endpoints:
    - tcp/192.168.30.245:7447
```

通过图传通道连接时，常用地址为 `192.168.30.*`；通过机器狗热点连接时，常用地址为 `10.13.1.1`，对应配置为 `tcp/10.13.1.1:7447`。以实际交付网络为准，`7447` 是 SDK 控制端口。

在开发机检查控制通道：

```bash
ROBOT_IP=192.168.30.245  # 热点连接时改为 10.13.1.1
ping -c 3 "$ROBOT_IP"
nc -vz -w 2 "$ROBOT_IP" 7447
```

打开视频流时还需要传入 `rtsp_ip`，通常也使用所选通道的上述 IP。机器狗视频服务会据此选择同网段的本地接口；任意填写一个 IP 并不能建立视频连接。

### 2. 查询相机能力

相机能力由机器狗端提供，客户端不需要自行注册或声明能力。创建 `core::Session` 和 `camera::CameraClient` 后，调用 `QueryCapabilities("front_0")` 获取 `CameraCapabilities`。

下面是一次 `front_0` 实测能力的整理，其他相机或固件版本应以实际查询结果为准：

| 采集格式 | 支持的分辨率与帧率 |
| --- | --- |
| MJPEG | 1920×1080@60、1280×720@60、800×600@60、640×480@60 |
| YUYV | 1920×1080@5、1280×720@10、800×600@20、640×480@30 |

`streaming=false current=0x0@0 fmt=none bitrate_kbps=0` 表示当前未推流，不表示相机没有能力。`message=cached` 表示返回缓存的能力；需要刷新时可调用 `QueryCapabilities("front_0", true, 3000)`。

| 控件 | FEATURE 整数 / C++ 枚举后缀 | 当前值 | 范围 | 默认值 | flags |
| --- | --- | --- | --- | --- | --- |
| 亮度 | 100 / `Brightness` | 0 | -128～127 | 0 | none |
| 对比度 | 101 / `Contrast` | 34 | 0～64 | 34 | none |
| 饱和度 | 102 / `Saturation` | 56 | 0～128 | 56 | none |
| 色调 | 103 / `Hue` | 0 | -180～180 | 0 | none |
| Gamma | 104 / `Gamma` | 100 | 1～500 | 100 | none |
| 增益 | 105 / `Gain` | 0 | 0～63 | 32 | none |
| 锐度 | 106 / `Sharpness` | 6 | 0～25 | 6 | none |
| 背光补偿 | 107 / `BacklightCompensation` | 0 | 0～1 | 0 | none |
| 抗频闪 | 108 / `PowerLineFrequency` | 1 | 0～2 | 1 | none |
| 自动白平衡 | 109 / `WhiteBalanceTemperatureAuto` | 1 | 0～1 | 1 | none |
| 白平衡色温 | 110 / `WhiteBalanceTemperature` | 4000 | 2800～6500 | 4000 | inactive |
| 自动曝光模式 | 111 / `ExposureAuto` | 3 | 0～3 | 3 | none |
| 手动曝光 | 112 / `ExposureAbsolute` | 313 | 1～5000 | 313 | inactive |

这次查询中的控件步长均为 1。设置时遵守实际返回的 `min`、`max`、`step` 和 `flags`；默认值不一定等于当前值。`inactive` 表示当前模式下不可设置，例如自动白平衡启用时手动色温不可用。先调整对应自动模式，收到成功回复后刷新能力，确认手动控件已可用再设置。

### 3. 完整 C++ 示例

将下面代码保存为 `camera_demo.cc`。程序按顺序发送请求，每次等待相同 `camera_id` 和 `seq` 的结果；先建立状态订阅，再发送命令。示例适用于由本程序独占控制的相机，会修改亮度和流参数，并在结束时关闭流；这些设置不会自动恢复。

```cpp
#include <latentos/sdk/camera/camera_client.h>
#include <latentos/sdk/core/session.h>

#include <algorithm>
#include <chrono>
#include <cstdint>
#include <exception>
#include <iostream>
#include <stdexcept>
#include <string>
#include <thread>
#include <utility>

namespace sdk = latentos::sdk;
using namespace std::chrono_literals;

// 单相机、串行请求示例。并发控制时应在回调中按 camera_id + seq 保存结果，
// 避免 GetLatest*() 的缓存被其他回复覆盖。
template <typename ReadStatus>
auto WaitStatus(ReadStatus read, const std::string& id, std::int64_t seq) {
  const auto deadline = std::chrono::steady_clock::now() + 5s;
  while (std::chrono::steady_clock::now() < deadline) {
    auto status = read();
    if (status && status->camera_id == id && status->seq == seq) {
      std::cout << "seq=" << seq << " ok=" << status->ok
                << " result_code=" << sdk::ToString(status->result_code)
                << " message=" << status->result_message << '\n';
      if (!status->ok) {
        throw std::runtime_error("相机操作失败：" + status->result_message);
      }
      return *status;
    }
    std::this_thread::sleep_for(50ms);
  }
  throw std::runtime_error("等待相机回复超时，seq=" + std::to_string(seq));
}

// 打开流需要需要给出 ip 地址，一般为 192.168.30.*（图传通道）和 10.13.1.1（热点）
// 执行该请求后会给出回复，回复中包含流地址 - uri 字段
int main(int argc, char** argv) {
  if (argc != 3) {
    std::cerr << "用法：camera_demo <client.yaml> <rtsp_ip>\n";
    return 2;
  }
  try {
    const std::string id = "front_0";
    const std::string rtsp_ip = argv[2];
    sdk::SdkOptions options;
    options.client_config_path = argv[1];
    sdk::core::Session session(std::move(options));
    sdk::camera::CameraClient camera(session);

    camera.SubscribeStreamStatus({});
    camera.SubscribeControlStatus({});
    camera.SubscribeStreamParamsStatus({});

    // 声明能力结果对象并查询。不要把某次实测能力当作所有设备的固定能力。
    const sdk::CameraCapabilities caps = camera.QueryCapabilities(id, true, 3000);
    if (!caps.ok || caps.result_code != sdk::CameraCapabilitiesResultCode::Ok) {
      throw std::runtime_error("能力查询失败：" + caps.result_message);
    }
    const auto info = std::find_if(caps.cameras.begin(), caps.cameras.end(),
                                 [&](const auto& c) { return c.id == id; });
    if (info == caps.cameras.end()) {
      throw std::runtime_error("能力回复中没有 front_0");
    }
    for (const auto& p : info->profiles) {
      std::cout << sdk::ToString(p.format) << ' ' << p.width << 'x'
                << p.height << '@' << p.fps << '\n';
    }
    for (const auto& c : info->controls) {
      std::cout << sdk::ToString(c.feature) << " feature="
                << static_cast<std::int32_t>(c.feature) << " value=" << c.value
                << " range=" << c.min << ".." << c.max << " step=" << c.step
                << " flags=" << sdk::CameraControlFlagsToString(c.flags) << '\n';
    }
    if (info->streaming) {
      throw std::runtime_error("相机已在推流，请先停止后再运行此演示");
    }

    auto streamCommand = [&](sdk::CameraOperation op) {
      const auto seq = camera.SendStreamCommand(id, op, rtsp_ip);
      return WaitStatus([&] { return camera.GetLatestStreamStatus(); }, id, seq);
    };
    auto stopStream = [&] {
      const auto stopped = streamCommand(sdk::CameraOperation::Stop);
      if (stopped.enabled || stopped.stream_state != sdk::CameraStreamState::Stopped) {
        throw std::runtime_error("尚未确认流已停止");
      }
      std::cout << "流已关闭\n";
    };

    // 即使开流回复超时，请求也可能已执行，因此异常路径同样尝试关闭。
    try {
      const auto started = streamCommand(sdk::CameraOperation::Start);
      if (!started.enabled || started.stream_state != sdk::CameraStreamState::Running
          || started.uri.empty()) {
        throw std::runtime_error("未获得运行中的视频流和有效 URI");
      }
      std::cout << "请用 RTSP 播放器打开：" << started.uri << '\n';

      // 热控件：亮度设为 10，立即生效，不重启视频流。
      const auto live = camera.QueryCapabilities(id, true, 3000);
      if (!live.ok) throw std::runtime_error("开流后刷新能力失败");
      bool writable = false;
      for (const auto& cam : live.cameras) {
        if (cam.id != id) continue;
        for (const auto& c : cam.controls) {
          if (c.feature != sdk::CameraFeature::Brightness) continue;
          writable = 10 >= c.min && 10 <= c.max && c.step > 0
              && (10 - c.min) % c.step == 0
              && !sdk::CameraHasControlFlag(c.flags, sdk::CameraControlFlag::Inactive)
              && !sdk::CameraHasControlFlag(c.flags, sdk::CameraControlFlag::ReadOnly)
              && !sdk::CameraHasControlFlag(c.flags, sdk::CameraControlFlag::Disabled)
              && !sdk::CameraHasControlFlag(c.flags, sdk::CameraControlFlag::Grabbed);
        }
      }
      if (!writable) throw std::runtime_error("当前相机不允许将亮度设为 10");
      auto seq = camera.SetControl(id, sdk::CameraFeature::Brightness, 10);
      const auto control = WaitStatus(
          [&] { return camera.GetLatestControlStatus(); }, id, seq);
      std::cout << "实际亮度=" << control.effective_value << '\n';

      // 使用当前采集格式下明确支持的组合；本次能力表两种格式均支持 640×480。
      int fps = 0;
      for (const auto& cam : live.cameras) {
        if (cam.id != id) continue;
        for (const auto& p : cam.profiles) {
          if (p.format == cam.current.format && p.width == 640 && p.height == 480) {
            fps = p.fps;
            break;
          }
        }
      }
      if (fps <= 0) throw std::runtime_error("当前采集格式没有 640×480 可用档位");
      // bitrate_kbps=0 表示保留当前码率。修改参数会短暂重启流。
      seq = camera.SetStreamParams(id, 640, 480, fps, 0);
      const auto params = WaitStatus(
          [&] { return camera.GetLatestStreamParamsStatus(); }, id, seq);
      std::cout << "实际参数=" << params.effective_width << 'x'
                << params.effective_height << '@' << params.effective_fps
                << " bitrate_kbps=" << params.effective_bitrate_kbps << '\n';

      std::cout << "可查看画面；按 Enter 关闭流并退出。" << std::endl;
      std::cin.get();
      stopStream();
    } catch (...) {
      const auto error = std::current_exception();
      try {
        stopStream();
      } catch (const std::exception& e) {
        std::cerr << "关闭流未确认成功：" << e.what() << '\n';
      }
      std::rethrow_exception(error);
    }
    return 0;
  } catch (const std::exception& e) {
    std::cerr << e.what() << '\n';
    return 1;
  }
}
```

同目录创建 `CMakeLists.txt`：

```cmake
cmake_minimum_required(VERSION 3.20)
project(camera_demo LANGUAGES CXX)
find_package(latentos_sdk_camera CONFIG REQUIRED)
find_package(Threads REQUIRED)
add_executable(camera_demo camera_demo.cc)
target_compile_features(camera_demo PRIVATE cxx_std_20)
target_link_libraries(camera_demo PRIVATE latentos::sdk_camera Threads::Threads)
```

按 SDK 默认安装位置编译并运行：

```bash
cmake -S . -B build \
  -DCMAKE_PREFIX_PATH="/data/latentos/sdk_cpp;/data/latentos/sdk_runtime;/data/latentos/sdk_runtime/third_party"
cmake --build build -j
./build/camera_demo /绝对路径/config/echo/mode/client.yaml 192.168.30.*
# 热点连接：同时确认 client.yaml 指向热点控制地址
# ./build/camera_demo /绝对路径/config/echo/mode/client.yaml 10.13.1.1
```

### 4. C++ SDK 示例使用

具体环境安装请参见 latentos_sdk_example README.md 文档，以下是使用示例：

### camera_capabilities

查询相机能力（清单 / 支持档位 / 可调控件）。`camera_id` 留空=全部相机。

用法：`camera_capabilities [camera_id] [--client-config PATH]`

```bash
./build/examples/camera_capabilities --client-config "$CLIENT"
./build/examples/camera_capabilities front_0 --client-config "$CLIENT"
```

### camera_set_control

设置一个热控件（立即生效，不断流）。命令异步下发，示例按 `seq` 等回执（约 3s）。`feature` 取能力表里的 `FEATURE_*` 整数（如 100=亮度、108=抗频闪）。

用法：`camera_set_control <camera_id> <feature> <value> [--client-config PATH]`

```bash
./build/examples/camera_set_control front_0 100 128 --client-config "$CLIENT"
```

### camera_set_stream

开 / 停 / 重启推流。示例按 `seq` 等回执（约 5s），成功时打印 `uri`。可选 `rtsp_ip` 用于选本机同网段网卡。

用法：`camera_set_stream <camera_id> <start|stop|restart> [rtsp_ip] [--client-config PATH]`

```bash
./build/examples/camera_set_stream front_0 start 192.168.144.1 --client-config "$CLIENT"
./build/examples/camera_set_stream front_0 stop --client-config "$CLIENT"
```

### camera_set_stream_params

改分辨率 / 帧率 / 码率（校验后短时 Stop+Start）。每项 `0`=不改。示例按 `seq` 等回执并打印生效档。

用法：`camera_set_stream_params <camera_id> <width> <height> <fps> <bitrate_kbps> [--client-config PATH]`

```bash
./build/examples/camera_set_stream_params front_0 1280 720 30 4000 --client-config "$CLIENT"
```

更多类型与结果码见 [Camera API](/api/cpp/camera)。

## 下一步

- [C++ API Reference](/api/cpp)：公开类、方法、数据类型和枚举索引
- [在 C++ 工程中使用](/integrate/cpp)：完整的 CMake 与代码示例
- [运行示例](/examples)：按模块验证安装和连接
- [常见问题](/faq)：排查 CMake、动态库和连接问题

## 1.0.x 名称兼容

SDK 1.1 暂时保留旧 CMake package、头文件路径和命名空间别名，供已有 1.0.x 源码重新编译。新项目只使用本页所列的 `latentos_sdk*`、`latentos::sdk*` 和 `<latentos/sdk/...>` 名称；旧二进制程序不保证可直接替换为 1.1 动态库。
