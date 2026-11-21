/*
 * KALYPT: picture slots.
 *
 *   <figure class="slot" data-shot="pink-front"></figure>
 *   <figure class="slot slot--fill" data-shot="city-hero" data-shot-m="city-hero-m"></figure>
 *
 * If the shot id is listed in assets/img/ready.js (written by higgsfield/optimize.mjs), the slot loads
 * assets/img/<id>.webp (and <id>-sm.webp for small screens). If not, it draws the pixel version of the
 * same picture in code (the hoodie sprite, the street with Hex, the sky, the dither) and says which
 * render belongs there. Nothing ever shows as a broken image.
 */
(function (root) {
  var K = root.KALYPT, SHOTS = root.KALYPT_SHOTS, PIX = root.KP_PIX;
  var READY = root.KALYPT_READY || { img: [], video: [] };
  var img = {}, cut = {};
  (READY.cut || []).forEach(function (id) { cut[id] = 1; });
  (READY.img || []).forEach(function (id) { img[id] = 1; });

  var ratio = function (a) { var p = a.split(':'); return p[0] + ' / ' + p[1]; };
  var backdrop = function (s) { var m = s.prompt.match(/Backdrop:[^#]*(#[0-9A-Fa-f]{6})/); return m ? m[1] : null; };
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var city = null;

  /* the pixel stand-in for a shot */
  function art(s) {
    var pal = K.byId[s.pal] || K.PALETTES[0], a = s.aspect.split(':'), wide = +a[0] / +a[1];
    var c = document.createElement('canvas'), x, W, H;
    c.className = 'slot__art';
    /* a studio backdrop: the shot's own colour, with a dithered pool of light */
    var studio = function () {
      var bg = backdrop(s) || pal.bg2, dark = PIX.mix(bg, '#000000', 0.35);
      for (var y = 0; y < H; y++) for (var i = 0; i < W; i++) {
        var d = Math.hypot((i - W / 2) / W, (y - H * 0.45) / H);
        x.fillStyle = PIX.dither(i, y, 1.25 - d * 2.6) ? bg : dark;
        x.fillRect(i, y, 1, 1);
      }
    };
    if (s.art === 'front' || s.art === 'back') {
      H = wide > 1 ? 136 : 150; W = Math.round(H * wide);
      c.width = W; c.height = H; x = c.getContext('2d');
      studio();
      x.drawImage(PIX.hoodieCanvas(pal, s.art), Math.round((W - 96) / 2), Math.round((H - 108) / 2));
    } else if (s.art === 'person' || s.art === 'person-back' || s.art === 'person-hood') {
      /* on-body shots: the pixel person in this palette, full length or cropped to the waist */
      var pc = PIX.person(pal, s.art === 'person-back'), close = s.art === 'person-hood';
      H = close ? 122 : pc.height + 24; W = Math.round(H * wide);
      c.width = W; c.height = H; x = c.getContext('2d');
      studio();
      x.drawImage(pc, Math.round((W - 96) / 2), close ? 4 : 12);
    } else if (s.art === 'street' || s.art === 'sky') {
      H = wide > 1 ? 100 : wide < 0.7 ? 190 : 130; W = Math.round(H * wide);
      c.width = W; c.height = H; x = c.getContext('2d');
      city = city || new PIX.City(11);
      city.draw(x, W, H, { camX: pal.index * 73, camY: s.art === 'sky' ? 150 : 0, tick: 7, pal: pal, rain: 1 });
      if (s.art === 'street') {
        var h = PIX.hexCanvas({ walk: null, hood: 3, hands: 1, glow: true }, pal);
        x.drawImage(h, Math.round(W * 0.5 - 26), H - PIX.City.ROAD + 2 - PIX.HEX.foot);
      }
    } else if (s.art === 'item') {
      H = 150; W = Math.round(H * wide);
      c.width = W; c.height = H; x = c.getContext('2d');
      studio();
      x.drawImage(PIX.itemCanvas(K.itemById[s.item], pal), Math.round((W - 96) / 2), Math.round((H - 108) / 2));
    } else if (s.art === 'hex') {
      c.width = 72; c.height = 72; x = c.getContext('2d');
      for (var yy = 0; yy < 72; yy++) for (var xx = 0; xx < 72; xx++) { x.fillStyle = PIX.dither(xx, yy, 1.1 - Math.hypot(xx - 36, yy - 40) / 34) ? '#3A2466' : '#2A1848'; x.fillRect(xx, yy, 1, 1); }
      x.drawImage(PIX.hexCanvas({ walk: null, hood: 3, glow: true }, pal), 12, 12);
    } else {
      W = 64; H = Math.round(64 / wide);
      c.width = W; c.height = H; x = c.getContext('2d');
      for (var dy = 0; dy < H; dy++) for (var dx = 0; dx < W; dx++) { x.fillStyle = PIX.dither(dx, dy, (dy - 3) / (H - 6)) ? pal.b : pal.a; x.fillRect(dx, dy, 1, 1); }
    }
    return c;
  }

  function pending(el, s) {
    el.classList.add('slot--pending');
    el.innerHTML = '';
    el.appendChild(art(s));
    var cap = document.createElement('figcaption');
    cap.className = 'slot__note';
    cap.innerHTML =
      '<span class="slot__tag"><b>Render pending</b><span>' + esc(s.id) + '</span><span>' + esc(s.aspect) + '</span></span>' +
      '<span class="slot__brief">' + esc(s.brief) + '</span>';
    el.appendChild(cap);
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', s.alt + ' (pixel stand-in; the photograph is not produced yet)');
  }

  function picture(el, s, sm) {
    var p = document.createElement('picture');
    if (sm) {
      var src = document.createElement('source');
      src.media = '(max-width: 700px) and (orientation: portrait)';
      src.srcset = 'assets/img/' + sm.id + '-sm.webp 900w, assets/img/' + sm.id + '-md.webp 1400w, assets/img/' + sm.id + '.webp 2000w';
      src.sizes = '100vw';
      p.appendChild(src);
    }
    var i = document.createElement('img');
    i.alt = s.alt;
    i.decoding = 'async';
    /* a film's two stills are needed the moment its stage pins, so they never load lazily */
    var still = el.classList.contains('film__still');
    if (s.priority) { i.loading = 'eager'; i.setAttribute('fetchpriority', 'high'); } else i.loading = still ? 'eager' : 'lazy';
    /* the address goes on last: an image that has its src before loading=lazy is fetched at once */
    i.sizes = el.getAttribute('data-sizes') || '100vw';
    i.srcset = 'assets/img/' + s.id + '-sm.webp 900w, assets/img/' + s.id + '-md.webp 1400w, assets/img/' + s.id + '.webp 2000w';
    i.src = 'assets/img/' + s.id + '.webp';
    if (el.dataset.focus) i.style.objectPosition = el.dataset.focus;
    /* until the photograph has arrived, its pixel version holds the place; the photograph fades in over it */
    var under = still ? null : art(s);
    var done = function () {
      el.classList.add('is-loaded');
      /* load can fire after complete was already seen, so take the stand-in once */
      var gone = under;
      under = null;
      if (gone) setTimeout(function () { if (gone.parentNode) gone.parentNode.removeChild(gone); }, 700);
    };
    i.addEventListener('load', done);
    p.appendChild(i);
    el.innerHTML = '';
    if (under) el.appendChild(under);
    el.appendChild(p);
    el.classList.add('slot--ready');
    if (i.complete && i.naturalWidth) done();
  }

  function fill(el) {
    var id = el.getAttribute('data-shot');
    var s = SHOTS && SHOTS.byId[id];
    if (!s) { el.textContent = 'Unknown shot: ' + id; return; }
    if (!el.classList.contains('slot--fill')) el.style.aspectRatio = ratio(s.aspect);
    var bg = backdrop(s);
    if (bg) el.style.setProperty('--slot-bg', bg);
    var mid = el.getAttribute('data-shot-m');
    var sm = mid && SHOTS.byId[mid] && img[mid] ? SHOTS.byId[mid] : null;
    var phone = root.matchMedia && root.matchMedia('(max-width: 700px) and (orientation: portrait)').matches;
    if (img[id]) picture(el, s, sm);
    else pending(el, phone && mid && SHOTS.byId[mid] ? SHOTS.byId[mid] : s);
  }

  root.KP_MEDIA = {
    fill: fill,
    all: function (scope) { Array.prototype.forEach.call((scope || document).querySelectorAll('[data-shot]'), fill); },
    ready: function (id) { return !!img[id]; },
    /* a studio shot with its backdrop removed (higgsfield/cutout.mjs): the garment alone, on transparency */
    cut: function (id) { return !!cut[id]; },
    cutSrc: function (id) { return 'assets/img/' + id + (root.innerWidth < 700 ? '-cut-sm' : '-cut') + '.webp'; },
  };
})(window);
