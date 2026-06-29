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

export type GameState = "loading" | "playing" | "carMoving" | "menuPaused" | "levelComplete" | "adPaused";

export type AnalyticsEvent =
  | "level_started"
  | "level_completed"
  | "level_restarted"
  | "hint_used"
  | "rewarded_ad_requested"
  | "rewarded_ad_completed"
  | "midgame_ad_requested"
  | "ad_error";

export type SkinDefinition = {
  id: string;
  nameKey: string;
  cost: number;
  colors: string[];
};

export type AdResult =
  | { status: "finished" }
  | { status: "error"; error?: unknown }
  | { status: "unavailable" };
