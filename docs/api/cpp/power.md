---
sidebar_label: Power
---

# Power API

```cpp
#include <latentos/sdk/power/power_client.h>
```

```cmake
find_package(latentos_sdk_power CONFIG REQUIRED)
target_link_libraries(my_app PRIVATE latentos::sdk_power)
```

类：`latentos::sdk::power::PowerClient`

```cpp showLineNumbers
explicit PowerClient(core::Session& session);

void SubscribeSummary(SummaryCallback callback);
std::optional<PowerSummary> GetLatestSummary() const;
void SubscribeStatus(StatusCallback callback);
std::optional<PowerStatus> GetLatestStatus() const;
void SubscribeBattery(BatteryCallback callback);
std::optional<BatteryStatus> GetLatestBattery() const;
void SubscribeEvent(EventCallback callback);
std::optional<PowerEvent> GetLatestEvent() const;

PowerControlResult SetPowerRail(PowerRail rail, bool on,
                                PowerControlOptions options = {});
PowerControlResult SetPowerLight(PowerLight light, bool on,
                                 PowerControlOptions options = {});
PowerControlResult SetPowerFanSpeed(PowerFan fan, int percent,
                                    PowerControlOptions options = {});
PowerControlResult ClearPowerFaults(PowerControlOptions options = {});
PowerControlResult QueryPowerVersion(PowerControlOptions options = {});
```

## 只读状态

### BatteryStatus

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

### PowerSummary

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
电源轨和风扇控制会直接影响真实硬件。执行前确认目标枚举、当前工作模式和现场条件；不要因为 `ok == true` 就忽略 `accepted` 与 `result_code`。
:::

电池充放电示例见 [电池状态](/examples/battery)。
