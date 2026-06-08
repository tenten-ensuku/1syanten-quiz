import { TileId } from "./quizData";

export type SpriteInfo = {
  file:
    | "tiles-man.png"
    | "tiles-pin.png"
    | "tiles-sou.png"
    | "tiles-honor.png"
    | "tiles-yoko-sprite.png";
  sheetWidth: number;
  sheetHeight: number;
  cellWidth: number;
  cellHeight: number;
  x: number;
  y: number;
};

const NORMAL_COLUMNS = 9;
const NORMAL_CELL_WIDTH = 52;
const NORMAL_CELL_HEIGHT = 70;

const YOKO_COLUMNS = 2;
const YOKO_CELL_WIDTH = 70;
const YOKO_CELL_HEIGHT = 52;

const yokoTiles: TileId[] = ["8m", "hatsu"];

export function getSpriteInfo(tileId: TileId, sideways: boolean): SpriteInfo | null {
  if (sideways) {
    const index = yokoTiles.indexOf(tileId);

    if (index === -1) {
      return null;
    }

    return {
      file: "tiles-yoko-sprite.png",
      sheetWidth: YOKO_COLUMNS * YOKO_CELL_WIDTH,
      sheetHeight: YOKO_CELL_HEIGHT,
      cellWidth: YOKO_CELL_WIDTH,
      cellHeight: YOKO_CELL_HEIGHT,
      x: (index % YOKO_COLUMNS) * YOKO_CELL_WIDTH,
      y: Math.floor(index / YOKO_COLUMNS) * YOKO_CELL_HEIGHT
    };
  }

  if (tileId === "hatsu") {
    return {
      file: "tiles-honor.png",
      sheetWidth: NORMAL_CELL_WIDTH,
      sheetHeight: NORMAL_CELL_HEIGHT,
      cellWidth: NORMAL_CELL_WIDTH,
      cellHeight: NORMAL_CELL_HEIGHT,
      x: 0,
      y: 0
    };
  }

  const suit = tileId[1];
  const index = Number(tileId[0]) - 1;
  const file =
    suit === "m"
      ? "tiles-man.png"
      : suit === "p"
        ? "tiles-pin.png"
        : "tiles-sou.png";

  return {
    file,
    sheetWidth: NORMAL_COLUMNS * NORMAL_CELL_WIDTH,
    sheetHeight: NORMAL_CELL_HEIGHT,
    cellWidth: NORMAL_CELL_WIDTH,
    cellHeight: NORMAL_CELL_HEIGHT,
    x: (index % NORMAL_COLUMNS) * NORMAL_CELL_WIDTH,
    y: Math.floor(index / NORMAL_COLUMNS) * NORMAL_CELL_HEIGHT
  };
}
