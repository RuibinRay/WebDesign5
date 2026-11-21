/*
 * KALYPT: shared behaviour for every page. The mark and letters, picture slots, dither seams, the nav,
 * the palette (one call recolours the whole page), smooth scroll, page morphs, reveals, the bag,
 * the toast, the motion setting, and Hex on the rail along the bottom of the screen.
 */
(function (root) {
  var d = document.documentElement, K = root.KALYPT, PIX = root.KP_PIX;
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var reduce = function () { return d.classList.contains('reduce'); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var smooth = function (a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  var testing = /[?&]sync\b/.test(location.search);

  /* the Eye and the letters */
  $$('[data-mark]').forEach(function (el) { el.innerHTML = PIX.mark(); });
  $$('[data-wordmark]').forEach(function (el) { el.innerHTML = PIX.wordmark({ fade: el.getAttribute('data-wordmark') === 'fade' }); });

  /* picture slots */
  root.KP_MEDIA.all();

  /* dither seams: <div class="seam" data-seam="#top,#bottom"> */
  $$('[data-seam]').forEach(function (el) {
    var c = el.getAttribute('data-seam').split(',');
    el.style.backgroundImage = 'url(' + PIX.seam(c[0], c[1]) + ')';
  });

  /* ───────── scroll: one listener, many subscribers ───────── */
  var subs = [], ticking = false;
  function frame() { ticking = false; var y = root.scrollY; for (var i = 0; i < subs.length; i++) subs[i](y); }
  function kick() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  root.addEventListener('scroll', kick, { passive: true });
  root.addEventListener('resize', kick);
  var onScroll = function (fn) { subs.push(fn); fn(root.scrollY); };

  /* a 12-frames-a-second clock for the things that move on their own (rain, stars). Off under "reduce". */
  var ticks = [], tick = 0;
  setInterval(function () {
    if (reduce() || document.hidden) return;
    tick++;
    for (var i = 0; i < ticks.length; i++) ticks[i](tick);
  }, 83);
  var onTick = function (fn) { ticks.push(fn); };

  /* ───────── the palette: one call recolours the page, the letters and Hex on the rail ───────── */
  var palId = K.current, palSubs = [];
  /* the logo, Hex in his roundel, always wears the palette of the hoodie on screen */
  var badges = $$('[data-badge]');
  function paintBadges(p) { badges.forEach(function (el) { el.innerHTML = PIX.badge(p, { label: false }); }); }
  function setPalette(id) {
    var p = K.byId[id];
    if (!p || (id === palId && d.getAttribute('data-pal') === id)) return;
    paintBadges(p);
    palId = id;
    var s = d.style;
    s.setProperty('--ui', p.ui); s.setProperty('--ui-on', p.on); s.setProperty('--glow', p.glow);
    s.setProperty('--pa', p.a); s.setProperty('--pb', p.b); s.setProperty('--bgp', p.bg); s.setProperty('--bgp2', p.bg2);
    d.setAttribute('data-pal', id);
    for (var i = 0; i < palSubs.length; i++) palSubs[i](p);
  }
  var onPalette = function (fn) { palSubs.push(fn); };

  /* ───────── nav ───────── */
  var nav = $('[data-nav]'), lastY = 0;
  if (nav) onScroll(function (y) {
    nav.classList.toggle('is-solid', y > 40);
    var down = y > lastY + 4, up = y < lastY - 4;
    if (down && y > root.innerHeight * 0.9 && !nav.classList.contains('is-open')) nav.classList.add('is-hidden');
    else if (up || y < 80) nav.classList.remove('is-hidden');
    lastY = y;
  });
  var menu = $('[data-menu]');
  if (menu) {
    menu.addEventListener('click', function () {
      var open = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', open);
      menu.setAttribute('aria-expanded', String(open));
    });
    $$('.nav__links a').forEach(function (a) { a.addEventListener('click', function () { nav.classList.remove('is-open'); menu.setAttribute('aria-expanded', 'false'); }); });
  }

  /* ───────── smooth scrolling (Lenis on desktop; off on touch, under "reduce" and under ?sync) ───────── */
  var lenis = null;
  var touch = root.matchMedia('(hover: none) and (pointer: coarse)').matches;
  function smoothOn() {
    if (lenis || reduce() || touch || testing || !root.Lenis) return;
    lenis = new root.Lenis({ autoRaf: true, lerp: 0.1, wheelMultiplier: 0.9, respectReducedMotion: false });
    lenis.on('scroll', kick);
  }
  function smoothOff() { if (lenis) { lenis.destroy(); lenis = null; } }
  smoothOn();

  var easeInOut = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  function scrollToY(y) {
    var screens = Math.abs(y - root.scrollY) / root.innerHeight;
    if (lenis) lenis.scrollTo(y, { duration: clamp(0.7 + screens * 0.08, 0.7, 2.6), easing: easeInOut });
    else root.scrollTo({ top: y, behavior: reduce() || testing ? 'instant' : 'smooth' });
  }
  function goTo(target) {
    scrollToY(target.getBoundingClientRect().top + root.scrollY);
    if (!target.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
  /* same-page anchors are handled here: a long jump plays the page past you as a fast-forward */
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href*="#"]');
    if (!a) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
    var target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;
    e.preventDefault();
    goTo(target);
    if (history.replaceState) history.replaceState(null, '', url.hash);
  });

  /* ───────── page morphs (View Transitions between pages) ─────────
     A hoodie page names its hero "hoodie-<id>" and its title "name-<id>". On the page you leave, names
     are given only to the parts of the thing you clicked, at the moment you leave, because a hoodie
     appears in several places and two elements with one name cancel the whole transition.
     A clickable group is [data-morph="<id>"]; its parts are [data-morph-part="hoodie|name"] inside it,
     or anywhere on the page with [data-morph-for="<id>"]. */
  var lastLink = null, morphed = [];
  document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a[href]'); if (a) lastLink = a; }, true);
  function nameIt(el, name, cls) { if (!el) return; el.style.viewTransitionName = name; el.style.viewTransitionClass = cls; morphed.push(el); }
  function clearMorph() { morphed.forEach(function (el) { el.style.viewTransitionName = ''; el.style.viewTransitionClass = ''; }); morphed = []; }
  function partOf(group, id, part) {
    return group.querySelector('[data-morph-part="' + part + '"]') || $('[data-morph-for="' + id + '"][data-morph-part="' + part + '"]');
  }
  function guard(t) { [t.ready, t.finished, t.updateCallbackDone].forEach(function (p) { if (p && p.catch) p.catch(function () {}); }); }
  root.addEventListener('pageswap', function (e) {
    var t = e.viewTransition;
    if (!t) return;
    guard(t);
    if (reduce()) { t.skipTransition(); return; }
    var dest = e.activation && e.activation.entry && e.activation.entry.url;
    var group = lastLink && dest && lastLink.href === dest && lastLink.closest('[data-morph]');
    if (!group) return;
    var id = group.getAttribute('data-morph');
    nameIt(partOf(group, id, 'hoodie'), 'hoodie-' + id, 'hoodie');
    nameIt(partOf(group, id, 'name'), 'name-' + id, 'name');
  });
  root.addEventListener('pagereveal', function (e) {
    var t = e.viewTransition;
    if (!t) return;
    guard(t);
    if (reduce()) t.skipTransition();
    t.finished.then(clearMorph, clearMorph);
  });
  root.addEventListener('pageshow', function (e) { if (e.persisted) setTimeout(clearMorph, 1500); });

  /* ───────── entrance reveals ───────── */
  var io = 'IntersectionObserver' in root ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }) : null;
  function watch(scope) {
    $$('.rv', scope).forEach(function (el) { if (io && !reduce() && !testing) io.observe(el); else el.classList.add('is-in'); });
  }
  watch();

  /* ───────── toast (an item-get box) ───────── */
  var toastEl = $('[data-toast]'), toastT;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, 3400);
  }

  /* ───────── the bag (front end only: kept in this browser) ───────── */
  var KEY = 'kalypt.bag';
  function readBag() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function paintBag(bump) {
    var n = readBag().length;
    $$('[data-bag-count]').forEach(function (c) {
      c.textContent = (n < 10 ? '0' : '') + n;
      if (bump) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
    });
  }
  function addToBag(item) {
    var list = readBag();
    list.push(item);
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
    paintBag(true);
    /* js/bag.js opens the inventory drawer on this */
    try { root.dispatchEvent(new CustomEvent('kalypt:bag-add', { detail: item })); } catch (e) {}
  }
  paintBag(false);
  /* the Bag button opens the inventory drawer (js/bag.js) */

  /* ───────── Hex on the rail: he walks the page with you, one frame every few pixels ───────── */
  var rail = null, railOff = null;
  if (document.body.hasAttribute('data-rail')) {
    rail = document.createElement('div');
    rail.className = 'rail';
    rail.setAttribute('aria-hidden', 'true');
    rail.innerHTML = '<i class="rail__line"></i><i class="rail__done"></i><canvas class="rail__hex" width="48" height="51"></canvas>';
    document.body.appendChild(rail);
    var rc = rail.querySelector('canvas'), rx = rc.getContext('2d'), rY = root.scrollY, phase = 0, dir = 1, acc = 0, idleT = 0;
    var drawRail = function (walk) {
      var src = PIX.hexCanvas({ walk: walk, hood: 3, glow: true, hands: walk == null ? 1 : 0 }, K.byId[palId], { flip: dir < 0 });
      rx.clearRect(0, 0, 48, 51);
      rx.drawImage(src, 0, 0);
    };
    onScroll(function (y) {
      var max = d.scrollHeight - root.innerHeight, dy = y - rY;
      rY = y;
      if (dy) {
        dir = dy > 0 ? 1 : -1;
        acc += Math.abs(dy);
        if (acc >= 22) { phase = (phase + Math.floor(acc / 22)) & 7; acc %= 22; }
        drawRail(phase);
        clearTimeout(idleT);
        idleT = setTimeout(function () { drawRail(null); }, 240);
      }
      rail.style.setProperty('--p', (max > 0 ? clamp(y / max, 0, 1) : 0).toFixed(4));
      rail.classList.toggle('is-off', !!(railOff && railOff(y)));
    });
    onPalette(function () { drawRail(null); });
    drawRail(null);
  }

  /* ───────── motion setting ───────── */
  var mb = $('[data-motion-toggle]');
  function paintMotion() { if (mb) { mb.textContent = reduce() ? 'Full motion' : 'Reduce motion'; mb.setAttribute('aria-pressed', String(reduce())); } }
  if (mb) mb.addEventListener('click', function () {
    d.classList.toggle('reduce');
    try { localStorage.setItem('kalypt.motion', reduce() ? 'reduce' : 'full'); } catch (e) {}
    if (reduce()) smoothOff(); else smoothOn();
    paintMotion();
    $$('.rv').forEach(function (el) { el.classList.add('is-in'); });
    kick();
  });
  paintMotion();

  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  root.KP_UI = {
    $: $, $$: $$, onScroll: onScroll, onTick: onTick, kick: kick, clamp: clamp, smooth: smooth, reduce: reduce, testing: testing,
    toast: toast, addToBag: addToBag, paintBag: paintBag, watch: watch, goTo: goTo, scrollToY: scrollToY,
    setPalette: setPalette, onPalette: onPalette, palette: function () { return K.byId[palId]; },
    setRailOff: function (fn) { railOff = fn; kick(); },
    esc: function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); },
  };
  setPalette(palId);
})(window);
