import { TileId } from "./quizData";

export type SpriteInfo = {
  file: "tiles-sprite.png" | "tiles-yoko-sprite.png";
  sheetWidth: number;
  sheetHeight: number;
  cellWidth: number;
  cellHeight: number;
  x: number;
  y: number;
};

const TILE_ORDER: TileId[] = [
  "1m",
  "2m",
  "3m",
  "4m",
  "5m",
  "6m",
  "7m",
  "8m",
  "9m",
  "1p",
  "2p",
  "3p",
  "4p",
  "5p",
  "6p",
  "7p",
  "8p",
  "9p",
  "1s",
  "2s",
  "3s",
  "4s",
  "5s",
  "6s",
  "7s",
  "8s",
  "9s",
  "hatsu"
];

const NORMAL_COLUMNS = 7;
const NORMAL_CELL_WIDTH = 8;
const NORMAL_CELL_HEIGHT = 12;

const YOKO_COLUMNS = 2;
const YOKO_CELL_WIDTH = 12;
const YOKO_CELL_HEIGHT = 8;

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

  const index = TILE_ORDER.indexOf(tileId);

  return {
    file: "tiles-sprite.png",
    sheetWidth: NORMAL_COLUMNS * NORMAL_CELL_WIDTH,
    sheetHeight: Math.ceil(TILE_ORDER.length / NORMAL_COLUMNS) * NORMAL_CELL_HEIGHT,
    cellWidth: NORMAL_CELL_WIDTH,
    cellHeight: NORMAL_CELL_HEIGHT,
    x: (index % NORMAL_COLUMNS) * NORMAL_CELL_WIDTH,
    y: Math.floor(index / NORMAL_COLUMNS) * NORMAL_CELL_HEIGHT
  };
}
