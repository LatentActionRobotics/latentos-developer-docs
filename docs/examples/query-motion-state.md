# 查询运动控制状态

查询当前运动控制状态。`current_group` 表示当前 group（如 `stand` / `sit_down` / `passive`）；切换过程中还可看 `target_group` 与 `is_transitioning`。Group 名称含义见 [Group 与 Policy](/concepts/groups-and-policies)。

用法：`query_motion_state [--client-config PATH]`

底层 API 为 `query_motion_control_state` / `QueryMotionControlState`。

## Python

```bash
python3 examples/python/query_motion_state.py --client-config "$CLIENT"
```

```python
from latentos_high_level_sdk import Client, QueryOptions

client = Client(client_config_path=client_config)
try:
    state = client.query_motion_control_state(QueryOptions(timeout_ms=1000))
    print(
        f"ok={state.ok} current_group={state.current_group} "
        f"target_group={state.target_group} is_transitioning={state.is_transitioning}"
    )
finally:
    client.close()
```

## C++

```bash
./build/examples/query_motion_state --client-config "$CLIENT"
```

```cpp
#include <latentos/high_level_sdk/core/session.h>
#include <latentos/high_level_sdk/motion/motion_client.h>

latentos::high_level_sdk::core::Session session(std::move(sdk_options));
latentos::high_level_sdk::motion::MotionClient client(session);

latentos::high_level_sdk::QueryOptions query_options;
query_options.timeout_ms = 1000;
auto state = client.QueryMotionControlState(query_options);
```
