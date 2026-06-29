import type { LanguageCode } from "../game/types";

export const SUPPORTED_LANGUAGES: LanguageCode[] = ["en", "vi"];

type TranslationKey =
  | "title"
  | "level"
  | "coins"
  | "hints"
  | "restart"
  | "hint"
  | "shop"
  | "settings"
  | "tapInstruction"
  | "levelComplete"
  | "coinsEarned"
  | "nextLevel"
  | "replayLevel"
  | "doubleCoins"
  | "bonusCoins"
  | "close"
  | "sound"
  | "music"
  | "language"
  | "unlock"
  | "select"
  | "selected"
  | "notEnoughCoins"
  | "adLoading"
  | "adsUnavailable"
  | "skinClassic"
  | "skinMint"
  | "skinSunset"
  | "skinCarbon"
  | "skinBubble"
  | "stars"
  | "completeSubtitle";

const EN: Record<TranslationKey, string> = {
  title: "Parking Puzzle 3D",
  level: "Level",
  coins: "Coins",
  hints: "Hints",
  restart: "Restart",
  hint: "Hint",
  shop: "Shop",
  settings: "Settings",
  tapInstruction: "Tap cars with a clear lane to exit",
  levelComplete: "Lot cleared",
  coinsEarned: "Coins earned",
  nextLevel: "Next Level",
  replayLevel: "Replay",
  doubleCoins: "Double Coins",
  bonusCoins: "Bonus Coins",
  close: "Close",
  sound: "Sound",
  music: "Music",
  language: "Language",
  unlock: "Unlock",
  select: "Select",
  selected: "Selected",
  notEnoughCoins: "Need more coins",
  adLoading: "Ad loading",
  adsUnavailable: "Ads unavailable",
  skinClassic: "Classic",
  skinMint: "Mint Pop",
  skinSunset: "Sunset",
  skinCarbon: "Carbon",
  skinBubble: "Bubblegum",
  stars: "Stars",
  completeSubtitle: "Clean move. Keep the flow going."
};

const VI: Record<TranslationKey, string> = {
  title: "Parking Puzzle 3D",
  level: "Man",
  coins: "Xu",
  hints: "Goi y",
  restart: "Choi lai",
  hint: "Goi y",
  shop: "Cua hang",
  settings: "Cai dat",
  tapInstruction: "Cham xe co loi thoat de don bai dau",
  levelComplete: "Da don xong",
  coinsEarned: "Xu nhan duoc",
  nextLevel: "Man tiep",
  replayLevel: "Choi lai",
  doubleCoins: "Nhan doi xu",
  bonusCoins: "Xu thuong",
  close: "Dong",
  sound: "Am thanh",
  music: "Nhac",
  language: "Ngon ngu",
  unlock: "Mo khoa",
  select: "Chon",
  selected: "Dang chon",
  notEnoughCoins: "Can them xu",
  adLoading: "Dang tai quang cao",
  adsUnavailable: "Chua co quang cao",
  skinClassic: "Co dien",
  skinMint: "Bac ha",
  skinSunset: "Hoang hon",
  skinCarbon: "Carbon",
  skinBubble: "Keo hong",
  stars: "Sao",
  completeSubtitle: "Tot lam. Tiep tuc nao."
};

const DICTIONARY: Record<LanguageCode, Record<TranslationKey, string>> = {
  en: EN,
  vi: VI
};

export function normalizeLanguage(locale: string | undefined | null): LanguageCode {
  const value = locale?.toLowerCase() ?? "";
  return value.startsWith("vi") ? "vi" : "en";
}

export function translate(language: LanguageCode, key: TranslationKey | string): string {
  const typedKey = key as TranslationKey;
  return DICTIONARY[language]?.[typedKey] ?? EN[typedKey] ?? key;
}

export type { TranslationKey };
