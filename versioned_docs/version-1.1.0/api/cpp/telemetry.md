---
sidebar_label: Telemetry
---

# Telemetry API

`telemetry` 模块提供只读传感器流：

- **IMU**：加速度、角速度、姿态四元数。
- **GNSS**：定位、速度、精度与卫星状态。

本模块只有订阅与缓存读取，没有控制命令。

应用侧至少包含 Session 与 Telemetry Client 头文件；`imu.h` / `gnss.h` 已由后者间接引入，需要单独使用数据类型时可再显式包含：

```cpp
#include <latentos/sdk/core/session.h>
#include <latentos/sdk/telemetry/telemetry_client.h>
```

CMake 中查找并链接对应模块包。安装前缀需已加入 `CMAKE_PREFIX_PATH`（常见为 `/data/latentos/sdk_cpp`）：

```cmake
find_package(latentos_sdk_telemetry CONFIG REQUIRED)
target_link_libraries(my_app PRIVATE latentos::sdk_telemetry)
```

入口类为 `latentos::sdk::telemetry::TelemetryClient`，构造时传入已配置好的 `core::Session`。公开方法如下：

```cpp showLineNumbers
explicit TelemetryClient(core::Session& session);

void SubscribeImu(ImuCallback callback);
std::optional<ImuState> GetLatestImu() const;

void SubscribeGnss(GnssCallback callback);
std::optional<GnssState> GetLatestGnss() const;
```

## 方法

| 方法 | 说明 |
| --- | --- |
| `SubscribeImu(callback)` | 启动对 `latentos/imu` 的订阅，并缓存最新值。无回调需求时传入 `{}` |
| `GetLatestImu()` | 读取 IMU 本地缓存；不做 I/O。尚未收到第一帧时返回 `std::nullopt` |
| `SubscribeGnss(callback)` | 启动对 `latentos/gnss/navigation` 的订阅，并缓存最新值 |
| `GetLatestGnss()` | 读取 GNSS 本地缓存；不做 I/O。尚未收到第一帧时返回 `std::nullopt` |

必须先 `Subscribe*()`，`GetLatest*()` 才会开始有数据。回调可能在 Echo I/O 线程执行，回调内避免长时间阻塞。`Session` 与 `TelemetryClient` 在订阅和回调存活期间必须保持有效。

IMU 给出的是机身朝向与惯性测量，**不包含**地图坐标系下的位置。关节角见 [Low Level](./low-level.md)。

## ImuState

头文件：`<latentos/sdk/telemetry/imu.h>`  
类型：`latentos::sdk::ImuState`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `send_time_ns` | `std::int64_t` | 消息发送时间，单位 ns |
| `ax`、`ay`、`az` | `double` | 三轴加速度，m/s² |
| `wx`、`wy`、`wz` | `double` | 三轴角速度，rad/s |
| `qx`、`qy`、`qz`、`qw` | `double` | 姿态四元数 |

### 读取 ImuState（轮询）

```cpp showLineNumbers
#include <latentos/sdk/core/session.h>
#include <latentos/sdk/telemetry/telemetry_client.h>

#include <chrono>
#include <iostream>
#include <thread>
#include <utility>

latentos::sdk::SdkOptions options;
options.client_config_path = "config/echo/mode/client.yaml";
latentos::sdk::core::Session session(std::move(options));
latentos::sdk::telemetry::TelemetryClient telemetry(session);

telemetry.SubscribeImu({});

for (int waited_ms = 0; waited_ms < 5000; waited_ms += 50) {
  const auto imu = telemetry.GetLatestImu();
  if (!imu.has_value()) {
    std::this_thread::sleep_for(std::chrono::milliseconds(50));
    continue;
  }

  std::cout << "acc=(" << imu->ax << ", " << imu->ay << ", " << imu->az << ") "
            << "gyro=(" << imu->wx << ", " << imu->wy << ", " << imu->wz << ") "
            << "quat=(" << imu->qx << ", " << imu->qy << ", " << imu->qz
            << ", " << imu->qw << ")\n";
  break;
}
```

### 读取 ImuState（回调）

```cpp showLineNumbers
telemetry.SubscribeImu([](const latentos::sdk::ImuState& imu) {
  // 使用 imu.qx/qy/qz/qw 更新姿态显示
  (void)imu;
});
```

## GnssState

头文件：`<latentos/sdk/telemetry/gnss.h>`  
类型：`latentos::sdk::GnssState`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `sample_time_ns` | `std::int64_t` | 采样时间，ns |
| `sequence` | `std::int64_t` | 消息序号 |
| `valid` | `bool` | 定位结果是否有效 |
| `fix_type` | `std::int32_t` | 定位类型 |
| `satellites_used` | `std::int32_t` | 使用的卫星数 |
| `hdop` | `double` | 水平精度因子 |
| `latitude`、`longitude`、`altitude` | `double` | 经纬度与高度 |
| `vel_e`、`vel_n`、`vel_d` | `double` | 东、北、下方向速度，m/s |
| `h_acc`、`v_acc` | `double` | 水平与垂直精度 |

读取前检查 `std::optional` 是否有值；GNSS 还应检查 `valid`，不要只依据经纬度是否为零。

### 读取 GnssState（轮询）

```cpp showLineNumbers
telemetry.SubscribeGnss({});

for (int waited_ms = 0; waited_ms < 5000; waited_ms += 50) {
  const auto gnss = telemetry.GetLatestGnss();
  if (!gnss.has_value()) {
    std::this_thread::sleep_for(std::chrono::milliseconds(50));
    continue;
  }
  if (!gnss->valid) {
    // 有消息但定位无效
    break;
  }
  std::cout << "lat=" << gnss->latitude
            << " lon=" << gnss->longitude
            << " alt=" << gnss->altitude << '\n';
  break;
}
```

完整可运行示例见 `latentos_sdk_example` 中的 `get_imu`、`subscribe_imu`、`get_gnss`、`subscribe_gnss`。

## 相关文档

- [C++ SDK 指南](../../sdk/cpp.md)
- [Low Level API](./low-level.md)（关节角）
- [示例总览](../../examples/index.md)
