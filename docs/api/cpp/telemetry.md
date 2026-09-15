---
sidebar_label: Telemetry
---

# Telemetry API

```cpp
#include <latentos/sdk/telemetry/telemetry_client.h>
```

```cmake
find_package(latentos_sdk_telemetry CONFIG REQUIRED)
target_link_libraries(my_app PRIVATE latentos::sdk_telemetry)
```

类：`latentos::sdk::telemetry::TelemetryClient`

```cpp
explicit TelemetryClient(core::Session& session);

void SubscribeImu(ImuCallback callback);
std::optional<ImuState> GetLatestImu() const;
void SubscribeGnss(GnssCallback callback);
std::optional<GnssState> GetLatestGnss() const;
```

不需要回调时传入 `{}`。必须先订阅，`GetLatest*()` 才会开始获得缓存数据。

## ImuState

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `send_time_ns` | `std::int64_t` | 消息发送时间，ns |
| `ax`、`ay`、`az` | `double` | 三轴加速度，m/s² |
| `wx`、`wy`、`wz` | `double` | 三轴角速度，rad/s |
| `qx`、`qy`、`qz`、`qw` | `double` | 姿态四元数 |

## GnssState

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

读取数据前检查 `std::optional` 是否有值；GNSS 数据还应检查 `valid`，不要只依据经纬度是否为零。
