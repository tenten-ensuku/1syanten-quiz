"use client";

import { TileId, getTileLabel } from "@/lib/quizData";

type TileViewProps = {
  tileId: TileId;
  compact?: boolean;
  sideways?: boolean;
};

const SUIT_PREFIX = {
  m: "man",
  p: "pin",
  s: "sou"
} as const;

const HONOR_FILE_INDEX: Record<"ton" | "nan" | "sha" | "pei" | "haku" | "hatsu" | "chun", number> = {
  ton: 1,
  nan: 2,
  sha: 3,
  pei: 4,
  haku: 5,
  hatsu: 6,
  chun: 7
};

const TILE_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function getTileImagePath(tileId: TileId) {
  const suitedTile = tileId.match(/^([1-9])([mps])$/);

  if (suitedTile) {
    const [, number, suit] = suitedTile;
    return `${TILE_BASE_PATH}/tiles/${SUIT_PREFIX[suit as keyof typeof SUIT_PREFIX]}${number}-66-90-l.png`;
  }

  return `${TILE_BASE_PATH}/tiles/ji${HONOR_FILE_INDEX[tileId as keyof typeof HONOR_FILE_INDEX]}-66-90-l.png`;
}

export function TileView({ tileId, compact = false, sideways = false }: TileViewProps) {
  const label = tileId === "hatsu" ? "發" : getTileLabel(tileId);
  const className = [
    "tile",
    compact ? "tileCompact" : "",
    sideways ? "tileSideways" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={className} aria-label={label}>
      <img src={getTileImagePath(tileId)} alt={label} width={66} height={90} draggable={false} />
    </span>
  );
}
