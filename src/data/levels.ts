import type { CarDefinition, Direction, ExitDefinition, LevelDefinition } from "../game/types";
import { validateAllLevels } from "../game/LevelValidator";

type LevelRecipe = {
  id: number;
  width: number;
  height: number;
  cars: number;
  seed: number;
};

const BASE_COLORS = ["#ef4444", "#3b82f6", "#f59e0b", "#10b981", "#a855f7", "#ec4899", "#14b8a6", "#f97316"];
const DIRECTIONS: Direction[] = ["up", "down", "left", "right"];

const RECIPES: LevelRecipe[] = [
  { id: 1, width: 5, height: 4, cars: 2, seed: 101 },
  { id: 2, width: 5, height: 4, cars: 3, seed: 203 },
  { id: 3, width: 6, height: 4, cars: 4, seed: 307 },
  { id: 4, width: 6, height: 5, cars: 5, seed: 409 },
  { id: 5, width: 6, height: 5, cars: 6, seed: 503 },
  { id: 6, width: 7, height: 5, cars: 6, seed: 607 },
  { id: 7, width: 7, height: 5, cars: 7, seed: 701 },
  { id: 8, width: 7, height: 6, cars: 7, seed: 809 },
  { id: 9, width: 7, height: 6, cars: 8, seed: 907 },
  { id: 10, width: 8, height: 6, cars: 8, seed: 1009 },
  { id: 11, width: 8, height: 6, cars: 9, seed: 1103 },
  { id: 12, width: 8, height: 6, cars: 9, seed: 1217 },
  { id: 13, width: 8, height: 7, cars: 10, seed: 1301 },
  { id: 14, width: 8, height: 7, cars: 10, seed: 1423 },
  { id: 15, width: 8, height: 7, cars: 11, seed: 1511 },
  { id: 16, width: 9, height: 7, cars: 11, seed: 1607 },
  { id: 17, width: 9, height: 7, cars: 12, seed: 1709 },
  { id: 18, width: 9, height: 7, cars: 12, seed: 1801 },
  { id: 19, width: 9, height: 7, cars: 13, seed: 1907 },
  { id: 20, width: 9, height: 8, cars: 13, seed: 2011 },
  { id: 21, width: 9, height: 8, cars: 14, seed: 2113 },
  { id: 22, width: 10, height: 8, cars: 14, seed: 2221 },
  { id: 23, width: 10, height: 8, cars: 15, seed: 2309 },
  { id: 24, width: 10, height: 8, cars: 15, seed: 2411 },
  { id: 25, width: 10, height: 8, cars: 16, seed: 2503 },
  { id: 26, width: 10, height: 9, cars: 16, seed: 2609 },
  { id: 27, width: 10, height: 9, cars: 17, seed: 2707 },
  { id: 28, width: 10, height: 9, cars: 17, seed: 2801 },
  { id: 29, width: 10, height: 9, cars: 18, seed: 2903 },
  { id: 30, width: 11, height: 9, cars: 18, seed: 3001 },
  { id: 31, width: 11, height: 9, cars: 19, seed: 3109 },
  { id: 32, width: 11, height: 9, cars: 19, seed: 3203 },
  { id: 33, width: 11, height: 9, cars: 20, seed: 3301 },
  { id: 34, width: 11, height: 10, cars: 20, seed: 3407 },
  { id: 35, width: 11, height: 10, cars: 21, seed: 3511 },
  { id: 36, width: 11, height: 10, cars: 21, seed: 3607 },
  { id: 37, width: 12, height: 10, cars: 22, seed: 3701 },
  { id: 38, width: 12, height: 10, cars: 22, seed: 3803 },
  { id: 39, width: 12, height: 10, cars: 23, seed: 3907 },
  { id: 40, width: 12, height: 10, cars: 23, seed: 4001 },
  { id: 41, width: 12, height: 11, cars: 24, seed: 4111 },
  { id: 42, width: 12, height: 11, cars: 24, seed: 4201 },
  { id: 43, width: 12, height: 11, cars: 25, seed: 4319 },
  { id: 44, width: 12, height: 11, cars: 25, seed: 4409 },
  { id: 45, width: 13, height: 11, cars: 26, seed: 4507 },
  { id: 46, width: 13, height: 11, cars: 26, seed: 4603 },
  { id: 47, width: 13, height: 11, cars: 27, seed: 4703 },
  { id: 48, width: 13, height: 12, cars: 27, seed: 4801 },
  { id: 49, width: 13, height: 12, cars: 28, seed: 4909 },
  { id: 50, width: 13, height: 12, cars: 29, seed: 5003 }
];

class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 0xffffffff;
  }

  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }
}

type Candidate = Pick<CarDefinition, "x" | "y" | "length" | "direction">;

function allExits(width: number, height: number): ExitDefinition[] {
  const exits: ExitDefinition[] = [];
  for (let x = 0; x < width; x += 1) {
    exits.push({ x, y: 0, direction: "up" }, { x, y: height - 1, direction: "down" });
  }
  for (let y = 0; y < height; y += 1) {
    exits.push({ x: 0, y, direction: "left" }, { x: width - 1, y, direction: "right" });
  }
  return exits;
}

function occupiedCells(car: Pick<CarDefinition, "x" | "y" | "length" | "direction">): Array<{ x: number; y: number }> {
  const cells: Array<{ x: number; y: number }> = [];
  const horizontal = car.direction === "left" || car.direction === "right";
  for (let i = 0; i < car.length; i += 1) {
    cells.push({
      x: car.x + (horizontal ? i : 0),
      y: car.y + (horizontal ? 0 : i)
    });
  }
  return cells;
}

function key(x: number, y: number): string {
  return `${x},${y}`;
}

function buildOccupancy(cars: CarDefinition[]): Map<string, string> {
  const occupancy = new Map<string, string>();
  for (const car of cars) {
    for (const cell of occupiedCells(car)) {
      occupancy.set(key(cell.x, cell.y), car.id);
    }
  }
  return occupancy;
}

function inBounds(car: Pick<CarDefinition, "x" | "y" | "length" | "direction">, width: number, height: number): boolean {
  return occupiedCells(car).every((cell) => cell.x >= 0 && cell.y >= 0 && cell.x < width && cell.y < height);
}

function hasExit(exits: ExitDefinition[], car: Candidate): boolean {
  if (car.direction === "up") return exits.some((exit) => exit.direction === "up" && exit.x === car.x && exit.y === 0);
  if (car.direction === "down") return exits.some((exit) => exit.direction === "down" && exit.x === car.x && exit.y >= 0);
  if (car.direction === "left") return exits.some((exit) => exit.direction === "left" && exit.y === car.y && exit.x === 0);
  return exits.some((exit) => exit.direction === "right" && exit.y === car.y && exit.x >= 0);
}

function pathCellsAhead(car: Pick<CarDefinition, "x" | "y" | "length" | "direction">, width: number, height: number): Array<{ x: number; y: number }> {
  const cells: Array<{ x: number; y: number }> = [];
  if (car.direction === "up") {
    for (let y = car.y - 1; y >= 0; y -= 1) cells.push({ x: car.x, y });
  } else if (car.direction === "down") {
    for (let y = car.y + car.length; y < height; y += 1) cells.push({ x: car.x, y });
  } else if (car.direction === "left") {
    for (let x = car.x - 1; x >= 0; x -= 1) cells.push({ x, y: car.y });
  } else {
    for (let x = car.x + car.length; x < width; x += 1) cells.push({ x, y: car.y });
  }
  return cells;
}

function candidateIsClear(candidate: Candidate, placed: CarDefinition[], width: number, height: number, exits: ExitDefinition[]): boolean {
  if (!inBounds(candidate, width, height) || !hasExit(exits, candidate)) return false;
  const occupancy = buildOccupancy(placed);
  for (const cell of occupiedCells(candidate)) {
    if (occupancy.has(key(cell.x, cell.y))) return false;
  }
  for (const cell of pathCellsAhead(candidate, width, height)) {
    if (occupancy.has(key(cell.x, cell.y))) return false;
  }
  return true;
}

function enumerateCandidates(placed: CarDefinition[], width: number, height: number, exits: ExitDefinition[]): Candidate[] {
  const candidates: Candidate[] = [];
  for (const direction of DIRECTIONS) {
    const horizontal = direction === "left" || direction === "right";
    for (const length of [2, 3] as const) {
      const maxX = horizontal ? width - length : width - 1;
      const maxY = horizontal ? height - 1 : height - length;
      for (let y = 0; y <= maxY; y += 1) {
        for (let x = 0; x <= maxX; x += 1) {
          const candidate: Candidate = { x, y, length, direction };
          if (candidateIsClear(candidate, placed, width, height, exits)) {
            candidates.push(candidate);
          }
        }
      }
    }
  }
  return candidates;
}

function pickCandidate(candidates: Candidate[], random: SeededRandom, solveIndex: number): Candidate {
  const weighted = candidates
    .map((candidate) => {
      const edgeDistance =
        candidate.direction === "up"
          ? candidate.y
          : candidate.direction === "down"
            ? Math.max(0, 10 - candidate.y)
            : candidate.direction === "left"
              ? candidate.x
              : Math.max(0, 10 - candidate.x);
      const longBonus = candidate.length === 3 && solveIndex > 5 ? 2 : 0;
      return { candidate, score: 1 + edgeDistance + longBonus + random.next() * 4 };
    })
    .sort((a, b) => b.score - a.score);
  return weighted[random.int(Math.min(5, weighted.length))].candidate;
}

function generateLevel(recipe: LevelRecipe): LevelDefinition {
  const random = new SeededRandom(recipe.seed);
  const exits = allExits(recipe.width, recipe.height);
  const placed: CarDefinition[] = [];
  const hintOrder: string[] = [];

  for (let solveIndex = recipe.cars; solveIndex >= 1; solveIndex -= 1) {
    const candidates = enumerateCandidates(placed, recipe.width, recipe.height, exits);
    if (candidates.length === 0) {
      throw new Error(`Unable to generate level ${recipe.id}; no placement for car ${solveIndex}.`);
    }

    const candidate = pickCandidate(candidates, random, solveIndex);
    const id = `L${recipe.id}C${solveIndex}`;
    placed.push({
      ...candidate,
      id,
      color: BASE_COLORS[(recipe.id + solveIndex) % BASE_COLORS.length]
    });
    hintOrder.unshift(id);
  }

  return {
    id: recipe.id,
    width: recipe.width,
    height: recipe.height,
    exits,
    cars: placed.reverse(),
    hintOrder
  };
}

const LEVELS = RECIPES.map(generateLevel);
const validation = validateAllLevels(LEVELS);

if (!validation.valid) {
  console.warn("[levels] Validation failed", validation.errors);
}

export const levels: LevelDefinition[] = LEVELS;
export { calculateDifficulty, solveLevel, validateAllLevels, validateLevel } from "../game/LevelValidator";
