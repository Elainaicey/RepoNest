import type { Metadata } from "next";
import { InsightsView } from "@/components/insights-view";

export const metadata: Metadata = { title: "收藏洞察" };

export default function InsightsPage() {
  return <InsightsView />;
}
