import { CrazyGamesService } from "../crazygames/CrazyGamesService";
import { AudioManager } from "../game/AudioManager";
import type { AnalyticsEvent, BreakResult } from "../game/types";
import { ADS_SUPPORTED, requestLevelBreak, requestOptionalReward } from "#ad-provider";

type AdManagerOptions = {
  setPausedForBreak: (paused: boolean) => void;
  track: (event: AnalyticsEvent, data?: Record<string, unknown>) => void;
};

export class AdManager {
  private gameplayStartedAt = 0;
  private activePlayMs = 0;
  private requestingBreak = false;
  private lastBreakFinishedAt = 0;

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

  canUseOptionalRewards(): boolean {
    return ADS_SUPPORTED && this.crazyGames.isInitialized() && !this.requestingBreak;
  }

  async requestLevelBreak(reason: string, completedLevel: number): Promise<boolean> {
    if (!ADS_SUPPORTED) return false;
    const now = performance.now();
    if (this.requestingBreak) return false;
    if (!this.crazyGames.isInitialized()) return false;
    if (completedLevel < 3) return false;
    if (this.currentActivePlayMs() < 120000) return false;
    if (now - this.lastBreakFinishedAt < 90000) return false;

    this.options.track("level_break_requested", { reason, completedLevel });
    const result = await this.requestWithPause(() => requestLevelBreak(this.breakCallbacks()));
    return result.status === "finished";
  }

  async requestOptionalReward(rewardType: string): Promise<boolean> {
    if (!ADS_SUPPORTED) return false;
    if (this.requestingBreak || !this.crazyGames.isInitialized()) return false;
    this.options.track("optional_reward_requested", { rewardType });
    const result = await this.requestWithPause(() => requestOptionalReward(this.breakCallbacks()));
    if (result.status === "finished") {
      this.options.track("optional_reward_completed", { rewardType });
      return true;
    }
    return false;
  }

  private currentActivePlayMs(): number {
    return this.activePlayMs + (this.gameplayStartedAt > 0 ? performance.now() - this.gameplayStartedAt : 0);
  }

  private async requestWithPause(request: () => Promise<BreakResult>): Promise<BreakResult> {
    this.requestingBreak = true;
    this.options.setPausedForBreak(true);
    this.gameplayStop();
    const result = await request();
    if (result.status === "error") {
      this.options.track("break_error", { error: String(result.error ?? "unknown") });
    }
    if (result.status === "finished") {
      this.lastBreakFinishedAt = performance.now();
    }
    this.audio.setBreakMuted(false);
    this.options.setPausedForBreak(false);
    this.requestingBreak = false;
    return result;
  }

  private breakCallbacks(): {
    onStart: () => void;
    onComplete: () => void;
    onError: (error: unknown) => void;
  } {
    return {
      onStart: () => this.audio.setBreakMuted(true),
      onComplete: () => this.audio.setBreakMuted(false),
      onError: (error: unknown) => {
        this.audio.setBreakMuted(false);
        this.options.track("break_error", { error: String(error) });
      }
    };
  }
}
