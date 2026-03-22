import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  getMetafield,
  setMetafield,
  deleteMetafield,
} from "../shopify/metafields";
import {
  scenarioSchema,
  scenariosIndexSchema,
  scenarioNodeSchema,
  scenarioDisplaySchema,
} from "../types/chatGuide";
import type { ScenariosIndex, Scenario, ScenarioNode } from "../types/chatGuide";
import { updateStorefrontData } from "./widgetConfig";

const NAMESPACE = "chat_guide";

async function getScenariosIndex(shop: string): Promise<ScenariosIndex> {
  const result = await getMetafield(shop, NAMESPACE, "scenarios_index");
  if (!result) return { scenarios: [] };
  return scenariosIndexSchema.parse(JSON.parse(result.value));
}

async function saveScenariosIndex(
  shop: string,
  index: ScenariosIndex
): Promise<void> {
  await setMetafield(
    shop,
    NAMESPACE,
    "scenarios_index",
    JSON.stringify(index)
  );
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
}

function getTemplateNodes(template: string): ScenarioNode[] {
  switch (template) {
    case "gift_guide": {
      const choiceId1 = genId("choice");
      const choiceId2 = genId("choice");
      const choiceId3 = genId("choice");
      return [
        { id: genId("node"), type: "message", parent_choice_id: null, sort_order: 0, text: "こんにちは！ギフト選びをお手伝いします", image_url: null },
        { id: genId("node"), type: "choice", parent_choice_id: null, sort_order: 1, text: "どなたへのプレゼントですか？", choices: [
          { id: choiceId1, label: "パートナーへ", icon_url: null, url: null, sort_order: 0 },
          { id: choiceId2, label: "友人へ", icon_url: null, url: null, sort_order: 1 },
          { id: choiceId3, label: "自分へのご褒美", icon_url: null, url: null, sort_order: 2 },
        ]},
        { id: genId("node"), type: "message", parent_choice_id: choiceId1, sort_order: 0, text: "パートナーへのギフトですね！ご予算はどのくらいですか？", image_url: null },
        { id: genId("node"), type: "message", parent_choice_id: choiceId2, sort_order: 0, text: "お友達へのギフトですね！どんなジャンルが良いですか？", image_url: null },
        { id: genId("node"), type: "message", parent_choice_id: choiceId3, sort_order: 0, text: "自分へのご褒美、素敵ですね！", image_url: null },
      ];
    }
    case "faq": {
      const faqId1 = genId("faq");
      const faqId2 = genId("faq");
      const faqId3 = genId("faq");
      const catId1 = genId("choice");
      const catId2 = genId("choice");
      const catId3 = genId("choice");
      return [
        { id: genId("node"), type: "message", parent_choice_id: null, sort_order: 0, text: "こんにちは！ご質問にお答えします", image_url: null },
        { id: genId("node"), type: "choice", parent_choice_id: null, sort_order: 1, text: "何についてお知りになりたいですか？", choices: [
          { id: catId1, label: "配送について", icon_url: null, url: null, sort_order: 0 },
          { id: catId2, label: "返品・交換について", icon_url: null, url: null, sort_order: 1 },
          { id: catId3, label: "お支払いについて", icon_url: null, url: null, sort_order: 2 },
        ]},
        { id: genId("node"), type: "faq", parent_choice_id: catId1, sort_order: 0, text: "配送に関するよくある質問です", items: [
          { id: faqId1, question: "送料はいくらですか？", answer: "〇〇円以上のご注文で送料無料です。", sort_order: 0 },
          { id: genId("faq"), question: "届くまで何日かかりますか？", answer: "通常1〜3営業日でお届けします。", sort_order: 1 },
        ], resolved_label: "", resolved_next_node_id: null },
        { id: genId("node"), type: "faq", parent_choice_id: catId2, sort_order: 0, text: "返品・交換についてのご質問です", items: [
          { id: faqId2, question: "返品は可能ですか？", answer: "商品到着後7日以内であれば返品可能です。", sort_order: 0 },
        ], resolved_label: "", resolved_next_node_id: null },
        { id: genId("node"), type: "faq", parent_choice_id: catId3, sort_order: 0, text: "お支払いに関するご質問です", items: [
          { id: faqId3, question: "どんな支払い方法がありますか？", answer: "クレジットカード、銀行振込、コンビニ払いに対応しています。", sort_order: 0 },
        ], resolved_label: "", resolved_next_node_id: null },
      ];
    }
    case "product_guide": {
      const catId1 = genId("choice");
      const catId2 = genId("choice");
      const catId3 = genId("choice");
      return [
        { id: genId("node"), type: "message", parent_choice_id: null, sort_order: 0, text: "いらっしゃいませ！商品選びをお手伝いします", image_url: null },
        { id: genId("node"), type: "choice", parent_choice_id: null, sort_order: 1, text: "どんな商品をお探しですか？", choices: [
          { id: catId1, label: "カテゴリから探す", icon_url: null, url: null, sort_order: 0 },
          { id: catId2, label: "ランキングを見る", icon_url: null, url: null, sort_order: 1 },
          { id: catId3, label: "セール商品を見る", icon_url: null, url: null, sort_order: 2 },
        ]},
        { id: genId("node"), type: "message", parent_choice_id: catId1, sort_order: 0, text: "カテゴリ一覧です。気になるカテゴリを選んでください！", image_url: null },
        { id: genId("node"), type: "link", parent_choice_id: catId2, sort_order: 0, text: "人気ランキングはこちらからご覧いただけます", button_text: "ランキングを見る", url: "/collections/best-sellers" },
        { id: genId("node"), type: "link", parent_choice_id: catId3, sort_order: 0, text: "お得なセール商品をチェック！", button_text: "セール会場へ", url: "/collections/sale" },
      ];
    }
    default:
      return [];
  }
}

export const scenariosRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getScenariosIndex(ctx.shop!);
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await getMetafield(ctx.shop!, NAMESPACE, input.id);
      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "シナリオが見つかりません",
        });
      }
      return scenarioSchema.parse(JSON.parse(result.value));
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        template: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const shop = ctx.shop!;
      const index = await getScenariosIndex(shop);
      const id = `scenario_${Date.now().toString(36)}`;
      const now = new Date().toISOString();

      const nodes = input.template
        ? getTemplateNodes(input.template)
        : [];

      const maxPriority = index.scenarios.reduce((max, s) => Math.max(max, s.priority ?? 0), -1);
      const priority = maxPriority + 1;

      const scenario: Scenario = {
        id,
        name: input.name,
        description: input.description || "",
        status: "draft",
        priority,
        created_at: now,
        updated_at: now,
        nodes,
        display: { mode: "all", pages: [] },
      };

      await setMetafield(shop, NAMESPACE, id, JSON.stringify(scenario));

      index.scenarios.push({
        id,
        name: input.name,
        status: "draft",
        priority,
        updated_at: now,
      });
      await saveScenariosIndex(shop, index);

      return scenario;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        nodes: z.array(scenarioNodeSchema).optional(),
        status: z.enum(["draft", "published"]).optional(),
        priority: z.number().optional(),
        display: scenarioDisplaySchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const shop = ctx.shop!;
      const result = await getMetafield(shop, NAMESPACE, input.id);
      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "シナリオが見つかりません",
        });
      }

      const scenario = scenarioSchema.parse(JSON.parse(result.value));
      const now = new Date().toISOString();

      if (input.name !== undefined) scenario.name = input.name;
      if (input.description !== undefined)
        scenario.description = input.description;
      if (input.nodes !== undefined) scenario.nodes = input.nodes;
      if (input.status !== undefined) scenario.status = input.status;
      if (input.priority !== undefined) scenario.priority = input.priority;
      if (input.display !== undefined) scenario.display = input.display;
      scenario.updated_at = now;

      await setMetafield(shop, NAMESPACE, input.id, JSON.stringify(scenario));

      // インデックスも更新
      const index = await getScenariosIndex(shop);
      const entry = index.scenarios.find((s) => s.id === input.id);
      if (entry) {
        if (input.name !== undefined) entry.name = input.name;
        if (input.status !== undefined) entry.status = input.status;
        if (input.priority !== undefined) entry.priority = input.priority;
        entry.updated_at = now;
        await saveScenariosIndex(shop, index);
      }

      // ストアフロントデータを再コンパイル
      await updateStorefrontData(shop);

      return scenario;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const shop = ctx.shop!;

      // シナリオメタフィールドを削除
      try {
        await deleteMetafield(shop, NAMESPACE, input.id);
      } catch {
        // メタフィールドが存在しなくてもOK
      }

      // インデックスから削除
      const index = await getScenariosIndex(shop);
      index.scenarios = index.scenarios.filter((s) => s.id !== input.id);
      await saveScenariosIndex(shop, index);

      // ストアフロントデータを再コンパイル
      await updateStorefrontData(shop);

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
          message: "シナリオが見つかりません",
        });
      }

      const original = scenarioSchema.parse(JSON.parse(result.value));
      const newId = `scenario_${Date.now().toString(36)}`;
      const now = new Date().toISOString();

      const index = await getScenariosIndex(shop);
      const maxPriority = index.scenarios.reduce((max, s) => Math.max(max, s.priority ?? 0), -1);

      const duplicate: Scenario = {
        ...original,
        id: newId,
        name: `${original.name} (コピー)`,
        status: "draft",
        priority: maxPriority + 1,
        created_at: now,
        updated_at: now,
      };

      await setMetafield(shop, NAMESPACE, newId, JSON.stringify(duplicate));

      index.scenarios.push({
        id: newId,
        name: duplicate.name,
        status: "draft",
        priority: maxPriority + 1,
        updated_at: now,
      });
      await saveScenariosIndex(shop, index);

      return duplicate;
    }),

  reorder: protectedProcedure
    .input(z.object({
      orderedIds: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const shop = ctx.shop!;
      const index = await getScenariosIndex(shop);

      // インデックスの優先順位を更新
      for (let i = 0; i < input.orderedIds.length; i++) {
        const entry = index.scenarios.find((s) => s.id === input.orderedIds[i]);
        if (entry) entry.priority = i;
      }
      await saveScenariosIndex(shop, index);

      // 各シナリオメタフィールドのpriorityも更新
      for (let i = 0; i < input.orderedIds.length; i++) {
        const result = await getMetafield(shop, NAMESPACE, input.orderedIds[i]);
        if (result) {
          const scenario = scenarioSchema.parse(JSON.parse(result.value));
          scenario.priority = i;
          await setMetafield(shop, NAMESPACE, input.orderedIds[i], JSON.stringify(scenario));
        }
      }

      // ストアフロントデータを再コンパイル
      await updateStorefrontData(shop);

      return { success: true };
    }),
});
