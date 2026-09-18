# LatentOS Developer Center

[LatentOS](https://latent-action.com) 开发者文档站源码。内容覆盖 SDK 安装、连接机器人、Group / Policy 概念、示例与 C++/Python 工程集成。

线上地址：[https://latent-action.com/docs/](https://latent-action.com/docs/)

基于 [Docusaurus](https://docusaurus.io/) 构建，默认语言为简体中文，内置本地搜索。

## 文档结构

| 目录 | 内容 |
| --- | --- |
| `docs/getting-started/` | 前置条件、安装、连接 |
| `docs/sdk/` | C++ SDK 说明 |
| `docs/concepts/` | Group 与 Policy |
| `docs/examples/` | 官方示例 |
| `docs/integrate/` | 接入自有 C++ / Python 工程 |
| `docs/peripherals/` | 选装设备驱动 / 厂商 SDK（深度相机、雷达等） |
| `docs/faq.md` | 常见问题 |

## 环境要求

- Node.js ≥ 20
- 本地 FTP 部署需安装 [`lftp`](https://lftp.yar.ru/)（`sudo apt install lftp`）

## 本地开发

```bash
npm install
npm start
```

默认在浏览器打开开发服务器；文档与样式改动一般会热更新。

## 构建

```bash
npm run build
```

静态站点输出到 `build/`。本地预览构建结果：

```bash
npm run serve
```

## 部署

正式站点托管在公司官网 `https://latent-action.com/docs/`，通过 **FTP** 上传 `build/`。

### 本机部署

1. 复制环境变量模板并填写密码：

   ```bash
   cp .env.example .env
   ```

2. 构建并上传：

   ```bash
   npm run build
   ./scripts/deploy-ftp.sh
   ```

`.env` 已加入 `.gitignore`，请勿提交。

### GitHub Actions

推送到 GitHub 的 `main` 分支（或手动触发 **Deploy to FTP**）会自动构建并 FTP 发布。凭证配置在仓库 **Settings → Secrets and variables → Actions**，密钥名与 `.env.example` 一致：`FTP_SERVER`、`FTP_PORT`、`FTP_USERNAME`、`FTP_PASSWORD`、`FTP_SERVER_DIR`。

内网 Gitea 镜像如已关闭 Actions，推送到 Gitea 不会触发部署；需要发版时请推送到 GitHub，或在本机执行上述脚本。

## 贡献

文档为 Markdown，主要改动在 `docs/`。协作约定、插图路径、坏链与构建检查等见 [文档提交规范](./CONTRIBUTING.md)。
