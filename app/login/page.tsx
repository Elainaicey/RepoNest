import {
  ArrowLeft,
  GitBranch as Github,
  LockKeyhole,
  RefreshCw
} from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/brand";

const errors: Record<string, string> = {
  oauth_state: "登录请求已过期，请重新尝试。",
  oauth_callback: "GitHub 授权没有完成，请检查应用配置后重试。"
};

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="auth-page">
      <div className="auth-topbar">
        <Brand />
        <Link href="/">
          <ArrowLeft size={15} />
          返回首页
        </Link>
      </div>
      <section className="auth-card">
        <div className="auth-emblem">
          <Github size={24} />
        </div>
        <p className="eyebrow">YOUR PRIVATE LIBRARY</p>
        <h1>连接 GitHub，带回你的星标</h1>
        <p className="auth-copy">
          RepoNest 会读取并定时同步你的星标。令牌只保存在你部署的服务器中，并使用 AES-256-GCM 加密。
        </p>
        {error && (
          <div className="auth-error">
            {errors[error] ?? "登录失败，请稍后重试。"}
          </div>
        )}
        <a className="button github-button" href="/api/auth/github">
          <Github size={18} />
          使用 GitHub 继续
        </a>
        <Link className="button secondary auth-demo" href="/demo">
          先看看演示空间
        </Link>
        <div className="auth-details">
          <span>
            <LockKeyhole size={15} />
            最小权限
          </span>
          <span>
            <RefreshCw size={15} />
            自动同步
          </span>
        </div>
      </section>
      <p className="auth-footnote">
        继续即表示你允许自己的 RepoNest 实例读取 GitHub 星标信息。
      </p>
    </main>
  );
}
