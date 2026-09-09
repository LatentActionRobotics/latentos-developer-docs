# 发送速度

关闭遥控速度与速度平滑后，约 10Hz 发 10 帧 SE2 速度。一般先切到 `locomotion`。参数为 `x` `y` `yaw`。

## Python

```bash
python3 examples/python/send_velocity.py 0.1 0 0 --client-config "$CLIENT"
python3 examples/python/send_velocity.py 0 0 0.2 --client-config "$CLIENT"   # 原地左转
```

```python
from latentos_high_level_sdk import Client

client = Client(client_config_path=client_config)
try:
    client.set_remote_velocity_control(False)
    client.set_velocity_smoothing(False)
    client.send_velocity(0.1, 0.0, 0.0)
finally:
    client.close()
```

## C++

```bash
./build/examples/send_velocity 0.1 0 0 --client-config "$CLIENT"
./build/examples/send_velocity 0 0 0.2 --client-config "$CLIENT"
```

```cpp
latentos::high_level_sdk::motion::MotionClient client(session);
client.SetRemoteVelocityControl(false, {});
client.SetVelocitySmoothing(false, {});
client.SendVelocity(0.1, 0.0, 0.0);
```

典型上电后再发速度：

```bash
python3 examples/python/switch_group.py passive --client-config "$CLIENT"
python3 examples/python/switch_group.py stand --client-config "$CLIENT"
python3 examples/python/switch_group.py locomotion default --client-config "$CLIENT"
python3 examples/python/send_velocity.py 0.1 0 0 --client-config "$CLIENT"
```
