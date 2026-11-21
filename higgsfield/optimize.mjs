/**
 * KALYPT: turn renders into what the site loads.
 *
 *   node higgsfield/optimize.mjs
 *
 * Reads higgsfield/renders/ (from generate.mjs, or saved there by hand from the Higgsfield app) and writes:
 *   pictures  assets/img/<id>.webp (2000 px) and <id>-sm.webp (900 px); assets/img/og.jpg from the rooftop shot
 *   films     film-<name>.mp4 → assets/film/<name>/d/0001.webp…  (1600 px wide, 12 frames a second)
 *                             → assets/film/<name>/m/0001.webp…  (720 × 1280 portrait crop for phones)
 *             The first and last frames are swapped for the sharp start and end stills, where the page rests.
 *   ready     assets/img/ready.js, the list of everything that exists; the site only asks for these
 *
 * Re-running is cheap: work is only redone when a render is newer than its output.
 * Needs `npm install` once (sharp). Films need ffmpeg (set FFMPEG_BIN if it is not on PATH).
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

sharp.cache(false); /* do not hold files open between reads and writes (Windows) */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'higgsfield/renders');
const OUT = path.join(ROOT, 'assets/img');
const VID = path.join(ROOT, 'assets/video');
const FILM = path.join(ROOT, 'assets/film');
const FPS = 12;

const ctx = {};
ctx.globalThis = ctx;
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/shots.js'), 'utf8'), ctx);
const S = ctx.KALYPT_SHOTS;
const known = new Set(S.shots.map((s) => s.id));
const newer = (a, b) => !fs.existsSync(b) || fs.statSync(a).mtimeMs > fs.statSync(b).mtimeMs;
const renders = fs.existsSync(SRC) ? fs.readdirSync(SRC).filter((f) => !/_v\d+\./.test(f)) : [];
const renderOf = (id) => renders.find((f) => f.replace(/\.[^.]+$/, '') === id && /\.(png|jpe?g|webp)$/i.test(f));
[OUT, FILM].forEach((d) => fs.mkdirSync(d, { recursive: true }));

/* ── pictures ── */
for (const file of renders.filter((f) => /\.(png|jpe?g|webp)$/i.test(f))) {
  const id = file.replace(/\.[^.]+$/, '');
  if (!known.has(id)) { console.log(`  · ${file}: not a shot id in js/shots.js, skipped`); continue; }
  const src = path.join(SRC, file), big = path.join(OUT, `${id}.webp`);
  if (!newer(src, big) && !process.env.FORCE_IMAGES && fs.existsSync(path.join(OUT, `${id}-md.webp`))) continue;
  const meta = await sharp(src).metadata();
  /* three sizes, each sharpened after shrinking (a downscale softens fine knit and dither) */
  for (const [w, suffix, q] of [[2000, '', 86], [1400, '-md', 84], [900, '-sm', 82]]) {
    await sharp(src).resize({ width: Math.min(w, meta.width), kernel: 'lanczos3' })
      .sharpen({ sigma: w < meta.width ? 0.7 : 0.4 })
      .webp({ quality: q, effort: 5, smartSubsample: true }).toFile(path.join(OUT, `${id}${suffix}.webp`));
  }
  console.log(`  ✓ ${id.padEnd(15)} ${meta.width}×${meta.height}`);
}

/* social card: the rooftop with the logo lockup (tools/logo.mjs), or the Eye if the lockup is missing */
const LOCKUP = path.join(ROOT, 'assets/logo/kalypt-lockup.png');
const hero = renderOf('city-hero');
if (hero && (newer(path.join(SRC, hero), path.join(OUT, 'og.jpg')) || (fs.existsSync(LOCKUP) && newer(LOCKUP, path.join(OUT, 'og.jpg'))))) {
  const mark =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 7 7" width="126" height="126" shape-rendering="crispEdges"><g fill="#FF2F8E">' +
    '<rect x="2" y="0" width="3" height="1"/><rect x="1" y="1" width="1" height="1"/><rect x="5" y="1" width="1" height="1"/>' +
    '<rect x="0" y="2" width="1" height="3"/><rect x="6" y="2" width="1" height="3"/><rect x="1" y="5" width="1" height="1"/>' +
    '<rect x="5" y="5" width="1" height="1"/><rect x="2" y="6" width="3" height="1"/><rect x="3" y="3" width="2" height="2"/></g></svg>';
  await sharp(path.join(SRC, hero)).resize(1200, 630, { fit: 'cover' })
    .composite([fs.existsSync(LOCKUP) ? { input: await sharp(LOCKUP).resize({ width: 380, kernel: 'nearest' }).toBuffer(), left: 64, top: 64 } : { input: Buffer.from(mark), left: 64, top: 64 }]).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(OUT, 'og.jpg'));
  console.log('  ✓ og.jpg');
}

/* ── films → scroll frames ── */
function ffmpegBin() {
  if (process.env.FFMPEG_BIN) return process.env.FFMPEG_BIN;
  if (spawnSync('ffmpeg', ['-version']).status === 0) return 'ffmpeg';
  const base = path.join(process.env.LOCALAPPDATA || '', 'Microsoft/WinGet/Packages');
  if (fs.existsSync(base)) {
    for (const d of fs.readdirSync(base).filter((n) => /ffmpeg/i.test(n))) {
      for (const sub of fs.readdirSync(path.join(base, d))) {
        const exe = path.join(base, d, sub, 'bin', 'ffmpeg.exe');
        if (fs.existsSync(exe)) return exe;
      }
    }
  }
  return null;
}
async function swapEnd(dir, still, index, w, h, focus) {
  if (!still) return;
  const meta = await sharp(still).metadata();
  const crop = h > w && meta.width > meta.height
    ? { left: Math.round((meta.width - (meta.height * w) / h) * focus), top: 0, width: Math.round((meta.height * w) / h), height: meta.height }
    : null;
  let img = sharp(still);
  if (crop) img = img.extract(crop);
  /* written beside the frame and then renamed over it: on Windows a frame that was just read cannot be written in place */
  const frame = path.join(dir, String(index).padStart(4, '0') + '.webp'), tmp = frame + '.tmp';
  await img.resize(w, h, { fit: 'cover' }).sharpen({ sigma: 0.6 }).webp({ quality: 84 }).toFile(tmp);
  fs.renameSync(tmp, frame);
}
const films = {};
const ff = S.films.some((f) => fs.existsSync(path.join(SRC, `${f.id}.mp4`))) ? ffmpegBin() : null;
for (const f of S.films) {
  const src = path.join(SRC, `${f.id}.mp4`), base = path.join(FILM, f.name);
  const stamp = path.join(base, 'd', '0001.webp');
  if (fs.existsSync(src) && newer(src, stamp)) {
    if (!ff) { console.log(`  ✗ ${f.id}: ffmpeg not found, set FFMPEG_BIN`); continue; }
    const focus = f.focus ?? 0.5;
    for (const [set, vf] of [
      ['d', `fps=${FPS},scale=1600:-2:flags=lanczos,unsharp=5:5:0.35`],
      ['m', `fps=${FPS},crop=ih*9/16:ih:(iw-ih*9/16)*${focus}:0,scale=720:1280:flags=lanczos,unsharp=5:5:0.35`],
    ]) {
      const dir = path.join(base, set);
      fs.rmSync(dir, { recursive: true, force: true });
      fs.mkdirSync(dir, { recursive: true });
      const r = spawnSync(ff, ['-v', 'error', '-y', '-i', src, '-an', '-vf', vf, '-c:v', 'libwebp', '-quality', set === 'm' ? '66' : '80', '-compression_level', '4', path.join(dir, '%04d.webp')]);
      if (r.status !== 0) { console.log(`  ✗ ${f.id} (${set}): ${String(r.stderr).slice(0, 200)}`); continue; }
      const frames = fs.readdirSync(dir).filter((n) => n.endsWith('.webp')).sort();
      const m0 = await sharp(fs.readFileSync(path.join(dir, frames[0]))).metadata();
      const st = (id) => (renderOf(id) ? path.join(SRC, renderOf(id)) : null);
      await swapEnd(dir, st(f.start), 1, m0.width, m0.height, focus);
      await swapEnd(dir, st(f.end), frames.length, m0.width, m0.height, focus);
      console.log(`  ✓ film ${f.name}/${set}  ${frames.length} frames ${m0.width}×${m0.height}`);
    }
  }
}
for (const f of S.films) {
  const count = (set) => { const d = path.join(FILM, f.name, set); return fs.existsSync(d) ? fs.readdirSync(d).filter((n) => n.endsWith('.webp')).length : 0; };
  if (count('d')) films[f.name] = { d: count('d'), m: count('m') };
}

/* ── the ready list ── */
const img = [...known].filter((id) => fs.existsSync(path.join(OUT, `${id}.webp`))).sort();
/* cut-outs from cutout.mjs: keep every one whose file exists */
const cut = [...known].filter((id) => fs.existsSync(path.join(OUT, `${id}-cut.webp`))).sort();
const video = fs.existsSync(VID) ? fs.readdirSync(VID).filter((f) => f.endsWith('.mp4')).map((f) => f.slice(0, -4)).sort() : [];
fs.writeFileSync(
  path.join(OUT, 'ready.js'),
  '/* Written by higgsfield/optimize.mjs. Lists what exists, so the site never requests a missing file. */\n' +
    `window.KALYPT_READY = ${JSON.stringify({ img, video, film: films, cut })};\n`
);
console.log(`\n  Ready: ${img.length} of ${known.size} pictures · films: ${Object.keys(films).join(', ') || 'none'}. Reload the site.\n`);
