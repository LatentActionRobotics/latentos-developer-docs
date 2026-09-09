# LatentOS High-level SDK

High-level SDK 用来从开发机连上**已经在运行**的机器人或本机仿真，完成常见控制与状态读取：

- 切换运动 `group` / `policy`
- 发送 SE2 速度
- 读取或订阅电池等状态

提供 **C++** 和 **Python** 两套接口。Python 当前覆盖运动与电池；C++ 按模块拆分，除运动和电源外，示例仓库里还有遥测、底层关节、相机、导航等程序。

## 阅读路径

1. [前置条件](/docs/getting-started/prerequisites)
2. [安装 SDK](/docs/getting-started/install)
3. [连接机器人](/docs/getting-started/connect)
4. [Group 与 Policy](/docs/concepts/groups-and-policies)
5. [运行示例](/docs/examples)
6. 接到自己的工程：[C++](/docs/integrate/cpp) 或 [Python](/docs/integrate/python)

## 两套语言的差异

| | Python | C++ |
| --- | --- | --- |
| 入口 | `from latentos_high_level_sdk import Client` | `core::Session` + 各模块 Client，例如 `motion::MotionClient`、`power::PowerClient` |
| 当前示例 | 运动、电池 | 运动、电源、遥测、关节、相机、导航 |
| 构建 | 无需编译 | CMake 3.20+，C++20 |

命令、路径和 API 名在文档中保持原文。示例命令改写自仓库 `latentos_high_level_sdk_example`。
