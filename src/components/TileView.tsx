"use client";

import { HONOR_TILE_IDS, TileId, getTileLabel } from "@/lib/quizData";
import { getSpriteInfo } from "@/lib/tileSprites";

type TileViewProps = {
  tileId: TileId;
  compact?: boolean;
  sideways?: boolean;
};

const tileAssetBase =
  "https://raw.githubusercontent.com/wataruM2001/1syanten-quiz/main/public/tiles";

export function TileView({ tileId, compact = false, sideways = false }: TileViewProps) {
  const label = tileId === "hatsu" ? "發" : getTileLabel(tileId);
  const sprite = getSpriteInfo(tileId, sideways);
  const spriteX =
    sprite && sprite.sheetWidth !== sprite.cellWidth
      ? (sprite.x / (sprite.sheetWidth - sprite.cellWidth)) * 100
      : 0;
  const spriteY =
    sprite && sprite.sheetHeight !== sprite.cellHeight
      ? (sprite.y / (sprite.sheetHeight - sprite.cellHeight)) * 100
      : 0;
  const className = [
    "tile",
    compact ? "tileCompact" : "",
    sideways ? "tileSideways" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={className} aria-label={label}>
      {sprite ? (
        <span
          className="tileSprite"
          role="img"
          aria-label={label}
          style={{
            backgroundImage: `url("${tileAssetBase}/${sprite.file}")`,
            backgroundPosition: `${spriteX}% ${spriteY}%`,
            backgroundSize: `${(sprite.sheetWidth / sprite.cellWidth) * 100}% ${(sprite.sheetHeight / sprite.cellHeight) * 100}%`
          }}
        />
      ) : HONOR_TILE_IDS.includes(tileId as (typeof HONOR_TILE_IDS)[number]) ? (
        <span
          className="tileSprite"
          role="img"
          aria-label={label}
          style={{
            backgroundImage: `url("${tileAssetBase}/${tileId}.svg")`,
            backgroundPosition: "center",
            backgroundSize: "100% 100%"
          }}
        />
      ) : (
        <span className="tileFallback" aria-hidden="true" />
      )}
    </span>
  );
}
