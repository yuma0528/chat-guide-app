import type { Request, Response, NextFunction } from "express";

// アプリモード
export type AppMode = "external" | "embedded";

export function getAppMode(): AppMode {
  return (process.env.APP_MODE as AppMode) || "external";
}

// 認証ストラテジーインターフェース
export interface AuthStrategy {
  // リクエストからショップドメインを取得・検証するミドルウェア
  verifyAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
