# イーシャンテンクイズ

13枚の牌姿から、テンパイに進む受け入れ牌を1枚選ぶクイズアプリのMVPです。

## 起動方法

```bash
npm install
npm run dev
```

ブラウザで表示されたローカルURLを開いてください。通常は `http://localhost:3000` です。

## 牌画像

牌画像は `public/tiles/` 配下に置く想定です。

例:

- `public/tiles/1m.png`
- `public/tiles/2m.png`
- `public/tiles/1p.png`
- `public/tiles/1s.png`
- `public/tiles/hatsu.png`
- `public/tiles/8m-yoko.png`
- `public/tiles/hatsu-yoko.png`

画像が存在しない場合や読み込みに失敗した場合は、牌名テキストにフォールバックします。

このCodex環境ではGitHubへPNGを直接アップロードできないため、牌画像はローカルの `public/tiles/` から別途pushしてください。通常牌28枚と横向き牌28枚を置くと、アプリは画像表示に切り替わります。

## 問題データ

問題データと牌ID一覧は `src/lib/quizData.ts` にあります。`answers` は複数の正解牌を持てる配列です。

サンプル問題は Google Sheets「イーシャンテンクイズサンプル」の `シート1` A列の牌姿を元にしています。牌姿文字列でスペースの後にあるブロックは副露完成メンツとして表示し、中央の牌だけ横向き画像を使います。

## 開発用コマンド

```bash
npm run typecheck
npm run build
```
