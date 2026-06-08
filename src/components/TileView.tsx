"use client";

import { useState } from "react";
import { TileId, getTileLabel } from "@/lib/quizData";

type TileViewProps = {
  tileId: TileId;
  compact?: boolean;
  sideways?: boolean;
};

export function TileView({ tileId, compact = false, sideways = false }: TileViewProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const label = getTileLabel(tileId);
  const imageName = sideways ? `${tileId}-yoko` : tileId;
  const className = [
    "tile",
    compact ? "tileCompact" : "",
    sideways ? "tileSideways" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={className} aria-label={label}>
      {!hasImageError ? (
        <img
          src={`/tiles/${imageName}.png`}
          alt={label}
          onError={() => setHasImageError(true)}
          draggable={false}
        />
      ) : (
        <span className="tileFallback">{label}</span>
      )}
    </span>
  );
}
