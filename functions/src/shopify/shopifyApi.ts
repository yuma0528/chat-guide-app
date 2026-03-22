import { shopifyApi, ApiVersion } from "@shopify/shopify-api";
import "@shopify/shopify-api/adapters/node";

// .envはランタイム時のみ利用可能（関数構成段階では未注入）のため遅延初期化
let _shopify: ReturnType<typeof shopifyApi> | null = null;

export function getShopify() {
  if (!_shopify) {
    _shopify = shopifyApi({
      apiKey: process.env.SHOPIFY_API_KEY || "",
      apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
      hostName: (process.env.HOST || "").replace(/https?:\/\//, ""),
      isEmbeddedApp: process.env.APP_MODE === "embedded",
      apiVersion: ApiVersion.October24,
    });
  }
  return _shopify;
}
