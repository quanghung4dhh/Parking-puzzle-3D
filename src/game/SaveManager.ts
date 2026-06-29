import { normalizeLanguage } from "../data/localization";
import type { LanguageCode, ProgressData } from "./types";
import { CrazyGamesService } from "../crazygames/CrazyGamesService";

const STORAGE_KEY = "parkingPuzzle3d.progress";

export class SaveManager {
  constructor(private readonly crazyGames: CrazyGamesService) {}

  async loadProgress(locale: string): Promise<ProgressData> {
    const fallback = this.defaultProgress(normalizeLanguage(locale));
    const local = this.loadLocalProgress();
    const sdk = await this.crazyGames.loadProgress();
    return this.normalizeProgress(sdk ?? local ?? fallback, fallback);
  }

  saveProgress(progress: ProgressData): void {
    const normalized = this.normalizeProgress(progress, this.defaultProgress(progress.language));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch (error) {
      console.warn("[SaveManager] localStorage save failed.", error);
    }
    void this.crazyGames.saveProgress(normalized);
  }

  private loadLocalProgress(): ProgressData | undefined {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ProgressData) : undefined;
    } catch (error) {
      console.warn("[SaveManager] localStorage load failed.", error);
      return undefined;
    }
  }

  private defaultProgress(language: LanguageCode): ProgressData {
    return {
      currentLevel: 1,
      coins: 0,
      hints: 3,
      completedLevels: [],
      unlockedSkins: ["classic"],
      selectedSkin: "classic",
      language,
      soundEnabled: true,
      musicEnabled: true
    };
  }

  private normalizeProgress(value: ProgressData, fallback: ProgressData): ProgressData {
    const language = value.language === "vi" ? "vi" : "en";
    const unlocked = Array.isArray(value.unlockedSkins) && value.unlockedSkins.length > 0 ? value.unlockedSkins : fallback.unlockedSkins;
    return {
      currentLevel: Number.isFinite(value.currentLevel) ? Math.max(1, Math.round(value.currentLevel)) : fallback.currentLevel,
      coins: Number.isFinite(value.coins) ? Math.max(0, Math.round(value.coins)) : fallback.coins,
      hints: Number.isFinite(value.hints) ? Math.max(0, Math.round(value.hints)) : fallback.hints,
      completedLevels: Array.isArray(value.completedLevels)
        ? [...new Set(value.completedLevels.filter((level) => Number.isFinite(level)).map((level) => Math.max(1, Math.round(level))))]
        : fallback.completedLevels,
      unlockedSkins: [...new Set(unlocked)],
      selectedSkin: unlocked.includes(value.selectedSkin) ? value.selectedSkin : unlocked[0],
      language,
      soundEnabled: typeof value.soundEnabled === "boolean" ? value.soundEnabled : fallback.soundEnabled,
      musicEnabled: typeof value.musicEnabled === "boolean" ? value.musicEnabled : fallback.musicEnabled
    };
  }
}
