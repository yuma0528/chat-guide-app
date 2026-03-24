import { z } from "zod";

// ===== LPブロック型 =====

const baseLpBlockFields = {
  id: z.string(),
  sort_order: z.number(),
};

export const lpMessageBlockSchema = z.object({
  ...baseLpBlockFields,
  type: z.literal("message"),
  text: z.string(),
  image_url: z.string().nullable(),
});

export const lpDiscountBlockSchema = z.object({
  ...baseLpBlockFields,
  type: z.literal("discount_code"),
  label: z.string(),
  code: z.string(),
  description: z.string(),
});

export const lpReviewItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string(),
  sort_order: z.number(),
});

export const lpReviewsBlockSchema = z.object({
  ...baseLpBlockFields,
  type: z.literal("reviews"),
  heading: z.string(),
  items: z.array(lpReviewItemSchema),
});

export const lpProductVariantSchema = z.object({
  id: z.string(),
  title: z.string(),
  price: z.string(),
  currency: z.string(),
});

export const lpProductItemSchema = z.object({
  id: z.string(),
  shopify_product_id: z.string(),
  title: z.string(),
  handle: z.string(),
  image_url: z.string().nullable(),
  variants: z.array(lpProductVariantSchema),
  default_variant_id: z.string().nullable(),
  default_quantity: z.number().default(1),
  sort_order: z.number(),
});

export const lpBlockSchema = z.discriminatedUnion("type", [
  lpMessageBlockSchema,
  lpDiscountBlockSchema,
  lpReviewsBlockSchema,
]);

// ===== お客様情報フォーム設定 =====

export const lpCustomerFormSchema = z.object({
  require_phone: z.boolean().default(true),
  require_address: z.boolean().default(true),
  submit_button_text: z.string().default("購入手続きへ進む"),
});

// ===== LPシナリオ =====

export const lpScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  status: z.enum(["draft", "published"]),
  created_at: z.string(),
  updated_at: z.string(),
  blocks: z.array(lpBlockSchema),
  products: z.array(lpProductItemSchema).default([]),
  allow_quantity: z.boolean().default(false),
  customer_form: lpCustomerFormSchema.default({}),
});

export const lpScenarioIndexEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["draft", "published"]),
  updated_at: z.string(),
});

export const lpScenariosIndexSchema = z.object({
  scenarios: z.array(lpScenarioIndexEntrySchema),
});

// ===== 型エクスポート =====

export type LpMessageBlock = z.infer<typeof lpMessageBlockSchema>;
export type LpDiscountBlock = z.infer<typeof lpDiscountBlockSchema>;
export type LpReviewItem = z.infer<typeof lpReviewItemSchema>;
export type LpReviewsBlock = z.infer<typeof lpReviewsBlockSchema>;
export type LpProductVariant = z.infer<typeof lpProductVariantSchema>;
export type LpProductItem = z.infer<typeof lpProductItemSchema>;
export type LpBlock = z.infer<typeof lpBlockSchema>;
export type LpCustomerForm = z.infer<typeof lpCustomerFormSchema>;
export type LpScenario = z.infer<typeof lpScenarioSchema>;
export type LpScenarioIndexEntry = z.infer<typeof lpScenarioIndexEntrySchema>;
export type LpScenariosIndex = z.infer<typeof lpScenariosIndexSchema>;
