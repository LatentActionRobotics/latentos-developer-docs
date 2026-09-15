# 前置条件

开始前确认开发机和目标机已经具备以下条件。

## 网络与目标机

- 已知机器人的 IP 地址（本机仿真可用 `127.0.0.1`）
- 开发机与机器人网络互通，开发机可以 `ping` 到目标机
- 目标机已安装配套版本的 LatentOS 中间件，并且已经正常启动
- SDK、Runtime 与目标机中间件采用交付说明中验证过的版本组合

## 开发机软件

- **Python**：3.9 或以上（只用 Python SDK 时）

  ```bash
  python3 --version
  ```

- **C++**：CMake 3.20+、C++20 编译器；编译示例建议 gcc / g++ 13+（只用 C++ SDK 时）

  ```bash
  cmake --version
  gcc --version
  g++ --version
  ```

## 交付物

你需要三件东西：

| 交付物 | 作用 |
| --- | --- |
| Runtime | SDK 运行时依赖 |
| C++ SDK 和/或 Python SDK | 开发接口 |
| 示例代码 `latentos_sdk_example` | 编译和对照用法 |

架构必须与开发机一致（x86 或 arm）。Runtime 与 SDK 可能采用不同版本号，请按交付说明选择配套组合。
