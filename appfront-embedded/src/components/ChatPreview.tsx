import { useState, useEffect, useRef, useCallback } from "react";
import { Modal } from "@shopify/polaris";
import type {
  Scenario,
  ScenarioNode,
  ProductCardNode,
  FaqNode,
} from "../../../functions/src/types/chatGuide";

interface ChatPreviewProps {
  scenario: Scenario;
  onClose: () => void;
  primaryColor?: string;
  botName?: string;
}

interface ChatMessage {
  id: string;
  type: "bot" | "user" | "typing" | "choices" | "product_cards" | "link" | "faq";
  text?: string;
  imageUrl?: string;
  choices?: Array<{ id: string; label: string }>;
  products?: ProductCardNode["products"];
  afterActions?: ProductCardNode["after_actions"];
  buttonText?: string;
  url?: string;
  faqNode?: FaqNode;
}

export default function ChatPreview({
  scenario,
  onClose,
  primaryColor = "#4A90D9",
  botName = "ショップアシスタント",
}: ChatPreviewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingNodes, setPendingNodes] = useState<ScenarioNode[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [, setFaqViewedCount] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ルートノードからスタート
  useEffect(() => {
    const rootNodes = scenario.nodes
      .filter((n) => n.parent_choice_id === null)
      .sort((a, b) => a.sort_order - b.sort_order);
    setPendingNodes(rootNodes);
  }, [scenario]);

  // ノードを順番に処理
  useEffect(() => {
    if (isProcessing || pendingNodes.length === 0) return;

    const node = pendingNodes[0];
    const remaining = pendingNodes.slice(1);
    setIsProcessing(true);

    if (node.type === "message") {
      // タイピング表示 → メッセージ表示
      setMessages((prev) => [
        ...prev,
        { id: `typing_${node.id}`, type: "typing" },
      ]);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== `typing_${node.id}`),
          {
            id: node.id,
            type: "bot",
            text: node.text,
            imageUrl: node.image_url || undefined,
          },
        ]);
        setPendingNodes(remaining);
        setIsProcessing(false);
      }, 800);
    } else if (node.type === "choice") {
      setMessages((prev) => [
        ...prev,
        { id: `typing_${node.id}`, type: "typing" },
      ]);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== `typing_${node.id}`),
          { id: `msg_${node.id}`, type: "bot", text: node.text },
          {
            id: node.id,
            type: "choices",
            choices: node.choices.map((c) => ({ id: c.id, label: c.label })),
          },
        ]);
        setPendingNodes(remaining);
        setIsProcessing(false);
      }, 800);
    } else if (node.type === "product_card") {
      setMessages((prev) => [
        ...prev,
        {
          id: node.id,
          type: "product_cards",
          products: node.products || [],
          afterActions: node.after_actions,
        },
      ]);
      setPendingNodes(remaining);
      setIsProcessing(false);
    } else if (node.type === "link") {
      setMessages((prev) => [
        ...prev,
        { id: `typing_${node.id}`, type: "typing" },
      ]);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== `typing_${node.id}`),
          {
            id: node.id,
            type: "link",
            text: node.text,
            buttonText: node.button_text,
            url: node.url,
          },
        ]);
        setPendingNodes(remaining);
        setIsProcessing(false);
      }, 800);
    } else if (node.type === "faq") {
      setMessages((prev) => [
        ...prev,
        { id: `typing_${node.id}`, type: "typing" },
      ]);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== `typing_${node.id}`),
          { id: `msg_${node.id}`, type: "bot", text: node.text },
          { id: node.id, type: "faq", faqNode: node },
        ]);
        setFaqViewedCount(0);
        setPendingNodes(remaining);
        setIsProcessing(false);
      }, 800);
    } else {
      setPendingNodes(remaining);
      setIsProcessing(false);
    }
  }, [pendingNodes, isProcessing]);

  // 選択肢クリック
  const handleChoiceClick = useCallback(
    (choiceId: string, choiceLabel: string) => {
      // ユーザーの選択を表示
      setMessages((prev) => [
        ...prev.filter((m) => m.type !== "choices"),
        { id: `user_${choiceId}`, type: "user", text: choiceLabel },
      ]);

      // 子ノードを取得
      const childNodes = scenario.nodes
        .filter((n) => n.parent_choice_id === choiceId)
        .sort((a, b) => a.sort_order - b.sort_order);
      setPendingNodes(childNodes);
    },
    [scenario]
  );

  // アフターアクションクリック
  const handleAfterAction = useCallback(
    (targetNodeId: string, label: string) => {
      setMessages((prev) => [
        ...prev,
        { id: `user_action_${Date.now()}`, type: "user", text: label },
      ]);

      if (targetNodeId === "__restart__") {
        handleRestart();
        return;
      }

      const targetNode = scenario.nodes.find((n) => n.id === targetNodeId);
      if (targetNode) {
        const siblings = scenario.nodes
          .filter(
            (n) => n.parent_choice_id === targetNode.parent_choice_id
          )
          .sort((a, b) => a.sort_order - b.sort_order);
        const targetIndex = siblings.findIndex(
          (n) => n.id === targetNodeId
        );
        setPendingNodes(siblings.slice(targetIndex));
      }
    },
    [scenario]
  );

  // FAQ質問クリック
  const handleFaqClick = useCallback(
    (question: string, answer: string) => {
      setMessages((prev) => [
        ...prev,
        { id: `user_faq_${Date.now()}`, type: "user", text: question },
      ]);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: `bot_faq_${Date.now()}`, type: "bot", text: answer },
        ]);
        setFaqViewedCount((c) => c + 1);
      }, 500);
    },
    []
  );


  // リスタート
  const handleRestart = useCallback(() => {
    setMessages([]);
    const rootNodes = scenario.nodes
      .filter((n) => n.parent_choice_id === null)
      .sort((a, b) => a.sort_order - b.sort_order);
    setPendingNodes(rootNodes);
  }, [scenario]);

  return (
    <Modal open onClose={onClose} title="プレビュー">
      <Modal.Section>
        <div
          style={{
            maxWidth: 400,
            margin: "0 auto",
            border: "1px solid #e1e3e5",
            borderRadius: 12,
            overflow: "hidden",
            height: 500,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* ヘッダー */}
          <div
            style={{
              background: primaryColor,
              color: "white",
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontWeight: 600 }}>{botName}</span>
            <button
              onClick={handleRestart}
              style={{
                background: "rgba(255,255,255,0.2)",
                border: "none",
                color: "white",
                padding: "4px 8px",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              最初から
            </button>
          </div>

          {/* メッセージエリア */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 16,
              background: "#f6f6f7",
            }}
          >
            {messages.map((msg) => (
              <div key={msg.id} style={{ marginBottom: 12 }}>
                {msg.type === "typing" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: primaryColor,
                        flexShrink: 0,
                      }}
                    />
                    <div
                      style={{
                        background: "white",
                        padding: "8px 16px",
                        borderRadius: "0 12px 12px 12px",
                        fontSize: 20,
                      }}
                    >
                      •••
                    </div>
                  </div>
                )}

                {msg.type === "bot" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: primaryColor,
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div
                        style={{
                          background: "white",
                          padding: "8px 16px",
                          borderRadius: "0 12px 12px 12px",
                          maxWidth: 260,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {msg.text}
                      </div>
                      {msg.imageUrl && (
                        <img
                          src={msg.imageUrl}
                          alt=""
                          style={{
                            maxWidth: 260,
                            borderRadius: 8,
                            marginTop: 4,
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}

                {msg.type === "user" && (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div
                      style={{
                        background: primaryColor,
                        color: "white",
                        padding: "8px 16px",
                        borderRadius: "12px 0 12px 12px",
                        maxWidth: 260,
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                )}

                {msg.type === "choices" && msg.choices && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      marginTop: 8,
                    }}
                  >
                    {msg.choices.map((choice) => (
                      <button
                        key={choice.id}
                        onClick={() =>
                          handleChoiceClick(choice.id, choice.label)
                        }
                        style={{
                          background: "white",
                          border: `1px solid ${primaryColor}`,
                          color: primaryColor,
                          padding: "8px 16px",
                          borderRadius: 20,
                          cursor: "pointer",
                          fontSize: 14,
                          transition: "all 0.2s",
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = primaryColor;
                          e.currentTarget.style.color = "white";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = "white";
                          e.currentTarget.style.color = primaryColor;
                        }}
                      >
                        {choice.label}
                      </button>
                    ))}
                  </div>
                )}

                {msg.type === "product_cards" && msg.products && (
                  <div style={{ marginTop: 8 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        overflowX: "auto",
                        paddingBottom: 8,
                      }}
                    >
                      {msg.products.map((product) => (
                        <div
                          key={product.id}
                          style={{
                            background: "white",
                            borderRadius: 8,
                            overflow: "hidden",
                            minWidth: 160,
                            maxWidth: 160,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                          }}
                        >
                          {product.image_url && (
                            <img
                              src={product.image_url}
                              alt={product.title}
                              style={{
                                width: "100%",
                                height: 120,
                                objectFit: "cover",
                              }}
                            />
                          )}
                          <div style={{ padding: 8 }}>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                marginBottom: 4,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {product.title}
                            </div>
                            <div style={{ fontSize: 14, color: primaryColor }}>
                              ¥{Number(product.price).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {msg.afterActions && msg.afterActions.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          marginTop: 8,
                        }}
                      >
                        {msg.afterActions.map((action, idx) => (
                          <button
                            key={idx}
                            onClick={() =>
                              handleAfterAction(
                                action.target_node_id,
                                action.label
                              )
                            }
                            style={{
                              background: "white",
                              border: `1px solid ${primaryColor}`,
                              color: primaryColor,
                              padding: "8px 16px",
                              borderRadius: 20,
                              cursor: "pointer",
                              fontSize: 14,
                            }}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {msg.type === "link" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: primaryColor,
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div
                        style={{
                          background: "white",
                          padding: "8px 16px",
                          borderRadius: "0 12px 12px 12px",
                          maxWidth: 260,
                          marginBottom: 8,
                        }}
                      >
                        {msg.text}
                      </div>
                      <button
                        onClick={() =>
                          alert(`リンク先: ${msg.url}`)
                        }
                        style={{
                          background: primaryColor,
                          color: "white",
                          border: "none",
                          padding: "8px 24px",
                          borderRadius: 20,
                          cursor: "pointer",
                          fontSize: 14,
                        }}
                      >
                        {msg.buttonText}
                      </button>
                    </div>
                  </div>
                )}

                {msg.type === "faq" && msg.faqNode && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      marginTop: 8,
                    }}
                  >
                    {msg.faqNode.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() =>
                          handleFaqClick(item.question, item.answer)
                        }
                        style={{
                          background: "white",
                          border: "1px solid #e1e3e5",
                          padding: "8px 16px",
                          borderRadius: 20,
                          cursor: "pointer",
                          fontSize: 14,
                          textAlign: "left",
                        }}
                      >
                        {item.question}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>
      </Modal.Section>
    </Modal>
  );
}
