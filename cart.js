/* Sakura Sweets Café — سلة تسوق + عداد أسعار + صور المنتجات */
(() => {
  'use strict';

  const CURRENCY = 'ر.س';
  const IMG_DIR = 'images/';
  const KEY = 'sakura_cart_v1';

  const IMAGES = {
    'Sakura Cheesecake': 'sakura-cheesecake.jpg',
    'Strawberry Mochi': 'strawberry-mochi.jpg',
    'Iced Matcha Latte': 'iced-matcha-latte.jpg',
    'موتشي بالفراولة': 'strawberry-mochi.jpg',
    'دوراياكي (Dorayaki)': 'dorayaki.jpg',
    'تشيز كيك ياباني قطني': 'japanese-cheesecake.jpg',
    'دانغو (Dango)': 'dango.jpg',
    'تاياكي (Taiyaki)': 'taiyaki.jpg',
    'كعكة الماتشا': 'matcha-cake.jpg',
    'ساكورا تشيز كيك': 'sakura-cheesecake.jpg',
    'ماتشا لاتيه دافئ': 'matcha-latte.jpg',
    'آيس ماتشا لاتيه': 'iced-matcha-latte.jpg',
    'شاي الساكورا': 'sakura-tea.jpg',
    'شاي ياسمين ياباني': 'jasmine-tea.jpg',
    'شاي خوخ مثلج': 'peach-iced-tea.jpg',
    'هوت شوكليت وردي': 'pink-hot-chocolate.jpg',
    'Sakura Pancake': 'sakura-pancake.jpg',
    'Strawberry Mille Crepe': 'mille-crepe.jpg',
    'Sakura Parfait': 'sakura-parfait.jpg'
  };

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let cart = load();
  let justOrdered = false;

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) { /* ignore */ } }
  const AR = '٠١٢٣٤٥٦٧٨٩';
  const toNum = s => { const m = String(s).replace(/[٠-٩]/g, d => AR.indexOf(d)).match(/\d+(\.\d+)?/); return m ? +m[0] : 0; };
  const fmt = n => n.toLocaleString('en-US') + ' ' + CURRENCY;
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const btn = (cls, txt, label) => { const b = el('button', cls, txt); b.type = 'button'; if (label) b.setAttribute('aria-label', label); return b; };

  /* ---------- عداد الكمية (− 1 +) ---------- */
  function makeStepper(value, onChange, max = 20) {
    const wrap = el('div', 'stepper');
    const minus = btn('st-btn', '−', 'إنقاص الكمية');
    const plus = btn('st-btn', '+', 'زيادة الكمية');
    const out = el('output', 'st-val', String(value));
    let v = value;
    const set = n => { v = Math.max(1, Math.min(max, n)); out.textContent = v; onChange(v); };
    minus.onclick = () => set(v - 1);
    plus.onclick = () => set(v + 1);
    wrap.append(minus, out, plus);
    return { el: wrap, set: n => { v = n; out.textContent = n; } };
  }

  /* ---------- بناء واجهة السلة ---------- */
  const fab = btn('cart-fab', '', 'فتح سلة التسوق');
  const fabIcon = el('span', 'fab-icon', '🛍️');
  const badge = el('span', 'fab-badge', '0');
  badge.setAttribute('aria-live', 'polite');
  fab.append(fabIcon, badge);

  const overlay = el('div', 'cart-overlay');
  const drawer = el('aside', 'cart-drawer');
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-label', 'سلة التسوق');
  const head = el('div', 'cart-head');
  const closeBtn = btn('cart-close', '✕', 'إغلاق السلة');
  head.append(el('h2', null, 'سلتي 🌸'), closeBtn);
  const list = el('div', 'cart-list');
  const foot = el('div', 'cart-foot');
  const totalRow = el('div', 'total-row');
  const totalVal = el('span', 'cart-total', fmt(0));
  totalRow.append(el('span', null, 'المجموع'), totalVal);
  const checkout = btn('checkout-btn', 'إتمام الطلب 🌸');
  foot.append(totalRow, checkout, el('p', 'cart-note', '* عرض تجريبي للمشروع الأكاديمي، لا يتم أي دفع فعلي.'));
  drawer.append(head, list, foot);
  const toast = el('div', 'cart-toast');
  toast.setAttribute('role', 'status');
  document.body.append(fab, overlay, drawer, toast);

  function openCart() {
    drawer.classList.add('open'); overlay.classList.add('open');
    document.body.classList.add('cart-lock'); closeBtn.focus();
  }
  function closeCart() {
    drawer.classList.remove('open'); overlay.classList.remove('open');
    document.body.classList.remove('cart-lock'); justOrdered = false; render(); fab.focus();
  }
  fab.onclick = openCart; overlay.onclick = closeCart; closeBtn.onclick = closeCart;
  addEventListener('keydown', e => { if (e.key === 'Escape' && drawer.classList.contains('open')) closeCart(); });

  let toastTimer;
  function say(msg) {
    toast.textContent = msg; toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 1700);
  }
  function bump(node) {
    if (reduceMotion) return;
    node.classList.remove('bump'); void node.offsetWidth; node.classList.add('bump');
  }

  /* ---------- منطق السلة ---------- */
  function addItem(item, q) {
    justOrdered = false;
    const found = cart.find(c => c.id === item.id);
    if (found) found.qty = Math.min(50, found.qty + q);
    else cart.push({ id: item.id, name: item.name, sub: item.sub || '', price: item.price, emoji: item.emoji, qty: q });
    save(); render(); bump(fab); say('تمت الإضافة للسلة 🌸');
  }

  let shownTotal = 0, tween;
  function animateTotal(to) {
    cancelAnimationFrame(tween);
    if (reduceMotion || shownTotal === to) { shownTotal = to; totalVal.textContent = fmt(to); return; }
    const from = shownTotal, t0 = performance.now(), dur = 450;
    const step = t => {
      const k = Math.min(1, (t - t0) / dur);
      shownTotal = Math.round(from + (to - from) * k);
      totalVal.textContent = fmt(shownTotal);
      if (k < 1) tween = requestAnimationFrame(step);
    };
    tween = requestAnimationFrame(step);
  }

  function thumb(item) {
    const t = el('span', 'thumb', item.emoji);
    const file = IMAGES[item.name];
    if (file) { const i = el('img'); i.src = IMG_DIR + file; i.alt = ''; i.onerror = () => i.remove(); t.appendChild(i); }
    return t;
  }

  function render() {
    const count = cart.reduce((s, c) => s + c.qty, 0);
    const total = cart.reduce((s, c) => s + c.qty * c.price, 0);
    badge.textContent = count; badge.classList.toggle('show', count > 0);
    fab.setAttribute('aria-label', 'فتح سلة التسوق، ' + count + ' منتجات');
    list.textContent = '';

    if (justOrdered) {
      const done = el('div', 'cart-empty');
      done.append(el('div', 'big', '🌸'), el('p', null, 'شكراً لك! تم استلام طلبك بنجاح (عرض تجريبي).'));
      list.appendChild(done);
    } else if (!cart.length) {
      const empty = el('div', 'cart-empty');
      empty.append(el('div', 'big', '🍡'), el('p', null, 'سلتك فاضية، أضيفي حلويات لطيفة 🌸'));
      list.appendChild(empty);
    }

    cart.forEach(item => {
      const row = el('div', 'cart-row');
      const info = el('div', 'row-info');
      info.append(el('strong', null, item.name));
      if (item.sub) info.append(el('small', 'row-sub', item.sub));
      info.append(el('small', null, fmt(item.price)));
      const rowTotal = el('span', 'row-total', fmt(item.price * item.qty));
      const st = makeStepper(item.qty, v => { item.qty = v; save(); rowTotal.textContent = fmt(item.price * v); refreshTotals(); }, 50);
      const del = btn('row-del', '🗑', 'حذف ' + item.name);
      del.onclick = () => { cart = cart.filter(c => c !== item); save(); render(); };
      const side = el('div', 'row-side'); side.append(st.el, rowTotal);
      row.append(thumb(item), info, side, del);
      list.appendChild(row);
    });

    animateTotal(total);
    checkout.disabled = !cart.length;
  }
  function refreshTotals() {
    badge.textContent = cart.reduce((s, c) => s + c.qty, 0);
    animateTotal(cart.reduce((s, c) => s + c.qty * c.price, 0));
  }

  checkout.onclick = () => { if (!cart.length) return; cart = []; save(); justOrdered = true; render(); };

  /* ---------- تحسين بطاقات المنتجات ---------- */
  document.querySelectorAll('.featured-card, .menu-item-card').forEach(card => {
    const nameEl = card.querySelector('h3'), priceEl = card.querySelector('.price');
    if (!nameEl || !priceEl) return;
    const name = nameEl.textContent.trim();
    const price = toNum(priceEl.textContent);
    const box = card.querySelector('.featured-img-placeholder, .menu-img');
    const emoji = box ? box.textContent.trim() : '🌸';

    if (box && IMAGES[name]) {
      const img = el('img', 'prod-img');
      img.src = IMG_DIR + IMAGES[name]; img.alt = name; img.loading = 'lazy';
      img.onerror = () => img.remove();
      box.appendChild(img);
    }

    let qty = 1;
    const line = el('span', 'line-total', fmt(price));
    const st = makeStepper(1, v => { qty = v; line.textContent = fmt(price * v); });
    const add = btn('add-btn', '🛒 أضف للسلة');
    add.onclick = () => {
      addItem({ id: name, name, price, emoji }, qty);
      qty = 1; st.set(1); line.textContent = fmt(price); bump(add);
    };
    const actions = el('div', 'cart-actions');
    actions.append(st.el, line, add);
    (card.querySelector('.featured-body') || card).appendChild(actions);
  });

  /* ---------- صندوق البينتو ---------- */
  const bentoBtn = document.querySelector('#bento .btn-primary');
  if (bentoBtn) {
    bentoBtn.onclick = () => {
      const picks = ['mochi', 'main_sweet', 'bento_drink'].map(n => {
        const r = document.querySelector('#bento input[name="' + n + '"]:checked');
        return r ? r.parentElement.textContent.trim() : '';
      }).filter(Boolean);
      addItem({ id: 'bento:' + picks.join('|'), name: 'صندوق البينتو', sub: picks.join(' + '), price: 55, emoji: '🍱' }, 1);
    };
  }

  render();
})();