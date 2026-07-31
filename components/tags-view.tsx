"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Hash, Plus, Search, Tag as TagIcon, Trash2, X } from "lucide-react";
import { AlertDialog, Dialog } from "radix-ui";
import { useMemo, useState } from "react";
import { useToast } from "@/app/providers";
import { api } from "@/lib/api";
import type { RadixColor, Tag } from "@/lib/types";
import { PageHeader } from "./page-header";

const palette: RadixColor[] = ["iris", "plum", "sky", "cyan", "teal", "jade", "grass", "amber", "orange", "ruby", "pink", "sand"];

export function TagsView() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<RadixColor>("iris");
  const tags = useQuery({ queryKey: ["tags"], queryFn: () => api<{ tags: Tag[] }>("/api/tags") });
  const createTag = useMutation({
    mutationFn: () => api("/api/tags", { method: "POST", body: JSON.stringify({ name, description: description || null, color }) }),
    onSuccess: async () => {
      setName(""); setDescription(""); setColor("iris"); setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["tags"] });
      notify("标签已创建", "现在可以在项目详情或筛选器中使用它。")
    },
    onError: () => notify("无法创建标签", "标签名称可能已经存在。")
  });
  const deleteTag = useMutation({
    mutationFn: (id: string) => api(`/api/tags/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tags"] }),
        queryClient.invalidateQueries({ queryKey: ["repositories"] })
      ]);
      notify("标签已删除", "项目本身和其他整理信息不会受到影响。")
    }
  });
  const visible = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return (tags.data?.tags ?? []).filter((tag) => `${tag.name} ${tag.description ?? ""}`.toLocaleLowerCase().includes(needle));
  }, [search, tags.data]);

  return (
    <div className="page-stack tags-page">
      <PageHeader eyebrow="TAXONOMY" title="标签" description="用横向维度连接不同收藏集，让框架、场景、成熟度与个人用途都可以被快速找回。" actions={<button className="button primary" onClick={() => setOpen(true)}><Plus size={17} />创建标签</button>} />
      <section className="taxonomy-intro">
        <div className="taxonomy-visual"><TagIcon size={24} /><span /><span /><span /></div>
        <div><p className="eyebrow">FLEXIBLE ORGANIZATION</p><h2>分组划定空间，标签建立关联。</h2><p>建议把收藏集用于“项目 / 学习路线”，把标签用于“技术栈 / 使用场景 / 成熟度”。两者组合比层层文件夹更灵活。</p></div>
        <dl><div><dt>{tags.data?.tags.length ?? 0}</dt><dd>标签</dd></div><div><dt>{tags.data?.tags.reduce((sum, tag) => sum + (tag.count ?? 0), 0) ?? 0}</dt><dd>关联次数</dd></div></dl>
      </section>
      <label className="search-field tags-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索标签…" /></label>
      {tags.isPending ? <div className="tag-grid">{[0, 1, 2, 3].map((item) => <div className="tag-manage-card skeleton-card" key={item} />)}</div> : visible.length ? (
        <div className="tag-grid">
          {visible.map((tag) => (
            <article className="tag-manage-card" data-color={tag.color} key={tag.id}>
              <header><span className="tag-symbol"><Hash size={18} /></span><AlertDialog.Root><AlertDialog.Trigger asChild><button className="icon-button danger-hover" aria-label={`删除 ${tag.name}`}><Trash2 size={15} /></button></AlertDialog.Trigger><AlertDialog.Portal><AlertDialog.Overlay className="dialog-overlay" /><AlertDialog.Content className="dialog-card alert-card"><AlertDialog.Title>删除“{tag.name}”？</AlertDialog.Title><AlertDialog.Description>此操作只会移除标签及其关联，不会删除任何收藏项目。</AlertDialog.Description><div className="dialog-actions"><AlertDialog.Cancel asChild><button className="button ghost">取消</button></AlertDialog.Cancel><AlertDialog.Action asChild><button className="button danger" onClick={() => deleteTag.mutate(tag.id)}>删除标签</button></AlertDialog.Action></div></AlertDialog.Content></AlertDialog.Portal></AlertDialog.Root></header>
              <h3>{tag.name}</h3><p>{tag.description || "还没有说明这个标签的使用边界。"}</p><footer><span>{tag.count ?? 0} 个项目</span><i /></footer>
            </article>
          ))}
        </div>
      ) : <div className="empty-state"><span className="empty-icon"><TagIcon size={22} /></span><h2>{search ? "没有匹配标签" : "建立第一枚标签"}</h2><p>{search ? "试试更短的名称。" : "从技术领域或使用状态开始，例如“前端”或“生产使用”。"}</p><button className="button secondary" onClick={() => setOpen(true)}>创建标签</button></div>}

      <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-card tag-dialog"><div className="dialog-icon"><TagIcon size={20} /></div><Dialog.Title>创建标签</Dialog.Title><Dialog.Description>名称保持简短，描述用于约定这个标签何时应该被使用。</Dialog.Description><form onSubmit={(event) => { event.preventDefault(); createTag.mutate(); }}><label className="field-label"><span>名称</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：设计系统" maxLength={40} required /></label><label className="field-label"><span>说明（可选）</span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="这个标签的使用边界" maxLength={160} /></label><fieldset className="color-field"><legend>颜色</legend><div>{palette.map((item) => <button className={color === item ? "selected" : ""} data-color={item} key={item} onClick={() => setColor(item)} type="button" aria-label={item}><span /></button>)}</div></fieldset><div className="dialog-actions"><Dialog.Close asChild><button className="button ghost" type="button">取消</button></Dialog.Close><button className="button primary" disabled={createTag.isPending}>{createTag.isPending ? "创建中…" : "创建标签"}</button></div></form><Dialog.Close asChild><button className="dialog-close icon-button" aria-label="关闭"><X size={17} /></button></Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>
    </div>
  );
}
