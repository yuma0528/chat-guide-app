import {
  Card,
  TextField,
  Select,
  Button,
  ButtonGroup,
  BlockStack,
  InlineStack,
  Text,
} from "@shopify/polaris";
import { DeleteIcon } from "@shopify/polaris-icons";
import type {
  LpBlock,
  LpReviewItem,
} from "../../../functions/src/types/lpScenario";

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
}

const BLOCK_TYPE_LABELS: Record<string, string> = {
  message: "メッセージ",
  discount_code: "割引コード",
  reviews: "お客様の声",
};

interface LpBlockEditorProps {
  block: LpBlock;
  index: number;
  totalBlocks: number;
  onChange: (block: LpBlock) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export default function LpBlockEditor({
  block,
  index,
  totalBlocks,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: LpBlockEditorProps) {
  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <InlineStack gap="200" blockAlign="center">
            <ButtonGroup>
              <Button
                size="slim"
                disabled={index === 0}
                onClick={onMoveUp}
              >
                ↑
              </Button>
              <Button
                size="slim"
                disabled={index === totalBlocks - 1}
                onClick={onMoveDown}
              >
                ↓
              </Button>
            </ButtonGroup>
            <Text as="h3" variant="headingSm">
              {BLOCK_TYPE_LABELS[block.type] || block.type}
            </Text>
          </InlineStack>
          <Button
            icon={DeleteIcon}
            tone="critical"
            variant="plain"
            onClick={onDelete}
          />
        </InlineStack>

        {block.type === "message" && (
          <MessageBlockFields block={block} onChange={onChange} />
        )}
        {block.type === "discount_code" && (
          <DiscountBlockFields block={block} onChange={onChange} />
        )}
        {block.type === "reviews" && (
          <ReviewsBlockFields block={block} onChange={onChange} />
        )}
      </BlockStack>
    </Card>
  );
}

// ===== Message Block =====

function MessageBlockFields({
  block,
  onChange,
}: {
  block: Extract<LpBlock, { type: "message" }>;
  onChange: (b: LpBlock) => void;
}) {
  return (
    <BlockStack gap="200">
      <TextField
        label="テキスト"
        value={block.text}
        onChange={(text) => onChange({ ...block, text })}
        multiline={3}
        autoComplete="off"
      />
      <TextField
        label="画像URL（任意）"
        value={block.image_url || ""}
        onChange={(url) => onChange({ ...block, image_url: url || null })}
        autoComplete="off"
        placeholder="https://..."
      />
    </BlockStack>
  );
}

// ===== Discount Code Block =====

function DiscountBlockFields({
  block,
  onChange,
}: {
  block: Extract<LpBlock, { type: "discount_code" }>;
  onChange: (b: LpBlock) => void;
}) {
  return (
    <BlockStack gap="200">
      <TextField
        label="ラベル"
        value={block.label}
        onChange={(label) => onChange({ ...block, label })}
        autoComplete="off"
        placeholder="例: 今だけ10%OFF！"
      />
      <TextField
        label="割引コード"
        value={block.code}
        onChange={(code) => onChange({ ...block, code })}
        autoComplete="off"
        placeholder="例: SAVE10"
      />
      <TextField
        label="説明"
        value={block.description}
        onChange={(description) => onChange({ ...block, description })}
        autoComplete="off"
        placeholder="例: カート画面で入力してください"
      />
    </BlockStack>
  );
}

// ===== Reviews Block =====

function ReviewsBlockFields({
  block,
  onChange,
}: {
  block: Extract<LpBlock, { type: "reviews" }>;
  onChange: (b: LpBlock) => void;
}) {
  const addReview = () => {
    const newItem: LpReviewItem = {
      id: generateId("review"),
      name: "",
      rating: 5,
      comment: "",
      sort_order: block.items.length,
    };
    onChange({ ...block, items: [...block.items, newItem] });
  };

  const updateReview = (idx: number, updates: Partial<LpReviewItem>) => {
    const items = [...block.items];
    items[idx] = { ...items[idx], ...updates };
    onChange({ ...block, items });
  };

  const removeReview = (idx: number) => {
    onChange({
      ...block,
      items: block.items.filter((_, i) => i !== idx),
    });
  };

  const ratingOptions = [
    { label: "★★★★★ (5)", value: "5" },
    { label: "★★★★☆ (4)", value: "4" },
    { label: "★★★☆☆ (3)", value: "3" },
    { label: "★★☆☆☆ (2)", value: "2" },
    { label: "★☆☆☆☆ (1)", value: "1" },
  ];

  return (
    <BlockStack gap="300">
      <TextField
        label="見出し"
        value={block.heading}
        onChange={(heading) => onChange({ ...block, heading })}
        autoComplete="off"
        placeholder="例: お客様の声"
      />
      {block.items.map((item, idx) => (
        <Card key={item.id}>
          <BlockStack gap="200">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="span" variant="bodySm" tone="subdued">
                レビュー {idx + 1}
              </Text>
              <Button
                icon={DeleteIcon}
                variant="plain"
                tone="critical"
                onClick={() => removeReview(idx)}
              />
            </InlineStack>
            <InlineStack gap="200">
              <div style={{ flex: 1 }}>
                <TextField
                  label="お名前"
                  value={item.name}
                  onChange={(name) => updateReview(idx, { name })}
                  autoComplete="off"
                />
              </div>
              <div style={{ width: "160px" }}>
                <Select
                  label="評価"
                  options={ratingOptions}
                  value={String(item.rating)}
                  onChange={(val) => updateReview(idx, { rating: Number(val) })}
                />
              </div>
            </InlineStack>
            <TextField
              label="コメント"
              value={item.comment}
              onChange={(comment) => updateReview(idx, { comment })}
              multiline={2}
              autoComplete="off"
            />
          </BlockStack>
        </Card>
      ))}
      <Button onClick={addReview}>レビューを追加</Button>
    </BlockStack>
  );
}

