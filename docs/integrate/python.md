# 在 Python 工程中使用

Python SDK 通过统一的 `Client` 访问运动与电池接口。

## 最小工程

```text
my_latentos_python_project/
├── config/
│   └── client.yaml
└── main.py
```

## 配置环境

```bash
export PYTHONPATH="/data/latentos/high_level_sdk_python/python/site-packages:/data/latentos/sdk_runtime/python/site-packages${PYTHONPATH:+:$PYTHONPATH}"
python3 -c 'from latentos_high_level_sdk import Client'
```

需要 Python 3.9 或以上。不需要现场 `pip install`。

## 创建 Client

`client_config_path` 必须指向有效的 Echo client yaml。用完后调用 `close()`。

```python
from latentos_high_level_sdk import Client, CommandOptions

client = Client(client_config_path="config/client.yaml")
try:
    result = client.switch_group("stand", "", CommandOptions(timeout_ms=1000))
    result = client.switch_group("locomotion", "default", CommandOptions(timeout_ms=1000))
    result = client.switch_current_policy("policy2", CommandOptions(timeout_ms=1000))
    client.set_remote_velocity_control(False)
    client.set_velocity_smoothing(False)
    client.send_velocity(0.1, 0.0, 0.0)

    client.subscribe_battery()
    status = client.get_latest_battery()
finally:
    client.close()
```

常用接口：

| 接口 | 说明 |
| --- | --- |
| `switch_group(group, policy)` | 切换运动 group |
| `switch_current_policy(policy)` | 切换当前 group 的 policy |
| `set_velocity_smoothing(enabled)` | 开启或关闭速度平滑 |
| `set_remote_velocity_control(enabled)` | 开启或关闭遥控速度控制 |
| `send_velocity(x, y, yaw)` | 发送速度指令 |
| `subscribe_battery(callback=None)` | 订阅电池；可传入回调 |
| `get_latest_battery()` | 读取本地缓存的最新电池状态 |

命令类接口返回 `CommandResult`。至少同时检查 `ok` 和 `accepted`，不要只看 `ok`。字段含义见 [C++ 工程集成](/docs/integrate/cpp#命令返回值)。
