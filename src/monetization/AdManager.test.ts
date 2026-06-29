import { describe, expect, it, vi } from "vitest";
import { CrazyGamesService } from "../crazygames/CrazyGamesService";
import { AudioManager } from "../game/AudioManager";
import { AdManager } from "./AdManager";

describe("AdManager", () => {
  it("falls back cleanly when ads are unavailable", async () => {
    const pauses: boolean[] = [];
    const manager = new AdManager(new CrazyGamesService(), new AudioManager(), {
      setPausedForAd: (paused) => pauses.push(paused),
      track: vi.fn()
    });

    await expect(manager.requestRewardedAd("bonus_coins")).resolves.toBe(false);
    await expect(manager.requestMidgameAd("level_complete", 10)).resolves.toBe(false);
    expect(pauses).toEqual([]);
  });
});
