import type { AdResult, ProgressData } from "../game/types";

type AdCallbacks = {
  adStarted?: () => void;
  adFinished?: () => void;
  adError?: (error: unknown) => void;
};

type CrazyGamesSdk = {
  init?: () => Promise<void> | void;
  game?: {
    gameplayStart?: () => void;
    gameplayStop?: () => void;
  };
  ad?: {
    requestAd?: (type: "midgame" | "rewarded", callbacks: AdCallbacks) => Promise<void> | void;
  };
  data?: {
    getItem?: (key: string) => Promise<string | null | undefined> | string | null | undefined;
    setItem?: (key: string, value: string) => Promise<void> | void;
  };
  environment?: {
    locale?: string;
  };
};

const SAVE_KEY = "parkingPuzzle3d.progress";

export class CrazyGamesService {
  private sdk: CrazyGamesSdk | undefined;
  private initialized = false;
  private gameplayActive = false;
  private readonly isDevelopment = import.meta.env.DEV;

  async initCrazyGamesSdk(): Promise<boolean> {
    const candidate = window.CrazyGames?.SDK ?? window.Crazygames?.SDK;
    if (!candidate) {
      this.log("SDK unavailable; using local fallbacks.");
      return false;
    }

    this.sdk = candidate;
    try {
      await candidate.init?.();
      this.initialized = true;
      this.log("SDK initialized.");
      return true;
    } catch (error) {
      this.initialized = false;
      this.warn("SDK init failed; using local fallbacks.", error);
      return false;
    }
  }

  gameplayStart(): void {
    if (this.gameplayActive) return;
    this.gameplayActive = true;
    try {
      this.sdk?.game?.gameplayStart?.();
    } catch (error) {
      this.warn("gameplayStart failed.", error);
    }
    this.log("gameplayStart");
  }

  gameplayStop(): void {
    if (!this.gameplayActive) return;
    this.gameplayActive = false;
    try {
      this.sdk?.game?.gameplayStop?.();
    } catch (error) {
      this.warn("gameplayStop failed.", error);
    }
    this.log("gameplayStop");
  }

  async requestMidgameAd(reason: string, callbacks: AdCallbacks = {}): Promise<AdResult> {
    this.log(`requestMidgameAd: ${reason}`);
    return this.requestAd("midgame", callbacks);
  }

  async requestRewardedAd(rewardType: string, callbacks: AdCallbacks = {}): Promise<AdResult> {
    this.log(`requestRewardedAd: ${rewardType}`);
    return this.requestAd("rewarded", callbacks);
  }

  async saveProgress(data: ProgressData): Promise<void> {
    if (!this.sdk?.data?.setItem) return;
    try {
      await this.sdk.data.setItem(SAVE_KEY, JSON.stringify(data));
      this.log("Progress saved to CrazyGames Data.");
    } catch (error) {
      this.warn("SDK save failed; localStorage remains authoritative.", error);
    }
  }

  async loadProgress(): Promise<ProgressData | undefined> {
    if (!this.sdk?.data?.getItem) return undefined;
    try {
      const raw = await this.sdk.data.getItem(SAVE_KEY);
      if (!raw) return undefined;
      return JSON.parse(raw) as ProgressData;
    } catch (error) {
      this.warn("SDK load failed; falling back to localStorage.", error);
      return undefined;
    }
  }

  getLocale(): string {
    return this.sdk?.environment?.locale ?? navigator.language ?? "en";
  }

  areAdsAvailable(): boolean {
    return this.initialized && typeof this.sdk?.ad?.requestAd === "function";
  }

  private async requestAd(type: "midgame" | "rewarded", callbacks: AdCallbacks): Promise<AdResult> {
    const requestAd = this.sdk?.ad?.requestAd;
    if (!this.areAdsAvailable() || !requestAd) {
      this.log(`${type} ad unavailable.`);
      return { status: "unavailable" };
    }

    return new Promise<AdResult>((resolve) => {
      let resolved = false;
      const finish = (result: AdResult): void => {
        if (resolved) return;
        resolved = true;
        window.clearTimeout(timeout);
        resolve(result);
      };
      const timeout = window.setTimeout(() => {
        callbacks.adError?.("ad-timeout");
        finish({ status: "error", error: "ad-timeout" });
      }, 90000);

      try {
        const maybePromise = requestAd(type, {
          adStarted: () => {
            this.log(`${type} ad started.`);
            callbacks.adStarted?.();
          },
          adFinished: () => {
            this.log(`${type} ad finished.`);
            callbacks.adFinished?.();
            finish({ status: "finished" });
          },
          adError: (error: unknown) => {
            this.warn(`${type} ad error.`, error);
            callbacks.adError?.(error);
            finish({ status: "error", error });
          }
        });
        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise.catch((error: unknown) => {
            callbacks.adError?.(error);
            finish({ status: "error", error });
          });
        }
      } catch (error) {
        callbacks.adError?.(error);
        finish({ status: "error", error });
      }
    });
  }

  private log(message: string): void {
    if (this.isDevelopment) {
      console.info(`[CrazyGamesService] ${message}`);
    }
  }

  private warn(message: string, error?: unknown): void {
    if (this.isDevelopment) {
      console.warn(`[CrazyGamesService] ${message}`, error);
    }
  }
}

declare global {
  interface Window {
    CrazyGames?: { SDK?: CrazyGamesSdk };
    Crazygames?: { SDK?: CrazyGamesSdk };
  }
}
