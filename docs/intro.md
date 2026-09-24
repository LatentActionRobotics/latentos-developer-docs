# LatentOS SDK

LatentOS SDK 用来从开发机连上**已经在运行**的机器人或本机仿真，完成常见控制与状态读取：

- 切换运动 `group` / `policy`
- 发送 SE2 速度
- 读取或订阅电池等状态

提供 **C++** 和 **Python** 两套接口。C++ 按模块提供运动、电源、遥测、底层关节、相机和导航等能力；Python 当前覆盖运动与电池。

## 阅读路径

1. [P30 产品参数](/product/p30)（可选）
2. [前置条件](/getting-started/prerequisites)
3. [安装 SDK](/getting-started/install)
4. [连接机器人](/getting-started/connect)
5. [了解 C++ SDK](/sdk/cpp)
6. [Group 与 Policy](/concepts/groups-and-policies)
7. [运行示例](/examples)
8. 接到自己的工程：[C++](/integrate/cpp) 或 [Python](/integrate/python)

## 两套语言的差异

| | C++ | Python |
| --- | --- | --- |
| 入口 | `core::Session` + 各模块 Client，例如 `motion::MotionClient`、`power::PowerClient` | `from latentos_sdk import Client` |
| 当前示例 | 运动、电源、遥测、关节、相机、导航 | 运动、电池 |
| 构建 | CMake 3.20+，C++20 | 无需编译 |


本文档以 SDK 1.1 的规范名称为准，示例来自 `latentos_sdk_example`。1.1 仍保留 1.0.x 的 `high_level` 名称兼容层，旧源码通常可以重新编译；新工程请统一使用 `latentos_sdk`、`latentos::sdk` 和 `<latentos/sdk/...>`。
