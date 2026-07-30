"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  GitBranch as Github,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import type { Collection, User } from "@/lib/types";
import { PageHeader } from "./page-header";

export function SettingsView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<User>("/api/me")
  });
  const collections = useQuery({
    queryKey: ["collections"],
    queryFn: () => api<{ collections: Collection[] }>("/api/collections")
  });
  const sync = useMutation({
    mutationFn: () => api("/api/sync", { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["repositories"] });
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    }
  });
  const createCollection = useMutation({
    mutationFn: () =>
      api("/api/collections", {
        method: "POST",
        body: JSON.stringify({ name, color: "iris" })
      }),
    onSuccess: () => {
      setName("");
      void queryClient.invalidateQueries({ queryKey: ["collections"] });
    }
  });
  const removeCollection = useMutation({
    mutationFn: (id: string) =>
      api(`/api/collections/${id}`, { method: "DELETE" }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["collections"] })
  });
  const logout = useMutation({
    mutationFn: () => api("/api/auth/logout", { method: "POST" }),
    onSuccess: () => {
      queryClient.clear();
      router.replace("/");
    }
  });

  return (
    <div className="page-stack settings-page">
      <PageHeader
        eyebrow="SETTINGS"
        title="设置"
        description="管理同步、收藏集与这台服务器上保存的数据。"
      />

      <section className="settings-card">
        <div className="settings-card-heading">
          <span className="settings-icon">
            <Github size={19} />
          </span>
          <div>
            <h2>GitHub 连接</h2>
            <p>授权令牌经过加密后保存在服务端，不会进入浏览器存储。</p>
          </div>
        </div>
        <div className="connection-row">
          {me.data && (
            <div className="connection-user">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={me.data.avatarUrl} alt="" />
              <span>
                <strong>{me.data.name || me.data.login}</strong>
                <small>
                  @{me.data.login} · 上次同步{relativeTime(me.data.lastSyncedAt)}
                </small>
              </span>
            </div>
          )}
          <button
            className="button secondary"
            onClick={() => sync.mutate()}
            disabled={sync.isPending}
          >
            <RefreshCw className={sync.isPending ? "spinning" : ""} size={16} />
            {sync.isPending ? "同步中…" : "立即同步"}
          </button>
        </div>
        <div className="security-note">
          <ShieldCheck size={16} />
          GitHub App 仅需读取星标的最小权限；会话 Cookie 为 HttpOnly。
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card-heading">
          <span className="settings-icon sand">
            <Plus size={19} />
          </span>
          <div>
            <h2>收藏集</h2>
            <p>为学习路线、工作领域或灵感主题建立清晰边界。</p>
          </div>
        </div>
        <form
          className="collection-form"
          onSubmit={(event) => {
            event.preventDefault();
            createCollection.mutate();
          }}
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="新收藏集名称"
            maxLength={60}
            required
          />
          <button className="button primary" disabled={createCollection.isPending}>
            创建
          </button>
        </form>
        <div className="collection-list">
          {collections.data?.collections.map((collection) => (
            <div key={collection.id}>
              <span className="collection-dot" data-color={collection.color} />
              <strong>{collection.name}</strong>
              <small>{collection.count} 个项目</small>
              <button
                className="icon-button"
                onClick={() => removeCollection.mutate(collection.id)}
                aria-label={`删除${collection.name}`}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card-heading">
          <span className="settings-icon sky">
            <Download size={19} />
          </span>
          <div>
            <h2>数据与会话</h2>
            <p>下载一份完整 JSON 备份，或安全退出当前设备。</p>
          </div>
        </div>
        <div className="settings-actions">
          <a className="button secondary" href="/api/backup">
            <Download size={16} />
            下载备份
          </a>
          <button className="button danger-quiet" onClick={() => logout.mutate()}>
            <LogOut size={16} />
            退出登录
          </button>
        </div>
      </section>
    </div>
  );
}
