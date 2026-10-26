# 文档提交规范

面向本仓库文档与站点配置的协作约定。线上站点：[https://latent-action.com/docs/](https://latent-action.com/docs/)

## 改哪里

| 内容 | 位置 |
| --- | --- |
| 未发布版本正文 | `docs/` 下 Markdown |
| 未发布版本侧边栏 | `sidebars.ts` |
| 已发布版本 | `versioned_docs/`、`versioned_sidebars/` |
| 站点配置 | `docusaurus.config.ts` |
| 首页等 React 页面 | `src/` |

新增文档后记得在对应版本的侧边栏挂上入口，否则侧边栏看不到。

## 文档版本

导航栏右侧可以切换版本。默认打开的是 `versions.json` 里的第一项（当前已发布 **1.1.0**）。`docs/` 是尚未发布的下一版，导航里显示为 **1.2.0**。

| 要改的版本 | 改哪里 |
| --- | --- |
| 1.2.0（未发布） | `docs/`、`sidebars.ts` |
| 1.1.0（已发布） | `versioned_docs/version-1.1.0/`、`versioned_sidebars/version-1.1.0-sidebars.json` |

发布 1.2.0：

1. 确认 `docs/` 已经是要发布的 1.2.0 内容。
2. 执行 `npm run docs:version -- 1.2.0`。这会把当时的 `docs/` 冻结到 `versioned_docs/version-1.2.0/`，并把它设为站点默认版本。
3. 把 `docusaurus.config.ts` 里 `versions.current.label` 改成下一个未发布版本号（例如 `1.3.0`）。不改的话，下拉框里会同时出现两个「1.2.0」。
4. 之后继续在 `docs/` 写下一版。已发布版本的小修订，直接改对应的 `versioned_docs/version-<版本>/`。

## 插图

需要配图时，在**该文档所在目录**下建 `images/`，用相对路径引用：

```markdown
![接线示意](./images/wiring.png)
```

同分类多篇共用的图，放在该分类目录的 `images/`（例如 `docs/peripherals/images/`）。

注意：

- `images/` 只放资源文件，**不要**在里面写 `README.md` 等会被 Docusaurus 当成文档页的 Markdown。
- **不要**把 `./images/` 写成可点击链接（例如 `[images](./images/)`）；目录不是站点页面，会触发坏链检查导致 `npm run build` 失败。空目录可用 `.gitkeep` 占位。
- 文件名用英文小写和连字符，避免空格。

站点级品牌图（logo、favicon、首页大图）仍放在 `static/img/`，与正文配图分开。

## 链接与构建

仓库开启了 `onBrokenLinks: 'throw'`。提交前在本地执行：

```bash
npm run build
```

确认无坏链、无构建错误。文档之间用相对路径（如 `../examples/camera.md`），这样链接会留在读者当前选择的版本里。不要写 `/examples/camera` 这种站点根路径，它会跳到默认版本。首页、页脚可以继续用 `/intro` 这类路径，它们本来就指向默认版本。

## 提交说明

- 提交信息简洁说明「为什么改」，可参考现有风格：`docs:` / `feat:` / `fix:` 等前缀。
- 不要提交 `.env`、密钥或本地构建产物 `build/`。
