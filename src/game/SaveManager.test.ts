import { beforeEach, describe, expect, it, vi } from "vitest";
import { CrazyGamesService } from "../crazygames/CrazyGamesService";
import { SaveManager } from "./SaveManager";
import type { ProgressData } from "./types";

function installLocalStorage(): Map<string, string> {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear()
  });
  return values;
}

describe("SaveManager", () => {
  beforeEach(() => {
    installLocalStorage();
  });

  it("loads default progress when no save exists", async () => {
    const service = {
      loadProgress: vi.fn().mockResolvedValue(undefined),
      saveProgress: vi.fn().mockResolvedValue(undefined)
    } as unknown as CrazyGamesService;
    const manager = new SaveManager(service);

    const progress = await manager.loadProgress("vi-VN");

    expect(progress.currentLevel).toBe(1);
    expect(progress.language).toBe("vi");
    expect(progress.unlockedSkins).toEqual(["classic"]);
  });

  it("saves locally and normalizes loaded progress", async () => {
    const service = {
      loadProgress: vi.fn().mockResolvedValue(undefined),
      saveProgress: vi.fn().mockResolvedValue(undefined)
    } as unknown as CrazyGamesService;
    const manager = new SaveManager(service);
    const progress: ProgressData = {
      currentLevel: 2.4,
      coins: 18.7,
      hints: 1,
      completedLevels: [1, 1],
      unlockedSkins: ["classic"],
      selectedSkin: "classic",
      language: "en",
      soundEnabled: true,
      musicEnabled: false
    };

    manager.saveProgress(progress);
    const loaded = await manager.loadProgress("en-US");

    expect(loaded.currentLevel).toBe(2);
    expect(loaded.coins).toBe(19);
    expect(loaded.completedLevels).toEqual([1]);
    expect(service.saveProgress).toHaveBeenCalledOnce();
  });
});
