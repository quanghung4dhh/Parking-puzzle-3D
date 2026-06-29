import { describe, expect, it } from "vitest";
import { Grid } from "./Grid";
import type { CarDefinition, LevelDefinition } from "./types";

const level: LevelDefinition = {
  id: 1,
  width: 4,
  height: 3,
  exits: [
    { x: 3, y: 0, direction: "right" },
    { x: 3, y: 1, direction: "right" },
    { x: 2, y: 2, direction: "down" }
  ],
  cars: []
};

describe("Grid", () => {
  it("allows a clear-path car to exit", () => {
    const cars: CarDefinition[] = [{ id: "clear", x: 0, y: 1, length: 2, direction: "right" }];
    const grid = new Grid(level);

    expect(grid.canCarExit(cars[0], cars)).toEqual({ canExit: true });
  });

  it("blocks a car when another car occupies its path", () => {
    const cars: CarDefinition[] = [
      { id: "blocked", x: 0, y: 0, length: 2, direction: "right" },
      { id: "blocker", x: 2, y: 0, length: 2, direction: "down" }
    ];
    const grid = new Grid(level);

    expect(grid.canCarExit(cars[0], cars)).toEqual({ canExit: false, blockerId: "blocker" });
  });
});
