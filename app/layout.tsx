import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ||
    requestHeaders.get("host") ||
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ||
    (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const socialImage = `${origin}/og.png`;

  return {
    metadataBase: new URL(origin),
    title: "RepoNest — 让每一颗 Star 都有归处",
    description:
      "一个清新、本地优先、可自托管的 GitHub 星标与开发者收藏管理中枢。",
    keywords: [
      "GitHub stars",
      "bookmark manager",
      "self-hosted",
      "open source",
      "RepoNest",
    ],
    openGraph: {
      title: "RepoNest — 让每一颗 Star 都有归处",
      description: "搜索、整理、标注并重新发现你的 GitHub 星标。",
      type: "website",
      locale: "zh_CN",
      images: [{ url: socialImage, width: 1536, height: 1024 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "RepoNest",
      description: "把散落的 GitHub 星标，变成属于你的技术花园。",
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
