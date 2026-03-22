(function() {
  'use strict';

  // ===== データ読み込み =====
  var dataEl = document.getElementById('chat-guide-data');
  if (!dataEl) return;

  var storefrontData;
  try {
    storefrontData = JSON.parse(dataEl.textContent);
  } catch (e) {
    console.error('Chat Guide: データのパースに失敗しました', e);
    return;
  }

  var scenarios = storefrontData.scenarios;
  if (!scenarios) return;

  // デザイン設定（テーマエディタのブロック設定から読み込み）
  var design = {};
  var designEl = document.getElementById('chat-guide-design');
  if (designEl) {
    try { design = JSON.parse(designEl.textContent); } catch (e) {}
  }

  // ===== URL マッチング =====
  var currentPath = window.location.pathname;

  function matchesPage(page) {
    if (!page) return false;
    // 完全一致またはprefix一致（末尾に*がある場合）
    if (page.endsWith('*')) {
      return currentPath.indexOf(page.slice(0, -1)) === 0;
    }
    return currentPath === page;
  }

  function scenarioMatchesPage(sc) {
    var display = sc.display || { mode: 'all', pages: [] };
    var pages = display.pages || [];
    switch (display.mode) {
      case 'all': return true;
      case 'specific_only':
        for (var i = 0; i < pages.length; i++) {
          if (matchesPage(pages[i])) return true;
        }
        return false;
      case 'specific_exclude':
        for (var j = 0; j < pages.length; j++) {
          if (matchesPage(pages[j])) return false;
        }
        return true;
      default: return true;
    }
  }

  // シナリオを決定: 優先順位順にソートし、表示設定にマッチするものを探す
  var scenario = null;
  var scenarioList = Object.keys(scenarios).map(function(k) { return scenarios[k]; });
  scenarioList.sort(function(a, b) { return (a.priority || 0) - (b.priority || 0); });

  // まずspecific_onlyで一致するものを探す（最も具体的）
  for (var i = 0; i < scenarioList.length; i++) {
    if (scenarioList[i].display && scenarioList[i].display.mode === 'specific_only' && scenarioMatchesPage(scenarioList[i])) {
      scenario = scenarioList[i];
      break;
    }
  }
  // なければspecific_excludeで一致するものを探す
  if (!scenario) {
    for (var j = 0; j < scenarioList.length; j++) {
      if (scenarioList[j].display && scenarioList[j].display.mode === 'specific_exclude' && scenarioMatchesPage(scenarioList[j])) {
        scenario = scenarioList[j];
        break;
      }
    }
  }
  // なければallのものを使う
  if (!scenario) {
    for (var k = 0; k < scenarioList.length; k++) {
      if (!scenarioList[k].display || scenarioList[k].display.mode === 'all') {
        scenario = scenarioList[k];
        break;
      }
    }
  }
  // それでもなければ最初のシナリオをフォールバック
  if (!scenario && scenarioList.length > 0) {
    scenario = scenarioList[0];
  }
  if (!scenario) return;

  // ===== 設定 =====
  var primaryColor = design.primary_color || '#4A90D9';
  var botName = design.bot_name || 'ショップアシスタント';
  var botIconUrl = design.bot_icon_url || null;
  var fontSize = design.font_size || 'medium';
  var position = design.position || 'bottom_right';
  var welcomeMsg = design.welcome_message || 'お買い物でお困りですか？';

  // ===== GA イベント送信 =====
  var depth = 0;
  var lastNodeId = null;

  function sendGA(eventName, params) {
    if (typeof gtag === 'function') {
      gtag('event', eventName, params);
    }
  }

  // ===== DOM 構築 =====
  var root = document.getElementById('chat-guide-root');
  if (!root) return;

  root.style.setProperty('--cg-primary', primaryColor);
  if (position === 'bottom_left') root.classList.add('cg-left');
  if (fontSize === 'small') root.classList.add('cg-font-small');
  if (fontSize === 'large') root.classList.add('cg-font-large');

  var isOpen = false;
  var messages = [];
  var pendingNodes = [];
  var processing = false;
  var faqViewedCount = 0;
  var history = []; // 「ひとつ前にもどる」用の履歴スタック

  // ボットアバターHTML
  function avatarHTML() {
    if (botIconUrl) {
      return '<div class="cg-avatar"><img src="' + escapeHtml(botIconUrl) + '" alt=""></div>';
    }
    return '<div class="cg-avatar"><svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg></div>';
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // FAB ボタン
  function renderFab() {
    var html = '<button class="cg-fab" id="cg-fab-btn">';
    if (botIconUrl) {
      html += '<img class="cg-fab-icon" src="' + escapeHtml(botIconUrl) + '" alt="">';
    } else {
      html += '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
    }
    html += '</button>';
    html += '<div class="cg-welcome" id="cg-welcome">' + escapeHtml(welcomeMsg) + '</div>';
    root.innerHTML = html;

    document.getElementById('cg-fab-btn').addEventListener('click', function() {
      openChat();
    });

    // ウェルカムメッセージを数秒後に非表示
    setTimeout(function() {
      var wel = document.getElementById('cg-welcome');
      if (wel) wel.style.display = 'none';
    }, 5000);
  }

  // チャットウィンドウ
  function openChat() {
    isOpen = true;
    var wel = document.getElementById('cg-welcome');
    if (wel) wel.style.display = 'none';

    sendGA('chat_guide_open', {
      scenario_id: scenario.id,
      scenario_name: scenario.name,
      page_url: currentPath
    });

    renderWindow();
    startScenario();
  }

  function closeChat() {
    sendGA('chat_guide_close', {
      scenario_id: scenario.id,
      last_node_id: lastNodeId,
      depth: depth
    });
    isOpen = false;
    messages = [];
    pendingNodes = [];
    processing = false;
    depth = 0;
    lastNodeId = null;
    faqViewedCount = 0;
    history = [];
    renderFab();
  }

  function renderWindow() {
    var html = '<div class="cg-window">';
    // ヘッダー
    html += '<div class="cg-header">';
    html += '<div class="cg-header-left">';
    if (botIconUrl) {
      html += '<img class="cg-header-icon" src="' + escapeHtml(botIconUrl) + '" alt="">';
    }
    html += '<span class="cg-header-name">' + escapeHtml(botName) + '</span>';
    html += '</div>';
    html += '<div class="cg-header-actions">';
    html += '<button class="cg-header-btn" id="cg-restart-btn">最初から</button>';
    html += '<button class="cg-header-btn" id="cg-close-btn">✕</button>';
    html += '</div></div>';
    // メッセージエリア
    html += '<div class="cg-messages" id="cg-messages"></div>';
    // フッター（戻る・最初から）
    html += '<div class="cg-footer" id="cg-footer">';
    html += '<button class="cg-footer-btn" id="cg-back-btn" disabled>← ひとつ前にもどる</button>';
    html += '<button class="cg-footer-btn" id="cg-footer-restart-btn">最初にもどる</button>';
    html += '</div>';
    html += '</div>';
    // FAB
    html += '<button class="cg-fab" id="cg-fab-btn" style="display:none;">';
    html += '</button>';

    root.innerHTML = html;

    document.getElementById('cg-close-btn').addEventListener('click', closeChat);
    document.getElementById('cg-restart-btn').addEventListener('click', restartChat);
    document.getElementById('cg-back-btn').addEventListener('click', goBack);
    document.getElementById('cg-footer-restart-btn').addEventListener('click', restartChat);

    renderMessages();
  }

  function startScenario() {
    var rootNodes = scenario.nodes
      .filter(function(n) { return n.parent_choice_id === null; })
      .sort(function(a, b) { return a.sort_order - b.sort_order; });
    pendingNodes = rootNodes;
    processNextNode();
  }

  function restartChat() {
    messages = [];
    pendingNodes = [];
    processing = false;
    depth = 0;
    lastNodeId = null;
    faqViewedCount = 0;
    history = [];
    updateBackButton();
    renderMessages();
    startScenario();
  }

  // ===== 戻るボタン =====
  function saveState() {
    history.push({
      messages: JSON.parse(JSON.stringify(messages)),
      pendingNodes: pendingNodes.slice(),
      depth: depth,
      lastNodeId: lastNodeId,
      faqViewedCount: faqViewedCount
    });
    updateBackButton();
  }

  function goBack() {
    if (history.length === 0) return;
    var state = history.pop();
    messages = state.messages;
    pendingNodes = state.pendingNodes;
    depth = state.depth;
    lastNodeId = state.lastNodeId;
    faqViewedCount = state.faqViewedCount;
    processing = false;
    updateBackButton();
    renderMessages();
  }

  function updateBackButton() {
    var btn = document.getElementById('cg-back-btn');
    if (btn) {
      btn.disabled = history.length === 0;
    }
  }

  // ===== ノード処理 =====
  function processNextNode() {
    if (processing || pendingNodes.length === 0) return;

    var node = pendingNodes.shift();
    processing = true;
    lastNodeId = node.id;

    if (node.type === 'message') {
      addTyping();
      setTimeout(function() {
        removeTyping();
        messages.push({ type: 'bot', text: node.text, imageUrl: node.image_url });
        renderMessages();
        processing = false;
        processNextNode();
      }, 700 + Math.random() * 300);

    } else if (node.type === 'choice') {
      addTyping();
      setTimeout(function() {
        removeTyping();
        messages.push({ type: 'bot', text: node.text });
        messages.push({ type: 'choices', choices: node.choices, nodeId: node.id });
        renderMessages();
        processing = false;
        // 選択待ち - processNextNodeは呼ばない
      }, 700 + Math.random() * 300);

    } else if (node.type === 'product_card') {
      messages.push({
        type: 'products',
        products: node.products || [],
        afterActions: node.after_actions,
        nodeId: node.id
      });
      renderMessages();
      processing = false;
      // after_actionsがある場合はユーザーの操作待ち、ない場合はフロー終了（自動進行しない）

    } else if (node.type === 'link') {
      addTyping();
      setTimeout(function() {
        removeTyping();
        messages.push({ type: 'bot', text: node.text });
        messages.push({
          type: 'link',
          buttonText: node.button_text,
          url: node.url,
          nodeId: node.id
        });
        renderMessages();
        processing = false;
        // リンク表示後はフロー終了（自動進行しない）
      }, 700 + Math.random() * 300);

    } else if (node.type === 'faq') {
      addTyping();
      faqViewedCount = 0;
      setTimeout(function() {
        removeTyping();
        messages.push({ type: 'bot', text: node.text });
        messages.push({ type: 'faq', faqNode: node });
        renderMessages();
        processing = false;
        // FAQ操作待ち
      }, 700 + Math.random() * 300);

    } else {
      processing = false;
      processNextNode();
    }
  }

  function addTyping() {
    messages.push({ type: 'typing' });
    renderMessages();
  }

  function removeTyping() {
    messages = messages.filter(function(m) { return m.type !== 'typing'; });
  }

  // ===== 選択肢クリック =====
  function handleChoice(choiceId, choiceLabel, nodeId, choiceUrl) {
    saveState();
    depth++;
    sendGA('chat_guide_choice', {
      scenario_id: scenario.id,
      node_id: nodeId,
      choice_id: choiceId,
      choice_label: choiceLabel,
      depth: depth
    });

    // 選択肢を消してユーザーメッセージを追加
    messages = messages.filter(function(m) { return m.type !== 'choices'; });
    messages.push({ type: 'user', text: choiceLabel });
    renderMessages();

    // URLが設定されている場合はページ遷移
    if (choiceUrl) {
      sendGA('chat_guide_choice_link', {
        scenario_id: scenario.id,
        choice_id: choiceId,
        choice_label: choiceLabel,
        url: choiceUrl
      });
      window.open(choiceUrl, '_blank');
      return;
    }

    // 子ノードを取得
    var children = scenario.nodes
      .filter(function(n) { return n.parent_choice_id === choiceId; })
      .sort(function(a, b) { return a.sort_order - b.sort_order; });
    pendingNodes = children;
    processNextNode();
  }

  // ===== 商品クリック =====
  function handleProductClick(productId, productTitle) {
    sendGA('chat_guide_product_click', {
      scenario_id: scenario.id,
      product_id: productId,
      product_title: productTitle
    });
  }

  // ===== アフターアクション =====
  function handleAfterAction(targetNodeId, label) {
    saveState();
    messages.push({ type: 'user', text: label });

    if (targetNodeId === '__restart__') {
      restartChat();
      return;
    }

    var target = scenario.nodes.find(function(n) { return n.id === targetNodeId; });
    if (target) {
      var siblings = scenario.nodes
        .filter(function(n) { return n.parent_choice_id === target.parent_choice_id; })
        .sort(function(a, b) { return a.sort_order - b.sort_order; });
      var idx = siblings.findIndex(function(n) { return n.id === targetNodeId; });
      pendingNodes = siblings.slice(idx);
    }
    renderMessages();
    processNextNode();
  }

  // ===== リンククリック =====
  function handleLinkClick(url, nodeId) {
    sendGA('chat_guide_link_click', {
      scenario_id: scenario.id,
      node_id: nodeId,
      url: url
    });
  }

  // ===== FAQ =====
  function handleFaqClick(faqId, question, answer, nodeId) {
    saveState();
    faqViewedCount++;
    sendGA('chat_guide_faq_click', {
      scenario_id: scenario.id,
      node_id: nodeId,
      faq_id: faqId,
      faq_question: question
    });

    messages.push({ type: 'user', text: question });
    renderMessages();

    setTimeout(function() {
      messages.push({ type: 'bot', text: answer });
      renderMessages();
    }, 500);
  }


  // ===== メッセージ描画 =====
  function renderMessages() {
    var container = document.getElementById('cg-messages');
    if (!container) return;

    var html = '';
    for (var i = 0; i < messages.length; i++) {
      var msg = messages[i];

      if (msg.type === 'typing') {
        html += '<div class="cg-typing">' + avatarHTML();
        html += '<div class="cg-typing-dots">';
        html += '<span class="cg-typing-dot"></span>';
        html += '<span class="cg-typing-dot"></span>';
        html += '<span class="cg-typing-dot"></span>';
        html += '</div></div>';

      } else if (msg.type === 'bot') {
        html += '<div class="cg-msg-bot">' + avatarHTML();
        html += '<div>';
        html += '<div class="cg-bubble-bot">' + escapeHtml(msg.text);
        if (msg.imageUrl) {
          html += '<img src="' + escapeHtml(msg.imageUrl) + '" alt="">';
        }
        html += '</div></div></div>';

      } else if (msg.type === 'user') {
        html += '<div class="cg-msg-user">';
        html += '<div class="cg-bubble-user">' + escapeHtml(msg.text) + '</div>';
        html += '</div>';

      } else if (msg.type === 'choices') {
        html += '<div class="cg-choices">';
        for (var j = 0; j < msg.choices.length; j++) {
          var c = msg.choices[j];
          html += '<button class="cg-choice-btn" data-choice-id="' + escapeHtml(c.id) +
            '" data-choice-label="' + escapeHtml(c.label) +
            '" data-choice-url="' + escapeHtml(c.url || '') +
            '" data-node-id="' + escapeHtml(msg.nodeId) + '">' +
            (c.url ? '🔗 ' : '') + escapeHtml(c.label) + '</button>';
        }
        html += '</div>';

      } else if (msg.type === 'products') {
        html += '<div class="cg-products">';
        var prods = msg.products || [];
        for (var k = 0; k < prods.length; k++) {
          var p = prods[k];
          var prodUrl = '/products/' + encodeURIComponent(p.handle);
          html += '<a class="cg-product-card" href="' + prodUrl + '" target="_blank"' +
            ' data-product-id="' + escapeHtml(p.id) + '"' +
            ' data-product-title="' + escapeHtml(p.title) + '">';
          if (p.image_url) {
            html += '<img class="cg-product-img" src="' + escapeHtml(p.image_url) + '" alt="' + escapeHtml(p.title) + '">';
          }
          html += '<div class="cg-product-info">';
          html += '<div class="cg-product-title">' + escapeHtml(p.title) + '</div>';
          html += '<div class="cg-product-price">¥' + Number(p.price).toLocaleString() + '</div>';
          html += '</div></a>';
        }
        html += '</div>';

        if (msg.afterActions && msg.afterActions.length > 0) {
          html += '<div class="cg-choices">';
          for (var l = 0; l < msg.afterActions.length; l++) {
            var action = msg.afterActions[l];
            html += '<button class="cg-choice-btn" data-action-target="' +
              escapeHtml(action.target_node_id) + '" data-action-label="' +
              escapeHtml(action.label) + '">' + escapeHtml(action.label) + '</button>';
          }
          html += '</div>';
        }

      } else if (msg.type === 'link') {
        html += '<a class="cg-link-btn" href="' + escapeHtml(msg.url) +
          '" data-link-node="' + escapeHtml(msg.nodeId) +
          '" data-link-url="' + escapeHtml(msg.url) + '">' +
          escapeHtml(msg.buttonText) + '</a>';

      } else if (msg.type === 'faq') {
        html += '<div class="cg-faq-btns">';
        var items = msg.faqNode.items || [];
        for (var m = 0; m < items.length; m++) {
          var item = items[m];
          html += '<button class="cg-faq-btn" data-faq-id="' + escapeHtml(item.id) +
            '" data-faq-q="' + escapeHtml(item.question) +
            '" data-faq-a="' + escapeHtml(item.answer) +
            '" data-faq-node="' + escapeHtml(msg.faqNode.id) + '">' +
            escapeHtml(item.question) + '</button>';
        }
        html += '</div>';
      }
    }

    container.innerHTML = html;

    // イベントバインド
    bindEvents(container);

    // 自動スクロール
    container.scrollTop = container.scrollHeight;
  }

  function bindEvents(container) {
    // 選択肢
    var choiceBtns = container.querySelectorAll('.cg-choice-btn[data-choice-id]');
    for (var i = 0; i < choiceBtns.length; i++) {
      choiceBtns[i].addEventListener('click', function() {
        handleChoice(
          this.getAttribute('data-choice-id'),
          this.getAttribute('data-choice-label'),
          this.getAttribute('data-node-id'),
          this.getAttribute('data-choice-url') || null
        );
      });
    }

    // アフターアクション
    var actionBtns = container.querySelectorAll('.cg-choice-btn[data-action-target]');
    for (var j = 0; j < actionBtns.length; j++) {
      actionBtns[j].addEventListener('click', function() {
        handleAfterAction(
          this.getAttribute('data-action-target'),
          this.getAttribute('data-action-label')
        );
      });
    }

    // 商品カード
    var productCards = container.querySelectorAll('.cg-product-card');
    for (var k = 0; k < productCards.length; k++) {
      productCards[k].addEventListener('click', function() {
        handleProductClick(
          this.getAttribute('data-product-id'),
          this.getAttribute('data-product-title')
        );
      });
    }

    // リンク
    var linkBtns = container.querySelectorAll('.cg-link-btn');
    for (var l = 0; l < linkBtns.length; l++) {
      linkBtns[l].addEventListener('click', function() {
        handleLinkClick(
          this.getAttribute('data-link-url'),
          this.getAttribute('data-link-node')
        );
      });
    }

    // FAQ質問
    var faqBtns = container.querySelectorAll('.cg-faq-btn');
    for (var m = 0; m < faqBtns.length; m++) {
      faqBtns[m].addEventListener('click', function() {
        handleFaqClick(
          this.getAttribute('data-faq-id'),
          this.getAttribute('data-faq-q'),
          this.getAttribute('data-faq-a'),
          this.getAttribute('data-faq-node')
        );
      });
    }

  }

  // ===== 初期化 =====
  renderFab();

})();
