/*
 * KALYPT: the bag, as a game inventory drawer.
 *
 * Opens from the nav's Bag button and after "Add to inventory". Lines are grouped by hoodie and size, with
 * the cut-out photo (or the sprite) in an item slot, a size picker, a quantity stepper and remove.
 * Kept in this browser only (localStorage 'kalypt.bag', a list of { id, size }); there is no checkout,
 * because the drop and the prices are concept values. Esc, the close button or the backdrop close it,
 * and focus returns to whatever opened it.
 */
(function (root) {
  var K = root.KALYPT, UI = root.KP_UI, PIX = root.KP_PIX, MEDIA = root.KP_MEDIA;
  var esc = UI.esc, KEY = 'kalypt.bag', MAXQ = 9;
  var read = function () { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
  var write = function (list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} UI.paintBag(true); };

  var el = document.createElement('div');
  el.className = 'bagd';
  el.hidden = true;
  el.innerHTML =
    '<div class="bagd__veil" data-bag-close></div>' +
    '<aside class="bagd__panel" role="dialog" aria-modal="true" aria-labelledby="bagd-title" tabindex="-1">' +
    '<header class="bagd__head"><span class="bagd__badge" data-badge aria-hidden="true"></span>' +
    '<div><p class="label">Player 1</p><h2 id="bagd-title">Inventory</h2></div>' +
    '<button class="bagd__x" type="button" data-bag-close aria-label="Close inventory">✕</button></header>' +
    '<ol class="bagd__list" data-bag-list></ol>' +
    '<div class="bagd__empty" data-bag-empty><canvas width="48" height="51" data-bag-hex></canvas><p>Inventory empty.</p><a class="btn btn--sm" href="index.html#swap" data-bag-close-link>Pick a palette</a></div>' +
    '<footer class="bagd__foot" data-bag-foot>' +
    '<dl class="bagd__sum"><div><dt>Items</dt><dd data-bag-n>0</dd></div><div><dt>Total</dt><dd data-bag-total>$0</dd></div></dl>' +
    '<button class="btn bagd__go" type="button" disabled>Checkout locked</button>' +
    '<p class="note">Drop ' + K.drop.n + ' unlocks ' + K.drop.label + '. Kept in this browser only: a concept site, nothing is sold or sent.</p>' +
    '</footer></aside>';
  document.body.appendChild(el);
  var panel = el.querySelector('.bagd__panel'), listEl = el.querySelector('[data-bag-list]');
  var hexC = el.querySelector('[data-bag-hex]');
  /* a fresh copy of the badge in the drawer: common.js painted the ones that existed when it ran */
  var badgeEl = el.querySelector('.bagd__badge');
  var paintBadge = function (p) { badgeEl.innerHTML = PIX.badge(p, { label: false }); };
  paintBadge(UI.palette());
  UI.onPalette(paintBadge);

  /* group the stored list into lines: one per product, palette and size */
  var palOf = function (it) { var pr = K.productById[it.id]; return it.pal || (pr && pr.pal); };
  var same = function (it, l) { return it.id === l.id && it.size === l.size && palOf(it) === l.pal; };
  function lines() {
    var map = {}, out = [];
    read().forEach(function (it) {
      if (!K.productById[it.id]) return;
      var pal = palOf(it), k = it.id + '/' + pal + '/' + it.size;
      if (!map[k]) { map[k] = { id: it.id, pal: pal, size: it.size, q: 0 }; out.push(map[k]); }
      map[k].q++;
    });
    return out;
  }
  function setLine(l, q, newSize) {
    var list = read().filter(function (it) { return !same(it, l); });
    for (var i = 0; i < q; i++) list.push({ id: l.id, size: newSize || l.size, pal: l.pal });
    write(list);
    render();
  }
  var sizesOf = function (pr) {
    if (pr.kind === 'hoodie') return K.SIZES.map(function (s) { return [s.id, 'Size ' + s.id + ' · ' + s.fits]; });
    return K.itemById[pr.id].sizes.map(function (s) { return [s, s === 'One size' ? s : 'Size ' + s]; });
  };

  function thumb(pr, pal) {
    if (pr.kind === 'hoodie' && MEDIA.cut(pr.id + '-front')) return '<img src="assets/img/' + pr.id + '-front-cut-sm.webp" alt="" decoding="async">';
    if (pr.kind === 'item' && pal.id === pr.pal && MEDIA.cut('item-' + pr.id)) return '<img src="assets/img/item-' + pr.id + '-cut-sm.webp" alt="" decoding="async">';
    var c = document.createElement('canvas');
    c.width = 96; c.height = 108;
    c.getContext('2d').drawImage(pr.kind === 'hoodie' ? PIX.hoodieCanvas(pal, 'front') : PIX.itemCanvas(K.itemById[pr.id], pal), 0, 0);
    return '<img src="' + c.toDataURL() + '" alt="" class="px">';
  }
  function render() {
    var ls = lines(), n = 0, total = 0;
    listEl.innerHTML = ls.map(function (l, i) {
      var pr = K.productById[l.id], p = K.byId[l.pal] || K.byId[pr.pal];
      n += l.q; total += l.q * pr.price;
      var href = pr.kind === 'hoodie' ? pr.href : pr.href + '&pal=' + p.id;
      return '<li class="bagd__item" style="--c:' + p.ui + ';--bg:' + p.bg + ';--bg2:' + p.bg2 + '" data-line="' + i + '">' +
        '<a class="bagd__slot" href="' + href + '" aria-label="View the ' + esc(pr.name) + '">' + thumb(pr, p) + '</a>' +
        '<div class="bagd__info"><p class="bagd__name">' + esc(pr.name) + '</p>' +
        '<p class="bagd__meta">' + esc(pr.kind === 'hoodie' ? p.district.split(' · ')[1] : p.name) + ' · ' + K.money(pr.price) + '</p>' +
        '<div class="bagd__ctl">' +
        '<label class="bagd__size"><span class="vh">Size for ' + esc(pr.name) + '</span><select data-size>' +
        sizesOf(pr).map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === l.size ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') +
        '</select></label>' +
        '<span class="bagd__q" role="group" aria-label="Quantity of ' + esc(pr.name) + '">' +
        '<button type="button" data-q="-1" aria-label="One fewer"' + (l.q <= 1 ? ' disabled' : '') + '>−</button>' +
        '<b aria-live="polite">' + l.q + '</b>' +
        '<button type="button" data-q="1" aria-label="One more"' + (l.q >= MAXQ ? ' disabled' : '') + '>+</button></span>' +
        '<button class="bagd__rm" type="button" data-rm>Drop</button>' +
        '</div></div>' +
        '<p class="bagd__line">' + K.money(l.q * pr.price) + '</p></li>';
    }).join('');
    el.querySelector('[data-bag-n]').textContent = n;
    el.querySelector('[data-bag-total]').textContent = K.money(total);
    var empty = !ls.length;
    el.querySelector('[data-bag-empty]').hidden = !empty;
    el.querySelector('[data-bag-foot]').hidden = empty;
    if (empty) {
      var x = hexC.getContext('2d');
      x.clearRect(0, 0, 48, 51);
      x.drawImage(PIX.hexCanvas({ walk: null, hood: 3, hands: 1, glow: true, look: [0, 0] }, UI.palette()), 0, 0);
    }
    return ls;
  }

  listEl.addEventListener('click', function (e) {
    var li = e.target.closest('[data-line]');
    if (!li) return;
    var l = lines()[+li.getAttribute('data-line')];
    if (!l) return;
    var q = e.target.closest('[data-q]');
    if (q) { setLine(l, Math.max(1, Math.min(MAXQ, l.q + +q.getAttribute('data-q')))); focusLine(l, q.getAttribute('data-q')); return; }
    if (e.target.closest('[data-rm]')) {
      setLine(l, 0);
      UI.toast(K.productById[l.id].name + ' dropped.');
      var first = listEl.querySelector('button, select') || panel;
      first.focus();
    }
  });
  listEl.addEventListener('change', function (e) {
    var sel = e.target.closest('[data-size]');
    if (!sel) return;
    var l = lines()[+sel.closest('[data-line]').getAttribute('data-line')];
    if (!l || sel.value === l.size) return;
    /* moving to a size that is already a line merges the two */
    var list = read().map(function (it) { return same(it, l) ? { id: it.id, size: sel.value, pal: l.pal } : it; });
    write(list);
    render();
  });
  function focusLine(l, dir) {
    var ls = lines();
    for (var i = 0; i < ls.length; i++) if (ls[i].id === l.id && ls[i].size === l.size && ls[i].pal === l.pal) {
      var b = listEl.querySelector('[data-line="' + i + '"] [data-q="' + dir + '"]');
      if (b && !b.disabled) b.focus(); else if (b) b.parentNode.querySelector('button:not([disabled])').focus();
    }
  }

  var opener = null;
  function open(from) {
    opener = from || document.activeElement;
    render();
    el.hidden = false;
    void el.offsetWidth;
    el.classList.add('is-open');
    document.documentElement.classList.add('bag-open');
    panel.focus();
  }
  function close() {
    el.classList.remove('is-open');
    document.documentElement.classList.remove('bag-open');
    setTimeout(function () { if (!el.classList.contains('is-open')) el.hidden = true; }, UI.reduce() ? 0 : 260);
    if (opener && opener.focus) opener.focus();
  }
  el.addEventListener('click', function (e) {
    if (e.target.closest('[data-bag-close]')) close();
    if (e.target.closest('[data-bag-close-link]')) close();
  });
  document.addEventListener('keydown', function (e) {
    if (el.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    /* keep focus inside the drawer */
    var f = [].slice.call(panel.querySelectorAll('a[href], button:not([disabled]), select, [tabindex="0"]')).filter(function (x) { return x.offsetParent !== null; });
    if (!f.length) return;
    var a = f[0], z = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === a || document.activeElement === panel)) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  });

  /* the nav's Bag button opens it (replacing the old toast) */
  UI.$$('[data-bag]').forEach(function (b) {
    b.setAttribute('aria-haspopup', 'dialog');
    b.addEventListener('click', function (e) { e.stopImmediatePropagation(); open(b); }, true);
  });
  /* anything added opens it, with a burst of pixels from the nav */
  root.addEventListener('kalypt:bag-add', function () {
    var b = document.querySelector('[data-bag]');
    if (root.KP_FX && b) { var r = b.getBoundingClientRect(); root.KP_FX.burst(r.left + r.width / 2, r.top + r.height / 2); }
    open(document.activeElement);
  });

  root.KP_BAG = { open: open, close: close, lines: lines };
})(window);
