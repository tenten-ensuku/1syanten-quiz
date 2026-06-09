# 一向聴の受け入れテスト

13枚の牌姿を見て、テンパイに進む受け入れ牌をすべて選ぶ複数回答式クイズアプリです。
問題は Google スプレッドシートの A 列を元にしたデータをランダム順で出題し、B 列の解説を表示します。

表示時には、萬子・筒子・索子の入れ替えと数字反転をランダムに適用します。
変換後の手牌と正解牌は、萬子、筒子、索子、字牌の順で小さい数字から並べて表示します。
副露メンツは手牌の後ろに表示し、中央の牌を横向きにします。

## 起動方法

```bash
npm install
npm run dev
```

ブラウザで表示されたローカル URL を開いてください。通常は `http://localhost:3000` です。

## 画像

牌画像は `public/tiles/` 配下に置いています。画像が読み込めない場合も、alt 属性で牌の内容が分かるようにしています。

## 問題データ

問題データと牌 ID 一覧は `src/lib/quizData.ts` にあります。
`answers` は複数の正解牌を持てる配列です。
解答候補は萬子9種、筒子9種、索子9種、字牌7種の合計34種類です。

## 開発用コマンド

```bash
npm run typecheck
npm run build
```

## GitHub Pages

`main` ブランチへ push すると、GitHub Actions が `npm run build` で静的サイトを作成し、GitHub Pages へデプロイします。

公開 URL:

https://watarum2001.github.io/1syanten-quiz/
