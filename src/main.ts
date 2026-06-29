import "./styles.css";
import { Game } from "./game/Game";

const gameRoot = document.querySelector<HTMLDivElement>("#game-root");
const uiRoot = document.querySelector<HTMLDivElement>("#ui-root");

if (!gameRoot || !uiRoot) {
  throw new Error("Parking Puzzle 3D requires #game-root and #ui-root containers.");
}

const game = new Game(gameRoot, uiRoot);

void game.start();
