---
sidebar_label: Low Level
---

# Low Level API

```cpp
#include <latentos/sdk/low_level/low_level_client.h>
```

```cmake
find_package(latentos_sdk_low_level CONFIG REQUIRED)
target_link_libraries(my_app PRIVATE latentos::sdk_low_level)
```

类：`latentos::sdk::low_level::LowLevelClient`

```cpp
explicit LowLevelClient(core::Session& session);

void SubscribeJointState(JointStateCallback callback);
std::optional<JointState> GetLatestJointState() const;
void SendJointCommand(const JointCommand& command);
```

## JointState

`JointState` 使用同索引的并行数组描述各关节。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `send_time_ns` | `std::int64_t` | 消息发送时间，ns |
| `joint_num` | `std::int32_t` | 关节数量 |
| `name` | `std::vector<std::string>` | 关节名称 |
| `position` | `std::vector<double>` | 关节位置 |
| `velocity` | `std::vector<double>` | 关节速度 |
| `effort` | `std::vector<double>` | 关节力矩/作用力 |
| `motor_temp` / `pcb_temp` | `std::vector<std::int16_t>` | 电机与驱动板温度 |
| `state_num` / `err_num` | `std::vector<std::int16_t>` | 状态码与错误码 |
| `heart` | `std::vector<std::int16_t>` | 心跳值 |

读取数组前应以实际数组长度为准，不要只信任 `joint_num`。

## JointCommand

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `name` | `std::vector<std::string>` | 关节名称 |
| `position` | `std::vector<double>` | 目标位置 |
| `velocity` | `std::vector<double>` | 目标速度 |
| `effort` | `std::vector<double>` | 前馈力矩/作用力 |
| `stiffness` | `std::vector<double>` | 刚度增益 |
| `damping` | `std::vector<double>` | 阻尼增益 |
| `max_effort` | `std::vector<double>` | 最大输出限制 |
| `heart` | `std::vector<std::int16_t>` | 心跳值 |

所有并行数组应具有相同长度；SDK 使用 `position.size()` 作为关节数。

:::danger
`SendJointCommand()` 直接发送关节目标，不经过运动控制仲裁。使用前必须让机器人进入直接关节模式（例如 `joint_test`），停止冲突的控制源，并准备吊架和急停。错误命令可能导致机器人突然运动或摔倒。
:::
