"use client";

import { TileId, getTileLabel } from "@/lib/quizData";
import { getSpriteInfo } from "@/lib/tileSprites";

type TileViewProps = {
  tileId: TileId;
  compact?: boolean;
  sideways?: boolean;
};

export function TileView({ tileId, compact = false, sideways = false }: TileViewProps) {
  const label = tileId === "hatsu" ? "發" : getTileLabel(tileId);
  const sprite = getSpriteInfo(tileId, sideways);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
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
            backgroundImage: `url("${basePath}/tiles/${sprite.file}")`,
            backgroundPosition: `${spriteX}% ${spriteY}%`,
            backgroundSize: `${(sprite.sheetWidth / sprite.cellWidth) * 100}% ${(sprite.sheetHeight / sprite.cellHeight) * 100}%`
          }}
        />
      ) : (
        <span className={tileId === "hatsu" ? "tileFallback tileFallbackHonor" : "tileFallback"}>
          {label}
        </span>
      )}
    </span>
  );
}
