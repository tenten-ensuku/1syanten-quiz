# 一向聴の受け入れテスト

13枚の牌姿から、テンパイに進む受け入れ牌をすべて選ぶ麻雀テストアプリです。
スプレッドシート内の問題をランダム順で出題します。

## 起動方法

```bash
npm install
npm run dev
```

ブラウザで表示されたローカルURLを開いてください。通常は `http://localhost:3000` です。

## 画像

牌画像は `public/tiles/` 配下に置く前提です。

例:

- `public/tiles/1m.png`
- `public/tiles/2m.png`
- `public/tiles/1p.png`
- `public/tiles/1s.png`
- `public/tiles/ton.png`
- `public/tiles/haku.png`
- `public/tiles/hatsu.png`

## 問題データ

問題データと牌ID一覧は `src/lib/quizData.ts` にあります。
`answers` は複数の正解牌を持てる配列です。
解答候補は萬子9種、筒子9種、索子9種、字牌7種の合計34種類です。
解説文は今後追記できるように、現時点では空文字にしています。

## 開発用コマンド

```bash
npm run typecheck
npm run build
```

## GitHub Pages

`main` ブランチへ push すると、GitHub Actions が `npm run build` で静的サイトを作成し、GitHub Pages へデプロイします。

公開URL:

https://watarum2001.github.io/1syanten-quiz/
