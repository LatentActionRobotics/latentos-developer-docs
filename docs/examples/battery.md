# 电池状态

机上有电池数据时才能读到。`get_battery` 最多等约 5 秒；`subscribe_battery` 持续打印直到 Ctrl+C。

输出包括 SOC、电压、电流等。C++ 还会打印归一化后的整机 `power_state`（`charging`、`discharging`、`not_charging`、`full` 或 `unknown`）。

## Python

```bash
python3 examples/python/get_battery.py --client-config "$CLIENT"
python3 examples/python/subscribe_battery.py --client-config "$CLIENT"
```

`get_battery.py` 可加 `--timeout-s`（默认 `5`）。

一次性读取会先 `subscribe_battery()`，再轮询 `get_latest_battery()`：

```python
from latentos_high_level_sdk import Client

client = Client(client_config_path=client_config)
try:
    client.subscribe_battery()
    status = client.get_latest_battery()
finally:
    client.close()
```

持续订阅传入回调：

```python
from latentos_high_level_sdk import BatteryStatus, Client

def on_battery(status: BatteryStatus) -> None:
    print(f"soc_percent={status.soc_percent} voltage_v={status.voltage_v}")

client = Client(client_config_path=client_config)
try:
    client.subscribe_battery(on_battery)
finally:
    client.close()
```

## C++

```bash
./build/examples/get_battery --client-config "$CLIENT"
./build/examples/subscribe_battery --client-config "$CLIENT"
```

C++ 使用 `power::PowerClient`：

```cpp
#include <latentos/high_level_sdk/core/session.h>
#include <latentos/high_level_sdk/power/power_client.h>

latentos::high_level_sdk::SdkOptions sdk_options;
sdk_options.client_config_path = client_config;
latentos::high_level_sdk::core::Session session(std::move(sdk_options));
latentos::high_level_sdk::power::PowerClient client(session);

client.SubscribeBattery({});
auto battery = client.GetLatestBattery();
```

超时且没有数据时，检查目标机 hardware interface 是否正在发布电池数据。
