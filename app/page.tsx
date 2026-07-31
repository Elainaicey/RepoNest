import {
  ArrowRight,
  BarChart3,
  Boxes,
  GitBranch as Github,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Tags
} from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { AmbientHero } from "@/components/ambient-hero";

export default function Home() {
  return (
    <main className="landing">
      <AmbientHero />
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
            RepoNest 0.1.0 · 综合性 GitHub 收藏空间
          </div>
          <h1>
            让每一颗 Star，
            <br />
            都有安静的归处。
          </h1>
          <p>
            自动同步 GitHub 星标，用收藏集、标签、处理状态、评分和笔记建立自己的知识结构。数据留在自己的服务器里，也能随时完整导出。
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
            <span><ShieldCheck size={15} /> 自托管与加密令牌</span>
            <span><Github size={15} /> GitHub App 最小权限</span>
            <span><Tags size={15} /> 分组与多标签组织</span>
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
            <div className="preview-command"><Search size={12} /><i /><kbd>⌘ K</kbd></div>
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
                  <p /><p />
                  <div className="preview-tags"><i /><i /></div>
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
          <h2>不止是星标列表，而是一套完整的收藏工作流。</h2>
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
            <h3>组合检索</h3>
            <p>搜索名称、简介、笔记和标签，再按语言、状态、标签与热度组合筛选。</p>
          </article>
          <article>
            <span className="feature-icon jade">
              <Boxes size={20} />
            </span>
            <h3>自己的数据</h3>
            <p>PostgreSQL 持久化、JSON 导出与 Docker Compose 部署，不绑定第三方平台。</p>
          </article>
          <article>
            <span className="feature-icon plum"><Tags size={20} /></span>
            <h3>分组与标签</h3>
            <p>收藏集承接纵向项目，标签连接横向主题；批量整理也无需逐项打开。</p>
          </article>
          <article>
            <span className="feature-icon amber"><Sparkles size={20} /></span>
            <h3>处理工作流</h3>
            <p>用待整理、探索中和已采用记录下一步，评分与笔记保留个人判断。</p>
          </article>
          <article>
            <span className="feature-icon pink"><BarChart3 size={20} /></span>
            <h3>收藏洞察</h3>
            <p>观察语言、标签和处理状态分布，让资料库保持健康而不是持续堆积。</p>
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
