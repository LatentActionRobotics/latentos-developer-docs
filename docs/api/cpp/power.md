---
sidebar_label: Power
---

# Power API

`power` 模块对接 PMU：

- **读**：电源摘要、详细状态、当前活动电池、事件流。
- **写**：开关电源轨/灯光、设置风扇转速、切换电池包、清除故障、查询固件版本。

控制接口会直接影响真实硬件，操作前请确认目标与现场安全条件。

应用侧至少包含 Session 与 Power Client 头文件；电池/状态/控制等数据类型头文件已由后者间接引入：

```cpp
#include <latentos/sdk/core/session.h>
#include <latentos/sdk/power/power_client.h>
```

CMake 中查找并链接对应模块包。安装前缀需已加入 `CMAKE_PREFIX_PATH`（常见为 `/data/latentos/sdk_cpp`）：

```cmake
find_package(latentos_sdk_power CONFIG REQUIRED)
target_link_libraries(my_app PRIVATE latentos::sdk_power)
```

入口类为 `latentos::sdk::power::PowerClient`，构造时传入已配置好的 `core::Session`。公开方法如下：

```cpp showLineNumbers
explicit PowerClient(core::Session& session);

void SubscribeSummary(SummaryCallback callback);
void UnsubscribeSummary();
std::optional<PowerSummary> GetLatestSummary() const;
void SubscribeStatus(StatusCallback callback);
void UnsubscribeStatus();
std::optional<PowerStatus> GetLatestStatus() const;
void SubscribeBattery(BatteryCallback callback);
void UnsubscribeBattery();
std::optional<BatteryStatus> GetLatestBattery() const;
void SubscribeEvent(EventCallback callback);
void UnsubscribeEvent();
std::optional<PowerEvent> GetLatestEvent() const;

PowerControlResult SetPowerRail(PowerRail rail, bool on,
                                PowerControlOptions options = {});
PowerControlResult SwitchBatteryPack(BatteryPack pack,
                                     PowerControlOptions options = {});
PowerControlResult SetPowerLight(PowerLight light, bool on,
                                 PowerControlOptions options = {});
PowerControlResult SetPowerFanSpeed(PowerFan fan, int percent,
                                    PowerControlOptions options = {});
PowerControlResult ClearPowerFaults(PowerControlOptions options = {});
PowerControlResult QueryPowerVersion(PowerControlOptions options = {});
```

## 方法

| 方法 | 说明 |
| --- | --- |
| `SubscribeSummary` / `GetLatestSummary` | 订阅/读取整机电源摘要 |
| `SubscribeStatus` / `GetLatestStatus` | 订阅/读取电源轨、故障、风扇及固件状态 |
| `SubscribeBattery` / `GetLatestBattery` | 订阅/读取当前活动电池 |
| `SubscribeEvent` / `GetLatestEvent` | 订阅/读取 PMU 事件 |
| `Unsubscribe*` | 停止对应订阅；本地已缓存值仍保留 |
| `SetPowerRail` | 开关指定电源轨 |
| `SwitchBatteryPack` | 切换活动电池包；接受后 MOS 状态见 `PowerStatus` |
| `SetPowerLight` | 开关指定灯光 |
| `SetPowerFanSpeed` | 设置风扇速度百分比（0–100） |
| `ClearPowerFaults` | 清除当前故障 |
| `QueryPowerVersion` | 查询 PMU 固件版本 |

只读接口遵循两步式：先 `Subscribe*()`，再 `GetLatest*()`。控制接口为阻塞请求/回复，成功通常至少要求 `ok && accepted`。

## 只读状态

### BatteryStatus

头文件：`<latentos/sdk/power/battery.h>`

SDK 从接入的电池包中选择当前活动包，并提供统一状态。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `ok` | `bool` | 数据是否有效 |
| `stale` | `bool` | 数据是否过期 |
| `present` | `bool` | 电池包是否接入 |
| `pack_index` | `std::int32_t` | 电池包编号 |
| `soc_percent` | `double` | 剩余电量百分比 |
| `remaining_capacity_mah` | `double` | BMS 容量估计，仅供诊断 |
| `voltage_v` / `current_a` | `double` | 电压 V、电流 A |
| `sample_time_ns` / `sequence` | 整数 | 采样时间和消息序号 |
| `message` | `std::string` | 状态说明 |
| `power_state` | `BatteryPowerState` | 整机充放电状态 |

`BatteryPowerState`：`Unknown`、`Charging`、`Discharging`、`NotCharging`、`Full`。使用前同时检查 `ok`、`present` 和 `stale`。

### 读取 BatteryStatus（轮询）

```cpp showLineNumbers
#include <latentos/sdk/core/session.h>
#include <latentos/sdk/power/power_client.h>

#include <chrono>
#include <iostream>
#include <thread>
#include <utility>

latentos::sdk::SdkOptions options;
options.client_config_path = "config/echo/mode/client.yaml";
latentos::sdk::core::Session session(std::move(options));
latentos::sdk::power::PowerClient power(session);

power.SubscribeBattery({});

for (int waited_ms = 0; waited_ms < 5000; waited_ms += 50) {
  const auto battery = power.GetLatestBattery();
  if (!battery.has_value()) {
    std::this_thread::sleep_for(std::chrono::milliseconds(50));
    continue;
  }
  const auto& status = *battery;
  std::cout << "ok=" << status.ok
            << " present=" << status.present
            << " stale=" << status.stale
            << " power_state=" << latentos::sdk::ToString(status.power_state)
            << " soc_percent=" << status.soc_percent
            << " voltage_v=" << status.voltage_v
            << " current_a=" << status.current_a << '\n';
  break;
}
```

### PowerSummary

头文件：`<latentos/sdk/power/summary.h>`

| 字段组 | 说明 |
| --- | --- |
| `send_time_ns`、`sample_time_ns`、`sequence` | 时间与消息序号 |
| `online`、`stale`、`health_level` | 在线、时效与综合健康状态 |
| `work_allowed`、`motion_pause_required` | 是否允许工作、是否要求暂停运动 |
| `scram_active`、`fault_active`、`fault_summary` | 急停与故障摘要 |
| `pack1_connected`、`pack2_connected`、`connected_pack_count` | 电池连接情况 |
| `min_soc_percent`、`min_cell_voltage_v`、`max_temperature_c` | 关键电池安全指标 |

`PowerHealthLevel`：`Unknown`、`Ok`、`Warn`、`Fault`、`Stale`。

### PowerStatus

头文件：`<latentos/sdk/power/status.h>`

| 字段组 | 说明 |
| --- | --- |
| `send_time_ns`、`sample_time_ns`、`sequence`、`stale` | 时间、序号与时效 |
| `firmware_version`、`debug_enabled` | PMU 固件与调试状态 |
| `scram_active`、`fault_active` | 急停与故障状态 |
| `pack1_connected`、`pack2_connected`、`connected_pack_count` | 电池连接情况 |
| `pack1_mos_on`、`pack2_mos_on` | 电池 MOS 状态 |
| `motor_soft_on`、`motor_hv_on`、`external_48v_on` | 电源轨状态 |
| `light1_on`、`light2_on` | 灯光状态 |
| `fault_name`、`fault_description`、`fault_num` | 故障摘要 |
| `fault_detail_name`、`fault_detail_description` | 故障明细数组 |
| `motor_current_a`、`motor_voltage_v` | 电机母线电流和电压 |
| `bat1_5v_v`、`bat1_48v_v`、`bat2_5v_v`、`bat2_48v_v` | 电池电压测量 |
| `fan_num`、`fan_rpm` | 风扇数量和转速 |

### PowerEvent

头文件：`<latentos/sdk/power/event.h>`

| 字段 | 说明 |
| --- | --- |
| `send_time_ns`、`event_time_ns`、`sequence` | 时间与序号 |
| `event_id` | 事件标识 |
| `severity` | `PowerEventSeverity` |
| `event_type` | `PowerEventType` |
| `message` | 可读事件信息 |
| `pack_index` | 相关电池包编号 |
| `fault_name` / `fault_description` | 相关故障信息 |

事件级别：`Info`、`Warn`、`Error`、`Fatal`。

事件类型：`Unknown`、`ScramPressed`、`ScramReleased`、`FaultRaised`、`FaultCleared`、`BatteryConnected`、`BatteryDisconnected`、`StatusStale`、`StatusRecovered`。

## 控制

### 控制目标

| 类型 | 枚举值 |
| --- | --- |
| `PowerRail` | `Legs`、`External48V1`、`External48V2` |
| `BatteryPack` | `Pack1`、`Pack2` |
| `PowerLight` | `White`、`Infrared` |
| `PowerFan` | `Fan1` 至 `Fan6` |

`SetPowerFanSpeed()` 的 `percent` 范围为 0–100。

### PowerControlOptions

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `timeout_ms` | `1000` | 请求超时，ms |
| `force` | `false` | 在 PMU 允许时绕过软联锁；不能绕过硬件安全限制 |
| `reason` | 空 | 操作原因，供目标端记录 |
| `requester` | SDK 默认值 | 请求方标识，通常无需设置 |

### PowerControlResult

| 字段 | 说明 |
| --- | --- |
| `ok` | 是否成功收到并解析回复 |
| `accepted` | PMU 是否接受操作 |
| `result_code` | `PowerControlResultCode` |
| `result_message` | 可读结果说明 |
| `version` | `QueryPowerVersion()` 成功时的版本 |
| `status_refreshed` | 操作后是否已刷新状态 |
| `handled_at_ns` / `request_id` | 处理时间与请求标识 |

结果码包括 `Ok`、`Accepted`、`RejectedByMode`、`RejectedBySafety`、`InvalidArgument`、`DeviceNotOpen`、`DeviceTimeout`、`DeviceError`、`Busy`、`UnsupportedOperation`、`InternalError`。

:::warning
电源轨、电池切换和风扇控制会直接影响真实硬件。执行前确认目标枚举、当前工作模式和现场条件；不要因为 `ok == true` 就忽略 `accepted` 与 `result_code`。
:::

### 控制示例

```cpp showLineNumbers
latentos::sdk::PowerControlOptions control_options;
control_options.timeout_ms = 1000;
control_options.reason = "operator request";

auto rail = power.SetPowerRail(
    latentos::sdk::PowerRail::Legs, /*on=*/true, control_options);
std::cout << "ok=" << rail.ok
          << " accepted=" << rail.accepted
          << " code=" << latentos::sdk::ToString(rail.result_code)
          << '\n';

auto light = power.SetPowerLight(
    latentos::sdk::PowerLight::White, /*on=*/true, control_options);
auto fan = power.SetPowerFanSpeed(
    latentos::sdk::PowerFan::Fan1, /*percent=*/40, control_options);
auto version = power.QueryPowerVersion(control_options);
if (version.ok) {
  std::cout << "pmu version=" << version.version << '\n';
}
```

电池充放电示例见 [电池状态](../../examples/battery.md)；更多控制见 `latentos_sdk_example` 的 `power_control`。

## 相关文档

- [C++ SDK 指南](../../sdk/cpp.md)
- [电池状态](../../examples/battery.md)
- [示例总览](../../examples/index.md)
