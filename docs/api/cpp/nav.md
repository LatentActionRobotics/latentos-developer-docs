---
sidebar_label: Nav
---

# Nav API

`nav` 模块用于向系统公布应用侧点云流端点，供桥接或其他接收端发现：

- 周期性发布 IP、端口与启用状态。
- 后加入或重连的接收端可据此拿到最新地址；周期广播同时可作为端点存活信号。

本模块只负责端点广播，不负责点云编码或传输本身。

应用侧至少包含 Session 与 Nav Client 头文件：

```cpp
#include <latentos/sdk/core/session.h>
#include <latentos/sdk/nav/nav_client.h>
```

CMake 中查找并链接对应模块包。安装前缀需已加入 `CMAKE_PREFIX_PATH`（常见为 `/data/latentos/sdk_cpp`）：

```cmake
find_package(latentos_sdk_nav CONFIG REQUIRED)
target_link_libraries(my_app PRIVATE latentos::sdk_nav)
```

入口类为 `latentos::sdk::nav::NavClient`，构造时传入已配置好的 `core::Session`。公开方法如下：

```cpp showLineNumbers
explicit NavClient(core::Session& session);

void AdvertisePointCloudStream(std::string ip,
                               std::int32_t port,
                               bool enabled = true);
```

## 方法

| 方法 | 说明 |
| --- | --- |
| `AdvertisePointCloudStream` | 公布点云流端点；应周期调用（例如 1 Hz） |

`AdvertisePointCloudStream()` 参数：

| 参数 | 说明 |
| --- | --- |
| `ip` | 接收端可访问的本机/板卡 IP 地址 |
| `port` | 点云流服务端口 |
| `enabled` | `true` 表示端点可用，`false` 表示停用 |

请填写目标侧实际可达的地址，不要在跨设备场景发布 `127.0.0.1` 或只在本机网卡可见的地址。

### 周期广播示例

```cpp showLineNumbers
#include <latentos/sdk/core/session.h>
#include <latentos/sdk/nav/nav_client.h>

#include <chrono>
#include <cstdint>
#include <iostream>
#include <thread>
#include <utility>

latentos::sdk::SdkOptions options;
options.client_config_path = "config/echo/mode/client.yaml";
latentos::sdk::core::Session session(std::move(options));
latentos::sdk::nav::NavClient nav(session);

const std::string ip = "192.168.51.10";
const std::int32_t port = 9001;

std::cout << "advertising " << ip << ':' << port << " every 1s\n";
while (true) {
  nav.AdvertisePointCloudStream(ip, port, /*enabled=*/true);
  std::this_thread::sleep_for(std::chrono::seconds(1));
}
```

停用端点时继续周期调用，并将 `enabled` 设为 `false`，直到接收端不再依赖该地址。

完整可运行示例见 `latentos_sdk_example` 的 `advertise_pointcloud`。

## 相关文档

- [C++ SDK 指南](../../sdk/cpp.md)
- [示例总览](../../examples/index.md)
