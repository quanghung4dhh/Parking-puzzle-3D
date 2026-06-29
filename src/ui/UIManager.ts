import { SKINS } from "../data/skins";
import { SUPPORTED_LANGUAGES, translate } from "../data/localization";
import type { LanguageCode, ProgressData, SkinDefinition } from "../game/types";

type UICallbacks = {
  onRestart: () => void;
  onHint: () => void;
  onOpenShop: () => void;
  onOpenSettings: () => void;
  onNextLevel: () => void;
  onDoubleCoins: () => void;
  onClosePanel: () => void;
  onUnlockSkin: (skinId: string) => void;
  onSelectSkin: (skinId: string) => void;
  onRewardBonusCoins: () => void;
  onSoundChanged: (enabled: boolean) => void;
  onMusicChanged: (enabled: boolean) => void;
  onLanguageChanged: (language: LanguageCode) => void;
};

type HudState = {
  level: number;
  totalLevels: number;
  coins: number;
  hints: number;
  showInstruction: boolean;
  busy: boolean;
};

type CompleteState = {
  level: number;
  totalLevels: number;
  coinsEarned: number;
  totalCoins: number;
  stars: number;
  canDouble: boolean;
};

export class UIManager {
  private language: LanguageCode;
  private readonly levelText: HTMLElement;
  private readonly coinsText: HTMLElement;
  private readonly hintsText: HTMLElement;
  private readonly instructionText: HTMLElement;
  private readonly restartButton: HTMLButtonElement;
  private readonly hintButton: HTMLButtonElement;
  private readonly shopButton: HTMLButtonElement;
  private readonly settingsButton: HTMLButtonElement;
  private readonly completeModal: HTMLElement;
  private readonly completeTitle: HTMLElement;
  private readonly completeSubtitle: HTMLElement;
  private readonly completeStars: HTMLElement;
  private readonly completeCoins: HTMLElement;
  private readonly completeTotalCoins: HTMLElement;
  private readonly nextButton: HTMLButtonElement;
  private readonly doubleCoinsButton: HTMLButtonElement;
  private readonly shopModal: HTMLElement;
  private readonly shopTitle: HTMLElement;
  private readonly shopCoins: HTMLElement;
  private readonly shopList: HTMLElement;
  private readonly bonusCoinsButton: HTMLButtonElement;
  private readonly settingsModal: HTMLElement;
  private readonly settingsTitle: HTMLElement;
  private readonly soundToggle: HTMLInputElement;
  private readonly musicToggle: HTMLInputElement;
  private readonly languageSelect: HTMLSelectElement;
  private readonly adOverlay: HTMLElement;
  private readonly adOverlayText: HTMLElement;
  private lastHud: HudState | undefined;

  constructor(
    private readonly root: HTMLElement,
    language: LanguageCode,
    private readonly callbacks: UICallbacks
  ) {
    this.language = language;
    this.root.className = "ui-root";
    this.root.innerHTML = this.template();

    this.levelText = this.get("#level-text");
    this.coinsText = this.get("#coins-text");
    this.hintsText = this.get("#hints-text");
    this.instructionText = this.get("#instruction-text");
    this.restartButton = this.get("#restart-button");
    this.hintButton = this.get("#hint-button");
    this.shopButton = this.get("#shop-button");
    this.settingsButton = this.get("#settings-button");
    this.completeModal = this.get("#complete-modal");
    this.completeTitle = this.get("#complete-title");
    this.completeSubtitle = this.get("#complete-subtitle");
    this.completeStars = this.get("#complete-stars");
    this.completeCoins = this.get("#complete-coins");
    this.completeTotalCoins = this.get("#complete-total-coins");
    this.nextButton = this.get("#next-button");
    this.doubleCoinsButton = this.get("#double-coins-button");
    this.shopModal = this.get("#shop-modal");
    this.shopTitle = this.get("#shop-title");
    this.shopCoins = this.get("#shop-coins");
    this.shopList = this.get("#shop-list");
    this.bonusCoinsButton = this.get("#bonus-coins-button");
    this.settingsModal = this.get("#settings-modal");
    this.settingsTitle = this.get("#settings-title");
    this.soundToggle = this.get("#sound-toggle");
    this.musicToggle = this.get("#music-toggle");
    this.languageSelect = this.get("#language-select");
    this.adOverlay = this.get("#ad-overlay");
    this.adOverlayText = this.get("#ad-overlay-text");

    this.bindEvents();
    this.populateLanguages();
    this.setLanguage(language);
  }

  setLanguage(language: LanguageCode): void {
    this.language = language;
    this.applyStaticText();
    if (this.lastHud) {
      this.updateHud(this.lastHud);
    }
  }

  updateHud(state: HudState): void {
    this.lastHud = state;
    this.levelText.textContent = `${translate(this.language, "level")} ${state.level}/${state.totalLevels}`;
    this.coinsText.textContent = `${translate(this.language, "coins")}: ${state.coins}`;
    this.hintsText.textContent = `${translate(this.language, "hints")}: ${state.hints}`;
    this.instructionText.textContent = state.showInstruction ? translate(this.language, "tapInstruction") : "";
    this.instructionText.hidden = !state.showInstruction;
    this.hintButton.disabled = state.busy || state.hints <= 0;
    this.restartButton.disabled = state.busy;
  }

  showComplete(state: CompleteState): void {
    this.completeTitle.textContent = translate(this.language, "levelComplete");
    this.completeSubtitle.textContent = translate(this.language, "completeSubtitle");
    this.completeStars.textContent = `${translate(this.language, "stars")}: ${"\u2605".repeat(state.stars)}`;
    this.completeCoins.textContent = `${translate(this.language, "coinsEarned")}: ${state.coinsEarned}`;
    this.completeTotalCoins.textContent = `${translate(this.language, "coins")}: ${state.totalCoins}`;
    this.nextButton.textContent =
      state.level >= state.totalLevels ? translate(this.language, "replayLevel") : translate(this.language, "nextLevel");
    this.doubleCoinsButton.textContent = translate(this.language, "doubleCoins");
    this.doubleCoinsButton.hidden = !state.canDouble;
    this.doubleCoinsButton.disabled = !state.canDouble;
    this.completeModal.hidden = false;
  }

  updateCompleteCoins(coinsEarned: number, totalCoins: number, canDouble: boolean): void {
    this.completeCoins.textContent = `${translate(this.language, "coinsEarned")}: ${coinsEarned}`;
    this.completeTotalCoins.textContent = `${translate(this.language, "coins")}: ${totalCoins}`;
    this.doubleCoinsButton.hidden = !canDouble;
    this.doubleCoinsButton.disabled = !canDouble;
  }

  hideComplete(): void {
    this.completeModal.hidden = true;
  }

  showShop(progress: ProgressData, rewardedAvailable: boolean): void {
    this.shopTitle.textContent = translate(this.language, "shop");
    this.shopCoins.textContent = `${translate(this.language, "coins")}: ${progress.coins}`;
    this.renderSkins(progress);
    this.bonusCoinsButton.textContent = translate(this.language, rewardedAvailable ? "bonusCoins" : "adsUnavailable");
    this.bonusCoinsButton.hidden = !rewardedAvailable;
    this.bonusCoinsButton.disabled = !rewardedAvailable;
    this.shopModal.hidden = false;
  }

  hideShop(): void {
    this.shopModal.hidden = true;
  }

  showSettings(progress: ProgressData): void {
    this.settingsTitle.textContent = translate(this.language, "settings");
    this.soundToggle.checked = progress.soundEnabled;
    this.musicToggle.checked = progress.musicEnabled;
    this.languageSelect.value = progress.language;
    this.settingsModal.hidden = false;
  }

  hideSettings(): void {
    this.settingsModal.hidden = true;
  }

  setAdBusy(busy: boolean): void {
    this.adOverlay.hidden = !busy;
    this.adOverlayText.textContent = translate(this.language, "adLoading");
    this.restartButton.disabled = busy;
    this.hintButton.disabled = busy || (this.lastHud?.hints ?? 0) <= 0;
    this.shopButton.disabled = busy;
    this.settingsButton.disabled = busy;
    this.nextButton.disabled = busy;
    this.doubleCoinsButton.disabled = busy || this.doubleCoinsButton.hidden;
    this.bonusCoinsButton.disabled = busy || this.bonusCoinsButton.hidden;
  }

  closePanels(): void {
    this.hideShop();
    this.hideSettings();
  }

  private renderSkins(progress: ProgressData): void {
    this.shopList.textContent = "";
    for (const skin of SKINS) {
      const card = document.createElement("div");
      card.className = "skin-card";
      card.append(this.createSkinSwatches(skin));

      const name = document.createElement("div");
      name.className = "skin-name";
      name.textContent = translate(this.language, skin.nameKey);

      const action = document.createElement("button");
      action.className = "ui-button compact";
      const unlocked = progress.unlockedSkins.includes(skin.id);
      const selected = progress.selectedSkin === skin.id;
      if (selected) {
        action.textContent = translate(this.language, "selected");
        action.disabled = true;
      } else if (unlocked) {
        action.textContent = translate(this.language, "select");
        action.addEventListener("click", () => this.callbacks.onSelectSkin(skin.id));
      } else {
        action.textContent = `${translate(this.language, "unlock")} ${skin.cost}`;
        action.disabled = progress.coins < skin.cost;
        action.title = progress.coins < skin.cost ? translate(this.language, "notEnoughCoins") : "";
        action.addEventListener("click", () => this.callbacks.onUnlockSkin(skin.id));
      }

      card.append(name, action);
      this.shopList.append(card);
    }
  }

  private createSkinSwatches(skin: SkinDefinition): HTMLElement {
    const swatches = document.createElement("div");
    swatches.className = "skin-swatches";
    for (const color of skin.colors.slice(0, 4)) {
      const swatch = document.createElement("span");
      swatch.className = "skin-swatch";
      swatch.style.background = color;
      swatches.append(swatch);
    }
    return swatches;
  }

  private bindEvents(): void {
    this.restartButton.addEventListener("click", this.callbacks.onRestart);
    this.hintButton.addEventListener("click", this.callbacks.onHint);
    this.shopButton.addEventListener("click", this.callbacks.onOpenShop);
    this.settingsButton.addEventListener("click", this.callbacks.onOpenSettings);
    this.nextButton.addEventListener("click", this.callbacks.onNextLevel);
    this.doubleCoinsButton.addEventListener("click", this.callbacks.onDoubleCoins);
    this.bonusCoinsButton.addEventListener("click", this.callbacks.onRewardBonusCoins);
    this.root.querySelectorAll<HTMLButtonElement>("[data-close-panel]").forEach((button) => {
      button.addEventListener("click", this.callbacks.onClosePanel);
    });
    this.soundToggle.addEventListener("change", () => this.callbacks.onSoundChanged(this.soundToggle.checked));
    this.musicToggle.addEventListener("change", () => this.callbacks.onMusicChanged(this.musicToggle.checked));
    this.languageSelect.addEventListener("change", () => {
      const value = this.languageSelect.value === "vi" ? "vi" : "en";
      this.callbacks.onLanguageChanged(value);
    });
  }

  private populateLanguages(): void {
    this.languageSelect.textContent = "";
    for (const language of SUPPORTED_LANGUAGES) {
      const option = document.createElement("option");
      option.value = language;
      option.textContent = language === "vi" ? "Vietnamese" : "English";
      this.languageSelect.append(option);
    }
  }

  private applyStaticText(): void {
    this.restartButton.textContent = translate(this.language, "restart");
    this.hintButton.textContent = translate(this.language, "hint");
    this.shopButton.textContent = translate(this.language, "shop");
    this.settingsButton.textContent = translate(this.language, "settings");
    this.shopTitle.textContent = translate(this.language, "shop");
    this.settingsTitle.textContent = translate(this.language, "settings");
    this.get("#sound-label").textContent = translate(this.language, "sound");
    this.get("#music-label").textContent = translate(this.language, "music");
    this.get("#language-label").textContent = translate(this.language, "language");
    this.root.querySelectorAll<HTMLElement>("[data-close-panel]").forEach((element) => {
      element.textContent = translate(this.language, "close");
    });
  }

  private template(): string {
    return `
      <section class="hud" aria-label="Game HUD">
        <div class="hud-meters">
          <div class="hud-pill" id="level-text"></div>
          <div class="hud-pill" id="coins-text"></div>
          <div class="hud-pill" id="hints-text"></div>
        </div>
        <div class="hud-actions">
          <button class="ui-button" id="restart-button" type="button"></button>
          <button class="ui-button" id="hint-button" type="button"></button>
          <button class="ui-button" id="shop-button" type="button"></button>
          <button class="ui-button" id="settings-button" type="button"></button>
        </div>
      </section>

      <div class="instruction" id="instruction-text" hidden></div>

      <section class="modal-layer" id="complete-modal" hidden aria-label="Level complete">
        <div class="modal-panel complete-panel">
          <h1 id="complete-title"></h1>
          <p id="complete-subtitle"></p>
          <div class="score-row" id="complete-stars"></div>
          <div class="score-row" id="complete-coins"></div>
          <div class="score-row" id="complete-total-coins"></div>
          <div class="modal-actions">
            <button class="ui-button primary" id="next-button" type="button"></button>
            <button class="ui-button" id="double-coins-button" type="button"></button>
          </div>
        </div>
      </section>

      <section class="modal-layer" id="shop-modal" hidden aria-label="Shop">
        <div class="modal-panel shop-panel">
          <div class="panel-heading">
            <h2 id="shop-title"></h2>
            <div class="hud-pill" id="shop-coins"></div>
          </div>
          <div class="skin-list" id="shop-list"></div>
          <div class="modal-actions">
            <button class="ui-button" id="bonus-coins-button" type="button"></button>
            <button class="ui-button primary" data-close-panel type="button"></button>
          </div>
        </div>
      </section>

      <section class="modal-layer" id="settings-modal" hidden aria-label="Settings">
        <div class="modal-panel settings-panel">
          <h2 id="settings-title"></h2>
          <label class="settings-row">
            <span id="sound-label"></span>
            <input id="sound-toggle" type="checkbox" />
          </label>
          <label class="settings-row">
            <span id="music-label"></span>
            <input id="music-toggle" type="checkbox" />
          </label>
          <label class="settings-row">
            <span id="language-label"></span>
            <select id="language-select"></select>
          </label>
          <div class="modal-actions">
            <button class="ui-button primary" data-close-panel type="button"></button>
          </div>
        </div>
      </section>

      <section class="ad-overlay" id="ad-overlay" hidden aria-live="polite">
        <div class="ad-box" id="ad-overlay-text"></div>
      </section>
    `;
  }

  private get<T extends HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) {
      throw new Error(`Missing UI element ${selector}`);
    }
    return element;
  }
}
