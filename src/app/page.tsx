"use client";

import { useState } from "react";
import { ALL_TILE_IDS, QUIZ_QUESTIONS, TileId, getTileLabel } from "@/lib/quizData";
import { MeldView } from "@/components/MeldView";
import { TileButton } from "@/components/TileButton";
import { TileView } from "@/components/TileView";

export default function Home() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedTile, setSelectedTile] = useState<TileId | null>(null);

  const question = QUIZ_QUESTIONS[questionIndex];
  const isAnswered = selectedTile !== null;
  const isCorrect = selectedTile !== null && question.answers.includes(selectedTile);

  const handleSelect = (tileId: TileId) => {
    if (!isAnswered) {
      setSelectedTile(tileId);
    }
  };

  const handleNext = () => {
    setQuestionIndex((current) => (current + 1) % QUIZ_QUESTIONS.length);
    setSelectedTile(null);
  };

  return (
    <main className="appShell">
      <section className="quizHeader" aria-labelledby="app-title">
        <p className="kicker">一枚選択式 MVP</p>
        <h1 id="app-title">イーシャンテンクイズ</h1>
        <p className="lead">
          13枚の牌姿を見て、この牌を引くとテンパイに進むと思う牌を選んでください。
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
        <h2 id="choices-title">解答候補</h2>
        <div className="choiceGrid">
          {ALL_TILE_IDS.map((tileId) => (
            <TileButton
              key={tileId}
              tileId={tileId}
              isSelected={selectedTile === tileId}
              isAnswer={isAnswered && question.answers.includes(tileId)}
              isDisabled={isAnswered}
              onSelect={handleSelect}
            />
          ))}
        </div>
      </section>

      {isAnswered && (
        <section className="panel resultPanel" aria-live="polite">
          <div className={isCorrect ? "resultBadge correct" : "resultBadge incorrect"}>
            {isCorrect ? "正解！" : "不正解"}
          </div>

          <p className="selectedText">
            選択した牌: <strong>{selectedTile ? getTileLabel(selectedTile) : ""}</strong>
          </p>

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
