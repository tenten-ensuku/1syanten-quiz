"use client";

import type { PointerEvent } from "react";
import { TileId, getTileLabel } from "@/lib/quizData";
import { TileView } from "./TileView";

type TileButtonProps = {
  tileId: TileId;
  isSelected: boolean;
  isAnswer: boolean;
  isIncorrect: boolean;
  isBlocked: boolean;
  isDisabled: boolean;
  onSelect: (tileId: TileId) => void;
  onPointerSelectStart: (tileId: TileId, event: PointerEvent<HTMLButtonElement>) => void;
};

export function TileButton({
  tileId,
  isSelected,
  isAnswer,
  isIncorrect,
  isBlocked,
  isDisabled,
  onSelect,
  onPointerSelectStart
}: TileButtonProps) {
  const label = getTileLabel(tileId);
  const className = [
    "tileChoice",
    isSelected ? "selected" : "",
    isAnswer ? "answer" : "",
    isIncorrect ? "incorrect" : "",
    isBlocked ? "blocked" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={className}
      type="button"
      data-tile-id={tileId}
      onClick={(event) => {
        if (event.detail === 0) {
          onSelect(tileId);
        }
      }}
      onPointerDown={(event) => onPointerSelectStart(tileId, event)}
      disabled={isDisabled}
      aria-pressed={isSelected}
      aria-label={isBlocked ? `${label}は4枚使用済み` : `${label}を選択`}
    >
      <TileView tileId={tileId} compact />
    </button>
  );
}
