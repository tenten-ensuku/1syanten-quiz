"use client";

import {
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
import { HONOR_TILE_IDS, QUIZ_QUESTIONS, ShantenType, TileId } from "@/lib/quizData";
import { createRandomVariant } from "@/lib/quizTransforms";

type QuestionStats = {
  attempts: number;
  correct: number;
  totalCorrectMs: number;
};

type StatsByQuestion = Record<string, QuestionStats>;

type PlaySession = {
  mode: "single" | "timeAttack";
  label?: string;
  order: number[];
  position: number;
  totalMs: number;
  correctCount: number;
  answeredCount: number;
};

type ViewMode = "menu" | "quiz" | "timeAttackComplete";
type MenuTab = "challenge" | "questions" | "analysis" | "ranking";
type TileChoiceGroup = { label: string; tiles: TileId[] };

const STATS_STORAGE_KEY = "iishanten-quiz-stats-v1";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type ExplanationAsset = {
  src: string;
  alt: string;
};

function isSameTileSet(selectedTiles: TileId[], answers: TileId[]) {
  if (selectedTiles.length !== answers.length) {
    return false;
  }

  const selectedSet = new Set(selectedTiles);
  return answers.every((tileId) => selectedSet.has(tileId));
}

function createShuffledQuestionIndexes(limit = QUIZ_QUESTIONS.length) {
  const indexes = QUIZ_QUESTIONS.map((_, index) => index);

  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [indexes[index], indexes[randomIndex]] = [indexes[randomIndex], indexes[index]];
  }

  return indexes.slice(0, limit);
}

const TILE_GROUPS: TileChoiceGroup[] = [
  { label: "萬子", tiles: ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m"] },
  { label: "筒子", tiles: ["1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p"] },
  { label: "索子", tiles: ["1s", "2s", "3s", "4s", "5s", "6s", "7s", "8s", "9s"] },
  { label: "字牌", tiles: ["ton", "nan", "sha", "pei", "haku", "hatsu", "chun"] }
];

const MENU_TABS: { id: MenuTab; label: string }[] = [
  { id: "challenge", label: "挑戦" },
  { id: "questions", label: "問題一覧" },
  { id: "analysis", label: "自己分析" },
  { id: "ranking", label: "順位" }
];

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

function getStats(stats: StatsByQuestion, questionId: string): QuestionStats {
  return stats[questionId] ?? { attempts: 0, correct: 0, totalCorrectMs: 0 };
}

function formatRate(stat: QuestionStats) {
  if (stat.attempts === 0) {
    return "未挑戦";
  }

  return `${Math.round((stat.correct / stat.attempts) * 100)}%`;
}

function formatTime(ms: number) {
  return `${(ms / 1000).toFixed(2)}秒`;
}

function formatAverageCorrectTime(stat: QuestionStats) {
  if (stat.correct === 0) {
    return "未記録";
  }

  return formatTime(stat.totalCorrectMs / stat.correct);
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
        return [];
    }
  });
}

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>("menu");
  const [menuTab, setMenuTab] = useState<MenuTab>("challenge");
  const [session, setSession] = useState<PlaySession | null>(null);
  const [question, setQuestion] = useState(() => createRandomVariant(QUIZ_QUESTIONS[0]));
  const [selectedTiles, setSelectedTiles] = useState<TileId[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [lastAnswerMs, setLastAnswerMs] = useState(0);
  const [stats, setStats] = useState<StatsByQuestion>({});
  const [hasLoadedStats, setHasLoadedStats] = useState(false);
  const [questionStartedAt, setQuestionStartedAt] = useState<number | null>(null);
  const isPointerSelectingRef = useRef(false);
  const pointerSelectedTilesRef = useRef(new Set<TileId>());

  useEffect(() => {
    setStats(loadStats());
    setHasLoadedStats(true);
  }, []);

  useEffect(() => {
    if (hasLoadedStats) {
      window.localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
    }
  }, [hasLoadedStats, stats]);

  const isCorrect = hasSubmitted && isSameTileSet(selectedTiles, question.answers);
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
  const attemptedQuestionCount = statValues.filter((stat) => stat.attempts > 0).length;
  const overallRate = totalAttempts > 0 ? `${Math.round((totalCorrect / totalAttempts) * 100)}%` : "未挑戦";
  const overallAverage = totalCorrect > 0 ? formatTime(totalCorrectMs / totalCorrect) : "未記録";

  const loadQuestion = (baseIndex: number) => {
    setQuestion(createRandomVariant(QUIZ_QUESTIONS[baseIndex]));
    setSelectedTiles([]);
    setHasSubmitted(false);
    setLastAnswerMs(0);
    setQuestionStartedAt(performance.now());
  };

  const startSingleQuestion = (baseIndex: number) => {
    setSession({
      mode: "single",
      label: "問題一覧",
      order: [baseIndex],
      position: 0,
      totalMs: 0,
      correctCount: 0,
      answeredCount: 0
    });
    loadQuestion(baseIndex);
    setViewMode("quiz");
  };

  const startQuestionSet = (order: number[], label: string) => {
    setSession({
      mode: "timeAttack",
      label,
      order,
      position: 0,
      totalMs: 0,
      correctCount: 0,
      answeredCount: 0
    });
    loadQuestion(order[0] ?? 0);
    setViewMode("quiz");
  };

  const startTimeAttack = () => {
    startQuestionSet(createShuffledQuestionIndexes(10), "10問ランダム");
  };

  const startAllQuestions = () => {
    startQuestionSet(QUIZ_QUESTIONS.map((_, index) => index), "全問");
  };

  const returnToMenu = () => {
    setViewMode("menu");
    setQuestionStartedAt(null);
    setSession(null);
    setSelectedTiles([]);
    setHasSubmitted(false);
  };

  const handleSelect = (tileId: TileId) => {
    if (hasSubmitted || blockedTiles.has(tileId)) {
      return;
    }

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
    isPointerSelectingRef.current = true;
    pointerSelectedTilesRef.current = new Set<TileId>();
    pushTileDuringPointerSelect(tileId);
  };

  const handlePointerSelectMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isPointerSelectingRef.current || hasSubmitted) {
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
            answeredCount: current.answeredCount + 1
          }
        : current
    );
  };

  const handleClear = () => {
    if (!hasSubmitted) {
      setSelectedTiles([]);
    }
  };

  const handleNext = () => {
    if (!session || session.mode === "single") {
      returnToMenu();
      return;
    }

    const nextPosition = session.position + 1;

    if (nextPosition >= session.order.length) {
      setViewMode("timeAttackComplete");
      setQuestionStartedAt(null);
      return;
    }

    const nextSession = { ...session, position: nextPosition };
    setSession(nextSession);
    loadQuestion(nextSession.order[nextPosition] ?? 0);
  };

  const renderQuestionList = () => (
    <section className="menuSection" aria-labelledby="question-list-title">
      <div className="sectionTitleRow">
        <h2 id="question-list-title">問題一覧</h2>
        <span className="questionCount">56種収録</span>
      </div>
      <div className="questionList">
        {QUIZ_QUESTIONS.map((baseQuestion, index) => {
          const stat = getStats(stats, baseQuestion.id);
          return (
            <button
              className="questionListItem"
              key={baseQuestion.id}
              type="button"
              onClick={() => startSingleQuestion(index)}
            >
              <span className="problemId">{baseQuestion.id}</span>
              <span className="problemSource">{baseQuestion.source}</span>
              <span className="statPill">正答率 {formatRate(stat)}</span>
              <span className="statPill">平均 {formatAverageCorrectTime(stat)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );

  const renderMenuContent = () => {
    if (menuTab === "questions") {
      return renderQuestionList();
    }

    if (menuTab === "analysis") {
      return (
        <section className="menuSection" aria-labelledby="analysis-title">
          <div className="sectionTitleRow">
            <h2 id="analysis-title">自己分析</h2>
            <span className="questionCount">{attemptedQuestionCount} / 56</span>
          </div>
          <div className="analysisGrid">
            <div className="analysisCard">
              <span>挑戦済み</span>
              <strong>{attemptedQuestionCount}問</strong>
            </div>
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

    if (menuTab === "ranking") {
      return (
        <section className="menuSection" aria-labelledby="ranking-title">
          <div className="sectionTitleRow">
            <h2 id="ranking-title">順位</h2>
            <span className="questionCount">準備中</span>
          </div>
          <div className="rankingPanel">
            <div>
              <span>現在の記録</span>
              <strong>{overallRate}</strong>
            </div>
            <div>
              <span>平均正解時間</span>
              <strong>{overallAverage}</strong>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="menuSection" aria-labelledby="challenge-title">
        <div className="sectionTitleRow">
          <h2 id="challenge-title">挑戦</h2>
          <span className="questionCount">全56種</span>
        </div>
        <div className="challengeGrid">
          <button className="challengeCard primary" type="button" onClick={startTimeAttack}>
            <span className="challengeLabel">10問ランダム</span>
            <span className="challengeMeta">回答中のみ計時</span>
          </button>
          <button className="challengeCard" type="button" onClick={startAllQuestions}>
            <span className="challengeLabel">全問</span>
            <span className="challengeMeta">56種を通しで挑戦</span>
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
        <span className="versionBadge">{APP_VERSION}</span>
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

  const renderTimeAttackComplete = () => (
    <section className="panel completionPanel" aria-labelledby="completion-title">
      <h2 id="completion-title">タイムアタック完走</h2>
      <div className="completionStats">
        <span>正解 {session?.correctCount ?? 0} / {session?.answeredCount ?? 0}</span>
        <span>回答時間 {formatTime(session?.totalMs ?? 0)}</span>
      </div>
      <button className="nextButton" type="button" onClick={returnToMenu}>
        メニューへ
      </button>
    </section>
  );

  const renderQuiz = () => (
    <>
      <section className="quizHeader" aria-labelledby="app-title">
        <div className="titleRow">
          <h1 id="app-title">一向聴の受け入れテスト</h1>
          <span className="versionBadge">{APP_VERSION}</span>
        </div>
        <div className="playMeta">
          <span>{session?.mode === "timeAttack" ? session.label ?? "10問ランダム" : "問題一覧"}</span>
          {session?.mode === "timeAttack" && (
            <span>回答中のみ計時: {formatTime(session.totalMs)}</span>
          )}
          <button className="menuBackButton" type="button" onClick={returnToMenu}>
            メニューへ
          </button>
        </div>
      </section>

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

      <section className="panel choicesPanel" aria-label="回答する牌を選択">
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

        <div className="choiceActions">
          <button
            className="submitButton"
            type="button"
            onClick={handleSubmit}
            disabled={hasSubmitted}
          >
            解答する
          </button>
          <button
            className="clearButton"
            type="button"
            onClick={handleClear}
            disabled={hasSubmitted || selectedTiles.length === 0}
          >
            クリア
          </button>
        </div>
      </section>

      {hasSubmitted && (
        <section className="panel resultPanel" aria-live="polite">
          <div className={isCorrect ? "resultBadge correct" : "resultBadge incorrect"}>
            {isCorrect ? "正解！" : "不正解"}
          </div>

          <p className="answerTime">回答時間 {formatTime(lastAnswerMs)}</p>

          <div className="answerBlock">
            <h2>正解牌一覧</h2>
            <div className="answerTiles">
              {question.answers.map((tileId) => (
                <TileView key={`answer-${tileId}`} tileId={tileId} compact />
              ))}
            </div>
          </div>

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
            <p>{question.explanation}</p>
          </div>

          <button className="nextButton" type="button" onClick={handleNext}>
            {session?.mode === "timeAttack"
              ? session.position + 1 >= session.order.length
                ? "結果を見る"
                : "次の問題"
              : "問題一覧へ"}
          </button>
        </section>
      )}
    </>
  );

  return (
    <main className="appShell">
      {viewMode === "menu" && renderMenu()}
      {viewMode === "quiz" && renderQuiz()}
      {viewMode === "timeAttackComplete" && renderTimeAttackComplete()}
    </main>
  );
}
