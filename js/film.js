/*
 * KALYPT: scroll films. Scrolling plays a film forward and back, one frame at a time.
 *
 *   <section class="film" data-film="descent" style="--len:230">     (--len = section height in svh)
 *     <div class="film__stage">                                     (sticky, one screen tall)
 *       <div class="film__media">
 *         <figure class="slot slot--fill film__still" data-shot="city-hero">                    start frame
 *         <figure class="slot slot--fill film__still film__still--end" data-shot="city-street">  end frame
 *         <canvas class="film__canvas">
 *       <div class="chap" data-in="0" data-out=".3">…</div>          copy that shows between two moments
 *       <div class="film__hud">…</div>
 *
 * Three tiers, so the section is finished whatever exists:
 *   frames   assets/film/<name>/d|m/0001.webp… (listed in ready.js by optimize.mjs) → drawn on the canvas
 *   stills   start and end frames exist → a slow push-in that crossfades from one to the other
 *   board    nothing exists → the page's own pixel version plays instead (opts.onPaint draws it),
 *            and the HUD reads out the storyboard beat by beat
 *
 * opts.onPaint(q, tier)   called on every repaint with the eased progress 0–1
 * opts.mosaic(q)          block size in canvas pixels for the frames tier (1 = sharp); lets a film break into pixels
 * opts.zoom               how far the two stills push in over the film (default 0.1; 0 for a product on a backdrop)
 * opts.fit()              → { contain, zoom, dy, bg } to show the whole frame instead of cropping it to the stage
 */
(function (root) {
  var SHOTS = root.KALYPT_SHOTS, READY = root.KALYPT_READY || {}, MEDIA = root.KP_MEDIA, UI = root.KP_UI;
  var FILMS = READY.film || {};
  var clamp = UI.clamp;
  var pad = function (n) { return (n < 10 ? '0' : '') + n.toFixed(1); };

  function create(sec, opts) {
    opts = opts || {};
    var name = sec.dataset.film;
    var meta = SHOTS.films.filter(function (f) { return f.name === name; })[0];
    var stage = sec.querySelector('.film__stage');
    var canvas = sec.querySelector('.film__canvas');
    var ctx = canvas.getContext('2d');
    var stillA = sec.querySelector('.film__still:not(.film__still--end)');
    var stillB = sec.querySelector('.film__still--end');
    var chaps = Array.prototype.slice.call(sec.querySelectorAll('.chap'));
    var bar = sec.querySelector('.film__bar i');
    var tc = sec.querySelector('.film__tc');
    var beat = sec.querySelector('.film__beat');
    var focus = meta && meta.focus != null ? meta.focus : 0.5;
    var dur = meta ? meta.params.duration : 10;
    var have = FILMS[name];
    var phone = root.matchMedia('(max-width: 700px) and (orientation: portrait)').matches;
    /* phones take the upright crop, unless the film says its wide frames must be shown whole (opts.set = 'd') */
    var set = have ? opts.set || (phone && have.m ? 'm' : 'd') : null;
    var count = have ? have[set] : 0;
    var tier = count ? 'frames' : meta && MEDIA.ready(meta.start) && MEDIA.ready(meta.end) ? 'stills' : 'board';
    sec.classList.add('film--' + tier);

    var ticks = sec.querySelector('.film__ticks');
    if (ticks && meta) ticks.innerHTML = meta.beats.map(function (b) { return '<i style="left:' + b.at * 100 + '%"></i>'; }).join('');
    var tag = sec.querySelector('.film__tag');
    if (tag && meta) {
      var missing = [meta.start, meta.end].filter(function (id) { return !MEDIA.ready(id); });
      tag.innerHTML = tier === 'frames' ? meta.id + ' · ' + dur + ' s'
        : 'Film pending · ' + meta.id + ' · ' + dur + ' s' + (missing.length ? '<span class="film__tag-x"> · stills ' + missing.join(' + ') + ' pending · pixel cut playing</span>' : '');
    }

    /* frames: load coarse first so scrubbing works early, then fill in */
    var imgs = [], loaded = [], started = false, held = 0, release = function () {};
    function load() {
      if (started || !count) return;
      started = true;
      var order = [], seen = {};
      /* phones stop at every second frame: half the download, still smooth at phone size (nearest() fills the gaps) */
      (phone ? [16, 8, 4, 2] : [16, 8, 4, 2, 1]).forEach(function (step) { for (var i = 0; i < count; i += step) if (!seen[i]) { seen[i] = 1; order.push(i); } });
      if (!seen[count - 1]) order.push(count - 1);
      /* only the coarse pass (every 4th frame) loads up front; the rest waits until the visitor scrolls into the film */
      held = 0;
      for (var k = 0; k < order.length; k++) if (order[k] % 4 === 0) held = k + 1;
      var next = 0, active = 0, open = false;
      release = function () { if (!open) { open = true; pump(); } };
      function pump() {
        while (active < 6 && next < order.length && (open || next < held)) {
          var i = order[next++], im = new Image();
          active++;
          im.decoding = 'async';
          im.onload = (function (i, im) { return function () { loaded[i] = 1; imgs[i] = im; active--; pump(); draw(true); }; })(i, im);
          im.onerror = function () { active--; pump(); };
          im.src = 'assets/film/' + name + '/' + set + '/' + String(i + 1).padStart(4, '0') + '.webp';
        }
      }
      pump();
    }
    function nearest(i) {
      for (var dd = 0; dd < count; dd++) { if (loaded[i - dd]) return i - dd; if (loaded[i + dd]) return i + dd; }
      return -1;
    }

    var W = 0, H = 0, drawn = -1, drawnM = 1, tmp = document.createElement('canvas'), tctx = tmp.getContext('2d');
    function size() {
      var r = stage.getBoundingClientRect(), dpr = Math.min(root.devicePixelRatio || 1, 2);
      W = Math.round(r.width * dpr); H = Math.round(r.height * dpr);
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; drawn = -1; }
    }
    function draw(force) {
      if (tier !== 'frames') return;
      var i = nearest(Math.round(q * (count - 1)));
      var mz = opts.mosaic ? Math.max(1, Math.round(opts.mosaic(q))) : 1;
      if (i < 0 || (i === drawn && mz === drawnM && !force)) return;
      var im = imgs[i], fit = opts.fit ? opts.fit() : null, whole = fit && fit.contain;
      var s = whole ? Math.min(W / im.naturalWidth, H / im.naturalHeight) * (fit.zoom || 1) : Math.max(W / im.naturalWidth, H / im.naturalHeight);
      var w = im.naturalWidth * s, h = im.naturalHeight * s, x = (W - w) * focus, y = (H - h) / 2 + (whole ? (fit.dy || 0) * H : 0);
      if (whole) { ctx.fillStyle = fit.bg || '#000'; ctx.fillRect(0, 0, W, H); }
      if (mz > 1) {
        var sw = Math.ceil(W / mz), shh = Math.ceil(H / mz);
        tmp.width = sw; tmp.height = shh;
        if (whole) { tctx.fillStyle = fit.bg || '#000'; tctx.fillRect(0, 0, sw, shh); }
        tctx.drawImage(im, x / mz, y / mz, w / mz, h / mz);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(tmp, 0, 0, sw, shh, 0, 0, sw * mz, shh * mz);
        ctx.imageSmoothingEnabled = true;
      } else {
        ctx.drawImage(im, x, y, w, h);
        /* a whole frame leaves bands above and below: stretch its own first and last rows into them, so no edge shows */
        if (whole && y > 0.5) {
          ctx.drawImage(im, 0, 0, im.naturalWidth, 1, x, 0, w, Math.ceil(y));
          ctx.drawImage(im, 0, im.naturalHeight - 1, im.naturalWidth, 1, x, Math.floor(y + h), w, Math.ceil(H - y - h));
        }
      }
      drawn = i; drawnM = mz;
      if (!sec.classList.contains('has-frame')) sec.classList.add('has-frame');
    }

    /* progress */
    var p = 0, q = 0, raf = 0, last = 0;
    function measure() {
      var r = sec.getBoundingClientRect(), span = sec.offsetHeight - root.innerHeight;
      p = span > 0 ? clamp(-r.top / span, 0, 1) : 0;
      if (r.top < root.innerHeight * 2 && r.bottom > -root.innerHeight) load();
      if (started && r.top < root.innerHeight * 0.5 && (p > 0.002 || r.top > 0)) release();
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); }
    }
    function step(now) {
      raf = 0;
      var dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      q += (p - q) * (UI.reduce() ? 1 : 1 - Math.exp(-dt * 14));
      if (Math.abs(p - q) < 0.0004) q = p;
      paint();
      if (q !== p) raf = requestAnimationFrame(step);
    }
    function paint() {
      draw(false);
      if (tier === 'stills') {
        var x = UI.smooth(0.28, 0.78, q);
        if (stillB) stillB.style.opacity = x.toFixed(3);
        var zoom = UI.reduce() ? 1 : 1 + q * (opts.zoom != null ? opts.zoom : 0.1);
        stillA.style.transform = 'scale(' + zoom.toFixed(4) + ')';
        if (stillB) stillB.style.transform = 'scale(' + (zoom + (opts.zoom === 0 ? 0 : 0.02)).toFixed(4) + ')';
      }
      chaps.forEach(function (c) {
        var a = parseFloat(c.dataset.in), b = parseFloat(c.dataset.out);
        var o = (a <= 0 ? 1 : clamp((q - a) / 0.05, 0, 1)) * (b >= 1 ? 1 : clamp((b - q) / 0.05, 0, 1));
        c.style.opacity = o.toFixed(3);
        c.style.transform = UI.reduce() ? '' : 'translate3d(0,' + (Math.round(((1 - o) * (q < a ? 24 : -24)) / 4) * 4) + 'px,0)';
        c.classList.toggle('is-live', o > 0.5);
      });
      if (bar) bar.style.transform = 'scaleX(' + q.toFixed(4) + ')';
      if (tc) tc.textContent = '00:' + pad(q * dur) + ' / 00:' + pad(dur);
      if (beat && meta) {
        var cur = meta.beats[0];
        meta.beats.forEach(function (b) { if (q >= b.at) cur = b; });
        if (beat.textContent !== cur.text) beat.textContent = cur.text;
      }
      if (opts.onPaint) opts.onPaint(q, tier);
    }

    size();
    root.addEventListener('resize', function () { size(); draw(true); measure(); });
    UI.onScroll(measure);
    measure();
    return { tier: tier, progress: function () { return q; }, repaint: paint };
  }

  root.KP_FILM = { create: create };
})(window);
