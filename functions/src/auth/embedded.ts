import type { Request, Response, NextFunction } from "express";
import * as logger from "firebase-functions/logger";
import type { AuthStrategy } from "./types";
import { getShopify } from "../shopify/shopifyApi";

// Embedded app認証ストラテジー: Session Token (Bearer token)
export const embeddedAuthStrategy: AuthStrategy = {
  verifyAuth: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "認証トークンがありません" });
        return;
      }

      const sessionToken = authHeader.replace("Bearer ", "");

      // Shopify session tokenを検証
      const payload = await getShopify().session.decodeSessionToken(sessionToken);
      // destからショップドメインを取得: "https://shop-name.myshopify.com/admin" → "shop-name.myshopify.com"
      const dest = payload.dest;
      const shop = new URL(dest).hostname;

      req.shop = shop;
      next();
    } catch (error) {
      logger.error("Session Token検証エラー:", error);
      res.status(401).json({ error: "無効なセッショントークンです" });
    }
  },
};
