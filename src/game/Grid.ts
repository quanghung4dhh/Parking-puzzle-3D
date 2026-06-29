import type { CarDefinition, Direction, ExitDefinition, LevelDefinition } from "./types";

export type PathCheck = {
  canExit: boolean;
  blockerId?: string;
};

export function directionVector(direction: Direction): { x: number; y: number } {
  if (direction === "up") return { x: 0, y: -1 };
  if (direction === "down") return { x: 0, y: 1 };
  if (direction === "left") return { x: -1, y: 0 };
  return { x: 1, y: 0 };
}

export function occupiedCells(car: Pick<CarDefinition, "x" | "y" | "length" | "direction">): Array<{ x: number; y: number }> {
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

export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

export class Grid {
  private readonly width: number;
  private readonly height: number;
  private readonly exits: ExitDefinition[];
  private occupancy = new Map<string, string>();

  constructor(level: LevelDefinition) {
    this.width = level.width;
    this.height = level.height;
    this.exits = level.exits;
  }

  rebuild(cars: CarDefinition[]): void {
    this.occupancy.clear();
    for (const car of cars) {
      for (const cell of occupiedCells(car)) {
        this.occupancy.set(cellKey(cell.x, cell.y), car.id);
      }
    }
  }

  canCarExit(car: CarDefinition, cars: CarDefinition[]): PathCheck {
    if (!this.hasExitForCar(car)) {
      return { canExit: false };
    }

    const occupancy = new Map<string, string>();
    for (const other of cars) {
      if (other.id === car.id) continue;
      for (const cell of occupiedCells(other)) {
        occupancy.set(cellKey(cell.x, cell.y), other.id);
      }
    }

    for (const cell of this.pathCellsAhead(car)) {
      const blockerId = occupancy.get(cellKey(cell.x, cell.y));
      if (blockerId) {
        return { canExit: false, blockerId };
      }
    }

    return { canExit: true };
  }

  findNextMovable(cars: CarDefinition[]): string | undefined {
    return cars.find((car) => this.canCarExit(car, cars).canExit)?.id;
  }

  private hasExitForCar(car: CarDefinition): boolean {
    if (car.direction === "up") {
      return this.exits.some((exit) => exit.direction === "up" && exit.x === car.x && exit.y === 0);
    }
    if (car.direction === "down") {
      return this.exits.some((exit) => exit.direction === "down" && exit.x === car.x && exit.y === this.height - 1);
    }
    if (car.direction === "left") {
      return this.exits.some((exit) => exit.direction === "left" && exit.x === 0 && exit.y === car.y);
    }
    return this.exits.some((exit) => exit.direction === "right" && exit.x === this.width - 1 && exit.y === car.y);
  }

  private pathCellsAhead(car: CarDefinition): Array<{ x: number; y: number }> {
    const cells: Array<{ x: number; y: number }> = [];
    if (car.direction === "up") {
      for (let y = car.y - 1; y >= 0; y -= 1) cells.push({ x: car.x, y });
    } else if (car.direction === "down") {
      for (let y = car.y + car.length; y < this.height; y += 1) cells.push({ x: car.x, y });
    } else if (car.direction === "left") {
      for (let x = car.x - 1; x >= 0; x -= 1) cells.push({ x, y: car.y });
    } else {
      for (let x = car.x + car.length; x < this.width; x += 1) cells.push({ x, y: car.y });
    }
    return cells;
  }
}
