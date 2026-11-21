/*
 * KALYPT hoodie page: one template for all five (hoodie.html?id=pink | blue | acid | sodium | static).
 *
 * The page takes the hoodie's palette. The stage shows the hoodie sprite (or the studio photograph once
 * it exists) and turns it front to back in 16 steps. Below: the hoodie on a real person, the details,
 * the stat sheet and the other four palettes, each of which morphs into its own page.
 */
(function (root) {
  var K = root.KALYPT, PIX = root.KP_PIX, UI = root.KP_UI, MEDIA = root.KP_MEDIA;
  var $ = UI.$, $$ = UI.$$, esc = UI.esc;
  var p = K.byId[K.current];

  /* ── copy ── */
  document.title = p.name + ' hoodie · Kalypt';
  var meta = $('meta[name="description"]');
  if (meta) meta.setAttribute('content', 'The Kalypt hoodie in ' + p.name + ': ' + p.blurb);
  var F = {
    eyebrow: 'Palette ' + p.n + ' / 05 · ' + p.district, name: p.name, line: p.line, blurb: p.blurb, price: K.money(p.price),
    note: p.gsm + ' gsm. Ships with a palette-matched Hex zip charm. Drop ' + K.drop.n + ' unlocks ' + K.drop.label + '.',
    model: 'Player ' + p.n + ' is ' + p.model.cm + ' cm tall and wears size ' + p.model.size + '. The cut is meant to sit big: shoulder seam down the arm, hem at the hip.',
  };
  $$('[data-f]').forEach(function (el) { var k = el.getAttribute('data-f'); if (F[k] != null) el.textContent = F[k]; });

  $('[data-chips]').innerHTML = [[p.a, p.aName], [p.b, p.bName], [p.glow, 'piping glow']].map(function (c) {
    return '<li><i style="background:' + c[0] + '"></i><b>' + c[0] + '</b><span>' + esc(c[1]) + '</span></li>';
  }).join('');
  $('[data-stats]').innerHTML = [['Heat', p.stats.heat], ['Stealth', p.stats.stealth], ['Glow', p.stats.glow]].map(function (s) {
    var seg = '';
    for (var n = 0; n < 10; n++) seg += '<i' + (n < s[1] ? ' class="on"' : '') + '></i>';
    return '<div><dt>' + s[0] + '</dt><dd aria-label="' + s[1] + ' out of 10">' + seg + '<b>' + s[1] + '</b></dd></div>';
  }).join('');

  /* ── size and bag ── */
  $('[data-pick]').innerHTML = K.SIZES.map(function (s) {
    return '<label><input type="radio" name="size" value="' + s.id + '"' + (s.id === p.model.size ? ' checked' : '') + '><span>' + s.id + '<small>' + s.fits + '</small></span></label>';
  }).join('');
  $('[data-add]').addEventListener('click', function () {
    var size = ($('input[name="size"]:checked') || {}).value || '02';
    UI.addToBag({ id: p.id, size: size });
  });

  /* ── the stage ── */
  var hero = $('[data-hero]'), fig = $('[data-hero-fig]'), sprite = $('[data-hero-sprite]'), photo = $('[data-hero-photo]'), hexC = $('[data-hero-hex]');
  var sx = sprite.getContext('2d'), view = 'front', angle = 0, spinT = 0;
  hero.style.backgroundImage = 'url(' + PIX.glow(p, 0.3) + ')';
  sprite.width = 96; sprite.height = 108;
  hexC.width = 48; hexC.height = 51;
  hexC.getContext('2d').drawImage(PIX.hexCanvas({ walk: null, hood: 3, hands: 1, glow: true, look: [1, 0] }, p), 0, 0);
  /* page morph targets: whatever you clicked to get here lands on these */
  fig.style.viewTransitionName = 'hoodie-' + p.id;
  fig.style.viewTransitionClass = 'hoodie';
  var nameEl = $('.hp-name');
  nameEl.style.viewTransitionName = 'name-' + p.id;
  nameEl.style.viewTransitionClass = 'name';

  var hasPhoto = { front: MEDIA.ready(p.id + '-front'), back: MEDIA.ready(p.id + '-back') };
  function drawSprite() {
    var c = Math.cos((angle / 16) * Math.PI), w = Math.max(2, Math.round(Math.abs(c) * 96));
    sx.imageSmoothingEnabled = false;
    sx.clearRect(0, 0, 96, 108);
    sx.drawImage(PIX.hoodieCanvas(p, c >= 0 ? 'front' : 'back'), 0, 0, 96, 108, Math.round((96 - w) / 2), 0, w, 108);
  }
  function showView() {
    var usePhoto = hasPhoto[view];
    sprite.hidden = !!usePhoto;
    photo.hidden = !usePhoto;
    if (usePhoto && MEDIA.cut(p.id + '-' + view)) {
      /* the studio shot with its backdrop removed: the hoodie stands on the page's own pixel stage, no frame */
      photo.className = 'hp-cut';
      photo.removeAttribute('data-shot'); photo.removeAttribute('role'); photo.removeAttribute('aria-label');
      photo.style.aspectRatio = '';
      photo.innerHTML = '<img src="' + MEDIA.cutSrc(p.id + '-' + view) + '" alt="The Kalypt hoodie in ' + esc(p.name) + ', seen from the ' + view + '." decoding="async">';
    } else if (usePhoto) {
      photo.className = 'slot';
      photo.setAttribute('data-shot', p.id + '-' + view);
      MEDIA.fill(photo);
    }
    $$('[data-view]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === view)); });
  }
  function layout() {
    var st = fig.parentNode.getBoundingClientRect(), wide = root.innerWidth >= 900;
    var k = Math.max(2, Math.floor(Math.min((root.innerHeight * (wide ? 0.62 : 0.4)) / 108, (st.width * 0.86) / 96)));
    sprite.style.width = 96 * k + 'px'; sprite.style.height = 108 * k + 'px';
    photo.style.width = Math.round(108 * k * 0.8) + 'px';
    /* a cut-out is a photo, not a sprite: give it the full stage height the sprite's whole-pixel steps would waste */
    var ch = Math.round(Math.min(root.innerHeight * (wide ? 0.7 : 0.48), (st.width * 0.9) / 0.9));
    photo.style.setProperty('--cut-h', ch + 'px');
    var hk = Math.max(2, Math.round(k * 0.5));
    hexC.style.width = 48 * hk + 'px'; hexC.style.height = 51 * hk + 'px';
  }
  $$('[data-view]').forEach(function (b) {
    b.addEventListener('click', function () {
      var next = b.getAttribute('data-view');
      if (next === view) return;
      view = next;
      showView();
      /* the sprite turns in 16 steps; a photograph just swaps */
      var target = view === 'back' ? 16 : 0;
      clearInterval(spinT);
      if (UI.reduce()) { angle = target; drawSprite(); return; }
      spinT = setInterval(function () {
        angle += angle < target ? 1 : -1;
        drawSprite();
        if (angle === target) clearInterval(spinT);
      }, 34);
    });
  });
  layout(); drawSprite(); showView();
  root.addEventListener('resize', layout);

  /* ── on body, and up close ── */
  var slot = function (id, cls) { return '<figure class="slot rv' + (cls ? ' ' + cls : '') + '" data-shot="' + id + '" data-sizes="(min-width: 900px) 30vw, 46vw"></figure>'; };
  var gallery = $('[data-gallery]'), details = $('[data-details]');
  gallery.innerHTML = slot(p.id + '-fit') + slot(p.id + '-city') + slot(p.id + '-back');
  details.innerHTML = slot('macro-dither', 'slot--wide') + slot('detail-hood') + slot('detail-pocket') + slot('fit-hood') + slot('hex-charm');
  MEDIA.all(gallery); MEDIA.all(details);

  /* ── stat sheet ── */
  $('[data-specs]').innerHTML = K.SPECS.map(function (s) { return '<div><dt>' + esc(s[0]) + '</dt><dd>' + esc(s[1]) + '</dd></div>'; }).join('');
  $('[data-size-table]').innerHTML = '<thead><tr><th scope="col">Size</th><th scope="col">Fits</th><th scope="col">Chest</th><th scope="col">Length</th><th scope="col">Sleeve</th></tr></thead><tbody>' +
    K.SIZES.map(function (s) { return '<tr><th scope="row">' + s.id + '</th><td>' + s.fits + '</td><td>' + s.chest + ' cm</td><td>' + s.length + ' cm</td><td>' + s.sleeve + ' cm</td></tr>'; }).join('') + '</tbody>';

  /* ── the other four ── */
  var others = $('[data-others]');
  K.PALETTES.filter(function (o) { return o.id !== p.id; }).forEach(function (o) {
    var a = document.createElement('a');
    a.className = 'other rv';
    a.href = 'hoodie.html?id=' + o.id;
    a.setAttribute('data-morph', o.id);
    a.style.setProperty('--c', o.ui);
    a.style.backgroundColor = o.bg;
    a.style.backgroundImage = 'url(' + PIX.glow(o, 0.5) + ')';
    a.innerHTML = '<span data-morph-part="hoodie"></span><span class="other__name" data-morph-part="name">' + esc(o.name) + '</span><span class="other__sub">' + esc(o.district) + ' · ' + K.money(o.price) + '</span>';
    var c = document.createElement('canvas');
    c.width = 96; c.height = 108;
    c.getContext('2d').drawImage(PIX.hoodieCanvas(o, 'front'), 0, 0);
    a.firstChild.appendChild(c);
    /* pointing at another palette previews it on the whole page */
    a.addEventListener('mouseenter', function () { UI.setPalette(o.id); });
    a.addEventListener('mouseleave', function () { UI.setPalette(p.id); });
    others.appendChild(a);
  });
  UI.watch(document);
})(window);
