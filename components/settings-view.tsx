"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  Download,
  GitBranch as Github,
  Layers3,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
  Tags,
  Trash2
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/app/providers";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import type { Collection, RadixColor, Tag, User } from "@/lib/types";
import { PageHeader } from "./page-header";

const collectionColors: RadixColor[] = ["iris", "sky", "jade", "amber", "plum", "pink", "orange", "sand"];

export function SettingsView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<RadixColor>("iris");
  const me = useQuery({ queryKey: ["me"], queryFn: () => api<User>("/api/me") });
  const collections = useQuery({ queryKey: ["collections"], queryFn: () => api<{ collections: Collection[] }>("/api/collections") });
  const tags = useQuery({ queryKey: ["tags"], queryFn: () => api<{ tags: Tag[] }>("/api/tags") });
  const sync = useMutation({
    mutationFn: () => api("/api/sync", { method: "POST" }),
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ["repositories"] }), queryClient.invalidateQueries({ queryKey: ["me"] })]); notify("同步完成", "GitHub 星标已更新。") }
  });
  const createCollection = useMutation({
    mutationFn: () => api("/api/collections", { method: "POST", body: JSON.stringify({ name, description: description || null, color, icon: "folder" }) }),
    onSuccess: async () => { setName(""); setDescription(""); await queryClient.invalidateQueries({ queryKey: ["collections"] }); notify("收藏集已创建"); }
  });
  const removeCollection = useMutation({
    mutationFn: (id: string) => api(`/api/collections/${id}`, { method: "DELETE" }),
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ["collections"] }), queryClient.invalidateQueries({ queryKey: ["repositories"] })]); notify("收藏集已删除", "其中的项目已回到未分组状态。") }
  });
  const logout = useMutation({ mutationFn: () => api("/api/auth/logout", { method: "POST" }), onSuccess: () => { queryClient.clear(); router.replace("/"); } });

  return (
    <div className="page-stack settings-page">
      <PageHeader eyebrow="SETTINGS" title="空间设置" description="管理 GitHub 连接、组织结构以及保存在这台服务器上的数据。" />
      <div className="settings-layout">
        <aside className="settings-index"><a href="#github"><Github size={16} />GitHub 连接</a><a href="#collections"><Layers3 size={16} />收藏集</a><a href="#data"><Download size={16} />数据与会话</a></aside>
        <div className="settings-content">
          <section className="settings-card" id="github">
            <div className="settings-card-heading"><span className="settings-icon"><Github size={19} /></span><div><h2>GitHub 连接</h2><p>自动同步 Star，并用加密令牌在服务端安全访问 GitHub API。</p></div><span className="status-badge"><i />正常</span></div>
            {me.data && <div className="connection-row"><div className="connection-user"><Image src={me.data.avatarUrl} alt="" width={36} height={36} unoptimized /><span><strong>{me.data.name || me.data.login}</strong><small>@{me.data.login} · 上次同步{relativeTime(me.data.lastSyncedAt)}</small></span></div><button className="button secondary" onClick={() => sync.mutate()} disabled={sync.isPending}><RefreshCw className={sync.isPending ? "spinning" : ""} size={16} />{sync.isPending ? "同步中…" : "立即同步"}</button></div>}
            <div className="security-note"><ShieldCheck size={16} /><span><strong>授权信息只保存在服务器</strong>访问令牌经 AES-256-GCM 加密；浏览器仅持有 HttpOnly 会话 Cookie。</span></div>
          </section>

          <section className="settings-card" id="collections">
            <div className="settings-card-heading"><span className="settings-icon sand"><Layers3 size={19} /></span><div><h2>收藏集</h2><p>为学习路线、工作领域或灵感主题建立清晰边界。</p></div></div>
            <form className="collection-creator" onSubmit={(event) => { event.preventDefault(); createCollection.mutate(); }}>
              <div><label className="field-label"><span>名称</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：前端基础设施" maxLength={60} required /></label><label className="field-label"><span>说明</span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="这个收藏集承接什么内容？" maxLength={240} /></label></div>
              <div className="collection-color-row"><span>识别色</span>{collectionColors.map((item) => <button className={color === item ? "selected" : ""} data-color={item} key={item} onClick={() => setColor(item)} type="button"><span /></button>)}<button className="button primary" disabled={createCollection.isPending}><Plus size={15} />创建</button></div>
            </form>
            <div className="collection-list modern-list">{collections.data?.collections.map((collection) => <div key={collection.id}><span className="collection-symbol" data-color={collection.color}><Layers3 size={16} /></span><span><strong>{collection.name}</strong><small>{collection.description || "未添加说明"}</small></span><b>{collection.count} 项</b><button className="icon-button danger-hover" onClick={() => removeCollection.mutate(collection.id)} aria-label={`删除${collection.name}`}><Trash2 size={15} /></button></div>)}</div>
          </section>

          <Link className="settings-link-card" href="/tags"><span className="settings-icon sky"><Tags size={19} /></span><span><strong>标签体系</strong><small>{tags.data?.tags.length ?? 0} 枚标签 · 独立管理跨收藏集的分类维度</small></span><ChevronRight size={18} /></Link>

          <section className="settings-card" id="data">
            <div className="settings-card-heading"><span className="settings-icon sky"><Download size={19} /></span><div><h2>数据与会话</h2><p>导出的 JSON 包含项目、收藏集、标签、状态、评分和个人笔记。</p></div></div>
            <div className="data-action-row"><div><strong>完整数据备份</strong><small>建议在升级或迁移服务器前下载一份。</small></div><a className="button secondary" href="/api/backup"><Download size={16} />下载 JSON</a></div>
            <div className="data-action-row danger-row"><div><strong>退出当前设备</strong><small>撤销当前会话，但不会删除服务器上的任何数据。</small></div><button className="button danger-quiet" onClick={() => logout.mutate()}><LogOut size={16} />退出登录</button></div>
          </section>
        </div>
      </div>
    </div>
  );
}
