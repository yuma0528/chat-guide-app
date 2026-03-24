import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  ButtonGroup,
  Badge,
  EmptyState,
  Modal,
  BlockStack,
  InlineStack,
  Spinner,
  Banner,
} from "@shopify/polaris";
import { trpc } from "../lib/trpc";

interface ScenarioTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** scenarios.ts の getTemplateNodes に渡すテンプレートキー（空文字なら空シナリオ） */
  templateKey: string;
}

const TEMPLATES: ScenarioTemplate[] = [
  {
    id: "blank",
    name: "白紙から作成",
    description: "空のシナリオ。自由にノードを組み立てて独自のフローを構築できます。",
    icon: "📄",
    templateKey: "",
  },
  {
    id: "gift_guide",
    name: "ギフトガイド",
    description: "贈る相手・予算・ジャンル・シーンで絞り込み、最適なギフトを提案する3階層の対話フロー。",
    icon: "🎁",
    templateKey: "gift_guide",
  },
  {
    id: "faq",
    name: "よくある質問（FAQ）",
    description: "配送・返品・支払い・商品・アカウントの5カテゴリ、各3〜5問の詳細なFAQを収録。",
    icon: "💬",
    templateKey: "faq",
  },
  {
    id: "product_guide",
    name: "商品おすすめナビ",
    description: "カテゴリ・ランキング・新着・セールの4つの入り口から商品ページへ誘導するナビゲーション。",
    icon: "🛍️",
    templateKey: "product_guide",
  },
  {
    id: "first_visitor",
    name: "初めてのお客様向けガイド",
    description: "ブランド紹介・おすすめ商品・初回限定クーポン案内・FAQ付きのウェルカムシナリオ。",
    icon: "🌸",
    templateKey: "first_visitor",
  },
  {
    id: "size_consultation",
    name: "サイズ相談ナビ",
    description: "トップス・ボトムス・シューズ・アクセサリー別のサイズ選びアドバイス。体型別おすすめ付き。",
    icon: "📏",
    templateKey: "size_consultation",
  },
];

export default function ScenarioListPage() {
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);
  const navigate = useNavigate();

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.scenarios.list.useQuery();
  const { data: storeProducts } = trpc.scenarios.fetchProducts.useQuery(
    { count: 3 },
    { enabled: showTemplateModal }
  );
  const createMutation = trpc.scenarios.create.useMutation({
    onSuccess: (scenario) => {
      utils.scenarios.list.invalidate();
      setShowTemplateModal(false);
      setCreatingTemplateId(null);
      navigate(`/scenarios/${scenario.id}`);
    },
  });
  const deleteMutation = trpc.scenarios.delete.useMutation({
    onSuccess: () => utils.scenarios.list.invalidate(),
  });
  const updateMutation = trpc.scenarios.update.useMutation({
    onSuccess: () => utils.scenarios.list.invalidate(),
  });
  const duplicateMutation = trpc.scenarios.duplicate.useMutation({
    onSuccess: () => utils.scenarios.list.invalidate(),
  });
  const reorderMutation = trpc.scenarios.reorder.useMutation({
    onSuccess: () => utils.scenarios.list.invalidate(),
  });

  const handleCreateFromTemplate = useCallback(
    (template: ScenarioTemplate) => {
      setCreatingTemplateId(template.id);
      createMutation.mutate({
        name: template.templateKey ? template.name : "新しいシナリオ",
        description: template.description,
        template: template.templateKey || undefined,
        products: storeProducts || undefined,
      });
    },
    [createMutation, storeProducts]
  );

  const handleToggleStatus = useCallback(
    (id: string, currentStatus: string) => {
      updateMutation.mutate({
        id,
        status: currentStatus === "published" ? "draft" : "published",
      });
    },
    [updateMutation]
  );

  const scenarios = useMemo(() => {
    const list = [...(data?.scenarios || [])];
    list.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    return list;
  }, [data]);

  const handleMove = useCallback(
    (index: number, direction: "up" | "down") => {
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= scenarios.length) return;
      const newOrder = scenarios.map((s) => s.id);
      [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];
      reorderMutation.mutate({ orderedIds: newOrder });
    },
    [scenarios, reorderMutation]
  );

  if (isLoading) {
    return (
      <Page title="シナリオ一覧" backAction={{ url: "/" }}>
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

  return (
    <Page
      title="シナリオ一覧"
      backAction={{ url: "/" }}
      primaryAction={{
        content: "新規作成",
        onAction: () => setShowTemplateModal(true),
      }}
    >
      <Layout>
        <Layout.Section>
          {scenarios.length === 0 ? (
            <Card>
              <EmptyState
                heading="シナリオがありません"
                action={{
                  content: "テンプレートから作成",
                  onAction: () => setShowTemplateModal(true),
                }}
                image=""
              >
                <p>
                  テンプレートを選んでシナリオを作成しましょう。チャットボットの対話フローを構築できます。
                </p>
              </EmptyState>
            </Card>
          ) : (
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                優先度の高い順に表示されます。同じページに複数のシナリオがマッチする場合、上のシナリオが優先されます。
              </Text>
              {scenarios.map((scenario, index) => (
                <Card key={scenario.id}>
                  <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="200" blockAlign="center">
                        <ButtonGroup>
                          <Button
                            size="slim"
                            disabled={index === 0 || reorderMutation.isPending}
                            onClick={() => handleMove(index, "up")}
                          >
                            ↑
                          </Button>
                          <Button
                            size="slim"
                            disabled={index === scenarios.length - 1 || reorderMutation.isPending}
                            onClick={() => handleMove(index, "down")}
                          >
                            ↓
                          </Button>
                        </ButtonGroup>
                        <Text as="h2" variant="headingMd">
                          {scenario.name}
                        </Text>
                        <Badge
                          tone={
                            scenario.status === "published"
                              ? "success"
                              : undefined
                          }
                        >
                          {scenario.status === "published"
                            ? "公開中"
                            : "下書き"}
                        </Badge>
                      </InlineStack>
                      <Text as="p" variant="bodySm" tone="subdued">
                        更新日:{" "}
                        {new Date(scenario.updated_at).toLocaleDateString(
                          "ja-JP"
                        )}
                      </Text>
                    </InlineStack>
                    <InlineStack gap="200">
                      <ButtonGroup>
                        <Button url={`/scenarios/${scenario.id}`}>
                          編集
                        </Button>
                        <Button
                          onClick={() =>
                            handleToggleStatus(scenario.id, scenario.status)
                          }
                          loading={updateMutation.isPending}
                        >
                          {scenario.status === "published"
                            ? "非公開にする"
                            : "公開する"}
                        </Button>
                        <Button
                          onClick={() =>
                            duplicateMutation.mutate({ id: scenario.id })
                          }
                          loading={duplicateMutation.isPending}
                        >
                          複製
                        </Button>
                        <Button
                          tone="critical"
                          onClick={() => {
                            if (confirm("このシナリオを削除しますか？")) {
                              deleteMutation.mutate({ id: scenario.id });
                            }
                          }}
                          loading={deleteMutation.isPending}
                        >
                          削除
                        </Button>
                      </ButtonGroup>
                    </InlineStack>
                  </BlockStack>
                </Card>
              ))}
            </BlockStack>
          )}
        </Layout.Section>
      </Layout>

      <Modal
        open={showTemplateModal}
        onClose={() => {
          setShowTemplateModal(false);
          setCreatingTemplateId(null);
        }}
        title="テンプレートを選択"
        size="large"
      >
        <Modal.Section>
          {createMutation.isError && (
            <div style={{ marginBottom: 16 }}>
              <Banner tone="critical">
                作成に失敗しました: {createMutation.error.message}
              </Banner>
            </div>
          )}
          <BlockStack gap="300">
            {TEMPLATES.map((template) => {
              const isCreating = creatingTemplateId === template.id && createMutation.isPending;
              return (
                <div
                  key={template.id}
                  style={{
                    border: "1px solid #e1e3e5",
                    borderRadius: 12,
                    padding: 16,
                    cursor: isCreating ? "default" : "pointer",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                    opacity: creatingTemplateId && !isCreating ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isCreating) {
                      e.currentTarget.style.borderColor = "#2c6ecb";
                      e.currentTarget.style.boxShadow = "0 0 0 1px #2c6ecb";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#e1e3e5";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  onClick={() => {
                    if (!creatingTemplateId) {
                      handleCreateFromTemplate(template);
                    }
                  }}
                >
                  <InlineStack gap="400" blockAlign="start">
                    <div style={{ fontSize: 32, lineHeight: 1 }}>
                      {template.icon}
                    </div>
                    <BlockStack gap="100">
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="h3" variant="headingMd">
                          {template.name}
                        </Text>
                        {isCreating && <Spinner size="small" />}
                      </InlineStack>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {template.description}
                      </Text>
                    </BlockStack>
                  </InlineStack>
                </div>
              );
            })}
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
