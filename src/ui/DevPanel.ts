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
    injectDevPanelStyles();
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

function injectDevPanelStyles(): void {
  if (document.querySelector("[data-dev-panel-styles]")) return;
  const styles = document.createElement("style");
  styles.dataset.devPanelStyles = "true";
  styles.textContent = `
    .dev-panel {
      position: absolute;
      right: max(10px, env(safe-area-inset-right));
      bottom: max(10px, env(safe-area-inset-bottom));
      width: min(300px, calc(100vw - 20px));
      padding: 10px;
      border: 1px solid rgba(250, 204, 21, 0.4);
      border-radius: 8px;
      background: rgba(17, 24, 39, 0.9);
      color: #f8fafc;
      box-shadow: 0 18px 44px rgba(15, 23, 42, 0.26);
      pointer-events: auto;
    }
    .dev-panel.invalid { border-color: rgba(248, 113, 113, 0.7); }
    .dev-panel-title {
      margin-bottom: 8px;
      color: #facc15;
      font-size: 0.78rem;
      font-weight: 900;
      text-transform: uppercase;
    }
    .dev-panel-stats {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px 10px;
      margin: 0;
    }
    .dev-panel-stats div {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      min-width: 0;
    }
    .dev-panel-stats dt,
    .dev-panel-stats dd {
      margin: 0;
      font-size: 0.76rem;
      line-height: 1.2;
    }
    .dev-panel-stats dt { color: #cbd5e1; }
    .dev-panel-stats dd {
      overflow-wrap: anywhere;
      color: #ffffff;
      font-weight: 800;
      text-align: right;
    }
    .dev-panel-actions {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 5px;
      margin-top: 9px;
    }
    .dev-panel-actions button {
      min-height: 30px;
      border: 0;
      border-radius: 6px;
      padding: 6px 4px;
      background: #e5e7eb;
      color: #111827;
      font-size: 0.68rem;
      font-weight: 900;
      cursor: pointer;
    }
    .dev-panel-message {
      min-height: 16px;
      margin-top: 7px;
      color: #cbd5e1;
      font-size: 0.72rem;
      font-weight: 700;
      line-height: 1.2;
      overflow-wrap: anywhere;
    }
    .dev-panel-message[data-tone="success"] { color: #86efac; }
    .dev-panel-message[data-tone="error"] { color: #fca5a5; }
    @media (max-width: 720px) {
      .dev-panel { width: min(280px, calc(100vw - 20px)); }
    }
  `;
  document.head.append(styles);
}
