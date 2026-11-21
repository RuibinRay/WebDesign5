/*
 * KALYPT store: every product in one grid, like a game's item shop.
 *
 *   Category tabs   Everything · Hoodies · Tees · Jackets · Pants · Accessories
 *   Wear it in      All, or one palette: hoodies narrow to that palette, every other item recolours to it,
 *                   and the page (nav logo included) takes the palette too. Kept in the URL (?pal=, ?cat=).
 *   Sort            drop order, price, rarity
 *
 * Each card shows the cut-out photo where one exists in that palette, otherwise the pixel sprite.
 * Rarity is a joke with a rule: Legendary from $200, Rare from $100, otherwise Common.
 */
(function (root) {
  var K = root.KALYPT, UI = root.KP_UI, PIX = root.KP_PIX, MEDIA = root.KP_MEDIA;
  var $ = UI.$, esc = UI.esc;
  var params = new URLSearchParams(location.search);
  var cat = K.CATS.some(function (c) { return c[0] === params.get('cat'); }) ? params.get('cat') : 'all';
  var pal = K.byId[params.get('pal')] ? params.get('pal') : 'all';
  var sort = 'drop';
  var rarity = function (pr) { return pr.price >= 200 ? ['legendary', 'Legendary'] : pr.price >= 100 ? ['rare', 'Rare'] : ['common', 'Common']; };
  var rank = { legendary: 0, rare: 1, common: 2 };

  /* counts in the hero: 5 hoodies + 8 items × 5 palettes */
  $('[data-stat="pieces"]').textContent = K.PRODUCTS.length;
  $('[data-stat="combos"]').textContent = K.PALETTES.length + K.ITEMS.length * K.PALETTES.length;

  /* controls */
  $('[data-cats]').innerHTML = K.CATS.map(function (c) {
    return '<button type="button" class="shop-chip" data-cat="' + c[0] + '" aria-pressed="false">' + esc(c[1]) + '</button>';
  }).join('');
  $('[data-pals]').innerHTML = '<span class="shop-pals__label">Wear it in</span>' +
    '<button type="button" class="shop-sw shop-sw--all" data-pal="all" aria-pressed="false" aria-label="All palettes"><i></i></button>' +
    K.PALETTES.map(function (p) {
      return '<button type="button" class="shop-sw" data-pal="' + p.id + '" aria-pressed="false" aria-label="' + esc(p.name) + '" title="' + esc(p.name) + '" style="--a:' + p.a + ';--b:' + p.b + ';--c:' + p.ui + '"><i></i></button>';
    }).join('');

  function art(pr, p) {
    if (pr.kind === 'hoodie' && MEDIA.cut(pr.id + '-front')) return '<img src="' + MEDIA.cutSrc(pr.id + '-front') + '" alt="" decoding="async" loading="lazy">';
    var shot = pr.kind === 'item' ? MEDIA.itemShot(K.itemById[pr.id], p.id) : null;
    if (shot && MEDIA.cut(shot)) return '<img src="' + MEDIA.cutSrc(shot) + '" alt="" decoding="async" loading="lazy">';
    /* a photo without a clean cut-out fills the card on its own studio backdrop */
    if (shot && MEDIA.ready(shot)) return '<img class="card__photo" src="assets/img/' + shot + '-sm.webp" alt="" decoding="async" loading="lazy">';
    var src = pr.kind === 'hoodie' ? PIX.hoodieCanvas(p, 'front') : PIX.itemCanvas(K.itemById[pr.id], p);
    var c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    c.getContext('2d').drawImage(src, 0, 0);
    return '<img class="px" src="' + c.toDataURL() + '" alt="">';
  }

  function render() {
    var list = K.PRODUCTS.filter(function (pr) {
      if (cat !== 'all' && pr.cat !== cat) return false;
      if (pal !== 'all' && pr.kind === 'hoodie' && pr.pal !== pal) return false;
      return true;
    });
    list = list.map(function (pr, i) { return { pr: pr, i: i }; });
    if (sort === 'low') list.sort(function (a, b) { return a.pr.price - b.pr.price || a.i - b.i; });
    if (sort === 'high') list.sort(function (a, b) { return b.pr.price - a.pr.price || a.i - b.i; });
    if (sort === 'rare') list.sort(function (a, b) { return rank[rarity(a.pr)[0]] - rank[rarity(b.pr)[0]] || b.pr.price - a.pr.price; });

    $('[data-grid]').innerHTML = list.map(function (o, n) {
      var pr = o.pr, p = K.byId[pal !== 'all' && pr.kind === 'item' ? pal : pr.pal], r = rarity(pr);
      var href = pr.kind === 'hoodie' ? pr.href : pr.href + '&pal=' + p.id;
      var sub = pr.kind === 'hoodie' ? 'Hoodie · ' + p.district.split(' · ')[1] : (K.itemById[pr.id].cat === 'outer' ? 'Jacket' : catName(pr.cat)) + ' · ' + p.name;
      return '<a class="card card--' + r[0] + ' rv" href="' + esc(href) + '" data-morph="' + pr.id + '" style="--c:' + p.ui + ';--a:' + p.a + ';--b:' + p.b + ';--bg:' + p.bg + ';--bg2:' + p.bg2 + ';--glow:' + p.glow + ';transition-delay:' + Math.min(n, 8) * 40 + 'ms">' +
        '<span class="card__stage"><span class="card__rar">' + r[1] + '</span>' +
        (pr.kind === 'item' && pal === 'all' ? '<span class="card__new">New</span>' : '') +
        '<span class="card__art" data-morph-part="hoodie">' + art(pr, p) + '</span></span>' +
        '<span class="card__body"><span class="card__name" data-morph-part="name">' + esc(pr.name) + '</span>' +
        '<span class="card__sub">' + esc(sub) + '</span>' +
        '<span class="card__foot"><b class="card__price">' + K.money(pr.price) + '</b>' +
        (pr.kind === 'item' ? '<span class="card__dots" aria-label="Comes in eight palettes">' + K.PALETTES.map(function (q) { return '<i style="background:' + q.ui + '"></i>'; }).join('') + '</span>' : '') +
        '</span></span></a>';
    }).join('');
    $('[data-count]').textContent = list.length + (list.length === 1 ? ' piece' : ' pieces') + (pal !== 'all' ? ' in ' + K.byId[pal].name : '');
    UI.watch($('[data-grid]'));

    UI.$$('[data-cat]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-cat') === cat)); });
    UI.$$('[data-pal]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-pal') === pal)); });
    UI.setPalette(pal === 'all' ? 'pink' : pal);
    var q = new URLSearchParams();
    if (cat !== 'all') q.set('cat', cat);
    if (pal !== 'all') q.set('pal', pal);
    var s = q.toString();
    if (history.replaceState) history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + (/[?&]sync\b/.test(location.search) && !s.includes('sync') ? (s ? '&' : '?') + 'sync' : ''));
  }
  function catName(c) { return { tops: 'Tee', outer: 'Jacket', bottoms: 'Pants', accessories: 'Accessory' }[c] || c; }

  $('[data-cats]').addEventListener('click', function (e) { var b = e.target.closest('[data-cat]'); if (b) { cat = b.getAttribute('data-cat'); render(); } });
  $('[data-pals]').addEventListener('click', function (e) {
    var b = e.target.closest('[data-pal]');
    if (!b) return;
    pal = b.getAttribute('data-pal');
    if (root.KP_FX) { var r = b.getBoundingClientRect(); root.KP_FX.burst(r.left + r.width / 2, r.top + r.height / 2); }
    render();
  });
  $('[data-sort]').addEventListener('change', function (e) { sort = e.target.value; render(); });

  render();
})(window);
