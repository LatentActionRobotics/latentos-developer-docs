---
sidebar_label: Nav
---

# Nav API

```cpp
#include <latentos/sdk/nav/nav_client.h>
```

```cmake
find_package(latentos_sdk_nav CONFIG REQUIRED)
target_link_libraries(my_app PRIVATE latentos::sdk_nav)
```

类：`latentos::sdk::nav::NavClient`

```cpp
explicit NavClient(core::Session& session);

void AdvertisePointCloudStream(std::string ip,
                               std::int32_t port,
                               bool enabled = true);
```

`AdvertisePointCloudStream()` 向系统公布应用提供的点云流端点：

| 参数 | 说明 |
| --- | --- |
| `ip` | 接收端可访问的本机/板卡 IP 地址 |
| `port` | 点云流服务端口 |
| `enabled` | `true` 表示端点可用，`false` 表示停用 |

该接口应周期调用，例如 1 Hz。周期广播既能让后加入或重连的接收端获得最新地址，也可作为端点存活信号。

请填写目标侧实际可达的地址，不要在跨设备场景发布 `127.0.0.1` 或只在本机网卡可见的地址。
