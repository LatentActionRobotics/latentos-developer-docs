# 电池状态

机上有电池数据时才能读到。`get_battery` 最多等约 5 秒；`subscribe_battery` 持续打印直到 Ctrl+C。

输出包括 SOC、电压、电流，以及归一化后的整机 `power_state`。C++ 和 Python SDK 都通过电池订阅提供该字段，不需要调用单独的充放电查询接口。

| `power_state` | 含义 |
| --- | --- |
| `charging` | 正在充电 |
| `discharging` | 正在放电 |
| `not_charging` | 当前既未充电也未放电 |
| `full` | 电池已充满 |
| `unknown` | 数据过期、底层状态冲突或无法识别 |

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="sdk-lang">
  <TabItem value="python" label="Python" default>

```bash
python3 examples/python/get_battery.py --client-config "$CLIENT"
python3 examples/python/subscribe_battery.py --client-config "$CLIENT"
```

`get_battery.py` 可加 `--timeout-s`（默认 `5`）。

一次性读取会先 `subscribe_battery()`，再轮询 `get_latest_battery()`：

```python showLineNumbers
from latentos_sdk import BatteryPowerState, Client

client = Client(client_config_path=client_config)
try:
    client.subscribe_battery()
    status = client.get_latest_battery()
    if status is not None:
        print(f"power_state={status.power_state}")
        if status.power_state is BatteryPowerState.CHARGING:
            print("battery is charging")
finally:
    client.close()
```

持续订阅传入回调：

```python showLineNumbers
from latentos_sdk import BatteryStatus, Client

def on_battery(status: BatteryStatus) -> None:
    print(
        f"power_state={status.power_state} "
        f"soc_percent={status.soc_percent} voltage_v={status.voltage_v}"
    )

client = Client(client_config_path=client_config)
try:
    client.subscribe_battery(on_battery)
finally:
    client.close()
```

  </TabItem>
  <TabItem value="cpp" label="C++">

```bash
./build/examples/get_battery --client-config "$CLIENT"
./build/examples/subscribe_battery --client-config "$CLIENT"
```

C++ 使用 `power::PowerClient`：

```cpp showLineNumbers
#include <latentos/sdk/core/session.h>
#include <latentos/sdk/power/power_client.h>

#include <iostream>

latentos::sdk::SdkOptions sdk_options;
sdk_options.client_config_path = client_config;
latentos::sdk::core::Session session(std::move(sdk_options));
latentos::sdk::power::PowerClient client(session);

client.SubscribeBattery({});
auto battery = client.GetLatestBattery();
if (battery) {
  std::cout << "power_state="
            << latentos::sdk::ToString(battery->power_state) << '\n';
  if (battery->power_state == latentos::sdk::BatteryPowerState::Charging) {
    // 电池正在充电。
  }
}
```

`GetLatestBattery()` 读取订阅缓存；尚未收到第一帧时返回空值。判断充放电状态前还应检查 `ok`、`stale` 和 `present`。

  </TabItem>
</Tabs>

超时且没有数据时，检查目标机 hardware interface 是否正在发布电池数据。
