import { z } from "zod";

// ===== 基本パーツ =====

export const choiceSchema = z.object({
  id: z.string(),
  label: z.string(),
  icon_url: z.string().nullable(),
  url: z.string().nullable().optional().default(null),
  sort_order: z.number(),
});

export const afterActionSchema = z.object({
  label: z.string(),
  target_node_id: z.string(),
});

export const faqItemSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  sort_order: z.number(),
});

export const productDataSchema = z.object({
  id: z.string(),
  title: z.string(),
  handle: z.string(),
  image_url: z.string().nullable(),
  price: z.string(),
  currency: z.string(),
});

// ===== ノード定義 =====

const baseNodeFields = {
  id: z.string(),
  parent_choice_id: z.string().nullable(),
  sort_order: z.number(),
};

export const messageNodeSchema = z.object({
  ...baseNodeFields,
  type: z.literal("message"),
  text: z.string(),
  image_url: z.string().nullable(),
});

export const choiceNodeSchema = z.object({
  ...baseNodeFields,
  type: z.literal("choice"),
  text: z.string(),
  choices: z.array(choiceSchema),
});

export const productCardNodeSchema = z.object({
  ...baseNodeFields,
  type: z.literal("product_card"),
  shopify_product_ids: z.array(z.string()),
  products: z.array(productDataSchema).optional().default([]),
  after_actions: z.array(afterActionSchema),
});

export const linkNodeSchema = z.object({
  ...baseNodeFields,
  type: z.literal("link"),
  text: z.string(),
  button_text: z.string(),
  url: z.string(),
});

export const faqNodeSchema = z.object({
  ...baseNodeFields,
  type: z.literal("faq"),
  text: z.string(),
  items: z.array(faqItemSchema),
  resolved_label: z.string().optional().default(""),
  resolved_next_node_id: z.string().nullable().optional().default(null),
});

export const scenarioNodeSchema = z.discriminatedUnion("type", [
  messageNodeSchema,
  choiceNodeSchema,
  productCardNodeSchema,
  linkNodeSchema,
  faqNodeSchema,
]);

// ===== 表示設定 =====

export const scenarioDisplaySchema = z.object({
  mode: z.enum(["all", "specific_only", "specific_exclude"]).default("all"),
  pages: z.array(z.string()).default([]),
});

// ===== シナリオ =====

export const scenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  status: z.enum(["draft", "published"]),
  priority: z.number().optional().default(0),
  created_at: z.string(),
  updated_at: z.string(),
  nodes: z.array(scenarioNodeSchema),
  display: scenarioDisplaySchema.optional().default({ mode: "all", pages: [] }),
});

export const scenarioIndexEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["draft", "published"]),
  priority: z.number().optional().default(0),
  updated_at: z.string(),
});

export const scenariosIndexSchema = z.object({
  scenarios: z.array(scenarioIndexEntrySchema),
});

// ===== ウィジェット設定 =====

export const displayRuleSchema = z.object({
  id: z.string(),
  scenario_id: z.string(),
  match_type: z.enum([
    "all",
    "exact",
    "contains",
    "prefix",
    "products",
    "collections",
    "home",
  ]),
  match_value: z.string().nullable(),
  is_active: z.boolean(),
  priority: z.number(),
});

export const widgetDesignSchema = z.object({
  primary_color: z.string().default("#4A90D9"),
  bot_name: z.string().default("ショップアシスタント"),
  bot_icon_url: z.string().nullable().default(null),
  font_size: z.enum(["small", "medium", "large"]).default("medium"),
  position: z.enum(["bottom_right", "bottom_left"]).default("bottom_right"),
  welcome_message: z.string().default("お買い物でお困りですか？"),
});

export const widgetConfigSchema = z.object({
  design: widgetDesignSchema,
  rules: z.array(displayRuleSchema),
});

// ===== ストアフロント用コンパイルデータ =====

export const storefrontDataSchema = z.object({
  config: widgetConfigSchema,
  scenarios: z.record(z.string(), scenarioSchema),
});

// ===== 型エクスポート =====

export type Choice = z.infer<typeof choiceSchema>;
export type AfterAction = z.infer<typeof afterActionSchema>;
export type FaqItem = z.infer<typeof faqItemSchema>;
export type ProductData = z.infer<typeof productDataSchema>;
export type MessageNode = z.infer<typeof messageNodeSchema>;
export type ChoiceNode = z.infer<typeof choiceNodeSchema>;
export type ProductCardNode = z.infer<typeof productCardNodeSchema>;
export type LinkNode = z.infer<typeof linkNodeSchema>;
export type FaqNode = z.infer<typeof faqNodeSchema>;
export type ScenarioNode = z.infer<typeof scenarioNodeSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
export type ScenarioIndexEntry = z.infer<typeof scenarioIndexEntrySchema>;
export type ScenariosIndex = z.infer<typeof scenariosIndexSchema>;
export type ScenarioDisplay = z.infer<typeof scenarioDisplaySchema>;
export type DisplayRule = z.infer<typeof displayRuleSchema>;
export type WidgetDesign = z.infer<typeof widgetDesignSchema>;
export type WidgetConfig = z.infer<typeof widgetConfigSchema>;
export type StorefrontData = z.infer<typeof storefrontDataSchema>;
