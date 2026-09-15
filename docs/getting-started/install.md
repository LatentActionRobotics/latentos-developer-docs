# 安装 SDK

先装 **Runtime**，再装 SDK。需要写入 `/data` 时使用 `sudo`。

当前交付物通常是三个目录，每个里面有 `latentos-<组件>-<ver>-<arch>.tar.gz` 和 `activate.sh`。`--prefix` 可选，脚本已写好默认前缀。

| 组件 | 交付目录 | 默认前缀 |
| --- | --- | --- |
| Runtime | `sdk_runtime/` | `/data/latentos/sdk_runtime` |
| C++ SDK | `latentos_sdk_cpp/` | `/data/latentos/sdk_cpp` |
| Python SDK | `latentos_sdk_python/` | `/data/latentos/sdk_python` |

```bash
cd sdk_runtime
sudo ./activate.sh latentos-sdk_runtime-<ver>-<arch>.tar.gz
cd ../latentos_sdk_cpp
sudo ./activate.sh latentos-sdk_cpp-<ver>-<arch>.tar.gz
cd ../latentos_sdk_python
sudo ./activate.sh latentos-sdk_python-<ver>-<arch>.tar.gz
```

`activate.sh` 常用参数：

| 参数 | 必选 | 默认 | 作用 |
| --- | --- | --- | --- |
| `<archive>` | 是 | | 要安装的压缩包 |
| `--prefix` | 否 | 见上表 | 装到哪个目录 |
| `--force` | 否 | 关 | 这个版本已经装过时再装一遍 |
| `--skip-system-check` | 否 | 关 | 不检查本机缺不缺库 |

- 只用 C++ 或只用 Python 时，装 Runtime + 对应那一个 SDK 即可
- Runtime 与 SDK 应采用交付说明中验证过的版本组合；它们的版本号不要求相同

若交付物是带 `install.sh` 的 cpp / python 包，按其说明安装；内部仍会落到 `/data/latentos/...`。

## 环境变量

路径若使用默认前缀，按语言设置：

```bash
# C++ 构建 / 链接
export CMAKE_PREFIX_PATH="/data/latentos/sdk_cpp:/data/latentos/sdk_runtime:/data/latentos/sdk_runtime/third_party"

# Python
export PYTHONPATH="/data/latentos/sdk_python/python/site-packages:/data/latentos/sdk_runtime/python/site-packages${PYTHONPATH:+:$PYTHONPATH}"
```

先确认能 import：

```bash
python3 -c 'from latentos_sdk import Client'
```

SDK 1.1 仍提供旧安装路径和 `high_level` 名称的兼容入口，仅用于旧项目迁移；新项目不要继续引用这些名称。

检查安装结果：

```bash
sudo ls -ld \
  /data/latentos/sdk_runtime \
  /data/latentos/sdk_cpp \
  /data/latentos/sdk_python
```
