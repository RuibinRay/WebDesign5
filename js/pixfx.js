/*
 * KALYPT: pixel effects for every page.
 *
 *   cursor      the mouse is a pixel arrow (a pixel hand over links), in the palette on screen
 *   trail       moving the mouse leaves pixels that dither away; dragging throws a burst
 *   transition  leaving a page, the next one arrives in ordered-dither blocks (the hoodie's fade)
 *
 * The transition uses View Transitions where the browser has them (the hoodie morph still flies on top).
 * Elsewhere a canvas cover does the same dissolve: it fills the screen in dither order before the
 * page leaves, and clears in dither order when the next page arrives.
 * Under "reduce" the trail and the transitions are off; the cursor stays (it does not move by itself).
 */
(function (root) {
  var d = document.documentElement, UI = root.KP_UI, PIX = root.KP_PIX, K = root.KALYPT;
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  var fine = root.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var reduce = function () { return UI.reduce(); };

  /* ───────── cursor ───────── */
  var ARROW = [
    'o...........', 'oo..........', 'owo.........', 'owwo........', 'owwwo.......', 'owwwwo......', 'owwwwwo.....', 'owwwwwwo....',
    'owwwwwwwo...', 'owwwwwwwwo..', 'owwwwwwwwwo.', 'owwwwwoooooo', 'owwowwo.....', 'owo.owwo....', 'oo..owwo....', 'o....owwo...',
    '.....owwo...', '......oo....',
  ];
  var HAND = [
    '....oo......', '...owwo.....', '...owwo.....', '...owwo.....', '...owwooo...', '...owwowwoo.', '.oo.owwowwowo', 'owwoowwwwwwwo',
    'owwwowwwwwwwo', '.owwwwwwwwwwo', '..owwwwwwwwwo', '..owwwwwwwwo.', '...owwwwwwwo.', '...owwwwwwo..', '....owwwwwo..', '....oooooo...',
  ];
  function cursorURL(map, pal, accent) {
    var s = 2, w = 13, rects = '';
    map.forEach(function (row, y) {
      for (var x = 0; x < row.length; x++) {
        var c = row[x];
        if (c === '.') continue;
        var fill = c === 'o' ? pal.ink : accent && y < 4 && c === 'w' ? pal.ui : '#FFFFFF';
        rects += '<rect x="' + x * s + '" y="' + y * s + '" width="' + s + '" height="' + s + '" fill="' + fill + '"/>';
      }
    });
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w * s + '" height="' + map.length * s + '" shape-rendering="crispEdges">' + rects + '</svg>';
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  }
  function paintCursor(pal) {
    if (!fine) return;
    d.style.setProperty('--cur', cursorURL(ARROW, pal, true) + ' 0 0, auto');
    d.style.setProperty('--cur-hand', cursorURL(HAND, pal, false) + ' 8 0, pointer');
    d.classList.add('px-cursor');
  }

  /* ───────── trail ───────── */
  var cv = document.createElement('canvas'), ctx = cv.getContext('2d'), CELL = 6, W = 0, H = 0, parts = [], raf = 0, last = 0, col = ['#FF2F8E', '#FFA3D2'];
  cv.className = 'px-trail';
  cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv);
  function size() {
    W = Math.ceil(root.innerWidth / CELL); H = Math.ceil(root.innerHeight / CELL);
    cv.width = W; cv.height = H;
    cv.style.width = W * CELL + 'px'; cv.style.height = H * CELL + 'px';
  }
  size();
  root.addEventListener('resize', size);
  function spawn(x, y, n, speed) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.8);
      parts.push({ x: x / CELL, y: y / CELL, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (speed ? 0.6 : 0), g: speed ? 0.05 : 0, life: 1, decay: speed ? 0.018 + Math.random() * 0.016 : 0.032 + Math.random() * 0.02, c: Math.random() < 0.7 ? 0 : 1 });
    }
    if (parts.length > 400) parts.splice(0, parts.length - 400);
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); }
  }
  function step(now) {
    raf = 0;
    var dt = Math.min(3, (now - last) / 16.7);
    last = now;
    ctx.clearRect(0, 0, W, H);
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.life -= p.decay * dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      var gx = Math.floor(p.x), gy = Math.floor(p.y);
      /* fading out in dither steps, not alpha: a pixel is on or off */
      if (p.life * 16 <= BAYER[((gy & 3) << 2) | (gx & 3)]) continue;
      ctx.fillStyle = col[p.c];
      ctx.fillRect(gx, gy, 1, 1);
    }
    if (parts.length) raf = requestAnimationFrame(step);
  }
  var lx = -1, ly = -1;
  root.addEventListener('pointermove', function (e) {
    if (reduce()) return;
    var dragging = e.buttons > 0;
    var dist = Math.hypot(e.clientX - lx, e.clientY - ly);
    if (lx < 0) dist = CELL;
    /* one pixel per cell crossed while moving; a dragging pointer throws sparks as well */
    var n = Math.min(6, Math.floor(dist / CELL));
    for (var i = 1; i <= n; i++) spawn(lx + ((e.clientX - lx) * i) / n, ly + ((e.clientY - ly) * i) / n, 1, 0);
    if (dragging) spawn(e.clientX, e.clientY, 2, 0.7);
    if (n || lx < 0) { lx = e.clientX; ly = e.clientY; }
  }, { passive: true });
  root.addEventListener('pointerdown', function (e) { if (!reduce()) spawn(e.clientX, e.clientY, 14, 1.1); lx = e.clientX; ly = e.clientY; }, { passive: true });
  root.addEventListener('pointerleave', function () { lx = ly = -1; });

  /* ───────── page transition: the hoodie's ordered dither, in big blocks ───────── */
  var B = fine ? 22 : 16, STEPS = 16;
  function mask(s) {
    /* step s of 16: the cells whose Bayer value is below s are shown */
    var c = document.createElement('canvas');
    c.width = c.height = B * 4;
    var x = c.getContext('2d');
    x.fillStyle = '#000';
    for (var i = 0; i < 16; i++) if (BAYER[i] < s) x.fillRect((i & 3) * B, (i >> 2) * B, B, B);
    return c.toDataURL();
  }
  var vt = !!(root.CSS && CSS.supports('view-transition-name: none')) && 'onpagereveal' in root;
  if (vt) {
    var frames = '';
    for (var s = 0; s <= STEPS; s++) {
      var u = 'url(' + mask(s) + ')';
      frames += ((s / STEPS) * 100).toFixed(2) + '% { -webkit-mask-image: ' + u + '; mask-image: ' + u + '; }\n';
    }
    var st = document.createElement('style');
    st.textContent =
      '@keyframes px-in {\n' + frames + '}\n' +
      'html:not(.reduce)::view-transition-new(root) { animation: px-in 0.5s step-end both; -webkit-mask-size: ' + B * 4 + 'px; mask-size: ' + B * 4 + 'px; }\n' +
      'html:not(.reduce)::view-transition-old(root) { animation: none; }\n';
    document.head.appendChild(st);
  } else {
    /* no View Transitions: a canvas cover in the palette's dark colour */
    var cover = document.createElement('canvas'), cctx = cover.getContext('2d');
    cover.className = 'px-cover';
    cover.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cover);
    var run = function (from, to, ms, done) {
      var cw = Math.ceil(root.innerWidth / B), ch = Math.ceil(root.innerHeight / B), t0 = performance.now();
      cover.width = cw; cover.height = ch;
      cover.style.display = 'block';
      var bg = getComputedStyle(d).getPropertyValue('--bgp').trim() || '#07060D';
      (function tick(now) {
        var k = Math.min(1, (now - t0) / ms), lvl = Math.round((from + (to - from) * k) * STEPS);
        cctx.clearRect(0, 0, cw, ch);
        cctx.fillStyle = bg;
        for (var y = 0; y < ch; y++) for (var x = 0; x < cw; x++) if (BAYER[((y & 3) << 2) | (x & 3)] < lvl) cctx.fillRect(x, y, 1, 1);
        if (k < 1) requestAnimationFrame(tick);
        else { if (!to) cover.style.display = 'none'; if (done) done(); }
      })(t0);
    };
    var FLAG = 'kalypt.px-arrive';
    var arrived = false;
    try { arrived = sessionStorage.getItem(FLAG) === '1'; sessionStorage.removeItem(FLAG); } catch (e) {}
    if (arrived && !reduce()) run(1, 0, 420);
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || reduce()) return;
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      var url = new URL(a.href, location.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      if (!/\.html$|\/$/.test(url.pathname)) return;
      e.preventDefault();
      try { sessionStorage.setItem(FLAG, '1'); } catch (err) {}
      run(0, 1, 320, function () { location.href = a.href; });
    });
    root.addEventListener('pageshow', function (e) { if (e.persisted) cover.style.display = 'none'; });
  }

  /* everything follows the palette on screen */
  function follow(p) { col = [p.ui, p.glow]; paintCursor(p); }
  UI.onPalette(follow);
  follow(UI.palette());

  root.KP_FX = { burst: function (x, y) { spawn(x, y, 22, 1.4); }, mask: mask, vt: vt };
})(window);
