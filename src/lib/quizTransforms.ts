import { ALL_TILE_IDS, QuizQuestion, TileId } from "./quizData";

type Suit = "m" | "p" | "s";
type SuitMap = Record<Suit, Suit>;

export type QuestionVariantInfo = {
  suitMap: SuitMap;
  shouldReverseNumbers: boolean;
};

export type QuizQuestionVariant = QuizQuestion & {
  variantInfo: QuestionVariantInfo;
};

const SUIT_PERMUTATIONS: SuitMap[] = [
  { m: "m", p: "p", s: "s" },
  { m: "m", p: "s", s: "p" },
  { m: "p", p: "m", s: "s" },
  { m: "p", p: "s", s: "m" },
  { m: "s", p: "m", s: "p" },
  { m: "s", p: "p", s: "m" }
];

const REVERSED_NUMBER_MAP: Record<string, string> = {
  "1": "9",
  "2": "8",
  "3": "7",
  "4": "6",
  "5": "5",
  "6": "4",
  "7": "3",
  "8": "2",
  "9": "1"
};

const GENERIC_EXPLANATION =
  "\u6b63\u89e3\u724c\u3092\u52a0\u3048\u308b\u3053\u3068\u3067\u3001\u672a\u5b8c\u6210\u30d6\u30ed\u30c3\u30af\u304c\u5b8c\u6210\u30fb\u5f37\u5316\u3055\u308c\u3001\u30c6\u30f3\u30d1\u30a4\u306b\u9032\u3080\u724c\u59ff\u306b\u306a\u308a\u307e\u3059\u3002\u6b63\u89e3\u724c\u4e00\u89a7\u3092\u898b\u306a\u304c\u3089\u3001\u3069\u306e\u30d6\u30ed\u30c3\u30af\u304c\u5b8c\u6210\u30fb\u5f37\u5316\u3055\u308c\u308b\u304b\u78ba\u8a8d\u3057\u307e\u3057\u3087\u3046\u3002";

function isTileId(value: string): value is TileId {
  return ALL_TILE_IDS.includes(value as TileId);
}

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function transformTile(
  tileId: TileId,
  suitMap: SuitMap,
  shouldReverseNumbers: boolean
): TileId {
  const match = tileId.match(/^([1-9])([mps])$/);

  if (!match) {
    return tileId;
  }

  const [, number, suit] = match;
  const transformedNumber = shouldReverseNumbers ? REVERSED_NUMBER_MAP[number] : number;
  const transformedSuit = suitMap[suit as Suit];
  const transformedTile = `${transformedNumber}${transformedSuit}`;

  if (!isTileId(transformedTile)) {
    throw new Error(`Invalid transformed tile: ${transformedTile}`);
  }

  return transformedTile;
}

export function transformQuestion(
  question: QuizQuestion,
  suitMap: SuitMap,
  shouldReverseNumbers: boolean
): QuizQuestionVariant {
  return {
    ...question,
    hand: question.hand.map((tileId) => transformTile(tileId, suitMap, shouldReverseNumbers)),
    melds: question.melds.map((meld) =>
      meld.map((tileId) => transformTile(tileId, suitMap, shouldReverseNumbers))
    ),
    answers: question.answers.map((tileId) => transformTile(tileId, suitMap, shouldReverseNumbers)),
    explanation: GENERIC_EXPLANATION,
    variantInfo: {
      suitMap,
      shouldReverseNumbers
    }
  };
}

export function createRandomVariant(question: QuizQuestion): QuizQuestionVariant {
  return transformQuestion(question, randomItem(SUIT_PERMUTATIONS), Math.random() < 0.5);
}
