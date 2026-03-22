import prisma from "../db.server";
import * as logger from "firebase-functions/logger";
import { getSdk } from "../graphql/shopifyAdminApi/webhook.generated";
import { createAdminGraphqlClient } from "../helper/createAdminGraphqlClient";
import { WebhookSubscriptionFormat } from "../type/shopifyAdminApi";
import { getSdk as getShopLocaleSdk } from "../graphql/shopifyAdminApi/shop.generated";

const HOST = process.env.HOST || "";

interface ShopProvisionInput {
  shop: string;
  accessToken: string;
  scope: string;
}

// ショップのプロビジョニング（外部・埋め込み共通）
export async function provisionShop(input: ShopProvisionInput) {
  const { shop, accessToken, scope } = input;

  const client = createAdminGraphqlClient({
    myshopifyDomain: shop,
    accessToken,
  });

  // プライマリロケールとドメイン情報の取得
  const shopLocaleSdk = getShopLocaleSdk(client);
  const result = await shopLocaleSdk.getShopLocale();
  const primaryLocale = result.shopLocales.find(
    (locale) => locale.primary
  )?.locale;
  const email = result.shop.email;
  const { host } = result.shop.primaryDomain;

  // データベースにセッション情報を保存
  const shopRecord = await prisma.shop.upsert({
    where: { myshopifyDomain: shop },
    update: {
      accessToken,
      scope,
      locale: primaryLocale,
      primaryDomain: host,
      email,
    },
    create: {
      myshopifyDomain: shop,
      accessToken,
      scope,
      locale: primaryLocale,
      primaryDomain: host,
      email,
    },
  });

  if (!shopRecord.isSetupComplete) {
    // Webhookの登録
    const webhookSdk = getSdk(client);
    const webhookUrl = `${HOST}/api/webhooks`;
    const webhookInput = {
      callbackUrl: webhookUrl,
      format: WebhookSubscriptionFormat.Json,
    } as any;
    await webhookSdk.subscribeAppUninstall({
      webhookSubscription: webhookInput,
    });

    // TODO: 初回セットアップ時の追加処理をここに記述

    await prisma.shop.update({
      where: { myshopifyDomain: shop },
      data: { isSetupComplete: true },
    });
    logger.info(`Initial setup completed for shop: ${shop}`);
  }

  return shopRecord;
}
