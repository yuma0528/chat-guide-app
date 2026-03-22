import { useNavigate } from "react-router-dom";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  InlineGrid,
  Button,
  Banner,
  Box,
  Divider,
  List,
} from "@shopify/polaris";
import { trpc } from "../lib/trpc";

const TEMPLATES = [
  {
    key: "gift_guide",
    title: "ギフト選びガイド",
    description: "贈り先を選んで商品を提案するフロー",
    example: "パートナーへ / 友人へ / 自分へのご褒美",
  },
  {
    key: "faq",
    title: "よくある質問（FAQ）",
    description: "カテゴリ別のFAQを表示するフロー",
    example: "配送について / 返品・交換 / お支払い",
  },
  {
    key: "product_guide",
    title: "商品案内",
    description: "カテゴリやランキングから商品ページへ誘導",
    example: "カテゴリから探す / ランキング / セール",
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.scenarios.list.useQuery();
  const createMutation = trpc.scenarios.create.useMutation({
    onSuccess: (newScenario) => {
      utils.scenarios.list.invalidate();
      navigate(`/scenarios/${newScenario.id}`);
    },
  });

  const hasScenarios = (data?.scenarios?.length ?? 0) > 0;

  const handleCreateFromTemplate = (templateKey: string, templateName: string) => {
    createMutation.mutate({
      name: templateName,
      description: "",
      template: templateKey,
    });
  };

  return (
    <Page
      title="Chat Guide"
      secondaryActions={[
        { content: "シナリオ一覧", url: "/scenarios" },
        { content: "設定", url: "/settings" },
      ]}
    >
      <Layout>
        {/* クイックスタートガイド */}
        {!isLoading && !hasScenarios && (
          <Layout.Section>
            <Banner title="はじめてのセットアップ" tone="info">
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">
                  3ステップでチャットガイドを公開できます。
                </Text>
              </BlockStack>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                使い方
              </Text>
              <List type="number">
                <List.Item>
                  <Text as="span" fontWeight="semibold">シナリオを作成</Text>
                  {" "}— 下のテンプレートから選ぶか、空のシナリオを作成してフローを組み立てます。
                </List.Item>
                <List.Item>
                  <Text as="span" fontWeight="semibold">シナリオを公開</Text>
                  {" "}— シナリオ一覧から「公開する」をクリックします。
                </List.Item>
                <List.Item>
                  <Text as="span" fontWeight="semibold">テーマにウィジェットを配置</Text>
                  {" "}— オンラインストア → テーマ → カスタマイズ → アプリ埋め込み から「Chat Guide Widget」を有効にします。デザイン設定もそこで行えます。
                </List.Item>
              </List>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* テンプレートからクイックスタート */}
        <Layout.Section>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              テンプレートからシナリオを作成
            </Text>
            <InlineGrid columns={{ xs: 1, sm: 2, md: 3 }} gap="300">
              {TEMPLATES.map((tpl) => (
                <Card key={tpl.key}>
                  <BlockStack gap="300">
                    <Text as="h3" variant="headingSm">
                      {tpl.title}
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      {tpl.description}
                    </Text>
                    <Box
                      background="bg-surface-secondary"
                      padding="200"
                      borderRadius="200"
                    >
                      <Text as="p" variant="bodySm" tone="subdued">
                        例: {tpl.example}
                      </Text>
                    </Box>
                    <Button
                      onClick={() => handleCreateFromTemplate(tpl.key, tpl.title)}
                      loading={createMutation.isPending}
                    >
                      このテンプレートで作成
                    </Button>
                  </BlockStack>
                </Card>
              ))}
            </InlineGrid>
          </BlockStack>
        </Layout.Section>

        <Layout.Section>
          <Divider />
        </Layout.Section>

        {/* 空のシナリオ作成 & シナリオ一覧へ */}
        <Layout.Section>
          <InlineStack gap="300" align="center">
            <Button
              onClick={() => handleCreateFromTemplate("", "新しいシナリオ")}
              loading={createMutation.isPending}
            >
              空のシナリオを作成
            </Button>
            {hasScenarios && (
              <Button variant="plain" url="/scenarios">
                シナリオ一覧を見る →
              </Button>
            )}
          </InlineStack>
        </Layout.Section>

        {createMutation.isError && (
          <Layout.Section>
            <Banner tone="critical">
              作成に失敗しました: {createMutation.error.message}
            </Banner>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}
