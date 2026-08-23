import {
  ArrowRight,
  BarChart3,
  Bookmark,
  Boxes,
  CheckCircle2,
  Cloud,
  Database,
  GitBranch as Github,
  Heart,
  Layers3,
  LockKeyhole,
  MousePointer2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Tags,
  WandSparkles
} from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { InteractiveSurface } from "@/components/interactive-surface";
import { ParticleField } from "@/components/particle-field";

const featureCards = [
  { icon: RefreshCw, tone: "violet", index: "01", title: "自动同步，却不打扰", copy: "OAuth 登录后安静地同步 GitHub Star，保留你的标签、笔记和阅读状态。" },
  { icon: Search, tone: "sky", index: "02", title: "搜索每一层上下文", copy: "同时检索仓库信息、个人笔记和标签，再用语言、状态与评分继续收窄。" },
  { icon: Boxes, tone: "jade", index: "03", title: "收藏集与标签共存", copy: "用收藏集搭建主题书架，用标签连接跨主题线索，让知识真正形成结构。" },
  { icon: WandSparkles, tone: "pink", index: "04", title: "从囤积走向再发现", copy: "状态、评分、笔记和洞察帮助你回到值得阅读、采用或分享的项目。" },
  { icon: Database, tone: "amber", index: "05", title: "数据始终属于自己", copy: "单容器自托管、持久化数据库与 JSON 导出，不把个人知识锁进另一个平台。" },
  { icon: ShieldCheck, tone: "iris", index: "06", title: "面向长期使用设计", copy: "最小权限、加密令牌、可靠同步与清晰的数据边界，让部署更安心。" }
];

export default function Home() {
  return (
    <main className="landing">
      <ParticleField className="landing-particle-field" density={19_000} maxParticles={58} connectionDistance={128} interactionRadius={170} />
      <div className="landing-mesh" aria-hidden="true"><i /><i /><i /></div>

      <header className="landing-header glass-bar">
        <Brand />
        <nav aria-label="首页导航">
          <a href="#experience">体验</a><a href="#features">能力</a><a href="#self-hosted">自托管</a>
          <a href="https://github.com/Elainaicey/RepoNest" target="_blank" rel="noreferrer">GitHub</a>
        </nav>
        <div className="landing-header-actions">
          <Link className="button ghost small" href="/demo">查看演示</Link>
          <Link className="button primary small" href="/login">进入空间 <ArrowRight size={15} /></Link>
        </div>
      </header>

      <section className="hero" id="experience">
        <div className="hero-copy">
          <div className="release-pill glass-pill"><span className="release-spark"><Sparkles size={13} /></span>RepoNest 0.1.0<i />你的 GitHub 知识空间</div>
          <h1>收藏不该只是<span>沉睡的星标。</span></h1>
          <p>把 GitHub Star、稍后阅读与技术线索收进一个安静、清晰、完全属于你的空间。整理、理解，然后在真正需要时重新找到它。</p>
          <div className="hero-actions">
            <Link className="button primary large hero-primary" href="/login"><Github size={18} />连接 GitHub<span className="button-shine" /></Link>
            <Link className="button secondary large" href="/demo">探索交互演示<ArrowRight size={17} /></Link>
          </div>
          <div className="hero-proof" aria-label="产品特点">
            <span><LockKeyhole size={15} /><strong>Private</strong><small>数据留在 VPS</small></span>
            <span><Cloud size={15} /><strong>One container</strong><small>Compose 即刻部署</small></span>
            <span><Layers3 size={15} /><strong>Structured</strong><small>真正形成知识结构</small></span>
          </div>
        </div>

        <div className="product-stage">
          <div className="stage-halo" aria-hidden="true" />
          <div className="floating-chip chip-sync"><span><RefreshCw size={14} /></span><div><strong>同步完成</strong><small>刚刚 · 246 个项目</small></div><CheckCircle2 size={15} /></div>
          <div className="floating-chip chip-note"><span><Sparkles size={14} /></span><div><strong>重新发现</strong><small>3 个值得再看</small></div></div>
          <div className="product-preview" aria-label="RepoNest 产品界面预览">
            <div className="preview-windowbar"><div><i /><i /><i /></div><span>reponest.local</span><b><ShieldCheck size={12} />PRIVATE</b></div>
            <div className="preview-shell">
              <aside className="preview-sidebar"><span className="preview-brand-mark" /><div className="preview-nav-lines">{[0, 1, 2, 3, 4, 5].map((item) => <i className={item === 0 ? "active" : ""} key={item} />)}</div><div className="preview-user"><i /><span /></div></aside>
              <div className="preview-main">
                <div className="preview-toolbar"><div className="preview-command"><Search size={12} /><i /><kbd>⌘ K</kbd></div><span /><span /></div>
                <div className="preview-heading"><div><small>GOOD AFTERNOON</small><strong>你的收藏空间</strong><i /></div><button><RefreshCw size={11} />同步</button></div>
                <div className="preview-stats">{["violet", "sky", "pink", "jade"].map((color, index) => <div data-color={color} key={color}><span>{[246, 18, 12, 74][index]}</span><i /><b /></div>)}</div>
                <div className="preview-workspace">
                  <section className="preview-flow"><header><strong>收藏处理进度</strong><i /></header>{["amber", "violet", "jade"].map((color, index) => <div data-color={color} key={color}><span /><p><i /><b /></p><strong>{[18, 46, 74][index]}</strong></div>)}</section>
                  <section className="preview-focus"><span><Sparkles size={13} /></span><small>REDISCOVER</small><strong>让旧收藏再次发光</strong><div><i /><p><b /><span /></p></div></section>
                </div>
                <div className="preview-grid">{[0, 1, 2].map((item) => <article key={item}><div><span /><p><b /><i /></p><Heart size={10} /></div><p /><p /><div className="preview-tags"><i /><i /></div><footer><i /><span /></footer></article>)}</div>
              </div>
            </div>
            <div className="preview-pointer" aria-hidden="true"><MousePointer2 size={20} /><span>你的空间</span></div>
          </div>
        </div>
      </section>

      <section className="landing-marquee" aria-label="产品能力"><div>{["GitHub OAuth", "Smart collections", "Personal notes", "Full-text search", "Docker Compose", "Private by default"].map((item) => <span key={item}><i />{item}</span>)}</div></section>

      <section className="feature-section" id="features">
        <div className="section-intro feature-intro"><p className="eyebrow"><span />BUILT FOR YOUR CURIOSITY</p><h2>不是另一个列表，<br />而是技术收藏的工作台。</h2><p>每一种能力都服务于同一件事：减少整理摩擦，让收藏最终转化为判断、灵感和行动。</p></div>
        <div className="feature-grid">
          {featureCards.map(({ icon: Icon, tone, index, title, copy }) => <InteractiveSurface className="feature-card liquid-card" data-tone={tone} glowColor={`var(--${tone}-9, var(--accent-9))`} key={title} maxTilt={2.7} lift={5}><div className="feature-card-head"><span className="feature-icon"><Icon size={20} /></span><small>{index}</small></div><h3>{title}</h3><p>{copy}</p><div className="feature-card-line"><i /></div></InteractiveSurface>)}
        </div>
      </section>

      <section className="workflow-showcase" id="self-hosted">
        <div className="workflow-showcase-visual liquid-card"><div className="showcase-orbit orbit-one" /><div className="showcase-orbit orbit-two" /><div className="showcase-core"><span><Github size={25} /></span><strong>GitHub Stars</strong><small>自动同步</small></div><div className="showcase-node node-collection"><Boxes size={18} /><strong>收藏集</strong></div><div className="showcase-node node-tags"><Tags size={18} /><strong>标签</strong></div><div className="showcase-node node-notes"><Bookmark size={18} /><strong>笔记</strong></div><div className="showcase-node node-insights"><BarChart3 size={18} /><strong>洞察</strong></div></div>
        <div className="workflow-showcase-copy"><p className="eyebrow"><span />ONE CALM WORKFLOW</p><h2>从一颗 Star，<br />到一条可复用的线索。</h2><p>RepoNest 把同步、筛选、归类、记录与再发现连成一个自然流程，而不是让你在多个工具之间搬运信息。</p><ul>
          <li><span><CheckCircle2 size={15} /></span><div><strong>安静同步</strong><small>不会覆盖个人整理，也不会因不完整同步误删收藏。</small></div></li>
          <li><span><CheckCircle2 size={15} /></span><div><strong>渐进整理</strong><small>先收下，之后再用状态、标签、评分和笔记补全上下文。</small></div></li>
          <li><span><CheckCircle2 size={15} /></span><div><strong>随时带走</strong><small>单容器运行，数据库持久化，并支持完整 JSON 导出。</small></div></li>
        </ul></div>
      </section>

      <section className="landing-cta liquid-card"><div><p className="eyebrow"><span />YOUR LIBRARY, YOUR RULES</p><h2>让下一颗 Star，从收藏开始产生价值。</h2><p>免费、开源、自托管。几分钟部署，然后把散落的技术线索带回自己的空间。</p></div><div className="landing-cta-actions"><Link className="button primary large" href="/login"><Github size={18} />开始使用</Link><a className="button secondary large" href="https://github.com/Elainaicey/RepoNest" target="_blank" rel="noreferrer">查看源代码<ArrowRight size={16} /></a></div></section>

      <footer className="landing-footer"><Brand /><p>Open source · Self-hosted · Built with care</p><div><a href="https://github.com/Elainaicey/RepoNest" target="_blank" rel="noreferrer"><Github size={16} />GitHub</a><span>0.1.0</span></div></footer>
    </main>
  );
}
