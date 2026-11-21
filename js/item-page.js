/*
 * KALYPT item page: one template for the eight pieces beyond the hoodie (item.html?id=tee&pal=blue).
 *
 * Pick a palette and the piece recolours (pixel sprite, or the photo in its own palette once made),
 * the page and the nav logo follow, and the URL keeps the choice. The copy says where Hex sits on it.
 */
(function (root) {
  var K = root.KALYPT, PIX = root.KP_PIX, UI = root.KP_UI, MEDIA = root.KP_MEDIA;
  var $ = UI.$, $$ = UI.$$, esc = UI.esc;
  var params = new URLSearchParams(location.search);
  var it = K.itemById[params.get('id')] || K.ITEMS[0];
  var pal = K.byId[params.get('pal')] || K.byId[it.pal];
  var pr = K.productById[it.id];

  /* ── copy ── */
  var catLabel = { tops: 'Tee', outer: 'Jacket', bottoms: 'Pants', accessories: 'Accessory' }[it.cat];
  function copy() {
    document.title = it.name + ' in ' + pal.name + ' · Kalypt';
    var F = {
      eyebrow: catLabel + ' · ' + pal.name, name: it.name, line: it.line, price: K.money(it.price), 'pal-name': pal.name,
      'logo-note': 'Where Hex goes: ' + it.placement,
      note: 'Every Kalypt piece comes in all eight palettes. Drop ' + K.drop.n + ' unlocks ' + K.drop.label + '.',
      'worn-note': 'Shown in ' + K.byId[it.pal].name + ', worn with plain black so the piece does the talking. ' + it.placement,
    };
    $$('[data-f]').forEach(function (el) { var k = el.getAttribute('data-f'); if (F[k] != null) el.textContent = F[k]; });
  }
  $('[data-specs]').innerHTML = [['The logo', it.placement], ['The fade', it.fade], ['Made from', it.fabric]].map(function (s) {
    return '<div><dt>' + s[0] + '</dt><dd>' + esc(s[1]) + '</dd></div>';
  }).join('');

  /* ── palette and size pickers ── */
  $('[data-pal-pick]').innerHTML = K.PALETTES.map(function (p) {
    return '<label><input type="radio" name="pal" value="' + p.id + '"' + (p.id === pal.id ? ' checked' : '') + '>' +
      '<span class="ip-sw" style="--a:' + p.a + ';--b:' + p.b + ';--c:' + p.ui + '"><i></i><small>' + esc(p.name) + '</small></span></label>';
  }).join('');
  $('[data-pick]').innerHTML = it.sizes.map(function (s, i) {
    return '<label><input type="radio" name="size" value="' + s + '"' + (i === (it.sizes.length > 2 ? 1 : 0) ? ' checked' : '') + '><span>' + (s === 'One size' ? 'OS<small>One size</small>' : s) + '</span></label>';
  }).join('');

  /* ── the stage ── */
  var hero = $('[data-hero]'), fig = $('[data-hero-fig]'), sprite = $('[data-hero-sprite]'), photo = $('[data-hero-photo]');
  var sx = sprite.getContext('2d');
  sprite.width = 96; sprite.height = 108;
  fig.style.viewTransitionName = 'hoodie-' + it.id;
  fig.style.viewTransitionClass = 'hoodie';
  var nameEl = $('.hp-name');
  nameEl.style.viewTransitionName = 'name-' + it.id;
  nameEl.style.viewTransitionClass = 'name';

  function layout() {
    var st = fig.parentNode.getBoundingClientRect(), wide = root.innerWidth >= 900;
    var k = Math.max(2, Math.floor(Math.min((root.innerHeight * (wide ? 0.62 : 0.42)) / 108, (st.width * 0.86) / 96)));
    sprite.style.width = 96 * k + 'px'; sprite.style.height = 108 * k + 'px';
    photo.style.setProperty('--cut-h', Math.round(Math.min(root.innerHeight * (wide ? 0.7 : 0.46), st.width)) + 'px');
  }
  function show(animate) {
    copy();
    hero.style.backgroundImage = 'url(' + PIX.glow(pal, 0.3) + ')';
    var shot = MEDIA.itemShot(it, pal.id);
    var cut = MEDIA.cut(shot), framed = !cut && MEDIA.ready(shot);
    var usePhoto = cut || framed;
    sprite.hidden = !!usePhoto;
    photo.hidden = !usePhoto;
    if (cut) { photo.className = 'hp-cut'; photo.removeAttribute('data-shot'); photo.style.aspectRatio = ''; photo.innerHTML = '<img src="' + MEDIA.cutSrc(shot) + '" alt="The ' + esc(it.name) + ' in ' + esc(pal.name) + '." decoding="async">'; }
    /* no clean cut-out: the studio photo, framed like the other photos on the site */
    else if (framed) { photo.className = 'slot ip-photo'; photo.setAttribute('data-shot', shot); MEDIA.fill(photo); }
    else {
      sx.imageSmoothingEnabled = false;
      sx.clearRect(0, 0, 96, 108);
      sx.drawImage(PIX.itemCanvas(it, pal), 0, 0);
      if (animate && !UI.reduce()) { sprite.classList.remove('ip-swap'); void sprite.offsetWidth; sprite.classList.add('ip-swap'); }
    }
    UI.setPalette(pal.id);
    $$('input[name="pal"]').forEach(function (r) { r.checked = r.value === pal.id; });
  }
  $('[data-pal-pick]').addEventListener('change', function (e) {
    if (e.target.name !== 'pal') return;
    pal = K.byId[e.target.value];
    show(true);
    var q = new URLSearchParams(location.search);
    q.set('pal', pal.id);
    if (history.replaceState) history.replaceState(null, '', location.pathname + '?' + q.toString());
  });

  /* ── bag ── */
  $('[data-add]').addEventListener('click', function () {
    var size = ($('input[name="size"]:checked') || {}).value || it.sizes[0];
    UI.addToBag({ id: it.id, size: size, pal: pal.id });
  });

  /* ── the rest of the set, in this palette ── */
  var others = $('[data-others]');
  K.ITEMS.filter(function (o) { return o.id !== it.id; }).slice(0, 4).forEach(function (o) {
    var a = document.createElement('a');
    a.className = 'other rv';
    a.href = 'item.html?id=' + o.id + '&pal=' + pal.id;
    a.setAttribute('data-morph', o.id);
    a.style.setProperty('--c', pal.ui);
    a.style.backgroundColor = pal.bg;
    a.style.backgroundImage = 'url(' + PIX.glow(pal, 0.5) + ')';
    a.innerHTML = '<span data-morph-part="hoodie"></span><span class="other__name" data-morph-part="name">' + esc(o.name) + '</span><span class="other__sub">' + K.money(o.price) + '</span>';
    var c = document.createElement('canvas');
    c.width = 96; c.height = 108;
    c.getContext('2d').drawImage(PIX.itemCanvas(o, pal), 0, 0);
    a.firstChild.appendChild(c);
    others.appendChild(a);
  });

  /* the worn photo is in the piece's own palette, whatever palette is picked above */
  var worn = $('[data-worn]');
  worn.setAttribute('data-shot', 'item-' + it.id + '-worn');
  MEDIA.fill(worn);

  layout(); show(false);
  root.addEventListener('resize', layout);
  UI.watch(document);
})(window);
