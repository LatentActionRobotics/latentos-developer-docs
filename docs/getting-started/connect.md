# 连接机器人

High-level SDK 通过 Echo client 配置连上目标机。改示例仓库里的 `config/echo/mode/client.yaml` 的 `connect.endpoints`：

```yaml
mode: client
connect:
  endpoints:
    - tcp/127.0.0.1:7447    # 本机仿真；真机改成 tcp/<机器人IP>:7447
```

后文用 `$CLIENT` 表示这份配置：

```bash
cd /path/to/latentos_high_level_sdk_example
CLIENT="$PWD/config/echo/mode/client.yaml"
```

不传 `--client-config` 时，示例默认使用仓库内这份 yaml。

## 连通性检查

```bash
ping -c 3 <机器人IP>
nc -vz -w 2 <机器人IP> 7447
```

端口 `7447` 必须可达。连不上时见 [常见问题](/docs/faq)。
