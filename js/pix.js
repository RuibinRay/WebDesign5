/*
 * KALYPT: the pixel engine. Everything pixel on the site is drawn here, in code, from the palettes in data.js:
 *
 *   hex(pose)        Hex the chameleon, 48 × 51 px, built from parts (tail, legs, body, head, hood, eye, arm)
 *                    so any pose is one call: walking, hood going up, hands in pocket, blinking.
 *   hoodie(side)     the one cut, 96 × 108 px, front or back, with the dithered fade
 *   paint(...)       puts an indexed sprite on a canvas in any palette (that is the palette swap)
 *   City             the night street: sky, moon, three parallax layers, road, rain
 *   mark / wordmark  the Eye and the KALYPT letters as crisp SVG
 *   seam             a dithered band between two colours, for section edges
 *
 * Sprites are indexed (one number per pixel). A palette turns numbers into colours, so recolouring
 * Hex or a hoodie never redraws it.
 */
(function (root) {
  /* ───────── colour ───────── */
  function rgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function hexOf(c) { return '#' + ((1 << 24) | (Math.round(c[0]) << 16) | (Math.round(c[1]) << 8) | Math.round(c[2])).toString(16).slice(1).toUpperCase(); }
  function mix(a, b, t) { var x = rgb(a), y = rgb(b); return hexOf([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]); }

  /* ───────── dither ───────── */
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function dither(x, y, t) { return t > (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16; }
  function hash(x, y) { var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ───────── indexed sprites ───────── */
  var T = 0, INK = 1, SK = 2, SKS = 3, SKL = 4, A = 5, AS = 6, AL = 7, B = 8, BS = 9, EYE = 10, PUP = 11,
    GLOW = 12, TNG = 13, FAR = 14, MET = 15, LIN = 16, BL = 17, LIN2 = 18;

  function Grid(w, h) { this.w = w; this.h = h; this.d = new Uint8Array(w * h); }
  Grid.prototype.get = function (x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.d[y * this.w + x]; };
  Grid.prototype.set = function (x, y, v) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = v; };

  function ell(m, cx, cy, rx, ry) {
    var x0 = Math.max(0, Math.floor(cx - rx)), x1 = Math.min(m.w - 1, Math.ceil(cx + rx));
    var y0 = Math.max(0, Math.floor(cy - ry)), y1 = Math.min(m.h - 1, Math.ceil(cy + ry));
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      var dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) m.d[y * m.w + x] = 1;
    }
  }
  function poly(m, pts) {
    for (var y = 0; y < m.h; y++) {
      var yc = y + 0.5, xs = [];
      for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        var a = pts[i], b = pts[j];
        if ((a[1] > yc) !== (b[1] > yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      xs.sort(function (p, q) { return p - q; });
      for (var k = 0; k + 1 < xs.length; k += 2) {
        for (var x = Math.max(0, Math.ceil(xs[k] - 0.5)); x <= Math.min(m.w - 1, Math.floor(xs[k + 1] - 0.5)); x++) m.d[y * m.w + x] = 1;
      }
    }
  }
  function cap(m, x0, y0, x1, y1, r0, r1) {
    var n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 1;
    for (var i = 0; i <= n; i++) { var t = i / n, r = r0 + (r1 - r0) * t; ell(m, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, r); }
  }
  function spiral(m, cx, cy, r0, r1, deg0, deg1, t0, t1) {
    for (var i = 0; i <= 200; i++) {
      var t = i / 200, th = ((deg0 + (deg1 - deg0) * t) * Math.PI) / 180, r = r0 + (r1 - r0) * t, w = t0 + (t1 - t0) * t;
      ell(m, cx + r * Math.cos(th), cy + r * Math.sin(th), w, w);
    }
  }
  function line(x0, y0, x1, y1, fn) {
    var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    n = Math.max(1, Math.round(n));
    for (var i = 0; i <= n; i++) fn(Math.floor(x0 + ((x1 - x0) * i) / n), Math.floor(y0 + ((y1 - y0) * i) / n));
  }
  /* stamp a part: fill, a shaded rim on the lower right, a lit rim on the upper left, an outline outside it */
  function put(g, m, c) {
    var w = g.w, h = g.h, at = function (x, y) { return x >= 0 && y >= 0 && x < w && y < h && m.d[y * w + x]; };
    var sw = c.sw || 1;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var i = y * w + x;
      if (m.d[i]) {
        var v = typeof c.f === 'function' ? c.f(x, y) : c.f;
        if (c.s != null && (!at(x + 1, y) || !at(x, y + 1) || (sw > 1 && (!at(x + 2, y) || !at(x, y + 2))))) v = typeof c.s === 'function' ? c.s(x, y, v) : c.s;
        else if (c.l != null && (!at(x - 1, y) || !at(x, y - 1))) v = typeof c.l === 'function' ? c.l(x, y, v) : c.l;
        g.d[i] = v;
      } else if (c.o != null && (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1))) {
        if (!c.only || c.only(g.d[i])) g.d[i] = c.o;
      }
    }
  }

  /* ───────── palettes → pixel colours ───────── */
  var lutCache = {};
  function lut(pal, flash) {
    var key = pal.id + (flash ? '!' : '');
    if (lutCache[key]) return lutCache[key];
    var cols = [];
    cols[INK] = pal.ink; cols[SK] = pal.skin; cols[SKS] = mix(pal.skin, pal.ink, 0.34); cols[SKL] = mix(pal.skin, '#FFFFFF', 0.42);
    cols[A] = pal.a; cols[AS] = mix(pal.a, pal.ink, 0.38); cols[AL] = mix(pal.a, '#FFFFFF', 0.26);
    cols[B] = pal.b; cols[BS] = mix(pal.b, pal.ink, 0.34); cols[EYE] = '#FFFFFF'; cols[PUP] = pal.ink;
    cols[GLOW] = pal.glow; cols[TNG] = '#FF4D7E'; cols[FAR] = mix(pal.skin, pal.ink, 0.52); cols[MET] = '#C8CEDA';
    cols[LIN] = mix(pal.b, pal.ink, 0.5); cols[BL] = mix(pal.b, '#FFFFFF', 0.3); cols[LIN2] = mix(pal.b, pal.ink, 0.8);
    var u = new Uint32Array(32);
    for (var i = 1; i < cols.length; i++) {
      if (!cols[i]) continue;
      var c = flash ? [255, 255, 255] : rgb(cols[i]);
      u[i] = (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0];
    }
    u.css = cols;
    return (lutCache[key] = u);
  }
  function paint(g, canvas, pal, o) {
    o = o || {};
    var u = lut(pal, o.flash), w = g.w, h = g.h;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    var ctx = canvas.getContext('2d'), im = ctx.createImageData(w, h), px = new Uint32Array(im.data.buffer);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) px[y * w + x] = u[g.d[y * w + (o.flip ? w - 1 - x : x)]];
    ctx.putImageData(im, 0, 0);
    return canvas;
  }

  /* ───────── HEX ─────────
     pose: { walk: 0–7 | null, hoodie: 0–1, hood: 0–3, hands: 0 | 0.5 | 1, glow, look: [x, y], blink: 0 | 1 | 2 } */
  var HW = 48, HH = 51, OY = 3, FOOT = 49;
  function hex(p) {
    p = p || {};
    var eq = p.hoodie == null ? 1 : p.hoodie, q;
    if (eq > 0 && eq < 1) {
      /* the hoodie lands from the top down: dressed above the line, bare below it */
      var bare = {}, full = {};
      for (q in p) { bare[q] = p[q]; full[q] = p[q]; }
      bare.hoodie = 0; full.hoodie = 1;
      var g0 = hex(bare), g1 = hex(full), lim = Math.round(OY + 19 + eq * 23);
      for (var yy = lim; yy < HH; yy++) for (var xx = 0; xx < HW; xx++) g1.d[yy * HW + xx] = g0.d[yy * HW + xx];
      for (xx = 0; xx < HW; xx++) if (g1.d[lim * HW + xx] && ((xx + lim) & 1)) g1.d[lim * HW + xx] = GLOW;
      return g1;
    }
    var on = eq >= 1, hood = on ? p.hood || 0 : 0;
    var g = new Grid(HW, HH), m, mk = function () { return new Grid(HW, HH); };
    var k = p.walk == null ? null : p.walk & 7, ph = k == null ? null : (k * Math.PI) / 4;
    var bob = k == null ? 0 : k % 4 === 1 || k % 4 === 2 ? -1 : 0, Y = OY + bob;
    var sh = function (x, y, v) { return v === A ? AS : v === B ? BS : v; };
    var li = function (x, y, v) { return v === A ? AL : v === B ? BL : v; };
    var body = function (x, y) { var yy = y - Y; if (yy >= 38) return x & 1 ? B : BS; return dither(x, y, (yy - 30) / 8) ? B : A; };

    /* tail: one and a bit turns of spiral */
    m = mk(); spiral(m, 8.5 + (k != null && k & 2 ? 0.5 : 0), 31 + Y, 7, 2.2, 20, 420, 1.6, 1.0);
    put(g, m, { f: SK, s: SKS, o: INK });

    function leg(hipX, phase, col) {
      var fx = phase == null ? (hipX > 21 ? 1 : -1) : Math.round(4 * Math.cos(phase));
      var lift = phase == null ? 0 : Math.round(Math.max(0, -Math.sin(phase)) * 2.4);
      var ax = hipX + fx, ay = 43.2 + OY - lift;
      m = mk(); cap(m, hipX, 38 + Y, ax, ay, 1.5, 1.4); ell(m, ax + 1.3, 44.6 + OY - lift, 2.7, 1.4);
      put(g, m, { f: col, s: col === SK ? SKS : null, o: INK });
    }
    leg(19.5, ph == null ? null : ph + Math.PI, FAR);

    m = mk(); ell(m, 21.5, 32 + Y, 6, 7.5); put(g, m, { f: SK, s: SKS, o: INK });
    if (!on) [18, 22].forEach(function (x) { for (var y = 27 + Y; y < 37 + Y; y++) if (m.d[y * HW + x] && (x + y) & 1) g.set(x, y, SKS); });
    leg(23, ph, SK);

    if (on && !hood) { m = mk(); ell(m, 16.5, 23.5 + Y, 4.4, 3.4); put(g, m, { f: A, s: AS, l: AL, o: INK }); }
    if (on) {
      m = mk(); poly(m, [[14.5, 25 + Y], [20, 23 + Y], [27.5, 24 + Y], [30, 30 + Y], [29.5, 39.5 + Y], [13.5, 39.5 + Y]]);
      put(g, m, { f: body, s: sh, l: li, o: INK });
    }

    /* head: skull, snout and the casque */
    m = mk(); ell(m, 27, 16.5 + Y, 8.5, 7);
    poly(m, [[31, 12.5 + Y], [40.5, 17.5 + Y], [41, 20.5 + Y], [38, 23 + Y], [30, 23.5 + Y]]);
    poly(m, [[19, 15 + Y], [24, 1.2 + Y], [26, 1.2 + Y], [33, 12 + Y]]);
    put(g, m, { f: SK, s: SKS, o: INK });
    [[24, 4], [23, 8], [26, 7], [22, 11], [25, 10]].forEach(function (s) { if (m.d[(s[1] + Y) * HW + s[0]]) g.set(s[0], s[1] + Y, SKL); });
    for (var x = 34; x <= 40; x++) g.set(x, 21 + Y, INK);
    g.set(33, 20 + Y, INK);
    g.set(39, 18 + Y, SKS);

    if (hood) {
      var H = [null,
        [[16, 25], [14.5, 17], [18.5, 12.5], [22, 16], [23.5, 25]],
        [[16.5, 25], [15, 13], [20.5, 5.5], [24.5, 6.5], [24, 16], [25, 25]],
        [[16.5, 25], [15, 14], [19.5, 5], [24.5, -0.5], [29, 3], [28, 8], [25.5, 12.5], [24.5, 19], [25.5, 25]]][hood];
      m = mk(); poly(m, H.map(function (v) { return [v[0], v[1] + Y]; }));
      put(g, m, { f: A, s: AS, l: AL, o: INK });
      if (hood === 3) {
        var edge = [[28, 3], [27, 8], [24.5, 12.5], [23.5, 19], [24.5, 24]], trim = p.glow ? GLOW : AL;
        for (var e = 0; e + 1 < edge.length; e++) line(edge[e][0], edge[e][1] + Y, edge[e + 1][0], edge[e + 1][1] + Y, function (x, y) { if (m.d[y * HW + x]) g.set(x, y, trim); });
      }
    }

    /* the turret eye */
    m = mk(); ell(m, 30.5, 15.5 + Y, 4.2, 4.2); put(g, m, { f: SKL, s: SK, o: INK });
    var blink = p.blink || 0, look = p.look || [1, 1];
    if (blink === 2) { g.set(29, 15 + Y, INK); g.set(30, 16 + Y, INK); g.set(31, 16 + Y, INK); g.set(32, 15 + Y, INK); }
    else {
      m = mk(); ell(m, 31, 15.5 + Y, 2.4, 2.4);
      for (var ey = 0; ey < HH; ey++) for (var ex = 0; ex < HW; ex++) if (m.d[ey * HW + ex] && !(blink === 1 && ey < 15 + Y)) g.d[ey * HW + ex] = EYE;
      var px = 30 + look[0], py = 14 + look[1] + Y;
      g.set(px, py, PUP); g.set(px + 1, py, PUP); g.set(px, py + 1, PUP); g.set(px + 1, py + 1, PUP);
    }

    /* arm, sleeve, pocket */
    var S = [22.5, 27.5 + Y];
    var Hn = p.hands === 1 ? [25, 35 + Y] : p.hands === 0.5 ? [26.5, 34.5 + Y] : [27.5 + (ph == null ? 0 : Math.round(2 * Math.cos(ph + Math.PI))), 33.5 + Y];
    var at = function (t) { return [S[0] + (Hn[0] - S[0]) * t, S[1] + (Hn[1] - S[1]) * t]; };
    function pocket() {
      m = mk(); poly(m, [[21.5, 31.5 + Y], [28.5, 31.5 + Y], [29, 37.5 + Y], [20.5, 37.5 + Y]]);
      put(g, m, { f: body, o: AS, only: function (v) { return v === A || v === B || v === BS || v === AS; } });
    }
    if (!on) {
      m = mk(); cap(m, S[0], S[1], Hn[0], Hn[1], 1.4, 1.3); ell(m, Hn[0], Hn[1], 1.8, 1.8);
      put(g, m, { f: SK, s: SKS, o: INK });
    } else {
      var inPocket = p.hands === 1;
      if (!inPocket) {
        pocket();
        m = mk(); ell(m, Hn[0], Hn[1], 1.7, 1.7); put(g, m, { f: SK, o: INK });
      }
      var e1 = at(inPocket ? 0.8 : 0.7), cu = at(inPocket ? 0.92 : 0.82);
      m = mk(); cap(m, S[0], S[1], e1[0], e1[1], 2.3, 2.1); put(g, m, { f: A, s: AS, l: AL, o: INK });
      if (p.glow) line(S[0], S[1], e1[0], e1[1], function (x, y) { g.set(x, y, GLOW); });
      m = mk(); ell(m, cu[0], cu[1], 2, 2); put(g, m, { f: B, s: BS, o: INK });
      if (inPocket) pocket();
      /* drawcord with a square aglet */
      var sway = k == null ? 0 : k % 4 < 2 ? 0 : 1;
      for (var c = 0; c < 5; c++) g.set(27 + (c >= 2 ? sway : 0), 26 + c + Y, c === 4 ? (p.glow ? GLOW : MET) : B);
    }
    g.mouth = [42, 20 + Y];
    return g;
  }

  /* cached, painted poses */
  var hexCache = {};
  function hexCanvas(pose, pal, o) {
    o = o || {};
    var key = JSON.stringify(pose) + pal.id + (o.flip ? 'f' : '') + (o.flash ? '!' : '');
    var hit = hexCache[key];
    if (hit) return hit;
    var g = hex(pose), c = paint(g, document.createElement('canvas'), pal, o);
    c.mouth = g.mouth;
    return (hexCache[key] = c);
  }

  /* ───────── THE CUT: the hoodie, front or back ───────── */
  var hoodCache = {};
  function hoodie(side, mode) {
    var key = (side || 'front') + '/' + (mode || 'bayer');
    if (hoodCache[key]) return hoodCache[key];
    var W = 96, H = 108, cx = 48, g = new Grid(W, H), m, mk = function () { return new Grid(W, H); };
    var front = side !== 'back';
    var mir = function (pts) { return pts.map(function (p) { return [2 * cx - p[0], p[1]]; }); };
    var sym = function (pts) { return pts.concat(mir(pts).reverse()); };
    var th = function (x, y, t) { return mode === 'noise' ? t > 0 && (t >= 1 || hash(x, y) < t) : dither(x, y, t); };
    var fBody = function (x, y) { if (y >= 94) return x & 1 ? B : BS; return th(x, y, (y - 54) / 36) ? B : A; };
    var fSleeve = function (x, y) { if (y >= 90) return x & 1 ? B : BS; return th(x, y, (y - 50) / 36) ? B : A; };
    var sh = function (x, y, v) { return v === A ? AS : v === B ? BS : v === AL ? A : v; };
    var li = function (x, y, v) { return v === A ? AL : v === B ? BL : v; };

    if (front) {
      /* the Peak, standing up behind the neck, lined in the fade colour */
      m = mk(); poly(m, sym([[35, 31], [33, 18], [37, 8], [44, 2.5], [48, 1.5]])); put(g, m, { f: A, s: sh, l: li, o: INK, sw: 2 });
      m = mk(); poly(m, sym([[39.5, 31], [38, 19], [41, 11], [48, 7.5]]));
      put(g, m, { f: function (x, y) { return dither(x, y, (24 - y) / 10) ? LIN2 : LIN; }, o: AS });
    }
    var sl = [[27, 31], [23, 33], [17, 42], [11, 62], [7, 86], [7, 96], [18, 97], [19, 90], [21, 70], [25.5, 52], [27, 48]];
    m = mk(); poly(m, sl); put(g, m, { f: fSleeve, s: sh, l: li, o: INK, sw: 2 });
    m = mk(); poly(m, mir(sl)); put(g, m, { f: fSleeve, s: sh, l: li, o: INK, sw: 2 });
    var top = front ? [[27, 31], [39, 28.5], [48, 33.5], [57, 28.5], [69, 31]] : [[27, 31], [39, 28.5], [48, 27.5], [57, 28.5], [69, 31]];
    m = mk(); poly(m, top.concat([[71, 50], [71.5, 100], [24.5, 100], [25, 50]])); put(g, m, { f: fBody, s: sh, l: li, o: INK, sw: 2 });

    var crease = function (x0, y0, x1, y1) {
      [1, -1].forEach(function (side) {
        line(side > 0 ? x0 : 2 * cx - 1 - x0, y0, side > 0 ? x1 : 2 * cx - 1 - x1, y1, function (x, y) { var v = g.get(x, y); if (v === A || v === B) g.set(x, y, sh(x, y, v)); });
      });
    };
    crease(12, 58, 17, 61); crease(11, 65, 16, 67); crease(29, 53, 33, 59); crease(10, 76, 14, 77);

    if (front) {
      /* Step Pocket: the stair-step edges are the hand openings */
      m = mk(); poly(m, sym([[37, 66], [37, 70], [35, 70], [35, 74], [33, 74], [33, 78], [31, 78], [31, 82], [29, 82], [29, 92]]));
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
        if (!m.d[y * W + x]) continue;
        var edge = !m.d[(y - 1) * W + x] || !m.d[y * W + x - 1] || !m.d[y * W + x + 1];
        if (edge) g.set(x, y, y > 66 && y < 83 ? INK : sh(x, y, g.get(x, y)));
      }
      /* cords and square aglets */
      for (y = 33; y < 54; y++) { g.set(44, y, B); g.set(51, y, B); }
      g.set(44, 32, INK); g.set(51, 32, INK);
      for (y = 54; y < 57; y++) { g.set(43, y, MET); g.set(44, y, MET); g.set(51, y, MET); g.set(52, y, MET); }
      /* the Eye, 5 × 5 on the chest */
      ['.###.', '#...#', '#.#.#', '#...#', '.###.'].forEach(function (row, j) { for (var i = 0; i < 5; i++) if (row[i] === '#') g.set(60 + i, 44 + j, GLOW); });
    } else {
      /* the hood hangs down the back, and the Eye is 13 × 13 */
      m = mk(); poly(m, [[36, 29.5], [37, 46], [48, 57], [59, 46], [60, 29.5]]); put(g, m, { f: A, s: sh, l: li, o: INK });
      for (y = 31; y < 55; y++) g.set(48, y, AS);
      var ex, ey, dx, dy, d, on;
      for (var pass = 0; pass < 2; pass++) for (dy = -8; dy <= 8; dy++) for (dx = -8; dx <= 8; dx++) {
        var isOn = function (ax, ay) { var dd = Math.hypot(ax, ay); return (dd <= 6.5 && dd >= 4.5) || (Math.abs(ax - 1) <= 1 && Math.abs(ay) <= 1); };
        on = isOn(dx, dy); ex = 48 + dx; ey = 76 + dy;
        if (pass === 0 && !on && (isOn(dx - 1, dy) || isOn(dx + 1, dy) || isOn(dx, dy - 1) || isOn(dx, dy + 1))) g.set(ex, ey, INK);
        if (pass === 1 && on) g.set(ex, ey, GLOW);
      }
    }
    return (hoodCache[key] = g);
  }
  var hoodCanvasCache = {};
  function hoodieCanvas(pal, side) {
    var key = pal.id + (side || 'front');
    if (!hoodCanvasCache[key]) hoodCanvasCache[key] = paint(hoodie(side, pal.dither), document.createElement('canvas'), pal);
    return hoodCanvasCache[key];
  }

  /* ───────── a person in the cut: the stand-in for the on-body photographs ─────────
     The hoodie sprite with a head, hands, legs and trainers. Five people, five heights. */
  var PEOPLE = [
    { skin: '#B9794F', shade: '#8E5636', hair: '#17131C', tall: 0, cm: 172 },
    { skin: '#F1C9A5', shade: '#C99A77', hair: '#E9DFA8', tall: 6, cm: 183 },
    { skin: '#E8B98F', shade: '#BD8C66', hair: '#1B1620', tall: -6, cm: 160 },
    { skin: '#6B442E', shade: '#4A2D1D', hair: '#120E10', tall: 10, cm: 190 },
    { skin: '#D7A77E', shade: '#AC7F5B', hair: '#C9CED8', tall: -3, cm: 168 },
  ];
  var personCache = {};
  function person(pal, back) {
    var key = pal.id + (back ? 'b' : 'f');
    if (personCache[key]) return personCache[key];
    var who = PEOPLE[(pal.index || 0) % PEOPLE.length], legs = 42 + who.tall, y0 = 12, W = 96, H = y0 + 100 + legs + 8;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var x = c.getContext('2d'), ink = '#05040B';
    var blob = function (cx, cy, rx, ry, fn) {
      for (var yy = Math.floor(cy - ry); yy <= cy + ry; yy++) for (var xx = Math.floor(cx - rx); xx <= cx + rx; xx++) {
        var dx = (xx + 0.5 - cx) / rx, dy = (yy + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) { x.fillStyle = fn(xx, yy); x.fillRect(xx, yy, 1, 1); }
      }
    };
    var flat = function (col) { return function () { return col; }; };
    /* legs and trainers go behind the hem */
    var ly = y0 + 96, lb = y0 + 100 + legs;
    [[31, 46], [50, 65]].forEach(function (l) {
      x.fillStyle = ink; x.fillRect(l[0] - 1, ly, l[1] - l[0] + 2, lb - ly + 1);
      x.fillStyle = '#17151F'; x.fillRect(l[0], ly, l[1] - l[0], lb - ly);
      x.fillStyle = '#272432'; x.fillRect(l[0] + 1, ly, 2, lb - ly);
      x.fillStyle = ink; x.fillRect(l[0] - 3, lb - 1, l[1] - l[0] + 6, 8);
      x.fillStyle = '#E9ECF2'; x.fillRect(l[0] - 2, lb, l[1] - l[0] + 4, 5);
      x.fillStyle = '#AEB6C6'; x.fillRect(l[0] - 2, lb + 4, l[1] - l[0] + 4, 2);
    });
    var head = function () {
      var cy = y0 + (back ? 19 : 21);
      if (back) { x.fillStyle = who.skin; x.fillRect(44, cy + 6, 8, 8); }
      blob(48, cy, back ? 10 : 9, back ? 11.5 : 10.5, flat(ink));
      blob(48, cy, back ? 9 : 8, back ? 10.5 : 9.5, function (xx, yy) {
        if (back) return who.hair;
        if (yy < cy - 4 || (yy < cy - 1 && (xx < 43 || xx > 52))) return who.hair;
        return xx > 52 ? who.shade : who.skin;
      });
      if (!back) {
        x.fillStyle = ink; x.fillRect(44, cy + 1, 2, 2); x.fillRect(50, cy + 1, 2, 2);
        x.fillStyle = who.shade; x.fillRect(47, cy + 5, 3, 1);
      }
    };
    if (back) head();
    x.drawImage(hoodieCanvas(pal, back ? 'back' : 'front'), 0, y0);
    if (!back) head();
    [12.5, 83.5].forEach(function (hx) { blob(hx, y0 + 100.5, 5, 4.5, flat(ink)); blob(hx, y0 + 100, 4, 3.5, flat(who.skin)); });
    c.who = who;
    return (personCache[key] = c);
  }

  /* ───────── small sprites drawn straight onto a canvas ───────── */
  var MAPS = {
    item: ['....ooo....', '...oaaao...', '.oooa.aooo.', 'oaaaoaoaaao', 'oaoaaaaaoao', 'oaoaaaaaoao', 'ooobbbbbooo', '..obbbbbo..', '..ooooooo..'],
    coin: ['..ooo..', '.oyyyo.', 'oyywyyo', 'oyywyyo', 'oyywyyo', '.oyyyo.', '..ooo..'],
    alert: ['ooo', 'ogo', 'ogo', 'ogo', 'ogo', 'ooo', 'ogo', 'ooo'],
    car: [
      '............oooooooooooooo..........',
      '..........oocccccccccccccoo.........',
      '.........oowwwwwowwwwwwwcccoo.......',
      '.......ooowwwwwwowwwwwwwccccoooo....',
      '.ooooooocccccccccccccccccccccccco...',
      'ohccccccccccccccccccccccccccccccro..',
      'ohccccccccaaaaaaaaaaaaaaaaccccccro..',
      'occcccccccccccccccccccccccccccccco..',
      '.oooooooooooooooooooooooooooooooo...',
      '...oooo...................oooo......',
      '...okko...................okko......',
      '....oo.....................oo.......',
    ],
  };
  function drawMap(ctx, name, x, y, cols) {
    var map = MAPS[name];
    for (var j = 0; j < map.length; j++) for (var i = 0; i < map[j].length; i++) {
      var c = cols[map[j][i]];
      if (c) { ctx.fillStyle = c; ctx.fillRect(x + i, y + j, 1, 1); }
    }
  }

  /* ───────── the mark and the letters (SVG, crisp at any size) ───────── */
  var EYE7 = ['..###..', '.#...#.', '#.....#', '#..##.#', '#..##.#', '.#...#.', '..###..'];
  /* ───────── THE BADGE: Hex's head in his hood, in a pixel roundel ─────────
     Built from the same sprite as everywhere else, so it is always exactly him, in any palette.
     The hood's peak breaks out of the top of the ring. 44 × 44 cells; returns crisp SVG. */
  function badge(pal, o) {
    o = o || {};
    var S = 44, c = 21.5, R = 19.5, cols = lut(pal).css, grid = [], x, y, d;
    var paint = function (gx, gy, col) { if (gx >= 0 && gy >= 0 && gx < S && gy < S) grid[gy * S + gx] = col; };
    /* the disc: lit at the top, dithered down into the palette's stage colour */
    for (y = 0; y < S; y++) for (x = 0; x < S; x++) {
      d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
      if (d <= R + 2.2) grid[y * S + x] = pal.ink;
      if (d <= R + 1.2) grid[y * S + x] = pal.ui;
      if (d <= R - 0.6) grid[y * S + x] = pal.ink;
      if (d <= R - 1.6) grid[y * S + x] = dither(x, y, (y - 4) / 30) ? pal.bg : pal.bg2;
    }
    /* scan lines across the disc, like the rest of the site */
    for (y = 3; y < S; y += 4) for (x = 0; x < S; x++) {
      d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
      if (d <= R - 1.6 && (x + y) % 2) grid[y * S + x] = mix(grid[y * S + x], pal.ink, 0.35);
    }
    /* Hex, hood up, hands in the pocket, piping lit; his head centred, cropped at the chest by the ring */
    var g = hex({ walk: null, hood: 3, hands: 1, glow: true, look: [1, 0], blink: o.wink ? 2 : 0 });
    var dx = -6, dy = 0;
    for (y = 0; y < g.h; y++) for (x = 0; x < g.w; x++) {
      var v = g.d[y * g.w + x];
      if (!v) continue;
      var bx = x + dx, by = y + dy;
      d = Math.hypot(bx + 0.5 - c, by + 0.5 - c);
      /* inside the ring always; above its middle the hood may break out over the rim */
      if (d <= R - 1.6 || (by < c - 4 && d <= R + 6)) paint(bx, by, cols[v]);
    }
    /* an ink outline around whatever broke out of the ring */
    var out = grid.slice();
    for (y = 0; y < S; y++) for (x = 0; x < S; x++) {
      if (grid[y * S + x]) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (n) { var nx = x + n[0], ny = y + n[1]; return nx >= 0 && ny >= 0 && nx < S && ny < S && grid[ny * S + nx]; })) out[y * S + x] = pal.ink;
    }
    var rects = '';
    for (y = 0; y < S; y++) for (x = 0; x < S; x++) {
      var col = out[y * S + x];
      if (!col) continue;
      var x0 = x;
      while (x + 1 < S && out[y * S + x + 1] === col) x++;
      rects += '<rect x="' + x0 + '" y="' + y + '" width="' + (x - x0 + 1) + '" height="1" fill="' + col + '"/>';
    }
    return '<svg class="badge" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + S + ' ' + S + '" shape-rendering="crispEdges"' +
      (o.label === false ? ' aria-hidden="true" focusable="false"' : ' role="img" aria-label="Hex, the Kalypt chameleon"') + '>' + rects + '</svg>';
  }

  function runs(rows, cls) {
    var out = '';
    rows.forEach(function (row, y) {
      for (var x = 0; x < row.length; x++) {
        if (row[x] === '.' || row[x] === ' ') continue;
        var x0 = x, ch = row[x];
        while (x + 1 < row.length && row[x + 1] === ch) x++;
        out += '<rect class="' + (cls[ch] || '') + '" x="' + x0 + '" y="' + y + '" width="' + (x - x0 + 1) + '" height="1"/>';
      }
    });
    return out;
  }
  function mark() {
    return '<svg class="mark" viewBox="0 0 7 7" shape-rendering="crispEdges" aria-hidden="true" focusable="false" fill="currentColor">' + runs(EYE7, {}) + '</svg>';
  }
  var GLYPH = {
    K: ['##...##', '##..##.', '##.##..', '####...', '###....', '####...', '##.##..', '##..##.', '##...##'],
    A: ['.#####.', '#######', '##...##', '##...##', '#######', '#######', '##...##', '##...##', '##...##'],
    L: ['##.....', '##.....', '##.....', '##.....', '##.....', '##.....', '##.....', '#######', '#######'],
    Y: ['##...##', '##...##', '##...##', '.##.##.', '..###..', '..###..', '..###..', '..###..', '..###..'],
    P: ['######.', '#######', '##...##', '##...##', '#######', '######.', '##.....', '##.....', '##.....'],
    T: ['#######', '#######', '..###..', '..###..', '..###..', '..###..', '..###..', '..###..', '..###..'],
  };
  /* the wordmark; with fade it dithers from --wm-a into --wm-b across its lower half, like the hoodies */
  function wordmark(o) {
    o = o || {};
    var word = 'KALYPT', cellsW = word.length * 8 - 1, rows = [];
    for (var y = 0; y < 18; y++) {
      var row = '';
      for (var x = 0; x < cellsW * 2; x++) {
        var cx = x >> 1, cy = y >> 1, li = Math.floor(cx / 8), col = cx % 8;
        var on = col < 7 && GLYPH[word[li]][cy][col] === '#';
        row += !on ? '.' : o.fade && dither(x, y, (y - 7) / 10) ? 'b' : 'a';
      }
      rows.push(row);
    }
    return '<svg class="wordmark" viewBox="0 0 ' + cellsW * 2 + ' 18" shape-rendering="crispEdges" aria-hidden="true" focusable="false">' + runs(rows, { a: 'wm-a', b: 'wm-b' }) + '</svg>';
  }

  /* a dithered band from colour a (top) to colour b (bottom), as a tiling image */
  var seamCache = {};
  function seam(a, b) {
    var key = a + b;
    if (seamCache[key]) return seamCache[key];
    var c = document.createElement('canvas');
    c.width = 4; c.height = 16;
    var ctx = c.getContext('2d');
    for (var y = 0; y < 16; y++) for (var x = 0; x < 4; x++) { ctx.fillStyle = dither(x, y, (y + 0.5) / 16) ? b : a; ctx.fillRect(x, y, 1, 1); }
    return (seamCache[key] = c.toDataURL());
  }

  /* a stage backdrop: the palette's dark colour with a dithered pool of its lighter one, as a stretchable image */
  var glowCache = {};
  function glow(p, cx) {
    var key = p.id + (cx || 0.32);
    if (glowCache[key]) return glowCache[key];
    var c = document.createElement('canvas');
    c.width = 96; c.height = 54;
    var x = c.getContext('2d');
    for (var y = 0; y < 54; y++) for (var i = 0; i < 96; i++) {
      var d = Math.hypot((i - 96 * (cx || 0.32)) / 96, ((y - 30) / 54) * 0.62);
      x.fillStyle = dither(i, y, 1.05 - d * 2.9) ? p.bg2 : p.bg;
      x.fillRect(i, y, 1, 1);
    }
    return (glowCache[key] = c.toDataURL());
  }

  /* ───────── THE CITY ───────── */
  var SKY = ['#05040B', '#0F0A2A', '#2A1259', '#4B1E78'];
  var C = { far: '#1A1442', mid: '#100B26', edge: '#241A4E', dark: '#191236', warm: '#FFC86B', cyan: '#39E6FF', yel: '#FFD23F', side: '#1B1638', curb: '#3A3270', road: '#0A0815', dash: '#3B3566' };
  var FAR_H = 170, MID_H = 124, NEAR_H = 72, ROAD_H = 14, TW = 256, NW = 320;
  function cv(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  function City(seed) { this.seed = seed || 11; this.cache = {}; this.sky = null; this.far = null; this.stars = null; this.moon = null; }

  City.prototype.buildFar = function () {
    var c = cv(TW, FAR_H), x = c.getContext('2d'), r = rng(this.seed), px = 0, win = ['#3B2F7A', '#3B2F7A', '#6A4BC4', '#8A6A3A'];
    while (px < TW) {
      var w = 12 + ((r() * 20) | 0), h = r() < 0.4 ? 90 + ((r() * 75) | 0) : 35 + ((r() * 50) | 0);
      if (px + w > TW) w = TW - px;
      x.fillStyle = C.far; x.fillRect(px, FAR_H - h, w - 1, h);
      if (r() < 0.5 && w > 8) x.fillRect(px + 2, FAR_H - h - 5, w - 5, 5);
      if (r() < 0.4 && w > 6) { x.fillRect(px + (w >> 1), FAR_H - h - 16, 1, 16); x.fillStyle = '#FF3B5C'; x.fillRect(px + (w >> 1), FAR_H - h - 17, 1, 1); }
      for (var yy = FAR_H - h + 3; yy < FAR_H - 4; yy += 4) for (var xx = px + 2; xx < px + w - 3; xx += 3) if (r() < 0.14) { x.fillStyle = win[(r() * 4) | 0]; x.fillRect(xx, yy, 1, 2); }
      px += w + ((r() * 3) | 0);
    }
    return c;
  };

  City.prototype.buildMid = function (pal) {
    var c = cv(TW, MID_H), x = c.getContext('2d'), r = rng(this.seed + 1), px = 0, n = 0;
    var neon = [pal.ui, C.cyan, C.yel, pal.glow], lit = [C.warm, C.warm, C.cyan, pal.ui];
    var sign = function (sx, sy, sw, shh, col) {
      x.fillStyle = '#07050F'; x.fillRect(sx - 1, sy - 1, sw + 2, shh + 2);
      x.fillStyle = col; x.fillRect(sx - 1, sy - 1, sw + 2, 1); x.fillRect(sx - 1, sy + shh, sw + 2, 1); x.fillRect(sx - 1, sy, 1, shh); x.fillRect(sx + sw, sy, 1, shh);
      for (var gy = sy + 1; gy + 3 < sy + shh; gy += 5) for (var b = 0; b < 9; b++) if (r() < 0.6) x.fillRect(sx + 1 + (b % 3) + ((sw - 5) >> 1), gy + ((b / 3) | 0), 1, 1);
    };
    while (px < TW) {
      var w = 26 + ((r() * 28) | 0), h = 46 + ((r() * 70) | 0);
      if (px + w > TW) w = TW - px;
      if (w < 10) break;
      var top = MID_H - h;
      x.fillStyle = C.mid; x.fillRect(px, top, w - 2, h);
      x.fillStyle = C.edge; x.fillRect(px, top, 1, h); x.fillRect(px, top, w - 2, 1);
      if (r() < 0.5) { x.fillStyle = C.mid; x.fillRect(px + 4 + ((r() * 6) | 0), top - 4, 6, 4); }
      for (var yy = top + 5; yy < MID_H - 16; yy += 6) for (var xx = px + 3; xx < px + w - 6; xx += 5) {
        var q = r();
        if (q < 0.22) { x.fillStyle = lit[(r() * 4) | 0]; x.fillRect(xx, yy, 3, 3); }
        else if (q < 0.55) { x.fillStyle = C.dark; x.fillRect(xx, yy, 3, 3); }
      }
      if (r() < 0.75 && w > 20) {
        var sw = Math.min(w - 8, 14 + ((r() * 8) | 0)), col = neon[(r() * 4) | 0];
        x.fillStyle = '#1E1640'; x.fillRect(px + 3, MID_H - 11, sw, 11);
        x.fillStyle = mix(col, C.mid, 0.55); x.fillRect(px + 4, MID_H - 10, sw - 2, 7);
        x.fillStyle = col; x.fillRect(px + 2, MID_H - 13, sw + 2, 2);
      }
      if (w >= 30 && r() < 0.7) sign(px + w - 10, top + 8 + ((r() * 10) | 0), 6, 16 + ((r() * 14) | 0), neon[(r() * 4) | 0]);
      if (n === 2 && w >= 24) {
        /* the brand's billboard: the Eye, in this palette */
        var bx = px + 3, by = top - 15;
        x.fillStyle = '#07050F'; x.fillRect(bx, by, 17, 13);
        x.fillStyle = pal.ui; x.fillRect(bx, by, 17, 1); x.fillRect(bx, by + 12, 17, 1); x.fillRect(bx, by, 1, 13); x.fillRect(bx + 16, by, 1, 13);
        x.fillRect(bx + 3, by + 13, 1, 2); x.fillRect(bx + 13, by + 13, 1, 2);
        EYE7.forEach(function (row, j) { for (var i = 0; i < 7; i++) if (row[i] === '#') x.fillRect(bx + 5 + i, by + 3 + j, 1, 1); });
      }
      px += w + ((r() * 2) | 0); n++;
    }
    return c;
  };

  City.prototype.buildNear = function (pal) {
    var c = cv(NW, NEAR_H), x = c.getContext('2d'), h = NEAR_H;
    /* cables with small hanging lights */
    x.fillStyle = '#17123A';
    [[0, 160, 10], [160, 320, 8], [0, 320, 15]].forEach(function (s) {
      for (var i = s[0]; i < s[1]; i++) { var t = (i - s[0]) / (s[1] - s[0]); x.fillRect(i, Math.round(5 + s[2] * 4 * t * (1 - t)), 1, 1); }
    });
    [[52, pal.ui], [118, C.cyan], [236, pal.glow], [286, C.yel]].forEach(function (l) {
      var t = (l[0] % 160) / 160, y = Math.round(5 + 9 * 4 * t * (1 - t));
      x.fillStyle = '#17123A'; x.fillRect(l[0], y, 1, 3);
      x.fillStyle = l[1]; x.fillRect(l[0] - 1, y + 3, 3, 4);
    });
    /* lamp posts with a dithered cone of light */
    [36, 206].forEach(function (lx) {
      x.fillStyle = '#2A2350'; x.fillRect(lx, h - 46, 1, 46); x.fillRect(lx, h - 46, 7, 1); x.fillRect(lx - 1, h - 3, 3, 3);
      x.fillStyle = '#FFF3C4'; x.fillRect(lx + 5, h - 45, 3, 2);
      x.fillStyle = 'rgba(255,214,140,0.3)';
      for (var yy = h - 43; yy < h; yy++) { var half = (yy - (h - 43)) * 0.36 + 1; for (var xx = Math.floor(lx + 6 - half); xx <= lx + 6 + half; xx++) if (dither(xx, yy, 0.3)) x.fillRect(xx, yy, 1, 1); }
    });
    /* vending machine */
    x.fillStyle = '#1D1740'; x.fillRect(108, h - 19, 12, 19);
    x.fillStyle = '#39E6FF'; x.fillRect(109, h - 18, 10, 1);
    x.fillStyle = '#12485A'; x.fillRect(109, h - 17, 10, 9);
    [pal.ui, C.yel, '#FFFFFF', pal.glow].forEach(function (col, i) { x.fillStyle = col; x.fillRect(110 + i * 2 + (i > 1 ? 1 : 0), h - 16, 1, 2); x.fillRect(110 + i * 2 + (i > 1 ? 1 : 0), h - 12, 1, 2); });
    x.fillStyle = '#0A0815'; x.fillRect(110, h - 6, 8, 3);
    x.fillStyle = 'rgba(57,230,255,0.25)'; for (var gx = 104; gx < 124; gx++) for (var gy = h - 3; gy < h; gy++) if (dither(gx, gy, 0.4)) x.fillRect(gx, gy, 1, 1);
    /* hydrant, bin, bollards */
    x.fillStyle = '#3A3270'; x.fillRect(160, h - 6, 3, 6); x.fillRect(159, h - 4, 5, 1); x.fillRect(160, h - 7, 3, 1);
    x.fillStyle = '#201A44'; x.fillRect(262, h - 9, 7, 9); x.fillStyle = '#2F2760'; x.fillRect(261, h - 10, 9, 2);
    x.fillStyle = '#2A2350'; [74, 82, 300].forEach(function (bx) { x.fillRect(bx, h - 5, 2, 5); });
    x.fillStyle = pal.ui; [74, 82, 300].forEach(function (bx) { x.fillRect(bx, h - 5, 2, 1); });
    return c;
  };

  City.prototype.buildRoad = function (pal) {
    var c = cv(TW, ROAD_H), x = c.getContext('2d'), r = rng(this.seed + 3), i;
    x.fillStyle = C.side; x.fillRect(0, 0, TW, 3);
    x.fillStyle = '#141030'; for (i = 0; i < TW; i += 8) x.fillRect(i, 0, 1, 3);
    x.fillStyle = C.curb; x.fillRect(0, 3, TW, 1);
    x.fillStyle = C.road; x.fillRect(0, 4, TW, ROAD_H - 4);
    x.fillStyle = C.dash; for (i = 0; i < TW; i += 32) x.fillRect(i, 9, 10, 1);
    var cols = [pal.ui, C.cyan, C.warm, pal.glow];
    for (i = 0; i < 34; i++) {
      var xx = (r() * TW) | 0, len = 3 + ((r() * 6) | 0);
      x.fillStyle = cols[(r() * 4) | 0];
      x.globalAlpha = 0.55;
      for (var yy = 5; yy < 5 + len && yy < ROAD_H; yy++) if ((xx + yy) & 1) x.fillRect(xx, yy, 1 + ((r() * 2) | 0), 1);
      x.globalAlpha = 1;
    }
    return c;
  };

  City.prototype.layers = function (pal) {
    if (!this.far) this.far = this.buildFar();
    if (!this.cache[pal.id]) this.cache[pal.id] = { mid: this.buildMid(pal), near: this.buildNear(pal), road: this.buildRoad(pal) };
    return this.cache[pal.id];
  };

  City.prototype.buildSky = function (W, H) {
    var h = H + 60, c = cv(W, h), x = c.getContext('2d'), im = x.createImageData(W, h), px = new Uint32Array(im.data.buffer);
    var stops = [0, 0.42, 0.8, 1], cols = SKY.map(function (s) { var v = rgb(s); return (255 << 24) | (v[2] << 16) | (v[1] << 8) | v[0]; });
    for (var y = 0; y < h; y++) {
      var t = y / (h - 1), s = t < stops[1] ? 0 : t < stops[2] ? 1 : 2, lt = (t - stops[s]) / (stops[s + 1] - stops[s]);
      for (var i = 0; i < W; i++) px[y * W + i] = dither(i, y, lt) ? cols[s + 1] : cols[s];
    }
    x.putImageData(im, 0, 0);
    var r = rng(this.seed + 9);
    this.stars = [];
    for (var n = 0; n < Math.round((W * H) / 260); n++) this.stars.push([(r() * W) | 0, (r() * h * 0.62) | 0, (r() * 12) | 0, r() < 0.2]);
    /* the moon: a pale disc with a dithered shadow side */
    var m = cv(34, 34), mx = m.getContext('2d');
    for (var my = 0; my < 34; my++) for (var mi = 0; mi < 34; mi++) {
      var d = Math.hypot(mi - 16.5, my - 16.5);
      if (d < 11) { var shade = (mi - 16.5) * -0.6 + (my - 16.5) * 0.35; mx.fillStyle = dither(mi, my, (shade + 3) / 9) ? '#9A8FD6' : '#EDE7FF'; mx.fillRect(mi, my, 1, 1); }
      else if (d < 16 && dither(mi, my, (16 - d) / 14)) { mx.fillStyle = '#5A3FA8'; mx.fillRect(mi, my, 1, 1); }
    }
    mx.fillStyle = '#C9C0F0'; [[13, 12], [19, 15], [15, 20], [20, 9]].forEach(function (p) { mx.fillRect(p[0], p[1], 2, 1); });
    this.moon = m;
    return c;
  };

  /* o: { camX, camY, tick, pal, rain 0–1 } */
  City.prototype.draw = function (ctx, W, H, o) {
    if (!this.sky || this.sky.width !== W || this.sky.height !== H + 60) this.sky = this.buildSky(W, H);
    var L = this.layers(o.pal), camX = o.camX || 0, camY = o.camY || 0, tick = o.tick || 0, i;
    var off = Math.max(0, Math.min(60, camY * 0.4));
    ctx.drawImage(this.sky, 0, -60 + off);
    for (i = 0; i < this.stars.length; i++) {
      var s = this.stars[i], on = ((tick >> 2) + s[2]) % 12;
      if (on === 0) continue;
      ctx.fillStyle = s[3] ? '#FFFFFF' : on < 3 ? '#5B4FA0' : '#9C92E0';
      ctx.fillRect(s[0], s[1] - 60 + off + Math.round(camY * 0.12), 1, 1);
    }
    ctx.drawImage(this.moon, Math.round(W * 0.84) - 17, Math.round(Math.min(H * 0.16, 30) - 17 + camY * 0.2 + off * 0.2));
    var base = H - ROAD_H;
    var tile = function (img, w, fx, y) {
      var x0 = -(((camX * fx) % w) + w) % w;
      for (var x = Math.round(x0); x < W; x += w) ctx.drawImage(img, x, Math.round(y));
    };
    tile(this.far, TW, 0.2, base - FAR_H + camY * 0.45);
    tile(L.mid, TW, 0.5, base - MID_H + camY * 0.8);
    tile(L.near, NW, 1, base - NEAR_H + camY);
    tile(L.road, TW, 1, base + camY);
    if (o.rain > 0) {
      var n = Math.round(((W * H) / 420) * o.rain);
      ctx.fillStyle = 'rgba(170,180,255,0.5)';
      for (i = 0; i < n; i++) {
        var rx = Math.floor(hash(i, 3) * (W + 40) - tick * 1.5 - i * 7) % (W + 40), ry = Math.floor(hash(i, 9) * H + tick * (7 + hash(i, 5) * 4)) % H;
        if (rx < 0) rx += W + 40;
        ctx.fillRect(rx, ry, 1, 2); ctx.fillRect(rx - 1, ry + 2, 1, 2);
      }
    }
  };
  City.ROAD = ROAD_H;

  root.KP_PIX = {
    badge: badge,
    mix: mix, dither: dither, hash: hash, rng: rng,
    hex: hex, hexCanvas: hexCanvas, hoodie: hoodie, hoodieCanvas: hoodieCanvas, paint: paint, lut: lut, drawMap: drawMap,
    mark: mark, wordmark: wordmark, seam: seam, glow: glow, City: City, person: person, PEOPLE: PEOPLE,
    HEX: { w: HW, h: HH, foot: FOOT }, HOODIE: { w: 96, h: 108 },
  };
})(window);
