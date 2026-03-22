import { useCallback } from "react";
import {
  Card,
  TextField,
  Select,
  Button,
  ButtonGroup,
  BlockStack,
  InlineStack,
  Text,
  Icon,
  Thumbnail,
} from "@shopify/polaris";
import { DeleteIcon, ChevronRightIcon, DragHandleIcon } from "@shopify/polaris-icons";
import type {
  ScenarioNode,
  Choice,
  AfterAction,
  FaqItem,
  ProductData,
} from "../../../functions/src/types/chatGuide";

// ===== 共通ヘルパー =====

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
}

// ===== 型定義 =====

export interface NodeOption {
  id: string;
  label: string;
}

interface NodeEditorProps {
  node: ScenarioNode;
  index: number;
  totalNodes: number;
  onChange: (node: ScenarioNode) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onNavigateToChoice?: (choiceId: string, choiceLabel: string) => void;
  allNodes: NodeOption[];
}

const NODE_TYPE_OPTIONS = [
  { label: "メッセージ", value: "message" },
  { label: "選択肢", value: "choice" },
  { label: "商品カード", value: "product_card" },
  { label: "リンク", value: "link" },
  { label: "FAQ", value: "faq" },
];

// ===== メインコンポーネント =====

export default function NodeEditor({
  node,
  index,
  totalNodes,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  onNavigateToChoice,
  allNodes,
}: NodeEditorProps) {
  const handleTypeChange = useCallback(
    (newType: string) => {
      const base = {
        id: node.id,
        parent_choice_id: node.parent_choice_id,
        sort_order: node.sort_order,
      };
      switch (newType) {
        case "message":
          onChange({ ...base, type: "message", text: "", image_url: null });
          break;
        case "choice":
          onChange({ ...base, type: "choice", text: "", choices: [] });
          break;
        case "product_card":
          onChange({
            ...base,
            type: "product_card",
            shopify_product_ids: [],
            products: [],
            after_actions: [],
          });
          break;
        case "link":
          onChange({
            ...base,
            type: "link",
            text: "",
            button_text: "",
            url: "",
          });
          break;
        case "faq":
          onChange({
            ...base,
            type: "faq",
            text: "",
            items: [],
            resolved_label: "",
            resolved_next_node_id: null,
          });
          break;
      }
    },
    [node, onChange]
  );

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <InlineStack gap="200" blockAlign="center">
            <Icon source={DragHandleIcon} tone="subdued" />
            <Text as="span" variant="headingSm">
              ノード {index + 1}
            </Text>
          </InlineStack>
          <InlineStack gap="200">
            <ButtonGroup>
              <Button
                size="slim"
                onClick={onMoveUp}
                disabled={index === 0}
              >
                ↑
              </Button>
              <Button
                size="slim"
                onClick={onMoveDown}
                disabled={index === totalNodes - 1}
              >
                ↓
              </Button>
              <Button
                size="slim"
                tone="critical"
                onClick={onDelete}
                icon={DeleteIcon}
              />
            </ButtonGroup>
          </InlineStack>
        </InlineStack>

        <Select
          label="ノードタイプ"
          options={NODE_TYPE_OPTIONS}
          value={node.type}
          onChange={handleTypeChange}
        />

        {node.type === "message" && (
          <MessageNodeFields node={node} onChange={onChange} />
        )}
        {node.type === "choice" && (
          <ChoiceNodeFields
            node={node}
            onChange={onChange}
            onNavigateToChoice={onNavigateToChoice}
          />
        )}
        {node.type === "product_card" && (
          <ProductCardNodeFields node={node} onChange={onChange} allNodes={allNodes} />
        )}
        {node.type === "link" && (
          <LinkNodeFields node={node} onChange={onChange} />
        )}
        {node.type === "faq" && (
          <FaqNodeFields node={node} onChange={onChange} />
        )}
      </BlockStack>
    </Card>
  );
}

// ===== メッセージノード =====

function MessageNodeFields({
  node,
  onChange,
}: {
  node: Extract<ScenarioNode, { type: "message" }>;
  onChange: (node: ScenarioNode) => void;
}) {
  return (
    <BlockStack gap="300">
      <TextField
        label="テキスト"
        value={node.text}
        onChange={(text) => onChange({ ...node, text })}
        multiline={3}
        autoComplete="off"
        placeholder="ボットが表示するメッセージを入力"
      />
      <TextField
        label="画像URL（任意）"
        value={node.image_url || ""}
        onChange={(url) => onChange({ ...node, image_url: url || null })}
        autoComplete="off"
        placeholder="https://..."
      />
    </BlockStack>
  );
}

// ===== 選択肢ノード =====

function ChoiceNodeFields({
  node,
  onChange,
  onNavigateToChoice,
}: {
  node: Extract<ScenarioNode, { type: "choice" }>;
  onChange: (node: ScenarioNode) => void;
  onNavigateToChoice?: (choiceId: string, choiceLabel: string) => void;
}) {
  const addChoice = () => {
    const newChoice: Choice = {
      id: generateId("choice"),
      label: "",
      icon_url: null,
      url: null,
      sort_order: node.choices.length,
    };
    onChange({ ...node, choices: [...node.choices, newChoice] });
  };

  const updateChoice = (index: number, updates: Partial<Choice>) => {
    const choices = [...node.choices];
    choices[index] = { ...choices[index], ...updates };
    onChange({ ...node, choices });
  };

  const removeChoice = (index: number) => {
    onChange({
      ...node,
      choices: node.choices.filter((_, i) => i !== index),
    });
  };

  return (
    <BlockStack gap="300">
      <TextField
        label="テキスト"
        value={node.text}
        onChange={(text) => onChange({ ...node, text })}
        multiline={2}
        autoComplete="off"
        placeholder="質問テキスト（例: どなたへのプレゼントですか？）"
      />

      <Text as="h3" variant="headingSm">
        選択肢
      </Text>
      {node.choices.map((choice, idx) => (
        <BlockStack key={choice.id} gap="200">
          <InlineStack gap="200" blockAlign="center" wrap={false}>
            <div style={{ flex: 1 }}>
              <TextField
                label={`選択肢 ${idx + 1}`}
                labelHidden
                value={choice.label}
                onChange={(label) => updateChoice(idx, { label })}
                autoComplete="off"
                placeholder="選択肢のラベル"
              />
            </div>
            {onNavigateToChoice && !choice.url && (
              <Button
                size="slim"
                onClick={() => onNavigateToChoice(choice.id, choice.label)}
                icon={ChevronRightIcon}
              >
                子ノード
              </Button>
            )}
            <Button
              size="slim"
              tone="critical"
              onClick={() => removeChoice(idx)}
              icon={DeleteIcon}
            />
          </InlineStack>
          <TextField
            label="リンクURL（任意：設定するとページ遷移）"
            labelHidden
            value={choice.url || ""}
            onChange={(url) => updateChoice(idx, { url: url || null })}
            autoComplete="off"
            placeholder="リンクURL（任意：例 /collections/sale）"
            prefix="🔗"
          />
        </BlockStack>
      ))}
      {node.choices.length < 10 && (
        <Button onClick={addChoice} size="slim">
          + 選択肢を追加
        </Button>
      )}
    </BlockStack>
  );
}

// ===== 商品カードノード =====

function ProductCardNodeFields({
  node,
  onChange,
  allNodes,
}: {
  node: Extract<ScenarioNode, { type: "product_card" }>;
  onChange: (node: ScenarioNode) => void;
  allNodes: NodeOption[];
}) {
  const handlePickProducts = async () => {
    try {
      const selected = await (window as any).shopify.resourcePicker({
        type: "product",
        action: "select",
        multiple: true,
        selectionIds: node.shopify_product_ids.map((id: string) => ({ id })),
      });
      if (!selected) return;

      const products: ProductData[] = selected.slice(0, 3).map((p: any) => ({
        id: p.id,
        title: p.title,
        handle: p.handle,
        image_url: p.images?.[0]?.originalSrc || null,
        price: p.variants?.[0]?.price || "0",
        currency: "JPY",
      }));

      onChange({
        ...node,
        shopify_product_ids: products.map((p) => p.id),
        products,
      });
    } catch (e) {
      console.error("Resource picker error:", e);
    }
  };

  const addAction = () => {
    onChange({
      ...node,
      after_actions: [
        ...node.after_actions,
        { label: "", target_node_id: "__restart__" },
      ],
    });
  };

  const updateAction = (index: number, updates: Partial<AfterAction>) => {
    const actions = [...node.after_actions];
    actions[index] = { ...actions[index], ...updates };
    onChange({ ...node, after_actions: actions });
  };

  const removeAction = (index: number) => {
    onChange({
      ...node,
      after_actions: node.after_actions.filter((_, i) => i !== index),
    });
  };

  const nodeOptions = [
    { label: "最初からやり直す", value: "__restart__" },
    ...allNodes.map((n) => ({ label: n.label, value: n.id })),
  ];

  return (
    <BlockStack gap="300">
      <Button onClick={handlePickProducts}>商品を選択</Button>

      {(node.products || []).length > 0 && (
        <BlockStack gap="200">
          {(node.products || []).map((product) => (
            <InlineStack key={product.id} gap="300" blockAlign="center">
              {product.image_url && (
                <Thumbnail
                  source={product.image_url}
                  alt={product.title}
                  size="small"
                />
              )}
              <BlockStack gap="050">
                <Text as="span" variant="bodyMd" fontWeight="semibold">
                  {product.title}
                </Text>
                <Text as="span" variant="bodySm" tone="subdued">
                  ¥{Number(product.price).toLocaleString()}
                </Text>
              </BlockStack>
            </InlineStack>
          ))}
        </BlockStack>
      )}

      <Text as="h3" variant="headingSm">
        表示後のアクション
      </Text>
      {node.after_actions.map((action, idx) => (
        <InlineStack key={idx} gap="200" blockAlign="end">
          <div style={{ flex: 1 }}>
            <TextField
              label="ラベル"
              value={action.label}
              onChange={(label) => updateAction(idx, { label })}
              autoComplete="off"
              placeholder="例: 他の商品も見る"
            />
          </div>
          <div style={{ flex: 1 }}>
            <Select
              label="遷移先"
              options={nodeOptions}
              value={action.target_node_id}
              onChange={(target_node_id) =>
                updateAction(idx, { target_node_id })
              }
            />
          </div>
          <Button
            size="slim"
            tone="critical"
            onClick={() => removeAction(idx)}
            icon={DeleteIcon}
          />
        </InlineStack>
      ))}
      <Button onClick={addAction} size="slim">
        + アクションを追加
      </Button>
    </BlockStack>
  );
}

// ===== リンクノード =====

function LinkNodeFields({
  node,
  onChange,
}: {
  node: Extract<ScenarioNode, { type: "link" }>;
  onChange: (node: ScenarioNode) => void;
}) {
  return (
    <BlockStack gap="300">
      <TextField
        label="テキスト"
        value={node.text}
        onChange={(text) => onChange({ ...node, text })}
        multiline={2}
        autoComplete="off"
        placeholder="ボットのメッセージ"
      />
      <TextField
        label="ボタンテキスト"
        value={node.button_text}
        onChange={(button_text) => onChange({ ...node, button_text })}
        autoComplete="off"
        placeholder="例: セール特集を見る"
      />
      <TextField
        label="URL"
        value={node.url}
        onChange={(url) => onChange({ ...node, url })}
        autoComplete="off"
        placeholder="/collections/sale"
      />
    </BlockStack>
  );
}

// ===== FAQノード =====

function FaqNodeFields({
  node,
  onChange,
}: {
  node: Extract<ScenarioNode, { type: "faq" }>;
  onChange: (node: ScenarioNode) => void;
}) {
  const addItem = () => {
    const newItem: FaqItem = {
      id: generateId("faq"),
      question: "",
      answer: "",
      sort_order: node.items.length,
    };
    onChange({ ...node, items: [...node.items, newItem] });
  };

  const updateItem = (index: number, updates: Partial<FaqItem>) => {
    const items = [...node.items];
    items[index] = { ...items[index], ...updates };
    onChange({ ...node, items });
  };

  const removeItem = (index: number) => {
    onChange({
      ...node,
      items: node.items.filter((_, i) => i !== index),
    });
  };

  return (
    <BlockStack gap="300">
      <TextField
        label="テキスト"
        value={node.text}
        onChange={(text) => onChange({ ...node, text })}
        multiline={2}
        autoComplete="off"
        placeholder="ボットのメッセージ（例: よくある質問はこちらです！）"
      />

      <Text as="h3" variant="headingSm">
        Q&A一覧
      </Text>
      {node.items.map((item, idx) => (
        <Card key={item.id}>
          <BlockStack gap="200">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="span" variant="bodySm" fontWeight="semibold">
                Q&A {idx + 1}
              </Text>
              <Button
                size="slim"
                tone="critical"
                onClick={() => removeItem(idx)}
                icon={DeleteIcon}
              />
            </InlineStack>
            <TextField
              label="質問"
              value={item.question}
              onChange={(question) => updateItem(idx, { question })}
              autoComplete="off"
              placeholder="よくある質問"
            />
            <TextField
              label="回答"
              value={item.answer}
              onChange={(answer) => updateItem(idx, { answer })}
              multiline={2}
              autoComplete="off"
              placeholder="回答テキスト"
            />
          </BlockStack>
        </Card>
      ))}
      <Button onClick={addItem} size="slim">
        + Q&Aを追加
      </Button>
    </BlockStack>
  );
}
