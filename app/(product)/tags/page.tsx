import type { Metadata } from "next";
import { TagsView } from "@/components/tags-view";

export const metadata: Metadata = { title: "标签" };

export default function TagsPage() {
  return <TagsView />;
}
