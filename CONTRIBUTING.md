# 文档提交规范

面向本仓库文档与站点配置的协作约定。线上站点：[https://latent-action.com/docs/](https://latent-action.com/docs/)

## 改哪里

| 内容 | 位置 |
| --- | --- |
| 正文 | `docs/` 下 Markdown |
| 侧边栏 | `sidebars.ts` |
| 站点配置 | `docusaurus.config.ts` |
| 首页等 React 页面 | `src/` |

新增文档后记得在 `sidebars.ts` 挂上入口，否则侧边栏看不到。

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

确认无坏链、无构建错误。站内跳转优先用文档路径（如 `/examples/camera`），不要依赖会随 `baseUrl` 变化的绝对站外写法。

## 提交说明

- 提交信息简洁说明「为什么改」，可参考现有风格：`docs:` / `feat:` / `fix:` 等前缀。
- 不要提交 `.env`、密钥或本地构建产物 `build/`。
- 发版：推送到 GitHub `main` 会触发 FTP 部署；内网 Gitea 若已关闭 Actions，仅推 Gitea 不会上线。
