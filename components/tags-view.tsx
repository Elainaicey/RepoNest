"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Hash,
  Layers3,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Tag as TagIcon,
  Trash2,
  X
} from "lucide-react";
import Link from "next/link";
import { AlertDialog, Dialog } from "radix-ui";
import { useMemo, useState } from "react";
import { useToast } from "@/app/providers";
import { api } from "@/lib/api";
import type { RadixColor, Tag } from "@/lib/types";
import { PageHeader } from "./page-header";
import { QueryErrorState } from "./query-error-state";

const palette: RadixColor[] = [
  "iris", "plum", "sky", "cyan", "teal", "jade",
  "grass", "amber", "orange", "ruby", "pink", "sand"
];

type TagPayload = {
  name: string;
  description: string | null;
  color: RadixColor;
};

export function TagsView() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<RadixColor>("iris");
  const tags = useQuery({
    queryKey: ["tags"],
    queryFn: () => api<{ tags: Tag[] }>("/api/tags")
  });

  const resetEditor = () => {
    setEditingTag(null);
    setName("");
    setDescription("");
    setColor("iris");
  };
  const closeEditor = () => {
    setOpen(false);
    resetEditor();
  };
  const startCreate = () => {
    resetEditor();
    setOpen(true);
  };
  const startEdit = (tag: Tag) => {
    setEditingTag(tag);
    setName(tag.name);
    setDescription(tag.description ?? "");
    setColor(tag.color);
    setOpen(true);
  };
  const invalidateTaxonomy = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["tags"] }),
      queryClient.invalidateQueries({ queryKey: ["repositories"] }),
      queryClient.invalidateQueries({ queryKey: ["insights"] })
    ]);
  };

  const createTag = useMutation({
    mutationFn: (payload: TagPayload) => api("/api/tags", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
    onSuccess: async () => {
      closeEditor();
      await invalidateTaxonomy();
      notify("标签已创建", "现在可以在项目详情或筛选器中使用它。");
    },
    onError: () => notify("无法创建标签", "标签名称可能已经存在。", "error")
  });
  const updateTag = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TagPayload }) =>
      api(`/api/tags/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      }),
    onSuccess: async () => {
      closeEditor();
      await invalidateTaxonomy();
      notify("标签已更新", "名称、说明和识别色已经保存。");
    },
    onError: () => notify("无法更新标签", "请检查名称是否重复，然后重试。", "error")
  });
  const deleteTag = useMutation({
    mutationFn: (id: string) => api(`/api/tags/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await invalidateTaxonomy();
      notify("标签已删除", "项目本身和其他整理信息不会受到影响。");
    },
    onError: () => notify("无法删除标签", "标签没有被删除，请稍后重试。", "error")
  });

  const allTags = useMemo(() => tags.data?.tags ?? [], [tags.data?.tags]);
  const totalRelations = allTags.reduce((sum, tag) => sum + (tag.count ?? 0), 0);
  const usedTags = allTags.filter((tag) => (tag.count ?? 0) > 0).length;
  const visible = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return allTags.filter((tag) =>
      `${tag.name} ${tag.description ?? ""}`.toLocaleLowerCase().includes(needle)
    );
  }, [allTags, search]);
  const saving = createTag.isPending || updateTag.isPending;

  const submitTag = () => {
    const payload: TagPayload = {
      name: name.trim(),
      description: description.trim() || null,
      color
    };
    if (editingTag) updateTag.mutate({ id: editingTag.id, payload });
    else createTag.mutate(payload);
  };

  return (
    <div className="page-stack experience-page taxonomy-page">
      <PageHeader
        eyebrow="TAXONOMY"
        title="标签空间"
        description="用轻量、可组合的标签连接收藏，让技术方向、使用场景和成熟度自然浮现。"
        actions={(
          <button className="button primary action-with-glow" onClick={startCreate}>
            <Plus size={17} />
            创建标签
          </button>
        )}
      />

      {tags.isError ? (
        <QueryErrorState
          title="暂时无法读取标签"
          description="标签列表没有成功返回。项目与已有标签关联仍安全保存在资料库中。"
          onRetry={() => tags.refetch()}
          retrying={tags.isFetching}
        />
      ) : (
        <>
          <section className="glass-hero taxonomy-hero" aria-labelledby="taxonomy-overview-title">
            <div className="glass-hero-copy">
              <span className="hero-kicker"><Sparkles size={14} /> ORGANIZATION LAYER</span>
              <h2 id="taxonomy-overview-title">分组划定空间，标签建立联系。</h2>
              <p>收藏集适合承载项目与路线，标签则跨越边界建立关联。保持名称简短、含义清晰，检索会越来越轻松。</p>
              <Link className="text-action" href="/library">
                在资料库中开始整理 <ArrowUpRight size={15} />
              </Link>
            </div>
            <div className="taxonomy-constellation" aria-hidden="true">
              <span className="constellation-orbit orbit-one" />
              <span className="constellation-orbit orbit-two" />
              <span className="constellation-core"><TagIcon size={24} /></span>
              <i data-color="iris"><Hash size={13} /></i>
              <i data-color="sky"><Layers3 size={13} /></i>
              <i data-color="jade"><Sparkles size={13} /></i>
            </div>
            <dl className="hero-stat-strip" aria-label="标签概览">
              <div><dt>{allTags.length}</dt><dd>全部标签</dd></div>
              <div><dt>{usedTags}</dt><dd>正在使用</dd></div>
              <div><dt>{totalRelations}</dt><dd>项目关联</dd></div>
            </dl>
          </section>

          <section className="content-section taxonomy-directory" aria-labelledby="tag-directory-title">
            <div className="section-heading-row">
              <div>
                <span className="section-kicker">DIRECTORY</span>
                <h2 id="tag-directory-title">标签目录</h2>
                <p>选择标签查看相关项目，或编辑它的含义与识别色。</p>
              </div>
              {!tags.isPending && <span className="result-count" aria-live="polite">显示 {visible.length} / {allTags.length}</span>}
            </div>

            <div className="glass-toolbar taxonomy-toolbar">
              <label className="search-field elevated-search">
                <span className="sr-only">搜索标签</span>
                <Search size={17} aria-hidden="true" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="按名称或说明搜索…"
                />
                {search && (
                  <button className="search-clear" type="button" onClick={() => setSearch("")} aria-label="清除搜索">
                    <X size={15} />
                  </button>
                )}
              </label>
              <button className="button secondary toolbar-create" onClick={startCreate}>
                <Plus size={16} /> 新标签
              </button>
            </div>

            {tags.isPending ? (
              <div className="tag-grid interactive-grid" aria-busy="true" aria-label="正在加载标签">
                {[0, 1, 2, 3, 4, 5].map((item) => <div className="tag-manage-card glass-card skeleton-card" key={item} />)}
              </div>
            ) : visible.length ? (
              <div className="tag-grid interactive-grid">
                {visible.map((tag) => {
                  const deleting = deleteTag.isPending && deleteTag.variables === tag.id;
                  return (
                    <article className="tag-manage-card glass-card interactive-card" data-color={tag.color} key={tag.id}>
                      <div className="card-light" aria-hidden="true" />
                      <header className="tag-card-header">
                        <span className="tag-symbol"><Hash size={18} /></span>
                        <span className="tag-usage-pill">{tag.count ?? 0} 个项目</span>
                        <div className="repo-card-actions tag-card-actions">
                          <button className="icon-button" onClick={() => startEdit(tag)} aria-label={`编辑 ${tag.name}`}>
                            <Pencil size={15} />
                          </button>
                          <AlertDialog.Root>
                            <AlertDialog.Trigger asChild>
                              <button className="icon-button danger-hover" aria-label={`删除 ${tag.name}`}><Trash2 size={15} /></button>
                            </AlertDialog.Trigger>
                            <AlertDialog.Portal>
                              <AlertDialog.Overlay className="dialog-overlay" />
                              <AlertDialog.Content className="dialog-card glass-dialog alert-card">
                                <AlertDialog.Title>删除“{tag.name}”？</AlertDialog.Title>
                                <AlertDialog.Description>此操作只会移除标签及其关联，不会删除任何收藏项目。</AlertDialog.Description>
                                <div className="dialog-actions">
                                  <AlertDialog.Cancel asChild><button className="button ghost">取消</button></AlertDialog.Cancel>
                                  <AlertDialog.Action asChild>
                                    <button className="button danger" disabled={deleting} onClick={() => deleteTag.mutate(tag.id)}>
                                      {deleting ? "删除中…" : "删除标签"}
                                    </button>
                                  </AlertDialog.Action>
                                </div>
                              </AlertDialog.Content>
                            </AlertDialog.Portal>
                          </AlertDialog.Root>
                        </div>
                      </header>
                      <Link className="tag-card-link" href={`/library?tag=${encodeURIComponent(tag.id)}`} aria-label={`查看标签 ${tag.name} 下的项目`}>
                        <h3>{tag.name}</h3>
                        <p>{tag.description || "还没有说明这个标签的使用边界。"}</p>
                        <span className="card-text-action">查看相关项目 <ArrowUpRight size={14} /></span>
                      </Link>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state glass-empty taxonomy-empty">
                <span className="empty-icon"><TagIcon size={22} /></span>
                <h2>{search ? "没有找到相符的标签" : "建立第一枚标签"}</h2>
                <p>{search ? `没有与“${search}”匹配的名称或说明，可以换一个关键词。` : "从技术领域或使用状态开始，例如“设计系统”或“生产可用”。"}</p>
                {search ? (
                  <button className="button secondary" onClick={() => setSearch("")}>清除搜索</button>
                ) : (
                  <button className="button primary" onClick={startCreate}><Plus size={16} /> 创建标签</button>
                )}
              </div>
            )}
          </section>
        </>
      )}

      <Dialog.Root
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) resetEditor();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-card glass-dialog taxonomy-editor">
            <div className="dialog-heading-with-preview">
              <div className="dialog-icon" data-color={color}>{editingTag ? <Pencil size={20} /> : <TagIcon size={20} />}</div>
              <div>
                <Dialog.Title>{editingTag ? `编辑“${editingTag.name}”` : "创建标签"}</Dialog.Title>
                <Dialog.Description>
                  {editingTag ? "调整表达方式，已有项目关联会完整保留。" : "建立一个可以跨收藏集使用的整理维度。"}
                </Dialog.Description>
              </div>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); submitTag(); }}>
              <div className="form-section">
                <label className="field-label">
                  <span>名称</span>
                  <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：设计系统" maxLength={40} required />
                  <small>{name.length}/40 · 建议使用简短名词</small>
                </label>
                <label className="field-label">
                  <span>说明（可选）</span>
                  <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="描述这个标签何时应该被使用" maxLength={160} rows={3} />
                  <small>{description.length}/160</small>
                </label>
              </div>
              <fieldset className="color-field color-palette-field">
                <legend>识别色</legend>
                <p>颜色用于快速识别，不会影响排序。</p>
                <div>
                  {palette.map((item) => (
                    <button
                      aria-label={`选择 ${item} 识别色`}
                      aria-pressed={color === item}
                      className={color === item ? "selected" : ""}
                      data-color={item}
                      key={item}
                      onClick={() => setColor(item)}
                      type="button"
                    ><span /></button>
                  ))}
                </div>
              </fieldset>
              <div className="tag-live-preview" data-color={color} aria-label="标签预览">
                <span><Hash size={14} />{name.trim() || "标签预览"}</span>
                <small>{description.trim() || "清晰的标签让收藏更容易被再次发现。"}</small>
              </div>
              <div className="dialog-actions">
                <Dialog.Close asChild><button className="button ghost" type="button">取消</button></Dialog.Close>
                <button className="button primary" disabled={saving || !name.trim()}>
                  {saving ? "保存中…" : editingTag ? "保存更改" : "创建标签"}
                </button>
              </div>
            </form>
            <Dialog.Close asChild><button className="dialog-close icon-button" aria-label="关闭"><X size={17} /></button></Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
