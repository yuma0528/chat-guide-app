import prisma from "../db.server";
import { createAdminGraphqlClient } from "../helper/createAdminGraphqlClient";
import { getSdk as getAppInstallationSdk } from "../graphql/shopifyAdminApi/currentAppInstallation.generated";
import { getSdk as getSetMetafieldSdk } from "../graphql/shopifyAdminApi/setAppMetafield.generated";
import { getSdk as getDeleteMetafieldSdk } from "../graphql/shopifyAdminApi/metafield.generated";
import { TRPCError } from "@trpc/server";

async function getShopClient(shop: string) {
  const shopRecord = await prisma.shop.findUnique({
    where: { myshopifyDomain: shop },
  });
  if (!shopRecord) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Shop not found" });
  }
  return createAdminGraphqlClient({
    myshopifyDomain: shop,
    accessToken: shopRecord.accessToken,
  });
}

export async function getAppInstallationId(shop: string): Promise<string> {
  const client = await getShopClient(shop);
  const sdk = getAppInstallationSdk(client);
  const result = await sdk.GetCurrentAppInstallation();
  return result.currentAppInstallation.id;
}

export async function getMetafield(
  shop: string,
  namespace: string,
  key: string
): Promise<{ id: string; value: string } | null> {
  const client = await getShopClient(shop);
  const sdk = getAppInstallationSdk(client);
  const result = await sdk.GetAppMetafield({ namespace, key });
  const metafield = result.currentAppInstallation.metafield;
  if (!metafield) return null;
  return { id: metafield.id, value: metafield.value };
}

export async function setMetafield(
  shop: string,
  namespace: string,
  key: string,
  value: string
): Promise<void> {
  const client = await getShopClient(shop);
  const installSdk = getAppInstallationSdk(client);
  const installResult = await installSdk.GetCurrentAppInstallation();
  const ownerId = installResult.currentAppInstallation.id;

  const sdk = getSetMetafieldSdk(client);
  const result = await sdk.SetAppMetafield({
    metafields: [
      {
        ownerId,
        namespace,
        key,
        type: "json",
        value,
      },
    ],
  });
  if (result.metafieldsSet?.userErrors?.length) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: result.metafieldsSet.userErrors.map((e) => e.message).join(", "),
    });
  }
}

export async function deleteMetafield(
  shop: string,
  namespace: string,
  key: string
): Promise<void> {
  const client = await getShopClient(shop);
  const installSdk = getAppInstallationSdk(client);
  const installResult = await installSdk.GetCurrentAppInstallation();
  const ownerId = installResult.currentAppInstallation.id;

  const sdk = getDeleteMetafieldSdk(client);
  const result = await sdk.DeleteMetafields({
    metafields: [{ ownerId, namespace, key }],
  });
  if (result.metafieldsDelete?.userErrors?.length) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: result.metafieldsDelete.userErrors
        .map((e) => e.message)
        .join(", "),
    });
  }
}

export async function getAllMetafieldsInNamespace(
  shop: string,
  namespace: string
): Promise<Array<{ id: string; key: string; value: string }>> {
  const client = await getShopClient(shop);
  const sdk = getAppInstallationSdk(client);
  const result = await sdk.GetAppMetafields({ namespace });
  return result.currentAppInstallation.metafields.edges.map((edge) => ({
    id: edge.node.id,
    key: edge.node.key,
    value: edge.node.value,
  }));
}
