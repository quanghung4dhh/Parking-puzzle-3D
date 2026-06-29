import type { CarDefinition, Direction, ExitDefinition, LevelDefinition } from "./types";

export const VALID_DIRECTIONS: Direction[] = ["up", "down", "left", "right"];

export type DifficultyTier = "tutorial" | "easy" | "medium" | "hard" | "expert";

export type PathCheck = {
  canExit: boolean;
  blockerId?: string;
};

export type LevelSolveStep = {
  carId: string;
  availableMoves: string[];
  blockedCars: number;
};

export type LevelSolveResult = {
  solvable: boolean;
  solution: string[];
  steps: LevelSolveStep[];
  errors: string[];
};

export type DifficultyResult = {
  score: number;
  tier: DifficultyTier;
  carCount: number;
  longCarCount: number;
  boardArea: number;
  solutionLength: number;
  averageAvailableMoves: number;
  constrainedOpeningMoves: number;
  blockedInitialCars: number;
  decoyMoves: number;
};

export type LevelValidationResult = {
  valid: boolean;
  solvable: boolean;
  errors: string[];
  solution: string[];
  steps: LevelSolveStep[];
  difficulty: DifficultyResult;
};

export type AllLevelsValidationResult = {
  valid: boolean;
  errors: string[];
  results: LevelValidationResult[];
};

type Cell = { x: number; y: number };

type RuntimeCar = CarDefinition & {
  direction: unknown;
  length: unknown;
};

export function isValidDirection(direction: unknown): direction is Direction {
  return typeof direction === "string" && VALID_DIRECTIONS.includes(direction as Direction);
}

export function difficultyTierForLevelId(levelId: number): DifficultyTier {
  if (levelId <= 5) return "tutorial";
  if (levelId <= 15) return "easy";
  if (levelId <= 30) return "medium";
  if (levelId <= 45) return "hard";
  return "expert";
}

export function occupiedCellsForCar(car: Pick<CarDefinition, "x" | "y" | "length" | "direction">): Cell[] {
  if (!isValidDirection(car.direction) || !isValidCarLength(car.length)) return [];
  const horizontal = car.direction === "left" || car.direction === "right";
  const cells: Cell[] = [];
  for (let i = 0; i < car.length; i += 1) {
    cells.push({
      x: car.x + (horizontal ? i : 0),
      y: car.y + (horizontal ? 0 : i)
    });
  }
  return cells;
}

export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function canCarExit(car: CarDefinition, cars: CarDefinition[], level: LevelDefinition): PathCheck {
  if (!hasMatchingExit(level.exits, car, level.width, level.height)) {
    return { canExit: false };
  }

  const occupancy = buildOccupancy(cars.filter((other) => other.id !== car.id));
  for (const cell of pathCellsAhead(car, level.width, level.height)) {
    const blockerId = occupancy.get(cellKey(cell.x, cell.y));
    if (blockerId) {
      return { canExit: false, blockerId };
    }
  }
  return { canExit: true };
}

export function availableMoves(cars: CarDefinition[], level: LevelDefinition): string[] {
  return cars.filter((car) => canCarExit(car, cars, level).canExit).map((car) => car.id);
}

export function solveLevel(level: LevelDefinition, validateStructure = true): LevelSolveResult {
  const errors = validateStructure ? validateLevelStructure(level) : [];
  if (errors.length > 0) {
    return { solvable: false, solution: [], steps: [], errors };
  }

  const remaining = level.cars.map((car) => ({ ...car }));
  const solution: string[] = [];
  const steps: LevelSolveStep[] = [];
  const preferredOrder = level.hintOrder ?? [];

  while (remaining.length > 0) {
    const moves = availableMoves(remaining, level);
    if (moves.length === 0) {
      errors.push(`Level ${level.id}: ${remaining.length} car(s) cannot reach an exit.`);
      break;
    }

    const hintedMove = preferredOrder.find((carId) => moves.includes(carId));
    const carId = hintedMove ?? moves[0];
    steps.push({
      carId,
      availableMoves: moves,
      blockedCars: remaining.length - moves.length
    });
    solution.push(carId);
    remaining.splice(
      remaining.findIndex((car) => car.id === carId),
      1
    );
  }

  return {
    solvable: errors.length === 0 && remaining.length === 0,
    solution,
    steps,
    errors
  };
}

export function calculateDifficulty(
  level: LevelDefinition,
  solution: string[] = solveLevel(level, false).solution,
  steps: LevelSolveStep[] = solveLevel(level, false).steps
): DifficultyResult {
  const carCount = level.cars.length;
  const longCarCount = level.cars.filter((car) => car.length === 3).length;
  const boardArea = level.width * level.height;
  const solutionLength = solution.length;
  const moveCounts = steps.map((step) => step.availableMoves.length);
  const averageAvailableMoves =
    moveCounts.length > 0 ? moveCounts.reduce((sum, count) => sum + count, 0) / moveCounts.length : 0;
  const openingMoveCounts = moveCounts.slice(0, Math.min(4, moveCounts.length));
  const constrainedOpeningMoves = openingMoveCounts.filter((count) => count <= 1).length;
  const blockedInitialCars = Math.max(0, carCount - (moveCounts[0] ?? 0));
  const decoyMoves = moveCounts.reduce((sum, count) => sum + Math.max(0, count - 1), 0);
  const occupiedCellCount = level.cars.reduce((sum, car) => sum + (isValidCarLength(car.length) ? car.length : 0), 0);
  const occupancyRatio = boardArea > 0 ? occupiedCellCount / boardArea : 0;

  const score = Math.max(
    1,
    Math.round(
      carCount * 2.4 +
        longCarCount * 2.1 +
        boardArea * 0.18 +
        solutionLength * 1.15 +
        blockedInitialCars * 1.4 +
        constrainedOpeningMoves * 3.5 +
        decoyMoves * 0.22 +
        occupancyRatio * 16 -
        averageAvailableMoves * 0.9
    )
  );

  return {
    score,
    tier: difficultyTierForLevelId(level.id),
    carCount,
    longCarCount,
    boardArea,
    solutionLength,
    averageAvailableMoves: Number(averageAvailableMoves.toFixed(2)),
    constrainedOpeningMoves,
    blockedInitialCars,
    decoyMoves
  };
}

export function validateLevel(level: LevelDefinition): LevelValidationResult {
  const structureErrors = validateLevelStructure(level);
  const solveResult =
    structureErrors.length === 0
      ? solveLevel(level, false)
      : { solvable: false, solution: [], steps: [], errors: [] };
  const errors = [...structureErrors, ...solveResult.errors];
  const difficulty = calculateDifficulty(level, solveResult.solution, solveResult.steps);

  return {
    valid: errors.length === 0 && solveResult.solvable,
    solvable: solveResult.solvable,
    errors,
    solution: solveResult.solution,
    steps: solveResult.steps,
    difficulty
  };
}

export function validateAllLevels(levels: LevelDefinition[]): AllLevelsValidationResult {
  const results = levels.map(validateLevel);
  const errors = results.flatMap((result) => result.errors);
  return {
    valid: errors.length === 0,
    errors,
    results
  };
}

function validateLevelStructure(level: LevelDefinition): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(level.id) || level.id < 1) {
    errors.push(`Level ${level.id}: id must be a positive integer.`);
  }
  if (!Number.isInteger(level.width) || level.width < 2) {
    errors.push(`Level ${level.id}: width must be an integer >= 2.`);
  }
  if (!Number.isInteger(level.height) || level.height < 2) {
    errors.push(`Level ${level.id}: height must be an integer >= 2.`);
  }

  validateExits(level, errors);
  validateCars(level, errors);
  validateHintOrder(level, errors);

  return errors;
}

function validateExits(level: LevelDefinition, errors: string[]): void {
  const seen = new Set<string>();
  for (const exit of level.exits) {
    const label = `Level ${level.id}: exit ${exit.x},${exit.y}`;
    if (!Number.isInteger(exit.x) || !Number.isInteger(exit.y)) {
      errors.push(`${label} must use integer coordinates.`);
      continue;
    }
    if (!isValidDirection(exit.direction)) {
      errors.push(`${label} has invalid direction "${String(exit.direction)}".`);
      continue;
    }
    if (exit.x < 0 || exit.y < 0 || exit.x >= level.width || exit.y >= level.height) {
      errors.push(`${label} is outside the grid.`);
      continue;
    }
    if (!exitIsOnMatchingBoundary(exit, level.width, level.height)) {
      errors.push(`${label} is not on the ${exit.direction} boundary.`);
    }

    const key = `${exit.direction}:${exit.x},${exit.y}`;
    if (seen.has(key)) {
      errors.push(`${label} duplicates another ${exit.direction} exit.`);
    }
    seen.add(key);
  }
}

function validateCars(level: LevelDefinition, errors: string[]): void {
  const seenIds = new Set<string>();
  const occupancy = new Map<string, string>();

  for (const car of level.cars as RuntimeCar[]) {
    const id = typeof car.id === "string" && car.id.trim() ? car.id : "<missing-id>";
    if (seenIds.has(id)) {
      errors.push(`Level ${level.id}: car id "${id}" is duplicated.`);
    }
    seenIds.add(id);

    if (!isValidDirection(car.direction)) {
      errors.push(`Level ${level.id}: ${id} has invalid direction "${String(car.direction)}".`);
    }
    if (!isValidCarLength(car.length)) {
      errors.push(`Level ${level.id}: ${id} has invalid length "${String(car.length)}".`);
    }
    if (!Number.isInteger(car.x) || !Number.isInteger(car.y)) {
      errors.push(`Level ${level.id}: ${id} must use integer coordinates.`);
    }
    if (!isValidDirection(car.direction) || !isValidCarLength(car.length)) {
      continue;
    }

    const cells = occupiedCellsForCar(car);
    if (cells.length === 0 || cells.some((cell) => cell.x < 0 || cell.y < 0 || cell.x >= level.width || cell.y >= level.height)) {
      errors.push(`Level ${level.id}: ${id} is outside the grid.`);
    }
    if (!hasMatchingExit(level.exits, car, level.width, level.height)) {
      errors.push(`Level ${level.id}: ${id} has no matching ${car.direction} exit.`);
    }

    for (const cell of cells) {
      const key = cellKey(cell.x, cell.y);
      const existing = occupancy.get(key);
      if (existing) {
        errors.push(`Level ${level.id}: ${id} overlaps ${existing} at ${key}.`);
      }
      occupancy.set(key, id);
    }
  }
}

function validateHintOrder(level: LevelDefinition, errors: string[]): void {
  if (!level.hintOrder) return;
  const activeIds = new Set(level.cars.map((car) => car.id));
  const seen = new Set<string>();
  for (const carId of level.hintOrder) {
    if (!activeIds.has(carId)) {
      errors.push(`Level ${level.id}: ${carId} appears in hintOrder but is not active.`);
    }
    if (seen.has(carId)) {
      errors.push(`Level ${level.id}: ${carId} appears more than once in hintOrder.`);
    }
    seen.add(carId);
  }
}

function buildOccupancy(cars: CarDefinition[]): Map<string, string> {
  const occupancy = new Map<string, string>();
  for (const car of cars) {
    for (const cell of occupiedCellsForCar(car)) {
      occupancy.set(cellKey(cell.x, cell.y), car.id);
    }
  }
  return occupancy;
}

function pathCellsAhead(car: CarDefinition, width: number, height: number): Cell[] {
  const cells: Cell[] = [];
  if (car.direction === "up") {
    for (let y = car.y - 1; y >= 0; y -= 1) cells.push({ x: car.x, y });
  } else if (car.direction === "down") {
    for (let y = car.y + car.length; y < height; y += 1) cells.push({ x: car.x, y });
  } else if (car.direction === "left") {
    for (let x = car.x - 1; x >= 0; x -= 1) cells.push({ x, y: car.y });
  } else if (car.direction === "right") {
    for (let x = car.x + car.length; x < width; x += 1) cells.push({ x, y: car.y });
  }
  return cells;
}

function hasMatchingExit(exits: ExitDefinition[], car: CarDefinition, width: number, height: number): boolean {
  if (!isValidDirection(car.direction)) return false;
  if (car.direction === "up") {
    return exits.some((exit) => exit.direction === "up" && exit.x === car.x && exit.y === 0);
  }
  if (car.direction === "down") {
    return exits.some((exit) => exit.direction === "down" && exit.x === car.x && exit.y === height - 1);
  }
  if (car.direction === "left") {
    return exits.some((exit) => exit.direction === "left" && exit.x === 0 && exit.y === car.y);
  }
  return exits.some((exit) => exit.direction === "right" && exit.x === width - 1 && exit.y === car.y);
}

function exitIsOnMatchingBoundary(exit: ExitDefinition, width: number, height: number): boolean {
  if (exit.direction === "up") return exit.y === 0;
  if (exit.direction === "down") return exit.y === height - 1;
  if (exit.direction === "left") return exit.x === 0;
  return exit.x === width - 1;
}

function isValidCarLength(length: unknown): length is 2 | 3 {
  return length === 2 || length === 3;
}
