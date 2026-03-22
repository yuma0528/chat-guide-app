import { Page, Layout, Card, Text } from "@shopify/polaris";

export default function SettingsPage() {
  return (
    <Page title="設定" backAction={{ url: "/" }}>
      <Layout>
        <Layout.Section>
          <Card>
            <Text as="h2" variant="headingMd">
              アプリ設定
            </Text>
            <Text as="p" variant="bodyMd">
              設定項目をここに追加してください。
            </Text>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
