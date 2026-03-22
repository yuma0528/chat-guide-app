import { useState, useCallback, useMemo } from "react";
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
  TextField,
  BlockStack,
  InlineStack,
  Spinner,
  Banner,
} from "@shopify/polaris";
import { trpc } from "../lib/trpc";

export default function ScenarioListPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.scenarios.list.useQuery();
  const createMutation = trpc.scenarios.create.useMutation({
    onSuccess: () => {
      utils.scenarios.list.invalidate();
      setShowCreateModal(false);
      setNewName("");
      setNewDescription("");
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

  const handleCreate = useCallback(() => {
    if (!newName.trim()) return;
    createMutation.mutate({
      name: newName,
      description: newDescription,
    });
  }, [newName, newDescription, createMutation]);

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
        onAction: () => setShowCreateModal(true),
      }}
    >
      <Layout>
        <Layout.Section>
          {scenarios.length === 0 ? (
            <Card>
              <EmptyState
                heading="シナリオがありません"
                action={{
                  content: "シナリオを作成",
                  onAction: () => setShowCreateModal(true),
                }}
                image=""
              >
                <p>
                  トップページからテンプレートを選んで作成するか、空のシナリオを新規作成しましょう。
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
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="新しいシナリオを作成"
        primaryAction={{
          content: "作成",
          onAction: handleCreate,
          loading: createMutation.isPending,
          disabled: !newName.trim(),
        }}
        secondaryActions={[
          { content: "キャンセル", onAction: () => setShowCreateModal(false) },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            {createMutation.isError && (
              <Banner tone="critical">
                作成に失敗しました: {createMutation.error.message}
              </Banner>
            )}
            <TextField
              label="シナリオ名"
              value={newName}
              onChange={setNewName}
              autoComplete="off"
              placeholder="例: ギフト選びサポート"
            />
            <TextField
              label="説明（任意）"
              value={newDescription}
              onChange={setNewDescription}
              autoComplete="off"
              multiline={3}
              placeholder="例: ギフト選びに迷ったお客様を商品まで案内"
            />
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
