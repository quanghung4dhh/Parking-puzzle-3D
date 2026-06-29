import type { DifficultyTier } from "../game/LevelValidator";

type DevPanelCallbacks = {
  onPreviousLevel: () => void;
  onNextLevel: () => void;
  onRestartLevel: () => void;
  onValidateCurrentLevel: () => void;
  onValidateAllLevels: () => void;
};

export type DevPanelState = {
  level: number;
  totalLevels: number;
  carCount: number;
  difficultyScore: number;
  difficultyTier: DifficultyTier;
  solutionLength: number;
  solvable: boolean;
  fps: number;
};

export class DevPanel {
  private readonly panel: HTMLElement;
  private readonly message: HTMLElement;
  private readonly fields = new Map<string, HTMLElement>();

  constructor(parent: HTMLElement, callbacks: DevPanelCallbacks) {
    this.panel = document.createElement("section");
    this.panel.className = "dev-panel";
    this.panel.setAttribute("aria-label", "Developer testing panel");
    this.panel.innerHTML = this.template();
    parent.append(this.panel);

    this.panel.querySelectorAll<HTMLElement>("[data-dev-field]").forEach((element) => {
      this.fields.set(element.dataset.devField ?? "", element);
    });
    this.message = this.get("[data-dev-message]");

    this.bind("[data-dev-action='previous']", callbacks.onPreviousLevel);
    this.bind("[data-dev-action='next']", callbacks.onNextLevel);
    this.bind("[data-dev-action='restart']", callbacks.onRestartLevel);
    this.bind("[data-dev-action='validate-current']", callbacks.onValidateCurrentLevel);
    this.bind("[data-dev-action='validate-all']", callbacks.onValidateAllLevels);
  }

  update(state: DevPanelState): void {
    this.setField("level", `${state.level}/${state.totalLevels}`);
    this.setField("cars", String(state.carCount));
    this.setField("difficulty", `${state.difficultyScore} ${state.difficultyTier}`);
    this.setField("solution", String(state.solutionLength));
    this.setField("solvable", state.solvable ? "yes" : "no");
    this.setField("fps", state.fps > 0 ? state.fps.toFixed(0) : "--");
    this.panel.classList.toggle("invalid", !state.solvable);
  }

  setMessage(message: string, tone: "info" | "success" | "error" = "info"): void {
    this.message.textContent = message;
    this.message.dataset.tone = tone;
  }

  private setField(key: string, value: string): void {
    const field = this.fields.get(key);
    if (field) {
      field.textContent = value;
    }
  }

  private bind(selector: string, callback: () => void): void {
    this.get<HTMLButtonElement>(selector).addEventListener("click", callback);
  }

  private get<T extends HTMLElement = HTMLElement>(selector: string): T {
    const element = this.panel.querySelector<T>(selector);
    if (!element) {
      throw new Error(`Missing dev panel element ${selector}`);
    }
    return element;
  }

  private template(): string {
    return `
      <div class="dev-panel-title">Dev Panel</div>
      <dl class="dev-panel-stats">
        <div><dt>Level</dt><dd data-dev-field="level"></dd></div>
        <div><dt>Cars</dt><dd data-dev-field="cars"></dd></div>
        <div><dt>Difficulty</dt><dd data-dev-field="difficulty"></dd></div>
        <div><dt>Solution</dt><dd data-dev-field="solution"></dd></div>
        <div><dt>Solvable</dt><dd data-dev-field="solvable"></dd></div>
        <div><dt>FPS</dt><dd data-dev-field="fps"></dd></div>
      </dl>
      <div class="dev-panel-actions">
        <button type="button" data-dev-action="previous">Prev</button>
        <button type="button" data-dev-action="next">Next</button>
        <button type="button" data-dev-action="restart">Restart</button>
        <button type="button" data-dev-action="validate-current">Validate</button>
        <button type="button" data-dev-action="validate-all">All</button>
      </div>
      <div class="dev-panel-message" data-dev-message data-tone="info"></div>
    `;
  }
}
