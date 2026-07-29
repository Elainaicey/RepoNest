<div align="center">
  <img src="./public/og.png" alt="RepoNest — 把星标变成你的技术地图" width="100%" />

  <h1>RepoNest</h1>

  <p>
    <strong>把散落的 GitHub 星标，变成真正可用的个人技术地图。</strong>
  </p>

  <p>
    本地优先 · 自托管 · Docker 友好 · 开源
  </p>

  <p>
    <a href="https://github.com/Elainaicey/RepoNest/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/Elainaicey/RepoNest/ci.yml?branch=main&style=flat-square&label=CI" alt="CI" /></a>
    <a href="https://github.com/Elainaicey/RepoNest/releases"><img src="https://img.shields.io/github/v/release/Elainaicey/RepoNest?include_prereleases&style=flat-square" alt="Release" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/github/license/Elainaicey/RepoNest?style=flat-square" alt="License" /></a>
    <a href="https://github.com/Elainaicey/RepoNest/stargazers"><img src="https://img.shields.io/github/stars/Elainaicey/RepoNest?style=flat-square" alt="Stars" /></a>
  </p>
</div>

---

## 为什么做 RepoNest？

GitHub Star 很适合“先存一下”，却不擅长“以后再找到”。当收藏增长到几百、几千个之后，项目会慢慢沉入时间线：当时为什么收藏、适合什么场景、和哪些项目有关，都很难再想起来。

RepoNest 希望成为开发者的收藏中枢：把 GitHub 星标、工具链接、学习资料和灵感统一放进一个可以搜索、分类、标注与回顾的空间，并且让数据留在你控制的设备上。

## 0.1.0 已实现

- GitHub 星标同步：使用 Fine-grained Personal Access Token 导入最近 100 个星标
- 综合收藏：支持 GitHub 仓库和任意网页链接
- 快速检索：同时搜索仓库名、描述、标签、集合和私人笔记
- 多维整理：集合、语言筛选、特别关注、归档、最近更新
- 仓库详情：Star、Fork、语言、许可证、标签与本地笔记
- 网格 / 列表视图切换
- 浅色 / 深色主题
- 响应式布局与移动端底部导航
- 本地优先：收藏数据保存在浏览器 `localStorage`
- Token 安全边界：GitHub Token 仅保存在当前页面内存，刷新即清除
- Docker / Docker Compose 一键部署

> [!IMPORTANT]
> 0.1.0 是单用户、本地优先版本。浏览器数据不会自动跨设备同步；清理站点数据前请注意备份。服务端账户、数据库、OAuth 与导入导出计划在后续版本加入。

## 快速开始

### Docker Compose（推荐）

要求：一台安装了 Docker Engine 与 Compose Plugin 的 Ubuntu / Debian VPS。

```bash
git clone https://github.com/Elainaicey/RepoNest.git
cd RepoNest
docker compose up -d --build
```

打开 `http://你的服务器IP:3000`。

如需修改宿主机端口：

```bash
REPONEST_PORT=8080 docker compose up -d --build
```

更新版本：

```bash
git pull
docker compose up -d --build
```

### 本地开发

要求：Node.js `>= 22.13.0`

```bash
git clone https://github.com/Elainaicey/RepoNest.git
cd RepoNest
npm install
npm run dev
```

访问终端显示的本地地址。提交代码前建议运行：

```bash
npm run lint
npm test
```

## GitHub 同步

1. 在 GitHub 打开 **Settings → Developer settings → Personal access tokens → Fine-grained tokens**。
2. 创建只读 Token。导入公开 Star 不需要仓库写权限。
3. 在 RepoNest 点击「同步 GitHub」，粘贴 Token 并开始同步。

RepoNest 不会把 Token 写入 `localStorage`、Cookie 或服务端文件；当前页面关闭或刷新后 Token 即失效。收藏数据与笔记仍保存在当前浏览器。

## VPS 反向代理

生产环境建议在 RepoNest 前使用 Caddy、Nginx 或 Traefik，并启用 HTTPS。最小 Nginx 片段：

```nginx
server {
    listen 80;
    server_name stars.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

然后用 Certbot 或你的反向代理方案配置 TLS。

## 技术栈

- React 19 + TypeScript
- Next.js 兼容 App Router（由 [vinext](https://github.com/cloudflare/vinext) 构建）
- Vite + Tailwind CSS 4
- Lucide 图标
- Node.js standalone 生产服务
- Docker 多阶段构建

## 项目结构

```text
RepoNest/
├─ app/
│  ├─ RepoNestApp.tsx      # 产品界面、状态与 GitHub 同步
│  ├─ globals.css          # 设计系统与响应式样式
│  ├─ layout.tsx           # SEO / Open Graph 元数据
│  └─ page.tsx             # 首页入口
├─ public/
│  └─ og.png               # 社交分享图
├─ tests/
│  └─ rendered-html.test.mjs
├─ .github/
│  ├─ workflows/ci.yml
│  └─ ISSUE_TEMPLATE/
├─ Dockerfile
├─ docker-compose.yml
└─ package.json
```

## 数据与隐私

| 数据 | 0.1.0 存储位置 | 说明 |
| --- | --- | --- |
| 收藏、集合、标签、笔记 | 浏览器 `localStorage` | 不上传到 RepoNest 服务端 |
| GitHub Token | 页面内存 | 刷新或关闭页面后清除 |
| GitHub 仓库公开信息 | GitHub REST API | 仅在同步或添加仓库时请求 |
| 主题偏好、同步时间 | 浏览器 `localStorage` | 仅用于本机体验 |

## 路线图

- [x] `0.1` 本地优先收藏管理、GitHub Token 同步、Docker 部署
- [ ] `0.2` JSON / Netscape Bookmark 导入导出、批量编辑、重复检测
- [ ] `0.3` SQLite / PostgreSQL 持久化与多设备同步
- [ ] `0.4` GitHub OAuth、定时同步、Webhook
- [ ] `0.5` README 全文索引、智能标签、相似项目发现
- [ ] `1.0` 多用户、权限、稳定迁移与完整备份恢复

欢迎通过 [Issues](https://github.com/Elainaicey/RepoNest/issues) 讨论需求。路线图会根据真实使用反馈调整。

## 参与贡献

请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。Bug 报告、功能建议、文档改进与界面打磨都很欢迎。

## 安全

请不要在公开 Issue 中提交 Token、Cookie 或服务器配置等敏感信息。安全问题请遵循 [SECURITY.md](./SECURITY.md) 中的私下报告方式。

## License

[MIT](./LICENSE) © 2026 RepoNest contributors
