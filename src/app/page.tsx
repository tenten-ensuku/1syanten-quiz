"use client";

import { useEffect, useState } from "react";
import { QUIZ_QUESTIONS, TileId } from "@/lib/quizData";
import { MeldView } from "@/components/MeldView";
import { TileButton } from "@/components/TileButton";
import { TileView } from "@/components/TileView";

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
  { label: "萬子", tiles: ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m"] },
  { label: "筒子", tiles: ["1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p"] },
  { label: "索子", tiles: ["1s", "2s", "3s", "4s", "5s", "6s", "7s", "8s", "9s"] },
  { label: "字牌", tiles: ["ton", "nan", "sha", "pei", "haku", "hatsu", "chun"] }
];

export default function Home() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionOrder, setQuestionOrder] = useState<number[]>(() =>
    QUIZ_QUESTIONS.map((_, index) => index)
  );
  const [selectedTiles, setSelectedTiles] = useState<TileId[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    setQuestionOrder(createShuffledQuestionIndexes());
    setQuestionIndex(0);
  }, []);

  const question = QUIZ_QUESTIONS[questionOrder[questionIndex] ?? 0];
  const isCorrect = hasSubmitted && isSameTileSet(selectedTiles, question.answers);

  const handleSelect = (tileId: TileId) => {
    if (hasSubmitted) {
      return;
    }

    setSelectedTiles((current) =>
      current.includes(tileId)
        ? current.filter((selectedTile) => selectedTile !== tileId)
        : [...current, tileId]
    );
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
      setQuestionOrder(createShuffledQuestionIndexes());
      setQuestionIndex(0);
    } else {
      setQuestionIndex(nextIndex);
    }

    setSelectedTiles([]);
    setHasSubmitted(false);
  };

  return (
    <main className="appShell">
      <section className="quizHeader" aria-labelledby="app-title">
        <h1 id="app-title">一向聴の受け入れテスト</h1>
        <p className="lead">
          13枚の牌姿を見て、この牌を引くとテンパイに進むと思う牌をすべて選んでください。
        </p>
      </section>

      <section className="panel questionPanel" aria-labelledby="question-title">
        <div className="sectionTitleRow">
          <h2 id="question-title">問題 {questionIndex + 1}</h2>
          <span className="questionCount">
            {questionIndex + 1} / {QUIZ_QUESTIONS.length}
          </span>
        </div>

        <div className="handArea" aria-label="問題の牌姿">
          <div className="closedTiles" aria-label="手牌">
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
        <div className="choiceRows">
          {TILE_GROUPS.map((group) => (
            <div className="choiceRow" key={group.label} aria-label={group.label}>
              {group.tiles.map((tileId) => (
                <TileButton
                  key={tileId}
                  tileId={tileId}
                  isSelected={selectedTiles.includes(tileId)}
                  isAnswer={hasSubmitted && question.answers.includes(tileId)}
                  isDisabled={hasSubmitted}
                  onSelect={handleSelect}
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

          <div className="answerBlock">
            <h2>自分が選んだ牌</h2>
            <div className="answerTiles">
              {selectedTiles.length > 0 ? (
                selectedTiles.map((tileId) => (
                  <TileView key={`selected-${tileId}`} tileId={tileId} compact />
                ))
              ) : (
                <p className="emptySelection">選択なし</p>
              )}
            </div>
          </div>

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
            <p>{question.explanation}</p>
          </div>

          <button className="nextButton" type="button" onClick={handleNext}>
            次の問題
          </button>
        </section>
      )}
    </main>
  );
}
