"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Cloud,
  Download,
  GitBranch as Github,
  HardDrive,
  Layers3,
  LockKeyhole,
  LogOut,
  Pencil,
  Pin,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Tags,
  Trash2,
  UserRound,
  X
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertDialog, Dialog } from "radix-ui";
import { useState } from "react";
import { useToast } from "@/app/providers";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import type { Collection, RadixColor, Tag, User } from "@/lib/types";
import { PageHeader } from "./page-header";
import { QueryErrorState } from "./query-error-state";

const collectionColors: RadixColor[] = [
  "iris", "sky", "jade", "amber", "plum", "pink", "orange", "sand"
];

type CollectionPayload = {
  name: string;
  description: string | null;
  color: RadixColor;
  pinned: boolean;
};

export function SettingsView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newColor, setNewColor] = useState<RadixColor>("iris");
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editColor, setEditColor] = useState<RadixColor>("iris");
  const [editPinned, setEditPinned] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null);
  const me = useQuery({ queryKey: ["me"], queryFn: () => api<User>("/api/me") });
  const collections = useQuery({
    queryKey: ["collections"],
    queryFn: () => api<{ collections: Collection[] }>("/api/collections")
  });
  const tags = useQuery({
    queryKey: ["tags"],
    queryFn: () => api<{ tags: Tag[] }>("/api/tags")
  });

  const sync = useMutation({
    mutationFn: () => api("/api/sync", { method: "POST" }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["repositories"] }),
        queryClient.invalidateQueries({ queryKey: ["me"] })
      ]);
      notify("同步完成", "GitHub 星标已更新。");
    },
    onError: () => notify("同步失败", "GitHub 暂时不可用，请稍后重试。", "error")
  });
  const createCollection = useMutation({
    mutationFn: () => api("/api/collections", {
      method: "POST",
      body: JSON.stringify({
        name: newName.trim(),
        description: newDescription.trim() || null,
        color: newColor,
        icon: "folder"
      })
    }),
    onSuccess: async () => {
      setNewName("");
      setNewDescription("");
      setNewColor("iris");
      await queryClient.invalidateQueries({ queryKey: ["collections"] });
      notify("收藏集已创建", "现在可以把项目移动到这个收藏集。");
    },
    onError: () => notify("无法创建收藏集", "名称可能已经存在，请调整后重试。", "error")
  });
  const updateCollection = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CollectionPayload }) =>
      api(`/api/collections/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      }),
    onSuccess: async () => {
      setEditingCollection(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["collections"] }),
        queryClient.invalidateQueries({ queryKey: ["repositories"] })
      ]);
      notify("收藏集已更新", "名称、说明、识别色和固定状态已经保存。");
    },
    onError: () => notify("无法更新收藏集", "请检查名称和说明后重试。", "error")
  });
  const removeCollection = useMutation({
    mutationFn: (id: string) => api(`/api/collections/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setCollectionToDelete(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["collections"] }),
        queryClient.invalidateQueries({ queryKey: ["repositories"] })
      ]);
      notify("收藏集已删除", "其中的项目已回到未分组状态。");
    },
    onError: () => notify("无法删除收藏集", "收藏集和项目关联没有改变，请稍后重试。", "error")
  });
  const logout = useMutation({
    mutationFn: () => api("/api/auth/logout", { method: "POST" }),
    onSuccess: () => {
      queryClient.clear();
      router.replace("/");
    },
    onError: () => notify("退出失败", "当前会话仍然有效，请稍后重试。", "error")
  });

  const startEdit = (collection: Collection) => {
    setEditingCollection(collection);
    setEditName(collection.name);
    setEditDescription(collection.description ?? "");
    setEditColor(collection.color);
    setEditPinned(collection.pinned);
  };
  const submitEdit = () => {
    if (!editingCollection) return;
    updateCollection.mutate({
      id: editingCollection.id,
      payload: {
        name: editName.trim(),
        description: editDescription.trim() || null,
        color: editColor,
        pinned: editPinned
      }
    });
  };

  const collectionItems = collections.data?.collections ?? [];
  const collectionProjectCount = collectionItems.reduce((sum, collection) => sum + collection.count, 0);
  const pinnedCollections = collectionItems.filter((collection) => collection.pinned).length;
  const queryFailed = me.isError || collections.isError || tags.isError;
  const queryPending = me.isPending || collections.isPending || tags.isPending;

  return (
    <div className="page-stack experience-page settings-page">
      <PageHeader
        eyebrow="SETTINGS"
        title="空间与偏好"
        description="管理 GitHub 连接、整理结构、数据备份和当前会话。所有关键设置集中在一个安静、清晰的空间里。"
      />

      {queryFailed ? (
        <QueryErrorState
          title="暂时无法读取空间设置"
          description="账户、收藏集或标签数据没有完整返回。可以安全地重新加载。"
          onRetry={() => Promise.all([me.refetch(), collections.refetch(), tags.refetch()])}
          retrying={me.isFetching || collections.isFetching || tags.isFetching}
        />
      ) : queryPending ? (
        <div className="settings-loading" aria-busy="true" aria-label="正在加载空间设置">
          <div className="settings-profile-hero glass-hero skeleton-card" />
          <div className="settings-layout">
            <div className="settings-index glass-card skeleton-card" />
            <div className="settings-content">
              {[0, 1, 2].map((item) => <div className="settings-card glass-card skeleton-card" key={item} />)}
            </div>
          </div>
        </div>
      ) : (
        <>
          <section className="settings-profile-hero glass-hero" aria-labelledby="connected-account-title">
            <div className="profile-identity">
              <span className="profile-avatar-shell">
                {me.data ? <Image src={me.data.avatarUrl} alt="" width={64} height={64} unoptimized /> : <UserRound size={28} />}
                <i aria-hidden="true"><Check size={11} /></i>
              </span>
              <div className="glass-hero-copy">
                <span className="hero-kicker"><Github size={14} /> CONNECTED WORKSPACE</span>
                <h2 id="connected-account-title">{me.data?.name || me.data?.login || "GitHub 账户"}</h2>
                <p>@{me.data?.login} · {me.data?.lastSyncedAt ? `上次同步${relativeTime(me.data.lastSyncedAt)}` : "尚未进行首次同步"}</p>
              </div>
            </div>
            <div className="connection-actions">
              <span className="status-badge connected"><i />安全连接</span>
              <button className="button secondary sync-button" onClick={() => sync.mutate()} disabled={sync.isPending}>
                <RefreshCw className={sync.isPending ? "spinning" : ""} size={16} />
                {sync.isPending ? "正在同步…" : "同步 GitHub"}
              </button>
            </div>
            <dl className="hero-stat-strip settings-stat-strip" aria-label="空间概览">
              <div><dt>{collectionItems.length}</dt><dd>收藏集</dd></div>
              <div><dt>{tags.data?.tags.length ?? 0}</dt><dd>标签</dd></div>
              <div><dt>{collectionProjectCount}</dt><dd>已归类项目</dd></div>
            </dl>
          </section>

          <div className="settings-layout modern-settings-layout">
            <aside className="settings-index glass-card">
              <div className="settings-index-heading"><Sparkles size={15} /><span>空间设置</span></div>
              <nav aria-label="设置页目录">
                <a href="#github"><span><Github size={16} /></span><b>GitHub 连接</b><ChevronRight size={14} /></a>
                <a href="#collections"><span><Layers3 size={16} /></span><b>收藏集</b><ChevronRight size={14} /></a>
                <a href="#taxonomy"><span><Tags size={16} /></span><b>标签体系</b><ChevronRight size={14} /></a>
                <a href="#data"><span><HardDrive size={16} /></span><b>数据与会话</b><ChevronRight size={14} /></a>
              </nav>
              <div className="settings-index-note">
                <ShieldCheck size={16} />
                <span><strong>本地优先</strong><small>整理信息保存在你的服务器</small></span>
              </div>
            </aside>

            <div className="settings-content">
              <section className="settings-card glass-card" id="github" aria-labelledby="github-settings-title">
                <div className="settings-card-heading">
                  <span className="settings-icon"><Github size={19} /></span>
                  <div><span className="section-kicker">CONNECTION</span><h2 id="github-settings-title">GitHub 连接</h2><p>从 GitHub 获取星标，并完整保留 RepoNest 中的个人整理。</p></div>
                  <span className="status-badge"><i />已授权</span>
                </div>
                <div className="connection-detail-grid">
                  <div className="connection-detail">
                    <span className="detail-icon"><Cloud size={17} /></span>
                    <span><small>同步来源</small><strong>GitHub Stars</strong></span>
                  </div>
                  <div className="connection-detail">
                    <span className="detail-icon"><LockKeyhole size={17} /></span>
                    <span><small>令牌保护</small><strong>AES-256-GCM</strong></span>
                  </div>
                  <div className="connection-detail">
                    <span className="detail-icon"><RefreshCw size={17} /></span>
                    <span><small>最近同步</small><strong>{relativeTime(me.data?.lastSyncedAt ?? null)}</strong></span>
                  </div>
                </div>
                <div className="security-note glass-note">
                  <ShieldCheck size={17} />
                  <span><strong>授权信息不会进入浏览器</strong>访问令牌仅在服务端加密保存；浏览器只持有受保护的 HttpOnly 会话 Cookie。</span>
                </div>
              </section>

              <section className="settings-card glass-card collections-settings-card" id="collections" aria-labelledby="collection-settings-title">
                <div className="settings-card-heading">
                  <span className="settings-icon sand"><Layers3 size={19} /></span>
                  <div><span className="section-kicker">STRUCTURE</span><h2 id="collection-settings-title">收藏集</h2><p>为学习路线、工作领域或灵感主题建立稳定边界。</p></div>
                  <span className="settings-count">{collectionItems.length} 个</span>
                </div>

                <form className="collection-composer" onSubmit={(event) => { event.preventDefault(); createCollection.mutate(); }}>
                  <div className="composer-heading">
                    <span className="composer-icon"><Plus size={17} /></span>
                    <div><strong>创建收藏集</strong><small>先定义一个空间，再从资料库归入项目。</small></div>
                  </div>
                  <div className="composer-fields">
                    <label className="field-label">
                      <span>名称</span>
                      <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="例如：前端基础设施" maxLength={60} required />
                    </label>
                    <label className="field-label">
                      <span>说明（可选）</span>
                      <input value={newDescription} onChange={(event) => setNewDescription(event.target.value)} placeholder="这个收藏集承接什么内容？" maxLength={240} />
                    </label>
                  </div>
                  <div className="collection-color-row composer-footer">
                    <span>识别色</span>
                    <div className="compact-color-palette">
                      {collectionColors.map((item) => (
                        <button
                          aria-label={`选择 ${item} 识别色`}
                          aria-pressed={newColor === item}
                          className={newColor === item ? "selected" : ""}
                          data-color={item}
                          key={item}
                          onClick={() => setNewColor(item)}
                          type="button"
                        ><span /></button>
                      ))}
                    </div>
                    <button className="button primary" disabled={createCollection.isPending || !newName.trim()}>
                      <Plus size={15} />{createCollection.isPending ? "创建中…" : "创建收藏集"}
                    </button>
                  </div>
                </form>

                <div className="collection-section-heading">
                  <div><strong>现有收藏集</strong><small>{pinnedCollections ? `${pinnedCollections} 个固定在侧栏顶部` : "可将常用收藏集固定到侧栏"}</small></div>
                  <Link className="text-action" href="/library">在资料库中整理 <ArrowUpRight size={14} /></Link>
                </div>
                {collectionItems.length ? (
                  <div className="collection-card-grid" aria-label="现有收藏集">
                    {collectionItems.map((collection) => (
                      <article className="collection-manage-card interactive-card" data-color={collection.color} key={collection.id}>
                        <span className="collection-symbol"><Layers3 size={17} /></span>
                        <div className="collection-card-copy">
                          <div>
                            <strong>{collection.name}</strong>
                            {collection.pinned && <span className="pinned-badge"><Pin size={10} fill="currentColor" />已固定</span>}
                          </div>
                          <p>{collection.description || "还没有添加说明。"}</p>
                          <Link href={`/collections/${encodeURIComponent(collection.id)}`}>{collection.count} 个项目 <ArrowUpRight size={13} /></Link>
                        </div>
                        <div className="repo-card-actions collection-card-actions">
                          <button className="icon-button" onClick={() => startEdit(collection)} aria-label={`编辑 ${collection.name}`}>
                            <Pencil size={15} />
                          </button>
                          <button
                            className="icon-button danger-hover"
                            onClick={() => setCollectionToDelete(collection)}
                            aria-label={`删除 ${collection.name}`}
                          ><Trash2 size={15} /></button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="inline-empty collection-inline-empty">
                    <span className="empty-icon"><Layers3 size={19} /></span>
                    <span><strong>还没有收藏集</strong><small>使用上方表单创建第一个整理空间。</small></span>
                  </div>
                )}
              </section>

              <section id="taxonomy" aria-labelledby="taxonomy-settings-title">
                <Link className="settings-link-card glass-card interactive-card" href="/tags">
                  <span className="settings-icon sky"><Tags size={19} /></span>
                  <span>
                    <span className="section-kicker">TAXONOMY</span>
                    <strong id="taxonomy-settings-title">标签体系</strong>
                    <small>{tags.data?.tags.length ?? 0} 枚标签 · 管理跨收藏集的分类维度与识别色</small>
                  </span>
                  <span className="link-card-action">管理标签 <ArrowUpRight size={16} /></span>
                </Link>
              </section>

              <section className="settings-card glass-card" id="data" aria-labelledby="data-settings-title">
                <div className="settings-card-heading">
                  <span className="settings-icon sky"><HardDrive size={19} /></span>
                  <div><span className="section-kicker">PORTABILITY</span><h2 id="data-settings-title">数据与会话</h2><p>保留一份可迁移的数据副本，并管理当前设备的登录状态。</p></div>
                </div>
                <div className="data-action-list">
                  <div className="data-action-row interactive-row">
                    <span className="data-action-icon"><Download size={18} /></span>
                    <div><strong>完整数据备份</strong><small>包含项目、收藏集、标签、状态、评分和个人笔记。建议在升级或迁移前下载。</small></div>
                    <a className="button secondary" href="/api/backup"><Download size={16} />下载 JSON</a>
                  </div>
                  <div className="data-action-row danger-row interactive-row">
                    <span className="data-action-icon"><LogOut size={18} /></span>
                    <div><strong>退出当前设备</strong><small>只撤销当前会话，不会删除服务器上的任何数据。</small></div>
                    <AlertDialog.Root>
                      <AlertDialog.Trigger asChild>
                        <button className="button danger-quiet" disabled={logout.isPending}>
                          <LogOut size={16} />退出登录
                        </button>
                      </AlertDialog.Trigger>
                      <AlertDialog.Portal>
                        <AlertDialog.Overlay className="dialog-overlay" />
                        <AlertDialog.Content className="dialog-card glass-dialog alert-card">
                          <AlertDialog.Title>退出当前设备？</AlertDialog.Title>
                          <AlertDialog.Description>你的收藏、标签与笔记仍会保存在服务器上。再次使用时需要通过 GitHub 登录。</AlertDialog.Description>
                          <div className="dialog-actions">
                            <AlertDialog.Cancel asChild><button className="button ghost" disabled={logout.isPending}>取消</button></AlertDialog.Cancel>
                            <AlertDialog.Action asChild>
                              <button className="button danger" disabled={logout.isPending} onClick={() => logout.mutate()}>
                                {logout.isPending ? "正在退出…" : "确认退出"}
                              </button>
                            </AlertDialog.Action>
                          </div>
                        </AlertDialog.Content>
                      </AlertDialog.Portal>
                    </AlertDialog.Root>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </>
      )}

      <Dialog.Root
        open={Boolean(editingCollection)}
        onOpenChange={(open) => { if (!open) setEditingCollection(null); }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-card glass-dialog collection-editor">
            <div className="dialog-heading-with-preview">
              <div className="dialog-icon" data-color={editColor}><Pencil size={20} /></div>
              <div>
                <Dialog.Title>编辑收藏集</Dialog.Title>
                <Dialog.Description>调整空间的表达方式，不会删除或移出其中的项目。</Dialog.Description>
              </div>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); submitEdit(); }}>
              <div className="form-section">
                <label className="field-label">
                  <span>名称</span>
                  <input autoFocus value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={60} required />
                  <small>{editName.length}/60</small>
                </label>
                <label className="field-label">
                  <span>说明（可选）</span>
                  <textarea value={editDescription} onChange={(event) => setEditDescription(event.target.value)} maxLength={240} rows={3} />
                  <small>{editDescription.length}/240</small>
                </label>
              </div>
              <fieldset className="color-field color-palette-field">
                <legend>识别色</legend>
                <p>选择一种柔和色调帮助快速定位。</p>
                <div>
                  {collectionColors.map((item) => (
                    <button
                      aria-label={`选择 ${item} 识别色`}
                      aria-pressed={editColor === item}
                      className={editColor === item ? "selected" : ""}
                      data-color={item}
                      key={item}
                      onClick={() => setEditColor(item)}
                      type="button"
                    ><span /></button>
                  ))}
                </div>
              </fieldset>
              <button
                aria-pressed={editPinned}
                className="pin-toggle"
                onClick={() => setEditPinned((current) => !current)}
                type="button"
              >
                <span><Pin size={16} fill={editPinned ? "currentColor" : "none"} /></span>
                <span><strong>{editPinned ? "已固定到侧栏顶部" : "固定到侧栏顶部"}</strong><small>让常用收藏集始终容易到达</small></span>
                <i aria-hidden="true"><Check size={13} /></i>
              </button>
              <div className="dialog-actions">
                <Dialog.Close asChild><button className="button ghost" type="button">取消</button></Dialog.Close>
                <button className="button primary" disabled={updateCollection.isPending || !editName.trim()}>
                  {updateCollection.isPending ? "保存中…" : "保存更改"}
                </button>
              </div>
            </form>
            <Dialog.Close asChild><button className="dialog-close icon-button" aria-label="关闭"><X size={17} /></button></Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <AlertDialog.Root
        open={Boolean(collectionToDelete)}
        onOpenChange={(open) => {
          if (!open && !removeCollection.isPending) setCollectionToDelete(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="dialog-overlay" />
          <AlertDialog.Content className="dialog-card glass-dialog alert-card">
            <AlertDialog.Title>删除“{collectionToDelete?.name}”？</AlertDialog.Title>
            <AlertDialog.Description>
              收藏集会被永久删除，其中 {collectionToDelete?.count ?? 0} 个项目将回到未分组状态，项目、标签和笔记不会被删除。
            </AlertDialog.Description>
            <div className="dialog-actions">
              <AlertDialog.Cancel asChild>
                <button className="button ghost" disabled={removeCollection.isPending}>取消</button>
              </AlertDialog.Cancel>
              <button
                className="button danger"
                disabled={removeCollection.isPending || !collectionToDelete}
                onClick={() => { if (collectionToDelete) removeCollection.mutate(collectionToDelete.id); }}
              >
                {removeCollection.isPending ? "删除中…" : "确认删除"}
              </button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
