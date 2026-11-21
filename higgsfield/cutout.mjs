/**
 * KALYPT: cut the studio hoodies out of their backdrops, for free, on this machine.
 *
 *   node higgsfield/cutout.mjs            every <palette>-front and <palette>-back render
 *   node higgsfield/cutout.mjs pink-front only these ids
 *
 * The studio shots sit on a flat paper backdrop with a soft light falloff and a soft floor shadow.
 * The backdrop is grown inward from the frame edge: a pixel joins it when it is close to the pixel it was
 * reached from (follows the gentle gradient and the shadow) and not far from the backdrop's own colour
 * (stops at the garment). The garment keeps full alpha, its rim gets a one-pixel feather.
 *
 * Writes assets/img/<id>-cut.webp (1100 px tall) and lists them in assets/img/ready.js as "cut".
 * Re-run optimize.mjs afterwards if you also re-made the renders; this script keeps ready.js's other lists.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'higgsfield/renders');
const OUT = path.join(ROOT, 'assets/img');
const PALS = ['pink', 'blue', 'acid', 'sodium', 'static', 'coolant', 'redshift', 'royal'];
const want = process.argv.slice(2);
const ITEMS = ['tee', 'shell', 'varsity', 'pants', 'socks', 'cap', 'beanie', 'tote'].map((i) => 'item-' + i);
const ids = want.length ? want : PALS.flatMap((p) => [p + '-front', p + '-back']).concat(ITEMS.filter((i) => !SKIP.includes(i)));

const STEP = 7;      /* max colour change between neighbouring backdrop pixels */
const GLOBAL = 70;   /* max distance from the backdrop's mean colour */
/* shots whose backdrop falls off hard from a lit centre to dark corners */
/* holes: shots where backdrop shows through a closed gap (the tote's handles). Off elsewhere: a print or patch
   close to the backdrop colour would be cut out as a hole (it took the badge off the tee). */
const TUNE = { 'item-tote': { holes: true } };
/* left out: the tee and the shell sit on backdrops that fall off too hard, or too close to the garment, for this
   method; the site shows their studio photo instead. A paid background removal would do them. */
const SKIP = ['item-tee', 'item-shell'];
const H = 1600;      /* output height: sharp on high-density screens at hero size */

async function cut(id) {
  const tune = TUNE[id] || {}, step = tune.step || STEP, glob = tune.global || GLOBAL;
  const file = ['png', 'jpg', 'webp'].map((e) => path.join(SRC, `${id}.${e}`)).find((f) => fs.existsSync(f));
  if (!file) { console.log(`  · ${id}: no render`); return null; }
  const { data, info } = await sharp(file).resize({ height: H }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, N = W * H;
  const px = (i) => [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]];
  const dist = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);

  /* the backdrop's colour: the mean of the frame edge */
  const edge = [];
  for (let x = 0; x < W; x++) { edge.push(x, (H - 1) * W + x); }
  for (let y = 0; y < H; y++) { edge.push(y * W, y * W + W - 1); }
  const mean = [0, 0, 0];
  edge.forEach((i) => { const c = px(i); mean[0] += c[0]; mean[1] += c[1]; mean[2] += c[2]; });
  mean.forEach((v, k) => (mean[k] = v / edge.length));

  /* grow the backdrop from the edge */
  const bg = new Uint8Array(N), queue = new Int32Array(N);
  let head = 0, tail = 0;
  edge.forEach((i) => { if (!bg[i] && dist(px(i), mean) < glob) { bg[i] = 1; queue[tail++] = i; } });
  while (head < tail) {
    const i = queue[head++], c = px(i), x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx;
      if (bg[j]) continue;
      const cj = px(j);
      if (dist(cj, c) < step && dist(cj, mean) < glob) { bg[j] = 1; queue[tail++] = j; }
    }
  }

  /* backdrop seen through holes: regions of near-backdrop colour enclosed by the garment */
  if (tune.holes) {
    const seen = new Uint8Array(N), q2 = new Int32Array(N);
    for (let s = 0; s < N; s++) {
      if (bg[s] || seen[s] || dist(px(s), mean) > glob * 0.55) continue;
      let h = 0, tl = 0;
      q2[tl++] = s; seen[s] = 1;
      while (h < tl) {
        const i = q2[h++], c = px(i), x = i % W, y = (i / W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const j = ny * W + nx;
          if (bg[j] || seen[j]) continue;
          if (dist(px(j), c) < step && dist(px(j), mean) < glob * 0.55) { seen[j] = 1; q2[tl++] = j; }
        }
      }
      /* only clear holes of some size: a small patch of backdrop colour is more likely part of the print */
      if (tl > N * 0.004) for (let k = 0; k < tl; k++) bg[q2[k]] = 1;
    }
  }

  /* keep every garment region that is a real part (a second sock), drop specks the fill missed */
  const lab = new Int32Array(N).fill(-1);
  let best = -1, bestSize = 0, label = 0;
  for (let s = 0; s < N; s++) {
    if (bg[s] || lab[s] >= 0) continue;
    let h = 0, t = 0;
    queue[t++] = s; lab[s] = label;
    while (h < t) {
      const i = queue[h++], x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        if (!bg[j] && lab[j] < 0) { lab[j] = label; queue[t++] = j; }
      }
    }
    if (t > bestSize) { bestSize = t; best = label; }
    label++;
  }

  /* alpha: garment 255, rim feathered over one pixel, everything else 0 */
  const alpha = new Uint8Array(N);
  /* region sizes, then keep any region at least 8% the size of the biggest */
  const sizes = new Int32Array(label);
  for (let i = 0; i < N; i++) if (lab[i] >= 0) sizes[lab[i]]++;
  for (let i = 0; i < N; i++) alpha[i] = lab[i] >= 0 && sizes[lab[i]] >= bestSize * 0.08 ? 255 : 0;
  const soft = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!alpha[i]) continue;
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H && alpha[ny * W + nx]) n++;
    }
    soft[i] = n === 9 ? 255 : Math.round((255 * n) / 9);
  }
  const rgba = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) { rgba[i * 4] = data[i * 3]; rgba[i * 4 + 1] = data[i * 3 + 1]; rgba[i * 4 + 2] = data[i * 3 + 2]; rgba[i * 4 + 3] = soft[i]; }

  /* crop to the garment, with a little air */
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let i = 0; i < N; i++) if (soft[i]) { const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const pad = 12;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
  const out = path.join(OUT, `${id}-cut.webp`);
  await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
    .webp({ quality: 82, alphaQuality: 90, effort: 5 }).toFile(out);
  /* a phone-sized copy, 900 px tall */
  await sharp(out).resize({ height: 900, kernel: 'lanczos3' }).sharpen({ sigma: 0.6 }).webp({ quality: 82, alphaQuality: 90, effort: 5 }).toFile(path.join(OUT, `${id}-cut-sm.webp`));
  const share = Math.round((bestSize / N) * 100);
  console.log(`  ✓ ${id.padEnd(14)} garment ${share}% of frame, ${label - 1} specks dropped`);
  return id;
}

const made = [];
for (const id of ids) { const r = await cut(id); if (r) made.push(r); }

/* add the "cut" list to ready.js, keeping everything optimize.mjs wrote */
const readyFile = path.join(OUT, 'ready.js');
const ctx = { window: {} };
new Function('window', fs.readFileSync(readyFile, 'utf8'))(ctx.window);
const ready = ctx.window.KALYPT_READY || { img: [], video: [], film: {} };
const all = new Set([...(ready.cut || []), ...made]);
ready.cut = [...all].filter((id) => fs.existsSync(path.join(OUT, `${id}-cut.webp`))).sort();
fs.writeFileSync(readyFile, '/* Written by higgsfield/optimize.mjs (and cutout.mjs for "cut"). Lists what exists, so the site never requests a missing file. */\n' +
  `window.KALYPT_READY = ${JSON.stringify(ready)};\n`);
console.log(`\n  ${ready.cut.length} cut-outs listed in ready.js\n`);
