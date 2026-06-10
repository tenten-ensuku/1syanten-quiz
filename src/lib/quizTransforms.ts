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

const TILE_SORT_ORDER = new Map<TileId, number>(
  ALL_TILE_IDS.map((tileId, index) => [tileId, index])
);

export function compareTileIds(left: TileId, right: TileId) {
  return (TILE_SORT_ORDER.get(left) ?? 0) - (TILE_SORT_ORDER.get(right) ?? 0);
}

export function sortTilesByDisplayOrder(tileIds: TileId[]) {
  return [...tileIds].sort(compareTileIds);
}

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
  const hand = sortTilesByDisplayOrder(
    question.hand.map((tileId) => transformTile(tileId, suitMap, shouldReverseNumbers))
  );
  const melds = question.melds
    .map((meld) =>
      sortTilesByDisplayOrder(
        meld.map((tileId) => transformTile(tileId, suitMap, shouldReverseNumbers))
      )
    )
    .sort((left, right) => compareTileIds(left[0] ?? "1m", right[0] ?? "1m"));
  const answers = sortTilesByDisplayOrder(
    question.answers.map((tileId) => transformTile(tileId, suitMap, shouldReverseNumbers))
  );

  return {
    ...question,
    hand,
    melds,
    answers,
    variantInfo: {
      suitMap,
      shouldReverseNumbers
    }
  };
}

export function createRandomVariant(question: QuizQuestion): QuizQuestionVariant {
  return transformQuestion(question, randomItem(SUIT_PERMUTATIONS), Math.random() < 0.5);
}
