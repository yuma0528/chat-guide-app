# Shopify App Template - Claude Code ガイド

## 概要

このプロジェクトは Shopify アプリのテンプレート。2つのモードをサポート:

- **external**: 非埋め込み型。OAuth code grant → JWT cookie 認証。shadcn/ui + Tailwind フロントエンド。
- **embedded**: Shopify Admin内埋め込み型。Token exchange → session token 認証。Polaris + App Bridge フロントエンド。

バックエンドは共通: Firebase Cloud Functions (Express + tRPC) + Prisma (PostgreSQL)。

## 新規アプリ作成手順

ユーザーから「〇〇というアプリを作って」と指示があった場合、**Claudeが主導して**以下の手順で進める。
ユーザーに手順書を渡すのではなく、Claude自身がファイルを読み取り・編集・コマンド実行し、
ユーザーには外部サービスから値を取得してもらう指示だけを出す。

### Step 0: テンプレートをコピー

```bash
cp -r /Users/yuma/src/shopify-app-template /Users/yuma/src/<app-name>
cd /Users/yuma/src/<app-name>
rm -rf .git
git init
```

### Step 1: ユーザーに聞くこと（最小限）

以下だけユーザーに確認する:
1. **開発ストアのドメイン**（`xxx.myshopify.com`）。なければ Dev Dashboard で作成を案内。
2. **モード** — embedded or external。判断基準:
   - マーチャントがShopify Admin内で使う管理ツール → embedded
   - エンドユーザー向けや独自UIが必要 → external

### Step 2: setup.sh を実行

`.env.tunnel` はテンプレートに設定済み（Cloudflare Tunnel自動設定用）。

```bash
./setup.sh <app-name> <dev-store-domain> --mode <external|embedded>
```

setup.sh が自動で行うこと:
- Firebase プロジェクト作成
- Cloudflare Tunnel ホスト名追加 + DNS CNAME 作成
- tunnel.sh 生成
- 環境変数ファイル作成（HOST, FRONTEND_URL, JWT_SECRET, VITE_* 等）
- application_url の設定
- 依存関係インストール、DB セットアップ、ビルド、shopify app deploy

**途中でユーザー操作が必要な箇所:**
- `shopify app config link` → ターミナルで Organization 選択 + "Create a new app" 選択

### Step 3: SHOPIFY_API_SECRET を設定（唯一の手動取得）

setup.sh 完了後、ユーザーに以下を指示:
> Shopify Partners Dashboard (https://partners.shopify.com) → アプリ → Client credentials から
> **Client secret** をコピーしてください。

受け取ったら Claude が `functions/.env` の `SHOPIFY_API_SECRET` に書き込む。

### Step 4: 動作確認

```bash
npm run dev
```

開発ストアの管理画面からアプリをインストールし、表示を確認。

### Step 5: ビジネスロジック実装

ここからが Claude Code の主な作業。

## プロジェクト構造

```
├── shopify/                       # Shopify CLI 設定
│   ├── shopify.app.toml           # アプリ設定 (setup.shがモード別にコピー)
│   ├── shopify.app.external.toml  # External用テンプレート
│   ├── shopify.app.embedded.toml  # Embedded用テンプレート
│   └── extensions/                # Theme App Extension
├── functions/                     # バックエンド (Firebase Functions) ← 共通
│   ├── src/
│   │   ├── index.ts               # Express エントリ (モード分岐あり)
│   │   ├── trpc.ts                # tRPC セットアップ (getAuthStrategy()で認証)
│   │   ├── db.server.ts           # Prisma クライアント
│   │   ├── auth/
│   │   │   ├── types.ts           # AppMode型, AuthStrategyインターフェース, getAppMode()
│   │   │   ├── index.ts           # モード判定 + getAuthStrategy()
│   │   │   ├── external.ts        # JWT cookie 認証 (external用)
│   │   │   └── embedded.ts        # Session token 認証 (embedded用)
│   │   ├── shopify/
│   │   │   ├── auth.ts            # OAuth (external) + Token exchange (embedded)
│   │   │   ├── shopSetup.ts       # ショッププロビジョニング (共通)
│   │   │   ├── shopifyApi.ts      # Shopify API初期化 (遅延初期化: getShopify())
│   │   │   └── webhook.ts         # Webhook ハンドラ
│   │   ├── routers/index.ts       # tRPC ルーター統合
│   │   ├── graphql/               # Shopify GraphQL クエリ + generated SDK
│   │   ├── helper/                # ユーティリティ
│   │   └── type/                  # GraphQL 型定義
│   ├── prisma/schema.prisma       # DB スキーマ
│   └── .env.example               # APP_MODE=external|embedded
├── appfront/                      # External フロントエンド (shadcn/ui + Tailwind)
│   └── src/
│       ├── App.tsx                # JWT cookie認証 + SPA ルーティング
│       ├── components/sidebar.tsx # サイドバーナビ
│       └── ...
├── appfront-embedded/             # Embedded フロントエンド (Polaris + App Bridge)
│   ├── index.html                 # App Bridge CDN (data-api-keyはviteが%VITE_SHOPIFY_API_KEY%を注入)
│   ├── vite.config.ts             # html-env-replaceプラグインで環境変数をHTMLに注入
│   └── src/
│       ├── App.tsx                # Session token認証 + Polaris + token exchange
│       └── ...
├── setup.sh                       # セットアップ (--mode external|embedded)
├── Procfile.external              # External用 Procfile
├── Procfile.embedded              # Embedded用 Procfile
├── package.json                   # npm run dev (concurrentlyで全プロセス一括起動)
├── docker-compose.yml             # PostgreSQL (dev)
└── firebase.json                  # Firebase 設定
```

## 認証の仕組み

### External mode (APP_MODE=external)
1. Shopify OAuth code grant → アクセストークンを DB に保存
2. JWT を Cookie にセット（httpOnly, secure, sameSite=none, 1週間有効）
3. フロントエンドは `credentials: "include"` で Cookie を送信
4. tRPC の `protectedProcedure` → `auth/external.ts` の JWT 検証 → `ctx.shop`

### Embedded mode (APP_MODE=embedded)
1. App Bridge CDN (`<script data-api-key="..." src="...app-bridge.js">`) がグローバル `shopify` オブジェクトを提供
2. フロントエンドは `shopify.idToken()` でsession tokenを取得
3. 初回アクセス時に `/auth/token-exchange` (RFC 8693) でオフラインアクセストークンを取得・DB保存
4. フロントエンドは `Authorization: Bearer <session-token>` ヘッダーで送信
5. tRPC の `protectedProcedure` → `auth/embedded.ts` の session token 検証 → `ctx.shop`

## 重要な設計判断: 遅延初期化

Firebase Functionsでは `.env` の値は**ランタイム時のみ利用可能**（関数構成段階では未注入）。
そのため、以下は全て遅延初期化パターンを使う:

- `shopifyApi.ts` → `getShopify()` (シングルトン遅延初期化)
- `auth/types.ts` → `getAppMode()` (関数呼び出し)
- `auth/index.ts` → `getAuthStrategy()` (関数呼び出し)
- `shopify/auth.ts` → `process.env.*` を関数内で読み取り（トップレベルに書かない）

**絶対にやってはいけないこと:**
```typescript
// NG: トップレベルでprocess.envを読む → Firebase Emulatorで空になる
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || "";
export const shopify = shopifyApi({ apiKey: SHOPIFY_API_KEY, ... });

// OK: 関数内で読む
export function getShopify() {
  return shopifyApi({ apiKey: process.env.SHOPIFY_API_KEY || "", ... });
}
```

## 開発環境の起動

```bash
npm run dev
```

concurrently で以下が一括起動:

| プロセス | 内容 |
|---------|------|
| docker | `docker compose up` (PostgreSQL) |
| tunnel | Cloudflare Tunnel |
| frontend | appfront or appfront-embedded の `vite dev` (存在するディレクトリを自動判定) |
| tsc | `tsc --watch` (functions) |
| emulator | Firebase Emulator (5秒遅延で起動、tscのビルド完了を待つため) |

**注意:** Cloudflare Tunnelのポート設定とviteのポートを一致させること。
viteのポートは `vite.config.ts` の `server.port` で固定推奨。

## ビジネスロジック追加パターン

### バックエンド: tRPC ルーター追加

1. `functions/src/routers/<name>.ts` を作成:

```typescript
import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import prisma from "../db.server";

export const exampleRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return prisma.example.findMany({
      where: { myshopifyDomain: ctx.shop },
    });
  }),
  create: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return prisma.example.create({
        data: { ...input, myshopifyDomain: ctx.shop! },
      });
    }),
});
```

2. `functions/src/routers/index.ts` に追加:

```typescript
import { exampleRouter } from "./example";
export const appRouter = router({
  example: exampleRouter,
});
```

### データベース: Prisma モデル追加

`functions/prisma/schema.prisma` にモデルを追加し、マイグレーション実行:

```bash
cd functions && npx prisma migrate dev --name add_example
```

**重要:** Shop モデルとのリレーションは `myshopifyDomain` で紐付ける。`onDelete: Cascade` をつける。

```prisma
model Example {
  id              String   @id @default(cuid())
  myshopifyDomain String
  name            String
  shop            Shop     @relation(fields: [myshopifyDomain], references: [myshopifyDomain], onDelete: Cascade)
  createdAt       DateTime @default(now()) @db.Timestamptz(3)
  updatedAt       DateTime @updatedAt @db.Timestamptz(3)

  @@index([myshopifyDomain])
}
```

### フロントエンド: ページ追加

#### External mode (appfront/)
1. `appfront/src/pages/<Name>Page.tsx` を作成 (shadcn/ui コンポーネント使用)
2. `appfront/src/App.tsx` に Route を追加
3. `appfront/src/components/sidebar.tsx` にナビリンクを追加
4. `appfront/src/contexts/language-context.tsx` に翻訳キーを追加

#### Embedded mode (appfront-embedded/)
1. `appfront-embedded/src/pages/<Name>Page.tsx` を作成 (Polaris コンポーネント使用)
2. `appfront-embedded/src/App.tsx` に Route を追加
3. ナビゲーションは Shopify Admin のサイドバーで管理（shopify.app.toml の nav 設定）

### Shopify GraphQL クエリ追加

1. `functions/src/graphql/shopifyAdminApi/<name>.graphql` にクエリを書く
2. `cd functions && npm run codegen` で SDK 生成
3. `functions/src/shopify/transformers/<name>.ts` に変換関数を作成
4. ルーターでは変換関数経由で返す（GraphQL生成型をtRPCの境界から先に漏らさない）

**変換層パターン（必須）:**

GraphQL SDKの戻り値をそのままtRPCルーターから返してはいけない。
必ず変換関数でzodパース＋nullフォールバックを行い、型を保証してから返す。

```typescript
// functions/src/shopify/transformers/<name>.ts
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { SomeQuery } from "../../graphql/shopifyAdminApi/<name>.generated";

// 1. 出力スキーマを定義
export const someSchema = z.object({
  id: z.string(),
  title: z.string(),
  // nullable なフィールドはデフォルト値でフォールバック
});
export type SomeOutput = z.infer<typeof someSchema>;

// 2. 変換関数: GraphQLレスポンス → 安全な型
export function transformSome(raw: SomeQuery): SomeOutput {
  if (!raw.something) {
    throw new TRPCError({ code: "NOT_FOUND", message: "..." });
  }
  const result = someSchema.safeParse({
    id: raw.something.id,
    title: raw.something.title ?? "",
  });
  if (!result.success) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Shopify APIレスポンスが予期しない形式です: ${result.error.message}`,
    });
  }
  return result.data;
}
```

```typescript
// ルーター側: .output() でスキーマを明示
getSomething: protectedProcedure
  .input(z.object({ id: z.string() }))
  .output(someSchema)  // ← 出力型を明示
  .query(async ({ ctx, input }) => {
    const sdk = await getShopSdk(ctx.shop!);
    const raw = await sdk.getSomething({ id: input.id });
    return transformSome(raw);  // ← 変換関数経由
  }),
```

参考実装: 各アプリの `functions/src/shopify/transformers/` ディレクトリ

### Shopify access_scopes 追加

`shopify/shopify.app.toml` の `scopes` に追加し、`shopify app deploy` で反映。

### Theme App Extension ブロック追加

`shopify/extensions/theme-extension/blocks/` に `.liquid` ファイルを追加。

### Webhook ハンドラ追加

1. `functions/src/graphql/shopifyAdminApi/webhook.graphql` に mutation を追加
2. `functions/src/shopify/shopSetup.ts` の初回セットアップで subscribe
3. `functions/src/shopify/webhook.ts` の switch 文にハンドラ追加

## コマンドリファレンス

```bash
# 開発（一括起動）
npm run dev                                # 全プロセス起動 (concurrently)

# 個別起動
cd functions && npm run build:watch        # Functions ビルド監視
cd appfront && npm run dev                 # External フロントエンド dev
cd appfront-embedded && npm run dev        # Embedded フロントエンド dev
firebase emulators:start --only functions  # Firebase Emulator

# データベース
cd functions && npx prisma migrate dev     # マイグレーション作成・適用
cd functions && npx prisma studio          # DB GUI

# Shopify
cd shopify && shopify app deploy --force   # アプリ設定 + Extension デプロイ
cd shopify && shopify app config link      # アプリ設定リンク

# GraphQL
cd functions && npm run codegen            # Shopify GraphQL 型生成

# Firebase
firebase deploy --only functions           # Functions デプロイ
firebase deploy --only hosting             # Hosting デプロイ

# ビルド
cd functions && npm run build              # Functions ビルド
cd appfront && npm run build               # External フロントエンドビルド
cd appfront-embedded && npm run build      # Embedded フロントエンドビルド
```

## 注意事項

- `protectedProcedure` は必ず `ctx.shop` でショップを特定すること（他店舗のデータにアクセスさせない）
- Shopify API のバージョンは `shopifyApi.ts` と `codegen.yml` で管理
- `.generated.ts` ファイルは codegen で上書きされるので手動編集しない
- Firebase サービスアカウントキー (`.json`) は絶対にコミットしない
- `functions/.env` に秘密情報を入れ、`.gitignore` に含める
- `APP_MODE` は `functions/.env` で設定。バックエンドの認証・ルーティングが自動で切り替わる
- setup.sh 実行後、選択しなかったモードのフロントエンドディレクトリは削除される
- Embedded mode の Polaris は React 18 が必要（React 19は非対応）
- tRPC はfunctionsとフロントエンドでバージョンを揃えること（現在 11.0.1）
- appfront-embedded の tsconfig.json に `@trpc/server` のパスエイリアスが必要（functionsのnode_modulesを参照）

## テンプレート修正のワークフロー

テンプレートから作ったアプリの開発中にテンプレート側のバグや改善点を見つけた場合、テンプレートリポジトリ (`/Users/yuma/src/shopify-app-template`) に **PR を作成** して修正する。直接 main にコミットしない。

手順:
1. テンプレートリポジトリでブランチを切る (`git checkout -b fix/xxx`)
2. 修正をコミット
3. `gh pr create` で PR を作成
4. アプリ側の作業に戻る
