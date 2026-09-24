# 切换 Group

将机器切换到指定的运动控制 group。`locomotion` / `motion_tracking` 必须带 policy，其它 group 不要传 policy。名称与切换路径见 [Group 与 Policy](/concepts/groups-and-policies)。

用法：`switch_group <group> [policy] [--client-config PATH]`

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="sdk-lang">
  <TabItem value="cpp" label="C++" default>


```bash
./build/examples/switch_group standby --client-config "$CLIENT"
./build/examples/switch_group passive --client-config "$CLIENT"
./build/examples/switch_group stand --client-config "$CLIENT"
./build/examples/switch_group sit_down --client-config "$CLIENT"

./build/examples/switch_group locomotion default --client-config "$CLIENT"
./build/examples/switch_group locomotion policy1 --client-config "$CLIENT"
./build/examples/switch_group motion_tracking backflip --client-config "$CLIENT"
```

```cpp showLineNumbers
#include <latentos/sdk/core/session.h>
#include <latentos/sdk/motion/motion_client.h>

latentos::sdk::core::Session session(std::move(sdk_options));
latentos::sdk::motion::MotionClient client(session);

latentos::sdk::CommandOptions command_options;
command_options.timeout_ms = 1000;
auto result = client.SwitchGroup("locomotion", "default", command_options);
```

  </TabItem>

  <TabItem value="python" label="Python">


```bash
python3 examples/python/switch_group.py standby --client-config "$CLIENT"
python3 examples/python/switch_group.py passive --client-config "$CLIENT"
python3 examples/python/switch_group.py stand --client-config "$CLIENT"
python3 examples/python/switch_group.py sit_down --client-config "$CLIENT"

python3 examples/python/switch_group.py locomotion default --client-config "$CLIENT"
python3 examples/python/switch_group.py locomotion policy1 --client-config "$CLIENT"
python3 examples/python/switch_group.py motion_tracking backflip --client-config "$CLIENT"
```

```python showLineNumbers
from latentos_sdk import Client, CommandOptions

client = Client(client_config_path=client_config)
try:
    result = client.switch_group("stand", "", CommandOptions(timeout_ms=1000))
    print(f"ok={result.ok} accepted={result.accepted} message={result.message}")
finally:
    client.close()
```

  </TabItem>
</Tabs>

典型上电：

```bash
python3 examples/python/switch_group.py passive --client-config "$CLIENT"
python3 examples/python/switch_group.py stand --client-config "$CLIENT"
python3 examples/python/switch_group.py locomotion default --client-config "$CLIENT"
```
