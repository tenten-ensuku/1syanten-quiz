import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { APP_BASE_PATH } from "@/lib/appIdentity";
import { APP_VERSION } from "@/lib/appVersion";

const ICON_VERSION = APP_VERSION.replace(/^v/, "");

export const metadata: Metadata = {
  title: "一向聴の受け入れテスト",
  description: "13枚の牌姿からテンパイに進む受け入れ牌をすべて選ぶ麻雀テスト",
  manifest: `${APP_BASE_PATH}manifest.webmanifest?v=${ICON_VERSION}`,
  icons: {
    icon: [{ url: `${APP_BASE_PATH}icons/favicon-32.png?v=${ICON_VERSION}`, type: "image/png", sizes: "32x32" }],
    apple: [{ url: `${APP_BASE_PATH}icons/apple-touch-icon-180.png?v=${ICON_VERSION}`, type: "image/png", sizes: "180x180" }],
    shortcut: [{ url: `${APP_BASE_PATH}icons/favicon-32.png?v=${ICON_VERSION}`, type: "image/png", sizes: "32x32" }]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
