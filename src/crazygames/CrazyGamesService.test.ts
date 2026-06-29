import { afterEach, describe, expect, it, vi } from "vitest";
import { CrazyGamesService } from "./CrazyGamesService";

describe("CrazyGamesService", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not crash when the SDK is unavailable", async () => {
    vi.stubGlobal("window", {
      CrazyGames: undefined,
      Crazygames: undefined,
      clearTimeout,
      setTimeout
    });
    vi.stubGlobal("navigator", { language: "en-US" });

    const service = new CrazyGamesService();

    await expect(service.initCrazyGamesSdk()).resolves.toBe(false);
    expect(service.getLocale()).toBe("en-US");
    expect(() => {
      service.loadingStart();
      service.loadingStop();
      service.gameplayStart();
      service.gameplayStop();
    }).not.toThrow();
  });
});
