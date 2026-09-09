# 切换 Policy

只在当前 group 为 `locomotion` 或 `motion_tracking` 时有效。其它 group 会报 `current group does not support policy switch`。先 [切换 group](/docs/examples/switch-group)，再切换 policy。

用法：`switch_policy <policy> [--client-config PATH]`

## Python

```bash
python3 examples/python/switch_policy.py default --client-config "$CLIENT"
python3 examples/python/switch_policy.py policy2 --client-config "$CLIENT"
python3 examples/python/switch_policy.py backflip --client-config "$CLIENT"
```

Python 接口名是 `switch_current_policy`：

```python
from latentos_high_level_sdk import Client, CommandOptions

client = Client(client_config_path=client_config)
try:
    result = client.switch_current_policy("policy2", CommandOptions(timeout_ms=1000))
finally:
    client.close()
```

## C++

```bash
./build/examples/switch_policy default --client-config "$CLIENT"
./build/examples/switch_policy policy2 --client-config "$CLIENT"
./build/examples/switch_policy backflip --client-config "$CLIENT"
```

```cpp
auto result = client.SwitchCurrentPolicy("policy2", command_options);
```
