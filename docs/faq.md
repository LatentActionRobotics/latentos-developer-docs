# 常见问题

## 连不上 / 命令无响应

目标侧必须已经启动，且 `client.yaml` 里 `connect.endpoints` 的 IP/端口可达。

1. 开发机能否 `ping` 通机器人
2. `client.yaml` 中 IP 是否正确
3. TCP `7447` 是否通：

   ```bash
   nc -vz -w 2 <机器人IP> 7447
   ```

4. 目标机是否在监听 7447：

   ```bash
   sudo ss -lntp '( sport = :7447 )'
   ```

5. SDK 与目标机中间件版本是否配套
6. 防火墙是否允许访问 TCP 7447

## `switch_group to 'locomotion' requires policy`

`locomotion` / `motion_tracking` 必须带 policy；其它 group 不要传 policy。

## group 切换被拒

对照目标机允许的切换路径。例如 `standby` 通常不能直接切 `locomotion`，需经 `stand`。见 [Group 与 Policy](/docs/concepts/groups-and-policies)。

## `current group does not support policy switch`

先 `switch_group` 到 `locomotion` / `motion_tracking`，再用 `switch_policy`。

## 命令收到回复但未执行

不要只检查 `ok`。同时查看：

- `accepted` 是否为 true
- `completed` 是否为 true
- `result_code` 和 `message`
- 机器当前是否正在切换 group
- group 和 policy 名称是否存在

## 电池超时

机上当时没有电池数据。确认 hardware interface 是否正在发布电池数据。`get_battery` 默认最多等约 5 秒。

## `import latentos_high_level_sdk` 失败

检查 `PYTHONPATH` 是否同时包含 SDK 和 Runtime 两个 `site-packages`：

```bash
echo "$PYTHONPATH"
find /data/latentos/high_level_sdk_python/python/site-packages \
  -maxdepth 1 -name 'latentos_high_level_sdk*' -print
```

## CMake 找不到 SDK

错误类似找不到 `latentos_high_level_sdk_core` 或模块包。确保 `CMAKE_PREFIX_PATH` 同时包含：

```text
/data/latentos/high_level_sdk_cpp
/data/latentos/sdk_runtime
/data/latentos/sdk_runtime/third_party
```

```bash
echo "$CMAKE_PREFIX_PATH"
find /data/latentos/high_level_sdk_cpp \
  -iname '*latentos_high_level_sdk*Config*.cmake'
```

## 编译 example 报错

先检查 gcc / g++ 版本，编译示例建议 gcc 13+：

```bash
gcc --version
g++ --version
```

如需安装 gcc 13：

```bash
sudo apt install software-properties-common
sudo add-apt-repository ppa:ubuntu-toolchain-r/test
sudo apt update
sudo apt install gcc-13 g++-13
```

## 安装时显示缺少系统依赖

安装脚本可能检查共享库。若提示 `MISSING libgstrtspserver-1.0.so.0` 一类错误，按提示安装对应包后再装，例如：

```bash
sudo apt-get update
sudo apt-get install libgstrtspserver-1.0-0
```

不要随意加 `--skip-system-check`，除非你明确知道本机已经具备这些库。
