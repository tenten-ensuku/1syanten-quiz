"use client";

import type { PointerEvent } from "react";
import { TileId, getTileLabel } from "@/lib/quizData";
import { TileView } from "./TileView";

type TileButtonProps = {
  tileId: TileId;
  isSelected: boolean;
  isAnswer: boolean;
  isDisabled: boolean;
  onSelect: (tileId: TileId) => void;
  onPointerSelectStart: (tileId: TileId, event: PointerEvent<HTMLButtonElement>) => void;
};

export function TileButton({
  tileId,
  isSelected,
  isAnswer,
  isDisabled,
  onSelect,
  onPointerSelectStart
}: TileButtonProps) {
  const label = tileId === "hatsu" ? "發" : getTileLabel(tileId);
  const className = [
    "tileChoice",
    isSelected ? "selected" : "",
    isAnswer ? "answer" : ""
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
      aria-label={`${label}を選択`}
    >
      <TileView tileId={tileId} compact />
    </button>
  );
}
