/*
 * KALYPT: the brand as data. Palettes, copy, specs and the level-1 script.
 *
 * Everything drawn in code (Hex, the hoodies, the city, the page colours) reads these palettes,
 * and so do the Higgsfield prompts in shots.js, so a colour changed here changes everywhere.
 *
 * CONCEPT VALUES: prices, weights, sizes, stats, the drop date and the queue numbers are invented
 * for the draft. Replace them before anything real ships.
 */
(function (root) {
  /* One cut, five palettes. a = upper colour, b = the colour it dithers into at the hem and cuffs. */
  var PALETTES = [
    {
      id: 'pink', n: '01', name: 'Pink Noise', a: '#33186A', b: '#FF2F8E', glow: '#FFA3D2', skin: '#FF74B4',
      ink: '#0B0616', bg: '#170A2B', bg2: '#3A0F4A', ui: '#FF2F8E', on: '#170A2B',
      aName: 'deep ultraviolet', bName: 'hot signal pink',
      line: 'The sign over the noodle bar, 02:00, still on.',
      blurb: 'Deep ultraviolet up top, dithered down into hot signal pink. The loud one.',
      district: 'Sector 01 · Neon Row', stats: { heat: 8, stealth: 6, glow: 9 }, gsm: 480, price: 128, dither: 'bayer',
    },
    {
      id: 'blue', n: '02', name: 'Blue Screen', a: '#2346FF', b: '#E8F0FF', glow: '#9CF3FF', skin: '#CFE0FF',
      ink: '#060A26', bg: '#080F3A', bg2: '#122071', ui: '#7C95FF', on: '#080F3A',
      aName: 'crash blue', bName: 'ice white',
      line: 'Every screen in the arcade, the second the power dips.',
      blurb: 'Crash blue fading to ice white. A fatal error you can wear.',
      district: 'Sector 02 · The Arcade', stats: { heat: 8, stealth: 3, glow: 7 }, gsm: 480, price: 128, dither: 'bayer',
    },
    {
      id: 'acid', n: '03', name: 'Acid Rain', a: '#27321F', b: '#B8FF3C', glow: '#E6FFA6', skin: '#B2F53A',
      ink: '#070A06', bg: '#0C120A', bg2: '#1F3312', ui: '#B8FF3C', on: '#0C120A',
      aName: 'wet asphalt', bName: 'acid lime',
      line: 'What runs off the overpass after a week of weather.',
      blurb: 'Wet asphalt soaking up acid lime from the hem. Highest glow in the range.',
      district: 'Sector 03 · Overpass', stats: { heat: 8, stealth: 7, glow: 10 }, gsm: 480, price: 128, dither: 'bayer',
    },
    {
      id: 'sodium', n: '04', name: 'Sodium', a: '#FF9A1F', b: '#3A1C0A', glow: '#FFE1A8', skin: '#FFE0A3',
      ink: '#140A04', bg: '#1E0F05', bg2: '#4A2408', ui: '#FF9A1F', on: '#1E0F05',
      aName: 'streetlamp amber', bName: 'burnt black',
      line: 'One old streetlamp nobody has swapped for LED.',
      blurb: 'Streetlamp amber burning down to black. Warm light, cold night.',
      district: 'Sector 04 · Old Town', stats: { heat: 8, stealth: 4, glow: 6 }, gsm: 480, price: 128, dither: 'bayer',
    },
    {
      id: 'static', n: '05', name: 'Static', a: '#E9ECF2', b: '#111217', glow: '#FFFFFF', skin: '#AEB6C6',
      ink: '#08090C', bg: '#15161C', bg2: '#2C2E38', ui: '#E9ECF2', on: '#15161C',
      aName: 'bone white', bName: 'dead-channel black',
      line: 'Channel 00, after everything signs off.',
      blurb: 'Bone white breaking up into black, knitted as noise instead of a grid. The quiet one, in loopback.',
      district: 'Sector 05 · Dead Channel', stats: { heat: 6, stealth: 5, glow: 4 }, gsm: 380, price: 118, dither: 'noise',
    },
  ];

  /* Hex before the hoodie: a plain veiled chameleon. */
  var WILD = { id: 'wild', name: 'Wild', a: '#2E8F62', b: '#49E08F', glow: '#C8FFD9', skin: '#49E08F', ink: '#06120C', bg: '#07060D', bg2: '#140B33', ui: '#49E08F', on: '#07060D' };

  /* Level 01: what Hex picks up, in order. `at` is the first frame of each card (see home.js for the frame script). */
  var RUN = {
    frames: 132,
    cards: [
      { at: 0, tag: 'Player 1', title: 'Hex', key: null,
        text: 'A veiled chameleon. Latin name calyptratus: the one wearing a veil. Level 1. No hoodie. Yet.' },
      { at: 14, tag: 'Item get', title: 'The Cut', key: 'cut',
        text: '480 gsm brushed-back fleece. Boxy, dropped shoulder, cropped at the hip. One cut. Everything else is palette.' },
      { at: 40, tag: 'Equip', title: 'The Peak', key: 'peak',
        text: 'A three-panel hood cut tall, the way a casque sits on a chameleon. It stands up on its own and the rain runs off the back.' },
      { at: 60, tag: 'Stash', title: 'Step Pocket', key: 'pocket',
        text: 'A kangaroo pocket with stair-step edges and a zipped cell inside. Phone, keys, loose coins.' },
      { at: 84, tag: 'Light', title: 'Pixel Piping', key: 'piping',
        text: 'Retroreflective piping along the hood edge and the sleeve. Dark until headlights find it.' },
      { at: 100, tag: 'Swap', title: 'Palette Swap', key: 'swap',
        text: 'Same sprite, new colours. One cut, five palettes. Hex changes. The cut does not.' },
    ],
    pips: [
      { key: 'cut', label: 'Cut', at: 27 }, { key: 'peak', label: 'Peak', at: 47 }, { key: 'pocket', label: 'Pocket', at: 70 },
      { key: 'piping', label: 'Piping', at: 88 }, { key: 'swap', label: 'Swap', at: 119 },
    ],
  };

  var SPECS = [
    ['Fabric', '480 gsm brushed-back cotton fleece (Static: 380 gsm loopback)'],
    ['Fit', 'Boxy, dropped shoulder, cropped at the hip'],
    ['Hood', 'The Peak: three panels, lined in the fade colour, stands on its own'],
    ['Fade', 'Jacquard-knitted dither, pixel by pixel. Knitted in, not printed on'],
    ['Pocket', 'Step Pocket: kangaroo, stair-step edges, zipped inner cell'],
    ['Piping', 'Retroreflective, hood edge and left sleeve'],
    ['Cords', 'Flat woven, square metal aglets'],
    ['Mark', 'The Eye: 5 × 5 px on the chest, 13 × 13 px on the back'],
    ['In the box', 'One Hex zip charm, palette-matched'],
    ['Care', 'Cold wash inside out. Never tumble dry a chameleon'],
  ];

  /* Sizes in centimetres, garment laid flat. */
  var SIZES = [
    { id: '01', fits: 'XS–S', chest: 61, length: 62, sleeve: 58 },
    { id: '02', fits: 'M', chest: 65, length: 65, sleeve: 60 },
    { id: '03', fits: 'L', chest: 69, length: 68, sleeve: 62 },
    { id: '04', fits: 'XL–XXL', chest: 74, length: 71, sleeve: 64 },
  ];

  /* Fit check: who wears each palette in the on-body photographs, and how the cut sits. */
  var MODELS = { pink: { cm: 172, size: '02' }, blue: { cm: 183, size: '03' }, acid: { cm: 160, size: '01' }, sodium: { cm: 190, size: '04' }, static: { cm: 168, size: '02' } };
  var FIT = [
    ['Shoulder', 'The seam sits about 6 cm down the arm. That is the boxy part.'],
    ['Hem', 'Lands at the hip bone. Cropped, not short.'],
    ['Sleeve', 'Stacks once at the wrist. The rib cuff holds it there.'],
    ['Hood up', 'The Peak adds about 9 cm. Rain runs off the back, not down your neck.'],
  ];

  var byId = {};
  PALETTES.forEach(function (p, i) { p.index = i; p.model = MODELS[p.id]; byId[p.id] = p; });

  /* The rest of the wardrobe. Every item carries the logo (Hex in his roundel) somewhere that suits it,
     and every item comes in the five palettes; `pal` is the one it is photographed in.
     `logo` is where the badge sits on the pixel stand-in: [x, y, size] in the item's 96 × 108 grid.
     CONCEPT VALUES: prices, fabrics and sizes are invented. */
  var ONE = ['One size'], SML = ['S', 'M', 'L'];
  var ITEMS = [
    { id: 'tee', cat: 'tops', name: 'Sprite Tee', pal: 'blue', price: 58, art: 'tee', logo: [36, 36, 24], sizes: ['01', '02', '03', '04'],
      line: 'The badge, big, where a band name would go.', placement: 'Screen-printed chest badge, 9 cm, in the palette colours; the KALYPT letters small across the back yoke.',
      fabric: '240 gsm heavyweight cotton jersey, boxy, dropped shoulder', fade: 'The hem dithers into the fade colour, 6 cm deep.' },
    { id: 'shell', cat: 'outer', name: 'Glitch Shell', pal: 'acid', price: 168, art: 'shell', logo: [62, 30, 12], sizes: ['01', '02', '03', '04'],
      line: 'A rain shell that is invisible until headlights find it.', placement: 'Small badge on the left chest; a 30 cm reflective badge across the back that only shows under light.',
      fabric: 'Two-layer ripstop nylon, taped seams, packable hood', fade: 'Sleeves dither into the fade colour from the elbow.' },
    { id: 'varsity', cat: 'outer', name: 'Level Up Varsity', pal: 'pink', price: 240, art: 'varsity', logo: [56, 34, 20], sizes: ['01', '02', '03', '04'],
      line: 'A baseball jacket for a team that only plays at night.', placement: 'Chenille badge patch on the left chest; KALYPT in pixel chenille letters across the back.',
      fabric: 'Wool-blend body, faux-leather sleeves, striped rib collar, cuffs and hem, pixel snaps', fade: 'The rib stripes are the fade, in four steps.' },
    { id: 'pants', cat: 'bottoms', name: 'Dead Pixel Pants', pal: 'pink', price: 118, art: 'pants', logo: [58, 26, 10], sizes: ['01', '02', '03', '04'],
      line: 'Black to the knee. Then the pixels start.', placement: 'Small woven badge on the right thigh, just under the pocket.',
      fabric: '380 gsm brushed-back fleece, relaxed straight leg, ribbed cuff', fade: 'Solid black past the knee; the palette colour knits in from the lower shin, pixel by pixel, densest at the cuff.' },
    { id: 'socks', cat: 'accessories', name: 'Bit Socks', pal: 'sodium', price: 22, art: 'socks', logo: [24, 20, 14], sizes: SML,
      line: 'Two pixels of personality, at the ankle.', placement: 'Hex knitted into the cuff, one on each sock.',
      fabric: 'Combed cotton, cushioned sole, ribbed cuff', fade: 'The toe and heel are the fade colour.' },
    { id: 'cap', cat: 'accessories', name: 'Peak Cap', pal: 'static', price: 44, art: 'cap', logo: [37, 40, 22], sizes: ONE,
      line: 'A peak for people who left the hood at home.', placement: 'Raised embroidered badge on the front panel.',
      fabric: 'Six-panel cotton twill, curved brim, pixel-stepped strap', fade: 'The underbrim is the fade, dithered.' },
    { id: 'beanie', cat: 'accessories', name: 'Casque Beanie', pal: 'blue', price: 38, art: 'beanie', logo: [40, 70, 16], sizes: ONE,
      line: 'Fold it up once. The crown still rises to a point, like a casque.', placement: 'Woven badge label stitched on the folded cuff.',
      fabric: 'Merino-acrylic rib knit, deep fold-up cuff, softly peaked crown', fade: 'The fold-up cuff dithers into the fade colour, so the colour shows when it is turned up.' },
    { id: 'tote', cat: 'accessories', name: 'Inventory Tote', pal: 'acid', price: 34, art: 'tote', logo: [30, 44, 36], sizes: ONE,
      line: 'Real-life inventory. Holds more than nine items.', placement: 'The badge printed large on the front.',
      fabric: '16 oz canvas, inside zip pocket, long handles', fade: 'The bottom 8 cm dithers into the fade colour.' },
  ];
  var CATS = [['all', 'Everything'], ['hoodies', 'Hoodies'], ['tops', 'Tees'], ['outer', 'Jackets'], ['bottoms', 'Pants'], ['accessories', 'Accessories']];
  var itemById = {};
  ITEMS.forEach(function (it) { itemById[it.id] = it; });
  /* one shop list for the store and the bag: five hoodies plus the items */
  var PRODUCTS = PALETTES.map(function (p) {
    return { id: p.id, kind: 'hoodie', cat: 'hoodies', name: p.name, pal: p.id, price: p.price, line: p.line, href: 'hoodie.html?id=' + p.id };
  }).concat(ITEMS.map(function (it) {
    return { id: it.id, kind: 'item', cat: it.cat, name: it.name, pal: it.pal, price: it.price, line: it.line, href: 'item.html?id=' + it.id };
  }));
  var productById = {};
  PRODUCTS.forEach(function (pr) { productById[pr.id] = pr; });

  var q = /[?&]id=([a-z]+)/.exec(root.location ? root.location.search : '');
  root.KALYPT = {
    name: 'KALYPT',
    PALETTES: PALETTES, WILD: WILD, byId: byId, RUN: RUN, SPECS: SPECS, SIZES: SIZES, FIT: FIT,
    ITEMS: ITEMS, itemById: itemById, CATS: CATS, PRODUCTS: PRODUCTS, productById: productById,
    current: q && byId[q[1]] ? q[1] : 'pink',
    money: function (n) { return '$' + n; },
    drop: { n: '001', date: '2027-01-16', label: '16 January 2027' },
  };
})(typeof window !== 'undefined' ? window : globalThis);
