import { getMetafield, setMetafield } from "../shopify/metafields";
import {
  scenariosIndexSchema,
  scenarioSchema,
} from "../types/chatGuide";
import type {
  ScenariosIndex,
  Scenario,
} from "../types/chatGuide";

const NAMESPACE = "chat_guide";

async function getScenariosIndex(shop: string): Promise<ScenariosIndex> {
  const result = await getMetafield(shop, NAMESPACE, "scenarios_index");
  if (!result) return { scenarios: [] };
  return scenariosIndexSchema.parse(JSON.parse(result.value));
}

export async function updateStorefrontData(shop: string): Promise<void> {
  const index = await getScenariosIndex(shop);

  const scenarios: Record<string, Scenario> = {};
  for (const entry of index.scenarios) {
    if (entry.status === "published") {
      const result = await getMetafield(shop, NAMESPACE, entry.id);
      if (result) {
        scenarios[entry.id] = scenarioSchema.parse(JSON.parse(result.value));
      }
    }
  }

  const storefrontData = { scenarios };
  await setMetafield(
    shop,
    NAMESPACE,
    "storefront_data",
    JSON.stringify(storefrontData)
  );
}
