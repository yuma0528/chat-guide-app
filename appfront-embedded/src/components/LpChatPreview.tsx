import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Modal } from "@shopify/polaris";
import type {
  LpScenario,
  LpBlock,
  LpProductItem,
  LpProductVariant,
} from "../../../functions/src/types/lpScenario";

interface LpChatPreviewProps {
  scenario: LpScenario;
  onClose: () => void;
  primaryColor?: string;
  botName?: string;
}

type ChatMessage =
  | { id: string; type: "bot"; text: string; imageUrl?: string }
  | { id: string; type: "user"; text: string }
  | { id: string; type: "typing" }
  | { id: string; type: "discount"; label: string; code: string; description: string }
  | { id: string; type: "reviews"; heading: string; items: Array<{ name: string; rating: number; comment: string }> }
  | { id: string; type: "product_selection"; products: LpProductItem[]; allowQuantity: boolean }
  | { id: string; type: "form_input"; fields: Array<{ key: string; label: string; placeholder: string; inputType?: string }>; phase: string }
  | { id: string; type: "confirm"; data: Record<string, string>; products: SelectedProduct[] };

interface SelectedProduct {
  title: string;
  variantTitle: string;
  variantId: string;
  quantity: number;
  price: string;
}

// フロー段階: init → blocks → products → form
type FlowStage = "init" | "blocks" | "products" | "form";

export default function LpChatPreview({
  scenario,
  onClose,
  primaryColor = "#4A90D9",
  botName = "ショップアシスタント",
}: LpChatPreviewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [blockQueue, setBlockQueue] = useState<LpBlock[]>([]);
  const [flowStage, setFlowStage] = useState<FlowStage>("init");
  const [formPhase, setFormPhase] = useState<string | null>(null);
  const [customerData, setCustomerData] = useState<Record<string, string>>({});
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  // key = variantId, value = quantity
  const [variantQuantities, setVariantQuantities] = useState<Record<string, number>>({});
  const isAnimatingRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 初期化
  useEffect(() => {
    const blocks = [...scenario.blocks].sort((a, b) => a.sort_order - b.sort_order);
    setBlockQueue(blocks);
    setFlowStage("blocks");
    // 初期数量: 全て0（未選択）
    const initQty: Record<string, number> = {};
    for (const p of scenario.products) {
      for (const v of p.variants) {
        initQty[v.id] = 0;
      }
    }
    setVariantQuantities(initQty);
  }, [scenario]);

  // ブロックを1つずつ順番に処理
  useEffect(() => {
    if (flowStage !== "blocks" || isAnimatingRef.current) return;
    if (blockQueue.length === 0) {
      // ブロック完了 → 商品選択へ
      if (scenario.products.length > 0) {
        isAnimatingRef.current = true;
        showTypingThenMessage(
          "typing_products",
          { id: "products_msg", type: "bot", text: "こちらの商品からお選びください。" },
          () => {
            setTimeout(() => {
              setMessages((prev) => [
                ...prev,
                {
                  id: "product_selection",
                  type: "product_selection",
                  products: scenario.products,
                  allowQuantity: scenario.allow_quantity,
                },
              ]);
              setFlowStage("products");
              isAnimatingRef.current = false;
            }, 300);
          }
        );
      } else {
        // 商品なし → フォームへ
        setFlowStage("form");
      }
      return;
    }

    const block = blockQueue[0];
    isAnimatingRef.current = true;

    if (block.type === "message") {
      showTypingThenMessage(
        `typing_${block.id}`,
        { id: block.id, type: "bot", text: block.text, imageUrl: block.image_url || undefined },
        () => {
          setBlockQueue((prev) => prev.slice(1));
          isAnimatingRef.current = false;
        }
      );
    } else if (block.type === "discount_code") {
      showTypingThenContent(
        `typing_${block.id}`,
        { id: block.id, type: "discount", label: block.label, code: block.code, description: block.description },
        () => {
          setBlockQueue((prev) => prev.slice(1));
          isAnimatingRef.current = false;
        }
      );
    } else if (block.type === "reviews") {
      showTypingThenContent(
        `typing_${block.id}`,
        { id: block.id, type: "reviews", heading: block.heading, items: block.items.map((i) => ({ name: i.name, rating: i.rating, comment: i.comment })) },
        () => {
          setBlockQueue((prev) => prev.slice(1));
          isAnimatingRef.current = false;
        }
      );
    } else {
      setBlockQueue((prev) => prev.slice(1));
      isAnimatingRef.current = false;
    }
  }, [blockQueue, flowStage, scenario]);

  // フォームフロー開始
  useEffect(() => {
    if (flowStage !== "form" || formPhase !== null) return;
    isAnimatingRef.current = true;
    setFormPhase("name");
    showTypingThenMessage(
      "typing_form",
      { id: "form_name_msg", type: "bot", text: "ご購入手続きに進みます。\nお名前を入力してください。" },
      () => {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: "form_name",
              type: "form_input",
              fields: [
                { key: "last_name", label: "姓", placeholder: "山田" },
                { key: "first_name", label: "名", placeholder: "太郎" },
              ],
              phase: "name",
            },
          ]);
          isAnimatingRef.current = false;
        }, 300);
      }
    );
  }, [flowStage, formPhase]);

  // タイピング → メッセージ表示
  function showTypingThenMessage(
    typingId: string,
    msg: ChatMessage,
    onDone: () => void
  ) {
    setMessages((prev) => [...prev, { id: typingId, type: "typing" }]);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== typingId),
        msg,
      ]);
      onDone();
    }, 700);
  }

  // タイピング → コンテンツ(非bot)表示
  function showTypingThenContent(
    typingId: string,
    content: ChatMessage,
    onDone: () => void
  ) {
    setMessages((prev) => [...prev, { id: typingId, type: "typing" }]);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== typingId),
        content,
      ]);
      onDone();
    }, 700);
  }

  // バリアントカード一覧を生成
  interface VariantCard {
    productTitle: string;
    variant: LpProductVariant;
    imageUrl?: string;
    hasMultipleVariants: boolean;
  }
  const variantCards = useMemo((): VariantCard[] => {
    const cards: VariantCard[] = [];
    for (const product of scenario.products) {
      for (const variant of product.variants) {
        cards.push({
          productTitle: product.title,
          variant,
          imageUrl: product.image_url || undefined,
          hasMultipleVariants: product.variants.length > 1,
        });
      }
    }
    return cards;
  }, [scenario.products]);

  // 商品選択確定 → フォームへ
  const confirmAndProceed = useCallback((selected: SelectedProduct[]) => {
    if (selected.length === 0) return;
    setSelectedProducts(selected);

    const summary = selected.map((p) => {
      const label = p.variantTitle && p.variantTitle !== "デフォルト" && p.variantTitle !== "Default Title"
        ? `${p.title} / ${p.variantTitle}`
        : p.title;
      return `${label} × ${p.quantity}`;
    }).join("\n");

    setMessages((prev) => [
      ...prev,
      { id: `user_confirm_${Date.now()}`, type: "user", text: summary },
    ]);

    setTimeout(() => {
      setFlowStage("form");
    }, 300);
  }, []);

  // 確定ボタン: 選択済み（qty > 0）のみ送信。タップモードはqty=1固定
  const handleConfirmProducts = useCallback(() => {
    const selected: SelectedProduct[] = variantCards
      .filter((card) => (variantQuantities[card.variant.id] || 0) > 0)
      .map((card) => ({
        title: card.productTitle,
        variantTitle: card.variant.title,
        variantId: card.variant.id,
        quantity: scenario.allow_quantity ? variantQuantities[card.variant.id] : 1,
        price: card.variant.price,
      }));
    confirmAndProceed(selected);
  }, [variantCards, variantQuantities, confirmAndProceed, scenario.allow_quantity]);

  // タップモード: カードタップで選択/解除トグル
  const handleTapToggle = useCallback((card: VariantCard) => {
    setVariantQuantities((prev) => ({
      ...prev,
      [card.variant.id]: prev[card.variant.id] ? 0 : 1,
    }));
  }, []);

  // フォーム送信
  const handleFormSubmit = useCallback((phase: string) => {
    setMessages((prev) => prev.filter((m) => !(m.type === "form_input" && m.id === `form_${phase}`)));

    const advanceToNext = (nextPhase: string, botText: string, fields: Array<{ key: string; label: string; placeholder: string; inputType?: string }>) => {
      setFormPhase(nextPhase);
      isAnimatingRef.current = true;
      setTimeout(() => {
        showTypingThenMessage(
          `typing_${nextPhase}`,
          { id: `form_${nextPhase}_msg`, type: "bot", text: botText },
          () => {
            setTimeout(() => {
              setMessages((prev) => [
                ...prev,
                { id: `form_${nextPhase}`, type: "form_input", fields, phase: nextPhase },
              ]);
              isAnimatingRef.current = false;
            }, 300);
          }
        );
      }, 300);
    };

    if (phase === "name") {
      setMessages((prev) => [
        ...prev,
        { id: `user_name_${Date.now()}`, type: "user", text: `${customerData.last_name || ""} ${customerData.first_name || ""}` },
      ]);
      advanceToNext("email", "メールアドレスを入力してください。", [
        { key: "email", label: "メールアドレス", placeholder: "example@email.com", inputType: "email" },
      ]);
    } else if (phase === "email") {
      setMessages((prev) => [
        ...prev,
        { id: `user_email_${Date.now()}`, type: "user", text: customerData.email || "" },
      ]);
      if (scenario.customer_form.require_phone) {
        advanceToNext("phone", "電話番号を入力してください。", [
          { key: "phone", label: "電話番号", placeholder: "090-1234-5678", inputType: "tel" },
        ]);
      } else if (scenario.customer_form.require_address) {
        goToAddress();
      } else {
        goToConfirm();
      }
    } else if (phase === "phone") {
      setMessages((prev) => [
        ...prev,
        { id: `user_phone_${Date.now()}`, type: "user", text: customerData.phone || "" },
      ]);
      if (scenario.customer_form.require_address) {
        goToAddress();
      } else {
        goToConfirm();
      }
    } else if (phase === "address") {
      const addr = `〒${customerData.zip || ""} ${customerData.prefecture || ""}${customerData.city || ""}${customerData.address1 || ""}`;
      setMessages((prev) => [
        ...prev,
        { id: `user_addr_${Date.now()}`, type: "user", text: addr },
      ]);
      goToConfirm();
    }
  }, [customerData, scenario]);

  const goToAddress = useCallback(() => {
    setFormPhase("address");
    isAnimatingRef.current = true;
    setTimeout(() => {
      showTypingThenMessage(
        "typing_addr",
        { id: "form_addr_msg", type: "bot", text: "お届け先の住所を入力してください。" },
        () => {
          setTimeout(() => {
            setMessages((prev) => [
              ...prev,
              {
                id: "form_address",
                type: "form_input",
                fields: [
                  { key: "zip", label: "郵便番号", placeholder: "100-0001" },
                  { key: "prefecture", label: "都道府県", placeholder: "東京都" },
                  { key: "city", label: "市区町村", placeholder: "千代田区" },
                  { key: "address1", label: "番地・建物名", placeholder: "1-1-1" },
                ],
                phase: "address",
              },
            ]);
            isAnimatingRef.current = false;
          }, 300);
        }
      );
    }, 300);
  }, []);

  const goToConfirm = useCallback(() => {
    setFormPhase("confirm");
    isAnimatingRef.current = true;
    setTimeout(() => {
      showTypingThenMessage(
        "typing_confirm",
        { id: "confirm_msg", type: "bot", text: "以下の内容でよろしいですか？" },
        () => {
          setTimeout(() => {
            setMessages((prev) => [
              ...prev,
              { id: "confirm", type: "confirm", data: { ...customerData }, products: [...selectedProducts] },
            ]);
            isAnimatingRef.current = false;
          }, 300);
        }
      );
    }, 300);
  }, [customerData, selectedProducts]);

  // リスタート
  const handleRestart = useCallback(() => {
    setMessages([]);
    setSelectedProducts([]);
    setCustomerData({});
    setFormPhase(null);
    isAnimatingRef.current = false;
    const blocks = [...scenario.blocks].sort((a, b) => a.sort_order - b.sort_order);
    setBlockQueue(blocks);
    setFlowStage("blocks");
    const initQty: Record<string, number> = {};
    for (const p of scenario.products) {
      for (const v of p.variants) {
        initQty[v.id] = 0;
      }
    }
    setVariantQuantities(initQty);
  }, [scenario]);

  const formatPrice = (price: string) => {
    const n = parseFloat(price);
    return isNaN(n) ? price : `¥${n.toLocaleString()}`;
  };

  return (
    <Modal open onClose={onClose} title="プレビュー" size="large">
      <Modal.Section>
        <div
          style={{
            maxWidth: 400,
            margin: "0 auto",
            border: "1px solid #e1e3e5",
            borderRadius: 12,
            overflow: "hidden",
            height: 550,
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
              flexShrink: 0,
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
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: primaryColor, flexShrink: 0 }} />
                    <div style={{ background: "white", padding: "8px 16px", borderRadius: "0 12px 12px 12px", fontSize: 20 }}>
                      •••
                    </div>
                  </div>
                )}

                {msg.type === "bot" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: primaryColor, flexShrink: 0 }} />
                    <div>
                      <div style={{ background: "white", padding: "8px 16px", borderRadius: "0 12px 12px 12px", maxWidth: 260, whiteSpace: "pre-wrap" }}>
                        {msg.text}
                      </div>
                      {msg.imageUrl && (
                        <img src={msg.imageUrl} alt="" style={{ maxWidth: 260, borderRadius: 8, marginTop: 4 }} />
                      )}
                    </div>
                  </div>
                )}

                {msg.type === "user" && (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div style={{ background: primaryColor, color: "white", padding: "8px 16px", borderRadius: "12px 0 12px 12px", maxWidth: 260, whiteSpace: "pre-wrap" }}>
                      {msg.text}
                    </div>
                  </div>
                )}

                {msg.type === "discount" && (
                  <div style={{ background: "white", border: `2px dashed ${primaryColor}`, borderRadius: 12, padding: 16, textAlign: "center" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: primaryColor, marginBottom: 8 }}>{msg.label}</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2, background: "#f0f0f0", padding: "4px 12px", borderRadius: 6 }}>{msg.code}</span>
                      <button
                        onClick={() => navigator.clipboard?.writeText(msg.code)}
                        style={{ background: primaryColor, color: "white", border: "none", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}
                      >
                        コピー
                      </button>
                    </div>
                    <div style={{ fontSize: 12, color: "#666" }}>{msg.description}</div>
                  </div>
                )}

                {msg.type === "reviews" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {msg.heading && (
                      <div style={{ fontWeight: 600, fontSize: 14, paddingLeft: 40 }}>{msg.heading}</div>
                    )}
                    {msg.items.map((item, idx) => (
                      <div key={idx} style={{ background: "white", borderRadius: 10, padding: "10px 14px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</span>
                          <span style={{ color: "#f5a623", fontSize: 14 }}>
                            {"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: "#444" }}>{item.comment}</div>
                      </div>
                    ))}
                  </div>
                )}

                {msg.type === "product_selection" && (() => {
                  const hasSelected = Object.values(variantQuantities).some((q) => q > 0);
                  const isTapMode = !msg.allowQuantity;
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {variantCards.map((card) => {
                        const qty = variantQuantities[card.variant.id] || 0;
                        const isSelected = qty > 0;
                        const displayTitle = card.hasMultipleVariants
                          ? `${card.productTitle} / ${card.variant.title}`
                          : card.productTitle;
                        return (
                          <div
                            key={card.variant.id}
                            onClick={isTapMode && flowStage === "products" ? () => handleTapToggle(card) : undefined}
                            style={{
                              background: "white",
                              borderRadius: 10,
                              overflow: "hidden",
                              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                              padding: 12,
                              cursor: isTapMode && flowStage === "products" ? "pointer" : "default",
                              border: `2px solid ${isSelected && isTapMode ? primaryColor : "transparent"}`,
                              transition: "border-color 0.15s",
                            }}
                          >
                            <div style={{ display: "flex", gap: 12 }}>
                              {card.imageUrl && (
                                <img src={card.imageUrl} alt="" style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
                              )}
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                                  {isTapMode && isSelected && <span style={{ color: primaryColor, marginRight: 4 }}>✓</span>}
                                  {displayTitle}
                                </div>
                                <div style={{ color: primaryColor, fontWeight: 700, fontSize: 15 }}>
                                  {formatPrice(card.variant.price)}
                                </div>
                              </div>
                            </div>
                            {/* 数量モード */}
                            {msg.allowQuantity && (
                              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 13, color: "#666" }}>数量:</span>
                                <button
                                  onClick={() => {
                                    setVariantQuantities((prev) => ({
                                      ...prev,
                                      [card.variant.id]: Math.max(0, (prev[card.variant.id] || 0) - 1),
                                    }));
                                  }}
                                  style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid #ddd", background: "white", cursor: "pointer", fontSize: 16 }}
                                >
                                  -
                                </button>
                                <span style={{ width: 32, textAlign: "center", fontWeight: 600, color: qty > 0 ? "#000" : "#999" }}>
                                  {qty}
                                </span>
                                <button
                                  onClick={() => {
                                    setVariantQuantities((prev) => ({
                                      ...prev,
                                      [card.variant.id]: (prev[card.variant.id] || 0) + 1,
                                    }));
                                  }}
                                  style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid #ddd", background: "white", cursor: "pointer", fontSize: 16 }}
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {flowStage === "products" && (
                        <button
                          onClick={handleConfirmProducts}
                          disabled={!hasSelected}
                          style={{
                            background: hasSelected ? primaryColor : "#ccc",
                            color: "white",
                            border: "none",
                            padding: "10px 20px",
                            borderRadius: 20,
                            cursor: hasSelected ? "pointer" : "default",
                            fontSize: 14,
                            fontWeight: 600,
                          }}
                        >
                          この内容で購入手続きへ
                        </button>
                      )}
                    </div>
                  );
                })()}

                {msg.type === "form_input" && (
                  <div style={{ background: "white", borderRadius: 10, padding: "12px 14px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                    {msg.fields.map((field) => (
                      <div key={field.key} style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>{field.label}</div>
                        <input
                          type={field.inputType || "text"}
                          placeholder={field.placeholder}
                          value={customerData[field.key] || ""}
                          onChange={(e) => setCustomerData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "1px solid #ddd",
                            borderRadius: 8,
                            fontSize: 14,
                            boxSizing: "border-box",
                            outline: "none",
                          }}
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => handleFormSubmit(msg.phase)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        background: primaryColor,
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: 14,
                      }}
                    >
                      次へ
                    </button>
                  </div>
                )}

                {msg.type === "confirm" && (
                  <div>
                    <div style={{ background: "white", borderRadius: 10, padding: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", marginBottom: 8 }}>
                      {[
                        { label: "お名前", value: `${msg.data.last_name || ""} ${msg.data.first_name || ""}` },
                        { label: "メール", value: msg.data.email || "" },
                        ...(msg.data.phone ? [{ label: "電話番号", value: msg.data.phone }] : []),
                        ...(msg.data.zip ? [{ label: "住所", value: `〒${msg.data.zip} ${msg.data.prefecture || ""}${msg.data.city || ""}${msg.data.address1 || ""}` }] : []),
                      ].map((row, idx) => (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f0f0f0", fontSize: 13 }}>
                          <span style={{ color: "#666" }}>{row.label}</span>
                          <span style={{ fontWeight: 600 }}>{row.value}</span>
                        </div>
                      ))}
                      {msg.products.map((p, idx) => {
                        const label = p.variantTitle && p.variantTitle !== "デフォルト" && p.variantTitle !== "Default Title"
                          ? `${p.title} / ${p.variantTitle}`
                          : p.title;
                        return (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f0f0f0", fontSize: 13 }}>
                            <span style={{ color: "#666" }}>{label}</span>
                            <span style={{ fontWeight: 600 }}>{formatPrice(p.price)} × {p.quantity}</span>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => alert("プレビューのため、実際のチェックアウトにはリダイレクトしません。")}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: 14,
                        background: primaryColor,
                        color: "white",
                        border: "none",
                        borderRadius: 24,
                        fontSize: 16,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {scenario.customer_form.submit_button_text || "購入手続きへ進む"}
                    </button>
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
