import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./tile-sprite.css";

export const metadata: Metadata = {
  title: "イーシャンテンクイズ",
  description: "13枚の手牌からテンパイに進む受け入れ牌を選ぶ麻雀クイズ"
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
