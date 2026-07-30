import {
  ArrowRight,
  Boxes,
  GitBranch as Github,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/brand";

export default function Home() {
  return (
    <main className="landing">
      <header className="landing-header">
        <Brand />
        <nav>
          <a href="#features">能力</a>
          <a
            href="https://github.com/Elainaicey/RepoNest"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <Link className="button secondary small" href="/login">
            登录
          </Link>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="release-pill">
            <Sparkles size={14} />
            RepoNest 0.1.0 · 全新的资料库架构
          </div>
          <h1>
            让每一颗 Star，
            <br />
            都有安静的归处。
          </h1>
          <p>
            自动同步 GitHub 星标，补上收藏集、特别关注、笔记和归档。数据留在自己的服务器里，真正成为可整理、可搜索的技术资料库。
          </p>
          <div className="hero-actions">
            <Link className="button primary large" href="/login">
              <Github size={18} />
              连接 GitHub
            </Link>
            <Link className="button secondary large" href="/demo">
              浏览演示
              <ArrowRight size={17} />
            </Link>
          </div>
          <div className="hero-assurances">
            <span>
              <ShieldCheck size={15} /> 自托管与加密令牌
            </span>
            <span>
              <Github size={15} /> GitHub App 最小权限
            </span>
          </div>
        </div>

        <div className="product-preview" aria-label="RepoNest 产品预览">
          <div className="preview-sidebar">
            <span className="preview-brand-mark" />
            {[0, 1, 2, 3, 4].map((item) => (
              <i className={item === 0 ? "active" : ""} key={item} />
            ))}
          </div>
          <div className="preview-main">
            <div className="preview-kicker" />
            <div className="preview-title" />
            <div className="preview-subtitle" />
            <div className="preview-stats">
              {["iris", "sky", "ruby", "jade"].map((color) => (
                <div key={color}>
                  <span data-color={color} />
                  <i />
                  <b />
                </div>
              ))}
            </div>
            <div className="preview-grid">
              {[0, 1, 2, 3].map((item) => (
                <article key={item}>
                  <div>
                    <span />
                    <i />
                  </div>
                  <p />
                  <p />
                  <footer />
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="feature-section" id="features">
        <div className="feature-intro">
          <p className="eyebrow">BUILT FOR LONG-TERM USE</p>
          <h2>不是星标列表，而是一套正式的收藏工作流。</h2>
          <p>
            清晰的前后端边界、可迁移的数据和克制的界面，让 RepoNest 适合长期部署，也适合社区继续扩展。
          </p>
        </div>
        <div className="feature-grid">
          <article>
            <span className="feature-icon iris">
              <RefreshCw size={20} />
            </span>
            <h3>自动同步</h3>
            <p>登录后立即同步，服务端按计划更新；短期访问令牌到期前自动刷新。</p>
          </article>
          <article>
            <span className="feature-icon sky">
              <Search size={20} />
            </span>
            <h3>真正可查找</h3>
            <p>按名称、简介和主题快速过滤，让旧收藏重新回到视野。</p>
          </article>
          <article>
            <span className="feature-icon jade">
              <Boxes size={20} />
            </span>
            <h3>自己的数据</h3>
            <p>PostgreSQL 持久化、JSON 导出与 Docker Compose 部署，不绑定第三方平台。</p>
          </article>
        </div>
      </section>

      <footer className="landing-footer">
        <Brand />
        <p>Open source, self-hosted, and built with care.</p>
        <a
          href="https://github.com/Elainaicey/RepoNest"
          target="_blank"
          rel="noreferrer"
        >
          <Github size={16} />
          Elainaicey/RepoNest
        </a>
      </footer>
    </main>
  );
}
