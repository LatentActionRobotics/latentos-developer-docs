---
sidebar_label: 状态与故障（Safety）
---

# Safety Status API

读取整机健康状态与当前故障列表。公开入口是 `latentos::sdk::safety::SafetyStatusClient`，编入 `latentos_sdk_core`，链接 `latentos::sdk_core` 即可，无需独立库。

对外数据是 `health_state` 与 `faults[]`。默认通信 key：

| 用途 | key |
| --- | --- |
| 周期状态 | `latentos/safety/status` |
| 一次查询 | `latentos/safety/query_status` |
| 变化提示（可选） | `latentos/safety/event` |

## 在客户工程中使用

头文件随 core 安装。安装前缀设置见 [C++ SDK 指南](../../sdk/cpp.md)。

```cmake
cmake_minimum_required(VERSION 3.20)
project(safety_status_example LANGUAGES CXX)
find_package(latentos_sdk_core CONFIG REQUIRED)
add_executable(read_status read_status.cc)
target_link_libraries(read_status PRIVATE latentos::sdk_core)
```

将以下代码保存为 `read_status.cc`：

```cpp showLineNumbers
#include <iostream>
#include <latentos/sdk/core/safety/safety_status_client.h>

int main(int argc, char **argv) {
  if (argc != 2) {
    std::cerr << "Usage: read_status ECHO_CONFIG\n";
    return 2;
  }
  try {
    latentos::sdk::SdkOptions transport;
    transport.client_config_path = argv[1];
    latentos::sdk::core::Session session(transport);
    latentos::sdk::safety::SafetyStatusClient client(session);
    const auto result = client.QueryStatus(1000);
    if (!result) {
      std::cerr << "query error=" << static_cast<int>(result.error)
                << " service_result=" << result.service_result << '\n';
      return 1;
    }
    using latentos::sdk::safety::ToString;
    std::cout << "health_state=" << ToString(result.status->health_state)
              << " faults=" << result.status->faults.size() << '\n';
    for (const auto &f : result.status->faults) {
      std::cout << "  fault key=" << f.event_key << " source=" << f.source_id
                << " level=" << ToString(f.level) << " msg=" << f.message
                << '\n';
    }
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
./build/read_status /path/to/echo/client.yaml
```

Echo 配置见 [连接机器人](../../getting-started/connect.md)。查询成功只表示拿到了结构合法的快照，不代表整机健康。

## 持续读取状态

调用一次 `SubscribeStatus()`，之后按应用刷新频率读本地缓存。完整故障表以状态订阅或查询为准；事件只适合做提示，不能用来拼出当前故障列表：

```cpp showLineNumbers
client.SubscribeStatus();
// client.SubscribeEvents();  // 可选：UI 提示
if (const auto cached = client.GetLatestStatus()) {
  if (!cached->fresh) {
    std::cout << "状态已过期，仅供查看历史\n";
  } else {
    using latentos::sdk::safety::ToString;
    std::cout << "health_state=" << ToString(cached->status.health_state)
              << " faults=" << cached->status.faults.size() << '\n';
  }
}
// 不再需要时：client.UnsubscribeStatus();
```

`fresh` 表示最近一次合法状态是否仍在新鲜度窗口内（默认 3000 ms）。过期缓存不要当作当前可控制依据。连续控制不要每帧阻塞调用 `QueryStatus`。

## 解读健康与故障

| 信息 | 用途 |
| --- | --- |
| `health_state` | 整机健康档：`Unknown` / `Normal` / `Warning` / `Restricted` / `Fault` / `RecoveryPending` |
| `faults[].event_key` | 故障类型键（如 `system.cpu_temperature_high`、`power.battery_critical`） |
| `faults[].source_id` | 对象标识（关节名、温区等；整机级可空） |
| `faults[].level` | 该项策略影响：`Warning` / `Restricted` / `Fault` |
| `faults[].message` | 可读说明 |
| `receive_age_ms` / `fresh` | 本地接收年龄，以及是否仍新鲜 |

可用 `ToString(HealthState|FaultLevel|EventState)` 得到稳定英文字符串（如 `Warning`），便于日志和界面。

| `health_state` | 应用侧含义 |
| --- | --- |
| `Normal` / `Warning` 且 `fresh` | 普通运动控制的基础条件可能满足；仍须检查模式、控制权和命令结果 |
| `Restricted` / `Fault` / `RecoveryPending` | 遵守机端门禁；不要假定受影响的控制会生效 |
| `Unknown` 或过期 | 不当作正常；可查询或等待新鲜状态 |

`RecoveryPending` 且 `faults` 为空是合法快照。拿到状态成功不等于运动命令已被接受。

## API

头文件：`<latentos/sdk/core/safety/safety_status_client.h>`（数据类型见同目录 `types.h`）  
命名空间：`latentos::sdk::safety`

| 方法 | 语义 |
| --- | --- |
| `QueryStatus(timeout_ms)` | 阻塞查询一次；成功也不更新订阅缓存 |
| `SubscribeStatus` / `UnsubscribeStatus` | 订／退状态；退订后保留缓存，但 `fresh=false` |
| `GetLatestStatus` | 读缓存、年龄、`fresh`；不发网络 |
| `SubscribeEvents` / `UnsubscribeEvents` | 订／退变化提示（可选） |
| `DrainEvents` | 取走有界提示队列；不要用它重建完整 `faults` |

`Options` 默认：

| 字段 | 默认 |
| --- | --- |
| `status_topic` | `latentos/safety/status` |
| `query_service` | `latentos/safety/query_status` |
| `event_topic` | `latentos/safety/event` |
| `freshness_timeout_ms` | `3000` |
| `connect_timeout_ms` | `1000` |
| `event_capacity` | `128`（可配 1–4096） |

构造不会自动订阅或查询。创建 Session 本身也不会启动状态端点。生命周期操作请串行调用，不要与析构并发。

`QueryResult` 为真只表示取得合法快照。`QueryError` 可能为 `None`、`Timeout`、`Transport`、`Protocol`、`Rejected`；服务非 OK 时保留 `service_result`。

## 怎么用状态和事件

1. 需要当前完整视图：先 `SubscribeStatus`，再读 `GetLatestStatus`；或直接 `QueryStatus`。用返回的 `health_state` 与整份 `faults` 替换本地业务视图。
2. 需要 UI 边沿提示：再订 `SubscribeEvents`，用 `DrainEvents` 取变化。订阅事件时**不会**重放已经存在的 ACTIVE 故障；只订事件会漏掉当前故障。
3. 事件队列满时会丢最旧并置 `overflowed`；之后仍以状态 Topic 或 `QueryStatus` 为准。
4. `fresh == false` 时缓存只作历史；服务是否在线看周期状态，不要靠“有没有事件”判断。

消费方式是应用侧轮询，SDK 不会在 Echo 线程里回调你的业务代码。

## 示例程序

安装包中的 `share/latentos_sdk_core/examples/safety_status` 提供 `read_status` 和 `watch_status`：

```bash
cmake -S /path/to/sdk/share/latentos_sdk_core/examples/safety_status -B build-status-examples \
  -DCMAKE_PREFIX_PATH="/path/to/sdk;/path/to/runtime;/path/to/runtime/third_party"
cmake --build build-status-examples -j4
./build-status-examples/read_status /path/to/customer_echo.yaml
./build-status-examples/watch_status /path/to/customer_echo.yaml 60
```

`watch_status` 持续观察指定秒数，Ctrl-C 可提前退出。状态变新鲜／过期、故障集合变化，或大约每秒会打印详情；断流时输出 `stream=stale`。退出码 0 只表示程序正常结束，不代表机器人健康。

## 相关文档

- [Core](./core.md)
- [C++ SDK 指南](../../sdk/cpp.md)
- [C++ API 总览](./index.md)
