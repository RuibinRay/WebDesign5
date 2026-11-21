# Kalypt

**Cover up.** A concept hoodie brand in cyberpunk pixels. One cut of hoodie, five palettes, and a mascot: Hex, a veiled chameleon who walks the site with you, one frame per scroll step.

The name comes from the Greek *kalyptein*, to cover. An apocalypse is an un-covering; a hood is the opposite. The veiled chameleon's Latin name, *calyptratus*, has the same root.

Everything on the site is finished except the photographs and two films, which come from Higgsfield. Until a picture exists, its place shows the pixel version of the same picture, drawn by the page.

## Run it

```
node tools/serve.mjs        → http://localhost:4182/
```

Or open the folder with any static server. There is no build step. In the Claude desktop app the launch config is called `kalypt`.

## Pages

| Page | What it is |
|---|---|
| `index.html` | Title screen, four levels, stat sheet, five street looks, the name, the drop queue |
| `store.html` | The store: every piece (5 hoodies + 8 items) with category tabs, a palette picker that recolours the whole shop, sort and rarity |
| `item.html?id=tee&pal=blue` | One template for the eight items: pick any of five palettes, see where Hex goes on it |
| `hoodie.html?id=pink` | One template for all five (`pink`, `blue`, `acid`, `sodium`, `static`). The page takes the hoodie's palette |
| `breakdown.html` | The brand taken apart: idea, name, mascot, range, type, every scroll move and why |
| `shots.html` | Every Higgsfield prompt, with copy buttons |

## What scrolling does

| Section | Scroll does | Before Higgsfield | After |
|---|---|---|---|
| Title | The camera falls from a rooftop to the street; Hex walks in | The pixel city does the descent | The film plays, breaks into bigger pixels, becomes the pixel street |
| Level 01 · Equip | Picks one of 132 frames of Hex. He finds the hoodie, the hood goes up, hands in the pocket, piping lights, palettes swap | Finished (code) | Same |
| Level 02 · Palette swap | Slides one hoodie out and the next in through a mosaic; the page, stage and Hex swap palette | Hoodie sprites | Studio photographs |
| Level 03 · The cut | Turns the hoodie front to back | The sprite spins in 16 steps | The turn film, frame by frame |
| Level 04 · On a real person | Five buttons (not scroll) swap the person and the page | Pixel people, five heights | On-body photographs |
| The rail | Hex walks along the bottom of the screen as you scroll, and turns round when you scroll up | Finished (code) | Same |

## How it is built

Plain HTML, CSS and JavaScript. No framework, no build.

| File | Job |
|---|---|
| `js/data.js` | The brand as data: five palettes, copy, specs, sizes, the Level 01 cards. Change a colour here and the sprites, the page and the prompts all change |
| `js/pix.js` | The pixel engine. Hex is built from parts (tail, legs, body, head, hood, eye, arm) so any pose is one call. The hoodie, the pixel people, the city, the mark and the letters are drawn here too. Sprites are indexed, so a palette swap is a lookup, not a redraw |
| `js/home.js` | The home page: the frame script for Level 01 (`state(f)`), the hoodie slide, the turn, the fit check |
| `js/film.js` | Scroll films with three tiers: frames, two stills, or the page's own pixel cut |
| `js/media.js` | Picture slots: the photograph if it exists, the pixel stand-in if not |
| `js/shots.js` | Every picture and film as data: prompt, model, ratio, references, stage |
| `js/common.js` | Nav, the page palette, smooth scroll, page morphs, the bag, the rail, the motion setting |
| `higgsfield/generate.mjs` | Makes the pictures and films. Plans and prices by default; spends only with `--go` |
| `higgsfield/optimize.mjs` | Turns renders into WebP and scroll frames, and writes `assets/img/ready.js` |

## Making the pictures

```
npm install                              once, for the image optimiser
node higgsfield/generate.mjs             the plan, the price of every job, the balance. Spends nothing
node higgsfield/generate.mjs --go        everything, stage 1 to 4, then the optimiser
node higgsfield/generate.mjs images --go only pictures (or: films, or any ids)
```

Everything is made (2026-11-20): all 31 pictures and both scroll films, in three batches (24 + 34.24 + 56.25 = 114.49 credits). The descent is 121 scroll frames and the turn is 61, each cut as a wide set and an upright set for phones. Running `generate.mjs` again makes nothing unless you add `--force` to re-roll something.

One thing to know: `city-hero` has one small amber shop sign with letter-like shapes on it. It is not readable, but the brief was no lettering at all. Re-rolling it means re-rolling `city-street` too, which copies it.

The full plan, priced on 2026-11-20:

| Stage | What | Jobs | Credits |
|---|---|---|---|
| 1 | Five studio masters, the city from a rooftop (wide and upright), the Hex charm | 8 | 12.24 |
| 2 | Backs, street looks, on-body fit shots, film stills, details. Each takes a stage 1 picture as reference | 21 | 42.00 |
| 3 | Two more on-body views of the same person | 2 | 4.00 |
| 4 | Two scroll films (Kling 4.0): the descent, 10 s; the turn, 5 s | 2 | 56.25 |
| | **Total** | **33** | **114.49** |

The on-body shots (`<palette>-fit`, `fit-hood`, `fit-back`) are 7 of those jobs, 14 credits. To make only them, the five masters have to exist first:

```
node higgsfield/generate.mjs pink-front blue-front acid-front sodium-front static-front --go
node higgsfield/generate.mjs pink-fit blue-fit acid-fit sodium-fit static-fit --go
node higgsfield/generate.mjs fit-hood fit-back --go
```

By hand instead: copy a prompt from `shots.html`, save the result as `higgsfield/renders/<id>.png` (films: `.mp4`), run `node higgsfield/optimize.mjs`, reload.

## To change things

- **A colour or a palette name:** `js/data.js`. The hoodie sprite, Hex, the city signs, the page accent and the prompt text all follow.
- **What Hex does on a frame:** `state(f)` in `js/home.js`. The cards and pips are in `RUN` in `js/data.js`.
- **Hex himself:** `hex()` in `js/pix.js`. Every part is a few numbers on a 48 × 51 grid.
- **A prompt:** `js/shots.js`. The look blocks at the top are shared by every prompt on purpose.

## Motion and access

Full motion by default on desktop; phones follow the system setting. The footer has a Reduce motion button, which turns off rain, blinking, smooth scroll and page transitions. Things you scroll still follow your scroll. Every pixel scene has a text equivalent for screen readers, and the hoodie slide has buttons as well as scroll.

`?sync` on any page is a testing aid for hidden browser tabs (it swaps animation frames for timers and turns smooth scroll off).

## Invented for the draft

Replace before anything is real: prices ($128, $118), fabric weights, the size chart and fit measurements, the stat bars, the model heights and sizes, Drop 001 and its date (16 January 2027), the queue number (made in your browser; nothing is sent anywhere), the arcade score line. A web search on 2026-11-20 found no hoodie brand called Kalypt, which is not a trademark clearance.

Lenis (smooth scroll) is vendored under `assets/vendor/`, MIT licence. Fonts are Pixelify Sans and Martian Mono from Google Fonts.

## Cut-outs

`node higgsfield/cutout.mjs` removes the flat studio backdrop from every `<palette>-front` and `<palette>-back` render, on this machine and for free, and writes `assets/img/<id>-cut.webp` with transparency (listed as `cut` in `ready.js`). The palette-swap slide and the hoodie page heroes use them, so the real hoodie stands on the pixel stage with no frame. Run it again after re-rolling a studio shot.
