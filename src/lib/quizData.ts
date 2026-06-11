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
  "ton",
  "nan",
  "sha",
  "pei",
  "haku",
  "hatsu",
  "chun"
] as const;

export type TileId = (typeof ALL_TILE_IDS)[number];

export const HONOR_TILE_IDS = ["ton", "nan", "sha", "pei", "haku", "hatsu", "chun"] as const;

export type ShantenType =
  | "余剰牌型"
  | "完全形"
  | "ヘッドレス1型"
  | "ヘッドレス2型"
  | "くっつき";

export type QuizQuestion = {
  id: string;
  hand: TileId[];
  melds: TileId[][];
  answers: TileId[];
  explanation: string;
  shantenTypes: ShantenType[];
  source: string;
};

export const TILE_LABELS: Record<TileId, string> = {
  "1m": "1\u842c",
  "2m": "2\u842c",
  "3m": "3\u842c",
  "4m": "4\u842c",
  "5m": "5\u842c",
  "6m": "6\u842c",
  "7m": "7\u842c",
  "8m": "8\u842c",
  "9m": "9\u842c",
  "1p": "1\u7b52",
  "2p": "2\u7b52",
  "3p": "3\u7b52",
  "4p": "4\u7b52",
  "5p": "5\u7b52",
  "6p": "6\u7b52",
  "7p": "7\u7b52",
  "8p": "8\u7b52",
  "9p": "9\u7b52",
  "1s": "1\u7d22",
  "2s": "2\u7d22",
  "3s": "3\u7d22",
  "4s": "4\u7d22",
  "5s": "5\u7d22",
  "6s": "6\u7d22",
  "7s": "7\u7d22",
  "8s": "8\u7d22",
  "9s": "9\u7d22",
  "ton": "\u6771",
  "nan": "\u5357",
  "sha": "\u897f",
  "pei": "\u5317",
  "haku": "\u767d",
  "hatsu": "\u767c",
  "chun": "\u4e2d"
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

    const honor = HONOR_TILE_IDS.find((tileId) => block.startsWith(tileId, index));
    if (honor) {
      tiles.push(honor);
      index += honor.length;
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
  id: string,
  source: string,
  answers: TileId[],
  explanation: string,
  shantenTypes: ShantenType[]
): QuizQuestion {
  const parsed = parseQuestionNotation(source);

  return {
    id,
    source,
    hand: parsed.hand,
    melds: parsed.melds,
    answers,
    explanation,
    shantenTypes
  };
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  createQuestion(
    "①-1",
    "223344m78p34578s",
    ["6p", "7p", "8p", "9p", "6s", "7s", "8s", "9s"],
    "受け入れは２つのターツの左隣から右隣まで。",
    ["ヘッドレス2型"]
  ),
  createQuestion(
    "①-2",
    "22344m678p34578s",
    ["1m", "2m", "3m", "4m", "5m", "6s", "7s", "8s", "9s"],
    "隙間のない連続形の受け入れは左隣から右隣まで。",
    ["ヘッドレス2型"]
  ),
  createQuestion(
    "①-3",
    "22344m678p34556s",
    ["1m", "2m", "3m", "4m", "5m", "2s", "3s", "4s", "5s", "6s", "7s"],
    "隙間のない連続形の受け入れは左隣から右隣まで。",
    ["ヘッドレス2型"]
  ),
  createQuestion(
    "①-4",
    "2234m6788p34556s",
    ["2m", "5m", "5p", "8p", "4s", "7s"],
    "亜両面の受け入れに注意。１型なので連続形は関係なし。",
    ["ヘッドレス1型"]
  ),
  createQuestion(
    "①-5",
    "2234m679p345567s",
    ["2m", "5m", "5p", "6p", "8p", "9p"],
    "亜両面とターツスキップの受け入れに注意。",
    ["ヘッドレス1型"]
  ),
  createQuestion(
    "①-6",
    "11223m678p12234s",
    ["1m", "2m", "3m", "4m", "1s", "2s", "3s", "4s", "5s"],
    "隙間のない連続形の受け入れは左隣から右隣まで。",
    ["ヘッドレス2型"]
  ),
  createQuestion(
    "①-7",
    "1234567m678p246s",
    ["1m", "4m", "7m", "2s", "3s", "5s", "6s"],
    "ノベタンのメンツ複合形とリャンカンの受け入れに注意。",
    ["ヘッドレス1型"]
  ),
  createQuestion(
    "①-8",
    "12345678m34557p",
    ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "2p", "5p", "6p", "7p"],
    "隙間のある連続形は左隣から右隣までとはならないので注意。８枚の部分は２通りの「メンツ＋連続形」に分割。",
    ["ヘッドレス2型"]
  ),
  createQuestion(
    "②-1",
    "12344556m44566p",
    ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "3p", "4p", "5p", "6p", "7p"],
    "隙間のない連続形は左隣から右隣まで。８枚の部分は２通りの「メンツ＋連続形」に分割。",
    ["ヘッドレス2型"]
  ),
  createQuestion(
    "②-2",
    "12346789m23467p",
    ["1m", "4m", "5m", "6m", "9m", "5p", "6p", "7p", "8p"],
    "８枚の部分は２通りの「メンツ＋隙間のある連続形」に分割。",
    ["ヘッドレス2型"]
  ),
  createQuestion(
    "②-3",
    "1234m134678p456s",
    ["1m", "4m", "1p", "2p", "4p", "5p"],
    "ターツスキップのメンツ複合形とノベタンの受け入れに注意。",
    ["ヘッドレス1型"]
  ),
  createQuestion(
    "②-4",
    "1123m235678p456s",
    ["1m", "4m", "1p", "2p", "4p", "5p", "8p"],
    "ターツスキップのメンツ複合形と亜両面の受け入れに注意。",
    ["ヘッドレス1型"]
  ),
  createQuestion(
    "②-5",
    "12356m11344568p",
    ["4m", "7m", "2p", "5p", "7p"],
    "リャンメンカンチャンの6枚形に注意。リャンカンの発展形なので雀頭は受け入れにならない。",
    ["完全形"]
  ),
  createQuestion(
    "②-6",
    "123m455666p5578s",
    ["3p", "4p", "5p", "6p", "7p", "5s", "6s", "9s"],
    "アンコ含みの6枚形に注意。",
    ["完全形"]
  ),
  createQuestion(
    "②-7",
    "23456m67889p234s",
    ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "5p", "6p", "7p", "8p", "9p"],
    "隙間のない連続形の受け入れは左隣から右隣まで。",
    ["ヘッドレス2型"]
  ),
  createQuestion(
    "②-8",
    "11345m3457p1345s",
    ["1m", "2p", "5p", "6p", "7p", "8p", "9p", "1s", "2s", "3s", "6s"],
    "順子スキップによって増える受け入れと雀頭自身の受け入れに注意。",
    ["くっつき"]
  ),
  createQuestion(
    "③-1",
    "3457888m88p6789s",
    ["2m", "5m", "6m", "7m", "8m", "9m", "8p", "4s", "5s", "6s", "7s", "8s", "9s"],
    "順子スキップによって増える受け入れと４連形のくっつきの受け入れに注意。",
    ["くっつき"]
  ),
  createQuestion(
    "③-2",
    "99m5678p5677889s",
    ["9m", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "3s", "4s", "5s", "6s", "7s", "8s", "9s"],
    "４連形のくっつきに注意。７枚の部分はメンツ＋４連形に分割",
    ["くっつき"]
  ),
  createQuestion(
    "③-3",
    "1234456m245789p",
    ["1m", "4m", "7m", "2p", "3p", "5p", "6p"],
    "ノベタンと亜両面の複合形とターツスキップの受け入れに注意。",
    ["ヘッドレス1型"]
  ),
  createQuestion(
    "③-4",
    "1234567m245678p",
    ["1m", "4m", "7m", "2p", "3p", "5p", "6p", "8p", "9p"],
    "ノベタンのメンツ複合形とターツスキップのメンツ複合系の受け入れに注意。",
    ["ヘッドレス1型"]
  ),
  createQuestion(
    "③-5",
    "445555m3334p888s",
    ["3m", "4m", "6m", "7m", "2p", "3p", "4p", "5p", "6p"],
    "槓子のそばのトイツを雀頭として見て、槓子をアンコ＋くっつき牌として見る。",
    ["くっつき"]
  ),
  createQuestion(
    "③-6",
    "12234m23344678p",
    ["1m", "2m", "3m", "4m", "5m", "1p", "2p", "3p", "4p", "5p"],
    "隙間のない連続形の受け入れは左隣から右隣まで。",
    ["ヘッドレス2型"]
  ),
  createQuestion(
    "③-7",
    "13455688m45567p",
    ["2m", "4m", "7m", "3p", "6p"],
    "リャンメンカンチャンの6枚形に注意。完全形なので連続形は関係なし。",
    ["完全形"]
  ),
  createQuestion(
    "③-8",
    "223457m45678p22s",
    ["2m", "6m", "3p", "6p", "9p", "2s"],
    "6枚形の受け入れに注意。完全形なので連続形の部分は普通の三面張。",
    ["完全形"]
  ),
  createQuestion(
    "④-1",
    "4456688m34568p5s",
    ["5m", "7p"],
    "",
    ["余剰牌型"]
  ),
  createQuestion(
    "④-2",
    "44566m34568p 888m",
    ["3m", "4m", "5m", "6m", "7m", "3p", "6p", "7p", "8p"],
    "隙間のない連続形の受け入れは左隣から右隣まで。",
    ["ヘッドレス2型"]
  ),
  createQuestion(
    "④-3",
    "12334567m22344p",
    ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "1p", "2p", "3p", "4p", "5p"],
    "隙間のない連続形は左隣から右隣まで。８枚の部分は２通りの「メンツ＋連続形」に分割。",
    ["ヘッドレス2型"]
  ),
  createQuestion(
    "④-4",
    "134567m1234456p",
    ["1m", "2m", "4m", "5m", "7m", "8m", "1p", "4p", "7p"],
    "ノベタンと亜両面の複合形とターツスキップのメンツ複合系の受け入れに注意。",
    ["ヘッドレス1型"]
  ),
  createQuestion(
    "④-5",
    "222344m78s44567p",
    ["2m", "3m", "4m", "5m", "4p", "6s", "9s"],
    "アンコ含みの6枚形に注意。",
    ["完全形"]
  ),
  createQuestion(
    "④-6",
    "2245m245667789s",
    ["3m", "6m", "3s", "5s", "8s"],
    "リャンメンカンチャンのメンツ複合形に注意。",
    ["完全形"]
  ),
  createQuestion(
    "④-7",
    "2222345678m667s",
    ["1m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "5s", "6s", "7s", "8s", "9s"],
    "槓子をアンコ＋くっつき牌として見ると７連形のくっつきとなる。",
    ["くっつき"]
  ),
  createQuestion(
    "④-8",
    "1345568m678p hatsuhatsuhatsu",
    ["1m", "2m", "4m", "5m", "7m", "8m"],
    "７枚の部分は孤立牌＋メンツ＋ターツスキップとして見る。完全形ではないのでリャンメンカンチャンは関係なし。",
    ["ヘッドレス1型"]
  ),
  createQuestion(
    "⑤-1",
    "123468m2345p hatsuhatsuhatsu",
    ["1m", "4m", "5m", "7m", "8m", "2p", "5p"],
    "リャンカンのメンツ複合形とノベタンの受け入れに注意。",
    ["ヘッドレス1型"]
  ),
  createQuestion(
    "⑤-2",
    "2245m122345667s",
    ["3m", "6m", "3s", "5s", "8s"],
    "リャンメンカンチャンのメンツ複合形に注意。",
    ["完全形"]
  ),
  createQuestion(
    "⑤-3",
    "1223345678m445p",
    ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "3p", "4p", "5p", "6p", "7p"],
    "１０枚の部分は順子＋７連形と見る。",
    ["くっつき"]
  ),
  createQuestion(
    "⑤-4",
    "123457m1123456p",
    ["1m", "3m", "4m", "6m", "7m", "1p", "4p", "7p"],
    "亜両面のメンツ複合形とターツスキップのメンツ複合系の受け入れに注意。",
    ["ヘッドレス1型"]
  ),
  createQuestion(
    "⑤-5",
    "1223477899phatsuhatsuhatsu",
    ["1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p"],
    "隙間のない連続形の受け入れは左隣から右隣まで。",
    ["ヘッドレス2型"]
  ),
  createQuestion(
    "⑤-6",
    "123m677888p1134s",
    ["5p", "6p", "7p", "8p", "9p", "1s", "2s", "5s"],
    "アンコ含みの6枚形に注意。",
    ["完全形"]
  ),
  createQuestion(
    "⑤-7",
    "123m677888p1123s",
    ["4p", "5p", "6p", "7p", "8p", "9p", "1s", "2s", "3s", "4s"],
    "亜両面のくっつきに注意。６枚の部分はくっつき牌を２通りで捉えられるので注意。",
    ["くっつき"]
  ),
  createQuestion(
    "⑤-8",
    "123m245679p2345s",
    ["2p", "3p", "8p", "9p", "2s", "5s"],
    "離れリャンカンの部分は２通りの孤立牌＋メンツ＋ターツで捉える。",
    ["ヘッドレス1型"]
  ),
  createQuestion(
    "⑥-1",
    "345m3567p114567s",
    ["1p", "2p", "3p", "4p", "5p", "8p", "1s", "2s", "3s", "4s", "5s", "6s", "7s", "8s", "9s"],
    "順子スキップによって増える受け入れと４連形のくっつきに注意。雀頭自身の受け入れも忘れない。",
    ["くっつき"]
  ),
  createQuestion(
    "⑥-2",
    "22234m23p566shatsuhatsuhatsu",
    ["2m", "5m", "1p", "4p", "4s", "6s", "7s"],
    "５枚のえんとつ形の受け入れに注意。",
    ["完全形"]
  ),
  createQuestion(
    "⑥-3",
    "23446m34568p789s",
    ["1m", "4m", "5m", "6m", "3p", "6p", "7p", "8p"],
    "隙間のある連続形は左隣から右隣までとはならないので注意。",
    ["ヘッドレス2型"]
  ),
  createQuestion(
    "⑥-4",
    "345679m456p2345s",
    ["2m", "3m", "5m", "6m", "8m", "9m", "2s", "5s"],
    "ノベタンとターツスキップのメンツ複合系の受け入れに注意。",
    ["ヘッドレス1型"]
  ),
  createQuestion(
    "⑥-5",
    "245667m1134p678s",
    ["3m", "5m", "8m", "2p", "5p"],
    "リャンメンカンチャンの6枚形に注意。リャンカンの発展形なので雀頭は受け入れにならない。",
    ["完全形"]
  ),
  createQuestion(
    "⑥-6",
    "12344566m12234p",
    ["1m", "3m", "4m", "5m", "6m", "7m", "1p", "2p", "3p", "4p", "5p"],
    "隙間のない連続形は左隣から右隣まで。８枚の部分は２通りの「メンツ＋連続形」に分割。",
    ["ヘッドレス2型"]
  ),
  createQuestion(
    "⑥-7",
    "5555m333355567p",
    ["3m", "4m", "6m", "7m", "1p", "2p", "4p", "5p", "8p"],
    "槓子をアンコ＋くっつき牌として見る。",
    ["くっつき"]
  ),
  createQuestion(
    "⑥-8",
    "1234567m114567s",
    ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "1s", "2s", "3s", "4s", "5s", "6s", "7s", "8s", "9s"],
    "７連形のくっつきと４連形のくっつきに注意。雀頭自身の受け入れも忘れない。",
    ["くっつき"]
  ),
  createQuestion(
    "⑦-1",
    "34456778m88s456p",
    ["2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "8s"],
    "８枚の部分を２メンツ＋２枚のくっつき牌として見る。",
    ["くっつき"]
  ),
  createQuestion(
    "⑦-2",
    "34456778m78s456p",
    ["2m", "4m", "5m", "6m", "7m", "9m", "6s", "9s"],
    "８枚ウイング形は２通りの雀頭で見る。",
    ["余剰牌型","ヘッドレス1型"]
  ),
  createQuestion(
    "⑦-3",
    "123457m2344567s",
    ["1m", "3m", "4m", "6m", "7m", "1s", "4s", "7s"],
    "ノベタンと亜両面の複合形とターツスキップのメンツ複合系の受け入れに注意。",
    ["ヘッドレス1型"]
  ),
  createQuestion(
    "⑦-4",
    "123667778m1135s",
    ["5m", "6m", "7m", "8m", "1s", "4s"],
    "アンコ含みの6枚形に注意。",
    ["完全形"]
  ),
  createQuestion(
    "⑦-5",
    "11245667789p34s",
    ["3p", "5p", "8p", "2s", "5s"],
    "１１枚の部分はトイツ＋リャンメンカンチャン＋メンツとして見る。",
    ["完全形"]
  ),
  createQuestion(
    "⑦-6",
    "23445678m23446p",
    ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "1p", "4p", "5p", "6p"],
    "隙間のある連続形は左隣から右隣までとはならないので注意。８枚の部分は２通りの「メンツ＋連続形」に分割。",
    ["ヘッドレス2型"]
  ),
  createQuestion(
    "⑦-7",
    "23346m345p45567s",
    ["3m", "5m", "6m", "3s", "6s"],
    "中ぶくれスキップの３種類の受け入れに注意。",
    ["ヘッドレス1型"]
  ),
  createQuestion(
    "⑦-8",
    "3567999m456788p",
    ["1m", "2m", "3m", "4m", "5m", "8m", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p"],
    "順子スキップによって増える受け入れと４連形のくっつきの受け入れに注意。",
    ["くっつき"]
  )
];
