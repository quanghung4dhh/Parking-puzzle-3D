export type Direction = "up" | "down" | "left" | "right";

export type CarDefinition = {
  id: string;
  x: number;
  y: number;
  length: 2 | 3;
  direction: Direction;
  color?: string;
};

export type ExitDefinition = {
  x: number;
  y: number;
  direction: Direction;
};

export type LevelDefinition = {
  id: number;
  width: number;
  height: number;
  exits: ExitDefinition[];
  cars: CarDefinition[];
  hintOrder?: string[];
};

export type ProgressData = {
  currentLevel: number;
  coins: number;
  hints: number;
  completedLevels: number[];
  unlockedSkins: string[];
  selectedSkin: string;
  language: LanguageCode;
  soundEnabled: boolean;
  musicEnabled: boolean;
};

export type LanguageCode = "en" | "vi";

export type GameState = "loading" | "playing" | "carMoving" | "menuPaused" | "levelComplete" | "breakPaused";

export type AnalyticsEvent =
  | "level_started"
  | "level_completed"
  | "level_restarted"
  | "hint_used"
  | "optional_reward_requested"
  | "optional_reward_completed"
  | "level_break_requested"
  | "break_error";

export type SkinDefinition = {
  id: string;
  nameKey: string;
  cost: number;
  colors: string[];
};

export type BreakResult =
  | { status: "finished" }
  | { status: "error"; error?: unknown }
  | { status: "unavailable" };
