(function() {
  'use strict';

  // ===== データ読み込み =====
  var dataEl = document.getElementById('lp-guide-data');
  if (!dataEl) return;
  var storefrontData;
  try { storefrontData = JSON.parse(dataEl.textContent); } catch (e) { return; }
  var scenarios = storefrontData.scenarios || {};

  var configEl = document.getElementById('lp-guide-config');
  var config = {};
  if (configEl) {
    try { config = JSON.parse(configEl.textContent); } catch (e) {}
  }

  // シナリオ特定
  var scenario = null;
  if (config.scenario_id && scenarios[config.scenario_id]) {
    scenario = scenarios[config.scenario_id];
  } else {
    // scenario_id未設定時は最初の公開シナリオ
    var keys = Object.keys(scenarios);
    for (var i = 0; i < keys.length; i++) {
      if (scenarios[keys[i]].status === 'published') {
        scenario = scenarios[keys[i]];
        break;
      }
    }
  }
  if (!scenario) return;

  // ===== デザイン設定 =====
  var primaryColor = config.primary_color || '#4A90D9';
  var botName = config.bot_name || 'ショップアシスタント';
  var botIconUrl = config.bot_icon_url || null;
  var fontSize = config.font_size || 'medium';
  var position = config.position || 'bottom_right';
  var welcomeMsg = config.welcome_message || 'お得な情報をお届けします！';

  // ===== 状態管理 =====
  var root = document.getElementById('lp-guide-root');
  root.style.setProperty('--lp-primary', primaryColor);
  if (fontSize === 'small') root.classList.add('lp-font-small');
  if (fontSize === 'large') root.classList.add('lp-font-large');
  if (position === 'bottom_left') root.classList.add('lp-left');

  var isOpen = false;
  var messages = [];
  var pendingBlocks = [];
  var processing = false;
  var flowStage = 'blocks'; // 'blocks' | 'products' | 'form'
  var formPhase = null; // null | 'name' | 'email' | 'phone' | 'address' | 'confirm'
  var customerData = { last_name: '', first_name: '', email: '', phone: '', zip: '', prefecture: '', city: '', address1: '' };
  var selectedProducts = []; // [{variantId, quantity, title, variantTitle, price}]
  var customerForm = scenario.customer_form || { require_phone: true, require_address: true, submit_button_text: '購入手続きへ進む' };
  var scenarioProducts = scenario.products || [];
  var allowQuantity = scenario.allow_quantity || false;
  // バリアントカード一覧を展開
  var variantCards = [];
  for (var pi = 0; pi < scenarioProducts.length; pi++) {
    var sprod = scenarioProducts[pi];
    for (var vi = 0; vi < sprod.variants.length; vi++) {
      variantCards.push({
        productTitle: sprod.title,
        productId: sprod.shopify_product_id,
        imageUrl: sprod.image_url,
        variant: sprod.variants[vi],
        hasMultipleVariants: sprod.variants.length > 1,
        defaultQuantity: sprod.default_quantity || 1,
      });
    }
  }
  // バリアントごとの数量 (key = variantId) - 全て0で開始
  var variantQuantities = {};
  for (var vc = 0; vc < variantCards.length; vc++) {
    variantQuantities[variantCards[vc].variant.id] = 0;
  }

  // ===== ヘルパー =====
  function escapeHtml(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
  }

  function avatarHtml() {
    if (botIconUrl) {
      return '<div class="lp-avatar"><img src="' + escapeHtml(botIconUrl) + '" alt=""></div>';
    }
    return '<div class="lp-avatar"><svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg></div>';
  }

  function sendGaEvent(name, params) {
    if (typeof gtag === 'function') {
      gtag('event', name, params);
    }
  }

  function extractNumericId(gid) {
    if (!gid) return gid;
    var parts = gid.split('/');
    return parts[parts.length - 1];
  }

  function formatPrice(price) {
    var n = parseFloat(price);
    if (isNaN(n)) return price;
    return '¥' + n.toLocaleString();
  }

  // ===== FAB描画 =====
  function renderFab() {
    var iconContent = botIconUrl
      ? '<img class="lp-fab-icon" src="' + escapeHtml(botIconUrl) + '" alt="">'
      : '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';

    root.innerHTML =
      '<button class="lp-fab" id="lp-fab">' + iconContent + '</button>' +
      '<div class="lp-welcome" id="lp-welcome">' + escapeHtml(welcomeMsg) + '</div>';

    document.getElementById('lp-fab').addEventListener('click', function() {
      openWindow();
    });

    setTimeout(function() {
      var wel = document.getElementById('lp-welcome');
      if (wel) wel.style.display = 'none';
    }, 5000);
  }

  // ===== ウィンドウ =====
  function openWindow() {
    isOpen = true;
    sendGaEvent('lp_guide_open', { scenario_id: scenario.id, scenario_name: scenario.name, page_url: location.pathname });
    renderWindow();
    startFlow();
  }

  function closeWindow() {
    isOpen = false;
    sendGaEvent('lp_guide_close', { scenario_id: scenario.id });
    resetState();
    renderFab();
  }

  function renderWindow() {
    var headerIconHtml = botIconUrl
      ? '<img class="lp-header-icon" src="' + escapeHtml(botIconUrl) + '" alt="">'
      : '';

    root.innerHTML =
      '<button class="lp-fab" id="lp-fab"><svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="white"/></svg></button>' +
      '<div class="lp-window">' +
        '<div class="lp-header">' +
          '<div class="lp-header-left">' + headerIconHtml +
            '<span class="lp-header-name">' + escapeHtml(botName) + '</span>' +
          '</div>' +
          '<button class="lp-header-btn" id="lp-close">✕</button>' +
        '</div>' +
        '<div class="lp-messages" id="lp-messages"></div>' +
        '<div class="lp-footer">' +
          '<button class="lp-footer-btn" id="lp-restart">最初から</button>' +
        '</div>' +
      '</div>';

    document.getElementById('lp-fab').addEventListener('click', closeWindow);
    document.getElementById('lp-close').addEventListener('click', closeWindow);
    document.getElementById('lp-restart').addEventListener('click', function() {
      resetState();
      startFlow();
    });

    renderMessages();
  }

  function resetState() {
    messages = [];
    pendingBlocks = [];
    processing = false;
    flowStage = 'blocks';
    formPhase = null;
    customerData = { last_name: '', first_name: '', email: '', phone: '', zip: '', prefecture: '', city: '', address1: '' };
    selectedProducts = [];
    variantQuantities = {};
    for (var vc = 0; vc < variantCards.length; vc++) {
      variantQuantities[variantCards[vc].variant.id] = 0;
    }
  }

  // ===== フロー開始 =====
  function startFlow() {
    var blocks = (scenario.blocks || []).slice().sort(function(a, b) {
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
    pendingBlocks = blocks;
    processing = false;
    flowStage = 'blocks';
    processNextBlock();
  }

  // ===== ブロック処理 =====
  function processNextBlock() {
    if (processing || pendingBlocks.length === 0) {
      if (!processing && pendingBlocks.length === 0 && flowStage === 'blocks') {
        // ブロック完了 → 商品選択を表示
        if (scenarioProducts.length > 0) {
          processing = true;
          showBotThenContent(
            'こちらの商品からお選びください。',
            { type: 'product_selection' },
            function() {
              flowStage = 'products';
              processing = false;
              bindProductEvents();
            }
          );
        } else {
          flowStage = 'form';
          startFormFlow();
        }
      }
      return;
    }

    var block = pendingBlocks.shift();
    processing = true;

    if (block.type === 'message') {
      messages.push({ type: 'typing' });
      renderMessages();
      setTimeout(function() {
        messages = messages.filter(function(m) { return m.type !== 'typing'; });
        messages.push({ type: 'bot', text: block.text, imageUrl: block.image_url });
        processing = false;
        renderMessages();
        processNextBlock();
      }, 700 + Math.random() * 300);

    } else if (block.type === 'discount_code') {
      messages.push({ type: 'typing' });
      renderMessages();
      setTimeout(function() {
        messages = messages.filter(function(m) { return m.type !== 'typing'; });
        messages.push({ type: 'discount', label: block.label, code: block.code, description: block.description });
        processing = false;
        renderMessages();
        bindDiscountEvents();
        processNextBlock();
      }, 700 + Math.random() * 300);

    } else if (block.type === 'reviews') {
      messages.push({ type: 'typing' });
      renderMessages();
      setTimeout(function() {
        messages = messages.filter(function(m) { return m.type !== 'typing'; });
        messages.push({ type: 'reviews', heading: block.heading, items: block.items });
        processing = false;
        renderMessages();
        processNextBlock();
      }, 700 + Math.random() * 300);

    } else {
      processing = false;
      processNextBlock();
    }
  }


  // ===== ヘルパー: タイピング→botメッセージ→コンテンツを順番に表示 =====
  function showBotThenContent(botText, contentMsg, onDone) {
    messages.push({ type: 'typing' });
    renderMessages();
    setTimeout(function() {
      messages = messages.filter(function(m) { return m.type !== 'typing'; });
      messages.push({ type: 'bot', text: botText });
      renderMessages();
      if (contentMsg) {
        setTimeout(function() {
          messages.push(contentMsg);
          renderMessages();
          if (onDone) onDone();
        }, 300);
      } else {
        if (onDone) onDone();
      }
    }, 700);
  }

  // ===== フォームフロー =====
  function startFormFlow() {
    formPhase = 'name';
    showBotThenContent(
      'ご購入手続きに進みます。\nお名前を入力してください。',
      { type: 'form_input', fields: [
        { key: 'last_name', label: '姓', placeholder: '山田' },
        { key: 'first_name', label: '名', placeholder: '太郎' },
      ], phase: 'name' },
      bindFormEvents
    );
  }

  function advanceForm(phase) {
    if (phase === 'name') {
      messages.push({ type: 'user', text: customerData.last_name + ' ' + customerData.first_name });
      renderMessages();
      formPhase = 'email';
      setTimeout(function() {
        showBotThenContent(
          'メールアドレスを入力してください。',
          { type: 'form_input', fields: [
            { key: 'email', label: 'メールアドレス', placeholder: 'example@email.com', inputType: 'email' },
          ], phase: 'email' },
          bindFormEvents
        );
      }, 300);

    } else if (phase === 'email') {
      messages.push({ type: 'user', text: customerData.email });
      renderMessages();

      if (customerForm.require_phone) {
        formPhase = 'phone';
        setTimeout(function() {
          showBotThenContent(
            '電話番号を入力してください。',
            { type: 'form_input', fields: [
              { key: 'phone', label: '電話番号', placeholder: '090-1234-5678', inputType: 'tel' },
            ], phase: 'phone' },
            bindFormEvents
          );
        }, 300);
      } else if (customerForm.require_address) {
        setTimeout(goToAddressPhase, 300);
      } else {
        setTimeout(goToConfirmPhase, 300);
      }

    } else if (phase === 'phone') {
      messages.push({ type: 'user', text: customerData.phone });
      renderMessages();

      if (customerForm.require_address) {
        setTimeout(goToAddressPhase, 300);
      } else {
        setTimeout(goToConfirmPhase, 300);
      }

    } else if (phase === 'address') {
      var addrText = '〒' + customerData.zip + ' ' + customerData.prefecture + customerData.city + customerData.address1;
      messages.push({ type: 'user', text: addrText });
      renderMessages();
      setTimeout(goToConfirmPhase, 300);
    }
  }

  function goToAddressPhase() {
    formPhase = 'address';
    showBotThenContent(
      'お届け先の住所を入力してください。',
      { type: 'form_input', fields: [
        { key: 'zip', label: '郵便番号', placeholder: '100-0001' },
        { key: 'prefecture', label: '都道府県', placeholder: '東京都' },
        { key: 'city', label: '市区町村', placeholder: '千代田区' },
        { key: 'address1', label: '番地・建物名', placeholder: '1-1-1' },
      ], phase: 'address' },
      bindFormEvents
    );
  }

  function goToConfirmPhase() {
    formPhase = 'confirm';
    showBotThenContent(
      '以下の内容でよろしいですか？',
      { type: 'confirm', customerData: Object.assign({}, customerData), products: selectedProducts.slice() },
      bindConfirmEvents
    );
  }

  // ===== メッセージ描画 =====
  function renderMessages() {
    var container = document.getElementById('lp-messages');
    if (!container) return;
    var html = '';

    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];

      if (m.type === 'typing') {
        html += '<div class="lp-typing">' + avatarHtml() +
          '<div class="lp-typing-dots"><div class="lp-typing-dot"></div><div class="lp-typing-dot"></div><div class="lp-typing-dot"></div></div></div>';

      } else if (m.type === 'bot') {
        html += '<div class="lp-msg-bot">' + avatarHtml() +
          '<div class="lp-bubble-bot">' + escapeHtml(m.text);
        if (m.imageUrl) {
          html += '<img src="' + escapeHtml(m.imageUrl) + '" alt="">';
        }
        html += '</div></div>';

      } else if (m.type === 'user') {
        html += '<div class="lp-msg-user"><div class="lp-bubble-user">' + escapeHtml(m.text) + '</div></div>';

      } else if (m.type === 'discount') {
        html += '<div class="lp-discount-card">' +
          '<div class="lp-discount-label">' + escapeHtml(m.label) + '</div>' +
          '<div class="lp-discount-code-wrap">' +
            '<span class="lp-discount-code">' + escapeHtml(m.code) + '</span>' +
            '<button class="lp-copy-btn" data-code="' + escapeHtml(m.code) + '">コピー</button>' +
          '</div>' +
          '<div class="lp-discount-desc">' + escapeHtml(m.description) + '</div>' +
        '</div>';

      } else if (m.type === 'reviews') {
        html += '<div class="lp-reviews">';
        if (m.heading) {
          html += '<div class="lp-reviews-heading">' + escapeHtml(m.heading) + '</div>';
        }
        var items = (m.items || []).slice().sort(function(a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
        for (var r = 0; r < items.length; r++) {
          var stars = '';
          for (var s = 0; s < 5; s++) { stars += s < items[r].rating ? '★' : '☆'; }
          html += '<div class="lp-review-card">' +
            '<div class="lp-review-top"><span class="lp-review-name">' + escapeHtml(items[r].name) + '</span>' +
            '<span class="lp-review-stars">' + stars + '</span></div>' +
            '<div class="lp-review-comment">' + escapeHtml(items[r].comment) + '</div></div>';
        }
        html += '</div>';

      } else if (m.type === 'product_selection') {
        html += '<div class="lp-product-select">';
        var isTapMode = !allowQuantity;
        for (var p = 0; p < variantCards.length; p++) {
          var card = variantCards[p];
          var qty = variantQuantities[card.variant.id] || 0;
          var isSelected = qty > 0;
          var displayTitle = card.hasMultipleVariants
            ? card.productTitle + ' / ' + card.variant.title
            : card.productTitle;
          var cardClasses = 'lp-product-select-card';
          if (isTapMode && flowStage === 'products') cardClasses += ' lp-product-tappable';
          if (isTapMode && isSelected) cardClasses += ' lp-product-selected';
          html += '<div class="' + cardClasses + '" data-variant-id="' + escapeHtml(card.variant.id) + '">';
          html += '<div class="lp-product-select-inner">';
          if (card.imageUrl) {
            html += '<img class="lp-product-select-img" src="' + escapeHtml(card.imageUrl) + '" alt="">';
          }
          html += '<div class="lp-product-select-info">';
          if (isTapMode && isSelected) {
            html += '<div class="lp-product-select-title"><span style="color:var(--lp-primary);margin-right:4px">✓</span>' + escapeHtml(displayTitle) + '</div>';
          } else {
            html += '<div class="lp-product-select-title">' + escapeHtml(displayTitle) + '</div>';
          }
          html += '<div class="lp-product-select-price">' + formatPrice(card.variant.price) + '</div>';
          if (allowQuantity) {
            html += '<div class="lp-qty-wrap">' +
              '<button class="lp-qty-btn" data-variant-id="' + escapeHtml(card.variant.id) + '" data-dir="down">−</button>' +
              '<span class="lp-qty-val' + (qty === 0 ? ' lp-qty-zero' : '') + '">' + qty + '</span>' +
              '<button class="lp-qty-btn" data-variant-id="' + escapeHtml(card.variant.id) + '" data-dir="up">+</button></div>';
          }
          html += '</div></div></div>'; // info, inner, card
        }
        // 確定ボタン（両モード共通）
        if (flowStage === 'products') {
          var hasAny = false;
          for (var hk in variantQuantities) { if (variantQuantities[hk] > 0) { hasAny = true; break; } }
          html += '<button class="lp-product-confirm-btn' + (hasAny ? '' : ' lp-btn-disabled') + '" id="lp-product-confirm"' +
            (hasAny ? '' : ' disabled') + '>この内容で購入手続きへ</button>';
        }
        html += '</div>';

      } else if (m.type === 'form_input') {
        html += '<div class="lp-form-wrap"><div class="lp-form-group">';
        for (var f = 0; f < m.fields.length; f++) {
          var field = m.fields[f];
          html += '<div class="lp-form-label">' + escapeHtml(field.label) + '</div>' +
            '<input class="lp-form-input" data-key="' + field.key + '" data-phase="' + m.phase + '" ' +
            'type="' + (field.inputType || 'text') + '" ' +
            'placeholder="' + escapeHtml(field.placeholder || '') + '" ' +
            'value="' + escapeHtml(customerData[field.key] || '') + '">';
        }
        html += '<button class="lp-form-submit" data-phase="' + m.phase + '">次へ</button>';
        html += '</div></div>';

      } else if (m.type === 'confirm') {
        html += '<div class="lp-confirm-card">';
        html += '<div class="lp-confirm-row"><span class="lp-confirm-label">お名前</span><span class="lp-confirm-value">' +
          escapeHtml(m.customerData.last_name + ' ' + m.customerData.first_name) + '</span></div>';
        html += '<div class="lp-confirm-row"><span class="lp-confirm-label">メール</span><span class="lp-confirm-value">' +
          escapeHtml(m.customerData.email) + '</span></div>';
        if (m.customerData.phone) {
          html += '<div class="lp-confirm-row"><span class="lp-confirm-label">電話番号</span><span class="lp-confirm-value">' +
            escapeHtml(m.customerData.phone) + '</span></div>';
        }
        if (m.customerData.zip) {
          html += '<div class="lp-confirm-row"><span class="lp-confirm-label">住所</span><span class="lp-confirm-value">' +
            escapeHtml('〒' + m.customerData.zip + ' ' + m.customerData.prefecture + m.customerData.city + m.customerData.address1) + '</span></div>';
        }
        for (var cp = 0; cp < m.products.length; cp++) {
          html += '<div class="lp-confirm-row"><span class="lp-confirm-label">' + escapeHtml(m.products[cp].title) + '</span>' +
            '<span class="lp-confirm-value">' + formatPrice(m.products[cp].price) + ' × ' + m.products[cp].quantity + '</span></div>';
        }
        html += '</div>';
        html += '<button class="lp-checkout-btn" id="lp-checkout">' + escapeHtml(customerForm.submit_button_text) + '</button>';
      }
    }

    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
  }

  // ===== イベントバインド =====
  function bindDiscountEvents() {
    var btns = root.querySelectorAll('.lp-copy-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function() {
        var code = this.getAttribute('data-code');
        var btn = this;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(code).then(function() {
            btn.textContent = 'コピー済み';
            setTimeout(function() { btn.textContent = 'コピー'; }, 2000);
          });
        }
      });
    }
  }

  function confirmAndProceed(selected) {
    if (selected.length === 0) return;
    selectedProducts = selected;
    var summary = selected.map(function(sp) {
      var label = (sp.variantTitle && sp.variantTitle !== 'デフォルト' && sp.variantTitle !== 'Default Title')
        ? sp.title + ' / ' + sp.variantTitle
        : sp.title;
      return label + ' × ' + sp.quantity;
    }).join('\n');
    messages.push({ type: 'user', text: summary });
    flowStage = 'form';
    renderMessages();
    setTimeout(startFormFlow, 300);
  }

  function bindProductEvents() {
    // タップモード: カードクリックで選択/解除トグル
    if (!allowQuantity) {
      var cards = root.querySelectorAll('.lp-product-tappable');
      for (var i = 0; i < cards.length; i++) {
        cards[i].addEventListener('click', function() {
          var varId = this.getAttribute('data-variant-id');
          variantQuantities[varId] = variantQuantities[varId] ? 0 : 1;
          renderMessages();
          bindProductEvents();
        });
      }
    }

    // 数量モード: +/- ボタン
    var qtyBtns = root.querySelectorAll('.lp-qty-btn');
    for (var i = 0; i < qtyBtns.length; i++) {
      qtyBtns[i].addEventListener('click', function() {
        var variantId = this.getAttribute('data-variant-id');
        var dir = this.getAttribute('data-dir');
        var newQty = (variantQuantities[variantId] || 0) + (dir === 'up' ? 1 : -1);
        if (newQty < 0) newQty = 0;
        variantQuantities[variantId] = newQty;
        renderMessages();
        bindProductEvents();
      });
    }

    // 確定ボタン（数量モード）
    var confirmBtn = document.getElementById('lp-product-confirm');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', function() {
        var selected = [];
        for (var k = 0; k < variantCards.length; k++) {
          var card = variantCards[k];
          var q = variantQuantities[card.variant.id] || 0;
          if (q > 0) {
            selected.push({
              productId: card.productId,
              variantId: card.variant.id,
              variantTitle: card.variant.title,
              quantity: q,
              title: card.productTitle,
              price: card.variant.price,
            });
          }
        }
        confirmAndProceed(selected);
      });
    }
  }

  function bindFormEvents() {
    var inputs = root.querySelectorAll('.lp-form-input');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].addEventListener('input', function() {
        var key = this.getAttribute('data-key');
        customerData[key] = this.value;
      });
    }

    var submitBtns = root.querySelectorAll('.lp-form-submit');
    for (var i = 0; i < submitBtns.length; i++) {
      submitBtns[i].addEventListener('click', function() {
        var phase = this.getAttribute('data-phase');

        // バリデーション
        if (phase === 'name' && (!customerData.last_name.trim() || !customerData.first_name.trim())) {
          return;
        }
        if (phase === 'email' && !customerData.email.trim()) {
          return;
        }
        if (phase === 'phone' && !customerData.phone.trim()) {
          return;
        }
        if (phase === 'address' && (!customerData.zip.trim() || !customerData.prefecture.trim() || !customerData.city.trim() || !customerData.address1.trim())) {
          return;
        }

        // フォーム入力メッセージを削除（送信済みなので）
        messages = messages.filter(function(m) { return m.type !== 'form_input' || m.phase !== phase; });
        advanceForm(phase);
      });
    }
  }

  function bindConfirmEvents() {
    var btn = document.getElementById('lp-checkout');
    if (!btn) return;
    btn.addEventListener('click', function() {
      sendGaEvent('lp_guide_checkout', {
        scenario_id: scenario.id,
        products_count: selectedProducts.length,
      });

      // Checkout URL構築
      var cartItems = [];
      for (var i = 0; i < selectedProducts.length; i++) {
        var numericId = extractNumericId(selectedProducts[i].variantId);
        if (numericId) {
          cartItems.push(numericId + ':' + selectedProducts[i].quantity);
        }
      }

      if (cartItems.length === 0) return;

      var checkoutUrl = '/cart/' + cartItems.join(',');
      var params = [];
      if (customerData.email) params.push('checkout[email]=' + encodeURIComponent(customerData.email));
      if (customerData.last_name) params.push('checkout[shipping_address][last_name]=' + encodeURIComponent(customerData.last_name));
      if (customerData.first_name) params.push('checkout[shipping_address][first_name]=' + encodeURIComponent(customerData.first_name));
      if (customerData.phone) params.push('checkout[shipping_address][phone]=' + encodeURIComponent(customerData.phone));
      if (customerData.zip) params.push('checkout[shipping_address][zip]=' + encodeURIComponent(customerData.zip));
      if (customerData.prefecture) params.push('checkout[shipping_address][province]=' + encodeURIComponent(customerData.prefecture));
      if (customerData.city) params.push('checkout[shipping_address][city]=' + encodeURIComponent(customerData.city));
      if (customerData.address1) params.push('checkout[shipping_address][address1]=' + encodeURIComponent(customerData.address1));

      if (params.length > 0) {
        checkoutUrl += '?' + params.join('&');
      }

      window.location.href = checkoutUrl;
    });
  }

  // ===== 初期化 =====
  renderFab();

})();
