---
sidebar_label: 相机控制
---

# 相机控制

通过 `camera::CameraClient` 查询能力、开/停推流、调整热控件，以及修改分辨率 / 帧率 / 码率。配套命令行示例在 `latentos_sdk_example` 的 `camera/` 模块；本页先讲调用流程，再对照官方示例命令。

机器狗上往往有多个相机，用「方向 + index」区分，例如前后各一颗时为 `front_0`、`back_0`。下文以 `front_0` 为例。

API 类型与结果码见 [Camera API](/api/cpp/camera)；模块总览见 [C++ SDK 指南](/sdk/cpp)。

若在板端直接使用 OAK-D / DepthAI 等厂商 SDK，见 [选装设备](/peripherals)（与本页的 LatentOS 相机 API 不同）。

先完成 [安装](/getting-started/install) 和 [连接配置](/getting-started/connect)。后文 `$CLIENT` 含义见 [示例总览](/examples)。

## 1. 配置连接和网络

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

## 2. 查询相机能力

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

## 3. 完整 C++ 示例

将下面代码保存为 `camera_demo.cc`。程序按顺序发送请求，每次等待相同 `camera_id` 和 `seq` 的结果；先建立状态订阅，再发送命令。示例适用于由本程序独占控制的相机，会修改亮度和流参数，并在结束时关闭流；这些设置不会自动恢复。

```cpp showLineNumbers
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

// 打开流需要给出 ip 地址，一般为 192.168.30.*（图传通道）和 10.13.1.1（热点）
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

## 4. 官方示例命令

具体环境安装请参见 `latentos_sdk_example` 的 README。编译方式见 [示例总览](/examples) 的 C++ 小节。

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
