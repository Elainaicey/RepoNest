# Security Policy

## Supported versions

目前仅维护最新发布版本。

| Version | Supported |
| --- | --- |
| 0.1.x | ✅ |
| < 0.1 | ❌ |

## Reporting a vulnerability

请不要公开提交可能被利用的安全漏洞，也不要附带真实 Token、Cookie、用户数据或服务器凭据。

请使用 GitHub 仓库的 **Security → Report a vulnerability** 私下报告，并包括：

- 受影响版本
- 可复现的最小步骤
- 实际影响与可能的攻击场景
- 如果已知，可行的修复建议

维护者会尽快确认报告，并在修复可用后协调披露。

## Token model in 0.1.0

RepoNest 0.1.0 的 GitHub Token 只存在于当前页面内存，不会写入
`localStorage`、Cookie 或应用服务端。收藏、标签与笔记保存在浏览器本地。
部署者仍应启用 HTTPS，并限制不受信任的第三方脚本与代理注入。
