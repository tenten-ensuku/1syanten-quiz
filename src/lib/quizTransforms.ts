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
const FULL_WIDTH_DIGIT_MAP: Record<string, string> = {
  "１": "1",
  "２": "2",
  "３": "3",
  "４": "4",
  "５": "5",
  "６": "6",
  "７": "7",
  "８": "8",
  "９": "9"
};
const FULL_WIDTH_SUIT_MAP: Record<string, Suit> = {
  m: "m",
  p: "p",
  s: "s",
  "ｍ": "m",
  "ｐ": "p",
  "ｓ": "s"
};

export function compareTileIds(left: TileId, right: TileId) {
  return (TILE_SORT_ORDER.get(left) ?? 0) - (TILE_SORT_ORDER.get(right) ?? 0);
}

export function sortTilesByDisplayOrder(tileIds: TileId[]) {
  return [...tileIds].sort(compareTileIds);
}

function createSuitedTileNotation(tileIds: TileId[]) {
  const suitedTiles = tileIds
    .map((tileId) => tileId.match(/^([1-9])([mps])$/))
    .filter((match): match is RegExpMatchArray => Boolean(match));

  if (suitedTiles.length === 0) {
    return "";
  }

  const suit = suitedTiles[0][2];
  return `${suitedTiles.map((match) => match[1]).join("")}${suit}`;
}

function normalizeDigits(digits: string) {
  return [...digits].map((digit) => FULL_WIDTH_DIGIT_MAP[digit] ?? digit).join("");
}

function normalizeSinglePlusRangeExpression(explanation: string) {
  return explanation.replace(
    /([1-9])([mps])\+([1-9])\2～([1-9])\2/g,
    (_match, rawSingle: string, suit: Suit, rawRangeStart: string, rawRangeEnd: string) => {
      const single = Number(rawSingle);
      const rangeStart = Number(rawRangeStart);
      const rangeEnd = Number(rawRangeEnd);
      const low = Math.min(rangeStart, rangeEnd);
      const high = Math.max(rangeStart, rangeEnd);
      const range = `${low}${suit}～${high}${suit}`;
      const singleTile = `${single}${suit}`;

      return single < low ? `${singleTile}+${range}` : `${range}+${singleTile}`;
    }
  );
}

function normalizeReversedDecompositionExpression(explanation: string) {
  return explanation.replace(
    /([1-9]+)([mps])\+([1-9]+)\2\+([1-9]+)\2/g,
    (_match, firstDigits: string, suit: Suit, secondDigits: string, thirdDigits: string) => {
      const parts = [firstDigits, secondDigits, thirdDigits].sort((left, right) => {
        if (right.length !== left.length) {
          return right.length - left.length;
        }

        return Number(left) - Number(right);
      });

      return parts.map((digits) => `${digits}${suit}`).join("+");
    }
  );
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

function transformExplanation(
  explanation: string,
  suitMap: SuitMap,
  shouldReverseNumbers: boolean
) {
  const transformed = explanation.replace(/([1-9１-９]+)([mpsｍｐｓ])/g, (_match, rawDigits: string, rawSuit: string) => {
    const suit = FULL_WIDTH_SUIT_MAP[rawSuit];
    const transformedTiles = sortTilesByDisplayOrder(
      [...normalizeDigits(rawDigits)].map((digit) =>
        transformTile(`${digit}${suit}` as TileId, suitMap, shouldReverseNumbers)
      )
    );

    return createSuitedTileNotation(transformedTiles);
  });

  const normalizedExpression = shouldReverseNumbers
    ? normalizeReversedDecompositionExpression(transformed)
    : transformed;

  return normalizeSinglePlusRangeExpression(normalizedExpression);
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
    explanation: transformExplanation(question.explanation, suitMap, shouldReverseNumbers),
    variantInfo: {
      suitMap,
      shouldReverseNumbers
    }
  };
}

export function createRandomVariant(question: QuizQuestion): QuizQuestionVariant {
  return transformQuestion(question, randomItem(SUIT_PERMUTATIONS), Math.random() < 0.5);
}
