import { describe, expect, it } from "vitest";
import { levels } from "../data/levels";
import type { CarDefinition, LevelDefinition } from "./types";
import { solveLevel, validateAllLevels, validateLevel } from "./LevelValidator";

describe("LevelValidator", () => {
  it("validates every generated level", () => {
    const result = validateAllLevels(levels);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("produces a solution for every generated level", () => {
    for (const level of levels) {
      const result = solveLevel(level);

      expect(result.solvable).toBe(true);
      expect(result.solution).toHaveLength(level.cars.length);
      expect(new Set(result.solution).size).toBe(level.cars.length);
    }
  });

  it("reports invalid cars clearly", () => {
    const level: LevelDefinition = {
      id: 99,
      width: 3,
      height: 3,
      exits: [{ x: 0, y: 0, direction: "up" }],
      cars: [
        {
          id: "bad-car",
          x: 0,
          y: 0,
          length: 2,
          direction: "diagonal"
        } as unknown as CarDefinition
      ]
    };

    const result = validateLevel(level);

    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("invalid direction");
  });
});
