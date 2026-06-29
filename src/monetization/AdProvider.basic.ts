import type { BreakResult } from "../game/types";

type BreakCallbacks = {
  onStart?: () => void;
  onComplete?: () => void;
  onError?: (error: unknown) => void;
};

export const ADS_SUPPORTED = false;

export async function requestLevelBreak(_callbacks: BreakCallbacks = {}): Promise<BreakResult> {
  return { status: "unavailable" };
}

export async function requestOptionalReward(_callbacks: BreakCallbacks = {}): Promise<BreakResult> {
  return { status: "unavailable" };
}
