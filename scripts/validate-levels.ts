import { levels } from "../src/data/levels";
import { validateAllLevels } from "../src/game/LevelValidator";

const result = validateAllLevels(levels);

for (const [index, levelResult] of result.results.entries()) {
  const level = levels[index];
  const difficulty = levelResult.difficulty;
  const status = levelResult.valid ? "ok" : "invalid";
  console.log(
    `Level ${String(level.id).padStart(2)} ${difficulty.tier.padEnd(8)} ${String(difficulty.carCount).padStart(2)} cars ` +
      `score ${String(difficulty.score).padStart(3)} solution ${String(levelResult.solution.length).padStart(2)} ${status}`
  );
}

if (!result.valid) {
  console.error("\nLevel validation failed:");
  for (const error of result.errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(`\nValidated ${levels.length} levels successfully.`);
}
