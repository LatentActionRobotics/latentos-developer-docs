---
sidebar_label: 运动控制（Motion）
---

# Motion API

`motion` 模块面向高层运动控制：

- 切换 Group / Policy，查询运动状态与策略授权快照。
- 启停速度平滑、遥控速度输入。
- 按控制周期发送 SE(2) 速度（`x`、`y` 为 m/s，`yaw` 为 rad/s）。

操作真机前请确认当前 Group、控制权、速度范围和现场安全条件。

<a id="groups-and-policies"></a>

## Group 与 Policy

**Group** 是运动控制的运行态（如站立、行走）；**Policy** 是挂在需要策略推理的 Group 下的运行时槽位。切换命令必须使用目标机上真实存在、且当前规则允许切到的名字。

| 类型 | 名称 | 说明 |
| --- | --- | --- |
| 无 Policy 的 Group | `standby`、`passive`、`stand`、`sit_down`、`joint_test`（部分机型另有 `recovery`） | `SwitchGroup` 的 policy 传空字符串 |
| 必须带 Policy 的 Group | `locomotion`、`motion_tracking` | 不带 policy 会在本地直接失败 |

切换时传的是**槽位名**（如 `default`、`policy1`），不是 App 展示名，也不是稳定授权 ID（`policy_id`）。

### 基础 Policy

下列为多数机型共用的 `locomotion` 基础策略（切换请用「槽位名」列）：

| 槽位名 | 展示名 | 稳定 ID（`policy_id`） | 说明 |
| --- | --- | --- | --- |
| `default` | 综合地形 | `all_terrain` | 默认行走策略，适合平地和一般起伏地形 |
| `policy1` | 相位模式 | `phase_gait` | 相位步态行走，节律更明确 |

个别硬件可能没有 `policy1`。其它 locomotion 槽位（如高速、高台、匍匐等）以及 `motion_tracking`（如 `backflip`）因机型而异，以本机实际可用策略为准；可用 `QueryPolicyStatus()` 查看候选与已加载策略。

**何时切 Group / Policy：**

- 换运行态（如 `stand` → 行走、坐下）→ `SwitchGroup`
- 已在 `locomotion` / `motion_tracking` 内只换策略 → `SwitchCurrentPolicy`
- 切「相位模式」：`SwitchGroup("locomotion", "policy1", …)`，或已在 locomotion 时 `SwitchCurrentPolicy("policy1", …)`；不要传 `相位模式` 或 `phase_gait`

常见切换顺序（以目标机 `group_rules` 为准）：

```text
standby → passive / stand
stand   → locomotion / passive / sit_down
locomotion → passive / sit_down / motion_tracking
```

上电后走到可发速度：

```text
passive → stand → locomotion default → SendVelocity
```

可用 `QueryMotionControlState` 查看 `current_group` / `target_group` / `is_transitioning`。

应用侧至少包含 Session 与 Motion Client 头文件；结果与枚举类型头文件已由后者间接引入，需要单独使用时可再显式包含 `result.h` / `codes.h`：

```cpp
#include <latentos/sdk/core/session.h>
#include <latentos/sdk/motion/motion_client.h>
```

CMake 中查找并链接对应模块包。安装前缀需已加入 `CMAKE_PREFIX_PATH`（常见为 `/data/latentos/sdk_cpp`）：

```cmake
find_package(latentos_sdk_motion CONFIG REQUIRED)
target_link_libraries(my_app PRIVATE latentos::sdk_motion)
```

入口类为 `latentos::sdk::motion::MotionClient`，构造时传入已配置好的 `core::Session`。公开方法如下：

```cpp showLineNumbers
explicit MotionClient(core::Session& session);

CommandResult SwitchGroup(std::string target_group,
                          std::string policy,
                          CommandOptions options);
CommandResult SwitchCurrentPolicy(std::string policy,
                                  CommandOptions options);
MotionControlState QueryMotionControlState(QueryOptions options);
PolicyStatus QueryPolicyStatus(QueryOptions options = {});
CommandResult QueryPolicyOperation(std::string operation_id,
                                   CommandOptions options);
CommandResult SetVelocitySmoothing(bool enabled, CommandOptions options);
CommandResult SetRemoteVelocityControl(bool enabled,
                                       CommandOptions options = {},
                                       int remote = 2);
void SendVelocity(double x, double y, double yaw);
std::string VelocityCandidateTopic() const;
```

模块 Client 的命令方法需要显式传入 Options，可用 `{}` 使用默认值。

## 方法

| 方法 | 说明 |
| --- | --- |
| `SwitchGroup` | 切换 Group；需要 Policy 的 Group 必须同时传入；无 Policy 的 Group（如 `stand`、`joint_test`）传空字符串 |
| `SwitchCurrentPolicy` | 在当前 Group 内切换 Policy |
| `QueryMotionControlState` | 查询当前/目标 Group 与是否正在切换 |
| `QueryPolicyStatus` | 查询 MC 启动时采用的策略授权快照与候选/已加载策略 |
| `QueryPolicyOperation` | 使用 `operation_id` 查询异步 Policy 操作 |
| `SetVelocitySmoothing` | 启用或关闭速度平滑 |
| `SetRemoteVelocityControl` | 启用或关闭遥控速度输入；`remote`：`1`=SBUS，`2`=F710（默认），`3`=两者 |
| `SendVelocity` | 发送 SE(2) 速度：`x`、`y` 为 m/s，`yaw` 为 rad/s |
| `VelocityCandidateTopic` | 返回速度 Publisher 的只读 Topic 元数据，不能用于修改发送目标 |

`SendVelocity()` 应按控制周期持续调用。不要只判断 `CommandResult.ok`：命令成功通常至少要求 `ok && accepted`；需要同步完成的业务还应检查 `completed` 和 `operation_state`。

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

## PolicyStatus

`QueryPolicyStatus()` 返回 MC 内存中的授权与策略快照。`ok=false` 表示查询失败，此时策略列表为空，不能解释为“没有授权策略”。

| 字段 | 说明 |
| --- | --- |
| `ok` / `result_code` / `message` | 查询结果 |
| `robot_id` | 机器人标识 |
| `entitlement_version` / `entitlement_id` | 本次 MC 启动采用的定制授权 |
| `entitlement_status` | `no_custom` / `valid_custom` / `invalid_custom` |
| `authorization_fingerprint` / `authorization_warning` | 授权快照指纹与提示 |
| `current_group` / `target_group` / `is_transitioning` | 当前运动切换状态 |
| `current_policy` | 整机当前策略；非策略组或切换中可能为空 |
| `groups` | 各组的候选与已加载策略 |

## 调用示例

### 切换 Group

无 Policy 的 Group 传空字符串；需要 Policy 的 Group（如 `locomotion`）必须同时传入：

```cpp showLineNumbers
#include <latentos/sdk/core/session.h>
#include <latentos/sdk/motion/motion_client.h>

#include <iostream>
#include <utility>

latentos::sdk::SdkOptions options;
options.client_config_path = "config/echo/mode/client.yaml";
latentos::sdk::core::Session session(std::move(options));
latentos::sdk::motion::MotionClient motion(session);

latentos::sdk::CommandOptions command_options;
command_options.timeout_ms = 1000;

auto stand = motion.SwitchGroup("stand", "", command_options);
if (!stand.ok || !stand.accepted) {
  std::cerr << stand.message << '\n';
  return;
}

auto loco = motion.SwitchGroup("locomotion", "default", command_options);
std::cout << "ok=" << loco.ok << " accepted=" << loco.accepted
          << " code=" << latentos::sdk::ToString(loco.result_code)
          << " message=" << loco.message << '\n';
```

### 切换 Policy

以「相位模式」为例：切换参数是槽位名 `policy1`，不要传展示名或 `phase_gait`。已在 `locomotion` 时用 `SwitchCurrentPolicy`；若仍在其它 Group，可一次 `SwitchGroup` 进入：

```cpp showLineNumbers
// 已在 locomotion（例如上例刚切到 default）时，组内切到相位模式
auto phase = motion.SwitchCurrentPolicy("policy1", command_options);
if (!phase.ok || !phase.accepted) {
  std::cerr << phase.message << '\n';
  return;
}

// 等价写法：从 stand 等直接进入 locomotion + 相位模式
// auto phase = motion.SwitchGroup("locomotion", "policy1", command_options);
```

### 查询运动状态

```cpp showLineNumbers
latentos::sdk::QueryOptions query_options;
query_options.timeout_ms = 1000;
auto state = motion.QueryMotionControlState(query_options);
if (state.ok) {
  std::cout << "current_group=" << state.current_group
            << " target_group=" << state.target_group
            << " is_transitioning=" << state.is_transitioning << '\n';
}
```

### 发送速度

先关闭可能冲突的遥控输入与平滑（按现场需要），再按周期发送：

```cpp showLineNumbers
if (!motion.SetRemoteVelocityControl(false, {}).accepted) {
  return;
}
if (!motion.SetVelocitySmoothing(false, {}).accepted) {
  return;
}

for (int i = 0; i < 10; ++i) {
  motion.SendVelocity(/*x=*/0.2, /*y=*/0.0, /*yaw=*/0.0);
  std::this_thread::sleep_for(std::chrono::milliseconds(50));
}
```

完整使用流程见上文 [Group 与 Policy](#groups-and-policies) 与示例 `switch_group`、`switch_policy`、`query_motion_state`、`send_velocity`。

## 相关文档

- [C++ SDK 指南](../../sdk/cpp.md)
- [切换 Group](../../examples/switch-group.md)
- [发送速度](../../examples/send-velocity.md)
- [Low Level API](./low-level.md)（直接关节模式 `joint_test`）
