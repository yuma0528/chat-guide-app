import { useState, useCallback } from "react";
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
import type { LpBlock, LpProductItem } from "../../../functions/src/types/lpScenario";

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
}

// ===== テンプレート定義 =====

interface LpTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  blocks: LpBlock[];
  allow_quantity: boolean;
  customer_form: {
    require_phone: boolean;
    require_address: boolean;
    submit_button_text: string;
  };
  /** テンプレート作成時にストアの商品を自動取得するか */
  autoFetchProducts: boolean;
}

const TEMPLATES: LpTemplate[] = [
  {
    id: "blank",
    name: "白紙から作成",
    description: "ブロックなしの空シナリオ。自由にカスタマイズできます。",
    icon: "📄",
    blocks: [],
    allow_quantity: false,
    customer_form: {
      require_phone: true,
      require_address: true,
      submit_button_text: "購入手続きへ進む",
    },
    autoFetchProducts: false,
  },
  {
    id: "limited_sale",
    name: "期間限定セール",
    description: "割引コード付きの限定セールLP。緊急感を演出してコンバージョンを促進。",
    icon: "🔥",
    blocks: [
      {
        id: generateId("block"),
        sort_order: 0,
        type: "message",
        text: "こんにちは！🎉\n今だけの特別キャンペーンのご案内です。",
        image_url: null,
      },
      {
        id: generateId("block"),
        sort_order: 1,
        type: "message",
        text: "【期間限定】今月末まで、対象商品が特別価格でお求めいただけます！\n\nこの機会をお見逃しなく✨",
        image_url: null,
      },
      {
        id: generateId("block"),
        sort_order: 2,
        type: "discount_code",
        label: "🎁 期間限定クーポン",
        code: "SALE2024",
        description: "お会計時にこのコードを入力すると割引が適用されます",
      },
      {
        id: generateId("block"),
        sort_order: 3,
        type: "reviews",
        heading: "ご購入者様の声",
        items: [
          { id: generateId("rev"), name: "A.T. さん", rating: 5, comment: "期間限定で安くなっていたので即購入しました。品質も大満足です！", sort_order: 0 },
          { id: generateId("rev"), name: "M.S. さん", rating: 4, comment: "友人に勧められて購入。想像以上に良かったです。リピート確定！", sort_order: 1 },
          { id: generateId("rev"), name: "K.Y. さん", rating: 5, comment: "セール価格でこの品質は本当にお得。もっと早く知りたかった。", sort_order: 2 },
        ],
      },
      {
        id: generateId("block"),
        sort_order: 4,
        type: "message",
        text: "それでは、ご希望の商品をお選びください👇",
        image_url: null,
      },
    ],
    allow_quantity: false,
    customer_form: {
      require_phone: true,
      require_address: true,
      submit_button_text: "特別価格で購入する",
    },
    autoFetchProducts: true,
  },
  {
    id: "new_product",
    name: "新商品プロモーション",
    description: "新商品の魅力をチャット形式で紹介。ストーリーで購買意欲を高めます。",
    icon: "✨",
    blocks: [
      {
        id: generateId("block"),
        sort_order: 0,
        type: "message",
        text: "こんにちは！\n新商品のご案内です🎊",
        image_url: null,
      },
      {
        id: generateId("block"),
        sort_order: 1,
        type: "message",
        text: "今回ご紹介するのは、お客様のお声をもとに開発した自信作です。\n\n素材・品質にとことんこだわり、毎日使いたくなる仕上がりになりました。",
        image_url: null,
      },
      {
        id: generateId("block"),
        sort_order: 2,
        type: "message",
        text: "📦 今なら初回購入特典あり！\n\n・送料無料\n・30日間返品保証\n・専用ギフト包装対応",
        image_url: null,
      },
      {
        id: generateId("block"),
        sort_order: 3,
        type: "reviews",
        heading: "先行体験者の感想",
        items: [
          { id: generateId("rev"), name: "R.I. さん", rating: 5, comment: "使い心地が最高です。毎日愛用しています！", sort_order: 0 },
          { id: generateId("rev"), name: "S.M. さん", rating: 5, comment: "パッケージも素敵で、プレゼントにもぴったり。", sort_order: 1 },
        ],
      },
      {
        id: generateId("block"),
        sort_order: 4,
        type: "message",
        text: "ご購入数量をお選びください👇\nまとめ買いもお得です！",
        image_url: null,
      },
    ],
    allow_quantity: true,
    customer_form: {
      require_phone: false,
      require_address: true,
      submit_button_text: "購入手続きへ進む",
    },
    autoFetchProducts: true,
  },
  {
    id: "repeat_purchase",
    name: "リピーター向けLP",
    description: "既存顧客向けの再購入促進。割引コードとレビューで背中を押します。",
    icon: "🔄",
    blocks: [
      {
        id: generateId("block"),
        sort_order: 0,
        type: "message",
        text: "いつもご利用ありがとうございます！😊\nリピーター様限定のご案内です。",
        image_url: null,
      },
      {
        id: generateId("block"),
        sort_order: 1,
        type: "discount_code",
        label: "💎 リピーター様限定クーポン",
        code: "REPEAT10",
        description: "次回のお買い物で10%OFF！期限なし・何度でもご利用いただけます",
      },
      {
        id: generateId("block"),
        sort_order: 2,
        type: "message",
        text: "前回のご購入から時間が経ちましたが、その後いかがでしょうか？\n\n追加購入やまとめ買いもお気軽にどうぞ🎵",
        image_url: null,
      },
      {
        id: generateId("block"),
        sort_order: 3,
        type: "reviews",
        heading: "リピーター様の声",
        items: [
          { id: generateId("rev"), name: "T.N. さん", rating: 5, comment: "3回目の購入です。品質が安定していて信頼できます。", sort_order: 0 },
          { id: generateId("rev"), name: "H.K. さん", rating: 4, comment: "毎回クーポンがもらえるのが嬉しい。コスパ最高です！", sort_order: 1 },
          { id: generateId("rev"), name: "Y.O. さん", rating: 5, comment: "家族全員で使っています。もう他のお店には戻れません。", sort_order: 2 },
        ],
      },
      {
        id: generateId("block"),
        sort_order: 4,
        type: "message",
        text: "おすすめ商品をご用意しました。\nタップしてお選びください👇",
        image_url: null,
      },
    ],
    allow_quantity: false,
    customer_form: {
      require_phone: true,
      require_address: true,
      submit_button_text: "クーポンを使って購入する",
    },
    autoFetchProducts: true,
  },
];

export default function LpScenarioListPage() {
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);
  const navigate = useNavigate();

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.lpScenarios.list.useQuery();
  const { data: storeProducts } = trpc.lpScenarios.fetchProducts.useQuery(
    { count: 3 },
    { enabled: showTemplateModal }
  );

  const createMutation = trpc.lpScenarios.create.useMutation({
    onSuccess: (scenario) => {
      utils.lpScenarios.list.invalidate();
      setShowTemplateModal(false);
      setCreatingTemplateId(null);
      navigate(`/lp-scenarios/${scenario.id}`);
    },
  });
  const deleteMutation = trpc.lpScenarios.delete.useMutation({
    onSuccess: () => utils.lpScenarios.list.invalidate(),
  });
  const updateMutation = trpc.lpScenarios.update.useMutation({
    onSuccess: () => utils.lpScenarios.list.invalidate(),
  });
  const duplicateMutation = trpc.lpScenarios.duplicate.useMutation({
    onSuccess: () => utils.lpScenarios.list.invalidate(),
  });

  const handleCreateFromTemplate = useCallback(
    (template: LpTemplate) => {
      setCreatingTemplateId(template.id);

      const products: LpProductItem[] =
        template.autoFetchProducts && storeProducts ? storeProducts : [];

      createMutation.mutate({
        name: template.name === "白紙から作成" ? "新しいLPシナリオ" : template.name,
        description: template.description,
        blocks: template.blocks,
        products,
        allow_quantity: template.allow_quantity,
        customer_form: template.customer_form,
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

  const scenarios = data?.scenarios || [];

  if (isLoading) {
    return (
      <Page title="LP購入シナリオ" backAction={{ url: "/" }}>
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
      title="LP購入シナリオ"
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
                heading="LPシナリオがありません"
                action={{
                  content: "テンプレートから作成",
                  onAction: () => setShowTemplateModal(true),
                }}
                image=""
              >
                <p>
                  テンプレートを選んでLPシナリオを作成しましょう。チャット形式で商品の購入フローを構築できます。
                </p>
              </EmptyState>
            </Card>
          ) : (
            <BlockStack gap="200">
              {scenarios.map((scenario) => (
                <Card key={scenario.id}>
                  <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="200" blockAlign="center">
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
                        <Button url={`/lp-scenarios/${scenario.id}`}>
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
                            if (confirm("このLPシナリオを削除しますか？")) {
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
                      {template.blocks.length > 0 && (
                        <Text as="p" variant="bodySm" tone="subdued">
                          {template.blocks.length}ブロック
                          {template.autoFetchProducts && " + ストアの商品を自動設定"}
                        </Text>
                      )}
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
