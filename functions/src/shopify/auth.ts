import type { Request, Response } from "express";
import * as logger from "firebase-functions/logger";
import ShopifyToken from "shopify-token";
import { getShopify } from "./shopifyApi";
import { provisionShop } from "./shopSetup";
import { generateJWT } from "../auth";

// === External mode: OAuth code grant ===

export const shopifyAuth = {
  authStart: async (req: Request, res: Response) => {
    const { shop } = req.query;

    if (!shop || typeof shop !== "string") {
      return res.status(400).send("Missing shop parameter");
    }

    try {
      return await getShopify().auth.begin({
        shop,
        callbackPath: "/api/auth/callback",
        isOnline: false,
        rawRequest: req,
        rawResponse: res,
      });
    } catch (error) {
      logger.error("認証開始エラー:", error);
      if (!res.headersSent) {
        return res.status(500).send("Authentication failed");
      }
    }
  },

  authCallback: async (req: Request, res: Response) => {
    try {
      const { shop, code } = req.query;

      if (!shop || typeof shop !== "string") {
        return res.status(400).send("Missing shop parameter");
      }
      if (!code || typeof code !== "string") {
        return res.status(400).send("Missing code parameter");
      }
      const shopifyToken = new ShopifyToken({
        redirectUri: process.env.FRONTEND_URL || "",
        sharedSecret: process.env.SHOPIFY_API_SECRET || "",
        apiKey: process.env.SHOPIFY_API_KEY || "",
      });

      if (!shopifyToken.verifyHmac(req.query)) {
        console.log("Invalid hmac parameter");
        res.status(400).send("Invalid hmac parameter");
        return;
      }

      const data = await shopifyToken.getAccessToken(shop, code);
      const { access_token, scope } = data;

      // 共通のショッププロビジョニング
      await provisionShop({ shop, accessToken: access_token, scope });

      // JWTトークンを生成
      const token = generateJWT({ shop });

      // クッキーにトークンを設定
      res.cookie("shopify_token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 168 * 60 * 60 * 1000, // 168時間(1週間)
      });

      return res.redirect(process.env.FRONTEND_URL || "");
    } catch (error) {
      logger.error("認証コールバックエラー:", error);
      return res.status(500).send("Authentication failed");
    }
  },
};

// === Embedded mode: Token exchange ===
// Shopify Token Exchange (RFC 8693) でオフラインアクセストークンを取得

async function exchangeToken(shop: string, sessionToken: string): Promise<{ access_token: string; scope: string }> {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY || "",
      client_secret: process.env.SHOPIFY_API_SECRET || "",
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      subject_token: sessionToken,
      subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
      requested_token_type: "urn:shopify:params:oauth:token-type:offline-access-token",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${body}`);
  }

  return response.json() as Promise<{ access_token: string; scope: string }>;
}

export const shopifyTokenExchange = {
  exchange: async (req: Request, res: Response) => {
    try {
      const sessionToken = req.headers.authorization?.replace("Bearer ", "");
      if (!sessionToken) {
        return res.status(401).json({ error: "Missing session token" });
      }

      // Session tokenを検証してショップ情報を取得
      const payload = await getShopify().session.decodeSessionToken(sessionToken);
      const shop = new URL(payload.dest).hostname;

      // Token exchange でオフラインアクセストークンを取得
      const { access_token, scope } = await exchangeToken(shop, sessionToken);

      // 共通のショッププロビジョニング
      await provisionShop({
        shop,
        accessToken: access_token,
        scope,
      });

      return res.json({ success: true });
    } catch (error) {
      logger.error("Token exchange エラー:", error);
      return res.status(500).json({ error: "Token exchange failed" });
    }
  },
};
