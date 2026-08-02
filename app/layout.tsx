import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Providers from "./providers";
import "./globals.css";
import "./v2.css";

const themeBootstrap = `(()=>{try{const stored=localStorage.getItem("reponest.theme");const theme=stored||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme}catch{}})()`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
});

export const metadata: Metadata = {
  title: {
    default: "RepoNest — 让每一颗 Star 都有归处",
    template: "%s · RepoNest"
  },
  description:
    "一个自托管的综合性 GitHub 收藏管理中枢，支持自动同步、收藏集、标签、状态、评分、笔记、批量整理与收藏洞察。",
  keywords: [
    "GitHub stars",
    "bookmark manager",
    "self-hosted",
    "open source",
    "RepoNest"
  ],
  openGraph: {
    title: "RepoNest — 让每一颗 Star 都有归处",
    description: "同步、整理并重新发现你的 GitHub 星标。",
    type: "website",
    locale: "zh_CN",
    images: [{ url: "/og-v2.png", width: 1536, height: 1024 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "RepoNest",
    description: "把散落的 GitHub 星标，变成真正属于你的技术资料库。",
    images: ["/og-v2.png"]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
