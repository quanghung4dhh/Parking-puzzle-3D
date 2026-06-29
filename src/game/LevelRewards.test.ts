import { describe, expect, it } from "vitest";
import { levels } from "../data/levels";
import { applyCompletionReward, calculateCompletionReward } from "./LevelRewards";
import type { ProgressData } from "./types";

describe("LevelRewards", () => {
  it("applies level completion rewards once per completion", () => {
    const level = levels[4];
    const progress: ProgressData = {
      currentLevel: level.id,
      coins: 0,
      hints: 3,
      completedLevels: [],
      unlockedSkins: ["classic"],
      selectedSkin: "classic",
      language: "en",
      soundEnabled: true,
      musicEnabled: true
    };

    const reward = calculateCompletionReward(level, level.cars.length);
    applyCompletionReward(progress, level, reward);

    expect(reward.stars).toBe(3);
    expect(reward.grantsHint).toBe(true);
    expect(progress.coins).toBe(reward.coinsEarned);
    expect(progress.hints).toBe(4);
    expect(progress.completedLevels).toEqual([level.id]);
  });
});
