export const ALL_TILE_IDS = [
  "1m",
  "2m",
  "3m",
  "4m",
  "5m",
  "6m",
  "7m",
  "8m",
  "9m",
  "1p",
  "2p",
  "3p",
  "4p",
  "5p",
  "6p",
  "7p",
  "8p",
  "9p",
  "1s",
  "2s",
  "3s",
  "4s",
  "5s",
  "6s",
  "7s",
  "8s",
  "9s",
  "hatsu"
] as const;

export type TileId = (typeof ALL_TILE_IDS)[number];

export type QuizQuestion = {
  id: number;
  hand: TileId[];
  melds: TileId[][];
  answers: TileId[];
  explanation: string;
  source: string;
};

export const TILE_LABELS: Record<TileId, string> = {
  "1m": "1萬",
  "2m": "2萬",
  "3m": "3萬",
  "4m": "4萬",
  "5m": "5萬",
  "6m": "6萬",
  "7m": "7萬",
  "8m": "8萬",
  "9m": "9萬",
  "1p": "1筒",
  "2p": "2筒",
  "3p": "3筒",
  "4p": "4筒",
  "5p": "5筒",
  "6p": "6筒",
  "7p": "7筒",
  "8p": "8筒",
  "9p": "9筒",
  "1s": "1索",
  "2s": "2索",
  "3s": "3索",
  "4s": "4索",
  "5s": "5索",
  "6s": "6索",
  "7s": "7索",
  "8s": "8索",
  "9s": "9索",
  hatsu: "發"
};

export function getTileLabel(tileId: TileId) {
  return TILE_LABELS[tileId];
}

function isSuit(value: string): value is "m" | "p" | "s" {
  return value === "m" || value === "p" || value === "s";
}

function toTileId(value: string): TileId {
  if (ALL_TILE_IDS.includes(value as TileId)) {
    return value as TileId;
  }

  throw new Error(`Unknown tile id: ${value}`);
}

function parseTileBlock(block: string): TileId[] {
  const tiles: TileId[] = [];
  let digits = "";
  let index = 0;

  while (index < block.length) {
    const char = block[index];

    if (/^[1-9]$/.test(char)) {
      digits += char;
      index += 1;
      continue;
    }

    if (isSuit(char)) {
      for (const digit of digits) {
        tiles.push(toTileId(`${digit}${char}`));
      }
      digits = "";
      index += 1;
      continue;
    }

    if (block.startsWith("hatsu", index)) {
      tiles.push("hatsu");
      index += "hatsu".length;
      continue;
    }

    throw new Error(`Invalid tile notation: ${block}`);
  }

  if (digits.length > 0) {
    throw new Error(`Suit is missing in tile notation: ${block}`);
  }

  return tiles;
}

function parseQuestionNotation(source: string) {
  const [handBlock = "", ...meldBlocks] = source.trim().split(/\s+/);

  return {
    hand: parseTileBlock(handBlock),
    melds: meldBlocks.map(parseTileBlock)
  };
}

function createQuestion(
  id: number,
  source: string,
  answers: TileId[],
  explanation: string
): QuizQuestion {
  const parsed = parseQuestionNotation(source);

  return {
    id,
    source,
    hand: parsed.hand,
    melds: parsed.melds,
    answers,
    explanation
  };
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  createQuestion(
    1,
    "223344m78p34578s",
    ["6p", "7p", "8p", "9p", "6s", "7s", "8s", "9s"],
    "シート1の1行目を使った問題です。萬子の連続形を残しつつ、筒子と索子の両面・連続形を伸ばす牌を引くと、打牌後にテンパイへ進めます。"
  ),
  createQuestion(
    2,
    "22344m678p34578s",
    ["1m", "2m", "3m", "4m", "5m", "6s", "7s", "8s", "9s"],
    "シート1の2行目を使った問題です。萬子の複合形か索子の伸びを補う牌が有効で、どちらかのブロックが整うとテンパイ形を作れます。"
  ),
  createQuestion(
    3,
    "22344m678p34556s",
    ["1m", "2m", "3m", "4m", "5m", "2s", "3s", "4s", "5s", "6s", "7s"],
    "シート1の3行目を使った問題です。萬子の形か索子の複合形に手をかける牌が受け入れで、完成メンツを固定しながらテンパイへ向かいます。"
  ),
  createQuestion(
    4,
    "2234m6788p34556s",
    ["2m", "5m", "5p", "8p", "4s", "7s"],
    "シート1の4行目を使った問題です。萬子・筒子・索子のいずれかの未完成ブロックが強化されると、次の打牌で待ちを持てる形になります。"
  ),
  createQuestion(
    5,
    "2234m679p345567s",
    ["2m", "5m", "5p", "6p", "8p", "9p"],
    "シート1の5行目を使った問題です。萬子の連続形と筒子のカンチャン周辺がポイントで、形をほぐせる牌がテンパイへの受け入れです。"
  ),
  createQuestion(
    6,
    "11223m678p12234s",
    ["1m", "2m", "3m", "4m", "1s", "2s", "3s", "4s", "5s"],
    "シート1の6行目を使った問題です。対子を含む萬子と索子の複合形に有効牌が多く、雀頭候補を残しながらテンパイへ進めます。"
  ),
  createQuestion(
    7,
    "1234567m678p246s",
    ["1m", "4m", "7m", "2s", "3s", "5s", "6s"],
    "シート1の7行目を使った問題です。萬子の長い連続形か索子の246形が整うと、完成メンツを維持したままテンパイを取れます。"
  ),
  createQuestion(
    8,
    "44566m34568p 888m",
    ["3m", "4m", "5m", "6m", "7m", "3p", "6p", "7p", "8p"],
    "シート1の29行目を使った副露入り問題です。スペース後の888萬は完成メンツとして扱い、真ん中の8萬を横向きで表示しています。"
  ),
  createQuestion(
    9,
    "1345568m678p hatsuhatsuhatsu",
    ["1m", "2m", "4m", "5m", "7m", "8m"],
    "シート1の36行目を使った副露入り問題です。發發發は完成メンツなので固定し、残りの萬子形を整える牌がテンパイへの受け入れです。"
  ),
  createQuestion(
    10,
    "123468m2345p hatsuhatsuhatsu",
    ["1m", "4m", "5m", "7m", "8m", "2p", "5p"],
    "シート1の37行目を使った副露入り問題です。發の副露メンツを固定し、萬子と筒子の未完成部分を補う牌を引くとテンパイへ進めます。"
  )
];
