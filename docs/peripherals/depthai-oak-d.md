---
sidebar_label: DepthAI / OAK-D
---

# DepthAI / OAK-D

本页将说明在已验证的板卡与系统镜像上，安装 / 使用 Luxonis DepthAI，并对 OAK 系列深度相机做基本功能验证。

DepthAI 为上游开源 SDK，功能与兼容性以其官方文档为准；本站文档侧重已验证配置与预编译包使用说明。

经 LatentOS SDK 控制机器狗上相机时，请改看 [相机控制](/examples/camera)。

## **重要说明与责任边界**

DepthAI 是由 Luxonis 开发和维护的开源 SDK，不属于本板卡或系统镜像的自研 SDK。DepthAI 的功能、接口、缺陷修复、版本更新、安全性和后续兼容性均由其上游项目负责，并受相应开源许可证及官方条款约束。

本文档的目的仅限于：

- 说明 DepthAI 3\.10\.0 已在本文所列 RK3588 板卡、系统镜像和 OAK\-D Pro Wide 相机组合上完成可行性验证；

- 提供快速配置与基本功能验证方法；

- 提供一个基于官方源码构建的预编译 C\+\+ 包和部分验证示例，减少重复编译工作。

本文档、预编译包和示例不替代 Luxonis 官方文档，也不构成对 DepthAI SDK 本身的功能、质量、性能、稳定性或持续兼容性的承诺。由官方 SDK 自身引起的问题，应优先参考 Luxonis 官方文档、版本说明和问题跟踪系统。

本文中的预期结果只适用于已验证配置。更换相机型号、板卡型号、系统镜像、编译器、DepthAI 版本、USB 线缆、USB 拓扑或供电条件后，设备识别、USB 速度、图像分辨率、深度效果和运行稳定性都可能不同，需要重新验证。

## 预编译包及示例

C\+\+ 预编译包：

链接: https://pan.baidu.com/s/1uweACtSOZt35KZ-PeX4Pow
提取码: 8br6

Python 示例：

链接: https://pan.baidu.com/s/1zGt6grN-FDwub-3jFsD21A
提取码: fxd5

## 适用环境

本文适用于以下环境：

|项目|配置|
|---|---|
|板卡|RK3588 / aarch64|
|操作系统|Ubuntu 22\.04|
|C/C\+\+ 编译器|GCC/G\+\+ 13\.4|
|CMake|3\.22\.1|
|Python|3\.10\.12|
|DepthAI|3\.10\.0|
|相机|Luxonis OAK\-D Pro Wide|
|连接方式|USB 3 SuperSpeed，板卡直接供电|

相机通过 USB 3 接入板卡，并由板卡 USB 端口直接供电，不需要单独供电。

### 安装位置

建议将 SDK、Python 虚拟环境、源码、构建目录、示例和采集结果统一放在数据分区，否则在更新镜像时，系统分区中的文件可能被覆盖。建议安装位置：

```Bash
/data/depthai/
```

本文后续命令均以该目录为例。采用不格式化数据分区的常规刷新方式时，`/data` 中的内容通常可以保留；刷新镜像前仍应备份重要数据。如果刷机过程包含重新分区或格式化 `/data`，其中的内容也会丢失。

通过 `apt` 安装的系统依赖以及写入 `/etc/udev/rules.d/` 的 USB 权限规则属于系统分区内容。刷新镜像后，即使 `/data` 中的 SDK 仍然存在，也应重新安装系统依赖并配置 USB 权限规则。

## 连接和识别相机

使用支持 USB 3 SuperSpeed 的数据线，将相机接入板卡的 USB 3 端口。安装 USB 权限规则：

```Bash
echo 'SUBSYSTEM=="usb", ATTRS{idVendor}=="03e7", MODE="0666"' \
| sudo tee /etc/udev/rules.d/80-movidius.rules > /dev/null

sudo udevadm control --reload-rules
sudo udevadm trigger
```

重新插拔相机，然后检查设备：

```Bash
lsusb | grep 03e7
lsusb -t
```

应用程序未运行时，相机可能显示为：

```Bash
03e7:2485 Movidius MyriadX
```

DepthAI 程序启动后，相机会重新枚举为：

```Bash
03e7:f63b Luxonis Device
```

程序启动和退出时出现一次 `USB disconnect` 属于正常的设备重枚举。

## Python 环境

### 创建虚拟环境

```Bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv

mkdir -p /data/depthai/python
python3 -m venv /data/depthai/python/depthai-v3
source /data/depthai/python/depthai-v3/bin/activate

python -m pip install --upgrade pip
python -m pip install "depthai==3.10.0"
```

确认安装结果：

```Bash
python -c "import depthai as dai; print(dai.__version__)"
```

预期输出：

```Bash
3.10.0
```

### 设备信息验证

将示例传到板子上并解压，进入文件夹：

```Bash
cd /data/depthai/python/depthai-python
source /data/depthai/python/depthai-v3/bin/activate
export DEPTHAI_TELEMETRY=0

python basic_info.py
```

预期核心结果：

```Bash
DepthAI version: 3.10.0
Device: OAK-D-PRO-W
USB speed: UsbSpeed.SUPER
Camera sockets: [CAM_A, CAM_B, CAM_C]
```

`CAM_A` 是彩色相机，`CAM_B` 和 `CAM_C` 是左右目相机。USB 速度应为 `SUPER` 或 `SUPER_PLUS`。

### 图像采集验证

```Bash
python capture_all_cameras.py
```

成功后会生成：

```Bash
oak_rgb.ppm
oak_left.pgm
oak_right.pgm
```

并输出：

```Bash
ALL_CAMERAS_CAPTURE_SUCCESS
```

### 深度图验证

```Bash
python capture_depth.py
```

成功后会生成：

```Bash
oak_depth_mm.png
oak_depth_preview.png
oak_depth_info.json
```

- `oak_depth_mm.png` 是 16 位深度图，像素值单位为毫米，0 表示无效深度；

- `oak_depth_preview.png` 是用于查看的 8 位预览图；

- `oak_depth_info.json` 保存分辨率和有效深度统计。

程序应输出：

```Bash
DEPTH_CAPTURE_SUCCESS
```

## C\+\+ 环境

提供的预编译包适用于本文所述 Ubuntu 22\.04、GCC 13 板卡镜像。建议将目录放到`/data/depthai/cpp/dethai-cpp-dist`下操作。

### 校验并解压

```Bash
cd /data/depthai/cpp/dethai-cpp-dist

sha256sum -c depthai-sdk-3.10.0-rk3588-ubuntu22.04-gcc13-arm64.tar.gz.sha256

tar -xzf depthai-sdk-3.10.0-rk3588-ubuntu22.04-gcc13-arm64.tar.gz

cd depthai-sdk-3.10.0-rk3588-ubuntu22.04-gcc13-arm64
```

校验结果应为：

```Bash
depthai-sdk-3.10.0-rk3588-ubuntu22.04-gcc13-arm64.tar.gz: OK
```

### 安装编译工具

```Bash
sudo apt update
sudo apt install -y build-essential cmake ninja-build
```

### 编译并运行设备信息示例

```Bash
cmake \
-S examples/basic-info \
-B build/basic-info \
-G Ninja \
-DCMAKE_BUILD_TYPE=Release \
-DCMAKE_PREFIX_PATH="$PWD/sdk"

cmake --build build/basic-info --parallel 2

DEPTHAI_TELEMETRY=0  ./build/basic-info/depthai_basic_info
```

预期核心结果：

```Bash
DepthAI version: 3.10.0
Device: OAK-D-PRO-W
USB speed: SUPER
Camera count: 3
Camera: CAM_A
Camera: CAM_B
Camera: CAM_C
TEST_SUCCESS
```

### 编译并运行深度图示例

```Bash
cmake \
-S examples/depth-capture \
-B build/depth-capture \
-G Ninja \
-DCMAKE_BUILD_TYPE=Release \
-DCMAKE_PREFIX_PATH="$PWD/sdk"

cmake --build build/depth-capture --parallel 2

DEPTHAI_TELEMETRY=0  ./build/depth-capture/depthai_depth_capture
```

程序应输出 `TEST_SUCCESS`，并生成：

```Bash
depth_16bit.pgm
```

该文件是 640×400、16 位深度图，像素值单位为毫米。检查文件：

```Bash
head -n 3 depth_16bit.pgm
stat -c '%n %s bytes' depth_16bit.pgm
```

预期结果：

```Bash
P5
640 400
65535
depth_16bit.pgm 512017 bytes
```

## 从官方源码构建 C\+\+ SDK

> 如果不使用预编译包，可以从 Luxonis 官方仓库构建 DepthAI 3\.10\.0。源码构建过程中会下载 vcpkg 依赖和设备固件，需要保证板卡能够访问相关下载地址，或提前准备代理和下载缓存。
> 
> 

### 安装构建依赖

```Bash
sudo apt update

sudo apt install -y \
build-essential \
cmake \
ninja-build \
git \
curl \
unzip \
zip \
pkg-config \
libudev-dev
```

CMake 版本需要不低于 3\.20，编译器需要支持 C\+\+17。

### 获取固定版本源码

```Bash
mkdir -p /data/depthai/cpp
cd /data/depthai/cpp

git clone \
--branch v3.10.0 \
--recursive \
https://github.com/luxonis/depthai-core.git

cd depthai-core
git submodule status --recursive
```

如果在其他计算机下载后再复制到板卡，应保留全部子模块和 `.git` 目录。不要使用 `source/*` 形式复制，否则隐藏目录可能被遗漏。

### 配置无 OpenCV 构建

```Bash
export VCPKG_MAX_CONCURRENCY=2
export VCPKG_DISABLE_METRICS=1

cmake \
-S . \
-B build \
-G Ninja \
-DCMAKE_BUILD_TYPE=Release \
-DCMAKE_INSTALL_PREFIX="$PWD/install" \
-DBUILD_SHARED_LIBS=ON \
-DDEPTHAI_OPENCV_SUPPORT=OFF \
-DDEPTHAI_BUILD_PYTHON=OFF \
-DDEPTHAI_BUILD_EXAMPLES=OFF \
-DDEPTHAI_BUILD_TESTS=OFF \
-DDEPTHAI_BUILD_DOCS=OFF \
-DDEPTHAI_ENABLE_DEVICE_RVC4_FW=OFF
```

其中 `DEPTHAI_ENABLE_DEVICE_RVC4_FW=OFF` 仅表示本次不打包 RVC4 设备固件；OAK\-D Pro Wide 属于 RVC2 设备。如果要支持其他型号，应先确认其硬件平台并调整该选项。

可按需要调整常用选项：

- 需要编译官方 C\+\+ 示例：设置 `DEPTHAI_BUILD_EXAMPLES=ON`。部分示例可能依赖 OpenCV。

- 需要 OpenCV 相关功能：安装 OpenCV，并设置 `DEPTHAI_OPENCV_SUPPORT=ON`。

- 需要从源码构建 Python 绑定：设置 `DEPTHAI_BUILD_PYTHON=ON`；仅做 Python 快速验证时，通常直接使用 pip 安装更简单。

- 需要测试或文档：分别启用 `DEPTHAI_BUILD_TESTS` 或 `DEPTHAI_BUILD_DOCS`。

本文提供的预编译包采用了更精简的功能组合，以减少不必要的依赖。自行构建时不要求与预编译包使用完全相同的开关。全部选项及默认值以对应版本源码中的 [cmake/depthaiOptions\.cmake](https://github.com/luxonis/depthai-core/blob/v3.10.0/cmake/depthaiOptions.cmake) 为准。

### 编译并安装

```Bash
cmake --build build --parallel 2
cmake --install build
```

安装结果位于：

```Plain Text
depthai-core/install/
├── include/
├── lib/
└── share/
```

在其他 CMake 项目中使用该安装结果时，配置：

```Bash
cmake \
-S /path/to/project \
-B /path/to/build \
-DCMAKE_PREFIX_PATH=/absolute/path/to/depthai-core/install
```

随后可以使用第 5 节中的设备信息和深度图示例进行验证，只需把 `CMAKE_PREFIX_PATH` 改为该源码安装目录。

## 常见问题

### 找不到相机或权限不足

确认 `/etc/udev/rules.d/80-movidius.rules` 已安装，重新加载规则并重新插拔相机。

### USB 速度显示为 `HIGH`

`HIGH` 表示 USB 2。请更换支持 SuperSpeed 的线缆或 USB 3 端口，并在采集程序运行期间再次检查。

### 程序启动时出现 `USB disconnect`

应用程序启动相机固件时会发生一次正常重枚举。只有在采集过程中持续、反复断开才需要检查线缆、接口和板卡供电。

## 官方资料

- DepthAI Core：[https://github\.com/luxonis/depthai\-core](https://github.com/luxonis/depthai-core)

- DepthAI Core v3\.10\.0：[https://github\.com/luxonis/depthai\-core/tree/v3\.10\.0](https://github.com/luxonis/depthai-core/tree/v3.10.0)

- DepthAI Python：[https://github\.com/luxonis/depthai\-python](https://github.com/luxonis/depthai-python)

- DepthAI 文档：[https://docs\.luxonis\.com/](https://docs.luxonis.com/)
