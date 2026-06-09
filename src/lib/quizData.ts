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

export type QuizQuestion = {
  id: number;
  hand: TileId[];
  melds: TileId[][];
  answers: TileId[];
  explanation: string;
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
    ""
  ),
  createQuestion(
    2,
    "22344m678p34578s",
    ["1m", "2m", "3m", "4m", "5m", "6s", "7s", "8s", "9s"],
    ""
  ),
  createQuestion(
    3,
    "22344m678p34556s",
    ["1m", "2m", "3m", "4m", "5m", "2s", "3s", "4s", "5s", "6s", "7s"],
    ""
  ),
  createQuestion(
    4,
    "2234m6788p34556s",
    ["2m", "5m", "5p", "8p", "4s", "7s"],
    ""
  ),
  createQuestion(
    5,
    "2234m679p345567s",
    ["2m", "5m", "5p", "6p", "8p", "9p"],
    ""
  ),
  createQuestion(
    6,
    "11223m678p12234s",
    ["1m", "2m", "3m", "4m", "1s", "2s", "3s", "4s", "5s"],
    ""
  ),
  createQuestion(
    7,
    "1234567m678p246s",
    ["1m", "4m", "7m", "2s", "3s", "5s", "6s"],
    ""
  ),
  createQuestion(
    8,
    "12345678m34557p",
    ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "2p", "5p", "6p", "7p"],
    ""
  ),
  createQuestion(
    10,
    "12344556m44566p",
    ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "3p", "4p", "5p", "6p", "7p"],
    ""
  ),
  createQuestion(
    11,
    "12346789m23467p",
    ["1m", "4m", "5m", "6m", "9m", "5p", "6p", "7p", "8p"],
    ""
  ),
  createQuestion(
    12,
    "1234m134678p456s",
    ["1m", "4m", "1p", "2p", "4p", "5p"],
    ""
  ),
  createQuestion(
    13,
    "1123m235678p456s",
    ["1m", "4m", "1p", "2p", "4p", "5p", "8p"],
    ""
  ),
  createQuestion(
    14,
    "12356m11344568p",
    ["4m", "7m", "2p", "5p", "7p"],
    ""
  ),
  createQuestion(
    15,
    "123m455666p5578s",
    ["3p", "4p", "5p", "6p", "7p", "5s", "6s", "9s"],
    ""
  ),
  createQuestion(
    16,
    "23456m67889p234s",
    ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "5p", "6p", "7p", "8p", "9p"],
    ""
  ),
  createQuestion(
    17,
    "11345m3457p1345s",
    ["1m", "2p", "5p", "6p", "7p", "8p", "9p", "1s", "2s", "3s", "6s"],
    ""
  ),
  createQuestion(
    19,
    "3457888m88p6789s",
    ["2m", "5m", "6m", "7m", "8m", "9m", "8p", "4s", "5s", "6s", "7s", "8s", "9s"],
    ""
  ),
  createQuestion(
    20,
    "99m5678p5677889s",
    ["9m", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "3s", "4s", "5s", "6s", "7s", "8s", "9s"],
    ""
  ),
  createQuestion(
    21,
    "1234456m245789p",
    ["1m", "4m", "7m", "2p", "3p", "5p", "6p"],
    ""
  ),
  createQuestion(
    22,
    "1234567m245678p",
    ["1m", "4m", "7m", "2p", "3p", "5p", "6p", "8p", "9p"],
    ""
  ),
  createQuestion(
    23,
    "445555m3334p888s",
    ["3m", "4m", "6m", "7m", "2p", "3p", "4p", "5p", "6p"],
    ""
  ),
  createQuestion(
    24,
    "12234m23344678p",
    ["1m", "2m", "3m", "4m", "5m", "1p", "2p", "3p", "4p", "5p"],
    ""
  ),
  createQuestion(
    25,
    "13455688m45567p",
    ["2m", "4m", "7m", "3p", "6p"],
    ""
  ),
  createQuestion(
    26,
    "223457m45678p22s",
    ["2m", "6m", "3p", "6p", "9p", "2s"],
    ""
  ),
  createQuestion(
    28,
    "4456688m34568p5s",
    ["5m", "7p"],
    ""
  ),
  createQuestion(
    29,
    "44566m34568p 888m",
    ["3m", "4m", "5m", "6m", "7m", "3p", "6p", "7p", "8p"],
    ""
  ),
  createQuestion(
    30,
    "12334567m22344p",
    ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "1p", "2p", "3p", "4p", "5p"],
    ""
  ),
  createQuestion(
    31,
    "134567m1234456p",
    ["1m", "2m", "4m", "5m", "7m", "8m", "1p", "4p", "7p"],
    ""
  ),
  createQuestion(
    32,
    "222344m78s44567p",
    ["2m", "3m", "4m", "5m", "4p", "6s", "9s"],
    ""
  ),
  createQuestion(
    33,
    "2245m245667789s",
    ["3m", "6m", "3s", "5s", "8s"],
    ""
  ),
  createQuestion(
    34,
    "2222345678m667s",
    ["1m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "5s", "6s", "7s", "8s", "9s"],
    ""
  ),
  createQuestion(
    35,
    "1345568m678p hatsuhatsuhatsu",
    ["1m", "2m", "4m", "5m", "7m", "8m"],
    ""
  ),
  createQuestion(
    37,
    "123468m2345p hatsuhatsuhatsu",
    ["1m", "4m", "5m", "7m", "8m", "2p", "5p"],
    ""
  ),
  createQuestion(
    38,
    "2245m122345667s",
    ["3m", "6m", "3s", "5s", "8s"],
    ""
  ),
  createQuestion(
    39,
    "1223345678m445p",
    ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "3p", "4p", "5p", "6p", "7p"],
    ""
  ),
  createQuestion(
    40,
    "123457m1123456p",
    ["1m", "3m", "4m", "6m", "7m", "1p", "4p", "7p"],
    ""
  ),
  createQuestion(
    41,
    "1223477899phatsuhatsuhatsu",
    ["1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p"],
    ""
  ),
  createQuestion(
    42,
    "123m677888p1134s",
    ["5p", "6p", "7p", "8p", "9p", "1s", "2s", "5s"],
    ""
  ),
  createQuestion(
    43,
    "123m677888p1123s",
    ["4p", "5p", "6p", "7p", "8p", "9p", "1s", "2s", "3s", "4s"],
    ""
  ),
  createQuestion(
    44,
    "123m245679p2345s",
    ["2p", "3p", "8p", "9p", "2s", "5s"],
    ""
  ),
  createQuestion(
    46,
    "345m3567p114567s",
    ["1p", "2p", "3p", "4p", "5p", "8p", "1s", "2s", "3s", "4s", "5s", "6s", "7s", "8s", "9s"],
    ""
  ),
  createQuestion(
    47,
    "22234m23p566shatsuhatsuhatsu",
    ["2m", "5m", "1p", "4p", "4s", "6s", "7s"],
    ""
  ),
  createQuestion(
    48,
    "23446m34568p789s",
    ["1m", "4m", "5m", "6m", "3p", "6p", "7p", "8p"],
    ""
  ),
  createQuestion(
    49,
    "345679m456p2345s",
    ["2m", "3m", "5m", "6m", "8m", "9m", "2s", "5s"],
    ""
  ),
  createQuestion(
    50,
    "245667m1134p678s",
    ["3m", "5m", "8m", "2p", "5p"],
    ""
  ),
  createQuestion(
    51,
    "12344566m12234p",
    ["1m", "3m", "4m", "5m", "6m", "7m", "1p", "2p", "3p", "4p", "5p"],
    ""
  ),
  createQuestion(
    52,
    "5555m333355567p",
    ["3m", "4m", "6m", "7m", "1p", "2p", "4p", "5p", "8p"],
    ""
  ),
  createQuestion(
    53,
    "1234567m114567s",
    ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "1s", "2s", "3s", "4s", "5s", "6s", "7s", "8s", "9s"],
    ""
  ),
  createQuestion(
    55,
    "34456778m88s456p",
    ["2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "8s"],
    ""
  ),
  createQuestion(
    56,
    "34456778m78s456p",
    ["2m", "4m", "5m", "6m", "7m", "9m", "6s", "9s"],
    ""
  ),
  createQuestion(
    57,
    "123457m2344567s",
    ["1m", "3m", "4m", "6m", "7m", "1s", "4s", "7s"],
    ""
  ),
  createQuestion(
    58,
    "123667778m1135s",
    ["5m", "6m", "7m", "8m", "1s", "4s"],
    ""
  ),
  createQuestion(
    59,
    "11245667789p34s",
    ["3p", "5p", "8p", "2s", "5s"],
    ""
  ),
  createQuestion(
    60,
    "23445678m23446p",
    ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "1p", "4p", "5p", "6p"],
    ""
  ),
  createQuestion(
    61,
    "23346m345p45567s",
    ["3m", "5m", "6m", "3s", "6s"],
    ""
  ),
  createQuestion(
    62,
    "3567999m456788p",
    ["1m", "2m", "3m", "4m", "5m", "8m", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p"],
    ""
  )
];
