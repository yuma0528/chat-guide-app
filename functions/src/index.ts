import admin from "firebase-admin";
import express from "express";
import type { ErrorRequestHandler } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { shopifyAuth, shopifyTokenExchange } from "./shopify/auth";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { webhookHandler } from "./shopify/webhook";
import * as functions from "firebase-functions/v1";
import { getAppMode } from "./auth";

// Expressアプリケーションの作成
const app = express();
const JSON_BODY_LIMIT = "30mb";

// CORSの設定
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Embedded mode: CSPヘッダー（Shopify Admin内でのiframe表示を許可）
app.use((req, res, next) => {
  if (getAppMode() === "embedded") {
    res.setHeader(
      "Content-Security-Policy",
      "frame-ancestors https://*.myshopify.com https://admin.shopify.com;"
    );
  }
  next();
});

app.post("/webhooks", (req, res, next) => {
  webhookHandler(req, res).catch(next);
});

app.use(express.json({ limit: JSON_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: JSON_BODY_LIMIT }));
app.use(cookieParser());

// TRPCミドルウェアの設定
app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext: ({ req, res }) => ({ req, res }),
    onError: ({ error, type, path }) => {
      console.error(`Error in tRPC handler on path '${path}' (${type})`, error);
    },
  })
);

// エラーハンドラ
const appRequestErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (!err) return next();

  console.error("Unhandled request error", {
    method: req.method,
    path: req.path,
    status: err?.status,
    type: err?.type,
    message: err?.message,
  });

  if (err?.type === "entity.too.large" || err?.status === 413) {
    res.status(413).json({
      error: "REQUEST_TOO_LARGE",
      message: "リクエストサイズが大きすぎます。",
    });
    return;
  }

  if (err instanceof SyntaxError) {
    res.status(400).json({
      error: "INVALID_JSON",
      message: "リクエストJSONの形式が不正です。",
    });
    return;
  }

  res.status(err?.status || 500).json({
    error: "REQUEST_FAILED",
    message: err?.message || "リクエスト処理に失敗しました。",
  });
};
app.use(appRequestErrorHandler);

// モードに応じた認証ルート（両方登録し、ランタイムでモードチェック）
// External mode: OAuth code grant
app.get("/auth", async (req, res) => {
  if (getAppMode() !== "external") {
    res.status(404).send("Not found");
    return;
  }
  await shopifyAuth.authStart(req, res);
});
app.get("/auth/callback", async (req, res) => {
  if (getAppMode() !== "external") {
    res.status(404).send("Not found");
    return;
  }
  await shopifyAuth.authCallback(req, res);
});
// Embedded mode: Token exchange
app.post("/auth/token-exchange", async (req, res) => {
  if (getAppMode() !== "embedded") {
    res.status(404).send("Not found");
    return;
  }
  await shopifyTokenExchange.exchange(req, res);
});

// Firebase初期化
let isInitializedAdmin = false;
if (!isInitializedAdmin) {
  admin.initializeApp();
  isInitializedAdmin = true;
}

// Firebase Functionsとしてエクスポート
export const api = functions
  .runWith({
    timeoutSeconds: 300,
    memory: "512MB",
  })
  .https.onRequest(app);
