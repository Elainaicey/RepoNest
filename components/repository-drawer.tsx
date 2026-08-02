"use client";

import {
  CircleAlert,
  ExternalLink,
  Globe2,
  Heart,
  MessageSquareText,
  Star,
  Trash2,
  X
} from "lucide-react";
import { AlertDialog, Dialog } from "radix-ui";
import { useMemo, useState } from "react";
import type { Collection, ReadStatus, Repository, Tag } from "@/lib/types";

type RepositoryChanges = {
  favorite: boolean;
  note: string | null;
  collectionId: string | null;
  rating: number;
  readStatus: ReadStatus;
  tagIds: string[];
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
  onVisit,
  onDelete,
  saving = false,
  deleting = false,
  saveError = false
}: {
  repository: Repository;
  collections: Collection[];
  tags: Tag[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (changes: RepositoryChanges) => void;
  onVisit?: () => void;
  onDelete?: () => void;
  saving?: boolean;
  deleting?: boolean;
  saveError?: boolean;
}) {
  const [note, setNote] = useState(repository.note ?? "");
  const [collectionId, setCollectionId] = useState(repository.collectionId ?? "");
  const [rating, setRating] = useState(repository.rating);
  const [readStatus, setReadStatus] = useState<ReadStatus>(repository.readStatus);
  const [tagIds, setTagIds] = useState(repository.tags.map((tag) => tag.id));
  const [favorite, setFavorite] = useState(repository.favorite);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const initialTagKey = useMemo(() => repository.tags.map((tag) => tag.id).sort().join(","), [repository.tags]);
  const dirty =
    note !== (repository.note ?? "") ||
    collectionId !== (repository.collectionId ?? "") ||
    rating !== repository.rating ||
    readStatus !== repository.readStatus ||
    tagIds.slice().sort().join(",") !== initialTagKey ||
    favorite !== repository.favorite;

  const requestClose = () => {
    if (saving || deleting) return;
    if (dirty) setDiscardOpen(true);
    else onOpenChange(false);
  };
  const submit = () => {
    if (!dirty || saving) return;
    onSave({
      favorite,
      note: note.trim() || null,
      collectionId: collectionId || null,
      rating,
      readStatus,
      tagIds
    });
  };

  return <>
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) requestClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="repo-drawer"
          aria-describedby="repository-description"
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
        >
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
            <button className="icon-button" aria-label="关闭详情" onClick={requestClose}><X size={19} /></button>
          </header>

          <div className="drawer-meta-strip">
            <span><Star size={16} /> {repository.stars.toLocaleString()}</span>
            {repository.language && <span><i className="language-dot" /> {repository.language}</span>}
            {repository.license && <span>{repository.license}</span>}
            <span>{repository.openIssues.toLocaleString()} issues</span>
            <a href={repository.url} target="_blank" rel="noreferrer" onClick={onVisit}>
              GitHub <ExternalLink size={15} />
            </a>
          </div>

          <div className="drawer-form">
            {repository.topics.length > 0 && <section className="drawer-topics" aria-label="GitHub topics">
              {repository.topics.slice(0, 8).map((topic) => <span key={topic}>#{topic}</span>)}
            </section>}

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
                    aria-pressed={readStatus === option.value}
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
                      aria-pressed={value <= rating}
                    >
                      <Star size={19} fill={value <= rating ? "currentColor" : "none"} />
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
                  rows={6}
                />
                <small>{note.length} / 4000</small>
              </label>
            </section>

            {saveError && <p className="drawer-inline-error" role="alert"><CircleAlert size={16} />保存没有完成。草稿仍在这里，请检查网络后重试。</p>}
          </div>

          <footer className="drawer-footer">
            <div className="drawer-footer-secondary">
              <button
                className={favorite ? "button favorite-toggle selected" : "button favorite-toggle"}
                onClick={() => setFavorite((current) => !current)}
                type="button"
                aria-pressed={favorite}
              >
                <Heart size={17} fill={favorite ? "currentColor" : "none"} />
                {favorite ? "已特别关注" : "特别关注"}
              </button>
              {repository.homepage && <a className="button ghost" href={repository.homepage} target="_blank" rel="noreferrer"><Globe2 size={16} />主页</a>}
              {onDelete && <button className="button danger-quiet drawer-delete" type="button" onClick={() => setDeleteOpen(true)}><Trash2 size={16} />移除</button>}
            </div>
            <div>
              <button className="button ghost" type="button" onClick={requestClose}>取消</button>
              <button className="button primary" disabled={saving || !dirty} onClick={submit} type="button">
                <MessageSquareText size={16} />{saving ? "保存中…" : dirty ? "保存整理信息" : "已保存"}
              </button>
            </div>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>

    <AlertDialog.Root open={discardOpen} onOpenChange={setDiscardOpen}>
      <AlertDialog.Portal><AlertDialog.Overlay className="dialog-overlay nested-overlay" /><AlertDialog.Content className="dialog-card alert-card"><AlertDialog.Title>放弃尚未保存的修改？</AlertDialog.Title><AlertDialog.Description>状态、标签、评分或笔记的本次修改将不会保存。</AlertDialog.Description><div className="dialog-actions"><AlertDialog.Cancel asChild><button className="button secondary">继续编辑</button></AlertDialog.Cancel><AlertDialog.Action asChild><button className="button danger" onClick={() => onOpenChange(false)}>放弃修改</button></AlertDialog.Action></div></AlertDialog.Content></AlertDialog.Portal>
    </AlertDialog.Root>

    <AlertDialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
      <AlertDialog.Portal><AlertDialog.Overlay className="dialog-overlay nested-overlay" /><AlertDialog.Content className="dialog-card alert-card"><AlertDialog.Title>从资料库移除“{repository.fullName}”？</AlertDialog.Title><AlertDialog.Description>RepoNest 会隐藏这条收藏以及它的个人整理信息。手动重新添加时可以恢复项目。</AlertDialog.Description><div className="dialog-actions"><AlertDialog.Cancel asChild><button className="button secondary">取消</button></AlertDialog.Cancel><AlertDialog.Action asChild><button className="button danger" disabled={deleting} onClick={onDelete}>{deleting ? "移除中…" : "确认移除"}</button></AlertDialog.Action></div></AlertDialog.Content></AlertDialog.Portal>
    </AlertDialog.Root>
  </>;
}
