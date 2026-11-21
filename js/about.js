/*
 * KALYPT about page: the origin film. Scroll plays Hex waking on the billboard and coming down to the street.
 *
 * Until the film exists (film-about in js/shots.js), the page plays the same story in pixels, drawn here:
 *   0.00–0.20  the camera holds high over the city; Hex sits on the rooftop, still wild green, blinking awake
 *   0.20–0.55  the camera comes down to the street while Hex walks in
 *   0.55–0.72  the hoodie lands on him, top to bottom
 *   0.72–0.82  the hood goes up
 *   0.82–1.00  he cycles through the five home palettes, then holds on Pink Noise with a wink
 */
(function (root) {
  var K = root.KALYPT, PIX = root.KP_PIX, UI = root.KP_UI, FILM = root.KP_FILM;
  var clamp = UI.clamp, smooth = UI.smooth;
  var sec = document.getElementById('origin');
  var canvas = sec.querySelector('[data-scene="about"]'), stage = canvas.parentNode, ctx = canvas.getContext('2d');
  var city = new PIX.City(23), W = 0, H = 0, q = 0, tier = 'board', tick = 0;

  function size() {
    var r = stage.getBoundingClientRect();
    var sc = Math.max(2, Math.floor(Math.min(r.width / 110, r.height / 110)));
    if (r.height > r.width * 1.3) sc = Math.max(2, Math.floor(r.width / 92));
    W = Math.ceil(r.width / sc); H = Math.ceil(r.height / sc);
    canvas.width = W; canvas.height = H;
    canvas.style.width = W * sc + 'px'; canvas.style.height = H * sc + 'px';
    ctx.imageSmoothingEnabled = false;
  }

  function draw() {
    if (tier !== 'board') return;
    var camY = 150 * (1 - smooth(0.18, 0.55, q));
    var pal = K.byId.pink, pose = { walk: null, hoodie: 0, hood: 0, hands: 0, glow: false, look: [1, 1], blink: 0 };
    var walk = clamp((q - 0.22) / 0.33, 0, 1), x0 = -50, x1 = Math.round(W * 0.42), hx = Math.round(x0 + (x1 - x0) * walk);
    if (q < 0.22) { hx = x1; pose.blink = q < 0.08 ? 2 : (q < 0.12 ? 1 : 0); }
    else if (walk < 1) pose.walk = Math.floor(walk * 24) & 7;
    var skin = K.WILD;
    if (q >= 0.55) { pose.hoodie = clamp((q - 0.55) / 0.17, 0, 1); skin = pal; }
    if (q >= 0.72) pose.hood = q >= 0.8 ? 3 : q >= 0.76 ? 2 : 1;
    if (q >= 0.82) {
      pose.glow = true; pose.hands = 1;
      var cyc = clamp((q - 0.82) / 0.14, 0, 1), i = Math.min(K.HOME.length - 1, Math.floor(cyc * K.HOME.length));
      skin = q > 0.96 ? pal : K.HOME[i];
      if (q > 0.97) pose.blink = 2;
    }
    city.draw(ctx, W, H, { camX: walk * 120, camY: camY, tick: tick, pal: skin === K.WILD ? pal : skin, rain: 0.5 });
    var gy = H - PIX.City.ROAD, hy = gy + 2 - PIX.HEX.foot + Math.round(camY);
    /* before he comes down he is a small figure on the rooftops, up in the sky band */
    if (q < 0.22) hy = Math.round(H * 0.3 + camY * 0.2) - PIX.HEX.foot;
    ctx.drawImage(PIX.hexCanvas(pose, skin), hx, hy);
  }

  size();
  FILM.create(sec, { onPaint: function (p, t) { q = p; tier = t; draw(); } });
  root.addEventListener('resize', function () { size(); draw(); });
  UI.onTick(function () { tick++; if (sec.getBoundingClientRect().bottom > 0 && sec.getBoundingClientRect().top < root.innerHeight) draw(); });
  UI.setPalette('pink');
})(window);
