#!/bin/bash
#
# Shopify App セットアップスクリプト
#
# 使い方:
#   ./setup.sh <app-name> <dev-store-domain> [--mode external|embedded]
#
# 例:
#   ./setup.sh my-review-app my-dev-store-123.myshopify.com
#   ./setup.sh my-review-app my-dev-store-123.myshopify.com --mode embedded
#
# 前提条件:
#   - shopify auth login 済み
#   - firebase login 済み
#   - Docker が起動中
#   - 開発ストアは事前に Dev Dashboard で作成済み
#   - .env.tunnel が設定済み（Cloudflare Tunnel自動設定に必要）

set -euo pipefail

APP_NAME="${1:?Usage: ./setup.sh <app-name> <dev-store-domain> [--mode external|embedded]}"
DEV_STORE="${2:?Usage: ./setup.sh <app-name> <dev-store-domain> [--mode external|embedded]}"
shift 2

# デフォルトモード
APP_MODE="external"

# オプション解析
while [[ $# -gt 0 ]]; do
  case $1 in
    --mode)
      APP_MODE="${2:?--mode requires a value (external or embedded)}"
      if [[ "$APP_MODE" != "external" && "$APP_MODE" != "embedded" ]]; then
        echo "Error: --mode must be 'external' or 'embedded'"
        exit 1
      fi
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "========================================"
echo " Shopify App Setup: ${APP_NAME}"
echo " Mode: ${APP_MODE}"
echo "========================================"

# フロントエンドディレクトリの決定
if [ "$APP_MODE" = "embedded" ]; then
  FRONTEND_DIR="appfront-embedded"
else
  FRONTEND_DIR="appfront"
fi

# ----------------------------------------
# 0. モードに応じたファイルセットアップ
# ----------------------------------------
echo ""
echo "[0/9] モード設定..."

# shopify.app.toml をモードに応じてコピー
cp "${PROJECT_DIR}/shopify/shopify.app.${APP_MODE}.toml" "${PROJECT_DIR}/shopify/shopify.app.toml"
echo "  shopify.app.${APP_MODE}.toml → shopify.app.toml"

# Procfile をモードに応じてコピー
cp "${PROJECT_DIR}/Procfile.${APP_MODE}" "${PROJECT_DIR}/Procfile"
echo "  Procfile.${APP_MODE} → Procfile"

# 不要なフロントエンドディレクトリを削除
if [ "$APP_MODE" = "embedded" ]; then
  rm -rf "${PROJECT_DIR}/appfront"
  echo "  appfront/ を削除（embedded モード）"
else
  rm -rf "${PROJECT_DIR}/appfront-embedded"
  echo "  appfront-embedded/ を削除（external モード）"
fi

# 不要なテンプレートファイルを削除
rm -f "${PROJECT_DIR}/Procfile.external" "${PROJECT_DIR}/Procfile.embedded"
rm -f "${PROJECT_DIR}/shopify/shopify.app.external.toml" "${PROJECT_DIR}/shopify/shopify.app.embedded.toml"
echo "  テンプレートファイルをクリーンアップ"

# firebase.json のhostingパスを調整
if [ "$APP_MODE" = "embedded" ]; then
  sed -i '' "s|./appfront/dist|./appfront-embedded/dist|g" "${PROJECT_DIR}/firebase.json"
  echo "  firebase.json のhosting pathを更新"
fi

# ----------------------------------------
# 1. Firebase プロジェクト作成
# ----------------------------------------
echo ""
echo "[1/9] Firebase プロジェクト作成..."
FIREBASE_PROJECT_ID="${APP_NAME}"

if firebase projects:list 2>/dev/null | grep -q "${FIREBASE_PROJECT_ID}"; then
  echo "  Firebase プロジェクト '${FIREBASE_PROJECT_ID}' は既に存在します。スキップ。"
else
  firebase projects:create "${FIREBASE_PROJECT_ID}" --display-name "${APP_NAME}" || {
    echo "  ⚠️  Firebase プロジェクト作成に失敗。手動で作成してください。"
    echo "  プロジェクトID: ${FIREBASE_PROJECT_ID}"
  }
fi

# .firebaserc を作成
cat > "${PROJECT_DIR}/.firebaserc" << EOF
{
  "projects": {
    "default": "${FIREBASE_PROJECT_ID}"
  }
}
EOF
echo "  .firebaserc を作成しました。"

# ----------------------------------------
# 2. Shopify アプリ設定
# ----------------------------------------
echo ""
echo "[2/9] Shopify アプリ設定..."
echo "  shopify app config link を実行します。"
echo "  → 'Create a new app' を選択してください。"
echo "  → アプリ名: ${APP_NAME}"
echo ""
cd "${PROJECT_DIR}/shopify"
shopify app config link
cd "${PROJECT_DIR}"

# shopify.app.toml から client_id を読み取り
CLIENT_ID=$(grep 'client_id' "${PROJECT_DIR}/shopify/shopify.app.toml" | head -1 | sed 's/.*= *"\(.*\)"/\1/')
echo "  Client ID: ${CLIENT_ID}"

# dev_store_url を設定
if grep -q 'dev_store_url' "${PROJECT_DIR}/shopify/shopify.app.toml"; then
  sed -i '' "s/dev_store_url = .*/dev_store_url = \"${DEV_STORE}\"/" "${PROJECT_DIR}/shopify/shopify.app.toml"
else
  echo "dev_store_url = \"${DEV_STORE}\"" >> "${PROJECT_DIR}/shopify/shopify.app.toml"
fi
echo "  dev_store_url を ${DEV_STORE} に設定しました。"

# ----------------------------------------
# 3. Cloudflare Tunnel 設定
# ----------------------------------------
echo ""
echo "[3/9] Cloudflare Tunnel 設定..."

if [ -f "${PROJECT_DIR}/.env.tunnel" ]; then
  source "${PROJECT_DIR}/.env.tunnel"

  if [ -n "${CF_API_TOKEN:-}" ] && [ -n "${CF_ACCOUNT_ID:-}" ] && [ -n "${CF_TUNNEL_ID:-}" ] && [ -n "${CF_ZONE_ID:-}" ]; then
    CF_DOMAIN="${CF_DOMAIN:-improv-ec.com}"
    FRONTEND_PORT="${FRONTEND_PORT:-5173}"
    FUNCTIONS_HOST="${APP_NAME}-functions.${CF_DOMAIN}"
    APPFRONT_HOST="${APP_NAME}-appfront.${CF_DOMAIN}"

    echo "  Functions: ${FUNCTIONS_HOST} → http://localhost:5001"
    echo "  Frontend:  ${APPFRONT_HOST} → http://localhost:${FRONTEND_PORT}"

    # 現在のトンネル設定を取得
    CURRENT_CONFIG=$(curl -s \
      "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/cfd_tunnel/${CF_TUNNEL_ID}/configurations" \
      -H "Authorization: Bearer ${CF_API_TOKEN}")

    # 既存のingressルールを取得し、新しいホスト名を追加
    NEW_CONFIG=$(echo "${CURRENT_CONFIG}" | python3 -c "
import sys, json
data = json.load(sys.stdin)
ingress = data['result']['config']['ingress']
# catch-all (最後のservice-onlyエントリ) を除く
rules = [r for r in ingress if 'hostname' in r]
catchall = [r for r in ingress if 'hostname' not in r]
# 既に同じホスト名がある場合は除去
rules = [r for r in rules if r['hostname'] not in ['${FUNCTIONS_HOST}', '${APPFRONT_HOST}']]
# 新しいルールを追加
rules.append({'hostname': '${FUNCTIONS_HOST}', 'service': 'http://localhost:5001'})
rules.append({'hostname': '${APPFRONT_HOST}', 'service': 'http://localhost:${FRONTEND_PORT}'})
rules.extend(catchall)
config = {'config': {'ingress': rules, 'warp-routing': {'enabled': False}}}
print(json.dumps(config))
")

    # トンネル設定を更新
    RESULT=$(curl -s -X PUT \
      "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/cfd_tunnel/${CF_TUNNEL_ID}/configurations" \
      -H "Authorization: Bearer ${CF_API_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "${NEW_CONFIG}" | python3 -c "import sys,json; print('ok' if json.load(sys.stdin)['success'] else 'failed')")

    if [ "${RESULT}" = "ok" ]; then
      echo "  ✅ トンネル ingress 設定を更新しました。"
    else
      echo "  ⚠️  トンネル ingress 設定の更新に失敗。Cloudflare ダッシュボードで手動設定してください。"
    fi

    # DNS CNAMEレコードを作成
    TUNNEL_CNAME="${CF_TUNNEL_ID}.cfargotunnel.com"
    for HOSTNAME in "${FUNCTIONS_HOST}" "${APPFRONT_HOST}"; do
      # 既存レコード確認
      EXISTS=$(curl -s \
        "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records?name=${HOSTNAME}" \
        -H "Authorization: Bearer ${CF_API_TOKEN}" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['result']))")

      if [ "${EXISTS}" = "0" ]; then
        DNS_RESULT=$(curl -s -X POST \
          "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records" \
          -H "Authorization: Bearer ${CF_API_TOKEN}" \
          -H "Content-Type: application/json" \
          -d "{\"type\":\"CNAME\",\"name\":\"${HOSTNAME}\",\"content\":\"${TUNNEL_CNAME}\",\"proxied\":true}" \
          | python3 -c "import sys,json; print('ok' if json.load(sys.stdin)['success'] else 'failed')")

        if [ "${DNS_RESULT}" = "ok" ]; then
          echo "  ✅ DNS CNAME 作成: ${HOSTNAME}"
        else
          echo "  ⚠️  DNS CNAME 作成失敗: ${HOSTNAME}"
        fi
      else
        echo "  DNS CNAME 既存: ${HOSTNAME}"
      fi
    done

    # tunnel.sh を生成
    cat > "${PROJECT_DIR}/tunnel.sh" << TUNNEL_EOF
#!/bin/bash
set -euo pipefail
cloudflared tunnel run --token ${CF_TUNNEL_TOKEN:-YOUR_TUNNEL_TOKEN}
TUNNEL_EOF
    chmod +x "${PROJECT_DIR}/tunnel.sh"
    echo "  ✅ tunnel.sh を生成しました。"

    # viteのポートを固定
    if [ -f "${PROJECT_DIR}/${FRONTEND_DIR}/vite.config.ts" ]; then
      if ! grep -q "port:" "${PROJECT_DIR}/${FRONTEND_DIR}/vite.config.ts"; then
        sed -i '' "s/server: {/server: {\n    port: ${FRONTEND_PORT},/" "${PROJECT_DIR}/${FRONTEND_DIR}/vite.config.ts"
        echo "  vite ポートを ${FRONTEND_PORT} に固定しました。"
      fi
    fi

    # shopify.app.toml の application_url を更新
    sed -i '' "s|application_url = .*|application_url = \"https://${APPFRONT_HOST}\"|" "${PROJECT_DIR}/shopify/shopify.app.toml"
    echo "  application_url を https://${APPFRONT_HOST} に設定しました。"

  else
    echo "  ⚠️  .env.tunnel の設定が不完全です。Cloudflare Tunnel を手動設定してください。"
  fi
else
  echo "  ⚠️  .env.tunnel が見つかりません。Cloudflare Tunnel を手動設定してください。"
  echo "  .env.tunnel.example をコピーして設定してください。"
fi

# ----------------------------------------
# 4. 環境変数ファイル作成
# ----------------------------------------
echo ""
echo "[4/9] 環境変数ファイル作成..."

FUNCTIONS_HOST="${APP_NAME}-functions.${CF_DOMAIN:-improv-ec.com}"
APPFRONT_HOST="${APP_NAME}-appfront.${CF_DOMAIN:-improv-ec.com}"

if [ ! -f "${PROJECT_DIR}/functions/.env" ]; then
  cp "${PROJECT_DIR}/functions/.env.example" "${PROJECT_DIR}/functions/.env"
  sed -i '' "s/APP_MODE=.*/APP_MODE=${APP_MODE}/" "${PROJECT_DIR}/functions/.env"
  sed -i '' "s|SHOPIFY_API_KEY=.*|SHOPIFY_API_KEY=${CLIENT_ID}|" "${PROJECT_DIR}/functions/.env"
  sed -i '' "s|HOST=.*|HOST=https://${FUNCTIONS_HOST}|" "${PROJECT_DIR}/functions/.env"
  sed -i '' "s|FRONTEND_URL=.*|FRONTEND_URL=https://${APPFRONT_HOST}|" "${PROJECT_DIR}/functions/.env"
  # JWT_SECRET を自動生成
  JWT_SECRET=$(openssl rand -hex 32)
  sed -i '' "s|JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" "${PROJECT_DIR}/functions/.env"
  echo "  functions/.env を作成しました (APP_MODE=${APP_MODE})。"
  echo "  ⚠️  SHOPIFY_API_SECRET を手動で設定してください。"
  echo "     → Shopify Partners Dashboard > アプリ > Client credentials から取得"
else
  echo "  functions/.env は既に存在します。スキップ。"
fi

if [ ! -f "${PROJECT_DIR}/${FRONTEND_DIR}/.env" ]; then
  cp "${PROJECT_DIR}/${FRONTEND_DIR}/.env.example" "${PROJECT_DIR}/${FRONTEND_DIR}/.env"
  # VITE_FUNCTIONS_URL を自動設定
  FIREBASE_PROJECT_ID="${APP_NAME}"
  sed -i '' "s|VITE_FUNCTIONS_URL=.*|VITE_FUNCTIONS_URL=https://${FUNCTIONS_HOST}/${FIREBASE_PROJECT_ID}/us-central1|" "${PROJECT_DIR}/${FRONTEND_DIR}/.env"
  if [ "$APP_MODE" = "embedded" ]; then
    sed -i '' "s|VITE_SHOPIFY_API_KEY=.*|VITE_SHOPIFY_API_KEY=${CLIENT_ID}|" "${PROJECT_DIR}/${FRONTEND_DIR}/.env"
  fi
  echo "  ${FRONTEND_DIR}/.env を作成しました。"
else
  echo "  ${FRONTEND_DIR}/.env は既に存在します。スキップ。"
fi

# ----------------------------------------
# 5. 依存関係インストール
# ----------------------------------------
echo ""
echo "[5/9] 依存関係インストール..."
cd "${PROJECT_DIR}" && npm install
cd "${PROJECT_DIR}/functions" && npm install
cd "${PROJECT_DIR}/${FRONTEND_DIR}" && npm install
cd "${PROJECT_DIR}/shopify" && npm install
cd "${PROJECT_DIR}"

# ----------------------------------------
# 6. データベースセットアップ
# ----------------------------------------
echo ""
echo "[6/9] データベースセットアップ..."
docker compose up -d
echo "  PostgreSQL コンテナ起動。5秒待機..."
sleep 5
cd "${PROJECT_DIR}/functions"
npx prisma migrate dev --name init
cd "${PROJECT_DIR}"

# ----------------------------------------
# 7. GraphQL Codegen
# ----------------------------------------
echo ""
echo "[7/9] GraphQL Codegen..."
cd "${PROJECT_DIR}/functions"
npm run codegen || echo "  ⚠️  Codegen に失敗。後で手動実行してください: cd functions && npm run codegen"
cd "${PROJECT_DIR}"

# ----------------------------------------
# 8. ビルド確認
# ----------------------------------------
echo ""
echo "[8/9] ビルド確認..."
cd "${PROJECT_DIR}/functions"
npm run build || echo "  ⚠️  Functions ビルドに失敗。エラーを確認してください。"
cd "${PROJECT_DIR}"

# ----------------------------------------
# 9. Shopify アプリ設定をデプロイ
# ----------------------------------------
echo ""
echo "[9/9] Shopify アプリ設定をデプロイ..."
cd "${PROJECT_DIR}/shopify"
shopify app deploy --force || echo "  ⚠️  デプロイに失敗。手動で実行してください: cd shopify && shopify app deploy --force"
cd "${PROJECT_DIR}"

# ----------------------------------------
# 完了
# ----------------------------------------
echo ""
echo "========================================"
echo " セットアップ完了!"
echo "========================================"
echo ""
echo "モード:                ${APP_MODE}"
echo "Firebase プロジェクト: ${FIREBASE_PROJECT_ID}"
echo "Shopify Client ID:     ${CLIENT_ID:-未取得}"
echo "開発ストア:            ${DEV_STORE}"
echo "フロントエンド:        ${FRONTEND_DIR}"
echo "Functions URL:         https://${FUNCTIONS_HOST}"
echo "Frontend URL:          https://${APPFRONT_HOST}"
echo ""
echo "残りの手動設定:"
echo "  1. functions/.env の SHOPIFY_API_SECRET を設定"
echo "     → Shopify Partners Dashboard > アプリ > Client credentials から取得"
echo "  2. npm run dev で開発環境を起動"
echo "  3. ${DEV_STORE} の管理画面からアプリをインストール"
