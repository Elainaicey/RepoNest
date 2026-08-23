"use client";

import {
  Bookmark,
  Check,
  CircleAlert,
  CircleDot,
  Compass,
  ExternalLink,
  GitBranch as Github,
  GitFork,
  Globe2,
  Heart,
  Inbox,
  Save,
  Star,
  Tags as TagsIcon,
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

const statusOptions: Array<{
  value: ReadStatus;
  label: string;
  hint: string;
  icon: typeof Inbox;
}> = [
  { value: "inbox", label: "待整理", hint: "刚收藏，留待下一步处理", icon: Inbox },
  { value: "exploring", label: "探索中", hint: "正在阅读、评估或学习", icon: Compass },
  { value: "adopted", label: "已采用", hint: "已经进入你的工作流", icon: Check }
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
  const activeStatus = statusOptions.find((option) => option.value === readStatus) ?? statusOptions[0];
  const busy = saving || deleting;

  const requestClose = () => {
    if (busy) return;
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

  return (
    <>
      <Dialog.Root open={open} onOpenChange={(next) => { if (!next) requestClose(); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay repo-drawer-overlay" />
          <Dialog.Content
            className="repo-drawer repo-detail-panel"
            aria-describedby="repository-description"
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                submit();
              }
            }}
          >
            <header className="drawer-header drawer-hero">
              <div className="drawer-repo-title">
                <span className="repo-avatar large drawer-repo-avatar" aria-hidden="true">
                  {repository.owner.slice(0, 2).toUpperCase()}
                </span>
                <div className="drawer-title-copy">
                  <span className="drawer-repo-kicker">
                    {repository.source === "github-star" ? <><Github size={12} aria-hidden="true" /> GitHub Star</> : <><Bookmark size={12} aria-hidden="true" /> 手动收藏</>}
                  </span>
                  <Dialog.Title>{repository.fullName}</Dialog.Title>
                  <Dialog.Description id="repository-description">
                    {repository.description || "这个仓库暂时没有填写简介。"}
                  </Dialog.Description>
                </div>
              </div>

              <div className="drawer-header-actions">
                <button
                  className={favorite ? "icon-button selected" : "icon-button"}
                  onClick={() => setFavorite((current) => !current)}
                  type="button"
                  aria-label={favorite ? `取消特别关注 ${repository.fullName}` : `特别关注 ${repository.fullName}`}
                  aria-pressed={favorite}
                  disabled={busy}
                >
                  <Heart size={17} fill={favorite ? "currentColor" : "none"} aria-hidden="true" />
                </button>
                <a
                  className="icon-button"
                  href={repository.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={onVisit}
                  aria-label={`在 GitHub 打开 ${repository.fullName}`}
                >
                  <ExternalLink size={17} aria-hidden="true" />
                </a>
                <button className="icon-button" aria-label="关闭项目详情" onClick={requestClose} type="button" disabled={busy}>
                  <X size={19} aria-hidden="true" />
                </button>
              </div>
            </header>

            <div className="drawer-meta-strip drawer-project-stats" aria-label="GitHub 项目数据">
              <div className="drawer-project-stat">
                <Star size={15} aria-hidden="true" />
                <span><strong>{repository.stars.toLocaleString()}</strong><small>Stars</small></span>
              </div>
              <div className="drawer-project-stat">
                <GitFork size={15} aria-hidden="true" />
                <span><strong>{repository.forks.toLocaleString()}</strong><small>Forks</small></span>
              </div>
              <div className="drawer-project-stat">
                <CircleDot size={15} aria-hidden="true" />
                <span><strong>{repository.openIssues.toLocaleString()}</strong><small>Issues</small></span>
              </div>
              {repository.language && (
                <div className="drawer-project-stat">
                  <i className="language-dot" aria-hidden="true" />
                  <span><strong>{repository.language}</strong><small>语言</small></span>
                </div>
              )}
              {repository.license && <span className="drawer-license-chip">{repository.license}</span>}
            </div>

            <div className="drawer-form repo-detail-form" aria-busy={saving}>
              {repository.topics.length > 0 && (
                <section className="drawer-topics drawer-topic-cloud" aria-label="GitHub Topics">
                  {repository.topics.slice(0, 10).map((topic) => <span key={topic}>#{topic}</span>)}
                </section>
              )}

              <section className="form-section drawer-form-section drawer-status-section" aria-labelledby="drawer-status-title">
                <div className="field-heading drawer-section-heading">
                  <span className="drawer-section-index" aria-hidden="true">01</span>
                  <div>
                    <strong id="drawer-status-title">推进状态</strong>
                    <span>告诉未来的自己，这个项目接下来要做什么。</span>
                  </div>
                  <span className="drawer-section-summary">{activeStatus.label}</span>
                </div>
                <div className="status-selector" role="group" aria-label="项目推进状态">
                  {statusOptions.map((option) => {
                    const StatusIcon = option.icon;
                    const checked = readStatus === option.value;
                    return (
                      <button
                        className={checked ? "active" : ""}
                        data-status={option.value}
                        key={option.value}
                        onClick={() => setReadStatus(option.value)}
                        type="button"
                        aria-pressed={checked}
                        disabled={busy}
                      >
                        <StatusIcon size={17} aria-hidden="true" />
                        <span><strong>{option.label}</strong><small>{option.hint}</small></span>
                        {checked && <Check className="status-selector-check" size={15} aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="form-section drawer-form-section" aria-labelledby="drawer-organize-title">
                <div className="field-heading drawer-section-heading">
                  <span className="drawer-section-index" aria-hidden="true">02</span>
                  <div>
                    <strong id="drawer-organize-title">归类与评分</strong>
                    <span>为项目建立稳定位置，也记录你的主观判断。</span>
                  </div>
                </div>
                <div className="two-column-fields drawer-organize-grid">
                  <label className="field-label drawer-collection-field">
                    <span><Bookmark size={14} aria-hidden="true" /> 所属收藏集</span>
                    <select value={collectionId} onChange={(event) => setCollectionId(event.target.value)} disabled={busy}>
                      <option value="">未分组</option>
                      {collections.map((collection) => (
                        <option value={collection.id} key={collection.id}>{collection.name}</option>
                      ))}
                    </select>
                  </label>
                  <div className="field-label drawer-rating-field">
                    <span><Star size={14} aria-hidden="true" /> 个人评分</span>
                    <div className="rating-control" role="group" aria-label={`当前评分 ${rating || 0} 星`}>
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          className={value <= rating ? "active" : ""}
                          key={value}
                          onClick={() => setRating(rating === value ? 0 : value)}
                          type="button"
                          aria-label={rating === value ? `清除 ${value} 星评分` : `设为 ${value} 星`}
                          aria-pressed={value <= rating}
                          disabled={busy}
                        >
                          <Star size={19} fill={value <= rating ? "currentColor" : "none"} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="form-section drawer-form-section" aria-labelledby="drawer-tags-title">
                <div className="field-heading drawer-section-heading">
                  <span className="drawer-section-index" aria-hidden="true">03</span>
                  <div>
                    <strong id="drawer-tags-title">标签</strong>
                    <span>用多个横向维度，把项目串联进你的知识网络。</span>
                  </div>
                  {tagIds.length > 0 && <span className="drawer-section-summary">已选 {tagIds.length}</span>}
                </div>
                <div className="tag-picker" role="group" aria-label="选择项目标签">
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
                        disabled={busy}
                      >
                        <span aria-hidden="true" /> {tag.name}
                        {checked && <Check size={13} aria-hidden="true" />}
                      </button>
                    );
                  }) : (
                    <div className="field-empty drawer-field-empty">
                      <TagsIcon size={18} aria-hidden="true" />
                      <span><strong>还没有可用标签</strong><small>可前往“标签”页面创建第一枚标签。</small></span>
                    </div>
                  )}
                </div>
              </section>

              <section className="form-section drawer-form-section drawer-note-section" aria-labelledby="drawer-note-title">
                <div className="field-heading drawer-section-heading">
                  <span className="drawer-section-index" aria-hidden="true">04</span>
                  <div>
                    <strong id="drawer-note-title">私人笔记</strong>
                    <span>写下收藏理由、适用场景，或下一次探索的入口。</span>
                  </div>
                </div>
                <label className="field-label drawer-note-field">
                  <span className="sr-only">私人笔记内容</span>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="例如：适合新项目的权限方案；下次重点阅读 examples 目录……"
                    maxLength={4000}
                    rows={7}
                    disabled={busy}
                  />
                  <small className="drawer-character-count">{note.length.toLocaleString()} / 4,000</small>
                </label>
              </section>

              {saveError && (
                <p className="drawer-inline-error" role="alert">
                  <CircleAlert size={16} aria-hidden="true" />
                  <span><strong>保存没有完成</strong>草稿仍在这里，请检查网络后重试。</span>
                </p>
              )}
            </div>

            <footer className="drawer-footer drawer-action-dock">
              <div className="drawer-footer-secondary">
                {repository.homepage && (
                  <a className="button ghost" href={repository.homepage} target="_blank" rel="noreferrer">
                    <Globe2 size={16} aria-hidden="true" /> 项目主页
                  </a>
                )}
                <a className="button ghost" href={repository.url} target="_blank" rel="noreferrer" onClick={onVisit}>
                  <Github size={16} aria-hidden="true" /> GitHub
                </a>
                {onDelete && (
                  <button className="button danger-quiet drawer-delete" type="button" onClick={() => setDeleteOpen(true)} disabled={busy}>
                    <Trash2 size={16} aria-hidden="true" /> 移除
                  </button>
                )}
              </div>
              <div className="drawer-primary-actions">
                <span className={dirty ? "drawer-save-state dirty" : "drawer-save-state"} role="status" aria-live="polite">
                  <span aria-hidden="true" />{dirty ? "有未保存修改" : "已保存"}
                </span>
                <button className="button ghost" type="button" onClick={requestClose} disabled={busy}>关闭</button>
                <button className="button primary drawer-save-button" disabled={saving || !dirty} onClick={submit} type="button">
                  {saving ? <CircleDot className="spinning" size={16} aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
                  {saving ? "保存中…" : dirty ? "保存修改" : "已保存"}
                  {dirty && !saving && <kbd aria-hidden="true">⌘ ↵</kbd>}
                </button>
              </div>
            </footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <AlertDialog.Root open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="dialog-overlay nested-overlay" />
          <AlertDialog.Content className="dialog-card alert-card">
            <div className="dialog-icon warning"><CircleAlert size={21} aria-hidden="true" /></div>
            <AlertDialog.Title>放弃尚未保存的修改？</AlertDialog.Title>
            <AlertDialog.Description>对状态、标签、评分、关注或笔记的本次修改将不会保存。</AlertDialog.Description>
            <div className="dialog-actions">
              <AlertDialog.Cancel asChild><button className="button secondary">继续编辑</button></AlertDialog.Cancel>
              <AlertDialog.Action asChild><button className="button danger" onClick={() => onOpenChange(false)}>放弃修改</button></AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      <AlertDialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="dialog-overlay nested-overlay" />
          <AlertDialog.Content className="dialog-card alert-card">
            <div className="dialog-icon danger"><Trash2 size={21} aria-hidden="true" /></div>
            <AlertDialog.Title>从资料库移除“{repository.fullName}”？</AlertDialog.Title>
            <AlertDialog.Description>RepoNest 会隐藏这条收藏以及它的个人整理信息。之后手动重新添加时仍可恢复项目。</AlertDialog.Description>
            <div className="dialog-actions">
              <AlertDialog.Cancel asChild><button className="button secondary">取消</button></AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button className="button danger" disabled={deleting} onClick={onDelete}>{deleting ? "移除中…" : "确认移除"}</button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
