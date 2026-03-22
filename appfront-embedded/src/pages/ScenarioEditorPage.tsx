import { useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  BlockStack,
  InlineStack,
  Spinner,
  Banner,
  TextField,
  Badge,
  Select,
  Tag,
} from "@shopify/polaris";
import { trpc } from "../lib/trpc";
import NodeEditor from "../components/NodeEditor";
import ChatPreview from "../components/ChatPreview";
import type { ScenarioNode, ScenarioDisplay, Scenario } from "../../../functions/src/types/chatGuide";

function generateNodeId(): string {
  return `node_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
}

export default function ScenarioEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const { data: scenario, isLoading } = trpc.scenarios.get.useQuery(
    { id: id! },
    { enabled: !!id }
  );

  // 編集中のローカル状態
  const [editedNodes, setEditedNodes] = useState<ScenarioNode[] | null>(null);
  const [editedName, setEditedName] = useState<string | null>(null);
  const [editedDescription, setEditedDescription] = useState<string | null>(
    null
  );
  const [editedDisplay, setEditedDisplay] = useState<ScenarioDisplay | null>(null);
  const [newPageUrl, setNewPageUrl] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // パンくず: [{ choiceId, label }]
  const [breadcrumb, setBreadcrumb] = useState<
    Array<{ choiceId: string | null; label: string }>
  >([{ choiceId: null, label: "トップ" }]);

  const currentParentChoiceId =
    breadcrumb[breadcrumb.length - 1]?.choiceId ?? null;

  // scenarioデータが読み込まれたらローカル状態を初期化
  const nodes = editedNodes ?? scenario?.nodes ?? [];
  const name = editedName ?? scenario?.name ?? "";
  const description = editedDescription ?? scenario?.description ?? "";
  const display = editedDisplay ?? scenario?.display ?? { mode: "all" as const, pages: [] };

  // 現在の階層のノード
  const currentNodes = useMemo(
    () =>
      nodes
        .filter((n) => n.parent_choice_id === currentParentChoiceId)
        .sort((a, b) => a.sort_order - b.sort_order),
    [nodes, currentParentChoiceId]
  );

  // 全ノードリスト（遷移先選択用、人間が読めるラベル付き）
  const allNodes = useMemo(() => {
    const typeLabels: Record<string, string> = {
      message: "メッセージ",
      choice: "選択肢",
      product_card: "商品カード",
      link: "リンク",
      faq: "FAQ",
    };
    return nodes.map((n) => {
      const typeLabel = typeLabels[n.type] || n.type;
      let text = "";
      if ("text" in n && n.text) {
        text = n.text.length > 20 ? n.text.substring(0, 20) + "…" : n.text;
      }
      const parentLabel = n.parent_choice_id ? `[子]` : "";
      return {
        id: n.id,
        label: `${parentLabel}${typeLabel}: ${text || "(空)"}`,
      };
    });
  }, [nodes]);

  const hasChanges =
    editedNodes !== null ||
    editedName !== null ||
    editedDescription !== null ||
    editedDisplay !== null;

  // 保存
  const updateMutation = trpc.scenarios.update.useMutation({
    onSuccess: () => {
      utils.scenarios.get.invalidate({ id: id! });
      utils.scenarios.list.invalidate();
      setEditedNodes(null);
      setEditedName(null);
      setEditedDescription(null);
      setEditedDisplay(null);
    },
  });

  const handleSave = useCallback(() => {
    if (!id) return;
    updateMutation.mutate({
      id,
      ...(editedName !== null && { name: editedName }),
      ...(editedDescription !== null && { description: editedDescription }),
      ...(editedNodes !== null && { nodes: editedNodes }),
      ...(editedDisplay !== null && { display: editedDisplay }),
    });
  }, [id, editedName, editedDescription, editedNodes, updateMutation]);

  // ノード操作
  const setNodes = useCallback(
    (updater: (prev: ScenarioNode[]) => ScenarioNode[]) => {
      setEditedNodes((prev) => updater(prev ?? scenario?.nodes ?? []));
    },
    [scenario]
  );

  const handleNodeChange = useCallback(
    (index: number, updatedNode: ScenarioNode) => {
      setNodes((prev) => {
        const currentLevelNodes = prev
          .filter((n) => n.parent_choice_id === currentParentChoiceId)
          .sort((a, b) => a.sort_order - b.sort_order);
        const targetId = currentLevelNodes[index]?.id;
        if (!targetId) return prev;
        return prev.map((n) => (n.id === targetId ? updatedNode : n));
      });
    },
    [setNodes, currentParentChoiceId]
  );

  const handleNodeDelete = useCallback(
    (index: number) => {
      setNodes((prev) => {
        const currentLevelNodes = prev
          .filter((n) => n.parent_choice_id === currentParentChoiceId)
          .sort((a, b) => a.sort_order - b.sort_order);
        const targetId = currentLevelNodes[index]?.id;
        if (!targetId) return prev;

        // 削除対象ノードとその子孫を全て削除
        const idsToDelete = new Set<string>([targetId]);
        const collectDescendants = (nodeId: string) => {
          const node = prev.find((n) => n.id === nodeId);
          if (node?.type === "choice") {
            for (const choice of node.choices) {
              const children = prev.filter(
                (n) => n.parent_choice_id === choice.id
              );
              for (const child of children) {
                idsToDelete.add(child.id);
                collectDescendants(child.id);
              }
            }
          }
        };
        collectDescendants(targetId);

        return prev.filter((n) => !idsToDelete.has(n.id));
      });
    },
    [setNodes, currentParentChoiceId]
  );

  const handleMoveNode = useCallback(
    (index: number, direction: "up" | "down") => {
      setNodes((prev) => {
        const currentLevelNodes = prev
          .filter((n) => n.parent_choice_id === currentParentChoiceId)
          .sort((a, b) => a.sort_order - b.sort_order);

        const swapIndex = direction === "up" ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= currentLevelNodes.length) return prev;

        const idA = currentLevelNodes[index].id;
        const idB = currentLevelNodes[swapIndex].id;
        const orderA = currentLevelNodes[index].sort_order;
        const orderB = currentLevelNodes[swapIndex].sort_order;

        return prev.map((n) => {
          if (n.id === idA) return { ...n, sort_order: orderB };
          if (n.id === idB) return { ...n, sort_order: orderA };
          return n;
        });
      });
    },
    [setNodes, currentParentChoiceId]
  );

  const handleAddNode = useCallback(() => {
    const newNode: ScenarioNode = {
      id: generateNodeId(),
      type: "message",
      parent_choice_id: currentParentChoiceId,
      sort_order: currentNodes.length,
      text: "",
      image_url: null,
    };
    setNodes((prev) => [...prev, newNode]);
  }, [setNodes, currentParentChoiceId, currentNodes.length]);

  // パンくずナビゲーション
  const handleNavigateToChoice = useCallback(
    (choiceId: string, choiceLabel: string) => {
      setBreadcrumb((prev) => [...prev, { choiceId, label: choiceLabel }]);
    },
    []
  );

  const handleBreadcrumbClick = useCallback((index: number) => {
    setBreadcrumb((prev) => prev.slice(0, index + 1));
  }, []);

  if (isLoading) {
    return (
      <Page title="シナリオ編集">
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
      <Page title="シナリオ編集" backAction={{ onAction: () => navigate("/scenarios") }}>
        <Layout>
          <Layout.Section>
            <Banner tone="critical">シナリオが見つかりません</Banner>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  // プレビュー用のシナリオデータ
  const previewScenario: Scenario = {
    ...scenario,
    nodes,
    name,
    description,
  };

  return (
    <Page
      title={name || "シナリオ編集"}
      backAction={{ onAction: () => navigate("/scenarios") }}
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
      titleMetadata={
        <Badge
          tone={scenario.status === "published" ? "success" : undefined}
        >
          {scenario.status === "published" ? "公開中" : "下書き"}
        </Badge>
      }
    >
      <Layout>
        {/* 基本情報 */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <TextField
                label="シナリオ名"
                value={name}
                onChange={(v) => setEditedName(v)}
                autoComplete="off"
              />
              <TextField
                label="説明"
                value={description}
                onChange={(v) => setEditedDescription(v)}
                autoComplete="off"
                multiline={2}
              />
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* 表示設定 */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                表示ページ設定
              </Text>
              <Select
                label="表示条件"
                options={[
                  { label: "すべてのページで表示", value: "all" },
                  { label: "指定ページのみ表示", value: "specific_only" },
                  { label: "指定ページ以外で表示", value: "specific_exclude" },
                ]}
                value={display.mode}
                onChange={(v) =>
                  setEditedDisplay({
                    ...display,
                    mode: v as ScenarioDisplay["mode"],
                  })
                }
              />
              {display.mode !== "all" && (
                <BlockStack gap="200">
                  <InlineStack gap="200" blockAlign="end">
                    <div style={{ flex: 1 }}>
                      <TextField
                        label={
                          display.mode === "specific_only"
                            ? "表示するページURL"
                            : "除外するページURL"
                        }
                        value={newPageUrl}
                        onChange={setNewPageUrl}
                        autoComplete="off"
                        placeholder="/collections/sale（末尾に*でprefix一致）"
                      />
                    </div>
                    <Button
                      onClick={() => {
                        if (!newPageUrl.trim()) return;
                        setEditedDisplay({
                          ...display,
                          pages: [...display.pages, newPageUrl.trim()],
                        });
                        setNewPageUrl("");
                      }}
                    >
                      追加
                    </Button>
                  </InlineStack>
                  {display.pages.length > 0 && (
                    <InlineStack gap="200" wrap>
                      {display.pages.map((page, idx) => (
                        <Tag
                          key={idx}
                          onRemove={() =>
                            setEditedDisplay({
                              ...display,
                              pages: display.pages.filter(
                                (_, i) => i !== idx
                              ),
                            })
                          }
                        >
                          {page}
                        </Tag>
                      ))}
                    </InlineStack>
                  )}
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* パンくず */}
        <Layout.Section>
          <Card>
            <InlineStack gap="100" blockAlign="center">
              {breadcrumb.map((crumb, idx) => (
                <InlineStack key={idx} gap="100" blockAlign="center">
                  {idx > 0 && (
                    <Text as="span" tone="subdued">
                      &gt;
                    </Text>
                  )}
                  <Button
                    variant="plain"
                    onClick={() => handleBreadcrumbClick(idx)}
                    pressed={idx === breadcrumb.length - 1}
                  >
                    {crumb.label}
                  </Button>
                </InlineStack>
              ))}
            </InlineStack>
          </Card>
        </Layout.Section>

        {/* ノード一覧 */}
        <Layout.Section>
          {updateMutation.isError && (
            <Banner tone="critical">
              保存に失敗しました: {updateMutation.error.message}
            </Banner>
          )}
          {updateMutation.isSuccess && (
            <Banner tone="success" onDismiss={() => {}}>
              保存しました
            </Banner>
          )}

          <BlockStack gap="400">
            {currentNodes.length === 0 && (
              <Card>
                <BlockStack gap="200" inlineAlign="center">
                  <Text as="p" tone="subdued">
                    この階層にはまだノードがありません
                  </Text>
                </BlockStack>
              </Card>
            )}

            {currentNodes.map((node, index) => (
              <NodeEditor
                key={node.id}
                node={node}
                index={index}
                totalNodes={currentNodes.length}
                onChange={(updatedNode) =>
                  handleNodeChange(index, updatedNode)
                }
                onDelete={() => handleNodeDelete(index)}
                onMoveUp={() => handleMoveNode(index, "up")}
                onMoveDown={() => handleMoveNode(index, "down")}
                onNavigateToChoice={
                  node.type === "choice"
                    ? handleNavigateToChoice
                    : undefined
                }
                allNodes={allNodes}
              />
            ))}

            <InlineStack align="center">
              <Button onClick={handleAddNode}>+ ノードを追加</Button>
            </InlineStack>
          </BlockStack>
        </Layout.Section>

        {/* 上の階層に戻るボタン */}
        {breadcrumb.length > 1 && (
          <Layout.Section>
            <Button
              onClick={() =>
                handleBreadcrumbClick(breadcrumb.length - 2)
              }
            >
              ← 上の階層に戻る
            </Button>
          </Layout.Section>
        )}
      </Layout>

      {/* プレビューモーダル */}
      {showPreview && (
        <ChatPreview
          scenario={previewScenario}
          onClose={() => setShowPreview(false)}
        />
      )}
    </Page>
  );
}
