import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import * as logger from "firebase-functions/logger";
import type { AuthStrategy } from "./types";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface JWTPayload {
  shop: string;
  iat?: number;
  exp?: number;
}

// JWTトークンの生成
export const generateJWT = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
};

// External app認証ストラテジー: JWT Cookie
export const externalAuthStrategy: AuthStrategy = {
  verifyAuth: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.shopify_token;

      if (!token) {
        res.status(401).json({ error: "認証トークンがありません" });
        return;
      }
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        const shopifyAdminUrl = `https://${decoded.shop}/admin`;
        return res.redirect(shopifyAdminUrl);
      }

      req.shop = decoded.shop;
      next();
    } catch (error) {
      logger.error("JWT検証エラー:", error);
      res.status(401).json({ error: "無効な認証トークンです" });
    }
  },
};
