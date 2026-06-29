import { describe, expect, it, vi } from "vitest";
import { CrazyGamesService } from "../crazygames/CrazyGamesService";
import { AudioManager } from "../game/AudioManager";
import { AdManager } from "./AdManager";

describe("AdManager", () => {
  it("does not pause or block gameplay when Basic Launch ads are disabled", async () => {
    const pauses: boolean[] = [];
    const track = vi.fn();
    const manager = new AdManager(new CrazyGamesService(), new AudioManager(), {
      setPausedForBreak: (paused) => pauses.push(paused),
      track
    });

    await expect(manager.requestOptionalReward("bonus_coins")).resolves.toBe(false);
    await expect(manager.requestLevelBreak("level_complete", 10)).resolves.toBe(false);
    expect(manager.canUseOptionalRewards()).toBe(false);
    expect(pauses).toEqual([]);
    expect(track).not.toHaveBeenCalled();
  });
});
