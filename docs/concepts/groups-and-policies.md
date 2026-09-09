# Group 与 Policy

`<group>` / `<policy>` 必须是目标机上真实存在、且当前允许切到的名字。以常见机型为例：

| 类型 | 名称 | 说明 |
| --- | --- | --- |
| 无 policy 的 group | `standby`、`passive`、`stand`、`sit_down`、`joint_test` | `switch_group` **不要**传 policy |
| 必须带 policy 的 group | `locomotion`、`motion_tracking` | 不带 policy 会在本地直接失败 |
| locomotion 常用 policy | `default`、`policy1` … `policy7` | |
| motion_tracking 常用 policy | `backflip` | |

## 常见切换顺序

以目标机实际规则为准：

```text
standby → passive / stand
stand   → locomotion / passive / sit_down
locomotion → passive / sit_down / motion_tracking
```

上电后走到可发速度：

```text
passive → stand → locomotion default → send_velocity
```

`switch_policy` 只在当前 group 为 `locomotion` 或 `motion_tracking` 时有效。先 `switch_group`，再按需 `switch_policy`。
