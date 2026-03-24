import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  getMetafield,
  setMetafield,
  deleteMetafield,
} from "../shopify/metafields";
import {
  scenarioSchema,
  scenariosIndexSchema,
  scenarioNodeSchema,
  scenarioDisplaySchema,
} from "../types/chatGuide";
import type { ScenariosIndex, Scenario, ScenarioNode } from "../types/chatGuide";
import type { ProductData } from "../types/chatGuide";
import { updateStorefrontData } from "./widgetConfig";
import prisma from "../db.server";
import { createAdminGraphqlClient } from "../helper/createAdminGraphqlClient";
import { getSdk as getProductsSdk } from "../graphql/shopifyAdminApi/products.generated";
import { productDataSchema } from "../types/chatGuide";

const NAMESPACE = "chat_guide";

async function getScenariosIndex(shop: string): Promise<ScenariosIndex> {
  const result = await getMetafield(shop, NAMESPACE, "scenarios_index");
  if (!result) return { scenarios: [] };
  return scenariosIndexSchema.parse(JSON.parse(result.value));
}

async function saveScenariosIndex(
  shop: string,
  index: ScenariosIndex
): Promise<void> {
  await setMetafield(
    shop,
    NAMESPACE,
    "scenarios_index",
    JSON.stringify(index)
  );
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
}

function getTemplateNodes(template: string, products: ProductData[] = []): ScenarioNode[] {
  switch (template) {
    case "gift_guide": {
      // 第1階層: 贈る相手
      const recipPartner = genId("choice");
      const recipFriend = genId("choice");
      const recipFamily = genId("choice");
      const recipSelf = genId("choice");
      // 第2階層: パートナー → 予算
      const budgetLow = genId("choice");
      const budgetMid = genId("choice");
      const budgetHigh = genId("choice");
      // 第2階層: 友人 → ジャンル
      const genreFood = genId("choice");
      const genreFashion = genId("choice");
      const genreLifestyle = genId("choice");
      // 第2階層: 家族 → シーン
      const scenebirthday = genId("choice");
      const sceneAnniv = genId("choice");
      const sceneThanks = genId("choice");
      return [
        { id: genId("node"), type: "message", parent_choice_id: null, sort_order: 0, text: "こんにちは！🎁\nギフト選びのお手伝いをさせてください。\n\nいくつか質問にお答えいただくだけで、ぴったりのギフトをご提案します。", image_url: null },
        { id: genId("node"), type: "choice", parent_choice_id: null, sort_order: 1, text: "まず、どなたへのプレゼントですか？", choices: [
          { id: recipPartner, label: "💑 パートナーへ", icon_url: null, url: null, sort_order: 0 },
          { id: recipFriend, label: "👫 友人へ", icon_url: null, url: null, sort_order: 1 },
          { id: recipFamily, label: "👨‍👩‍👧 家族へ", icon_url: null, url: null, sort_order: 2 },
          { id: recipSelf, label: "🎀 自分へのご褒美", icon_url: null, url: null, sort_order: 3 },
        ]},
        // パートナー → 予算選択
        { id: genId("node"), type: "message", parent_choice_id: recipPartner, sort_order: 0, text: "パートナーへのギフトですね💕\n特別な方へのプレゼントだからこそ、じっくり選びたいですよね。", image_url: null },
        { id: genId("node"), type: "choice", parent_choice_id: recipPartner, sort_order: 1, text: "ご予算はどのくらいをお考えですか？", choices: [
          { id: budgetLow, label: "〜5,000円", icon_url: null, url: null, sort_order: 0 },
          { id: budgetMid, label: "5,000円〜15,000円", icon_url: null, url: null, sort_order: 1 },
          { id: budgetHigh, label: "15,000円〜", icon_url: null, url: null, sort_order: 2 },
        ]},
        { id: genId("node"), type: "message", parent_choice_id: budgetLow, sort_order: 0, text: "5,000円以内でも気持ちが伝わるギフトはたくさんあります！\n以下のコレクションから探してみてください。", image_url: null },
        { id: genId("node"), type: "link", parent_choice_id: budgetLow, sort_order: 1, text: "手頃な価格で喜ばれるアイテムを集めました。", button_text: "〜5,000円のギフトを見る", url: "/collections/gifts-under-5000" },
        { id: genId("node"), type: "message", parent_choice_id: budgetMid, sort_order: 0, text: "5,000円〜15,000円は一番人気の価格帯です！\nこだわりのアイテムが見つかりますよ。", image_url: null },
        ...(products.length > 0 ? [
          { id: genId("node"), type: "product_card" as const, parent_choice_id: budgetMid, sort_order: 1, shopify_product_ids: products.map(p => p.id), products, after_actions: [{ label: "他のギフトも見る", target_node_id: "__restart__" }] },
        ] : [
          { id: genId("node"), type: "link" as const, parent_choice_id: budgetMid, sort_order: 1, text: "人気のギフトアイテムをチェック！", button_text: "5,000円〜のギフトを見る", url: "/collections/gifts-5000-15000" },
        ]),
        { id: genId("node"), type: "message", parent_choice_id: budgetHigh, sort_order: 0, text: "特別な日にふさわしいプレミアムなギフトですね✨\n記念に残る逸品を揃えています。", image_url: null },
        { id: genId("node"), type: "link", parent_choice_id: budgetHigh, sort_order: 1, text: "プレミアムギフトコレクション", button_text: "15,000円〜のギフトを見る", url: "/collections/premium-gifts" },
        // 友人 → ジャンル選択
        { id: genId("node"), type: "message", parent_choice_id: recipFriend, sort_order: 0, text: "お友達へのギフトですね！\nどんなジャンルのものが喜ばれそうですか？", image_url: null },
        { id: genId("node"), type: "choice", parent_choice_id: recipFriend, sort_order: 1, text: "ジャンルを選んでください", choices: [
          { id: genreFood, label: "🍫 グルメ・スイーツ", icon_url: null, url: null, sort_order: 0 },
          { id: genreFashion, label: "👜 ファッション小物", icon_url: null, url: null, sort_order: 1 },
          { id: genreLifestyle, label: "🏠 ライフスタイル雑貨", icon_url: null, url: null, sort_order: 2 },
        ]},
        { id: genId("node"), type: "message", parent_choice_id: genreFood, sort_order: 0, text: "グルメ・スイーツは万人に喜ばれますね！🍰\n当店の人気スイーツギフトをご覧ください。", image_url: null },
        ...(products.length > 0 ? [
          { id: genId("node"), type: "product_card" as const, parent_choice_id: genreFood, sort_order: 1, shopify_product_ids: products.map(p => p.id), products, after_actions: [{ label: "他のギフトも見る", target_node_id: "__restart__" }] },
        ] : [
          { id: genId("node"), type: "link" as const, parent_choice_id: genreFood, sort_order: 1, text: "大切な人に贈りたいスイーツを集めました", button_text: "スイーツギフトを見る", url: "/collections/sweets-gifts" },
        ]),
        { id: genId("node"), type: "message", parent_choice_id: genreFashion, sort_order: 0, text: "おしゃれな友人にぴったりですね！👜\nセンスの良いファッション小物をご紹介します。", image_url: null },
        { id: genId("node"), type: "link", parent_choice_id: genreFashion, sort_order: 1, text: "トレンドのファッション小物はこちら", button_text: "ファッション小物を見る", url: "/collections/fashion-accessories" },
        { id: genId("node"), type: "message", parent_choice_id: genreLifestyle, sort_order: 0, text: "暮らしを彩る雑貨は実用的で喜ばれます！\n日常がちょっと豊かになるアイテムです。", image_url: null },
        { id: genId("node"), type: "link", parent_choice_id: genreLifestyle, sort_order: 1, text: "おしゃれなライフスタイル雑貨", button_text: "雑貨を見る", url: "/collections/lifestyle-goods" },
        // 家族 → シーン選択
        { id: genId("node"), type: "message", parent_choice_id: recipFamily, sort_order: 0, text: "ご家族へのギフトですね！\nどんなシーンでのプレゼントですか？", image_url: null },
        { id: genId("node"), type: "choice", parent_choice_id: recipFamily, sort_order: 1, text: "シーンを教えてください", choices: [
          { id: scenebirthday, label: "🎂 誕生日", icon_url: null, url: null, sort_order: 0 },
          { id: sceneAnniv, label: "💐 記念日", icon_url: null, url: null, sort_order: 1 },
          { id: sceneThanks, label: "🙏 日頃の感謝", icon_url: null, url: null, sort_order: 2 },
        ]},
        { id: genId("node"), type: "message", parent_choice_id: scenebirthday, sort_order: 0, text: "お誕生日おめでとうございます！🎂\n特別な日にふさわしいギフトをお選びください。", image_url: null },
        { id: genId("node"), type: "link", parent_choice_id: scenebirthday, sort_order: 1, text: "バースデーギフト特集", button_text: "誕生日ギフトを見る", url: "/collections/birthday-gifts" },
        { id: genId("node"), type: "message", parent_choice_id: sceneAnniv, sort_order: 0, text: "大切な記念日のギフト選びですね💐\n思い出に残るアイテムをご用意しています。", image_url: null },
        { id: genId("node"), type: "link", parent_choice_id: sceneAnniv, sort_order: 1, text: "記念日にぴったりのアイテム", button_text: "記念日ギフトを見る", url: "/collections/anniversary-gifts" },
        { id: genId("node"), type: "message", parent_choice_id: sceneThanks, sort_order: 0, text: "日頃の感謝を伝えるギフト、素敵ですね！🙏\nさりげなく気持ちが伝わるアイテムはいかがでしょう。", image_url: null },
        { id: genId("node"), type: "link", parent_choice_id: sceneThanks, sort_order: 1, text: "「ありがとう」を伝えるギフト", button_text: "感謝ギフトを見る", url: "/collections/thank-you-gifts" },
        // 自分へのご褒美
        { id: genId("node"), type: "message", parent_choice_id: recipSelf, sort_order: 0, text: "自分へのご褒美、大切ですよね✨\n頑張った自分にぴったりのアイテムをぜひ。", image_url: null },
        ...(products.length > 0 ? [
          { id: genId("node"), type: "product_card" as const, parent_choice_id: recipSelf, sort_order: 1, shopify_product_ids: products.map(p => p.id), products, after_actions: [{ label: "最初に戻る", target_node_id: "__restart__" }] },
        ] : [
          { id: genId("node"), type: "link" as const, parent_choice_id: recipSelf, sort_order: 1, text: "自分へのご褒美に人気のアイテムです", button_text: "ご褒美アイテムを見る", url: "/collections/self-reward" },
        ]),
      ];
    }
    case "faq": {
      const catShipping = genId("choice");
      const catReturn = genId("choice");
      const catPayment = genId("choice");
      const catProduct = genId("choice");
      const catAccount = genId("choice");
      return [
        { id: genId("node"), type: "message", parent_choice_id: null, sort_order: 0, text: "こんにちは！💬\nご質問やお困りごとはありませんか？\n\nよくあるご質問からお探しの内容をお選びください。", image_url: null },
        { id: genId("node"), type: "choice", parent_choice_id: null, sort_order: 1, text: "どのカテゴリについてお知りになりたいですか？", choices: [
          { id: catShipping, label: "🚚 配送・送料", icon_url: null, url: null, sort_order: 0 },
          { id: catReturn, label: "🔄 返品・交換", icon_url: null, url: null, sort_order: 1 },
          { id: catPayment, label: "💳 お支払い", icon_url: null, url: null, sort_order: 2 },
          { id: catProduct, label: "📦 商品について", icon_url: null, url: null, sort_order: 3 },
          { id: catAccount, label: "👤 アカウント", icon_url: null, url: null, sort_order: 4 },
        ]},
        // 配送・送料
        { id: genId("node"), type: "faq", parent_choice_id: catShipping, sort_order: 0, text: "配送・送料に関するよくあるご質問です📦", items: [
          { id: genId("faq"), question: "送料はいくらですか？", answer: "全国一律550円（税込）です。10,000円以上のご注文で送料無料になります。\n\n沖縄・離島は別途1,100円が加算されます。", sort_order: 0 },
          { id: genId("faq"), question: "届くまで何日かかりますか？", answer: "ご注文確定後、通常1〜3営業日で発送いたします。\n\n・本州: 発送翌日〜翌々日\n・北海道・九州: 発送後2〜3日\n・沖縄・離島: 発送後3〜5日\n\n※年末年始・大型連休は遅れる場合があります。", sort_order: 1 },
          { id: genId("faq"), question: "配送状況を確認できますか？", answer: "はい、発送完了メールに追跡番号を記載しています。\n\nヤマト運輸の追跡サービスからリアルタイムで配送状況をご確認いただけます。\n\nマイページの「注文履歴」からもご確認可能です。", sort_order: 2 },
          { id: genId("faq"), question: "日時指定はできますか？", answer: "はい、以下の時間帯からお選びいただけます。\n\n・午前中\n・14:00〜16:00\n・16:00〜18:00\n・18:00〜20:00\n・19:00〜21:00\n\nご注文時の備考欄にご希望をお書きください。", sort_order: 3 },
          { id: genId("faq"), question: "ギフトラッピングは対応していますか？", answer: "はい、1件あたり330円（税込）で承っております。\n\nカート画面でギフトラッピングオプションを追加してください。メッセージカード（無料）もお付けできます。", sort_order: 4 },
        ], resolved_label: "解決しました", resolved_next_node_id: null },
        // 返品・交換
        { id: genId("node"), type: "faq", parent_choice_id: catReturn, sort_order: 0, text: "返品・交換についてのご質問です🔄", items: [
          { id: genId("faq"), question: "返品は可能ですか？", answer: "商品到着後7日以内であれば、未使用・未開封に限り返品を承ります。\n\nただし以下の商品は返品対象外です:\n・セール商品\n・名入れ・カスタマイズ商品\n・食品\n\n返品をご希望の場合は、まずお問い合わせフォームよりご連絡ください。", sort_order: 0 },
          { id: genId("faq"), question: "サイズ交換はできますか？", answer: "サイズ交換は商品到着後7日以内であれば承ります。\n\n交換の流れ:\n1. お問い合わせフォームからご連絡\n2. 返送用ラベルをお送りします\n3. 商品到着後、新サイズを発送\n\n※在庫状況により交換できない場合があります。", sort_order: 1 },
          { id: genId("faq"), question: "不良品が届いた場合は？", answer: "大変申し訳ございません。不良品の場合は、送料当店負担にて交換いたします。\n\n商品到着後7日以内に、不良箇所の写真を添えてお問い合わせフォームよりご連絡ください。\n\n確認後、速やかに代替品を発送いたします。", sort_order: 2 },
          { id: genId("faq"), question: "返金はいつ頃されますか？", answer: "返品商品の到着確認後、5〜10営業日以内に返金処理を行います。\n\n・クレジットカード: 次回請求時に相殺\n・銀行振込: ご指定口座へ返金\n・コンビニ払い: ご指定口座へ返金\n\n返金方法はお支払い方法によって異なります。", sort_order: 3 },
        ], resolved_label: "解決しました", resolved_next_node_id: null },
        // お支払い
        { id: genId("node"), type: "faq", parent_choice_id: catPayment, sort_order: 0, text: "お支払いに関するご質問です💳", items: [
          { id: genId("faq"), question: "どんな支払い方法がありますか？", answer: "以下のお支払い方法をご利用いただけます:\n\n💳 クレジットカード\nVISA / Mastercard / JCB / AMEX / Diners\n\n📱 電子マネー・QR決済\nApple Pay / Google Pay / Shop Pay\n\n🏪 コンビニ払い\nセブン-イレブン / ローソン / ファミリーマート\n\n🏦 銀行振込\n※振込手数料はお客様負担", sort_order: 0 },
          { id: genId("faq"), question: "分割払いはできますか？", answer: "クレジットカードでのお支払いに限り、分割払い（3回・6回・12回・24回）をご利用いただけます。\n\n※分割手数料はカード会社の規定によります。\n※一部カードでは分割払いに対応していない場合があります。", sort_order: 1 },
          { id: genId("faq"), question: "領収書は発行できますか？", answer: "はい、マイページの「注文履歴」から領収書をダウンロードいただけます。\n\n宛名の変更が必要な場合は、お問い合わせフォームよりご連絡ください。\n\nPDF形式でメールにてお送りすることも可能です。", sort_order: 2 },
          { id: genId("faq"), question: "クーポンコードの使い方は？", answer: "カート画面の「クーポンコード」欄にコードを入力し、「適用」ボタンを押してください。\n\n注意事項:\n・1回のご注文につき1つのクーポンのみ使用可能\n・セール商品との併用は不可の場合があります\n・有効期限にご注意ください", sort_order: 3 },
        ], resolved_label: "解決しました", resolved_next_node_id: null },
        // 商品について
        { id: genId("node"), type: "faq", parent_choice_id: catProduct, sort_order: 0, text: "商品に関するご質問です📦", items: [
          { id: genId("faq"), question: "サイズ感を教えてください", answer: "各商品ページに詳細なサイズ表を掲載しています。\n\n採寸方法:\n・身幅: 脇の下の直線距離\n・着丈: 襟元〜裾\n・袖丈: 肩〜袖口\n\n迷われた場合は、普段のサイズより1サイズ上をおすすめします。\n\nさらに詳しくはお気軽にお問い合わせください。", sort_order: 0 },
          { id: genId("faq"), question: "在庫がない商品は再入荷しますか？", answer: "人気商品は随時再入荷を予定しています。\n\n商品ページの「再入荷通知を受け取る」ボタンを押していただくと、入荷時にメールでお知らせします。\n\n※生産終了品は再入荷の予定がない場合があります。", sort_order: 1 },
          { id: genId("faq"), question: "商品のお手入れ方法は？", answer: "商品に付属の取扱い表示に従ってお手入れください。\n\n一般的な注意点:\n・洗濯は表示温度以下で\n・色移り防止のため単独洗い推奨\n・乾燥機の使用は縮みの原因に\n\n各商品ページの「お手入れ方法」セクションもご参照ください。", sort_order: 2 },
          { id: genId("faq"), question: "商品の素材や産地を知りたい", answer: "各商品ページの「商品詳細」セクションに素材・産地情報を記載しています。\n\n当店では品質とトレーサビリティを大切にしており、主要な素材の産地や製造工程を公開しています。\n\nさらに詳しい情報はお問い合わせフォームよりお気軽にどうぞ。", sort_order: 3 },
        ], resolved_label: "解決しました", resolved_next_node_id: null },
        // アカウント
        { id: genId("node"), type: "faq", parent_choice_id: catAccount, sort_order: 0, text: "アカウントに関するご質問です👤", items: [
          { id: genId("faq"), question: "会員登録のメリットは？", answer: "会員登録していただくと、以下の特典があります:\n\n✅ 購入履歴の確認\n✅ お届け先の保存（次回から入力不要）\n✅ 会員限定セールへの招待\n✅ 新商品の先行販売情報\n✅ ポイント還元（お買い物金額の3%）\n\n登録は無料で、1分ほどで完了します。", sort_order: 0 },
          { id: genId("faq"), question: "パスワードを忘れました", answer: "ログイン画面の「パスワードをお忘れですか？」をクリックしてください。\n\nご登録のメールアドレスにパスワードリセット用のリンクをお送りします。\n\n※リンクの有効期限は24時間です。\n※メールが届かない場合は迷惑メールフォルダをご確認ください。", sort_order: 1 },
          { id: genId("faq"), question: "退会したい", answer: "マイページの「アカウント設定」→「アカウントの削除」から退会手続きが可能です。\n\n退会すると以下のデータが削除されます:\n・購入履歴\n・保有ポイント\n・お届け先情報\n\n※退会後のデータ復元はできませんのでご注意ください。", sort_order: 2 },
        ], resolved_label: "解決しました", resolved_next_node_id: null },
      ];
    }
    case "product_guide": {
      const catCategory = genId("choice");
      const catRanking = genId("choice");
      const catNew = genId("choice");
      const catSale = genId("choice");
      // カテゴリ分岐
      const subCat1 = genId("choice");
      const subCat2 = genId("choice");
      const subCat3 = genId("choice");
      return [
        { id: genId("node"), type: "message", parent_choice_id: null, sort_order: 0, text: "いらっしゃいませ！✨\n当店へようこそ。商品選びをお手伝いします。", image_url: null },
        { id: genId("node"), type: "message", parent_choice_id: null, sort_order: 1, text: "何かお探しのものはありますか？\n以下から気になる項目をお選びください👇", image_url: null },
        { id: genId("node"), type: "choice", parent_choice_id: null, sort_order: 2, text: "どんな商品をお探しですか？", choices: [
          { id: catCategory, label: "📂 カテゴリから探す", icon_url: null, url: null, sort_order: 0 },
          { id: catRanking, label: "👑 人気ランキング", icon_url: null, url: null, sort_order: 1 },
          { id: catNew, label: "🆕 新着商品", icon_url: null, url: null, sort_order: 2 },
          { id: catSale, label: "🏷️ セール商品", icon_url: null, url: null, sort_order: 3 },
        ]},
        // カテゴリから探す → サブカテゴリ
        { id: genId("node"), type: "message", parent_choice_id: catCategory, sort_order: 0, text: "カテゴリからお選びください！\nそれぞれ厳選したアイテムを揃えています。", image_url: null },
        { id: genId("node"), type: "choice", parent_choice_id: catCategory, sort_order: 1, text: "気になるカテゴリは？", choices: [
          { id: subCat1, label: "カテゴリA", icon_url: null, url: null, sort_order: 0 },
          { id: subCat2, label: "カテゴリB", icon_url: null, url: null, sort_order: 1 },
          { id: subCat3, label: "カテゴリC", icon_url: null, url: null, sort_order: 2 },
        ]},
        { id: genId("node"), type: "message", parent_choice_id: subCat1, sort_order: 0, text: "カテゴリAの人気商品をご紹介します！\n当店スタッフも愛用しているアイテムばかりです。", image_url: null },
        { id: genId("node"), type: "link", parent_choice_id: subCat1, sort_order: 1, text: "全商品はこちらからご覧いただけます", button_text: "カテゴリAを見る", url: "/collections/category-a" },
        { id: genId("node"), type: "message", parent_choice_id: subCat2, sort_order: 0, text: "カテゴリBはこだわりの品質で大変ご好評いただいています！", image_url: null },
        { id: genId("node"), type: "link", parent_choice_id: subCat2, sort_order: 1, text: "こだわりのアイテムをチェック", button_text: "カテゴリBを見る", url: "/collections/category-b" },
        { id: genId("node"), type: "message", parent_choice_id: subCat3, sort_order: 0, text: "カテゴリCは幅広いラインナップが魅力です！\nきっとお気に入りが見つかりますよ。", image_url: null },
        { id: genId("node"), type: "link", parent_choice_id: subCat3, sort_order: 1, text: "豊富なラインナップを見る", button_text: "カテゴリCを見る", url: "/collections/category-c" },
        // 人気ランキング
        { id: genId("node"), type: "message", parent_choice_id: catRanking, sort_order: 0, text: "👑 当店の人気ランキングTOP商品です！\n\n迷ったらまずはランキングからチェックするのがおすすめです。多くのお客様に支持されたアイテムばかりです。", image_url: null },
        ...(products.length > 0 ? [
          { id: genId("node"), type: "product_card" as const, parent_choice_id: catRanking, sort_order: 1, shopify_product_ids: products.map(p => p.id), products, after_actions: [{ label: "他の商品も見る", target_node_id: "__restart__" }] },
        ] : [
          { id: genId("node"), type: "link" as const, parent_choice_id: catRanking, sort_order: 1, text: "売れ筋ランキングをチェック", button_text: "ランキングを見る", url: "/collections/best-sellers" },
        ]),
        // 新着商品
        { id: genId("node"), type: "message", parent_choice_id: catNew, sort_order: 0, text: "🆕 新着商品が続々入荷中です！\n\n最新トレンドを取り入れたアイテムや、お客様のリクエストから生まれた新商品をご紹介しています。", image_url: null },
        ...(products.length > 0 ? [
          { id: genId("node"), type: "product_card" as const, parent_choice_id: catNew, sort_order: 1, shopify_product_ids: products.map(p => p.id), products, after_actions: [{ label: "他の商品も見る", target_node_id: "__restart__" }] },
        ] : [
          { id: genId("node"), type: "link" as const, parent_choice_id: catNew, sort_order: 1, text: "最新の入荷アイテムを見る", button_text: "新着商品を見る", url: "/collections/new-arrivals" },
        ]),
        // セール
        { id: genId("node"), type: "message", parent_choice_id: catSale, sort_order: 0, text: "🏷️ お得なセール開催中！\n\n人気商品が特別価格に。数量限定のアイテムもございますので、お早めにどうぞ！", image_url: null },
        ...(products.length > 0 ? [
          { id: genId("node"), type: "product_card" as const, parent_choice_id: catSale, sort_order: 1, shopify_product_ids: products.map(p => p.id), products, after_actions: [{ label: "他の商品も見る", target_node_id: "__restart__" }] },
        ] : [
          { id: genId("node"), type: "link" as const, parent_choice_id: catSale, sort_order: 1, text: "セール会場はこちら", button_text: "セール商品を見る", url: "/collections/sale" },
        ]),
      ];
    }
    case "first_visitor": {
      const actionBrowse = genId("choice");
      const actionRecommend = genId("choice");
      const actionAbout = genId("choice");
      const actionHelp = genId("choice");
      return [
        { id: genId("node"), type: "message", parent_choice_id: null, sort_order: 0, text: "はじめまして！🌸\n当店へお越しいただきありがとうございます。", image_url: null },
        { id: genId("node"), type: "message", parent_choice_id: null, sort_order: 1, text: "初めてご利用の方へ、当店のご紹介とお買い物のサポートをさせてください。\n\n何かお手伝いできることはありますか？", image_url: null },
        { id: genId("node"), type: "choice", parent_choice_id: null, sort_order: 2, text: "気になるものをお選びください", choices: [
          { id: actionBrowse, label: "🛍️ 商品を見てみたい", icon_url: null, url: null, sort_order: 0 },
          { id: actionRecommend, label: "💡 おすすめを教えて", icon_url: null, url: null, sort_order: 1 },
          { id: actionAbout, label: "ℹ️ お店について知りたい", icon_url: null, url: null, sort_order: 2 },
          { id: actionHelp, label: "❓ 質問がある", icon_url: null, url: null, sort_order: 3 },
        ]},
        // 商品を見てみたい
        { id: genId("node"), type: "message", parent_choice_id: actionBrowse, sort_order: 0, text: "ぜひご覧ください！🛍️\n\n当店では厳選した商品を取り揃えています。\n人気商品からチェックしてみてください。", image_url: null },
        ...(products.length > 0 ? [
          { id: genId("node"), type: "product_card" as const, parent_choice_id: actionBrowse, sort_order: 1, shopify_product_ids: products.map(p => p.id), products, after_actions: [{ label: "他の商品も見る", target_node_id: "__restart__" }] },
        ] : [
          { id: genId("node"), type: "link" as const, parent_choice_id: actionBrowse, sort_order: 1, text: "すべての商品を見る", button_text: "商品一覧へ", url: "/collections/all" },
        ]),
        // おすすめを教えて
        { id: genId("node"), type: "message", parent_choice_id: actionRecommend, sort_order: 0, text: "はじめてのお客様におすすめの商品をご紹介します！💡\n\n当店で特に人気のアイテムを厳選しました。多くのお客様にリピートいただいている定番商品です。", image_url: null },
        { id: genId("node"), type: "message", parent_choice_id: actionRecommend, sort_order: 1, text: "✨ 初めてのお客様限定 ✨\n\n会員登録で次回使える10%OFFクーポンをプレゼント中です！\n商品を選んだ後でも登録可能ですので、まずはお気軽にご覧ください。", image_url: null },
        ...(products.length > 0 ? [
          { id: genId("node"), type: "product_card" as const, parent_choice_id: actionRecommend, sort_order: 2, shopify_product_ids: products.map(p => p.id), products, after_actions: [{ label: "最初に戻る", target_node_id: "__restart__" }] },
        ] : [
          { id: genId("node"), type: "link" as const, parent_choice_id: actionRecommend, sort_order: 2, text: "スタッフ厳選のおすすめアイテム", button_text: "おすすめ商品を見る", url: "/collections/staff-picks" },
        ]),
        // お店について
        { id: genId("node"), type: "message", parent_choice_id: actionAbout, sort_order: 0, text: "当店についてご紹介させてください！ℹ️\n\n私たちは「日常をちょっと特別にする」をコンセプトに、品質にこだわったアイテムをお届けしています。", image_url: null },
        { id: genId("node"), type: "message", parent_choice_id: actionAbout, sort_order: 1, text: "📌 当店の3つの約束\n\n1️⃣ 品質保証: すべての商品を自社基準で検品\n2️⃣ 迅速配送: ご注文から1〜3営業日で発送\n3️⃣ 安心サポート: 7日間の返品保証付き\n\n安心してお買い物をお楽しみください😊", image_url: null },
        { id: genId("node"), type: "link", parent_choice_id: actionAbout, sort_order: 2, text: "もっと詳しく知りたい方はこちら", button_text: "ブランドストーリーを見る", url: "/pages/about" },
        // 質問がある
        { id: genId("node"), type: "message", parent_choice_id: actionHelp, sort_order: 0, text: "ご質問がおありなんですね！\nお気軽にどうぞ😊\n\nよくあるご質問は以下からご確認いただけます。それ以外のご質問はお問い合わせフォームから承ります。", image_url: null },
        { id: genId("node"), type: "faq", parent_choice_id: actionHelp, sort_order: 1, text: "初めてのお客様からよくいただく質問", items: [
          { id: genId("faq"), question: "送料はいくらですか？", answer: "全国一律550円（税込）です。10,000円以上のご注文で送料無料になります。", sort_order: 0 },
          { id: genId("faq"), question: "届くまで何日かかりますか？", answer: "ご注文確定後、通常1〜3営業日で発送いたします。本州は翌日〜翌々日にお届け可能です。", sort_order: 1 },
          { id: genId("faq"), question: "返品はできますか？", answer: "商品到着後7日以内であれば、未使用・未開封に限り返品を承ります。不良品の場合は送料当店負担にて交換いたします。", sort_order: 2 },
          { id: genId("faq"), question: "ギフトラッピングはできますか？", answer: "はい！1件あたり330円（税込）で承っています。カート画面でオプションを追加してください。メッセージカード（無料）もお付けできます。", sort_order: 3 },
        ], resolved_label: "解決しました", resolved_next_node_id: null },
      ];
    }
    case "size_consultation": {
      const itemTop = genId("choice");
      const itemBottom = genId("choice");
      const itemShoes = genId("choice");
      const itemAccessory = genId("choice");
      // トップス体型
      const bodySlim = genId("choice");
      const bodyRegular = genId("choice");
      const bodyRelaxed = genId("choice");
      return [
        { id: genId("node"), type: "message", parent_choice_id: null, sort_order: 0, text: "こんにちは！👕\nサイズ選びのお手伝いをさせてください。\n\n「いつものサイズで大丈夫かな？」\nそんな不安を解消します！", image_url: null },
        { id: genId("node"), type: "choice", parent_choice_id: null, sort_order: 1, text: "どのアイテムのサイズが気になりますか？", choices: [
          { id: itemTop, label: "👕 トップス", icon_url: null, url: null, sort_order: 0 },
          { id: itemBottom, label: "👖 ボトムス", icon_url: null, url: null, sort_order: 1 },
          { id: itemShoes, label: "👟 シューズ", icon_url: null, url: null, sort_order: 2 },
          { id: itemAccessory, label: "⌚ アクセサリー", icon_url: null, url: null, sort_order: 3 },
        ]},
        // トップス → 着用感
        { id: genId("node"), type: "message", parent_choice_id: itemTop, sort_order: 0, text: "トップスのサイズ選びですね👕\n\n当店のトップスは一般的なサイズ感です。\n普段のお洋服はどんなフィット感がお好みですか？", image_url: null },
        { id: genId("node"), type: "choice", parent_choice_id: itemTop, sort_order: 1, text: "お好みのフィット感は？", choices: [
          { id: bodySlim, label: "ぴったりめ（タイト）", icon_url: null, url: null, sort_order: 0 },
          { id: bodyRegular, label: "ちょうどいい（レギュラー）", icon_url: null, url: null, sort_order: 1 },
          { id: bodyRelaxed, label: "ゆったりめ（リラックス）", icon_url: null, url: null, sort_order: 2 },
        ]},
        { id: genId("node"), type: "message", parent_choice_id: bodySlim, sort_order: 0, text: "ぴったりめがお好みですね！\n\n📏 おすすめ: 普段のサイズをお選びください。\n\n当店のトップスはやや余裕のある作りなので、いつものサイズでスッキリ着ていただけます。\n\n身長165cm / 体重55kgの方 → Mサイズ\n身長170cm / 体重65kgの方 → Lサイズ", image_url: null },
        { id: genId("node"), type: "message", parent_choice_id: bodyRegular, sort_order: 0, text: "レギュラーフィットですね！\n\n📏 おすすめ: 普段のサイズをお選びください。\n\n当店のサイズチャートは一般的なブランドとほぼ同じです。\n\n身長165cm / 体重55kgの方 → Mサイズ\n身長170cm / 体重65kgの方 → Lサイズ\n身長175cm / 体重75kgの方 → XLサイズ", image_url: null },
        { id: genId("node"), type: "message", parent_choice_id: bodyRelaxed, sort_order: 0, text: "ゆったりめがお好みですね！\n\n📏 おすすめ: 普段より1サイズ上をお選びください。\n\nオーバーサイズで着たい場合は2サイズ上もアリです。\n\n身長165cm / 体重55kgの方 → Lサイズ\n身長170cm / 体重65kgの方 → XLサイズ\n\n※各商品ページのモデル着用情報もご参考に！", image_url: null },
        // ボトムス
        { id: genId("node"), type: "message", parent_choice_id: itemBottom, sort_order: 0, text: "ボトムスのサイズ選びですね👖\n\n当店のボトムスはウエスト（実寸）で選んでいただくのが一番確実です。\n\n📐 測り方:\nお手持ちのボトムスを平置きにして、ウエスト部分の端から端を測り、×2してください。\n\n各商品ページのサイズ表にウエスト・ヒップ・股下の実寸を記載しています。", image_url: null },
        { id: genId("node"), type: "link", parent_choice_id: itemBottom, sort_order: 1, text: "詳しいサイズガイドはこちら", button_text: "サイズガイドを見る", url: "/pages/size-guide" },
        // シューズ
        { id: genId("node"), type: "message", parent_choice_id: itemShoes, sort_order: 0, text: "シューズのサイズ選びですね👟\n\n当店のシューズは標準的な日本サイズ（cm表記）です。\n\n📏 サイズ選びのコツ:\n・幅広の方: 0.5cm大きめがおすすめ\n・甲高の方: 0.5cm大きめがおすすめ\n・細身の方: ぴったりサイズでOK\n\n足のサイズは夕方が一番大きくなるので、午後に測ると失敗しにくいです。", image_url: null },
        { id: genId("node"), type: "message", parent_choice_id: itemShoes, sort_order: 1, text: "万が一サイズが合わなかった場合も安心です。\n\n🔄 サイズ交換は商品到着後7日以内であれば無料で承ります。\n\nお気軽にお試しください！", image_url: null },
        { id: genId("node"), type: "link", parent_choice_id: itemShoes, sort_order: 2, text: "シューズの詳しいサイズガイド", button_text: "シューズサイズガイド", url: "/pages/shoe-size-guide" },
        // アクセサリー
        { id: genId("node"), type: "message", parent_choice_id: itemAccessory, sort_order: 0, text: "アクセサリーのサイズ選びですね⌚\n\n💍 リング: 内径（mm）をご確認ください\n太めの方は0.5号大きめがおすすめ\n\n📿 ネックレス: チェーンの長さ（cm）で印象が変わります\n・40cm: 首元に沿う\n・45cm: 定番の長さ\n・50cm: 少し余裕あり\n\n⌚ ブレスレット: 手首の周囲 + 1cmが目安です", image_url: null },
        { id: genId("node"), type: "link", parent_choice_id: itemAccessory, sort_order: 1, text: "アクセサリーのサイズガイド", button_text: "サイズガイドを見る", url: "/pages/accessory-size-guide" },
      ];
    }
    default:
      return [];
  }
}

export const scenariosRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getScenariosIndex(ctx.shop!);
  }),

  fetchProducts: protectedProcedure
    .input(z.object({ count: z.number().min(1).max(10).default(3) }))
    .query(async ({ ctx, input }) => {
      const shop = ctx.shop!;
      const shopRecord = await prisma.shop.findUnique({
        where: { myshopifyDomain: shop },
      });
      if (!shopRecord) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Shop not found" });
      }
      const client = createAdminGraphqlClient({
        myshopifyDomain: shop,
        accessToken: shopRecord.accessToken,
      });
      const sdk = getProductsSdk(client);
      const result = await sdk.GetRecentProducts({ first: input.count });

      const products: ProductData[] = result.products.edges.map((edge) => ({
        id: edge.node.id,
        title: edge.node.title,
        handle: edge.node.handle,
        image_url: edge.node.featuredImage?.url || null,
        price: edge.node.variants.edges[0]?.node.price || "0",
        currency: "JPY",
      }));

      return products;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await getMetafield(ctx.shop!, NAMESPACE, input.id);
      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "シナリオが見つかりません",
        });
      }
      return scenarioSchema.parse(JSON.parse(result.value));
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        template: z.string().optional(),
        products: z.array(productDataSchema).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const shop = ctx.shop!;
      const index = await getScenariosIndex(shop);
      const id = `scenario_${Date.now().toString(36)}`;
      const now = new Date().toISOString();

      const nodes = input.template
        ? getTemplateNodes(input.template, input.products || [])
        : [];

      const maxPriority = index.scenarios.reduce((max, s) => Math.max(max, s.priority ?? 0), -1);
      const priority = maxPriority + 1;

      const scenario: Scenario = {
        id,
        name: input.name,
        description: input.description || "",
        status: "draft",
        priority,
        created_at: now,
        updated_at: now,
        nodes,
        display: { mode: "all", pages: [] },
      };

      await setMetafield(shop, NAMESPACE, id, JSON.stringify(scenario));

      index.scenarios.push({
        id,
        name: input.name,
        status: "draft",
        priority,
        updated_at: now,
      });
      await saveScenariosIndex(shop, index);

      return scenario;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        nodes: z.array(scenarioNodeSchema).optional(),
        status: z.enum(["draft", "published"]).optional(),
        priority: z.number().optional(),
        display: scenarioDisplaySchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const shop = ctx.shop!;
      const result = await getMetafield(shop, NAMESPACE, input.id);
      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "シナリオが見つかりません",
        });
      }

      const scenario = scenarioSchema.parse(JSON.parse(result.value));
      const now = new Date().toISOString();

      if (input.name !== undefined) scenario.name = input.name;
      if (input.description !== undefined)
        scenario.description = input.description;
      if (input.nodes !== undefined) scenario.nodes = input.nodes;
      if (input.status !== undefined) scenario.status = input.status;
      if (input.priority !== undefined) scenario.priority = input.priority;
      if (input.display !== undefined) scenario.display = input.display;
      scenario.updated_at = now;

      await setMetafield(shop, NAMESPACE, input.id, JSON.stringify(scenario));

      // インデックスも更新
      const index = await getScenariosIndex(shop);
      const entry = index.scenarios.find((s) => s.id === input.id);
      if (entry) {
        if (input.name !== undefined) entry.name = input.name;
        if (input.status !== undefined) entry.status = input.status;
        if (input.priority !== undefined) entry.priority = input.priority;
        entry.updated_at = now;
        await saveScenariosIndex(shop, index);
      }

      // ストアフロントデータを再コンパイル
      await updateStorefrontData(shop);

      return scenario;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const shop = ctx.shop!;

      // シナリオメタフィールドを削除
      try {
        await deleteMetafield(shop, NAMESPACE, input.id);
      } catch {
        // メタフィールドが存在しなくてもOK
      }

      // インデックスから削除
      const index = await getScenariosIndex(shop);
      index.scenarios = index.scenarios.filter((s) => s.id !== input.id);
      await saveScenariosIndex(shop, index);

      // ストアフロントデータを再コンパイル
      await updateStorefrontData(shop);

      return { success: true };
    }),

  duplicate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const shop = ctx.shop!;
      const result = await getMetafield(shop, NAMESPACE, input.id);
      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "シナリオが見つかりません",
        });
      }

      const original = scenarioSchema.parse(JSON.parse(result.value));
      const newId = `scenario_${Date.now().toString(36)}`;
      const now = new Date().toISOString();

      const index = await getScenariosIndex(shop);
      const maxPriority = index.scenarios.reduce((max, s) => Math.max(max, s.priority ?? 0), -1);

      const duplicate: Scenario = {
        ...original,
        id: newId,
        name: `${original.name} (コピー)`,
        status: "draft",
        priority: maxPriority + 1,
        created_at: now,
        updated_at: now,
      };

      await setMetafield(shop, NAMESPACE, newId, JSON.stringify(duplicate));

      index.scenarios.push({
        id: newId,
        name: duplicate.name,
        status: "draft",
        priority: maxPriority + 1,
        updated_at: now,
      });
      await saveScenariosIndex(shop, index);

      return duplicate;
    }),

  reorder: protectedProcedure
    .input(z.object({
      orderedIds: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const shop = ctx.shop!;
      const index = await getScenariosIndex(shop);

      // インデックスの優先順位を更新
      for (let i = 0; i < input.orderedIds.length; i++) {
        const entry = index.scenarios.find((s) => s.id === input.orderedIds[i]);
        if (entry) entry.priority = i;
      }
      await saveScenariosIndex(shop, index);

      // 各シナリオメタフィールドのpriorityも更新
      for (let i = 0; i < input.orderedIds.length; i++) {
        const result = await getMetafield(shop, NAMESPACE, input.orderedIds[i]);
        if (result) {
          const scenario = scenarioSchema.parse(JSON.parse(result.value));
          scenario.priority = i;
          await setMetafield(shop, NAMESPACE, input.orderedIds[i], JSON.stringify(scenario));
        }
      }

      // ストアフロントデータを再コンパイル
      await updateStorefrontData(shop);

      return { success: true };
    }),
});
