"use client";

import { type CSSProperties, type PointerEvent, useEffect, useRef, useState } from "react";
import { MeldView } from "@/components/MeldView";
import { TileButton } from "@/components/TileButton";
import { TileView } from "@/components/TileView";
import { APP_VERSION } from "@/lib/appVersion";
import { QUIZ_QUESTIONS, TileId } from "@/lib/quizData";
import { createRandomVariant, sortTilesByDisplayOrder, transformQuestion } from "@/lib/quizTransforms";

function isSameTileSet(selectedTiles: TileId[], answers: TileId[]) {
  if (selectedTiles.length !== answers.length) {
    return false;
  }

  const selectedSet = new Set(selectedTiles);
  return answers.every((tileId) => selectedSet.has(tileId));
}

function createShuffledQuestionIndexes() {
  const indexes = QUIZ_QUESTIONS.map((_, index) => index);

  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [indexes[index], indexes[randomIndex]] = [indexes[randomIndex], indexes[index]];
  }

  return indexes;
}

const TILE_GROUPS: { label: string; tiles: TileId[] }[] = [
  { label: "\u842c\u5b50", tiles: ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m"] },
  { label: "\u7b52\u5b50", tiles: ["1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p"] },
  { label: "\u7d22\u5b50", tiles: ["1s", "2s", "3s", "4s", "5s", "6s", "7s", "8s", "9s"] },
  { label: "\u5b57\u724c", tiles: ["ton", "nan", "sha", "pei", "haku", "hatsu", "chun"] }
];

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

export default function Home() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionOrder, setQuestionOrder] = useState<number[]>(() =>
    QUIZ_QUESTIONS.map((_, index) => index)
  );
  const [question, setQuestion] = useState(() =>
    transformQuestion(QUIZ_QUESTIONS[0], { m: "m", p: "p", s: "s" }, false)
  );
  const [selectedTiles, setSelectedTiles] = useState<TileId[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const isPointerSelectingRef = useRef(false);
  const pointerSelectedTilesRef = useRef(new Set<TileId>());

  useEffect(() => {
    const nextOrder = createShuffledQuestionIndexes();
    setQuestionOrder(nextOrder);
    setQuestionIndex(0);
    setQuestion(createRandomVariant(QUIZ_QUESTIONS[nextOrder[0] ?? 0]));
  }, []);

  const isCorrect = hasSubmitted && isSameTileSet(selectedTiles, question.answers);
  const sortedSelectedTiles = sortTilesByDisplayOrder(selectedTiles);
  const blockedTiles = createBlockedTileSet(question.hand, question.melds);

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
    setHasSubmitted(true);
  };

  const handleClear = () => {
    if (!hasSubmitted) {
      setSelectedTiles([]);
    }
  };

  const handleNext = () => {
    const nextIndex = questionIndex + 1;

    if (nextIndex >= QUIZ_QUESTIONS.length) {
      const nextOrder = createShuffledQuestionIndexes();
      setQuestionOrder(nextOrder);
      setQuestionIndex(0);
      setQuestion(createRandomVariant(QUIZ_QUESTIONS[nextOrder[0] ?? 0]));
    } else {
      setQuestionIndex(nextIndex);
      setQuestion(createRandomVariant(QUIZ_QUESTIONS[questionOrder[nextIndex] ?? 0]));
    }

    setSelectedTiles([]);
    setHasSubmitted(false);
  };

  return (
    <main className="appShell">
      <section className="quizHeader" aria-labelledby="app-title">
        <div className="titleRow">
          <h1 id="app-title">{"\u4e00\u5411\u8074\u306e\u53d7\u3051\u5165\u308c\u30c6\u30b9\u30c8"}</h1>
          <span className="versionBadge">{APP_VERSION}</span>
        </div>
        <p className="lead">
          {"13\u679a\u306e\u724c\u59ff\u3092\u898b\u3066\u3001\u3053\u306e\u724c\u3092\u5f15\u304f\u3068\u30c6\u30f3\u30d1\u30a4\u306b\u9032\u3080\u3068\u601d\u3046\u724c\u3092\u3059\u3079\u3066\u9078\u3093\u3067\u304f\u3060\u3055\u3044\u3002"}
        </p>
      </section>

      <section className="panel questionPanel" aria-labelledby="question-title">
        <div className="sectionTitleRow">
          <h2 id="question-title">{"\u554f\u984c"} {questionIndex + 1}</h2>
          <span className="questionCount">
            {questionIndex + 1} / {QUIZ_QUESTIONS.length}
          </span>
        </div>

        <div className="handArea" aria-label="\u554f\u984c\u306e\u724c\u59ff">
          <div
            className="closedTiles"
            aria-label="\u624b\u724c"
            style={{ "--hand-tile-count": question.hand.length } as CSSProperties}
          >
            {question.hand.map((tileId, index) => (
              <TileView key={`${question.id}-${tileId}-${index}`} tileId={tileId} />
            ))}
          </div>

          {question.melds.length > 0 && (
            <div className="meldArea" aria-label="\u526f\u9732">
              {question.melds.map((meld, index) => (
                <MeldView key={`${question.id}-meld-${index}`} tiles={meld} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="panel choicesPanel" aria-label="\u56de\u7b54\u3059\u308b\u724c\u3092\u9078\u629e">
        <div
          className="choiceRows"
          onPointerMove={handlePointerSelectMove}
          onPointerUp={handlePointerSelectEnd}
          onPointerCancel={handlePointerSelectEnd}
          onPointerLeave={handlePointerSelectEnd}
        >
          {TILE_GROUPS.map((group) => (
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
            {"\u89e3\u7b54\u3059\u308b"}
          </button>
          <button
            className="clearButton"
            type="button"
            onClick={handleClear}
            disabled={hasSubmitted || selectedTiles.length === 0}
          >
            {"\u30af\u30ea\u30a2"}
          </button>
        </div>
      </section>

      {hasSubmitted && (
        <section className="panel resultPanel" aria-live="polite">
          <div className={isCorrect ? "resultBadge correct" : "resultBadge incorrect"}>
            {isCorrect ? "\u6b63\u89e3\uff01" : "\u4e0d\u6b63\u89e3"}
          </div>

          <div className="answerBlock">
            <h2>{"\u81ea\u5206\u304c\u9078\u3093\u3060\u724c"}</h2>
            <div className="answerTiles">
              {selectedTiles.length > 0 ? (
                sortedSelectedTiles.map((tileId) => (
                  <TileView key={`selected-${tileId}`} tileId={tileId} compact />
                ))
              ) : (
                <p className="emptySelection">{"\u9078\u629e\u306a\u3057"}</p>
              )}
            </div>
          </div>

          <div className="answerBlock">
            <h2>{"\u6b63\u89e3\u724c\u4e00\u89a7"}</h2>
            <div className="answerTiles">
              {question.answers.map((tileId) => (
                <TileView key={`answer-${tileId}`} tileId={tileId} compact />
              ))}
            </div>
          </div>

          <div className="explanationBlock">
            <h2>{"\u89e3\u8aac"}</h2>
            <p>{question.explanation}</p>
          </div>

          <button className="nextButton" type="button" onClick={handleNext}>
            {"\u6b21\u306e\u554f\u984c"}
          </button>
        </section>
      )}
    </main>
  );
}
