import type { LevelDefinition, ProgressData } from "./types";

export type CompletionReward = {
  targetAttempts: number;
  stars: number;
  coinsEarned: number;
  grantsHint: boolean;
};

export function calculateCompletionReward(level: LevelDefinition, attempts: number): CompletionReward {
  const targetAttempts = level.cars.length + Math.ceil(level.id / 15);
  const stars = attempts <= targetAttempts ? 3 : attempts <= targetAttempts + 3 ? 2 : 1;
  const coinsEarned = 10 + stars * 5 + Math.min(20, Math.floor(level.id / 2));
  return {
    targetAttempts,
    stars,
    coinsEarned,
    grantsHint: level.id % 5 === 0
  };
}

export function applyCompletionReward(progress: ProgressData, level: LevelDefinition, reward: CompletionReward): void {
  progress.coins += reward.coinsEarned;
  if (!progress.completedLevels.includes(level.id)) {
    progress.completedLevels.push(level.id);
  }
  if (reward.grantsHint) {
    progress.hints += 1;
  }
}
