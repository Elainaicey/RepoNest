<div align="center">
  <img src="./public/og-v2.png" alt="RepoNest — 让每一颗 Star 都有归处" width="100%" />

  <h1>RepoNest</h1>

  <p><strong>让每一颗 Star，都有安静的归处。</strong></p>
  <p>GitHub 自动同步 · 前后端分离 · 自托管 · 开源</p>

  <p>
    <a href="https://github.com/Elainaicey/RepoNest/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/Elainaicey/RepoNest/ci.yml?branch=main&style=flat-square&label=CI" alt="CI" /></a>
    <a href="https://github.com/Elainaicey/RepoNest/pkgs/container/reponest-web"><img src="https://img.shields.io/badge/GHCR-web-5b5bd6?style=flat-square&logo=docker&logoColor=white" alt="Web image" /></a>
    <a href="https://github.com/Elainaicey/RepoNest/pkgs/container/reponest-api"><img src="https://img.shields.io/badge/GHCR-api-208368?style=flat-square&logo=docker&logoColor=white" alt="API image" /></a>
    <img src="https://img.shields.io/badge/status-active%20development-ab4aba?style=flat-square" alt="Active development" />
    <a href="./LICENSE"><img src="https://img.shields.io/github/license/Elainaicey/RepoNest?style=flat-square" alt="License" /></a>
  </p>
</div>

---

RepoNest 是一个面向开发者的综合性 GitHub 收藏管理器。它通过 GitHub App OAuth 登录，自动同步星标，并用收藏集、多标签、处理状态、评分、笔记、批量操作与洞察，把散落的项目整理成可以长期使用的个人技术资料库。

> [!IMPORTANT]
> RepoNest 仍处于积极开发阶段，内部版本号保持为 `0.1.0`，暂不创建正式 Release。升级前请备份 PostgreSQL 数据卷。

## 已实现

- GitHub App OAuth 登录，支持 PKCE、state 校验和 HttpOnly 会话 Cookie
- 登录后立即同步 GitHub 星标，服务端按计划自动同步
- GitHub 短期用户令牌自动刷新；访问令牌与刷新令牌使用 AES-256-GCM 加密
- PostgreSQL 持久化，数据不再依赖单台设备的浏览器存储
- 真实 App Router 页面：概览、全部收藏、星标、稍后收藏、特别关注、归档、收藏集、标签、洞察和设置
- 收藏集与多标签双层组织，支持待整理 / 探索中 / 已采用工作流、五星评分和私人笔记
- 搜索名称、简介、笔记与标签，并按标签、语言、状态组合筛选，支持五种排序与卡片 / 列表视图
- 多选项目后批量移动分组、修改状态、特别关注或归档；详情抽屉集中编辑全部个人信息
- 语言、处理状态和高频标签洞察，帮助控制待整理积压
- 命令面板、操作反馈、无障碍 Dialog / Popover / Menu、响应式布局和明暗主题
- 手动收藏 GitHub 仓库、完整 JSON 备份与增量数据库迁移
- 基于 Radix 12 级色阶原则的语义色彩，搭配亚克力工具栏、微交互与尊重减弱动态偏好的环境粒子
- Web / API 独立容器，支持 `linux/amd64` 与 `linux/arm64`

## 架构

```text
Browser
  ├─ /        ──> Web · Next.js / React / vinext :3000
  └─ /api/*   ──> API · Fastify / Node.js 24     :4000
                         │
                         ├─ GitHub REST API
                         └─ PostgreSQL 17
```

Web 与 API 分别构建、发布和扩容；Caddy 提供同域 HTTPS 与路由，因此 OAuth Cookie 不需要跨域配置。

## Debian / Ubuntu 部署

### 1. 创建 GitHub App

打开 GitHub **Settings → Developer settings → GitHub Apps → New GitHub App**，建议填写：

| 字段 | 示例 |
| --- | --- |
| Homepage URL | `https://reponest.ushio.cc` |
| Callback URL | `https://reponest.ushio.cc/api/auth/github/callback` |
| Webhook | 关闭 |
| User permissions → Starring | Read-only |

启用用户访问令牌过期，然后生成 Client secret。记下 GitHub App 的 Client ID 和 Client secret。

### 2. 准备 Compose 配置

```bash
sudo apt update
sudo apt install -y ca-certificates curl openssl

mkdir -p ~/reponest
cd ~/reponest
curl -fsSL https://raw.githubusercontent.com/Elainaicey/RepoNest/main/docker-compose.yml -o docker-compose.yml
curl -fsSL https://raw.githubusercontent.com/Elainaicey/RepoNest/main/.env.example -o .env
chmod 600 .env
```

编辑 `.env`：

```env
REPONEST_VERSION=latest
REPONEST_WEB_PORT=3000
REPONEST_API_PORT=4000

PUBLIC_URL=https://reponest.ushio.cc
GITHUB_CALLBACK_URL=https://reponest.ushio.cc/api/auth/github/callback
GITHUB_CLIENT_ID=你的_GitHub_App_Client_ID
GITHUB_CLIENT_SECRET=你的_GitHub_App_Client_secret
TOKEN_ENCRYPTION_KEY=使用下方命令生成

POSTGRES_USER=reponest
POSTGRES_PASSWORD=使用长随机值
POSTGRES_DB=reponest
```

生成两个随机值：

```bash
openssl rand -base64 32
openssl rand -hex 32
```

第一个填入 `TOKEN_ENCRYPTION_KEY`，第二个填入 `POSTGRES_PASSWORD`。

### 3. 启动

```bash
docker compose pull
docker compose up -d
docker compose ps
```

Web 和 API 仅监听 `127.0.0.1`，数据库不暴露到宿主机。

### 4. Caddy 反向代理

`/etc/caddy/Caddyfile`：

```caddyfile
reponest.ushio.cc {
    encode zstd gzip

    @api path /api/*
    reverse_proxy @api 127.0.0.1:4000
    reverse_proxy 127.0.0.1:3000
}
```

检查并加载：

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

确认域名 DNS 的 A/AAAA 记录已指向 VPS，并开放 80/443 端口。随后访问 `https://reponest.ushio.cc`。

### 更新

```bash
cd ~/reponest
docker compose pull
docker compose up -d
docker image prune -f
```

数据保存在 Docker volume `reponest_reponest-data` 中，更新容器不会删除它。
API 启动时会按顺序执行尚未应用的 SQL migration；从旧版升级会自动补充标签、处理状态与评分字段，不需要重新部署数据库。

## 本地开发

需要 Node.js 24 和 PostgreSQL 17：

```bash
git clone https://github.com/Elainaicey/RepoNest.git
cd RepoNest
npm install
npm install --prefix server
cp .env.example .env
```

终端一：

```bash
npm run dev
```

终端二：

```bash
npm run dev:api
```

也可以从源码构建完整容器：

```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
```

提交前验证：

```bash
npm run lint
npm run typecheck
npm test
npm run test:api
```

## 技术栈

| 层级 | 技术 |
| --- | --- |
| Web | React 19、Next.js App Router、TypeScript、vinext、TanStack Query |
| UI | Radix Primitives、CSS design tokens、Radix 色阶原则、Lucide |
| API | Fastify 5、Node.js 24、Zod |
| 身份 | GitHub App user OAuth、PKCE、加密令牌、服务端会话 |
| 数据 | PostgreSQL 17、SQL migrations |
| 交付 | Docker Compose、GHCR、Caddy、GitHub Actions |

## 项目结构

```text
RepoNest/
├─ app/                        # 页面、路由与全局视觉系统
│  ├─ (product)/              # 需要登录的产品页面
│  ├─ demo/                   # 无需后端的只读演示
│  └─ login/
├─ components/                # Shell、资料库、详情抽屉、标签、洞察与设置
├─ lib/                       # Web API 客户端、类型与演示数据
├─ server/
│  ├─ migrations/             # PostgreSQL schema
│  ├─ src/                    # OAuth、同步、会话与 REST API
│  └─ tests/
├─ Dockerfile                 # Web 镜像
├─ Dockerfile.api             # API 镜像
└─ docker-compose.yml
```

## 安全说明

- GitHub Client secret、令牌加密密钥和数据库密码只能放在 `.env`，不要提交到 Git。
- `TOKEN_ENCRYPTION_KEY` 丢失后，数据库中的 GitHub 令牌无法恢复；请安全备份。
- OAuth 令牌不会返回给浏览器。数据库只保存加密令牌，会话表只保存 Cookie 的 SHA-256 哈希。
- 生产环境必须使用 HTTPS；Compose 默认把 Web/API 端口限制在 loopback。
- 漏洞报告请阅读 [SECURITY.md](./SECURITY.md)。

## 路线图

- [x] `0.1` 前后端分离、GitHub OAuth、自动同步、分组 / 标签、批量整理、洞察、PostgreSQL 与多路由 UI
- [ ] `0.2` 备份恢复、Netscape Bookmark 导入与可保存的智能视图
- [ ] `0.3` PostgreSQL 全文索引、智能标签、相似项目发现
- [ ] `0.4` 管理员设置、Webhook 与同步任务队列
- [ ] `1.0` 稳定迁移策略、完整可观测性与正式 Release

## 参与贡献

请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。Bug、功能建议、文档改进和界面打磨都欢迎。

## License

[MIT](./LICENSE) © 2026 RepoNest contributors
