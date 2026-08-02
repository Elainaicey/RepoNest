"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  Download,
  GitBranch as Github,
  Layers3,
  LogOut,
  Pencil,
  Pin,
  Plus,
  RefreshCw,
  ShieldCheck,
  Tags,
  Trash2,
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
  const queryFailed = me.isError || collections.isError || tags.isError;

  return (
    <div className="page-stack settings-page">
      <PageHeader
        eyebrow="SETTINGS"
        title="空间设置"
        description="管理 GitHub 连接、组织结构以及保存在这台服务器上的数据。"
      />

      {queryFailed ? (
        <QueryErrorState
          title="暂时无法读取空间设置"
          description="账户、收藏集或标签数据没有完整返回。可以安全地重新加载。"
          onRetry={() => Promise.all([me.refetch(), collections.refetch(), tags.refetch()])}
          retrying={me.isFetching || collections.isFetching || tags.isFetching}
        />
      ) : (
        <div className="settings-layout">
          <aside className="settings-index">
            <a href="#github"><Github size={16} />GitHub 连接</a>
            <a href="#collections"><Layers3 size={16} />收藏集</a>
            <a href="#data"><Download size={16} />数据与会话</a>
          </aside>
          <div className="settings-content">
            <section className="settings-card" id="github">
              <div className="settings-card-heading">
                <span className="settings-icon"><Github size={19} /></span>
                <div><h2>GitHub 连接</h2><p>自动同步 Star，并用加密令牌在服务端安全访问 GitHub API。</p></div>
                <span className="status-badge"><i />已授权</span>
              </div>
              {me.data && (
                <div className="connection-row">
                  <div className="connection-user">
                    <Image src={me.data.avatarUrl} alt="" width={36} height={36} unoptimized />
                    <span><strong>{me.data.name || me.data.login}</strong><small>@{me.data.login} · 上次同步{relativeTime(me.data.lastSyncedAt)}</small></span>
                  </div>
                  <button className="button secondary" onClick={() => sync.mutate()} disabled={sync.isPending}>
                    <RefreshCw className={sync.isPending ? "spinning" : ""} size={16} />
                    {sync.isPending ? "同步中…" : "立即同步"}
                  </button>
                </div>
              )}
              <div className="security-note">
                <ShieldCheck size={16} />
                <span><strong>授权信息只保存在服务器</strong>访问令牌经 AES-256-GCM 加密；浏览器仅持有 HttpOnly 会话 Cookie。</span>
              </div>
            </section>

            <section className="settings-card" id="collections">
              <div className="settings-card-heading">
                <span className="settings-icon sand"><Layers3 size={19} /></span>
                <div><h2>收藏集</h2><p>为学习路线、工作领域或灵感主题建立清晰边界。</p></div>
              </div>
              <div className="popover-heading" style={{ marginTop: 20 }}>
                <strong>创建收藏集</strong>
                <span>先建立空间，再从资料库移动项目。</span>
              </div>
              <form className="collection-creator" onSubmit={(event) => { event.preventDefault(); createCollection.mutate(); }}>
                <div>
                  <label className="field-label">
                    <span>名称</span>
                    <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="例如：前端基础设施" maxLength={60} required />
                  </label>
                  <label className="field-label">
                    <span>说明</span>
                    <input value={newDescription} onChange={(event) => setNewDescription(event.target.value)} placeholder="这个收藏集承接什么内容？" maxLength={240} />
                  </label>
                </div>
                <div className="collection-color-row">
                  <span>识别色</span>
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
                  <button className="button primary" disabled={createCollection.isPending || !newName.trim()}>
                    <Plus size={15} />{createCollection.isPending ? "创建中…" : "创建"}
                  </button>
                </div>
              </form>

              <div className="collection-list modern-list">
                {collections.isPending ? (
                  [0, 1, 2].map((item) => <div className="skeleton-card" key={item} style={{ minHeight: 58 }} />)
                ) : collections.data?.collections.length ? (
                  collections.data.collections.map((collection) => {
                    return (
                      <div key={collection.id}>
                        <span className="collection-symbol" data-color={collection.color}><Layers3 size={16} /></span>
                        <span>
                          <strong>{collection.name} {collection.pinned && <Pin size={11} fill="currentColor" aria-label="已固定" />}</strong>
                          <small>{collection.description || "未添加说明"}</small>
                        </span>
                        <b>{collection.count} 项</b>
                        <div className="repo-card-actions">
                          <button className="icon-button" onClick={() => startEdit(collection)} aria-label={`编辑 ${collection.name}`}>
                            <Pencil size={15} />
                          </button>
                          <button
                            className="icon-button danger-hover"
                            onClick={() => setCollectionToDelete(collection)}
                            aria-label={`删除 ${collection.name}`}
                          ><Trash2 size={15} /></button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div><span className="collection-symbol" data-color="sand"><Layers3 size={16} /></span><span><strong>还没有收藏集</strong><small>使用上方表单创建第一个收藏集。</small></span></div>
                )}
              </div>
            </section>

            <Link className="settings-link-card" href="/tags">
              <span className="settings-icon sky"><Tags size={19} /></span>
              <span><strong>标签体系</strong><small>{tags.data?.tags.length ?? 0} 枚标签 · 独立管理跨收藏集的分类维度</small></span>
              <ChevronRight size={18} />
            </Link>

            <section className="settings-card" id="data">
              <div className="settings-card-heading">
                <span className="settings-icon sky"><Download size={19} /></span>
                <div><h2>数据与会话</h2><p>导出的 JSON 包含项目、收藏集、标签、状态、评分和个人笔记。</p></div>
              </div>
              <div className="data-action-row">
                <div><strong>完整数据备份</strong><small>建议在升级或迁移服务器前下载一份。</small></div>
                <a className="button secondary" href="/api/backup"><Download size={16} />下载 JSON</a>
              </div>
              <div className="data-action-row danger-row">
                <div><strong>退出当前设备</strong><small>撤销当前会话，但不会删除服务器上的任何数据。</small></div>
                <button className="button danger-quiet" disabled={logout.isPending} onClick={() => logout.mutate()}>
                  <LogOut size={16} />{logout.isPending ? "正在退出…" : "退出登录"}
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      <Dialog.Root
        open={Boolean(editingCollection)}
        onOpenChange={(open) => { if (!open) setEditingCollection(null); }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-card compact-dialog">
            <div className="dialog-icon"><Pencil size={20} /></div>
            <Dialog.Title>编辑收藏集</Dialog.Title>
            <Dialog.Description>调整组织方式不会删除或移出其中的项目。</Dialog.Description>
            <form onSubmit={(event) => { event.preventDefault(); submitEdit(); }}>
              <label className="field-label">
                <span>名称</span>
                <input autoFocus value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={60} required />
              </label>
              <label className="field-label">
                <span>说明（可选）</span>
                <input value={editDescription} onChange={(event) => setEditDescription(event.target.value)} maxLength={240} />
              </label>
              <fieldset className="color-field">
                <legend>识别色</legend>
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
                className="button secondary"
                onClick={() => setEditPinned((current) => !current)}
                type="button"
              >
                <Pin size={15} fill={editPinned ? "currentColor" : "none"} />
                {editPinned ? "已固定到侧栏顶部" : "固定到侧栏顶部"}
              </button>
              <div className="dialog-actions">
                <Dialog.Close asChild><button className="button ghost" type="button">取消</button></Dialog.Close>
                <button className="button primary" disabled={updateCollection.isPending || !editName.trim()}>
                  {updateCollection.isPending ? "保存中…" : "保存收藏集"}
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
          <AlertDialog.Content className="dialog-card alert-card">
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
