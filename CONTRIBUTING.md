# Contributing to RepoNest

感谢你愿意参与 RepoNest。

## 开始之前

- 较大的功能或架构改动请先创建 Issue，说明使用场景与预期行为。
- 小型 Bug、文档与样式改进可以直接提交 Pull Request。
- 不要在 Issue、日志、截图或提交中暴露 GitHub token、Client secret、数据库密码或 `.env`。

## 本地开发

RepoNest 使用 Node.js 24，Web 与 API 分别安装依赖：

```bash
npm install
npm install --prefix server
```

启动 Web：

```bash
npm run dev
```

另一个终端启动 API：

```bash
npm run dev:api
```

API 需要 PostgreSQL 和 `.env` 中的 GitHub App 配置。完整变量见 `.env.example`。

## 提交前检查

```bash
npm run lint
npm run typecheck
npm test
npm run test:api
```

涉及容器或部署的改动还应执行：

```bash
docker compose config
docker build -t reponest-web:test .
docker build -f Dockerfile.api -t reponest-api:test .
```

## Pull Request

- 一个 PR 聚焦一个问题。
- 清楚说明动机、实现与用户影响。
- 涉及界面变化时附上截图或短视频。
- 数据库结构变化必须新增 migration，不要修改已经发布的 migration。
- 提交信息建议使用简洁的 Conventional Commits，例如 `feat: add bookmark import`。

提交贡献即表示你同意按照项目的 MIT License 发布改动。
