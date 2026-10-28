---
sidebar_label: 连接与会话（Core）
---

# Core API

`core` 是所有业务模块的地基，提供连接配置、共享会话和整机状态读取：

- **`robot_status::RobotStatusClient`**：整机状态查询、订阅和故障事件消费，编入 core；见 [Robot Status](./robot-status.md)。
- **`SdkOptions`**：Echo client 配置路径、实例标识与重连间隔。
- **`core::Session`**：持有连接配置，供 Motion、Telemetry、Power 等模块 Client 共享。

业务应用通常不单独链接 Core，而是链接具体模块 target（如 `latentos::sdk_motion`），由它们自动引入 Core。只读取整机状态的应用可以直接链接 Core；无需独立的 robot_status 库。

应用侧包含配置与 Session 头文件：

```cpp
#include <latentos/sdk/core/options.h>
#include <latentos/sdk/core/session.h>
```

若确实需要单独链接 Core，在 CMake 中查找并链接对应模块包。安装前缀需已加入 `CMAKE_PREFIX_PATH`（常见为 `/data/latentos/sdk_cpp`）：

```cmake
find_package(latentos_sdk_core CONFIG REQUIRED)
target_link_libraries(my_app PRIVATE latentos::sdk_core)
```

## SdkOptions

命名空间：`latentos::sdk`  
头文件：`<latentos/sdk/core/options.h>`

连接级配置，由 `core::Session` 或统一 `Client` 持有。

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `client_config_path` | `std::string` | 空 | Echo client YAML 路径；应用必须设置 |
| `instance_id` | `std::string` | SDK 默认值 | 当前客户端实例标识；一般无需修改 |
| `boot_id` | `std::string` | 空 | 可选的启动实例标识 |
| `retry_interval_ms` | `std::uint64_t` | `2000` | 重连重试间隔，单位 ms |

## core::Session

头文件：`<latentos/sdk/core/session.h>`  
类：`latentos::sdk::core::Session`

```cpp showLineNumbers
explicit Session(SdkOptions options);
const SdkOptions& options() const;
```

| 方法 | 说明 |
| --- | --- |
| `Session(options)` | 用连接配置构造会话；配置文件无效时可能抛出 `std::exception` |
| `options()` | 返回构造时使用的只读配置 |

Session 表示一组共享连接配置。模块 Client 保存对 Session 的引用，因此 **Session 必须比所有使用它的模块 Client 更晚销毁**。一个 Session 可同时供给多个模块 Client。

### 创建 Session

```cpp showLineNumbers
#include <latentos/sdk/core/options.h>
#include <latentos/sdk/core/session.h>
#include <latentos/sdk/motion/motion_client.h>
#include <latentos/sdk/telemetry/telemetry_client.h>

#include <utility>

namespace sdk = latentos::sdk;

sdk::SdkOptions options;
options.client_config_path = "config/echo/mode/client.yaml";
options.retry_interval_ms = 2000;

sdk::core::Session session(std::move(options));
sdk::motion::MotionClient motion(session);
sdk::telemetry::TelemetryClient telemetry(session);
```

配置文件不存在、不可读或内容无效时，构造过程可能抛出 `std::exception`。连接端点与 YAML 写法见 [连接机器人](../../getting-started/connect.md)。

## 相关文档

- [Robot Status API](./robot-status.md)
- [C++ SDK 指南](../../sdk/cpp.md)
- [C++ API 总览](./index.md)
- [连接机器人](../../getting-started/connect.md)
