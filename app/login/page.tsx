import {
  ArrowLeft,
  Boxes,
  Database,
  GitBranch as Github,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { ParticleField } from "@/components/particle-field";

const errors: Record<string, string> = {
  oauth_state: "登录请求已过期，请重新尝试。",
  oauth_callback: "GitHub 授权没有完成，请检查应用配置后重试。",
  owner_restricted: "这个 GitHub 账号不在此实例的允许范围内。请使用实例所有者账号登录。"
};

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="auth-page">
      <ParticleField className="auth-particle-field" density={22_000} maxParticles={42} connectionDistance={126} />
      <div className="auth-topbar">
        <Brand />
        <Link href="/">
          <ArrowLeft size={15} />
          返回首页
        </Link>
      </div>
      <div className="auth-layout">
        <section className="auth-story">
          <div className="auth-story-orbit" aria-hidden="true"><i /><i /><i /></div>
          <p className="eyebrow"><span />A PRIVATE HOME FOR YOUR STARS</p>
          <h1>把散落的技术线索，<br /><span>带回自己的空间。</span></h1>
          <p>RepoNest 会同步 GitHub 星标，并用收藏集、标签、状态、评分与笔记把它们变成真正可用的个人知识库。</p>
          <div className="auth-story-points">
            <span><i><ShieldCheck size={17} /></i><strong>最小权限</strong><small>仅请求整理收藏所需权限</small></span>
            <span><i><Boxes size={17} /></i><strong>完整工作流</strong><small>从收下、整理到重新发现</small></span>
            <span><i><Database size={17} /></i><strong>数据自持有</strong><small>全部保存在自己的服务器</small></span>
          </div>
        </section>
        <section className="auth-card liquid-card">
          <div className="auth-emblem"><span><Github size={23} /></span><i><Sparkles size={12} /></i></div>
          <p className="eyebrow"><span />WELCOME TO REPONEST</p>
          <h2>连接你的 GitHub</h2>
          <p className="auth-copy">登录后会立即带回星标。访问令牌只保存在你部署的服务器中，并使用 AES-256-GCM 加密。</p>
          {error && <div className="auth-error" role="alert">{errors[error] ?? "登录失败，请稍后重试。"}</div>}
          <a className="button github-button" href="/api/auth/github"><Github size={18} />使用 GitHub 继续</a>
          <div className="auth-divider"><span>或者</span></div>
          <Link className="button secondary auth-demo" href="/demo">先看看演示空间</Link>
          <div className="auth-details"><span><LockKeyhole size={14} />加密令牌</span><span><RefreshCw size={14} />自动同步</span></div>
          <p className="auth-consent">继续即表示你允许自己的 RepoNest 实例读取 GitHub 星标信息。</p>
        </section>
      </div>
      <p className="auth-footnote">开源 · 自托管 · 隐私优先</p>
    </main>
  );
}
