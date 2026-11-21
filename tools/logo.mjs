/*
 * KALYPT: write the logo files from the same code the site draws them with.
 *   node tools/logo.mjs   → assets/logo/
 *     hex-badge-<palette>.svg / .png (512 px)   Hex in his roundel, one per palette
 *     kalypt-lockup.svg / .png                  the badge over the KALYPT letters (Pink Noise)
 *     favicon.svg                               the Pink Noise badge, used as the site icon
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets/logo');
fs.mkdirSync(OUT, { recursive: true });
const ctx = { location: { search: '' } };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['js/data.js', 'js/pix.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
const K = ctx.KALYPT, P = ctx.KP_PIX;
const png = (svg, file, w) => sharp(Buffer.from(svg), { density: 300 }).resize({ width: w, kernel: 'nearest' }).png().toFile(file);

for (const p of K.PALETTES) {
  const svg = P.badge(p);
  fs.writeFileSync(path.join(OUT, `hex-badge-${p.id}.svg`), svg);
  await png(svg, path.join(OUT, `hex-badge-${p.id}.png`), 528);
}
const pink = K.byId.pink;
fs.copyFileSync(path.join(OUT, 'hex-badge-pink.svg'), path.join(ROOT, 'assets/favicon.svg'));

/* lockup: badge centred over the faded letters, on the brand's void */
const inner = (s) => s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
const word = P.wordmark({ fade: true }).replace('class="wordmark"', '');
const wInner = inner(word).replace(/class="wm-a"/g, 'fill="#EDEBFF"').replace(/class="wm-b"/g, `fill="${pink.ui}"`);
const lock = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 96" shape-rendering="crispEdges"><rect width="110" height="96" fill="#07060D"/>` +
  `<g transform="translate(27.5 6) scale(1.25)">${inner(P.badge(pink))}</g><g transform="translate(8 70)">${wInner}</g></svg>`;
fs.writeFileSync(path.join(OUT, 'kalypt-lockup.svg'), lock);
await png(lock, path.join(OUT, 'kalypt-lockup.png'), 1100);
console.log('  ✓', fs.readdirSync(OUT).join(' '));
