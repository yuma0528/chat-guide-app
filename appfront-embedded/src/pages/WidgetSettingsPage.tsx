import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Divider,
} from "@shopify/polaris";

export default function SettingsPage() {
  return (
    <Page title="設定" backAction={{ url: "/" }}>
      <Layout>
        {/* デザイン設定への案内 */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                ウィジェットのデザイン設定
              </Text>
              <Text as="p" variant="bodyMd">
                ボット名、テーマカラー、アイコン、フォントサイズ、表示位置などのデザイン設定は、Shopifyのテーマエディタで行います。
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                オンラインストア → テーマ → カスタマイズ → アプリ埋め込み → 「Chat Guide Widget」の設定アイコンから変更できます。
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* GA連携ガイド */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Google Analytics 連携
              </Text>
              <Text as="p" variant="bodyMd">
                チャットウィジェットは以下のイベントをGoogleアナリティクスに自動送信します。
                ストアにGA4が設定されていれば、追加設定なしでデータが収集されます。
              </Text>
              <Divider />
              <BlockStack gap="200">
                {[
                  {
                    event: "chat_guide_open",
                    desc: "チャットウィジェットを開いた時",
                  },
                  {
                    event: "chat_guide_choice",
                    desc: "選択肢をクリックした時",
                  },
                  {
                    event: "chat_guide_product_click",
                    desc: "商品カードをクリックした時",
                  },
                  {
                    event: "chat_guide_link_click",
                    desc: "リンクボタンをクリックした時",
                  },
                  {
                    event: "chat_guide_faq_click",
                    desc: "FAQ質問をクリックした時",
                  },
                  {
                    event: "chat_guide_close",
                    desc: "チャットを閉じた時",
                  },
                ].map(({ event, desc }) => (
                  <InlineStack key={event} gap="200">
                    <div
                      style={{
                        background: "#f1f1f1",
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontFamily: "monospace",
                        fontSize: 13,
                      }}
                    >
                      {event}
                    </div>
                    <Text as="span" variant="bodySm">
                      {desc}
                    </Text>
                  </InlineStack>
                ))}
              </BlockStack>
              <Text as="p" variant="bodySm" tone="subdued">
                GA4のレポートで「chat_guide」で検索すると、これらのイベントを確認できます。
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
