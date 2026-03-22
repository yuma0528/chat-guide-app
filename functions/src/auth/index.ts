import { getAppMode } from "./types";
import type { AuthStrategy } from "./types";
import { externalAuthStrategy } from "./external";
import { embeddedAuthStrategy } from "./embedded";

// リクエストオブジェクトの拡張
declare global {
  namespace Express {
    interface Request {
      shop?: string;
    }
  }
}

// APP_MODEに応じた認証ストラテジーを選択（遅延評価）
export function getAuthStrategy(): AuthStrategy {
  return getAppMode() === "embedded"
    ? embeddedAuthStrategy
    : externalAuthStrategy;
}

export { generateJWT } from "./external";
export { getAppMode } from "./types";
export type { AppMode, AuthStrategy } from "./types";
