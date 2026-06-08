"use client";

import { useState } from "react";
import { ALL_TILE_IDS, QUIZ_QUESTIONS, TileId } from "@/lib/quizData";
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

const ANSWER_CANDIDATES = Array.from(new Set(ALL_TILE_IDS));

export default function Home() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedTiles, setSelectedTiles] = useState<TileId[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const question = QUIZ_QUESTIONS[questionIndex];
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

  const handleNext = () => {
    setQuestionIndex((current) => (current + 1) % QUIZ_QUESTIONS.length);
    setSelectedTiles([]);
    setHasSubmitted(false);
  };

  return (
    <main className="appShell">
      <section className="quizHeader" aria-labelledby="app-title">
        <p className="kicker">複数回答式クイズ</p>
        <h1 id="app-title">イーシャンテンクイズ</h1>
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

      <section className="panel choicesPanel" aria-labelledby="choices-title">
        <div className="sectionTitleRow">
          <h2 id="choices-title">解答候補</h2>
          <span className="questionCount">選択中 {selectedTiles.length}枚</span>
        </div>
        <div className="choiceGrid">
          {ANSWER_CANDIDATES.map((tileId) => (
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

        <button
          className="submitButton"
          type="button"
          onClick={handleSubmit}
          disabled={hasSubmitted}
        >
          解答する
        </button>
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
