import type { ProgressData } from "../game/types";

type CrazyGamesSdk = {
  init?: () => Promise<void> | void;
  game?: {
    loadingStart?: () => void;
    loadingStop?: () => void;
    gameplayStart?: () => void;
    gameplayStop?: () => void;
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
  private readonly isDevelopment = import.meta.env?.DEV ?? false;

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

  loadingStart(): void {
    try {
      this.sdk?.game?.loadingStart?.();
    } catch (error) {
      this.warn("loadingStart failed.", error);
    }
    this.log("loadingStart");
  }

  loadingStop(): void {
    try {
      this.sdk?.game?.loadingStop?.();
    } catch (error) {
      this.warn("loadingStop failed.", error);
    }
    this.log("loadingStop");
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

  isInitialized(): boolean {
    return this.initialized;
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
