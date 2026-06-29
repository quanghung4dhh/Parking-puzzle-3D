import { CrazyGamesService } from "../crazygames/CrazyGamesService";
import { AudioManager } from "../game/AudioManager";
import type { AdResult, AnalyticsEvent } from "../game/types";

type AdManagerOptions = {
  setPausedForAd: (paused: boolean) => void;
  track: (event: AnalyticsEvent, data?: Record<string, unknown>) => void;
};

export class AdManager {
  private gameplayStartedAt = 0;
  private activePlayMs = 0;
  private requestingAd = false;
  private lastAdFinishedAt = 0;

  constructor(
    private readonly crazyGames: CrazyGamesService,
    private readonly audio: AudioManager,
    private readonly options: AdManagerOptions
  ) {}

  gameplayStart(): void {
    if (this.gameplayStartedAt > 0) return;
    this.gameplayStartedAt = performance.now();
    this.crazyGames.gameplayStart();
  }

  gameplayStop(): void {
    if (this.gameplayStartedAt > 0) {
      this.activePlayMs += performance.now() - this.gameplayStartedAt;
      this.gameplayStartedAt = 0;
    }
    this.crazyGames.gameplayStop();
  }

  canRewardedAds(): boolean {
    return this.crazyGames.areAdsAvailable() && !this.requestingAd;
  }

  async requestMidgameAd(reason: string, completedLevel: number): Promise<boolean> {
    const now = performance.now();
    if (this.requestingAd) return false;
    if (!this.crazyGames.areAdsAvailable()) return false;
    if (completedLevel < 3) return false;
    if (this.currentActivePlayMs() < 120000) return false;
    if (now - this.lastAdFinishedAt < 90000) return false;

    this.options.track("midgame_ad_requested", { reason, completedLevel });
    const result = await this.requestAdWithPause(() => this.crazyGames.requestMidgameAd(reason, this.videoCallbacks()));
    return result.status === "finished";
  }

  async requestRewardedAd(rewardType: string): Promise<boolean> {
    if (this.requestingAd || !this.crazyGames.areAdsAvailable()) return false;
    this.options.track("rewarded_ad_requested", { rewardType });
    const result = await this.requestAdWithPause(() => this.crazyGames.requestRewardedAd(rewardType, this.videoCallbacks()));
    if (result.status === "finished") {
      this.options.track("rewarded_ad_completed", { rewardType });
      return true;
    }
    return false;
  }

  private currentActivePlayMs(): number {
    return this.activePlayMs + (this.gameplayStartedAt > 0 ? performance.now() - this.gameplayStartedAt : 0);
  }

  private async requestAdWithPause(request: () => Promise<AdResult>): Promise<AdResult> {
    this.requestingAd = true;
    this.options.setPausedForAd(true);
    this.gameplayStop();
    const result = await request();
    if (result.status === "error") {
      this.options.track("ad_error", { error: String(result.error ?? "unknown") });
    }
    if (result.status === "finished") {
      this.lastAdFinishedAt = performance.now();
    }
    this.audio.setAdMuted(false);
    this.options.setPausedForAd(false);
    this.requestingAd = false;
    return result;
  }

  private videoCallbacks(): {
    adStarted: () => void;
    adFinished: () => void;
    adError: (error: unknown) => void;
  } {
    return {
      adStarted: () => this.audio.setAdMuted(true),
      adFinished: () => this.audio.setAdMuted(false),
      adError: (error: unknown) => {
        this.audio.setAdMuted(false);
        this.options.track("ad_error", { error: String(error) });
      }
    };
  }
}
