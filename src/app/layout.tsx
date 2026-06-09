import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "一向聴の受け入れテスト",
  description: "13枚の牌姿からテンパイに進む受け入れ牌をすべて選ぶ麻雀テスト"
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
