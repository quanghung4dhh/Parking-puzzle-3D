import type { SkinDefinition } from "../game/types";

export const SKINS: SkinDefinition[] = [
  {
    id: "classic",
    nameKey: "skinClassic",
    cost: 0,
    colors: ["#f04f45", "#2f80ed", "#f2c94c", "#27ae60", "#bb6bd9", "#f2994a"]
  },
  {
    id: "mint",
    nameKey: "skinMint",
    cost: 120,
    colors: ["#15c8a9", "#35d4e8", "#f4d35e", "#ee6c4d", "#6a7fdb", "#ffffff"]
  },
  {
    id: "sunset",
    nameKey: "skinSunset",
    cost: 220,
    colors: ["#ff6b6b", "#ffd166", "#06d6a0", "#118ab2", "#ef476f", "#f78c6b"]
  },
  {
    id: "carbon",
    nameKey: "skinCarbon",
    cost: 360,
    colors: ["#2b2d42", "#8d99ae", "#edf2f4", "#ef233c", "#f7b801", "#21a0a0"]
  },
  {
    id: "bubble",
    nameKey: "skinBubble",
    cost: 520,
    colors: ["#ff70a6", "#70d6ff", "#ff9770", "#e9ff70", "#c77dff", "#ffffff"]
  }
];

export function getSkin(id: string): SkinDefinition {
  return SKINS.find((skin) => skin.id === id) ?? SKINS[0];
}
