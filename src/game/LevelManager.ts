import { levels, validateAllLevels } from "../data/levels";
import type { LevelDefinition } from "./types";

export class LevelManager {
  readonly levels: LevelDefinition[];

  constructor() {
    this.levels = levels;
    const validation = validateAllLevels(this.levels);
    if (import.meta.env?.DEV) {
      if (!validation.valid) {
        console.warn("[LevelManager] Level validation errors", validation.errors);
      } else {
        console.info(`[LevelManager] ${this.levels.length} levels validated.`);
      }
    }
  }

  get totalLevels(): number {
    return this.levels.length;
  }

  getLevel(levelId: number): LevelDefinition {
    const clamped = this.clampLevel(levelId);
    const level = this.levels.find((candidate) => candidate.id === clamped);
    if (!level) {
      throw new Error(`Level ${levelId} is missing.`);
    }
    return {
      ...level,
      exits: level.exits.map((exit) => ({ ...exit })),
      cars: level.cars.map((car) => ({ ...car })),
      hintOrder: level.hintOrder ? [...level.hintOrder] : undefined
    };
  }

  clampLevel(levelId: number): number {
    if (!Number.isFinite(levelId)) return 1;
    return Math.min(Math.max(Math.round(levelId), 1), this.totalLevels);
  }

  nextLevelId(levelId: number): number {
    return levelId >= this.totalLevels ? this.totalLevels : levelId + 1;
  }
}
