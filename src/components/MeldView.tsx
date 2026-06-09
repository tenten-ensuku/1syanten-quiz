import { TileId } from "@/lib/quizData";
import { TileView } from "./TileView";

type MeldViewProps = {
  tiles: TileId[];
};

export function MeldView({ tiles }: MeldViewProps) {
  const centerIndex = Math.floor(tiles.length / 2);

  return (
    <span className="meld" aria-label="副露完成メンツ">
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
