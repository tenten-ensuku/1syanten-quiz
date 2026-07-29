import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "一向聴の受け入れテスト",
  description: "13枚の牌姿からテンパイに進む受け入れ牌をすべて選ぶ麻雀テスト",
  manifest: `${BASE_PATH}/manifest.webmanifest`,
  icons: {
    icon: [{ url: `${BASE_PATH}/shortcut-icon.png`, type: "image/png" }],
    apple: [{ url: `${BASE_PATH}/apple-touch-icon.png`, type: "image/png" }],
    shortcut: [{ url: `${BASE_PATH}/shortcut-icon.png`, type: "image/png" }]
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
