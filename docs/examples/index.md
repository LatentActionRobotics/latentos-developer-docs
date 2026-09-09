---
sidebar_label: 示例总览
---

# 运行示例

示例代码在 `latentos_high_level_sdk_example` 仓库中。先完成 [安装](/docs/getting-started/install) 和 [连接配置](/docs/getting-started/connect)，再在仓库根目录操作。

后文用 `$CLIENT` 表示：

```bash
cd /path/to/latentos_high_level_sdk_example
CLIENT="$PWD/config/echo/mode/client.yaml"
```

## 核心示例

| 示例 | 功能 |
| --- | --- |
| [get_battery / subscribe_battery](/docs/examples/battery) | 获取一次或持续订阅电池状态 |
| [switch_group](/docs/examples/switch-group) | 切换运动 group |
| [switch_policy](/docs/examples/switch-policy) | 在当前 group 内切换 policy |
| [send_velocity](/docs/examples/send-velocity) | 发送 SE2 速度 |

Python 与 C++ 同名示例的参数一致（`--client-config` 可选）。只读数据都成对提供 `get_*`（一次性）与 `subscribe_*`（持续）。

## Python

在仓库根目录执行，无需编译。需要 Python 3.9+，并已设置 `PYTHONPATH`。

```bash
python3 -c 'from latentos_high_level_sdk import Client'
```

## C++

```bash
cd /path/to/latentos_high_level_sdk_example
export CMAKE_PREFIX_PATH="/data/latentos/high_level_sdk_cpp:/data/latentos/sdk_runtime:/data/latentos/sdk_runtime/third_party"
cmake -S examples/cpp -B build/examples
cmake --build build/examples -j
```

每个示例按模块组织（`motion/` `telemetry/` `low_level/` `power/` `camera/` `nav/`）。CMake 会对每个模块 `find_package(... QUIET)`，只编译已安装模块的示例，缺失的模块打印 `skipping ... examples` 并跳过，不报错。

核心示例编译后位于：

```text
build/examples/get_battery
build/examples/subscribe_battery
build/examples/send_velocity
build/examples/switch_group
build/examples/switch_policy
```

## 其他 C++ 模块

第一版不单独展开这些示例，只列出模块对照。危险操作请先在仿真或吊架下试验，不要直接在真机上开环跑。

| 模块 | 示例 | 说明 |
| --- | --- | --- |
| `telemetry` | `get_imu`、`subscribe_imu`、`get_gnss`、`subscribe_gnss` | IMU / GNSS |
| `low_level` | `get_joint_state`、`subscribe_joint_state`、`send_joint_command` | 关节状态；`send_joint_command` 是开环 MIT 命令，可能让机器摔倒 |
| `power` | `get_power_*` / `subscribe_power_*`、`power_control` | PMU 只读与控制；`power_control` 会开关电源/灯/风扇 |
| `camera` | `camera_capabilities`、`camera_set_control`、`camera_set_stream`、`camera_set_stream_params` | 相机能力、控件、推流 |
| `nav` | `advertise_pointcloud` | 上报点云流地址 |

典型上电后发速度：

```text
passive → stand → locomotion default → send_velocity
```
