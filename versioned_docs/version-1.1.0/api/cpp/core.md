---
sidebar_label: Core
---

# Core API

头文件：

```cpp
#include <latentos/sdk/core/options.h>
#include <latentos/sdk/core/session.h>
```

CMake：

```cmake
find_package(latentos_sdk_core CONFIG REQUIRED)
target_link_libraries(my_app PRIVATE latentos::sdk_core)
```

业务应用通常不单独链接 Core，而是链接 Motion、Power 等模块 target，由它们自动引入 Core。

## SdkOptions

命名空间：`latentos::sdk`

连接级配置，由 `core::Session` 或统一 `Client` 持有。

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `client_config_path` | `std::string` | 空 | Echo client YAML 路径；应用必须设置 |
| `instance_id` | `std::string` | SDK 默认值 | 当前客户端实例标识；一般无需修改 |
| `boot_id` | `std::string` | 空 | 可选的启动实例标识 |
| `retry_interval_ms` | `std::uint64_t` | `2000` | 重连重试间隔，单位 ms |

## core::Session

```cpp
explicit Session(SdkOptions options);
const SdkOptions& options() const;
```

Session 表示一组共享连接配置。模块 Client 保存对 Session 的引用，因此 Session 必须比所有使用它的模块 Client 更晚销毁。

```cpp showLineNumbers
namespace sdk = latentos::sdk;

sdk::SdkOptions options;
options.client_config_path = "config/echo/mode/client.yaml";
options.retry_interval_ms = 2000;

sdk::core::Session session(std::move(options));
```

配置文件不存在、不可读或内容无效时，构造过程可能抛出 `std::exception`。
