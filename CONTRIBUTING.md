# Contributing to RepoNest

感谢你愿意参与 RepoNest。

## 开始之前

- 功能建议与较大改动请先创建 Issue，避免重复工作。
- 小型 Bug 修复、文档与样式改进可以直接提交 Pull Request。
- 不要在 Issue、日志或截图中提交 GitHub Token 等敏感数据。

## 开发流程

```bash
npm install
npm run dev
```

提交前请确保：

```bash
npm run lint
npm test
```

## Pull Request

- 一个 PR 聚焦一个问题。
- 清楚说明动机、实现与用户影响。
- 涉及界面变化时附上截图或短视频。
- 保持向后兼容；如果本地数据结构变化，请补充迁移说明。
- 提交信息建议使用简洁的 Conventional Commits 风格，例如
  `feat: add bookmark export` 或 `fix: preserve notes during sync`。

提交贡献即表示你同意按照本项目的 MIT License 发布你的改动。
