---
sidebar_label: 关节底层控制（Low Level）
---

# Low Level API

`low_level` 模块提供关节本体感觉读取，以及 MIT 风格的直接关节命令写入。

- **读**：订阅 `latentos/joint_state`，拿到各关节名称、位置（弧度）、速度、力矩等。
- **写**：向 `latentos/joint_command_mit` 发布目标；不经过运动控制仲裁。

只读关节状态时可直接订阅。写入前必须先让机器人进入直接关节模式（例如 `joint_test`），并做好吊架与急停准备。

应用侧至少包含 Session 与 Low Level Client 头文件；`joint_state.h` / `joint_command.h` 已由后者间接引入，需要单独使用数据类型时可再显式包含：

```cpp
#include <latentos/sdk/core/session.h>
#include <latentos/sdk/low_level/low_level_client.h>
```

CMake 中查找并链接对应模块包。安装前缀需已加入 `CMAKE_PREFIX_PATH`（常见为 `/data/latentos/sdk_cpp`）：

```cmake
find_package(latentos_sdk_low_level CONFIG REQUIRED)
target_link_libraries(my_app PRIVATE latentos::sdk_low_level)
```

入口类为 `latentos::sdk::low_level::LowLevelClient`，构造时传入已配置好的 `core::Session`。公开方法如下：

```cpp showLineNumbers
explicit LowLevelClient(core::Session& session);

void SubscribeJointState(JointStateCallback callback);
void UnsubscribeJointState();
std::optional<JointState> GetLatestJointState() const;
void SendJointCommand(const JointCommand& command);
```

## 方法

| 方法 | 说明 |
| --- | --- |
| `SubscribeJointState(callback)` | 启动对 `latentos/joint_state` 的订阅，并缓存最新值。无回调需求时传入 `{}` |
| `UnsubscribeJointState()` | 停止订阅；本地已缓存的最新值仍保留 |
| `GetLatestJointState()` | 读取本地缓存；不做 I/O。尚未收到第一帧时返回 `std::nullopt` |
| `SendJointCommand(command)` | 立即发布一条 MIT 关节命令；无 ACK、无仲裁 |

与其他订阅型接口相同：必须先 `Subscribe*()`，`GetLatest*()` 才会开始有数据。回调可能在 Echo I/O 线程执行，回调内避免长时间阻塞。`Session` 与 `LowLevelClient` 在订阅和回调存活期间必须保持有效。

`JointState` / `JointCommand` 使用同索引的并行数组。读取或填写数组时以实际 `size()` 为准；发送命令时 SDK 以 `position.size()` 作为关节数。

这里的 `position` 是**关节角（或直线关节位移）**，不是连杆在空间中的笛卡尔位姿。机身姿态请使用 [Telemetry](./telemetry.md) 的 IMU；连杆位姿需结合机型运动学自行计算。

## JointState

头文件：`<latentos/sdk/low_level/joint_state.h>`  
类型：`latentos::sdk::JointState`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `send_time_ns` | `std::int64_t` | 消息发送时间，`CLOCK_REALTIME`，单位 ns |
| `joint_num` | `std::int32_t` | 关节数量（与线上消息一致；遍历时仍以各数组 `size()` 为准） |
| `name` | `std::vector<std::string>` | 关节名称，如 `FL_hip_joint` |
| `position` | `std::vector<double>` | 关节位置，单位 rad（直线关节为 m） |
| `velocity` | `std::vector<double>` | 关节速度，单位 rad/s（直线关节为 m/s） |
| `effort` | `std::vector<double>` | 关节力矩/作用力，单位 N·m（或 N） |
| `motor_temp` | `std::vector<std::int16_t>` | 电机温度 |
| `pcb_temp` | `std::vector<std::int16_t>` | 驱动板温度 |
| `state_num` | `std::vector<std::int16_t>` | 关节状态码 |
| `err_num` | `std::vector<std::int16_t>` | 关节错误码 |
| `heart` | `std::vector<std::int16_t>` | 关节心跳 |

关节名称与数量随机型配置变化，请按 `name` 对齐，不要写死固定下标。同名关节在不同机型上的零位与限位也可能不同。

### 读取 JointState（轮询）

先订阅再轮询缓存，适合一次性采样：

```cpp showLineNumbers
#include <latentos/sdk/core/session.h>
#include <latentos/sdk/low_level/low_level_client.h>

#include <chrono>
#include <iostream>
#include <thread>
#include <utility>

latentos::sdk::SdkOptions options;
options.client_config_path = "config/echo/mode/client.yaml";
latentos::sdk::core::Session session(std::move(options));
latentos::sdk::low_level::LowLevelClient low_level(session);

// 纯轮询：传入空回调即可启动订阅
low_level.SubscribeJointState({});

for (int waited_ms = 0; waited_ms < 5000; waited_ms += 50) {
  const auto joint = low_level.GetLatestJointState();
  if (!joint.has_value()) {
    std::this_thread::sleep_for(std::chrono::milliseconds(50));
    continue;
  }

  std::cout << "send_time_ns=" << joint->send_time_ns
            << " joint_num=" << joint->joint_num << '\n';
  for (std::size_t i = 0; i < joint->position.size(); ++i) {
    const std::string name =
        i < joint->name.size() ? joint->name[i] : "";
    const double velocity =
        i < joint->velocity.size() ? joint->velocity[i] : 0.0;
    const double effort =
        i < joint->effort.size() ? joint->effort[i] : 0.0;
    std::cout << "  [" << i << "] " << name
              << " pos=" << joint->position[i]
              << " vel=" << velocity
              << " eff=" << effort << '\n';
  }
  break;
}
```

### 读取 JointState（回调）

需要每帧处理时传入回调。回调与 `GetLatestJointState()` 可同时使用：

```cpp showLineNumbers
low_level.SubscribeJointState(
    [](const latentos::sdk::JointState& joint) {
      for (std::size_t i = 0; i < joint.position.size(); ++i) {
        const std::string name =
            i < joint.name.size() ? joint.name[i] : "";
        // 按 name / position[i] 更新本地状态或可视化
        (void)name;
      }
    });
```

完整可运行示例见 `latentos_sdk_example` 中的 `get_joint_state`、`subscribe_joint_state`。

## JointCommand

头文件：`<latentos/sdk/low_level/joint_command.h>`  
类型：`latentos::sdk::JointCommand`

发布到 `latentos/joint_command_mit`，由硬件接口直接驱动电机。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `name` | `std::vector<std::string>` | 目标关节名称，应与线上关节名一致 |
| `position` | `std::vector<double>` | 目标位置，单位 rad（或 m） |
| `velocity` | `std::vector<double>` | 目标速度，单位 rad/s（或 m/s） |
| `effort` | `std::vector<double>` | 前馈力矩/作用力 |
| `stiffness` | `std::vector<double>` | 刚度增益（MIT 中的 \(K_p\)） |
| `damping` | `std::vector<double>` | 阻尼增益（MIT 中的 \(K_d\)） |
| `max_effort` | `std::vector<double>` | 输出力矩上限 |
| `heart` | `std::vector<std::int16_t>` | 心跳；建议单调递增，便于下游检测超时 |

所有并行数组长度应一致。SDK 发送时以 `position.size()` 作为关节数。

:::danger
`SendJointCommand()` 直接写电机目标，不经过运动控制仲裁，也没有命令 ACK。

使用前必须：

1. 让机器人进入直接关节模式，例如 `MotionClient::SwitchGroup("joint_test", "")`（`joint_test` 不需要 policy，见 [Group 与 Policy](../../concepts/groups-and-policies.md)）。
2. 停止其他会抢占同一话题的控制源。
3. 准备吊架、急停，并先在仿真或吊起状态下用小幅值验证。

错误目标、错误增益或模式冲突可能导致机器人突然运动或摔倒。
:::

### 发送 JointCommand

下面示例演示如何按关节名组装一条命令并周期发送。增益与目标角度需按机型与现场重新标定，**不要**直接照抄到真机大范围运动。

```cpp showLineNumbers
#include <latentos/sdk/core/session.h>
#include <latentos/sdk/low_level/joint_command.h>
#include <latentos/sdk/low_level/low_level_client.h>
#include <latentos/sdk/motion/motion_client.h>

#include <chrono>
#include <cstdint>
#include <string>
#include <thread>
#include <utility>
#include <vector>

latentos::sdk::SdkOptions options;
options.client_config_path = "config/echo/mode/client.yaml";
latentos::sdk::core::Session session(std::move(options));
latentos::sdk::motion::MotionClient motion(session);
latentos::sdk::low_level::LowLevelClient low_level(session);

// 1) 进入直接关节模式（无 policy 的 group 传空字符串）
auto switch_result = motion.SwitchGroup("joint_test", "", {});
if (!switch_result.ok || !switch_result.accepted) {
  // 检查 message / result_code 后返回
  return;
}

// 2) 组装 MIT 命令：并行数组等长，名称与线上关节一致
latentos::sdk::JointCommand command;
command.name = {
    "FL_hip_joint", "FL_thigh_joint", "FL_calf_joint",
    "FR_hip_joint", "FR_thigh_joint", "FR_calf_joint",
    "RL_hip_joint", "RL_thigh_joint", "RL_calf_joint",
    "RR_hip_joint", "RR_thigh_joint", "RR_calf_joint",
};
const std::size_t n = command.name.size();
command.position.assign(n, 0.0);   // 按机型填写安全目标角
command.velocity.assign(n, 0.0);
command.effort.assign(n, 0.0);     // 纯 PD 时可置 0
command.stiffness.assign(n, 100.0); // 示例值，需按机型调整
command.damping.assign(n, 2.0);
command.max_effort.assign(n, 50.0);
command.heart.assign(n, 0);

// 可选：先订阅关节状态，按 name 对齐后从当前姿态缓慢过渡
low_level.SubscribeJointState({});

std::int16_t heart = 0;
for (int frame = 0; frame < 200; ++frame) {
  heart = static_cast<std::int16_t>((heart + 1) & 0x7fff);
  for (auto& h : command.heart) {
    h = heart;
  }
  // 在此更新 command.position ...
  low_level.SendJointCommand(command);
  std::this_thread::sleep_for(std::chrono::milliseconds(10)); // 约 100 Hz
}
```

更完整的开环抬腿演示见 `latentos_sdk_example` 的 `send_joint_command`（默认面向仿真；真机必须重新调参并吊起验证）。

## 相关文档

- [C++ SDK 指南](../../sdk/cpp.md)
- [Motion API](./motion.md)（`SwitchGroup` 进入 `joint_test`）
- [Telemetry API](./telemetry.md)（机身 IMU 姿态）
- [示例总览](../../examples/index.md)（`get_joint_state` / `subscribe_joint_state` / `send_joint_command`）
