---
sidebar_label: 状态与故障（Robot Status）
---

# Robot Status API

当前为 dev 分支接口实现，已与真实 Robot Status Runtime 完成本机联调，尚未连接实机。协议文件来自 `latentos_message_protocol/diagnostics/robot_status.codec`，不替换原 SDK、umbrella Client、Python/ROS 接口或 MAVLink 逻辑。

## 在客户工程中使用

头文件随 core 安装，无需查找独立的 robot_status 包。使用支持该接口的 SDK 与匹配 Runtime，安装前缀设置见 [C++ SDK 指南](../../sdk/cpp.md)。

```cmake
cmake_minimum_required(VERSION 3.20)
project(robot_status_example LANGUAGES CXX)
find_package(latentos_sdk_core CONFIG REQUIRED)
add_executable(read_status read_status.cc)
target_link_libraries(read_status PRIVATE latentos::sdk_core)
```

将以下代码保存为 `read_status.cc`：

```cpp showLineNumbers
#include <iostream>
#include <latentos/sdk/core/robot_status/robot_status_client.h>

int main(int argc, char **argv) {
  if (argc != 3) {
    std::cerr << "Usage: read_status ECHO_CONFIG ROBOT_ID\n";
    return 2;
  }
  try {
    latentos::sdk::SdkOptions transport;
    transport.client_config_path = argv[1];
    latentos::sdk::core::Session session(transport);
    latentos::sdk::robot_status::Options options;
    options.robot_id = argv[2];
    latentos::sdk::robot_status::RobotStatusClient client(session, options);
    const auto result = client.QueryStatus(1000);
    if (!result) {
      std::cerr << "query error=" << static_cast<int>(result.error)
                << " service_result=" << result.service_result << '\n';
      return 1;
    }
    std::cout << "coverage=" << result.status->coverage
              << " known_health=" << result.status->known_health
              << " diagnostics=" << result.status->diagnostics.size() << '\n';
    // Successful query is not a claim that the robot is healthy.
    return 0;
  } catch (const std::exception &e) {
    std::cerr << e.what() << '\n';
    return 1;
  }
}
```

构建：

```bash
cmake -S . -B build \
  -DCMAKE_PREFIX_PATH="/data/latentos/sdk_cpp;/data/latentos/sdk_runtime;/data/latentos/sdk_runtime/third_party"
cmake --build build -j
./build/read_status /path/to/echo/client.yaml ROBOT_ID
```

`ROBOT_ID` 必须与服务端配置一致；Echo 配置见 [连接机器人](../../getting-started/connect.md)。查询成功仅表示拿到了结构合法、作用域匹配的快照，并不代表整机健康。服务端需同时配置 `status_topic: latentos/robot/status`、`event_topic: latentos/robot/status/event`、`query_service: latentos/robot/status/query`；三个 key 必填，且必须与客户端对应配置一致。

## 持续读取状态

在上述 `client` 生命周期内调用一次 `SubscribeStatus()`，之后按应用刷新频率读取缓存：

```cpp showLineNumbers
client.SubscribeStatus();
// 在应用定时器中重复执行以下部分；首次消息到达前返回空。
if (const auto cached = client.GetLatestStatus()) {
  if (!cached->fresh) {
    std::cout << "状态已过期，仅供查看历史\n";
  } else {
    std::cout << "coverage=" << cached->status.coverage
              << " health=" << cached->status.known_health << '\n';
  }
}
// 应用不再需要订阅时调用：client.UnsubscribeStatus();
```

`fresh` 仅反映 SDK 最近收到的状态消息是否新鲜。还必须查看 `sources`、`capabilities` 和具体诊断的 `validity`；聚合消息持续发送不代表所有上游传感器有效。

## 解读故障

| 信息 | 用途 |
| --- | --- |
| `coverage` / `incomplete` | 诊断覆盖是否完整；部分覆盖不能判为整机正常 |
| `known_health` | 已知信息的健康级别，结合覆盖和有效性使用 |
| `supported_error_flags` | 服务声明支持的旧类别故障位 |
| `valid_error_flags` | 当前可有效判断的旧类别故障位 |
| `error_flags` | 当前或保留的已知故障；必须结合有效位解释 |
| `capabilities` | 每种诊断及组件的支持状态、有效性 |
| `diagnostics` | 详细故障，含数字码、字符串码、来源、组件、发生实例及原始码 |

使用 `InterpretError(snapshot, bit, fresh)` 判断单个类别位，不要只检查 `error_flags == 0`：

| 返回值 | 含义 |
| --- | --- |
| `Unsupported` | 未支持该类别，不能解释成无故障 |
| `Unknown` | 无法有效判断 |
| `Clear` | 该类别当前有效且未置故障位 |
| `Active` | 该类别当前有效且故障位已置位 |
| `LastKnownActive` | 曾观测到故障，但当前信息已失效 |

类别位沿用原有 16 位定义；详细数字故障码独立表达具体原因。倾角、足端等详细诊断不强制映射到旧类别位，`error_flag=0` 不代表无故障。预留诊断码也不代表检测能力已经接入，客户应依据 `capabilities` 判断。未知数字码和字符串会保留供应用展示。

## 从源码构建 SDK

整机状态接口编入 `latentos_sdk_core`，通过 `latentos::sdk_core` 链接，无独立库或开关。保留独立的 `RobotStatusClient` 类及 `latentos::sdk::robot_status` 命名空间，避免将业务逻辑放入 Session。仅构建 core 即可使用：

```bash
cmake -S . -B build-status \
  -DLATENTOS_SDK_MODULES=core \
  -DBUILD_TESTING=ON \
  -DCMAKE_PREFIX_PATH="/path/to/dependencies;/path/to/host-tools" \
  -DLATENTOS_SDK_ROBOT_STATUS_SCHEMA_ROOT=/path/to/latentos_message_protocol
cmake --build build-status -j4
ctest --test-dir build-status --output-on-failure
cmake --install build-status --prefix /path/to/staging
```

core 构建需要 codec 生成工具、匹配的协议文件和 codec runtime；构建时生成 专用头，不修改系统已安装的协议。若协议已安装，可省略 schema root 参数，使用 message_protocol 的导出路径。安装后的 CMake 消费者使用 `find_package(latentos_sdk_core CONFIG REQUIRED)`；生成的八个 头随 core 安装，链接目标为 `latentos::sdk_core`，不必链接 Robot Status 服务。仅链接 core 或创建 Session 不会启动状态订阅或查询。

## API

头文件：`latentos/sdk/core/robot_status/robot_status_client.h`；命名空间 `latentos::sdk::robot_status`。

| 方法 | 语义 |
| --- | --- |
| QueryStatus(timeout_ms) | 阻塞查询，返回 QueryResult；不更新订阅缓存 |
| SubscribeStatus / UnsubscribeStatus | 开始/停止状态订阅，幂等；取消保留历史缓存但 fresh=false |
| GetLatestStatus | 读取可选缓存、单调接收年龄和 fresh，不发网络请求 |
| SubscribeEvents / UnsubscribeEvents | 开始/停止事件订阅；每次重新订阅都需要同步 |
| SynchronizeEvents(timeout_ms) | 查询快照、丢弃其已覆盖事件、检查缓存连续性；客户必须用返回快照替换业务视图 |
| DrainEvents | 取走有界队列，返回 resync_required、累计丢弃和无效消息计数 |

Options 中 robot_id 必填；三个 key 默认 `latentos/robot/status`、`/event`、`/query`，可按机器人部署隔离。默认状态过期 3000 ms、连接重试期限 1000 ms、事件队列 128 条（可配 1–4096）。构造只复制 Session 的传输选项，不自动订阅或发送命令。

本版采用轮询消费，无用户回调在 Echo 线程执行，也没有隐藏的事件历史或自动全量查询线程。生命周期操作串行化；不要与析构并发调用。底层连接/关闭的单次耗时仍由 Echo/Zenoh 配置决定，应用等待期限不构成硬实时退出保证。

QueryError 区分 None、Timeout、Transport、Protocol、Rejected；服务非 OK 时保留 service_result。QueryResult 为真只表示取得合法快照，不表示健康。未知诊断码/字符串会保留；结构版本不匹配或错误机器人标识不会交给客户当有效状态。

Snapshot、Diagnostic、Event、Capability 目前为冻结 线格式类型的公开别名；不承诺跨未来大版本的 C++ ABI。SDK 方法独立于服务进程名，后续若需换线格式，先评审新的类型/适配层，不静默改变已有 布局。

## 状态与事件消费流程

1. SubscribeStatus 和 SubscribeEvents，随后 SynchronizeEvents。
2. 查询成功后，用返回快照替换本地业务视图；不是追加到旧故障列表。
3. DrainEvents 后检查 resync_required；为 true 时不要把该批视为完整历史，重新同步。
4. 同步可能与重启、新缺口或溢出竞争，QueryResult 成功不保证 resync_required=false；继续检查下一批。
5. 只有同步成功且批次连续时才按事件更新本地视图；发生实例由 occurrence_id 区分。
6. GetLatestStatus().fresh=false 时所有缓存是历史值。事件空闲本身不是断流，服务活性由周期状态判断。

同 boot 重复/旧订阅序号不续期；事件缺口、溢出、未知 boot 会要求同步。周期快照的 last_event_sequence 也会检测尾部事件丢失。跨旧 boot 的延迟消息或多生产者冲突没有仲裁保证，应重新同步，单 key 只能有一个权威提供者。

InterpretError(snapshot, bit, fresh) 返回 Unsupported、Unknown、Clear、Active 或 LastKnownActive，只解释旧类别位。详细能力和诊断仍需读取，不能用某一位 Clear 推断所有传感器正常。错误位 0 的详细诊断仍可能为 ERROR。

## 当前验证与限制

测试提供者通过真实本机 Echo 验证查询成功、超时、无关 request_id、拒绝、错误作用域、状态断流、重复消息不续期、取消、事件缺口/溢出、快照恢复、错误报文和重启。协议结构标识及数值编码有回归检查。

`latentos_robot_status` 提供唯一一组状态、查询和事件端点。已完成真实 Runtime 到 SDK 的本机联调，实机故障验证和长期运行验收仍待完成。硬件来源当前没有统一启动代次，不能可靠识别源端重启或持续上报的旧数据；预留诊断仍须依据 capabilities 判断支持范围。Python、ROS、umbrella Client 的便利方法本轮不新增，可在该独立 C++ 接口评审后扩展。


## 事件处理约定

事件 kind 包括 `RAISED`（出现）、`UPDATED`（更新）、`CLEARED`（恢复）与 `SOURCE_CHANGED`（来源有效性变化）。仅在 `has_diagnostic` 为真时读取诊断内容；首次观测到的已有故障可能标记 `initial_observation=true`，不能据此推断其物理发生时间。

先订阅事件，再调用 `SynchronizeEvents()` 获取基线。应用用基线替换整个本地状态，之后仅消费 `DrainEvents()` 中 `resync_required=false` 的批次。需要重新同步时丢弃该批作为增量更新的用途，查询失败应保留“状态未知/待同步”，并在后续轮询中有限频率重试。

以 `aggregator_boot_id` 区分服务启动实例，以诊断的 `source_id`、`component_id`、`diagnostic_code` 和 `occurrence_id` 关联故障及恢复；未分类码为 0 时还需区分字符串码。不要使用墙上时钟时间排序或跨启动实例拼接事件序号。

来源失效不能被当成故障恢复。只有有效的 `CLEARED` 才代表恢复，`SOURCE_CHANGED` 应更新来源有效性。订阅不是持久事件历史；断线期间已经发生且恢复的故障，快照同步不能补回完整过程。

## 相关文档

- [Core](./core.md)
- [C++ SDK 指南](../../sdk/cpp.md)
- [C++ API 总览](./index.md)

## 首版告警范围与观察示例

服务端当前支持原 11 项电机／PMU／IMU 诊断，以及 Core 明确 FAILED 任务对应的 `software.process_failed`，合计 12 项具体诊断。Core 故障按任务分实例；失联、任务消失或启动过渡不能确认恢复，明确 RUNNING/STOPPED/COMPLETED 才解除。Core 的原始码域为 `core.exit_code`；轮询不能保证捕获查询间已经恢复的短暂失败。

首版不修改 HI：每关节反馈超时、HI 命令看门狗继续未支持，心跳、磁力计、倾角、状态估计、总线等仍按 capabilities 判断。`WATCHDOG_OR_SOFTWARE` 类别位支持仅说明 Core 任务失败已接入，不能据此认定所有看门狗功能已实现。

安装后的 `share/latentos_sdk_core/examples/robot_status` 同时提供 `read_status` 和 `watch_status`：

```bash
cmake -S /path/to/sdk/share/latentos_sdk_core/examples/robot_status -B build-status-examples \
  -DCMAKE_PREFIX_PATH="/path/to/sdk;/path/to/runtime;/path/to/runtime/third_party"
cmake --build build-status-examples -j4
./build-status-examples/read_status /path/to/customer_echo.yaml ROBOT_ID
./build-status-examples/watch_status /path/to/customer_echo.yaml ROBOT_ID 60
```

`watch_status` 持续观察 60 秒，Ctrl-C 可提前退出。输出 `baseline` 表示重新建立整份快照基线，`event` 表示连续事件；断流输出 `stream=stale`，同步失败后限频重试。服务重启后按新 boot 重建基线，不拼接旧历史。示例退出码 0 表示正常退出，不代表健康；文本输出不是稳定机器 API。
