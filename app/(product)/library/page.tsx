import type { Metadata } from "next";
import { LibraryPage } from "@/components/library-page";

export const metadata: Metadata = { title: "全部收藏" };

export default function LibraryRoute() {
  return <LibraryPage scope="all" />;
}
