import type { Request, Response } from "express";
import * as logger from "firebase-functions/logger";
import prisma from "../db.server";
import crypto from "node:crypto";
import type * as functions from "firebase-functions";

const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || "";

export const webhookHandler = async (req: Request, res: Response) => {
  try {
    const hmac = req.headers["x-shopify-hmac-sha256"];
    const topic = req.headers["x-shopify-topic"];
    const shop = req.headers["x-shopify-shop-domain"];

    if (
      !hmac ||
      !topic ||
      !shop ||
      typeof shop !== "string" ||
      typeof hmac !== "string"
    ) {
      return res.status(400).send("Missing required headers");
    }

    // HMACの検証
    const hash = crypto
      .createHmac("sha256", SHOPIFY_API_SECRET)
      .update(String((req as unknown as functions.https.Request).rawBody))
      .digest("base64");
    if (hash !== hmac) {
      logger.error("Invalid HMAC");
      return res.status(401).send("Invalid HMAC");
    }

    // トピックに応じた処理
    switch (topic) {
      case "app/uninstalled":
        await prisma.shop.delete({
          where: { myshopifyDomain: shop },
        });
        logger.info(`Shop ${shop} was uninstalled`);
        break;

      // GDPR mandatory webhooks
      case "customers/data_request":
        break;
      case "customers/redact":
        break;
      case "shop/redact":
        break;

      // TODO: 他のWebhookトピックのハンドラをここに追加

      default:
        logger.info(`Unhandled webhook topic: ${topic}`);
    }

    return res.status(200).send("OK");
  } catch (error) {
    logger.error("Webhook error:", error);
    return res.status(500).send("Internal server error");
  }
};
