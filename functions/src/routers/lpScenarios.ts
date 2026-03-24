import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  getMetafield,
  setMetafield,
  deleteMetafield,
} from "../shopify/metafields";
import {
  lpScenarioSchema,
  lpScenariosIndexSchema,
  lpBlockSchema,
  lpCustomerFormSchema,
  lpProductItemSchema,
} from "../types/lpScenario";
import type { LpScenariosIndex, LpScenario, LpProductItem } from "../types/lpScenario";
import prisma from "../db.server";
import { createAdminGraphqlClient } from "../helper/createAdminGraphqlClient";
import { getSdk as getProductsSdk } from "../graphql/shopifyAdminApi/products.generated";

const NAMESPACE = "chat_guide";

async function getLpScenariosIndex(shop: string): Promise<LpScenariosIndex> {
  const result = await getMetafield(shop, NAMESPACE, "lp_scenarios_index");
  if (!result) return { scenarios: [] };
  return lpScenariosIndexSchema.parse(JSON.parse(result.value));
}

async function saveLpScenariosIndex(
  shop: string,
  index: LpScenariosIndex
): Promise<void> {
  await setMetafield(
    shop,
    NAMESPACE,
    "lp_scenarios_index",
    JSON.stringify(index)
  );
}

async function updateLpStorefrontData(shop: string): Promise<void> {
  const index = await getLpScenariosIndex(shop);
  const scenarios: Record<string, LpScenario> = {};

  for (const entry of index.scenarios) {
    if (entry.status === "published") {
      const result = await getMetafield(shop, NAMESPACE, entry.id);
      if (result) {
        scenarios[entry.id] = lpScenarioSchema.parse(JSON.parse(result.value));
      }
    }
  }

  await setMetafield(
    shop,
    NAMESPACE,
    "lp_storefront_data",
    JSON.stringify({ scenarios })
  );
}

export const lpScenariosRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getLpScenariosIndex(ctx.shop!);
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await getMetafield(ctx.shop!, NAMESPACE, input.id);
      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "LPシナリオが見つかりません",
        });
      }
      return lpScenarioSchema.parse(JSON.parse(result.value));
    }),

  fetchProducts: protectedProcedure
    .input(z.object({ count: z.number().min(1).max(10).default(3) }))
    .query(async ({ ctx, input }) => {
      const shop = ctx.shop!;
      const shopRecord = await prisma.shop.findUnique({
        where: { myshopifyDomain: shop },
      });
      if (!shopRecord) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Shop not found" });
      }
      const client = createAdminGraphqlClient({
        myshopifyDomain: shop,
        accessToken: shopRecord.accessToken,
      });
      const sdk = getProductsSdk(client);
      const result = await sdk.GetRecentProducts({ first: input.count });

      const products: LpProductItem[] = result.products.edges.map(
        (edge, idx) => ({
          id: `prod_${Date.now().toString(36)}_${idx}`,
          shopify_product_id: edge.node.id,
          title: edge.node.title,
          handle: edge.node.handle,
          image_url: edge.node.featuredImage?.url || null,
          variants: edge.node.variants.edges.map((v) => ({
            id: v.node.id,
            title: v.node.title || "デフォルト",
            price: v.node.price,
            currency: "JPY",
          })),
          default_variant_id:
            edge.node.variants.edges[0]?.node.id || null,
          default_quantity: 1,
          sort_order: idx,
        })
      );

      return products;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        blocks: z.array(lpBlockSchema).optional(),
        products: z.array(lpProductItemSchema).optional(),
        allow_quantity: z.boolean().optional(),
        customer_form: lpCustomerFormSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const shop = ctx.shop!;
      const index = await getLpScenariosIndex(shop);
      const id = `lp_${Date.now().toString(36)}`;
      const now = new Date().toISOString();

      const scenario: LpScenario = {
        id,
        name: input.name,
        description: input.description || "",
        status: "draft",
        created_at: now,
        updated_at: now,
        blocks: input.blocks || [],
        products: input.products || [],
        allow_quantity: input.allow_quantity ?? false,
        customer_form: input.customer_form ?? {
          require_phone: true,
          require_address: true,
          submit_button_text: "購入手続きへ進む",
        },
      };

      await setMetafield(shop, NAMESPACE, id, JSON.stringify(scenario));

      index.scenarios.push({
        id,
        name: input.name,
        status: "draft",
        updated_at: now,
      });
      await saveLpScenariosIndex(shop, index);

      return scenario;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        blocks: z.array(lpBlockSchema).optional(),
        products: z.array(lpProductItemSchema).optional(),
        allow_quantity: z.boolean().optional(),
        status: z.enum(["draft", "published"]).optional(),
        customer_form: lpCustomerFormSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const shop = ctx.shop!;
      const result = await getMetafield(shop, NAMESPACE, input.id);
      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "LPシナリオが見つかりません",
        });
      }

      const scenario = lpScenarioSchema.parse(JSON.parse(result.value));
      const now = new Date().toISOString();

      if (input.name !== undefined) scenario.name = input.name;
      if (input.description !== undefined)
        scenario.description = input.description;
      if (input.blocks !== undefined) scenario.blocks = input.blocks;
      if (input.products !== undefined) scenario.products = input.products;
      if (input.allow_quantity !== undefined) scenario.allow_quantity = input.allow_quantity;
      if (input.status !== undefined) scenario.status = input.status;
      if (input.customer_form !== undefined)
        scenario.customer_form = input.customer_form;
      scenario.updated_at = now;

      await setMetafield(shop, NAMESPACE, input.id, JSON.stringify(scenario));

      const index = await getLpScenariosIndex(shop);
      const entry = index.scenarios.find((s) => s.id === input.id);
      if (entry) {
        if (input.name !== undefined) entry.name = input.name;
        if (input.status !== undefined) entry.status = input.status;
        entry.updated_at = now;
        await saveLpScenariosIndex(shop, index);
      }

      await updateLpStorefrontData(shop);

      return scenario;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const shop = ctx.shop!;

      try {
        await deleteMetafield(shop, NAMESPACE, input.id);
      } catch {
        // メタフィールドが存在しなくてもOK
      }

      const index = await getLpScenariosIndex(shop);
      index.scenarios = index.scenarios.filter((s) => s.id !== input.id);
      await saveLpScenariosIndex(shop, index);

      await updateLpStorefrontData(shop);

      return { success: true };
    }),

  duplicate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const shop = ctx.shop!;
      const result = await getMetafield(shop, NAMESPACE, input.id);
      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "LPシナリオが見つかりません",
        });
      }

      const original = lpScenarioSchema.parse(JSON.parse(result.value));
      const newId = `lp_${Date.now().toString(36)}`;
      const now = new Date().toISOString();

      const duplicate: LpScenario = {
        ...original,
        id: newId,
        name: `${original.name} (コピー)`,
        status: "draft",
        created_at: now,
        updated_at: now,
      };

      await setMetafield(shop, NAMESPACE, newId, JSON.stringify(duplicate));

      const index = await getLpScenariosIndex(shop);
      index.scenarios.push({
        id: newId,
        name: duplicate.name,
        status: "draft",
        updated_at: now,
      });
      await saveLpScenariosIndex(shop, index);

      return duplicate;
    }),
});
