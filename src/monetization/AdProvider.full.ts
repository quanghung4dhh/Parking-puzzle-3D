import type { BreakResult } from "../game/types";

type AdCallbacks = {
  adStarted?: () => void;
  adFinished?: () => void;
  adError?: (error: unknown) => void;
};

type BreakCallbacks = {
  onStart?: () => void;
  onComplete?: () => void;
  onError?: (error: unknown) => void;
};

type CrazyGamesAdSdk = {
  ad?: {
    requestAd?: (type: "midgame" | "rewarded", callbacks: AdCallbacks) => Promise<void> | void;
  };
};

export const ADS_SUPPORTED = true;

export async function requestLevelBreak(callbacks: BreakCallbacks = {}): Promise<BreakResult> {
  return requestCrazyGamesAd("midgame", callbacks);
}

export async function requestOptionalReward(callbacks: BreakCallbacks = {}): Promise<BreakResult> {
  return requestCrazyGamesAd("rewarded", callbacks);
}

async function requestCrazyGamesAd(type: "midgame" | "rewarded", callbacks: BreakCallbacks = {}): Promise<BreakResult> {
  const sdk = (window.CrazyGames?.SDK ?? window.Crazygames?.SDK) as CrazyGamesAdSdk | undefined;
  const requestAd = sdk?.ad?.requestAd;
  if (!requestAd) {
    return { status: "unavailable" };
  }

  return new Promise<BreakResult>((resolve) => {
    let resolved = false;
    const finish = (result: BreakResult): void => {
      if (resolved) return;
      resolved = true;
      window.clearTimeout(timeout);
      resolve(result);
    };
    const timeout = window.setTimeout(() => {
      callbacks.onError?.("ad-timeout");
      finish({ status: "error", error: "ad-timeout" });
    }, 90000);

    try {
      const maybePromise = requestAd(type, {
        adStarted: () => callbacks.onStart?.(),
        adFinished: () => {
          callbacks.onComplete?.();
          finish({ status: "finished" });
        },
        adError: (error: unknown) => {
          callbacks.onError?.(error);
          finish({ status: "error", error });
        }
      });
      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise.catch((error: unknown) => {
          callbacks.onError?.(error);
          finish({ status: "error", error });
        });
      }
    } catch (error) {
      callbacks.onError?.(error);
      finish({ status: "error", error });
    }
  });
}
