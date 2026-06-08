"use client";

import { TileId, getTileLabel } from "@/lib/quizData";
import { TileView } from "./TileView";

type TileButtonProps = {
  tileId: TileId;
  isSelected: boolean;
  isAnswer: boolean;
  isDisabled: boolean;
  onSelect: (tileId: TileId) => void;
};

export function TileButton({
  tileId,
  isSelected,
  isAnswer,
  isDisabled,
  onSelect
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
      onClick={() => onSelect(tileId)}
      disabled={isDisabled}
      aria-pressed={isSelected}
      aria-label={`${label}を選択`}
    >
      <TileView tileId={tileId} compact />
      <span className="choiceLabel">{label}</span>
      {isSelected && <span className="selectedMarker">選択済み</span>}
    </button>
  );
}
