/*
 * KALYPT home page. Scrolling is the controller:
 *
 *   title    the opening film (rooftop to street). With no film yet, the pixel city does the descent itself.
 *   run      LEVEL 01. Scroll position picks one of 132 frames; each frame is a pose of Hex, drawn in code.
 *            He walks the street and equips the hoodie one feature at a time.
 *   swap     LEVEL 02. Scroll slides one hoodie out and the next in; the page, the stage and Hex swap palette with it.
 *   cut      LEVEL 03. The turn film (front to back). With no film yet, the hoodie sprite spins.
 *   then     the stat sheet, the five street looks, the film strip of every Hex frame, the drop queue.
 */
(function (root) {
  var K = root.KALYPT, PIX = root.KP_PIX, UI = root.KP_UI, FILM = root.KP_FILM, MEDIA = root.KP_MEDIA;
  var $ = UI.$, $$ = UI.$$, clamp = UI.clamp, smooth = UI.smooth, esc = UI.esc;
  var city = new PIX.City(11), tick = 0;
  var pad3 = function (n) { return ('00' + n).slice(-3); };

  /* a low-resolution canvas scaled up by a whole number, so every pixel on screen is the same size */
  function Scene(canvas) {
    var stage = canvas.parentNode, S = { W: 0, H: 0, scale: 1, ctx: canvas.getContext('2d') };
    S.size = function () {
      var r = stage.getBoundingClientRect();
      var sc = Math.max(2, Math.floor(Math.min(r.width / 110, r.height / 110)));
      /* upright phones: bigger pixels, so Hex and the street fill the screen instead of a band at the bottom */
      if (r.height > r.width * 1.3) sc = Math.max(2, Math.floor(r.width / 92));
      var W = Math.ceil(r.width / sc), H = Math.ceil(r.height / sc);
      if (W !== canvas.width || H !== canvas.height) { canvas.width = W; canvas.height = H; }
      canvas.style.width = W * sc + 'px'; canvas.style.height = H * sc + 'px';
      S.W = W; S.H = H; S.scale = sc;
      S.ctx.imageSmoothingEnabled = false;
    };
    S.size();
    return S;
  }
  var hexX = function (W) { return clamp(Math.round(W * 0.2), 4, Math.max(4, W - 100)); };

  /* ═════════ TITLE: the opening film ═════════ */
  var titleSec = $('#title'), tScene = Scene($('[data-scene="title"]')), tMedia = $('.film__media', titleSec);
  var tQ = 0, tTier = 'board', titleOn = true;
  function drawTitle() {
    var W = tScene.W, H = tScene.H, ctx = tScene.ctx;
    var camY = tTier === 'board' ? 150 * (1 - smooth(0.04, 0.9, tQ)) : 0;
    city.draw(ctx, W, H, { camX: 0, camY: camY, tick: tick, pal: K.byId.pink, rain: 0.25 });
    /* Player 1 walks in from the left as the camera lands; he is standing where level 01 starts */
    var t = clamp((tQ - 0.84) / 0.16, 0, 1);
    if (t > 0) {
      var steps = Math.round(t * 16), x = Math.round(-48 + (hexX(W) + 48) * (steps / 16));
      ctx.drawImage(PIX.hexCanvas({ walk: steps & 7, hoodie: 0 }, K.WILD), x, H - PIX.City.ROAD + 2 - PIX.HEX.foot + Math.round(camY));
    }
  }
  FILM.create(titleSec, {
    mosaic: function (q) { var t = clamp((q - 0.84) / 0.14, 0, 1), max = tScene.scale * Math.min(root.devicePixelRatio || 1, 2); return 1 + (max - 1) * t * t; },
    onPaint: function (q, tier) {
      tQ = q; tTier = tier;
      if (tier !== 'board') tMedia.style.opacity = (1 - smooth(0.94, 1, q)).toFixed(3);
      if (titleOn) drawTitle();
    },
  });

  /* ═════════ LEVEL 01: Hex, frame by frame ═════════ */
  var runSec = $('#run'), rScene = Scene($('[data-scene="run"]')), RUN = K.RUN, N = RUN.frames;
  var F = -1, runOn = false, runMid = false;
  var WALK = [[0, 11], [28, 39], [48, 59], [72, 83], [92, 99], [120, 127]];
  var isWalk = function (f) { return WALK.some(function (r) { return f >= r[0] && f <= r[1]; }); };
  var walked = [];
  (function () { var n = 0; for (var f = 0; f <= N; f++) { walked[f] = n; if (isWalk(f)) n++; } })();
  var TONGUE = [0.34, 0.67, 1, 0.67, 0.34, 0];

  /* the script: what is true on frame f */
  function state(f) {
    var pink = K.byId.pink, T;
    var s = { pose: { walk: isWalk(f) ? walked[f] & 7 : null, hoodie: 0, hood: 0, hands: 0, glow: false, look: [1, 1], blink: 0 },
      pal: K.WILD, rain: 0.25, tongue: 0, item: null, alert: false, car: null, flash: false };
    /* 1 · the cut: spot it, tongue it, wear it */
    if (f >= 12 && f <= 13) s.alert = true;
    if (f >= 12 && f <= 15) s.item = { kind: 'item', t: 1 };
    if (f >= 14 && f <= 19) { T = TONGUE[f - 14]; s.tongue = T; s.pose.look = [1, 0]; if (f >= 16 && f < 19) s.item = { kind: 'item', t: T }; }
    if (f >= 20) { s.pal = pink; s.pose.hoodie = clamp((f - 19) / 8, 0, 1); s.flash = f === 20; }
    /* 2 · it starts to pour: the hood goes up */
    if (f >= 36) s.rain = 0.25 + 0.75 * clamp((f - 36) / 6, 0, 1);
    if (f >= 40 && f <= 41) s.pose.look = [0, 0];
    if (f >= 42) s.pose.hood = f >= 46 ? 3 : f >= 44 ? 2 : 1;
    /* 3 · a coin: into the pocket, hands after it */
    if (f >= 60 && f <= 61) s.alert = true;
    if (f >= 60 && f <= 63) s.item = { kind: 'coin', t: 1 };
    if (f >= 62 && f <= 67) { T = TONGUE[f - 62]; s.tongue = T; s.pose.look = [1, 0]; if (f >= 64 && f < 67) s.item = { kind: 'coin', t: T }; }
    if (f === 68) s.pose.hands = 0.5;
    if (f >= 69) s.pose.hands = 1;
    /* 4 · headlights: the piping answers */
    if (f >= 84 && f <= 90) s.car = (f - 84) / 6;
    if (f >= 85) s.pose.glow = f !== 86;
    /* 5 · palette swap: four frames each */
    if (f >= 100 && f <= 119) { s.pal = K.PALETTES[Math.floor((f - 100) / 4)]; s.flash = (f - 100) % 4 === 0; s.pose.look = [f & 2 ? 1 : 0, 1]; }
    /* 6 · a wink on the way out */
    if (f === 129 || f === 130) s.pose.blink = 2;
    return s;
  }

  function drawRun() {
    var W = rScene.W, H = rScene.H, ctx = rScene.ctx, f = Math.max(0, F), s = state(f);
    var cp = s.pal === K.WILD ? K.byId.pink : s.pal;
    city.draw(ctx, W, H, { camX: walked[f] * 2, camY: 0, tick: tick, pal: cp, rain: s.rain });
    var gy = H - PIX.City.ROAD, hx = hexX(W), hy = gy + 2 - PIX.HEX.foot;
    var hc = PIX.hexCanvas(s.pose, s.pal, { flash: s.flash });
    var mx = hx + hc.mouth[0], my = hy + hc.mouth[1], reach = Math.max(14, Math.min(38, W - mx - 12)), ix = mx + reach, iy = my - 8;
    ctx.drawImage(hc, hx, hy);
    if (s.tongue > 0) {
      var tx = mx + (ix - mx) * s.tongue, ty = my + (iy - my) * s.tongue, n = Math.max(1, Math.round(tx - mx));
      ctx.fillStyle = '#FF4D7E';
      for (var i = 0; i <= n; i++) ctx.fillRect(Math.round(mx + ((tx - mx) * i) / n), Math.round(my + ((ty - my) * i) / n), 1, 2);
      ctx.fillStyle = '#FF9BBB'; ctx.fillRect(Math.round(tx) - 1, Math.round(ty) - 1, 3, 3);
    }
    if (s.item) {
      var px = mx + (ix - mx) * s.item.t, py = my + (iy - my) * s.item.t + (s.item.t === 1 && !s.tongue ? (tick >> 2) & 1 : 0);
      if (s.item.kind === 'item') PIX.drawMap(ctx, 'item', Math.round(px) - 5, Math.round(py) - 4, { o: '#0B0616', a: K.byId.pink.a, b: K.byId.pink.b });
      else PIX.drawMap(ctx, 'coin', Math.round(px) - 3, Math.round(py) - 3, { o: '#140A04', y: '#FFD23F', w: '#FFF6C2' });
    }
    if (s.alert) PIX.drawMap(ctx, 'alert', hx + 31, hy - 7, { o: '#07060D', g: '#FFD23F' });
    if (s.car != null) {
      var cx = Math.round(W + 12 - s.car * (W + 70)), cy = H - 12;
      ctx.fillStyle = 'rgba(255,250,214,0.42)';
      for (var dx = 1; dx < 54; dx++) { var half = 1 + dx * 0.24; for (var dy = -Math.floor(half); dy <= half; dy++) if (PIX.dither(cx - dx, cy + 5 + dy, 0.55 - dx / 130)) ctx.fillRect(cx - dx, cy + 5 + dy, 1, 1); }
      PIX.drawMap(ctx, 'car', cx, cy, { o: '#05040B', c: '#2A2260', w: '#1E8FA8', a: cp.ui, h: '#FFFBD6', r: '#FF3B5C', k: '#15121F' });
    }
  }

  /* the card and the HUD */
  var cardEl = $('[data-card]'), cTag = $('[data-card-tag]'), cTitle = $('[data-card-title]'), cText = $('[data-card-text]');
  var frameEl = $('[data-frame]'), pipsEl = $('[data-pips]'), cardIdx = -1, typed = -1;
  pipsEl.innerHTML = RUN.pips.map(function (p) { return '<li data-pip="' + p.key + '"><i></i>' + esc(p.label) + '</li>'; }).join('');
  var pips = $$('li', pipsEl);
  $('[data-run-list]').innerHTML = RUN.cards.map(function (c) { return '<li><b>' + esc(c.title) + '.</b> ' + esc(c.text) + '</li>'; }).join('');
  function hud() {
    var f = Math.max(0, F), idx = 0;
    RUN.cards.forEach(function (c, i) { if (f >= c.at) idx = i; });
    var card = RUN.cards[idx], next = RUN.cards[idx + 1] ? RUN.cards[idx + 1].at : N;
    if (idx !== cardIdx) {
      cardIdx = idx; typed = -1;
      cTag.textContent = card.tag; cTitle.textContent = card.title;
      cardEl.classList.remove('pop'); void cardEl.offsetWidth; cardEl.classList.add('pop');
    }
    /* the text types itself out as you scroll through the first frames of each card */
    var n = UI.reduce() ? card.text.length : Math.ceil(card.text.length * clamp((f - card.at + 1) / Math.min(9, next - card.at), 0, 1));
    if (n !== typed) { typed = n; cText.textContent = card.text.slice(0, n); cText.classList.toggle('is-typing', n < card.text.length); }
    frameEl.textContent = pad3(f + 1);
    RUN.pips.forEach(function (p, i) { pips[i].classList.toggle('is-on', f >= p.at); });
  }

  /* ═════════ LEVEL 02: palette swap ═════════ */
  var swapSec = $('#swap'), track = $('[data-swap-track]'), bgs = $('[data-swap-bgs]'), info = $('[data-swap-info]');
  var P = K.PALETTES, N2 = P.length, cur = -1, sf = 0, swapMid = false, items = [], bgEls = [], k = 4;
  var sName = $('[data-swap-name]'), sN = $('[data-swap-n]'), sDistrict = $('[data-swap-district]'), sBlurb = $('[data-swap-blurb]');
  var sChips = $('[data-swap-chips]'), sStats = $('[data-swap-stats]'), sPrice = $('[data-swap-price]'), sLink = $('[data-swap-link]');
  var dotsEl = $('[data-swap-dots]'), sHex = $('[data-swap-hex]'), sHexCtx = sHex.getContext('2d'), tmp = document.createElement('canvas'), tctx = tmp.getContext('2d');
  sHex.width = 48; sHex.height = 51;

  var glowURL = PIX.glow;
  P.forEach(function (p, i) {
    var bg = document.createElement('div');
    bg.className = 'swap__bg';
    bg.style.backgroundColor = p.bg; bg.style.backgroundImage = 'url(' + glowURL(p) + ')';
    bgs.appendChild(bg); bgEls.push(bg);
    var fig = document.createElement('figure'), c = document.createElement('canvas');
    fig.className = 'swap__item';
    fig.setAttribute('data-morph-for', p.id); fig.setAttribute('data-morph-part', 'hoodie');
    fig.appendChild(c); track.appendChild(fig);
    var it = { p: p, fig: fig, c: c, ctx: c.getContext('2d'), m: -1, src: PIX.hoodieCanvas(p, 'front'), photo: null };
    items.push(it);
    /* the photo is fetched only when the slide comes within two screens (swapPhotos below); the sprite shows until then */
    if (MEDIA.ready(p.id + '-front')) it.want = 'assets/img/' + p.id + '-front-sm.webp';
    var li = document.createElement('li'), b = document.createElement('button');
    b.type = 'button'; b.setAttribute('aria-label', p.name); b.style.setProperty('--c', p.ui);
    b.addEventListener('click', function () { go(i); });
    li.appendChild(b); dotsEl.appendChild(li);
  });
  var dots = $$('button', dotsEl);

  var photosAsked = false;
  function swapPhotos() {
    if (photosAsked) return;
    photosAsked = true;
    items.forEach(function (it) {
      if (!it.want) return;
      var im = new Image();
      im.onload = function () { it.photo = im; it.m = -1; it.fig.classList.add('is-photo'); layout(); paintSwap(true); };
      im.src = it.want;
    });
  }
  function layout() {
    var r = track.getBoundingClientRect();
    k = Math.max(1, Math.floor(Math.min(r.height / 108, (r.width * 0.92) / 96)));
    items.forEach(function (it) {
      var w = it.photo ? Math.round(108 * k * 0.8) : 96 * k, h = 108 * k;
      it.fig.style.width = w + 'px'; it.fig.style.height = h + 'px';
      it.m = -1;
    });
    var hk = Math.max(2, Math.round(k * 0.55));
    sHex.style.width = 48 * hk + 'px'; sHex.style.height = 51 * hk + 'px';
  }
  var MOS = [1, 1, 2, 3, 4, 6, 8];
  function drawItem(it, m) {
    var c = it.c, x = it.ctx, w, h, tw, th;
    if (it.photo) {
      w = Math.round(108 * k * 0.8); h = 108 * k;
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      var im = it.photo, s = Math.max(w / im.naturalWidth, h / im.naturalHeight), iw = im.naturalWidth * s, ih = im.naturalHeight * s;
      var block = m === 1 ? 1 : Math.max(2, Math.round((m * k) / 2));
      if (block === 1) { x.imageSmoothingEnabled = true; x.drawImage(im, (w - iw) / 2, (h - ih) / 2, iw, ih); }
      else {
        tw = Math.ceil(w / block); th = Math.ceil(h / block); tmp.width = tw; tmp.height = th;
        tctx.drawImage(im, (w - iw) / 2 / block, (h - ih) / 2 / block, iw / block, ih / block);
        x.imageSmoothingEnabled = false; x.drawImage(tmp, 0, 0, tw, th, 0, 0, tw * block, th * block);
      }
    } else {
      if (c.width !== 96) { c.width = 96; c.height = 108; }
      x.imageSmoothingEnabled = false;
      x.clearRect(0, 0, 96, 108);
      if (m === 1) x.drawImage(it.src, 0, 0);
      else {
        tw = Math.ceil(96 / m); th = Math.ceil(108 / m); tmp.width = tw; tmp.height = th;
        tctx.imageSmoothingEnabled = false; tctx.clearRect(0, 0, tw, th);
        tctx.drawImage(it.src, 0, 0, 96, 108, 0, 0, tw, th);
        x.drawImage(tmp, 0, 0, tw, th, 0, 0, tw * m, th * m);
      }
    }
    it.m = m;
  }

  var GLITCH = '█▓▒░#/\\_<>';
  function scramble(text, amt, seed) {
    if (amt <= 0 || UI.reduce()) return text;
    var out = '';
    for (var j = 0; j < text.length; j++) out += text[j] !== ' ' && PIX.hash(j * 7 + 1, seed) < amt ? GLITCH[(PIX.hash(j, seed + 3) * GLITCH.length) | 0] : text[j];
    return out;
  }
  function showInfo(i) {
    var p = P[i];
    cur = i;
    sN.textContent = p.n; sDistrict.textContent = p.district; sBlurb.textContent = p.blurb;
    sPrice.textContent = K.money(p.price);
    sLink.href = 'hoodie.html?id=' + p.id;
    sLink.setAttribute('aria-label', 'View the ' + p.name + ' hoodie');
    info.setAttribute('data-morph', p.id);
    sName.setAttribute('aria-label', p.name);
    sChips.innerHTML = [[p.a, p.aName], [p.b, p.bName], [p.glow, 'piping glow']].map(function (c) {
      return '<li><i style="background:' + c[0] + '"></i><b>' + c[0] + '</b><span>' + esc(c[1]) + '</span></li>';
    }).join('');
    sStats.innerHTML = [['Heat', p.stats.heat], ['Stealth', p.stats.stealth], ['Glow', p.stats.glow]].map(function (s) {
      var seg = '';
      for (var n = 0; n < 10; n++) seg += '<i' + (n < s[1] ? ' class="on"' : '') + '></i>';
      return '<div><dt>' + s[0] + '</dt><dd aria-label="' + s[1] + ' out of 10">' + seg + '<b>' + s[1] + '</b></dd></div>';
    }).join('');
    dots.forEach(function (b, n) { b.setAttribute('aria-current', String(n === i)); });
      }
  var lastName = '', lastHexKey = '';
  function paintSwap(force) {
    /* a hoodie leaves across the whole stage, behind the info panel, so the next one arrives from off screen */
    var stepX = swapSec.clientWidth;
    items.forEach(function (it, i) {
      var d = i - sf, a = Math.abs(d);
      if (a > 0.995) { it.fig.style.visibility = 'hidden'; return; }
      it.fig.style.visibility = 'visible';
      var x = Math.round((d * stepX) / k) * k;
      it.fig.style.transform = 'translate(-50%,-50%) translate3d(' + x + 'px,0,0)';
      var m = UI.reduce() ? 1 : MOS[Math.min(6, Math.round(Math.min(0.5, a) * 12))];
      if (m !== it.m || force) drawItem(it, m);
    });
    bgEls.forEach(function (bg, i) {
      if (!i) return;
      var rv = Math.round(clamp(sf - (i - 1), 0, 1) * 16) / 16;
      bg.style.clipPath = 'inset(0 0 0 ' + (100 - rv * 100) + '%)';
    });
    var i = clamp(Math.round(sf), 0, N2 - 1), settle = 1 - Math.abs(sf - Math.round(sf)) * 2;
    if (i !== cur) showInfo(i);
    var name = scramble(P[i].name, (1 - settle) * 1.1, Math.floor(sf * 48));
    if (name !== lastName) { lastName = name; sName.textContent = name; }
    var flash = settle < 0.55 && !UI.reduce(), key = P[i].id + flash;
    if (key !== lastHexKey || force) {
      lastHexKey = key;
      sHexCtx.clearRect(0, 0, 48, 51);
      sHexCtx.drawImage(PIX.hexCanvas({ walk: null, hood: 3, hands: 1, glow: true, look: [1, 0] }, P[i], { flash: flash }), 0, 0);
    }
  }
  function swapSpan() { return swapSec.offsetHeight - root.innerHeight; }
  function go(i) {
    i = clamp(i, 0, N2 - 1);
    UI.scrollToY(swapSec.getBoundingClientRect().top + root.scrollY + (i / (N2 - 1)) * swapSpan() + 2);
  }
  $('[data-swap-prev]').addEventListener('click', function () { go(cur - 1); });
  $('[data-swap-next]').addEventListener('click', function () { go(cur + 1); });

  /* ═════════ the ticker between levels ═════════ */
  var ticker = $('[data-ticker] .ticker__in');
  if (ticker) ticker.innerHTML += ticker.innerHTML;

  /* ═════════ LEVEL 03: the cut, turning ═════════ */
  var cutSec = $('#cut'), cs = $('[data-cut-sprite]'), cctx = cs.getContext('2d'), cutA = -1;
  cs.width = 96; cs.height = 108;
  function cutLayout() {
    var r = cs.parentNode.getBoundingClientRect(), narrow = r.width < 860;
    var ck = Math.max(1, Math.floor(Math.min((r.height * (narrow ? 0.42 : 0.6)) / 108, (r.width * (narrow ? 0.8 : 0.5)) / 96)));
    cs.style.width = 96 * ck + 'px'; cs.style.height = 108 * ck + 'px';
  }
  cs.parentNode.style.backgroundImage = 'url(' + glowURL(K.byId.pink, 0.5) + ')';
  /* the turn is a product on a backdrop: show the whole frame, never crop it, and on a phone enlarge it until the hoodie fills the width */
  var cutStill = $('.film__still', cutSec);
  FILM.create(cutSec, {
    zoom: 0, set: 'd',
    fit: function () {
      var narrow = root.innerWidth < 860 && root.innerHeight > root.innerWidth;
      return { contain: true, zoom: narrow ? 1.8 : 1, dy: narrow ? 0.12 : 0, bg: getComputedStyle(cutStill).getPropertyValue('--slot-bg').trim() || '#5B4A7D' };
    },
    onPaint: function (q, tier) {
      if (tier !== 'board') return;
      /* no film yet: the sprite turns in 16 steps, the old paper-spin trick */
      var a = Math.round(smooth(0.22, 0.78, q) * 16);
      if (a === cutA) return;
      cutA = a;
      var c = Math.cos((a / 16) * Math.PI), w = Math.max(2, Math.round(Math.abs(c) * 96));
      cctx.imageSmoothingEnabled = false;
      cctx.clearRect(0, 0, 96, 108);
      cctx.drawImage(PIX.hoodieCanvas(K.byId.pink, c >= 0 ? 'front' : 'back'), 0, 0, 96, 108, Math.round((96 - w) / 2), 0, w, 108);
    },
  });

  /* ═════════ stat sheet ═════════ */
  $('[data-specs]').innerHTML = K.SPECS.map(function (s) { return '<div><dt>' + esc(s[0]) + '</dt><dd>' + esc(s[1]) + '</dd></div>'; }).join('');
  $('[data-size-table]').innerHTML = '<thead><tr><th scope="col">Size</th><th scope="col">Fits</th><th scope="col">Chest</th><th scope="col">Length</th><th scope="col">Sleeve</th></tr></thead><tbody>' +
    K.SIZES.map(function (s) { return '<tr><th scope="row">' + s.id + '</th><td>' + s.fits + '</td><td>' + s.chest + ' cm</td><td>' + s.length + ' cm</td><td>' + s.sleeve + ' cm</td></tr>'; }).join('') + '</tbody>';

  /* ═════════ LEVEL 04: on a real person. Pick a palette: the player and the page swap ═════════ */
  var fitSec = $('#fit'), fitIn = $('[data-fit]'), fitMain = $('[data-fit-main]'), fitModel = $('[data-fit-model]'), fitTabs = $('[data-fit-tabs]'), fitLink = $('[data-fit-link]'), fitCur = null;
  $('[data-fit-notes]').innerHTML = K.FIT.map(function (s) { return '<div><dt>' + esc(s[0]) + '</dt><dd>' + esc(s[1]) + '</dd></div>'; }).join('');
  fitTabs.innerHTML = P.map(function (p) {
    return '<button type="button" class="fit__tab" data-fit-tab="' + p.id + '" aria-pressed="false" style="--a:' + p.a + ';--b:' + p.b + ';--c:' + p.ui + ';--on:' + p.on + '"><i></i>' + esc(p.name) + '</button>';
  }).join('');
  function showFit(id, byUser) {
    if (id === fitCur) return;
    var p = K.byId[id];
    fitCur = id;
    fitMain.className = 'slot fit__main';
    fitMain.removeAttribute('role'); fitMain.removeAttribute('aria-label');
    fitMain.setAttribute('data-shot', id + '-fit');
    MEDIA.fill(fitMain);
    if (byUser && !UI.reduce()) { void fitMain.offsetWidth; fitMain.classList.add('wipe'); }
    fitModel.innerHTML = '<b>Player ' + p.n + '</b><span>' + p.model.cm + ' cm tall</span><span>Wears size ' + p.model.size + '</span><span>' + esc(p.name) + '</span>';
    $$('[data-fit-tab]', fitTabs).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-fit-tab') === id)); });
    fitLink.href = 'hoodie.html?id=' + id;
    fitLink.setAttribute('aria-label', 'View the ' + p.name + ' hoodie');
    fitIn.setAttribute('data-morph', id);
    fitSec.setAttribute('data-zone', id);
    if (byUser) UI.setPalette(id);
  }
  fitTabs.addEventListener('click', function (e) { var b = e.target.closest('[data-fit-tab]'); if (b) showFit(b.getAttribute('data-fit-tab'), true); });
  showFit('pink', false);

  /* ═════════ night shift: five looks ═════════ */
  var cityEl = $('[data-city]');
  cityEl.innerHTML = P.map(function (p) {
    return '<a class="look rv" href="hoodie.html?id=' + p.id + '" data-look="' + p.id + '" data-morph="' + p.id + '" style="--c:' + p.ui + '">' +
      '<figure class="slot" data-shot="' + p.id + '-city" data-morph-part="hoodie" data-sizes="(min-width: 900px) 30vw, 90vw"></figure>' +
      '<span class="look__cap"><span class="look__n">' + p.n + '</span><span class="look__name" data-morph-part="name">' + esc(p.name) + '</span>' +
      '<span class="look__where">' + esc(p.district) + '</span><span class="look__line">' + esc(p.line) + '</span></span></a>';
  }).join('');
  MEDIA.all(cityEl);
  UI.watch(cityEl);
  var looks = $$('[data-look]', cityEl);
  looks.forEach(function (a) {
    var set = function () { UI.setPalette(a.getAttribute('data-look')); };
    a.addEventListener('mouseenter', set);
    a.addEventListener('focus', set);
  });
  /* in one column (phones), the look crossing the middle of the screen sets the palette */
  if ('IntersectionObserver' in root && root.matchMedia('(max-width: 899px)').matches) {
    var lio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) UI.setPalette(e.target.getAttribute('data-look')); }); }, { rootMargin: '-48% 0px -48% 0px' });
    looks.forEach(function (a) { lio.observe(a); });
  }

  /* ═════════ the strip: all 132 frames of Hex in a row ═════════ */
  var strip = $('[data-strip]'), stripC = $('canvas', strip), stripBuilt = false, stripSec = $('#name');
  function buildStrip() {
    if (stripBuilt) return;
    stripBuilt = true;
    var fw = 48, fh = 51, m = 6;
    stripC.width = N * fw; stripC.height = fh + m * 2;
    var x = stripC.getContext('2d');
    x.fillStyle = '#100E1C'; x.fillRect(0, 0, stripC.width, stripC.height);
    x.fillStyle = '#07060D';
    for (var i = 0; i < stripC.width; i += 6) { x.fillRect(i + 2, 2, 2, 2); x.fillRect(i + 2, fh + m * 2 - 4, 2, 2); }
    for (var f = 0; f < N; f++) {
      var s = state(f);
      x.fillStyle = f % 2 ? '#17142A' : '#1C1833'; x.fillRect(f * fw, m, fw, fh);
      x.drawImage(PIX.hexCanvas(s.pose, s.pal, { flash: s.flash }), f * fw, m);
    }
    var sc = root.innerWidth < 700 ? 2 : 3;
    stripC.style.width = stripC.width * sc + 'px'; stripC.style.height = stripC.height * sc + 'px';
  }

  /* ═════════ the drop queue (front end only) ═════════ */
  var form = $('[data-drop]'), msg = $('[data-drop-msg]');
  function queued(n) { msg.textContent = 'Player #' + ('0000' + n).slice(-4) + ' queued for Drop ' + K.drop.n + '. It unlocks ' + K.drop.label + '.'; form.classList.add('is-done'); }
  try { var q0 = localStorage.getItem('kalypt.queue'); if (q0) queued(+q0); } catch (e) {}
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var input = $('input', form);
    if (!input.checkValidity()) { input.reportValidity(); return; }
    var n = 400 + Math.floor(PIX.hash(input.value.length, input.value.charCodeAt(0)) * 500);
    try { localStorage.setItem('kalypt.queue', String(n)); } catch (err) {}
    queued(n);
    UI.toast('Queued. Nothing was sent anywhere: this is a concept site.');
  });

  /* ═════════ scroll and clock ═════════ */
  var first = true;
  UI.onScroll(function (y) {
    var vh = root.innerHeight, r, span, p;
    r = titleSec.getBoundingClientRect();
    titleOn = r.bottom > 0;

    r = runSec.getBoundingClientRect(); span = runSec.offsetHeight - vh;
    p = span > 0 ? clamp(-r.top / span, 0, 1) : 0;
    runOn = r.top < vh && r.bottom > 0;
    runMid = r.top <= vh * 0.5 && r.bottom > vh * 0.5;
    var f = Math.min(N - 1, Math.floor(p * N));
    if (f !== F || first) {
      F = f;
      if (runOn || first) { drawRun(); hud(); }
    }

    r = swapSec.getBoundingClientRect(); span = swapSpan();
    if (r.top < vh * 2 && r.bottom > -vh) swapPhotos();
    p = span > 0 ? clamp(-r.top / span, 0, 1) : 0;
    var was = swapMid;
    swapMid = r.top <= vh * 0.5 && r.bottom > vh * 0.5;
    var raw = p * (N2 - 1), i0 = Math.min(N2 - 2, Math.floor(raw));
    var nf = i0 + smooth(0.3, 0.7, raw - i0);
    if (nf !== sf || first || was !== swapMid) {
      sf = nf;
      if (r.top < vh && r.bottom > 0) paintSwap(first);
    }
    /* the two levels that swap palettes drive the page colour while they hold the middle of the screen */
    if (runMid) { var st = state(Math.max(0, F)); UI.setPalette(st.pal === K.WILD ? 'pink' : st.pal.id); }
    else if (swapMid && cur >= 0) UI.setPalette(P[cur].id);

    if (ticker) ticker.style.transform = 'translate3d(' + -((y * 0.5) % (ticker.scrollWidth / 2)) + 'px,0,0)';

    r = stripSec.getBoundingClientRect();
    if (r.top < vh * 1.5) buildStrip();
    if (stripBuilt && r.top < vh && r.bottom > 0) {
      var sp = clamp((vh - r.top) / (vh + r.height), 0, 1), travel = stripC.offsetWidth - strip.clientWidth;
      stripC.style.transform = 'translate3d(' + -Math.round(sp * travel) + 'px,0,0)';
    }
    first = false;
  });

  /* fixed zones: once you leave the two levels that change the palette themselves, each section sets its own */
  var zones = $$('[data-zone]');
  UI.onScroll(function () {
    var mid = root.innerHeight * 0.5, hit = null;
    zones.forEach(function (z) { var r = z.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) hit = z; });
    if (hit && hit !== zones.last) { zones.last = hit; UI.setPalette(hit.getAttribute('data-zone')); }
    if (!hit) zones.last = null;
  });

  /* Hex leaves the rail while he is on stage in the title's last beat and through level 01 */
  UI.setRailOff(function () {
    var vh = root.innerHeight, t = titleSec.getBoundingClientRect(), r = runSec.getBoundingClientRect();
    var tp = clamp(-t.top / Math.max(1, titleSec.offsetHeight - vh), 0, 1);
    return (tp > 0.8 && t.bottom > 0) || (r.top < vh * 0.6 && r.bottom > vh * 0.75);
  });

  UI.onTick(function () {
    tick++;
    if (titleOn) drawTitle();
    if (runOn) drawRun();
  });

  UI.onPalette(function () { if (runOn) drawRun(); });

  root.addEventListener('resize', function () {
    tScene.size(); rScene.size(); layout(); cutLayout();
    drawTitle(); drawRun(); paintSwap(true);
  });
  layout(); cutLayout(); paintSwap(true);
})(window);
