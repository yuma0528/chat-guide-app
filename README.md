# Shopify App Template

Shopify外部アプリのテンプレートプロジェクト。

## 技術スタック

- **バックエンド**: Firebase Cloud Functions + Express + tRPC + Prisma (PostgreSQL)
- **フロントエンド**: React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **認証**: Shopify OAuth + JWT (Cookie)
- **Shopify連携**: Shopify Admin API (GraphQL) + Webhook
- **開発環境**: Docker (PostgreSQL) + Firebase Emulators + Cloudflare Tunnel

## プロジェクト構成

```
├── shopify/                # Shopify CLI設定
│   ├── shopify.app.toml    # アプリ設定
│   └── extensions/         # Theme App Extension
├── functions/              # Firebase Functions (バックエンド)
│   ├── src/
│   │   ├── index.ts        # Expressエントリポイント
│   │   ├── trpc.ts         # tRPCセットアップ
│   │   ├── auth/           # JWT認証
│   │   ├── shopify/        # Shopify OAuth & Webhook
│   │   ├── routers/        # tRPCルーター (ビジネスロジック追加先)
│   │   ├── graphql/        # Shopify GraphQLクエリ
│   │   └── helper/         # ユーティリティ
│   └── prisma/             # Prismaスキーマ
├── appfront/               # フロントエンド (Vite + React)
│   └── src/
│       ├── App.tsx          # ルーティング + 認証チェック
│       ├── components/      # UIコンポーネント (shadcn/ui)
│       ├── contexts/        # 言語コンテキスト
│       ├── lib/             # tRPCクライアント, ユーティリティ
│       └── pages/           # ページ (ビジネスロジック追加先)
├── docker-compose.yml      # PostgreSQL (開発用)
├── firebase.json           # Firebase設定
├── Procfile                # 開発プロセス定義
└── tunnel.sh               # Cloudflare Tunnel
```

## セットアップ

### 1. 前提条件

- Node.js 20+
- Docker
- Firebase CLI (`npm install -g firebase-tools`)
- Shopify CLI (`npm install -g @shopify/cli`)
- Cloudflare Tunnel (optional)

### 2. 環境変数の設定

```bash
# functions/.env
cp functions/.env.example functions/.env

# appfront/.env
cp appfront/.env.example appfront/.env
```

### 3. Shopifyアプリの設定

`shopify/shopify.app.toml` のプレースホルダーを実際の値に置き換えてください：

- `client_id`: Shopify Partners ダッシュボードから取得
- `application_url`: あなたのFunctions URL
- `redirect_urls`: 認証コールバックURL
- `dev_store_url`: 開発ストアのドメイン

### 4. 依存関係のインストール

```bash
npm install
cd functions && npm install
cd ../appfront && npm install
cd ../shopify && npm install
```

### 5. データベースのセットアップ

```bash
docker compose up -d
cd functions
npx prisma migrate dev
```

### 6. GraphQL型の生成

```bash
cd functions
npm run codegen
```

### 7. 開発サーバーの起動

```bash
# すべてのプロセスを一括起動 (Procfileに定義)
# foreman, overmind, honcho 等のプロセスマネージャを使用
overmind start

# または個別に起動
docker compose up -d
cd functions && npm run build:watch
cd appfront && npm run dev
npm run serve  # Firebase emulators
```

## ビジネスロジックの追加方法

### バックエンド (tRPCルーター)

1. `functions/src/routers/` に新しいルーターファイルを作成
2. `functions/src/routers/index.ts` でimportしてappRouterに追加
3. 必要に応じて `functions/prisma/schema.prisma` にモデルを追加

### フロントエンド

1. `appfront/src/pages/` に新しいページコンポーネントを作成
2. `appfront/src/App.tsx` にルートを追加
3. `appfront/src/components/sidebar.tsx` にナビゲーションリンクを追加
4. `appfront/src/contexts/language-context.tsx` に翻訳キーを追加

## 含まれるインフラ機能

- Shopify OAuth認証フロー (インストール → コールバック → JWT発行)
- JWT認証ミドルウェア (Cookie)
- tRPC (型安全なAPI)
- Webhook HMAC検証 + app/uninstalled, GDPR webhooks
- Prisma ORM (PostgreSQL)
- GraphQL Codegen (Shopify Admin API)
- 多言語対応 (ja/en)
- ダーク/ライトテーマ
- shadcn/ui コンポーネント
- Firebase Functions デプロイ設定
- Theme App Extension の骨組み
