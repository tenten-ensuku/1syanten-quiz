import type { CSSProperties } from "react";
import { TileId } from "@/lib/quizData";
import { TileView } from "./TileView";

type MeldViewProps = {
  tiles: TileId[];
};

export function MeldView({ tiles }: MeldViewProps) {
  const centerIndex = Math.floor(tiles.length / 2);
  const layoutUnits = tiles.length + 0.55;

  return (
    <span
      className="meld"
      aria-label="副露完成メンツ"
      style={{ "--meld-layout-units": layoutUnits } as CSSProperties}
    >
      {tiles.map((tileId, index) => (
        <TileView
          key={`meld-${tileId}-${index}`}
          tileId={tileId}
          sideways={index === centerIndex}
        />
      ))}
    </span>
  );
}
