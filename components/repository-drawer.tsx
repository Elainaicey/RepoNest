"use client";

import { ExternalLink, Heart, Star, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useState } from "react";
import type { Collection, ReadStatus, Repository, Tag } from "@/lib/types";

type RepositoryChanges = {
  favorite: boolean;
  note: string | null;
  collectionId: string | null;
  rating: number;
  readStatus: ReadStatus;
  tagIds: string[];
  opened: boolean;
};

const statusOptions: Array<{ value: ReadStatus; label: string; hint: string }> = [
  { value: "inbox", label: "待整理", hint: "刚收藏，稍后再看" },
  { value: "exploring", label: "探索中", hint: "正在评估或学习" },
  { value: "adopted", label: "已采用", hint: "已经进入工作流" }
];

export function RepositoryDrawer({
  repository,
  collections,
  tags,
  open,
  onOpenChange,
  onSave,
  saving = false
}: {
  repository: Repository;
  collections: Collection[];
  tags: Tag[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (changes: RepositoryChanges) => void;
  saving?: boolean;
}) {
  const [note, setNote] = useState(repository.note ?? "");
  const [collectionId, setCollectionId] = useState(repository.collectionId ?? "");
  const [rating, setRating] = useState(repository.rating);
  const [readStatus, setReadStatus] = useState<ReadStatus>(repository.readStatus);
  const [tagIds, setTagIds] = useState(repository.tags.map((tag) => tag.id));
  const [favorite, setFavorite] = useState(repository.favorite);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="repo-drawer" aria-describedby="repository-description">
          <header className="drawer-header">
            <div className="drawer-repo-title">
              <span className="repo-avatar large">{repository.owner.slice(0, 2).toUpperCase()}</span>
              <div>
                <Dialog.Title>{repository.fullName}</Dialog.Title>
                <Dialog.Description id="repository-description">
                  {repository.description || "这个仓库暂时没有填写简介。"}
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="icon-button" aria-label="关闭详情"><X size={18} /></button>
            </Dialog.Close>
          </header>

          <div className="drawer-meta-strip">
            <span><Star size={15} /> {repository.stars.toLocaleString()}</span>
            {repository.language && <span><i className="language-dot" /> {repository.language}</span>}
            {repository.license && <span>{repository.license}</span>}
            <a href={repository.url} target="_blank" rel="noreferrer">
              GitHub <ExternalLink size={14} />
            </a>
          </div>

          <div className="drawer-form">
            <section className="form-section">
              <div className="field-heading">
                <div><strong>处理状态</strong><span>让收藏拥有下一步，而不只是堆积。</span></div>
              </div>
              <div className="status-selector">
                {statusOptions.map((option) => (
                  <button
                    className={readStatus === option.value ? "active" : ""}
                    data-status={option.value}
                    key={option.value}
                    onClick={() => setReadStatus(option.value)}
                    type="button"
                  >
                    <strong>{option.label}</strong><span>{option.hint}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="form-section two-column-fields">
              <label className="field-label">
                <span>所属收藏集</span>
                <select value={collectionId} onChange={(event) => setCollectionId(event.target.value)}>
                  <option value="">未分组</option>
                  {collections.map((collection) => (
                    <option value={collection.id} key={collection.id}>{collection.name}</option>
                  ))}
                </select>
              </label>
              <div className="field-label">
                <span>个人评分</span>
                <div className="rating-control" aria-label={`评分 ${rating} 星`}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      className={value <= rating ? "active" : ""}
                      key={value}
                      onClick={() => setRating(rating === value ? 0 : value)}
                      type="button"
                      aria-label={`${value} 星`}
                    >
                      <Star size={18} fill={value <= rating ? "currentColor" : "none"} />
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="form-section">
              <div className="field-heading"><div><strong>标签</strong><span>一个项目可以拥有多个横向标签。</span></div></div>
              <div className="tag-picker">
                {tags.length ? tags.map((tag) => {
                  const checked = tagIds.includes(tag.id);
                  return (
                    <button
                      className={checked ? "tag-option selected" : "tag-option"}
                      data-color={tag.color}
                      key={tag.id}
                      onClick={() => setTagIds((current) => checked ? current.filter((id) => id !== tag.id) : [...current, tag.id])}
                      type="button"
                      aria-pressed={checked}
                    >
                      <span /> {tag.name}
                    </button>
                  );
                }) : <p className="field-empty">还没有标签，可前往“标签”页面创建。</p>}
              </div>
            </section>

            <section className="form-section">
              <label className="field-label">
                <span>私人笔记</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="为什么收藏它？准备把它用在哪里？"
                  maxLength={4000}
                  rows={5}
                />
                <small>{note.length} / 4000</small>
              </label>
            </section>
          </div>

          <footer className="drawer-footer">
            <button
              className={favorite ? "button favorite-toggle selected" : "button favorite-toggle"}
              onClick={() => setFavorite((current) => !current)}
              type="button"
            >
              <Heart size={16} fill={favorite ? "currentColor" : "none"} />
              {favorite ? "已特别关注" : "特别关注"}
            </button>
            <div>
              <Dialog.Close asChild><button className="button ghost">取消</button></Dialog.Close>
              <button
                className="button primary"
                disabled={saving}
                onClick={() => onSave({
                  favorite,
                  note: note.trim() || null,
                  collectionId: collectionId || null,
                  rating,
                  readStatus,
                  tagIds,
                  opened: true
                })}
                type="button"
              >
                {saving ? "保存中…" : "保存整理信息"}
              </button>
            </div>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
