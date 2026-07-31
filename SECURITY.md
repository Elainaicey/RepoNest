# Security Policy

## Supported versions

RepoNest 仍处于正式发布前阶段，目前只维护 `main` 分支上的最新 `0.1.x` 代码。

| Version | Supported |
| --- | --- |
| 0.1.x | Yes |
| < 0.1 | No |

## Reporting a vulnerability

请不要公开提交可被利用的安全漏洞，也不要附带真实的 GitHub token、Cookie、用户数据或服务器凭据。

请使用 GitHub 仓库的 **Security → Report a vulnerability** 私下报告，并包括：

- 受影响版本或 commit
- 最小复现步骤
- 实际影响与可能的攻击场景
- 已知的缓解或修复建议

维护者会尽快确认报告，并在修复可用后协调披露。

## Security model

- GitHub 登录使用 GitHub App user OAuth、state 与 PKCE。
- 浏览器只保存 HttpOnly、SameSite 会话 Cookie，不接触 GitHub access token。
- 数据库中的 GitHub access/refresh token 使用 AES-256-GCM 加密。
- 数据库只保存会话 Cookie 的 SHA-256 哈希。
- 不安全的跨源写请求会被 API 拒绝。
- 生产 Compose 只把统一应用端口绑定到 `127.0.0.1`；内嵌数据库没有网络监听端口。
- 生产部署必须使用 HTTPS，并妥善保存 `TOKEN_ENCRYPTION_KEY`、GitHub Client secret 与数据库密码。

## Deployment responsibility

自托管管理员应及时更新容器、限制 VPS 管理端口、异机备份 `/opt/reponest/data`，并保护 `.env`。如果 `TOKEN_ENCRYPTION_KEY` 泄露，应立即轮换 GitHub App Client secret、撤销用户授权，并重新建立加密令牌。
