---
sidebar_label: 相机控制（Camera）
---

# Camera API

`camera` 模块提供相机能力查询，以及异步控件/推流/流参数设置：

- **同步查询**：`QueryCapabilities()` 返回相机列表、当前配置、可用 profile 与控件范围。
- **异步设置**：`SetControl` / `SendStreamCommand` / `SetStreamParams` 返回 `seq`；最终结果经对应 `Subscribe*Status` 到达。

调用设置接口前应先查询能力，并遵守返回的取值范围与 flags。

应用侧至少包含 Session 与 Camera Client 头文件；能力与状态类型头文件已由后者间接引入：

```cpp
#include <latentos/sdk/core/session.h>
#include <latentos/sdk/camera/camera_client.h>
```

CMake 中查找并链接对应模块包。安装前缀需已加入 `CMAKE_PREFIX_PATH`（常见为 `/data/latentos/sdk_cpp`）：

```cmake
find_package(latentos_sdk_camera CONFIG REQUIRED)
target_link_libraries(my_app PRIVATE latentos::sdk_camera)
```

入口类为 `latentos::sdk::camera::CameraClient`，构造时传入已配置好的 `core::Session`。公开方法如下：

```cpp showLineNumbers
explicit CameraClient(core::Session& session);

CameraCapabilities QueryCapabilities(std::string camera_id = "",
                                     bool force_refresh = false,
                                     int timeout_ms = 1000);
std::int64_t SetControl(std::string camera_id,
                        CameraFeature feature,
                        std::int64_t value);
void SubscribeControlStatus(ControlStatusCallback callback);
std::optional<CameraControlStatus> GetLatestControlStatus() const;
std::int64_t SendStreamCommand(std::string camera_id,
                               CameraOperation operation,
                               std::string rtsp_ip = "");
void SubscribeStreamStatus(StreamStatusCallback callback);
std::optional<CameraStreamStatus> GetLatestStreamStatus() const;
std::int64_t SetStreamParams(std::string camera_id,
                             std::int32_t width,
                             std::int32_t height,
                             std::int32_t fps,
                             std::int32_t bitrate_kbps);
void SubscribeStreamParamsStatus(StreamParamsStatusCallback callback);
std::optional<CameraStreamParamsStatus> GetLatestStreamParamsStatus() const;
```

## 方法

| 方法 | 说明 |
| --- | --- |
| `QueryCapabilities` | 同步查询能力表；`camera_id` 为空表示全部相机 |
| `SetControl` | 异步设置控件；返回 `seq` |
| `SubscribeControlStatus` / `GetLatestControlStatus` | 订阅/读取控件设置结果 |
| `SendStreamCommand` | 异步启停/重启推流；返回 `seq` |
| `SubscribeStreamStatus` / `GetLatestStreamStatus` | 订阅/读取推流状态 |
| `SetStreamParams` | 异步设置分辨率、帧率、码率；返回 `seq` |
| `SubscribeStreamParamsStatus` / `GetLatestStreamParamsStatus` | 订阅/读取流参数结果 |

异步设置只表示请求已发出；应用必须用 `camera_id` 与 `seq` 关联请求与状态，同时检查 `ok` 和对应 `result_code`。

## 能力查询

`QueryCapabilities()` 是同步查询；`camera_id` 为空时查询全部相机。

`CameraCapabilities`：

| 字段 | 说明 |
| --- | --- |
| `ok` / `result_code` / `result_message` | 查询结果 |
| `seq` | 请求序号 |
| `cameras` | `std::vector<CameraInfo>` |

每个 `CameraInfo` 包含相机 `id`、`frame_id`、是否正在推流、当前配置、支持的 `profiles` 和 `controls`。

`CameraProfile` 包含 `format`、`width`、`height`、`fps`；`CameraControl` 包含功能、最小值、最大值、步长、默认值、当前值和 flags。

### 查询能力示例

```cpp showLineNumbers
#include <latentos/sdk/camera/camera_client.h>
#include <latentos/sdk/core/session.h>

#include <iostream>
#include <utility>

latentos::sdk::SdkOptions options;
options.client_config_path = "config/echo/mode/client.yaml";
latentos::sdk::core::Session session(std::move(options));
latentos::sdk::camera::CameraClient camera(session);

const auto caps = camera.QueryCapabilities(/*camera_id=*/"");
std::cout << "ok=" << caps.ok
          << " code=" << latentos::sdk::ToString(caps.result_code)
          << " seq=" << caps.seq << '\n';

for (const auto& cam : caps.cameras) {
  std::cout << "camera " << cam.id
            << " streaming=" << cam.streaming
            << " current=" << cam.current.width << 'x' << cam.current.height
            << '@' << cam.current.fps << '\n';
}
```

## 相机枚举

### CameraFeature

`Brightness`、`Contrast`、`Saturation`、`Hue`、`Gamma`、`Gain`、`Sharpness`、`BacklightCompensation`、`PowerLineFrequency`、自动/手动白平衡、自动/手动曝光、自动/手动对焦、`ZoomAbsolute`、`PanAbsolute`、`TiltAbsolute`。

### CameraPixelFormat

`None`、`Mjpeg`、`Yuyv`、`Nv12`。

### CameraOperation

`Unknown`、`Start`、`Stop`、`Restart`。

### CameraStreamState

`Stopped`、`Running`、`Recovering`、`Error`。

## 异步设置

`SetControl()`、`SendStreamCommand()` 和 `SetStreamParams()` 返回 `seq`，只表示设置请求已经发送。最终结果通过相应状态订阅返回：

| 设置方法 | 状态类型 | 结果重点 |
| --- | --- | --- |
| `SetControl` | `CameraControlStatus` | `camera_id`、`seq`、`ok`、`result_code`、`effective_value` |
| `SendStreamCommand` | `CameraStreamStatus` | `camera_id`、`seq`、`stream_state`、`enabled`、`uri` |
| `SetStreamParams` | `CameraStreamParamsStatus` | `camera_id`、`seq`、实际分辨率、帧率和码率 |

### 启动推流示例

先订阅状态，再发送命令，用返回的 `seq` 匹配结果：

```cpp showLineNumbers
camera.SubscribeStreamStatus(
    [](const latentos::sdk::CameraStreamStatus& status) {
      std::cout << "camera=" << status.camera_id
                << " seq=" << status.seq
                << " ok=" << status.ok
                << " state=" << latentos::sdk::ToString(status.stream_state)
                << " uri=" << status.uri << '\n';
    });

const auto seq = camera.SendStreamCommand(
    "front_0", latentos::sdk::CameraOperation::Start);
std::cout << "sent start, seq=" << seq << '\n';
```

### 设置控件示例

```cpp showLineNumbers
camera.SubscribeControlStatus(
    [](const latentos::sdk::CameraControlStatus& status) {
      if (!status.ok) {
        std::cerr << status.result_message << '\n';
        return;
      }
      std::cout << "feature applied, effective=" << status.effective_value
                << '\n';
    });

const auto seq = camera.SetControl(
    "front_0", latentos::sdk::CameraFeature::Brightness, /*value=*/128);
(void)seq;
```

公开工具函数：

```cpp showLineNumbers
const char* ToString(CameraFeature value);
// 其他 Camera 枚举也提供 ToString 重载。
bool CameraHasControlFlag(std::int32_t flags, CameraControlFlag flag);
std::string CameraControlFlagsToString(std::int32_t flags);
```

常见失败原因包括相机不存在、功能不支持、参数越界、设备未就绪、远程控制关闭、设备忙或当前未推流。具体结果使用对应的 `Camera*ResultCode` 判断。

完整示例见 `latentos_sdk_example` 的 `camera_capabilities`、`camera_set_control`、`camera_set_stream`、`camera_set_stream_params`，以及文档 [相机控制](../../examples/camera.md)。

## 相关文档

- [C++ SDK 指南](../../sdk/cpp.md)
- [相机控制](../../examples/camera.md)
- [示例总览](../../examples/index.md)
