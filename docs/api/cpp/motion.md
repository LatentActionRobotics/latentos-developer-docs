---
sidebar_label: Motion
---

# Motion API

```cpp
#include <latentos/sdk/motion/motion_client.h>
```

```cmake
find_package(latentos_sdk_motion CONFIG REQUIRED)
target_link_libraries(my_app PRIVATE latentos::sdk_motion)
```

类：`latentos::sdk::motion::MotionClient`

```cpp showLineNumbers
explicit MotionClient(core::Session& session);

CommandResult SwitchGroup(std::string target_group,
                          std::string policy,
                          CommandOptions options);
CommandResult SwitchCurrentPolicy(std::string policy,
                                  CommandOptions options);
MotionControlState QueryMotionControlState(QueryOptions options);
CommandResult QueryPolicyOperation(std::string operation_id,
                                   CommandOptions options);
CommandResult SetVelocitySmoothing(bool enabled, CommandOptions options);
CommandResult SetRemoteVelocityControl(bool enabled, CommandOptions options);
void SendVelocity(double x, double y, double yaw);
std::string VelocityCandidateTopic() const;
```

模块 Client 的命令方法需要显式传入 Options，可用 `{}` 使用默认值。

## 方法

| 方法 | 说明 |
| --- | --- |
| `SwitchGroup` | 切换 Group；需要 Policy 的 Group 必须同时传入 |
| `SwitchCurrentPolicy` | 在当前 Group 内切换 Policy |
| `QueryMotionControlState` | 查询当前/目标 Group 与是否正在切换 |
| `QueryPolicyOperation` | 使用 `operation_id` 查询异步 Policy 操作 |
| `SetVelocitySmoothing` | 启用或关闭速度平滑 |
| `SetRemoteVelocityControl` | 启用或关闭遥控速度输入 |
| `SendVelocity` | 发送 SE(2) 速度：`x`、`y` 为 m/s，`yaw` 为 rad/s |
| `VelocityCandidateTopic` | 返回速度 Publisher 的只读 Topic 元数据，不能用于修改发送目标 |

`SendVelocity()` 应按控制周期持续调用。操作机器人前请先确认 Group、控制权、速度范围和现场安全条件。

## CommandOptions

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `timeout_ms` | `int` | `1000` | 等待回复的超时时间 |
| `force` | `bool` | `false` | 请求强制执行；目标端仍可拒绝 |
| `expected_group` | `std::string` | 空 | 可选的当前 Group 前置条件 |
| `command_id` | `std::string` | 空 | 可选命令 ID；为空时由 SDK 生成 |

## CommandResult

| 字段 | 说明 |
| --- | --- |
| `ok` | 是否成功收到并解析回复 |
| `accepted` | 目标端是否接受命令 |
| `result_code` | `MotionResultCode` |
| `operation_state` | `MotionOperationState` |
| `completed` | 操作是否已经完成 |
| `message` | 可读结果信息 |
| `command_id` / `operation_id` | 命令及异步操作标识 |
| `current_group` | 回复时的当前 Group |
| `effective_target_group` | 实际目标 Group |
| `current_policy` | 回复时的当前 Policy |
| `effective_target_policy` | 实际目标 Policy |

### MotionResultCode

`Unknown`、`Ok`、`Accepted`、`Rejected`、`InvalidArgument`、`BusyTransition`、`Conflict`、`UnsupportedCommand`、`InternalError`、`DuplicatedCommand`。

### MotionOperationState

`Unknown`、`Accepted`、`InProgress`、`Succeeded`、`Failed`。

不要只判断 `ok`：命令成功通常至少要求 `ok && accepted`；需要同步完成的业务还应检查 `completed` 和 `operation_state`。

## QueryOptions 与 MotionControlState

`QueryOptions`：

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `timeout_ms` | `int` | `1000` | 查询超时 |
| `request_id` | `std::string` | 空 | 可选请求 ID |

`MotionControlState`：

| 字段 | 说明 |
| --- | --- |
| `ok` | 查询是否成功 |
| `result_code` | `MotionQueryResultCode` |
| `message` / `request_id` | 结果说明和请求标识 |
| `current_group` / `target_group` | 当前和目标 Group |
| `is_transitioning` | 是否正在切换 Group |

`MotionQueryResultCode` 包含 `Unknown`、`Ok`、`InvalidArgument`、`DecodeFailed`、`SchemaVersionUnsupported`、`InternalError`。

完整使用流程见 [Group 与 Policy](/concepts/groups-and-policies) 和 [运动示例](/examples/switch-group)。
