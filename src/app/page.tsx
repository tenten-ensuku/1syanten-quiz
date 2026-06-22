"use client";

import {
  type ChangeEvent,
  type CSSProperties,
  type PointerEvent,
  useEffect,
  useRef,
  useState
} from "react";
import { MeldView } from "@/components/MeldView";
import { TileButton } from "@/components/TileButton";
import { TileView } from "@/components/TileView";
import { APP_VERSION } from "@/lib/appVersion";
import { playTone, setAudioVolume } from "@/lib/audioTones";
import { HONOR_TILE_IDS, QUIZ_QUESTIONS, ShantenType, TileId } from "@/lib/quizData";
import { createRandomVariant } from "@/lib/quizTransforms";
import {
  type EffortRankingRow,
  type RankRankingRow,
  type RankingCategory,
  type RankingChallengeMode,
  type RankingDifficulty,
  type RankingPeriod,
  fetchEffortRankings,
  fetchRankRankings,
  submitRankingResult
} from "@/lib/rankingApi";

type QuestionStats = {
  attempts: number;
  correct: number;
  totalCorrectMs: number;
};

type StatsByQuestion = Record<string, QuestionStats>;

type ResultRank = "神" | "SS" | "S" | "A" | "B" | "C" | "D" | "E" | "F";
type ShantenCategoryId = "two-meld" | "headless-1" | "headless-2" | "floating";

type SessionWrongQuestion = {
  questionId: string;
  hand: TileId[];
  melds: TileId[][];
  answers: TileId[];
  selectedTiles: TileId[];
  correctCategoryId: ShantenCategoryId;
  selectedCategoryId: ShantenCategoryId | null;
};

type PlaySession = {
  mode: "single" | "timeAttack";
  label?: string;
  recordKey?: ChallengeRecordKey;
  runId: string;
  difficultyMode?: RankingDifficulty;
  challengeMode?: RankingChallengeMode;
  order: number[];
  position: number;
  totalMs: number;
  correctCount: number;
  answeredCount: number;
  wrongQuestions: SessionWrongQuestion[];
};

type ViewMode = "menu" | "quiz" | "timeAttackComplete";
type MenuTab = "challenge" | "review" | "questions" | "analysis" | "ranking" | "settings";
type ReviewMode = "mistakes" | "favorites";
type QuestionListSort = "default" | "weak" | "strong";
type DifficultySelectionKey = "basic" | "advanced" | "both";
type ChallengeModeKey = "random10" | "all";
type ChallengeRecordKey = `${DifficultySelectionKey}:${ChallengeModeKey}`;
type ChallengeRecord = {
  rank: ResultRank;
  score: number;
  correctCount: number;
  questionCount: number;
  totalMs: number;
};
type ChallengeRecords = Partial<Record<ChallengeRecordKey, ChallengeRecord>>;
type AppSettings = {
  nickname: string;
  volume: number;
  slideTouchEnabled: boolean;
};
type TileChoiceGroup = { label: string; tiles: TileId[] };
type TypeFilterOption = {
  id: ShantenCategoryId;
  types: ShantenType[];
  groupLabel: string;
  mainLabel: string;
};

const STATS_STORAGE_KEY = "iishanten-quiz-stats-v1";
const FAVORITES_STORAGE_KEY = "iishanten-quiz-favorites-v1";
const CHALLENGE_RECORDS_STORAGE_KEY = "iishanten-quiz-challenge-records-v1";
const SETTINGS_STORAGE_KEY = "iishanten-quiz-settings-v1";
const DEVICE_ID_STORAGE_KEY = "iishanten-quiz-device-id-v1";
const BACKUP_STORAGE_KEYS = [
  STATS_STORAGE_KEY,
  FAVORITES_STORAGE_KEY,
  CHALLENGE_RECORDS_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  DEVICE_ID_STORAGE_KEY
] as const;
const DEFAULT_SETTINGS: AppSettings = {
  nickname: "",
  volume: 3,
  slideTouchEnabled: true
};
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type ExplanationAsset = {
  src: string;
  alt: string;
};
type ExplanationSegment =
  | { type: "text"; value: string }
  | { type: "tiles"; value: TileId[] };

function isSameTileSet(selectedTiles: TileId[], answers: TileId[]) {
  if (selectedTiles.length !== answers.length) {
    return false;
  }

  const selectedSet = new Set(selectedTiles);
  return answers.every((tileId) => selectedSet.has(tileId));
}

function createShuffledIndexes(indexes: number[], limit = indexes.length) {
  const shuffledIndexes = [...indexes];

  for (let index = shuffledIndexes.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffledIndexes[index], shuffledIndexes[randomIndex]] = [
      shuffledIndexes[randomIndex],
      shuffledIndexes[index]
    ];
  }

  return shuffledIndexes.slice(0, limit);
}

const TILE_GROUPS: TileChoiceGroup[] = [
  { label: "萬子", tiles: ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m"] },
  { label: "筒子", tiles: ["1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p"] },
  { label: "索子", tiles: ["1s", "2s", "3s", "4s", "5s", "6s", "7s", "8s", "9s"] },
  { label: "字牌", tiles: ["ton", "nan", "sha", "pei", "haku", "hatsu", "chun"] }
];

const MENU_TABS: { id: MenuTab; label: string }[] = [
  { id: "challenge", label: "挑戦" },
  { id: "review", label: "復習" },
  { id: "questions", label: "問題一覧" },
  { id: "analysis", label: "自己分析" },
  { id: "ranking", label: "順位" }
];

const TYPE_FILTER_OPTIONS: TypeFilterOption[] = [
  {
    id: "two-meld",
    types: ["余剰牌型", "完全形"],
    groupLabel: "2面子型",
    mainLabel: "余剰牌型・完全形"
  },
  {
    id: "headless-1",
    types: ["ヘッドレス1型"],
    groupLabel: "3面子型",
    mainLabel: "ヘッドレス1型"
  },
  {
    id: "headless-2",
    types: ["ヘッドレス2型"],
    groupLabel: "3面子型",
    mainLabel: "ヘッドレス2型"
  },
  {
    id: "floating",
    types: ["くっつき"],
    groupLabel: "3面子型",
    mainLabel: "くっつき"
  }
];

function getShantenCategoryId(shantenTypes: ShantenType[]): ShantenCategoryId {
  return (
    TYPE_FILTER_OPTIONS.find((option) =>
      option.types.some((type) => shantenTypes.includes(type))
    )?.id ?? "two-meld"
  );
}

function getShantenCategoryLabel(categoryId: ShantenCategoryId) {
  const option = TYPE_FILTER_OPTIONS.find((candidate) => candidate.id === categoryId);
  return option ? `${option.groupLabel} ${option.mainLabel}` : "";
}

function createVisibleTileGroups(hand: TileId[], melds: TileId[][]): TileChoiceGroup[] {
  const visibleTileSet = new Set([...hand, ...melds.flat()]);
  const visibleGroups = TILE_GROUPS.slice(0, 3).filter((group) =>
    group.tiles.some((tileId) => visibleTileSet.has(tileId))
  );
  const visibleHonorTiles = HONOR_TILE_IDS.filter((tileId) => visibleTileSet.has(tileId));

  if (visibleHonorTiles.length > 0) {
    visibleGroups.push({ label: "字牌", tiles: [...visibleHonorTiles] });
  }

  return visibleGroups;
}

function createBlockedTileSet(hand: TileId[], melds: TileId[][]) {
  const counts = new Map<TileId, number>();

  for (const tileId of [...hand, ...melds.flat()]) {
    counts.set(tileId, (counts.get(tileId) ?? 0) + 1);
  }

  return new Set(
    [...counts.entries()]
      .filter(([, count]) => count >= 4)
      .map(([tileId]) => tileId)
  );
}

function loadStats(): StatsByQuestion {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawStats = window.localStorage.getItem(STATS_STORAGE_KEY);
    return rawStats ? (JSON.parse(rawStats) as StatsByQuestion) : {};
  } catch {
    return {};
  }
}

function loadFavorites(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawFavorites = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    return rawFavorites ? (JSON.parse(rawFavorites) as string[]) : [];
  } catch {
    return [];
  }
}

function loadChallengeRecords(): ChallengeRecords {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawRecords = window.localStorage.getItem(CHALLENGE_RECORDS_STORAGE_KEY);
    return rawRecords ? (JSON.parse(rawRecords) as ChallengeRecords) : {};
  } catch {
    return {};
  }
}

function loadSettings(): AppSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}"
    ) as Partial<AppSettings>;
    return {
      nickname: typeof parsed.nickname === "string" ? parsed.nickname.slice(0, 12) : "",
      volume:
        typeof parsed.volume === "number"
          ? Math.max(0, Math.min(3, parsed.volume))
          : DEFAULT_SETTINGS.volume,
      slideTouchEnabled:
        typeof parsed.slideTouchEnabled === "boolean"
          ? parsed.slideTouchEnabled
          : DEFAULT_SETTINGS.slideTouchEnabled
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function sanitizeNickname(value: string) {
  return value.replace(/[<>"'`/\\\u0000-\u001f\u007f]/g, "").slice(0, 12);
}

function getDeviceId() {
  const existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (existing) {
    return existing;
  }
  const id = crypto.randomUUID();
  window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, id);
  return id;
}

function createRunId() {
  return crypto.randomUUID();
}

function difficultyLabel(mode: RankingDifficulty) {
  if (mode === "basic") {
    return "基本";
  }
  if (mode === "advanced") {
    return "難問";
  }
  return "基本＋難問";
}

function getDifficultySelectionKey(
  selectedDifficulties: Set<string>
): DifficultySelectionKey | null {
  const hasBasic = selectedDifficulties.has("基本");
  const hasAdvanced = selectedDifficulties.has("応用");

  if (hasBasic && hasAdvanced) {
    return "both";
  }
  if (hasBasic) {
    return "basic";
  }
  if (hasAdvanced) {
    return "advanced";
  }
  return null;
}

function isBetterChallengeRecord(candidate: ChallengeRecord, current?: ChallengeRecord) {
  if (!current) {
    return true;
  }
  if (candidate.score !== current.score) {
    return candidate.score > current.score;
  }
  if (candidate.correctCount !== current.correctCount) {
    return candidate.correctCount > current.correctCount;
  }
  return candidate.totalMs < current.totalMs;
}

function getStats(stats: StatsByQuestion, questionId: string): QuestionStats {
  return stats[questionId] ?? { attempts: 0, correct: 0, totalCorrectMs: 0 };
}

function formatRate(stat: QuestionStats) {
  if (stat.attempts === 0) {
    return "－";
  }

  return `${Math.round((stat.correct / stat.attempts) * 100)}%`;
}

function formatTime(ms: number) {
  return `${(ms / 1000).toFixed(2)}秒`;
}

function formatAverageCorrectTime(stat: QuestionStats) {
  if (stat.correct === 0) {
    return "－";
  }

  return formatTime(stat.totalCorrectMs / stat.correct);
}

function formatQuestionListTime(stat: QuestionStats) {
  if (stat.correct === 0) {
    return "－";
  }

  return `${(stat.totalCorrectMs / stat.correct / 1000).toFixed(1)}秒`;
}

function getCorrectRate(stat: QuestionStats) {
  return stat.attempts === 0 ? 0 : stat.correct / stat.attempts;
}

function getAverageCorrectMs(stat: QuestionStats) {
  return stat.correct === 0 ? Number.POSITIVE_INFINITY : stat.totalCorrectMs / stat.correct;
}

function formatRatePercent(correctCount: number, questionCount: number) {
  if (questionCount === 0) {
    return "0%";
  }

  return `${Math.round((correctCount / questionCount) * 100)}%`;
}

function calculateScore(
  questionCount: number,
  correctCount: number,
  mistakeCount: number,
  totalMs: number
) {
  const elapsedWholeSeconds = Math.floor(totalMs / 1000);
  const timeBonus = Math.max(0, questionCount * 20 - elapsedWholeSeconds);

  return Math.max(0, correctCount * 10 - mistakeCount * 20 + timeBonus);
}

function rankForResult(questionCount: number, correctCount: number, totalMs: number): ResultRank {
  if (questionCount === 0) {
    return "E";
  }

  const averageSeconds = totalMs / questionCount / 1000;
  const correctRate = correctCount / questionCount;
  const isPerfect = correctCount === questionCount;

  if (isPerfect) {
    if (averageSeconds < 6) {
      return "神";
    }
    if (averageSeconds <= 12) {
      return "SS";
    }
    if (averageSeconds <= 20) {
      return "S";
    }
    return "A";
  }

  if (correctRate >= 0.9) {
    return "B";
  }

  if (correctRate >= 0.7) {
    return "C";
  }

  if (correctRate >= 0.5) {
    return "D";
  }

  if (correctRate >= 0.3) {
    return "E";
  }

  return "F";
}

function rankClassName(rank: ResultRank) {
  switch (rank) {
    case "神":
      return "rankGod";
    case "SS":
      return "rankSS";
    case "S":
      return "rankS";
    case "A":
      return "rankA";
    case "B":
      return "rankB";
    case "C":
      return "rankC";
    case "D":
      return "rankD";
    case "E":
      return "rankE";
    case "F":
      return "rankF";
  }
}

function rankComment(rank: ResultRank) {
  switch (rank) {
    case "神":
      return "基礎講義（一向聴）マスター！このドリルは卒業してください。";
    case "SS":
      return "とても早くて正確です。ドリル卒業してOK。";
    case "S":
      return "早くて正確です。認識速度を更に上げて行きましょう。";
    case "A":
      return "正確です。認識速度を更に上げて行きましょう。";
    case "B":
      return "惜しい。間違えた問題をしっかりと復習しましょう。";
    case "C":
      return "良い感じです。面子を数えて、一向聴の分類ができるようになっています。";
    case "D":
      return "まずは面子を数えて一向聴の分類をすることからはじめましょう。";
    case "E":
      return "基礎講義を要復習。";
    case "F":
      return "まずは基礎講義を受けましょう。";
  }
}

function createExplanationAsset(filename: string, alt: string): ExplanationAsset {
  return {
    src: `${BASE_PATH}/explanation-assets/${filename}`,
    alt
  };
}

function getExplanationAssets(shantenTypes: ShantenType[]): ExplanationAsset[] {
  return shantenTypes.flatMap((shantenType) => {
    switch (shantenType) {
      case "余剰牌型":
        return [createExplanationAsset("01_extra_tile.png", "2面子 余剰牌型の解説図")];
      case "完全形":
        return [createExplanationAsset("02_complete.png", "2面子 完全形の解説図")];
      case "ヘッドレス1型":
        return [createExplanationAsset("03_headless1.png", "3面子 ヘッドレス1型の解説図")];
      case "ヘッドレス2型":
        return [createExplanationAsset("04_headless2.png", "3面子 ヘッドレス2型の解説図")];
      case "くっつき":
        return [createExplanationAsset("05-kuttuki.png", "3面子 くっつき一向聴の解説図")];
    }
  });
}

function parseExplanationSegments(explanation: string): ExplanationSegment[] {
  const segments: ExplanationSegment[] = [];
  const tileNotationPattern = /([1-9]+)([mps])/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tileNotationPattern.exec(explanation)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: explanation.slice(lastIndex, match.index) });
    }

    const [, digits, suit] = match;
    segments.push({
      type: "tiles",
      value: [...digits].map((digit) => `${digit}${suit}` as TileId)
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < explanation.length) {
    segments.push({ type: "text", value: explanation.slice(lastIndex) });
  }

  return segments;
}

function ExplanationText({ explanation }: { explanation: string }) {
  return (
    <p className="explanationText">
      {parseExplanationSegments(explanation).map((segment, index) =>
        segment.type === "text" ? (
          <span key={`text-${index}`}>{segment.value}</span>
        ) : (
          <span className="inlineTileGroup" key={`tiles-${index}`}>
            {segment.value.map((tileId, tileIndex) => (
              <TileView key={`${tileId}-${tileIndex}`} tileId={tileId} compact />
            ))}
          </span>
        )
      )}
    </p>
  );
}

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>("menu");
  const [menuTab, setMenuTab] = useState<MenuTab>("challenge");
  const [reviewMode, setReviewMode] = useState<ReviewMode>("mistakes");
  const [session, setSession] = useState<PlaySession | null>(null);
  const [question, setQuestion] = useState(() => createRandomVariant(QUIZ_QUESTIONS[0]));
  const [selectedTiles, setSelectedTiles] = useState<TileId[]>([]);
  const [selectedShantenCategoryId, setSelectedShantenCategoryId] =
    useState<ShantenCategoryId | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [lastAnswerMs, setLastAnswerMs] = useState(0);
  const [stats, setStats] = useState<StatsByQuestion>({});
  const [hasLoadedStats, setHasLoadedStats] = useState(false);
  const [favoriteQuestionIds, setFavoriteQuestionIds] = useState<string[]>([]);
  const [hasLoadedFavorites, setHasLoadedFavorites] = useState(false);
  const [challengeRecords, setChallengeRecords] = useState<ChallengeRecords>({});
  const [hasLoadedChallengeRecords, setHasLoadedChallengeRecords] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);
  const [backupStatus, setBackupStatus] = useState("");
  const [rankingCategory, setRankingCategory] =
    useState<RankingCategory>("effort");
  const [rankingPeriod, setRankingPeriod] = useState<RankingPeriod>("daily");
  const [effortRankingRows, setEffortRankingRows] = useState<EffortRankingRow[]>([]);
  const [rankRankingRows, setRankRankingRows] = useState<RankRankingRow[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingError, setRankingError] = useState("");
  const [rankingSubmitStatus, setRankingSubmitStatus] = useState("");
  const [submittedRunId, setSubmittedRunId] = useState<string | null>(null);
  const [questionStartedAt, setQuestionStartedAt] = useState<number | null>(null);
  const [selectedTypeFilterIds, setSelectedTypeFilterIds] = useState<string[]>([]);
  const [questionListSort, setQuestionListSort] = useState<QuestionListSort>("default");
  const [selectedDifficulties, setSelectedDifficulties] = useState<Set<string>>(
    () => new Set(["基本", "応用"])
  );
  const isPointerSelectingRef = useRef(false);
  const pointerSelectedTilesRef = useRef(new Set<TileId>());
  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStats(loadStats());
    setHasLoadedStats(true);
    setFavoriteQuestionIds(loadFavorites());
    setHasLoadedFavorites(true);
    setChallengeRecords(loadChallengeRecords());
    setHasLoadedChallengeRecords(true);
    const loadedSettings = loadSettings();
    setSettings(loadedSettings);
    setAudioVolume(loadedSettings.volume);
    setHasLoadedSettings(true);
  }, []);

  useEffect(() => {
    if (hasLoadedStats) {
      window.localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
    }
  }, [hasLoadedStats, stats]);

  useEffect(() => {
    if (hasLoadedFavorites) {
      window.localStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify(favoriteQuestionIds)
      );
    }
  }, [favoriteQuestionIds, hasLoadedFavorites]);

  useEffect(() => {
    if (hasLoadedChallengeRecords) {
      window.localStorage.setItem(
        CHALLENGE_RECORDS_STORAGE_KEY,
        JSON.stringify(challengeRecords)
      );
    }
  }, [challengeRecords, hasLoadedChallengeRecords]);

  useEffect(() => {
    if (hasLoadedSettings) {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      setAudioVolume(settings.volume);
    }
  }, [hasLoadedSettings, settings]);

  useEffect(() => {
    if (menuTab !== "ranking") {
      return;
    }

    let active = true;
    setRankingLoading(true);
    setRankingError("");
    const request =
      rankingCategory === "effort"
        ? fetchEffortRankings(rankingPeriod)
        : fetchRankRankings(rankingPeriod);

    void request
      .then((rows) => {
        if (!active) {
          return;
        }
        if (rankingCategory === "effort") {
          setEffortRankingRows(rows as EffortRankingRow[]);
        } else {
          setRankRankingRows(rows as RankRankingRow[]);
        }
      })
      .catch((error) => {
        if (active) {
          setRankingError(
            error instanceof Error ? error.message : "ランキングを取得できませんでした。"
          );
        }
      })
      .finally(() => {
        if (active) {
          setRankingLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [menuTab, rankingCategory, rankingPeriod]);

  const correctShantenCategoryId = getShantenCategoryId(question.shantenTypes);
  const isTileAnswerCorrect = isSameTileSet(selectedTiles, question.answers);
  const isCorrect = hasSubmitted && isTileAnswerCorrect;
  const explanationAssets = getExplanationAssets(question.shantenTypes);
  const blockedTiles = createBlockedTileSet(question.hand, question.melds);
  const visibleTileGroups = createVisibleTileGroups(question.hand, question.melds);
  const currentBaseIndex = session?.order[session.position] ?? 0;
  const currentProgress =
    session?.mode === "timeAttack"
      ? `${session.position + 1} / ${session.order.length}`
      : `${currentBaseIndex + 1} / ${QUIZ_QUESTIONS.length}`;
  const statValues = Object.values(stats);
  const totalAttempts = statValues.reduce((sum, stat) => sum + stat.attempts, 0);
  const totalCorrect = statValues.reduce((sum, stat) => sum + stat.correct, 0);
  const totalCorrectMs = statValues.reduce((sum, stat) => sum + stat.totalCorrectMs, 0);
  const overallRate = totalAttempts > 0 ? `${Math.round((totalCorrect / totalAttempts) * 100)}%` : "－";
  const overallAverage = totalCorrect > 0 ? formatTime(totalCorrectMs / totalCorrect) : "－";
  const selectedTypeSet = new Set(
    TYPE_FILTER_OPTIONS.filter((option) => selectedTypeFilterIds.includes(option.id)).flatMap(
      (option) => option.types
    )
  );
  const challengeQuestionIndexes = QUIZ_QUESTIONS.map((baseQuestion, index) =>
    selectedDifficulties.has(baseQuestion.difficulty) ? index : -1
  ).filter((index) => index >= 0);
  const typeFilteredQuestionIndexes = QUIZ_QUESTIONS.map((baseQuestion, index) =>
    challengeQuestionIndexes.includes(index) &&
    baseQuestion.shantenTypes.some((type) => selectedTypeSet.has(type))
      ? index
      : -1
  ).filter((index) => index >= 0);
  const typeFilteredQuestionCount = typeFilteredQuestionIndexes.length;
  const difficultySelectionKey = getDifficultySelectionKey(selectedDifficulties);
  const randomRecordKey = difficultySelectionKey
    ? (`${difficultySelectionKey}:random10` as ChallengeRecordKey)
    : null;
  const allRecordKey = difficultySelectionKey
    ? (`${difficultySelectionKey}:all` as ChallengeRecordKey)
    : null;
  const randomRecord = randomRecordKey ? challengeRecords[randomRecordKey] : undefined;
  const allRecord = allRecordKey ? challengeRecords[allRecordKey] : undefined;
  const sortedQuestionEntries = QUIZ_QUESTIONS.map((baseQuestion, index) => ({
    baseQuestion,
    index,
    stat: getStats(stats, baseQuestion.id)
  })).sort((left, right) => {
    if (questionListSort === "default") {
      return left.index - right.index;
    }

    const leftAttempted = left.stat.attempts > 0;
    const rightAttempted = right.stat.attempts > 0;
    if (leftAttempted !== rightAttempted) {
      return leftAttempted ? -1 : 1;
    }
    if (!leftAttempted && !rightAttempted) {
      return left.index - right.index;
    }

    const rateDifference = getCorrectRate(left.stat) - getCorrectRate(right.stat);
    if (rateDifference !== 0) {
      return questionListSort === "weak" ? rateDifference : -rateDifference;
    }

    const leftAverageMs = getAverageCorrectMs(left.stat);
    const rightAverageMs = getAverageCorrectMs(right.stat);
    if (leftAverageMs !== rightAverageMs) {
      return questionListSort === "weak"
        ? rightAverageMs - leftAverageMs
        : leftAverageMs - rightAverageMs;
    }

    if (left.stat.attempts !== right.stat.attempts) {
      return right.stat.attempts - left.stat.attempts;
    }
    return left.index - right.index;
  });
  const reviewQuestionEntries = QUIZ_QUESTIONS.map((baseQuestion, index) => ({
    baseQuestion,
    index,
    stat: getStats(stats, baseQuestion.id)
  })).filter(({ baseQuestion, stat }) =>
    reviewMode === "mistakes"
      ? stat.attempts - stat.correct > 0
      : favoriteQuestionIds.includes(baseQuestion.id)
  );
  const difficultyCounts = {
    基本: QUIZ_QUESTIONS.filter((question) => question.difficulty === "基本").length,
    応用: QUIZ_QUESTIONS.filter((question) => question.difficulty === "応用").length
  };

  const toggleDifficulty = (difficulty: "基本" | "応用") => {
    setSelectedDifficulties((current) => {
      const next = new Set(current);
      if (next.has(difficulty)) {
        if (next.size === 1) {
          return current;
        }
        next.delete(difficulty);
      } else {
        next.add(difficulty);
      }
      return next;
    });
  };

  const toggleFavorite = (questionId: string) => {
    playTone("tap");
    setFavoriteQuestionIds((current) =>
      current.includes(questionId)
        ? current.filter((favoriteId) => favoriteId !== questionId)
        : [...current, questionId]
    );
  };

  const loadQuestion = (baseIndex: number) => {
    setQuestion(createRandomVariant(QUIZ_QUESTIONS[baseIndex]));
    setSelectedTiles([]);
    setSelectedShantenCategoryId(null);
    setHasSubmitted(false);
    setLastAnswerMs(0);
    setQuestionStartedAt(performance.now());
  };

  const startSingleQuestion = (baseIndex: number) => {
    setSession({
      mode: "single",
      label: "問題一覧",
      runId: createRunId(),
      order: [baseIndex],
      position: 0,
      totalMs: 0,
      correctCount: 0,
      answeredCount: 0,
      wrongQuestions: []
    });
    loadQuestion(baseIndex);
    setViewMode("quiz");
  };

  const startQuestionSet = (
    order: number[],
    label: string,
    recordKey?: ChallengeRecordKey,
    challengeMode: RankingChallengeMode = "type_filtered"
  ) => {
    setRankingSubmitStatus("");
    setSubmittedRunId(null);
    setSession({
      mode: "timeAttack",
      label,
      recordKey,
      runId: createRunId(),
      difficultyMode: difficultySelectionKey ?? "both",
      challengeMode,
      order,
      position: 0,
      totalMs: 0,
      correctCount: 0,
      answeredCount: 0,
      wrongQuestions: []
    });
    loadQuestion(order[0] ?? 0);
    setViewMode("quiz");
  };

  const startTimeAttack = () => {
    startQuestionSet(
      createShuffledIndexes(challengeQuestionIndexes, 10),
      "10問ランダム",
      randomRecordKey ?? undefined,
      "random10"
    );
  };

  const startAllQuestions = () => {
    startQuestionSet(
      challengeQuestionIndexes,
      "全問",
      allRecordKey ?? undefined,
      "all"
    );
  };

  const toggleTypeFilter = (filterId: string) => {
    setSelectedTypeFilterIds((current) =>
      current.includes(filterId)
        ? current.filter((selectedFilterId) => selectedFilterId !== filterId)
        : [...current, filterId]
    );
  };

  const startTypeFilteredQuestions = () => {
    if (typeFilteredQuestionCount === 0) {
      return;
    }

    startQuestionSet(
      createShuffledIndexes(typeFilteredQuestionIndexes),
      "タイプ別出題",
      undefined,
      "type_filtered"
    );
  };

  const returnToMenu = () => {
    setViewMode("menu");
    setQuestionStartedAt(null);
    setSession(null);
    setSelectedTiles([]);
    setSelectedShantenCategoryId(null);
    setHasSubmitted(false);
    setRankingSubmitStatus("");
    setSubmittedRunId(null);
  };

  const returnToChallengeMenu = () => {
    setMenuTab("challenge");
    returnToMenu();
  };

  const returnToQuestionList = () => {
    setMenuTab("questions");
    returnToMenu();
  };

  const handleSelect = (tileId: TileId) => {
    if (hasSubmitted || blockedTiles.has(tileId)) {
      return;
    }

    playTone("tap");
    setSelectedTiles((current) =>
      current.includes(tileId)
        ? current.filter((selectedTile) => selectedTile !== tileId)
        : [...current, tileId]
    );
  };

  const pushTileDuringPointerSelect = (tileId: TileId) => {
    if (hasSubmitted || blockedTiles.has(tileId) || pointerSelectedTilesRef.current.has(tileId)) {
      return;
    }

    pointerSelectedTilesRef.current.add(tileId);
    handleSelect(tileId);
  };

  const handlePointerSelectStart = (
    tileId: TileId,
    event: PointerEvent<HTMLButtonElement>
  ) => {
    if (hasSubmitted || event.button !== 0) {
      return;
    }

    event.preventDefault();
    if (!settings.slideTouchEnabled) {
      handleSelect(tileId);
      return;
    }
    isPointerSelectingRef.current = true;
    pointerSelectedTilesRef.current = new Set<TileId>();
    pushTileDuringPointerSelect(tileId);
  };

  const handlePointerSelectMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!settings.slideTouchEnabled || !isPointerSelectingRef.current || hasSubmitted) {
      return;
    }

    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLButtonElement>("[data-tile-id]");
    const tileId = target?.dataset.tileId as TileId | undefined;

    if (tileId) {
      event.preventDefault();
      pushTileDuringPointerSelect(tileId);
    }
  };

  const downloadBackup = () => {
    const data = Object.fromEntries(
      BACKUP_STORAGE_KEYS.flatMap((key) => {
        const value = window.localStorage.getItem(key);
        return value === null ? [] : [[key, value]];
      })
    );
    const payload = JSON.stringify(
      {
        app: "1syanten-quiz",
        version: 1,
        exportedAt: new Date().toISOString(),
        data
      },
      null,
      2
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    anchor.href = url;
    anchor.download = `1syanten-quiz-backup-${stamp}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setBackupStatus("バックアップファイルを保存しました。");
  };

  const restoreBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const parsed = JSON.parse(await file.text()) as {
        data?: Record<string, unknown>;
      };
      const data =
        parsed?.data && typeof parsed.data === "object" ? parsed.data : parsed;
      const allowedKeys = new Set<string>(BACKUP_STORAGE_KEYS);
      const entries = Object.entries(data).filter(
        ([key, value]) => allowedKeys.has(key) && typeof value === "string"
      );
      if (entries.length === 0) {
        throw new Error("復元できるデータが見つかりませんでした。");
      }

      entries.forEach(([key, value]) => window.localStorage.setItem(key, value as string));
      setStats(loadStats());
      setFavoriteQuestionIds(loadFavorites());
      setChallengeRecords(loadChallengeRecords());
      const restoredSettings = loadSettings();
      setSettings(restoredSettings);
      setAudioVolume(restoredSettings.volume);
      setBackupStatus(`${entries.length}項目を復元しました。`);
    } catch (error) {
      setBackupStatus(
        error instanceof Error ? error.message : "復元に失敗しました。"
      );
    } finally {
      if (restoreFileInputRef.current) {
        restoreFileInputRef.current.value = "";
      }
    }
  };

  const handlePointerSelectEnd = () => {
    isPointerSelectingRef.current = false;
    pointerSelectedTilesRef.current = new Set<TileId>();
  };

  const handleSubmit = () => {
    if (hasSubmitted) {
      return;
    }

    const answerMs = questionStartedAt ? performance.now() - questionStartedAt : 0;
    const correct = isSameTileSet(selectedTiles, question.answers);
    playTone(correct ? "ok" : "ng");
    setLastAnswerMs(answerMs);
    setHasSubmitted(true);
    setQuestionStartedAt(null);
    setStats((current) => {
      const previous = getStats(current, question.id);
      return {
        ...current,
        [question.id]: {
          attempts: previous.attempts + 1,
          correct: previous.correct + (correct ? 1 : 0),
          totalCorrectMs: previous.totalCorrectMs + (correct ? answerMs : 0)
        }
      };
    });
    setSession((current) =>
      current?.mode === "timeAttack"
        ? {
            ...current,
            totalMs: current.totalMs + answerMs,
            correctCount: current.correctCount + (correct ? 1 : 0),
            answeredCount: current.answeredCount + 1,
            wrongQuestions: correct
              ? current.wrongQuestions
              : [
                  ...current.wrongQuestions,
                  {
                    questionId: question.id,
                    hand: question.hand,
                    melds: question.melds,
                    answers: question.answers,
                    selectedTiles,
                    correctCategoryId: correctShantenCategoryId,
                    selectedCategoryId: selectedShantenCategoryId
                  }
                ]
          }
        : current
    );
  };

  const handleClear = () => {
    if (!hasSubmitted) {
      playTone("tap");
      setSelectedTiles([]);
      setSelectedShantenCategoryId(null);
    }
  };

  const handleNext = () => {
    if (!session || session.mode === "single") {
      returnToMenu();
      return;
    }

    const nextPosition = session.position + 1;

    if (nextPosition >= session.order.length) {
      if (session.recordKey) {
        const recordKey = session.recordKey;
        const questionCount = session.order.length;
        const mistakeCount = Math.max(0, session.answeredCount - session.correctCount);
        const candidateRecord: ChallengeRecord = {
          rank: rankForResult(questionCount, session.correctCount, session.totalMs),
          score: calculateScore(
            questionCount,
            session.correctCount,
            mistakeCount,
            session.totalMs
          ),
          correctCount: session.correctCount,
          questionCount,
          totalMs: session.totalMs
        };
        setChallengeRecords((current) =>
          isBetterChallengeRecord(candidateRecord, current[recordKey])
            ? { ...current, [recordKey]: candidateRecord }
            : current
        );
      }
      setViewMode("timeAttackComplete");
      setQuestionStartedAt(null);
      return;
    }

    const nextSession = { ...session, position: nextPosition };
    setSession(nextSession);
    loadQuestion(nextSession.order[nextPosition] ?? 0);
  };

  const handleNextSingleQuestion = () => {
    const nextBaseIndex = currentBaseIndex + 1;
    if (nextBaseIndex >= QUIZ_QUESTIONS.length) {
      return;
    }
    startSingleQuestion(nextBaseIndex);
  };

  const retryCompletedSession = () => {
    if (!session) {
      returnToMenu();
      return;
    }

    startQuestionSet(
      createShuffledIndexes(session.order),
      session.label ?? "もう一度",
      session.recordKey,
      session.challengeMode
    );
  };

  const submitCompletedResult = async () => {
    if (!session || session.mode !== "timeAttack" || submittedRunId === session.runId) {
      return;
    }

    const nickname = settings.nickname.trim();
    if (!nickname) {
      setRankingSubmitStatus("設定でニックネームを入力してください。");
      return;
    }

    const questionCount = session.order.length;
    const mistakeCount = Math.max(0, session.answeredCount - session.correctCount);
    const score = calculateScore(
      questionCount,
      session.correctCount,
      mistakeCount,
      session.totalMs
    );
    const rank = rankForResult(questionCount, session.correctCount, session.totalMs);

    setRankingSubmitStatus("送信中...");
    try {
      await submitRankingResult({
        run_id: session.runId,
        player_name: nickname,
        device_id: getDeviceId(),
        difficulty_mode: session.difficultyMode ?? "both",
        challenge_mode: session.challengeMode ?? "type_filtered",
        rank,
        score,
        correct_count: session.correctCount,
        answer_count: questionCount,
        elapsed_seconds: Number((session.totalMs / 1000).toFixed(2)),
        average_seconds: Number((session.totalMs / questionCount / 1000).toFixed(2)),
        client_version: APP_VERSION
      });
      setSubmittedRunId(session.runId);
      setRankingSubmitStatus("ランキングへ送信しました。");
    } catch {
      setRankingSubmitStatus("送信に失敗しました。通信状況を確認してください。");
    }
  };

  const renderQuestionList = () => (
    <section className="menuSection" aria-labelledby="question-list-title">
      <div className="sectionTitleRow">
        <h2 id="question-list-title">問題一覧</h2>
        <span className="questionCount">{QUIZ_QUESTIONS.length}種収録</span>
      </div>
      <div className="questionListSort" aria-label="問題一覧の並び順">
        {(
          [
            ["default", "通常順"],
            ["weak", "苦手順"],
            ["strong", "得意順"]
          ] as const
        ).map(([sortId, label]) => (
          <button
            className={questionListSort === sortId ? "questionListSortButton active" : "questionListSortButton"}
            key={sortId}
            type="button"
            aria-pressed={questionListSort === sortId}
            onClick={() => setQuestionListSort(sortId)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="questionList">
        {sortedQuestionEntries.map(({ baseQuestion, index, stat }) => {
          return (
            <button
              className="questionListItem"
              key={baseQuestion.id}
              type="button"
              onClick={() => startSingleQuestion(index)}
            >
              <span className="problemId">{baseQuestion.id}</span>
              <span
                className="problemTiles"
                aria-label={baseQuestion.source}
                style={{ "--problem-tile-count": baseQuestion.hand.length } as CSSProperties}
              >
                {baseQuestion.hand.map((tileId, tileIndex) => (
                  <TileView
                    key={`${baseQuestion.id}-${tileId}-${tileIndex}`}
                    tileId={tileId}
                    compact
                  />
                ))}
              </span>
              <span className="statPill questionListStats">
                正答率 {formatRate(stat)}（{stat.correct}/{stat.attempts}）　
                {formatQuestionListTime(stat)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );

  const renderReview = () => (
    <section className="menuSection" aria-labelledby="review-title">
      <div className="sectionTitleRow">
        <h2 id="review-title">復習</h2>
        <span className="questionCount">{reviewQuestionEntries.length}問</span>
      </div>
      <div className="reviewModeSelector" aria-label="復習内容を選択">
        <button
          className={reviewMode === "mistakes" ? "reviewModeButton active" : "reviewModeButton"}
          type="button"
          aria-pressed={reviewMode === "mistakes"}
          onClick={() => setReviewMode("mistakes")}
        >
          誤答履歴
        </button>
        <button
          className={reviewMode === "favorites" ? "reviewModeButton active" : "reviewModeButton"}
          type="button"
          aria-pressed={reviewMode === "favorites"}
          onClick={() => setReviewMode("favorites")}
        >
          お気に入り
        </button>
      </div>
      {reviewQuestionEntries.length > 0 ? (
        <div className="questionList">
          {reviewQuestionEntries.map(({ baseQuestion, index, stat }) => (
            <button
              className="questionListItem"
              key={`review-${baseQuestion.id}`}
              type="button"
              onClick={() => startSingleQuestion(index)}
            >
              <span className="problemId">{baseQuestion.id}</span>
              <span
                className="problemTiles"
                aria-label={baseQuestion.source}
                style={{ "--problem-tile-count": baseQuestion.hand.length } as CSSProperties}
              >
                {baseQuestion.hand.map((tileId, tileIndex) => (
                  <TileView
                    key={`review-${baseQuestion.id}-${tileId}-${tileIndex}`}
                    tileId={tileId}
                    compact
                  />
                ))}
              </span>
              <span className="statPill questionListStats">
                正答率 {formatRate(stat)}（{stat.correct}/{stat.attempts}）　
                {formatQuestionListTime(stat)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="reviewEmpty">
          {reviewMode === "mistakes"
            ? "誤答した問題はまだありません。"
            : "お気に入りに追加した問題はまだありません。"}
        </p>
      )}
    </section>
  );

  const renderMenuContent = () => {
    if (menuTab === "review") {
      return renderReview();
    }

    if (menuTab === "questions") {
      return renderQuestionList();
    }

    if (menuTab === "analysis") {
      return (
        <section className="menuSection" aria-labelledby="analysis-title">
          <div className="sectionTitleRow">
            <h2 id="analysis-title">自己分析</h2>
          </div>
          <div className="analysisGrid">
            <div className="analysisCard">
              <span>総回答</span>
              <strong>{totalAttempts}回</strong>
            </div>
            <div className="analysisCard">
              <span>正答率</span>
              <strong>{overallRate}</strong>
            </div>
            <div className="analysisCard">
              <span>平均正解時間</span>
              <strong>{overallAverage}</strong>
            </div>
          </div>
        </section>
      );
    }

    if (menuTab === "settings") {
      return (
        <section className="menuSection settingsSection" aria-labelledby="settings-title">
          <div className="sectionTitleRow">
            <h2 id="settings-title">設定</h2>
          </div>

          <div className="settingsGroup">
            <label className="settingsLabel" htmlFor="nickname">
              ニックネーム
            </label>
            <input
              className="settingsTextInput"
              id="nickname"
              maxLength={12}
              placeholder="ニックネームを入力"
              type="text"
              value={settings.nickname}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  nickname: sanitizeNickname(event.target.value)
                }))
              }
            />
            <p className="settingsHelp">ランキングではこの名前を使用します。</p>
          </div>

          <div className="settingsGroup">
            <div className="settingsLabelRow">
              <span className="settingsLabel">音量</span>
              <strong>{settings.volume}</strong>
            </div>
            <input
              className="volumeSlider"
              aria-label="音量"
              type="range"
              min="0"
              max="3"
              step="1"
              value={settings.volume}
              onChange={(event) => {
                const volume = Number(event.target.value);
                setSettings((current) => ({ ...current, volume }));
                setAudioVolume(volume);
              }}
            />
            <div className="volumeScale" aria-hidden="true">
              <span>0</span>
              <span>1</span>
              <span>2</span>
              <span>3</span>
            </div>
          </div>

          <div className="settingsGroup settingsToggleRow">
            <div>
              <span className="settingsLabel">スライドタッチ</span>
              <p className="settingsHelp">押したまま牌をなぞって選択します。</p>
            </div>
            <button
              className={settings.slideTouchEnabled ? "toggleSwitch active" : "toggleSwitch"}
              type="button"
              role="switch"
              aria-checked={settings.slideTouchEnabled}
              onClick={() => {
                playTone("tap");
                setSettings((current) => ({
                  ...current,
                  slideTouchEnabled: !current.slideTouchEnabled
                }));
              }}
            >
              <span>{settings.slideTouchEnabled ? "ON" : "OFF"}</span>
            </button>
          </div>

          <div className="settingsGroup backupGroup">
            <span className="settingsLabel">データ引継ぎ</span>
            <p className="settingsHelp">
              問題成績・お気に入り・自己記録・設定をファイルでまとめて移せます。
            </p>
            <button className="backupButton primary" type="button" onClick={downloadBackup}>
              バックアップファイルを保存
            </button>
            <input
              ref={restoreFileInputRef}
              id="backup-restore-file"
              className="visuallyHidden"
              type="file"
              accept=".json,.txt,application/json,text/plain"
              onChange={restoreBackup}
            />
            <label className="backupButton" htmlFor="backup-restore-file">
              バックアップファイルから復元
            </label>
            {backupStatus ? (
              <p className="backupStatus" role="status">
                {backupStatus}
              </p>
            ) : null}
          </div>
        </section>
      );
    }

    if (menuTab === "ranking") {
      return (
        <section className="menuSection" aria-labelledby="ranking-title">
          <div className="sectionTitleRow">
            <h2 id="ranking-title">順位</h2>
            <span className="questionCount">上位50名</span>
          </div>

          <div className="rankingCategoryTabs" aria-label="ランキング種目">
            {(
              [
                ["effort", "正答数"],
                ["rank", "到達ランク"]
              ] as const
            ).map(([category, label]) => (
              <button
                className={rankingCategory === category ? "active" : ""}
                key={category}
                type="button"
                onClick={() => setRankingCategory(category)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="rankingPeriodTabs" aria-label="ランキング期間">
            {(
              [
                ["daily", "日別"],
                ["weekly", "週間"],
                ["all", "歴代"]
              ] as const
            ).map(([period, label]) => (
              <button
                className={rankingPeriod === period ? "active" : ""}
                key={period}
                type="button"
                onClick={() => setRankingPeriod(period)}
              >
                {label}
              </button>
            ))}
          </div>

          {rankingCategory === "effort" ? (
            <p className="rankingDescription">
              正答数は実力ではなく、積み重ねた努力の記録です。
            </p>
          ) : (
            <p className="rankingDescription">
              期間内に送信した成績のうち、最高到達ランクを表示します。
            </p>
          )}

          {rankingLoading ? (
            <p className="rankingEmpty">読み込み中...</p>
          ) : rankingError ? (
            <p className="rankingEmpty error">ランキングを取得できませんでした。</p>
          ) : rankingCategory === "effort" ? (
            effortRankingRows.length > 0 ? (
              <div className="rankingList">
                {effortRankingRows.map((row, index) => (
                  <div className="rankingRow" key={`${row.device_id}-${row.player_name}`}>
                    <strong className="rankingPlace">{index + 1}</strong>
                    <div className="rankingPlayer">
                      <strong>{row.player_name}</strong>
                      <span>
                        解答数 {row.answer_count}問　平均
                        {Number(row.average_seconds).toFixed(2)}秒
                      </span>
                    </div>
                    <strong className="rankingEffortValue">{row.correct_count}問</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rankingEmpty">まだ投稿がありません。</p>
            )
          ) : rankRankingRows.length > 0 ? (
            <div className="rankingList">
              {rankRankingRows.map((row, index) => (
                <div className="rankingRow" key={`${row.device_id}-${row.submitted_at}`}>
                  <strong className="rankingPlace">{index + 1}</strong>
                  <div className="rankingPlayer">
                    <strong>{row.player_name}</strong>
                    <span>
                      {Number(row.average_seconds).toFixed(2)}秒　{row.answer_count}問　
                      {difficultyLabel(row.difficulty_mode)}
                    </span>
                  </div>
                  <strong
                    className={`rankingRank ${rankClassName(row.rank as ResultRank)}`}
                  >
                    {row.rank}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="rankingEmpty">まだ投稿がありません。</p>
          )}
        </section>
      );
    }

    return (
      <section className="menuSection" aria-labelledby="challenge-title">
        <div className="sectionTitleRow">
          <h2 id="challenge-title">挑戦</h2>
          <span className="questionCount">全{challengeQuestionIndexes.length}種</span>
        </div>
        <div className="difficultySelector" aria-label="出題難易度を選択">
          {(["基本", "応用"] as const).map((difficulty) => (
            <label className="difficultyOption" key={difficulty}>
              <input
                type="checkbox"
                checked={selectedDifficulties.has(difficulty)}
                onChange={() => toggleDifficulty(difficulty)}
              />
              <span>{difficulty}</span>
              <small>{difficultyCounts[difficulty]}問</small>
            </label>
          ))}
        </div>
        <div className="challengeGrid">
          <button
            className="challengeCard primary"
            type="button"
            onClick={startTimeAttack}
            disabled={challengeQuestionIndexes.length === 0}
          >
            <span className="challengeLabel">10問ランダム</span>
            <span className="challengeMeta">回答中のみ計時</span>
            <span className="challengeRecord">
              <small>自己記録</small>
              {randomRecord ? (
                <>
                  <strong>
                    {randomRecord.rank}　{randomRecord.score}pt
                  </strong>
                  <span>
                    {randomRecord.correctCount}/{randomRecord.questionCount}　平均
                    {formatTime(randomRecord.totalMs / randomRecord.questionCount)}
                  </span>
                </>
              ) : (
                <strong>－</strong>
              )}
            </span>
          </button>
          <button
            className="challengeCard"
            type="button"
            onClick={startAllQuestions}
            disabled={challengeQuestionIndexes.length === 0}
          >
            <span className="challengeLabel">全問</span>
            <span className="challengeMeta">{challengeQuestionIndexes.length}種を通しで挑戦</span>
            <span className="challengeRecord">
              <small>自己記録</small>
              {allRecord ? (
                <>
                  <strong>
                    {allRecord.rank}　{allRecord.score}pt
                  </strong>
                  <span>
                    {allRecord.correctCount}/{allRecord.questionCount}　平均
                    {formatTime(allRecord.totalMs / allRecord.questionCount)}
                  </span>
                </>
              ) : (
                <strong>－</strong>
              )}
            </span>
          </button>
        </div>
        <div className="typeChallengePanel">
          <div className="sectionTitleRow">
            <h3>タイプ別出題</h3>
            <span className="questionCount">
              {selectedTypeFilterIds.length > 0 ? `${typeFilteredQuestionCount}問` : "未選択"}
            </span>
          </div>
          <div className="typeFilterGrid" aria-label="出題タイプを選択">
            {TYPE_FILTER_OPTIONS.map((option) => {
              const isSelected = selectedTypeFilterIds.includes(option.id);
              return (
                <button
                  className={isSelected ? "typeFilterButton active" : "typeFilterButton"}
                  key={option.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleTypeFilter(option.id)}
                >
                  <span className="typeFilterGroup">{option.groupLabel}</span>
                  <span className="typeFilterMain">{option.mainLabel}</span>
                </button>
              );
            })}
          </div>
          <button
            className="typeStartButton"
            type="button"
            onClick={startTypeFilteredQuestions}
            disabled={typeFilteredQuestionCount === 0}
          >
            選択タイプで出題
          </button>
        </div>
      </section>
    );
  };

  const renderMenu = () => (
    <section className="menuFrame" aria-labelledby="app-title">
      <header className="menuTop">
        <div>
          <p className="menuEyebrow">一向聴受け入れ</p>
          <h1 id="app-title">宿題ドリル</h1>
        </div>
        <div className="menuTopActions">
          <span className="versionBadge">{APP_VERSION}</span>
          <button
            className={menuTab === "settings" ? "settingsButton active" : "settingsButton"}
            type="button"
            aria-pressed={menuTab === "settings"}
            onClick={() => {
              playTone("tap");
              setBackupStatus("");
              setMenuTab(menuTab === "settings" ? "challenge" : "settings");
            }}
          >
            <span className="settingsIcon" aria-hidden="true">⚙</span>
            <span>設定</span>
          </button>
        </div>
      </header>

      <nav className="menuTabs" aria-label="メニュー">
        {MENU_TABS.map((tab) => (
          <button
            className={menuTab === tab.id ? "menuTab active" : "menuTab"}
            key={tab.id}
            type="button"
            onClick={() => setMenuTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {renderMenuContent()}
    </section>
  );

  const renderTimeAttackComplete = () => {
    const questionCount = session?.order.length ?? 0;
    const correctCount = session?.correctCount ?? 0;
    const answeredCount = session?.answeredCount ?? questionCount;
    const mistakeCount = Math.max(0, answeredCount - correctCount);
    const totalMs = session?.totalMs ?? 0;
    const averageMs = questionCount > 0 ? totalMs / questionCount : 0;
    const score = calculateScore(questionCount, correctCount, mistakeCount, totalMs);
    const rank = rankForResult(questionCount, correctCount, totalMs);
    const wrongQuestions = session?.wrongQuestions ?? [];

    return (
      <section className="panel completionPanel recordPanel" aria-labelledby="completion-title">
        <div className="resultHeader">
          <div>
            <p className="menuEyebrow">RESULT</p>
            <h2 id="completion-title">成績発表</h2>
          </div>
          <span className="resultModePill">{session?.label ?? "挑戦"}</span>
        </div>

        <div className="scoreCard" aria-label={`ランク ${rank}、${score}点`}>
          <div className="rankDisplay">
            {rank === "神" ? (
              <img
                className="godRankImage"
                src={`${BASE_PATH}/god-rank.png`}
                alt="神"
              />
            ) : (
              <span className={`rankBadgeResult ${rankClassName(rank)}`}>{rank}</span>
            )}
            <strong className="scoreNumber">
              {score}
              <small>pt</small>
            </strong>
          </div>
          <p className="rankComment">{rankComment(rank)}</p>
        </div>

        <div className="resultStatsGrid" aria-label="採点内訳">
          <div className="resultStatCard">
            <span>正解</span>
            <strong>
              {correctCount} / {questionCount}
            </strong>
          </div>
          <div className="resultStatCard">
            <span>ミス</span>
            <strong>{mistakeCount}</strong>
          </div>
          <div className="resultStatCard">
            <span>正答率</span>
            <strong>{formatRatePercent(correctCount, questionCount)}</strong>
          </div>
          <div className="resultStatCard">
            <span>回答時間</span>
            <strong>{formatTime(totalMs)}</strong>
          </div>
          <div className="resultStatCard">
            <span>1問平均</span>
            <strong>{formatTime(averageMs)}</strong>
          </div>
        </div>

        <div className="rankingSubmitCard">
          <div>
            <strong>ランキングへ送信</strong>
            <p>
              {settings.nickname.trim()
                ? `${settings.nickname}として、正答数と到達ランクを送信します。`
                : "設定でニックネームを入力すると送信できます。"}
            </p>
          </div>
          <button
            type="button"
            onClick={submitCompletedResult}
            disabled={
              !settings.nickname.trim() ||
              rankingSubmitStatus === "送信中..." ||
              submittedRunId === session?.runId
            }
          >
            {submittedRunId === session?.runId ? "送信済み" : "成績を送信"}
          </button>
          {rankingSubmitStatus ? (
            <p className="rankingSubmitStatus" role="status">
              {rankingSubmitStatus}
            </p>
          ) : null}
        </div>

        {wrongQuestions.length > 0 ? (
          <section className="wrongQuestionBlock" aria-labelledby="wrong-question-title">
            <div className="sectionTitleRow">
              <h3 id="wrong-question-title">誤答問題</h3>
              <span className="questionCount">{wrongQuestions.length}問</span>
            </div>
            <div className="wrongQuestionList">
              {wrongQuestions.map((item, index) => {
                const totalTileCount = item.hand.length + item.melds.flat().length;

                return (
                  <div className="wrongQuestionItem" key={`${item.questionId}-${index}`}>
                    <div className="wrongQuestionTitle">
                      <strong>問題 {item.questionId}</strong>
                      <button
                        className={
                          favoriteQuestionIds.includes(item.questionId)
                            ? "favoriteButton active"
                            : "favoriteButton"
                        }
                        type="button"
                        aria-pressed={favoriteQuestionIds.includes(item.questionId)}
                        aria-label={
                          favoriteQuestionIds.includes(item.questionId)
                            ? `問題 ${item.questionId}をお気に入りから外す`
                            : `問題 ${item.questionId}をお気に入りに追加`
                        }
                        title={
                          favoriteQuestionIds.includes(item.questionId)
                            ? "お気に入りから外す"
                            : "お気に入りに追加"
                        }
                        onClick={() => toggleFavorite(item.questionId)}
                      >
                        {favoriteQuestionIds.includes(item.questionId) ? "★" : "☆"}
                      </button>
                    </div>
                    <div
                      className="wrongQuestionTiles"
                      aria-label="誤答した問題の牌姿"
                      style={{ "--wrong-tile-count": totalTileCount } as CSSProperties}
                    >
                      {item.hand.map((tileId, tileIndex) => (
                        <TileView
                          key={`wrong-hand-${item.questionId}-${tileId}-${tileIndex}`}
                          tileId={tileId}
                          compact
                        />
                      ))}
                      {item.melds.map((meld, meldIndex) => (
                        <span className="wrongMeld" key={`wrong-meld-${item.questionId}-${meldIndex}`}>
                          {meld.map((tileId, tileIndex) => (
                            <TileView
                              key={`wrong-meld-${item.questionId}-${meldIndex}-${tileId}-${tileIndex}`}
                              tileId={tileId}
                              compact
                            />
                          ))}
                        </span>
                      ))}
                    </div>
                    <div className="wrongAnswerRows">
                      <span>型</span>
                      <span className="wrongCategoryText">
                        正解: {getShantenCategoryLabel(item.correctCategoryId)}
                        <br />
                        選択:{" "}
                        {item.selectedCategoryId
                          ? getShantenCategoryLabel(item.selectedCategoryId)
                          : "未選択"}
                      </span>
                      <span>正解</span>
                      <span className="wrongAnswerTiles">
                        {item.answers.map((tileId) => (
                          <TileView key={`wrong-answer-${item.questionId}-${tileId}`} tileId={tileId} compact />
                        ))}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <p className="perfectRunText">全問正解。これは気持ちいいです。</p>
        )}

        <div className="completionActions">
          <button className="clearButton" type="button" onClick={returnToMenu}>
            メニューへ
          </button>
          <button className="nextButton" type="button" onClick={retryCompletedSession}>
            もう一度
          </button>
        </div>
      </section>
    );
  };

  const renderQuiz = () => (
    <>
      <section className="panel questionPanel" aria-labelledby="question-title">
        <div className="sectionTitleRow">
          <h2 id="question-title">問題 {question.id}</h2>
          <span className="questionCount">{currentProgress}</span>
        </div>

        <div className="handArea" aria-label="問題の牌姿">
          <div
            className="closedTiles"
            aria-label="手牌"
            style={{ "--hand-tile-count": question.hand.length } as CSSProperties}
          >
            {question.hand.map((tileId, index) => (
              <TileView key={`${question.id}-${tileId}-${index}`} tileId={tileId} />
            ))}
          </div>

          {question.melds.length > 0 && (
            <div className="meldArea" aria-label="副露">
              {question.melds.map((meld, index) => (
                <MeldView key={`${question.id}-meld-${index}`} tiles={meld} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section
        className={hasSubmitted ? "panel choicesPanel submitted" : "panel choicesPanel"}
        aria-label="一向聴タイプと受け入れ牌を回答"
      >
        <div className="shantenAnswerBlock">
          <h2>① 一向聴タイプを選択（任意）</h2>
          <div className="shantenCategoryGrid" aria-label="一向聴タイプ">
            {TYPE_FILTER_OPTIONS.map((option) => {
              const isSelected = selectedShantenCategoryId === option.id;
              const isAnswer = correctShantenCategoryId === option.id;
              const classNames = [
                "shantenCategoryButton",
                isSelected ? "selected" : "",
                hasSubmitted && isAnswer ? "answer" : "",
                hasSubmitted && isSelected && !isAnswer ? "incorrect" : ""
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <button
                  className={classNames}
                  key={`answer-category-${option.id}`}
                  type="button"
                  aria-pressed={isSelected}
                  disabled={hasSubmitted}
                  onClick={() => {
                    playTone("tap");
                    setSelectedShantenCategoryId(option.id);
                  }}
                >
                  <span className="shantenCategoryGroup">{option.groupLabel}</span>
                  <span className="shantenCategoryMain">{option.mainLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="tileAnswerBlock">
          <h2>② 受け入れ牌を選択</h2>
          <div
            className="choiceRows"
            onPointerMove={handlePointerSelectMove}
            onPointerUp={handlePointerSelectEnd}
            onPointerCancel={handlePointerSelectEnd}
            onPointerLeave={handlePointerSelectEnd}
          >
            {visibleTileGroups.map((group) => (
              <div
                className="choiceRow"
                key={group.label}
                aria-label={group.label}
                style={{ "--choice-tile-count": group.tiles.length } as CSSProperties}
              >
                {group.tiles.map((tileId) => (
                  <TileButton
                    key={tileId}
                    tileId={tileId}
                    isSelected={selectedTiles.includes(tileId)}
                    isAnswer={hasSubmitted && question.answers.includes(tileId)}
                    isBlocked={blockedTiles.has(tileId)}
                    isDisabled={hasSubmitted || blockedTiles.has(tileId)}
                    onSelect={handleSelect}
                    onPointerSelectStart={handlePointerSelectStart}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {hasSubmitted ? (
          <div className="answerStatusInline" aria-live="polite">
            <div className={isCorrect ? "resultBadge correct" : "resultBadge incorrect"}>
              {isCorrect ? "正解！" : "不正解"}
            </div>
            <p className="answerTime">回答時間 {formatTime(lastAnswerMs)}</p>
          </div>
        ) : (
          <div className="choiceActions">
            <button className="submitButton" type="button" onClick={handleSubmit}>
              解答する
            </button>
            <button
              className="clearButton"
              type="button"
              onClick={handleClear}
              disabled={selectedTiles.length === 0 && !selectedShantenCategoryId}
            >
              クリア
            </button>
            <button
              className="menuActionButton"
              type="button"
              onClick={returnToChallengeMenu}
            >
              メニューへ
            </button>
          </div>
        )}
      </section>

      {hasSubmitted && (
        <section className="panel explanationPanel">
          <div className="explanationBlock">
            <h2>解説</h2>
            <div
              className="explanationHandTiles"
              aria-label="問題の牌姿"
              style={{ "--hand-tile-count": question.hand.length } as CSSProperties}
            >
              {question.hand.map((tileId, index) => (
                <TileView key={`explanation-hand-${question.id}-${tileId}-${index}`} tileId={tileId} />
              ))}
            </div>
            {explanationAssets.map((explanationAsset) => (
              <div className="explanationImageFrame" key={explanationAsset.src}>
                <img
                  className="explanationImage"
                  src={explanationAsset.src}
                  alt={explanationAsset.alt}
                />
              </div>
            ))}
            <ExplanationText explanation={question.explanation} />
          </div>

          <div className="resultNavigation">
            {session?.mode === "timeAttack" ? (
              <button className="nextButton" type="button" onClick={handleNext}>
                {session.position + 1 >= session.order.length ? "結果を見る" : "次の問題"}
              </button>
            ) : (
              <>
                <button
                  className="nextButton"
                  type="button"
                  onClick={handleNextSingleQuestion}
                  disabled={currentBaseIndex + 1 >= QUIZ_QUESTIONS.length}
                >
                  次の問題へ
                </button>
                <button className="listReturnButton" type="button" onClick={returnToQuestionList}>
                  問題一覧へ
                </button>
              </>
            )}
            <button className="listReturnButton" type="button" onClick={returnToChallengeMenu}>
              メニューへ
            </button>
          </div>
        </section>
      )}
    </>
  );

  return (
    <main className={viewMode === "quiz" ? "appShell quizMode" : "appShell"}>
      {viewMode === "menu" && renderMenu()}
      {viewMode === "quiz" && renderQuiz()}
      {viewMode === "timeAttackComplete" && renderTimeAttackComplete()}
    </main>
  );
}
