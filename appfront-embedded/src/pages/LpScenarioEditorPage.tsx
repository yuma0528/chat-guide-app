import { useState, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  Page,
  Layout,
  Card,
  TextField,
  Select,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Checkbox,
  Spinner,
  Banner,
  Divider,
  Thumbnail,
} from "@shopify/polaris";
import { DeleteIcon } from "@shopify/polaris-icons";
import { trpc } from "../lib/trpc";
import LpBlockEditor from "../components/LpBlockEditor";
import LpChatPreview from "../components/LpChatPreview";
import type { LpBlock, LpScenario, LpProductItem } from "../../../functions/src/types/lpScenario";

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
}

const BLOCK_TYPE_OPTIONS = [
  { label: "メッセージ", value: "message" },
  { label: "割引コード", value: "discount_code" },
  { label: "お客様の声", value: "reviews" },
];

function createDefaultBlock(type: string, sortOrder: number): LpBlock {
  const base = { id: generateId("block"), sort_order: sortOrder };
  switch (type) {
    case "message":
      return { ...base, type: "message", text: "", image_url: null };
    case "discount_code":
      return { ...base, type: "discount_code", label: "", code: "", description: "" };
    case "reviews":
      return { ...base, type: "reviews", heading: "お客様の声", items: [] };
    default:
      return { ...base, type: "message", text: "", image_url: null };
  }
}

export default function LpScenarioEditorPage() {
  const { id } = useParams<{ id: string }>();
  const utils = trpc.useUtils();

  const { data: scenario, isLoading } = trpc.lpScenarios.get.useQuery(
    { id: id! },
    { enabled: !!id }
  );

  const updateMutation = trpc.lpScenarios.update.useMutation({
    onSuccess: () => {
      utils.lpScenarios.get.invalidate({ id: id! });
      utils.lpScenarios.list.invalidate();
    },
  });

  const [editedName, setEditedName] = useState<string | null>(null);
  const [editedDescription, setEditedDescription] = useState<string | null>(null);
  const [editedBlocks, setEditedBlocks] = useState<LpBlock[] | null>(null);
  const [editedProducts, setEditedProducts] = useState<LpProductItem[] | null>(null);
  const [editedAllowQuantity, setEditedAllowQuantity] = useState<boolean | null>(null);
  const [editedCustomerForm, setEditedCustomerForm] = useState<{
    require_phone: boolean;
    require_address: boolean;
    submit_button_text: string;
  } | null>(null);
  const [addBlockType, setAddBlockType] = useState("message");
  const [showPreview, setShowPreview] = useState(false);

  const name = editedName ?? scenario?.name ?? "";
  const description = editedDescription ?? scenario?.description ?? "";
  const blocks = editedBlocks ?? scenario?.blocks ?? [];
  const products = editedProducts ?? scenario?.products ?? [];
  const allowQuantity = editedAllowQuantity ?? scenario?.allow_quantity ?? false;
  const customerForm = editedCustomerForm ?? scenario?.customer_form ?? {
    require_phone: true,
    require_address: true,
    submit_button_text: "購入手続きへ進む",
  };

  const hasChanges = useMemo(() => {
    return editedName !== null || editedDescription !== null || editedBlocks !== null || editedProducts !== null || editedAllowQuantity !== null || editedCustomerForm !== null;
  }, [editedName, editedDescription, editedBlocks, editedProducts, editedAllowQuantity, editedCustomerForm]);

  const handleSave = useCallback(() => {
    if (!id) return;
    updateMutation.mutate({
      id,
      name,
      description,
      blocks,
      products,
      allow_quantity: allowQuantity,
      customer_form: customerForm,
    });
    setEditedName(null);
    setEditedDescription(null);
    setEditedBlocks(null);
    setEditedProducts(null);
    setEditedAllowQuantity(null);
    setEditedCustomerForm(null);
  }, [id, name, description, blocks, products, allowQuantity, customerForm, updateMutation]);

  const handleBlockChange = useCallback(
    (index: number, updatedBlock: LpBlock) => {
      const newBlocks = [...blocks];
      newBlocks[index] = updatedBlock;
      setEditedBlocks(newBlocks);
    },
    [blocks]
  );

  const handleDeleteBlock = useCallback(
    (index: number) => {
      setEditedBlocks(blocks.filter((_, i) => i !== index));
    },
    [blocks]
  );

  const handleMoveBlock = useCallback(
    (index: number, direction: "up" | "down") => {
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= blocks.length) return;
      const newBlocks = [...blocks];
      [newBlocks[index], newBlocks[swapIndex]] = [newBlocks[swapIndex], newBlocks[index]];
      newBlocks.forEach((b, i) => (b.sort_order = i));
      setEditedBlocks(newBlocks);
    },
    [blocks]
  );

  const handleAddBlock = useCallback(() => {
    const newBlock = createDefaultBlock(addBlockType, blocks.length);
    setEditedBlocks([...blocks, newBlock]);
  }, [addBlockType, blocks]);

  if (isLoading) {
    return (
      <Page title="LPシナリオ編集" backAction={{ url: "/lp-scenarios" }}>
        <Layout>
          <Layout.Section>
            <Card>
              <InlineStack align="center">
                <Spinner size="large" />
              </InlineStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  if (!scenario) {
    return (
      <Page title="LPシナリオ編集" backAction={{ url: "/lp-scenarios" }}>
        <Layout>
          <Layout.Section>
            <Banner tone="critical">シナリオが見つかりません</Banner>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page
      title={name || "LPシナリオ編集"}
      backAction={{ url: "/lp-scenarios" }}
      primaryAction={{
        content: "保存",
        onAction: handleSave,
        loading: updateMutation.isPending,
        disabled: !hasChanges,
      }}
      secondaryActions={[
        {
          content: "プレビュー",
          onAction: () => setShowPreview(true),
        },
      ]}
    >
      <Layout>
        {updateMutation.isError && (
          <Layout.Section>
            <Banner tone="critical">
              保存に失敗しました: {updateMutation.error.message}
            </Banner>
          </Layout.Section>
        )}

        {updateMutation.isSuccess && !hasChanges && (
          <Layout.Section>
            <Banner tone="success">保存しました</Banner>
          </Layout.Section>
        )}

        {/* 基本情報 */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                基本情報
              </Text>
              <TextField
                label="シナリオ名"
                value={name}
                onChange={setEditedName}
                autoComplete="off"
              />
              <TextField
                label="説明"
                value={description}
                onChange={setEditedDescription}
                autoComplete="off"
                multiline={2}
              />
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* ブロック一覧 */}
        <Layout.Section>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              ブロック
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              ブロックは上から順にチャット形式で表示されます。最後に自動でお客様情報入力フォームが表示されます。
            </Text>
            {blocks.map((block, idx) => (
              <LpBlockEditor
                key={block.id}
                block={block}
                index={idx}
                totalBlocks={blocks.length}
                onChange={(b) => handleBlockChange(idx, b)}
                onDelete={() => handleDeleteBlock(idx)}
                onMoveUp={() => handleMoveBlock(idx, "up")}
                onMoveDown={() => handleMoveBlock(idx, "down")}
              />
            ))}
            <Card>
              <InlineStack gap="200" blockAlign="end">
                <div style={{ flex: 1 }}>
                  <Select
                    label="ブロックタイプ"
                    options={BLOCK_TYPE_OPTIONS}
                    value={addBlockType}
                    onChange={setAddBlockType}
                  />
                </div>
                <Button onClick={handleAddBlock}>追加</Button>
              </InlineStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        <Layout.Section>
          <Divider />
        </Layout.Section>

        {/* 商品設定 */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                商品設定
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                ブロック表示後、お客様が選択する商品です。最大5商品まで設定できます。
              </Text>
              <Checkbox
                label="数量を変更可能にする"
                checked={allowQuantity}
                onChange={(checked) => setEditedAllowQuantity(checked)}
              />
              {products.map((product, idx) => (
                <Card key={product.id}>
                  <InlineStack gap="300" blockAlign="start">
                    {product.image_url && (
                      <Thumbnail
                        source={product.image_url}
                        alt={product.title}
                        size="medium"
                      />
                    )}
                    <BlockStack gap="200">
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        {product.title}
                      </Text>
                      {product.variants.length > 1 && (
                        <Text as="span" variant="bodySm" tone="subdued">
                          {product.variants.length}バリアント
                        </Text>
                      )}
                      <Text as="span" variant="bodySm">
                        ¥{product.variants[0]?.price || "0"}
                      </Text>
                      <Button
                        icon={DeleteIcon}
                        tone="critical"
                        variant="plain"
                        onClick={() => {
                          setEditedProducts(products.filter((_, i) => i !== idx));
                        }}
                      >
                        削除
                      </Button>
                    </BlockStack>
                  </InlineStack>
                </Card>
              ))}
              <Button
                onClick={async () => {
                  try {
                    const selected = await (window as any).shopify.resourcePicker({
                      type: "product",
                      action: "select",
                      multiple: true,
                      selectionIds: products.map((p) => ({
                        id: p.shopify_product_id,
                      })),
                    });
                    if (!selected) return;
                    const newProducts: LpProductItem[] = selected.slice(0, 5).map(
                      (p: any, i: number) => ({
                        id: generateId("prod"),
                        shopify_product_id: p.id,
                        title: p.title,
                        handle: p.handle,
                        image_url: p.images?.[0]?.originalSrc || null,
                        variants: (p.variants || []).map((v: any) => ({
                          id: v.id,
                          title: v.title || v.displayName || "デフォルト",
                          price: v.price,
                          currency: "JPY",
                        })),
                        default_variant_id: p.variants?.[0]?.id || null,
                        default_quantity: 1,
                        sort_order: i,
                      })
                    );
                    setEditedProducts(newProducts);
                  } catch (e) {
                    console.error("Resource picker error:", e);
                  }
                }}
              >
                {products.length > 0 ? "商品を変更" : "商品を選択"}
              </Button>
              {products.length >= 5 && (
                <Text as="p" variant="bodySm" tone="subdued">
                  最大5商品まで選択できます
                </Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Divider />
        </Layout.Section>

        {/* お客様情報フォーム設定 */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                お客様情報フォーム設定
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                チャットの最後に表示されるフォームの設定です。お名前とメールアドレスは必須です。
              </Text>
              <Checkbox
                label="電話番号を入力させる"
                checked={customerForm.require_phone}
                onChange={(checked) =>
                  setEditedCustomerForm({
                    ...customerForm,
                    require_phone: checked,
                  })
                }
              />
              <Checkbox
                label="住所を入力させる"
                checked={customerForm.require_address}
                onChange={(checked) =>
                  setEditedCustomerForm({
                    ...customerForm,
                    require_address: checked,
                  })
                }
              />
              <TextField
                label="購入ボタンのテキスト"
                value={customerForm.submit_button_text}
                onChange={(text) =>
                  setEditedCustomerForm({
                    ...customerForm,
                    submit_button_text: text,
                  })
                }
                autoComplete="off"
              />
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      {showPreview && (
        <LpChatPreview
          scenario={{
            ...scenario,
            name,
            description,
            blocks,
            products,
            allow_quantity: allowQuantity,
            customer_form: customerForm,
          } as LpScenario}
          onClose={() => setShowPreview(false)}
        />
      )}
    </Page>
  );
}
