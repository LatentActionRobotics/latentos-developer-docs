---
sidebar_label: Camera
---

# Camera API

```cpp
#include <latentos/sdk/camera/camera_client.h>
```

```cmake
find_package(latentos_sdk_camera CONFIG REQUIRED)
target_link_libraries(my_app PRIVATE latentos::sdk_camera)
```

类：`latentos::sdk::camera::CameraClient`

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

## 能力查询

`QueryCapabilities()` 是同步查询；`camera_id` 为空时查询全部相机。

`CameraCapabilities`：

| 字段 | 说明 |
| --- | --- |
| `ok` / `result_code` / `result_message` | 查询结果 |
| `seq` | 请求序号 |
| `cameras` | `std::vector<CameraInfo>` |

每个 `CameraInfo` 包含相机 `id`、`frame_id`、是否正在推流、当前配置、支持的 `profiles` 和 `controls`。

`CameraProfile` 包含 `format`、`width`、`height`、`fps`；`CameraControl` 包含功能、最小值、最大值、步长、默认值、当前值和 flags。调用设置接口前应先查询并遵守这些能力范围。

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

应用必须用 `camera_id` 和 `seq` 关联请求与结果，同时检查 `ok` 和对应 `result_code`。

```cpp showLineNumbers
client.SubscribeStreamStatus([](const latentos::sdk::CameraStreamStatus& status) {
  // 使用 status.seq 与发送接口返回值匹配。
});

const auto seq = client.SendStreamCommand(
    "front_0", latentos::sdk::CameraOperation::Start);
```

公开工具函数：

```cpp showLineNumbers
const char* ToString(CameraFeature value);
// 其他 Camera 枚举也提供 ToString 重载。
bool CameraHasControlFlag(std::int32_t flags, CameraControlFlag flag);
std::string CameraControlFlagsToString(std::int32_t flags);
```

常见失败原因包括相机不存在、功能不支持、参数越界、设备未就绪、远程控制关闭、设备忙或当前未推流。具体结果使用对应的 `Camera*ResultCode` 判断。
