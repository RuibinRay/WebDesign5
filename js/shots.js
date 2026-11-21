/*
 * KALYPT: every picture and film the site needs from Higgsfield, as data.
 *
 * One file feeds three things:
 *   1. the website (alt text, ratio, the brief shown in each placeholder, which pixel stand-in to draw)
 *   2. higgsfield/generate.mjs (prompt, model, aspect, reference images, stage order)
 *   3. shots.html (the shot sheet: copy a prompt into the Higgsfield app by hand)
 *
 * Consistency comes from reuse: the LOOK blocks and the hoodie description are pasted byte-identical
 * into every prompt, and the colours come from data.js, the same numbers the pixel art uses.
 *
 * Stage 1 makes each hoodie's master (studio front, no reference) and the scenes with no hoodie.
 * Stage 2 passes a stage-1 picture as the reference, so the same hoodie (or city) appears everywhere.
 * Stage 3 makes the two extra on-body views, using the stage-2 fit photograph so the same person appears.
 * Stage 4 makes the two scroll films between a start frame and an end frame.
 *
 * Plain script on purpose: the browser reads window.KALYPT_SHOTS, Node reads it through vm
 * (generate.mjs loads data.js first, so KALYPT is there).
 */
(function (root) {
  var K = root.KALYPT;

  /* ───────────── LOOK BIBLE ───────────── */

  var STUDIO =
    'Photoreal premium streetwear product photography, medium-format camera, 90mm lens, f/11, every knit loop and fibre crisp. ' +
    'The hoodie is shown on an invisible ghost mannequin, standing upright, perfectly centred and symmetrical, sleeves hanging slightly away from the body. ' +
    'One large soft key light from above and slightly camera-left, a soft contact shadow on the floor. ' +
    'Seamless matte paper backdrop and floor in one flat colour. Colour-accurate neutral grade, fine grain.';

  var CITY =
    'Photoreal cinematic night street photography, shot on ARRI Alexa 35 with anamorphic lenses, fine film grain. ' +
    'A dense, vertical near-future megacity at night just after rain: narrow streets under stacked signage, wet black asphalt with long mirror reflections, ' +
    'steam rising from vents, tangled overhead cables, vending machines glowing in doorways. ' +
    'Every sign is an abstract glowing shape or a blank light panel with no writing on it. ' +
    'Deep violet-black shadows, never crushed to pure black. Fine rain in the air, caught by the lights.';

  var BODY =
    'Photoreal fashion e-commerce photography, medium-format camera, 85mm lens, f/8, natural skin texture, nothing retouched smooth. ' +
    'One real person standing on a seamless matte paper backdrop and floor in one flat colour. ' +
    'One large soft key light from above and slightly camera-left, a soft shadow on the floor. Colour-accurate neutral grade, fine grain. ' +
    'They wear the hoodie over plain black straight-leg trousers and white chunky trainers. ' +
    'The hoodie fits oversized and boxy: the shoulder seams sit low on the upper arm, the hem lands at the hip, the sleeves stack once at the wrist.';

  var NEG = 'No text, no letters, no numbers, no logos, no brand names and no watermark anywhere in the frame.';
  var SAME = 'The hoodie is exactly the hoodie in the reference image: identical cut, colours, dither pattern and details. Do not redesign it.';

  /* ───────────── THE ONE CUT (described the same way every time; only the colours change) ───────────── */

  function hoodie(p) {
    var how = p.dither === 'noise'
      ? 'through knitted pixel noise: small random squares like television static, sparse at first and denser toward the hem'
      : 'through a knitted pixel dither: a checkerboard of small squares, sparse at first and denser toward the hem';
    return 'an oversized, boxy heavyweight fleece pullover hoodie with dropped shoulders and a body cropped at the hip; ' +
      'a tall three-panel hood that rises to a distinct point at the top, lined in ' + p.bName + '; ' +
      'a kangaroo pocket whose two side openings are cut in small square stair-steps; deep ribbed cuffs and hem; ' +
      'flat woven drawcords tipped with square silver metal aglets; a thin line of silver reflective piping along the hood edge. ' +
      'The upper half is solid ' + p.aName + ' (' + p.a + '). From mid-chest down, and from the elbows down the sleeves, it changes into ' +
      p.bName + ' (' + p.b + ') ' + how + ', until the cuffs and hem are solid ' + p.bName + '. ' +
      'A tiny embroidered motif sits on the left chest, made of square stitches: a ring with one small square dot in its exact centre, inside the ring, never outside it';
  }
  var BACK = 'Seen straight on from behind: the pointed hood hangs down the centre of the back, there is no pocket, and one large embroidered motif (a ring with one square dot in its exact centre, inside the ring, never outside it), ' +
    'made of square stitches and about a hand wide, sits between the shoulder blades.';

  /* Studio backdrop per palette: dark enough for the site, different enough from both hoodie colours. */
  var BACKDROP = {
    pink: 'smoky violet-grey (#5B4A7D)', blue: 'deep navy (#101A4A)', acid: 'slate green-grey (#5C6B55)',
    sodium: 'warm taupe (#7A5F47)', static: 'mid grey (#6E7280)',
    coolant: 'dark slate teal (#2F4F55)', redshift: 'dusty rose-grey (#6E4F55)', royal: 'muted plum (#5A4A72)',
  };

  /* What lights the street, and where the wearer stands, per palette. */
  var LIGHT = {
    coolant: 'The street is lit almost only by cold mint-cyan light (#3CF2D6) from server-room windows, with deep teal shadows.',
    redshift: 'The street is lit almost only by long red streaks of tail lights (#FF3B3B) on wet asphalt, with maroon-black shadows.',
    royal: 'The street is lit almost only by warm gold casino light (#FFC83D), with deep purple shadows.',
    pink: 'The street is lit almost only by magenta-pink sign light (#FF2F8E), with deep violet shadows.',
    blue: 'The street is lit almost only by cold electric-blue screen light (#2346FF) and ice-white panels.',
    acid: 'The street is lit almost only by acid-lime light (#B8FF3C) bouncing off wet asphalt, with grey-green shadows.',
    sodium: 'The street is lit almost only by one warm amber sodium streetlamp (#FF9A1F), with brown-black shadows.',
    static: 'The street is lit by flat white fluorescent light and the grey flicker of television static. Almost monochrome.',
  };
  var PLACE = {
    coolant: 'outside a data centre loading bay, cooling vents breathing steam',
    redshift: 'on a footbridge over a ring road, traffic streaking past below',
    royal: 'under a giant blank casino sign of gold bulbs',
    pink: 'under a wall of blank magenta signs outside a noodle bar, steam drifting past',
    blue: 'in the doorway of an arcade, rows of blank blue screens glowing behind',
    acid: 'under a concrete overpass, lime light rippling up from the puddles',
    sodium: 'beneath one old amber streetlamp on an empty corner',
    static: 'in front of a shop window stacked with old televisions showing white noise',
  };

  /* Five people, eight heights: who wears each palette in the fit photographs (heights and sizes are in data.js). */
  var WHO = {
    pink: 'a woman in her twenties, about 172 cm tall, medium-brown skin, a black bob haircut',
    blue: 'a man in his twenties, about 183 cm tall, pale skin, short bleached-blond hair',
    acid: 'a woman in her thirties, about 160 cm tall, light-tan skin, long black hair tied back',
    sodium: 'a man in his thirties, about 190 cm tall, dark-brown skin, a shaved head and a short beard',
    static: 'a person in their twenties, about 168 cm tall, olive skin, cropped silver-grey hair',
    coolant: 'a woman in her twenties, about 176 cm tall, dark-brown skin, short natural curls',
    redshift: 'a man in his twenties, about 164 cm tall, light skin, a black buzz cut',
    royal: 'a woman in her thirties, about 186 cm tall, pale freckled skin, long copper-red hair',
  };

  var gpt = function (o, quality) { o.model = 'gpt_image_2_6'; o.params = { resolution: '2k', quality: quality || 'high' }; return o; };
  var soul = function (o) { o.model = 'soul_cinematic'; o.params = { quality: '2k' }; return o; };
  var ref = function (id) { return 'higgsfield/renders/' + id + '.png'; };

  var shots = [];

  /* ── stage 1: the five masters ── */
  K.PALETTES.forEach(function (p, i) {
    shots.push(gpt({
      id: p.id + '-front', stage: 1, aspect: '4:5', pal: p.id, art: 'front', priority: i === 0,
      brief: p.name + ', front, on a ghost mannequin. The master: every other picture of this hoodie copies it.',
      alt: 'The Kalypt hoodie in ' + p.name + ': ' + p.aName + ' fading to ' + p.bName + ', seen from the front.',
      used: ['Home · palette swap', 'Hoodie page · hero', 'Reference for every ' + p.name + ' shot'],
      prompt: STUDIO + ' Seen straight on from the front, hood up behind the neck. The hoodie: ' + hoodie(p) + '. Backdrop: ' + BACKDROP[p.id] + '. ' + NEG,
    }));
  });

  /* ── stage 1: scenes with no hoodie ── */
  shots.push(soul({
    id: 'city-hero', stage: 1, aspect: '16:9', pal: 'pink', art: 'sky',
    brief: 'The city from a rooftop: towers, a huge moon, rain. First frame of the opening film.',
    alt: 'A dense night city seen from a rooftop under a full moon, in the rain.',
    used: ['Home · title screen', 'Opening film · first frame'],
    prompt: CITY + ' Wide establishing shot from a rooftop high above the city, looking across a canyon of towers under one huge pale full moon. ' +
      'Red antenna lights blink on the towers; pink and violet sign glow rises from the streets far below. No people. ' + NEG,
  }));
  shots.push(soul({
    id: 'city-hero-m', stage: 1, aspect: '9:16', pal: 'pink', art: 'sky',
    brief: 'The same rooftop view, upright, for phones.',
    alt: 'A dense night city seen from a rooftop under a full moon, in the rain.',
    used: ['Home · title screen on phones'],
    prompt: CITY + ' Tall vertical establishing shot from a rooftop high above the city, looking down a canyon of towers under one huge pale full moon in the top third. ' +
      'Red antenna lights blink on the towers; pink and violet sign glow rises from the streets far below. No people. ' + NEG,
  }));
  shots.push(gpt({
    id: 'hex-charm', stage: 1, aspect: '1:1', pal: 'pink', art: 'hex',
    brief: 'Hex as the zip charm that ships with every hoodie: a 3 cm voxel figurine.',
    alt: 'A small voxel figurine of Hex the chameleon in a violet and pink hoodie, on a zip-pull cord.',
    used: ['Home · the name', 'Hoodie page · in the box'],
    prompt: 'Photoreal macro product photograph, 100mm macro lens, shallow depth of field, soft key light from above left. ' +
      'A small collectible zip-pull charm about 3 cm tall: a chunky voxel figurine, built from tiny square blocks like 3D pixels, of a cartoon veiled chameleon standing upright on two legs. ' +
      'It has a tall pointed crest on its head, one big round turret eye, a short snout and a tail curled into a spiral. Its skin is hot pink (#FF74B4). ' +
      'It wears a tiny hooded sweatshirt, deep ultraviolet (#33186A) on top with a hot pink (#FF2F8E) hem. It hangs from a short black cord with a small metal clasp. ' +
      'Backdrop: matte dark violet (#2A1848). ' + NEG,
  }));

  /* ── stage 2: the same city, at street level (last frame of the opening film) ── */
  shots.push(gpt({
    id: 'city-street', stage: 2, aspect: '16:9', pal: 'pink', art: 'street', refs: [ref('city-hero')],
    brief: 'Street level in the same city: wet road, blank signs, one vending machine. Last frame of the opening film.',
    alt: 'A narrow wet street at night under stacked glowing signs.',
    used: ['Opening film · last frame'],
    prompt: CITY + ' ' + LIGHT.pink + ' The same city as the reference image, now at street level: the camera stands on an empty sidewalk looking down a narrow wet street. ' +
      'Stacked blank signs on both sides, one glowing vending machine in a doorway on the right, a single streetlamp, cables overhead, ' +
      'the towers from the reference rising at the end of the street under the same moon. No people. ' + NEG,
  }));

  /* ── stage 2: the turn film's two frames (wide, hoodie small in the middle) ── */
  var pink = K.byId.pink;
  shots.push(gpt({
    id: 'turn-front', stage: 2, aspect: '16:9', pal: 'pink', art: 'front', refs: [ref('pink-front')],
    brief: 'Pink Noise, front, small in a wide frame. First frame of the turn film.',
    alt: 'The Pink Noise hoodie seen from the front in a wide studio frame.',
    used: ['Home · the cut · first frame'],
    prompt: STUDIO + ' A wide frame: the hoodie stands in the exact centre and fills about two thirds of the frame height, with empty backdrop on both sides. ' +
      'Seen straight on from the front, hood up behind the neck. The hoodie: ' + hoodie(pink) + '. ' + SAME + ' Backdrop: ' + BACKDROP.pink + '. ' + NEG,
  }));
  shots.push(gpt({
    id: 'turn-back', stage: 3, aspect: '16:9', pal: 'pink', art: 'back', refs: [ref('pink-back')],
    brief: 'Pink Noise, back, same wide frame. Last frame of the turn film.',
    alt: 'The Pink Noise hoodie seen from behind in a wide studio frame, a large ring-and-dot mark on the back.',
    used: ['Home · the cut · last frame'],
    prompt: STUDIO + ' A wide frame: the hoodie stands in the exact centre and fills about two thirds of the frame height, with empty backdrop on both sides. ' +
      BACK + ' The motif is pale pink (#FFA3D2). The hoodie: ' + hoodie(pink) + '. ' + SAME + ' Backdrop: ' + BACKDROP.pink + '. ' + NEG,
  }));

  /* ── stage 2: backs and street shots, one each per palette ── */
  K.PALETTES.forEach(function (p) {
    shots.push(gpt({
      id: p.id + '-back', stage: 2, aspect: '4:5', pal: p.id, art: 'back', refs: [ref(p.id + '-front')],
      brief: p.name + ', back: the hood hanging down, the 13 px Eye between the shoulders.',
      alt: 'The Kalypt hoodie in ' + p.name + ' seen from behind, with a large ring-and-dot mark on the back.',
      used: ['Hoodie page · gallery'],
      prompt: STUDIO + ' ' + BACK + ' The motif is ' + p.glow + '. The hoodie: ' + hoodie(p) + '. ' + SAME + ' Backdrop: ' + BACKDROP[p.id] + '. ' + NEG,
    }));
    shots.push(gpt({
      id: p.id + '-city', stage: 2, aspect: '4:5', pal: p.id, art: 'street', refs: [ref(p.id + '-front')],
      brief: p.name + ' worn in ' + p.district.split(' · ')[1] + ': hood up, face in shadow, hands in the pocket.',
      alt: 'A person in the ' + p.name + ' Kalypt hoodie, hood up, standing in a neon-lit street at night.',
      used: ['Home · night shift', 'Hoodie page · gallery'],
      prompt: CITY + ' ' + LIGHT[p.id] + ' Camera at chest height, 50mm lens: one person stands ' + PLACE[p.id] + ', seen from mid-thigh up in three-quarter view, ' +
        'wearing the hoodie with the hood up. The face is completely lost in shadow inside the hood, no features visible. Both hands are in the kangaroo pocket. Black trousers. ' +
        'The hoodie: ' + hoodie(p) + '. ' + SAME + ' ' + NEG,
    }));
  });

  /* ── stage 2: on a real person, one per palette; stage 3: two more views of the same person ── */
  K.PALETTES.forEach(function (p) {
    shots.push(gpt({
      id: p.id + '-fit', stage: 2, aspect: '4:5', pal: p.id, art: 'person', refs: [ref(p.id + '-front')],
      brief: p.name + ' on a real person: ' + p.model.cm + ' cm tall, size ' + p.model.size + ', full length, hood down.',
      alt: 'A person ' + p.model.cm + ' cm tall wearing the ' + p.name + ' Kalypt hoodie in size ' + p.model.size + ', full length, facing the camera.',
      used: ['Home · on a real person', 'Hoodie page · on body'],
      prompt: BODY + ' Full length, from head to trainers. The person: ' + WHO[p.id] + '. They face the camera, relaxed, weight on one leg, both hands in the kangaroo pocket, ' +
        'hood down behind the neck, a calm neutral expression, looking into the lens. The hoodie: ' + hoodie(p) + '. ' + SAME + ' Backdrop: ' + BACKDROP[p.id] + '. ' + NEG,
    }));
  });
  shots.push(gpt({
    id: 'fit-hood', stage: 3, aspect: '4:5', pal: 'pink', art: 'person-hood', refs: [ref('pink-fit')],
    brief: 'Hood up on a real person, waist up: the Peak standing above the head, face visible.',
    alt: 'A woman wearing the Pink Noise hoodie with the tall pointed hood up, seen from the waist up.',
    used: ['Home · on a real person', 'Hoodie page · on body'],
    prompt: BODY + ' Framed from the waist up, three-quarter view. The same woman as in the reference image, in the same hoodie, now with the hood up: ' +
      'the tall pointed peak stands above her head, the drawcords hang down, her face is clearly visible inside the hood, ' +
      'and one hand lifts the hood edge so the reflective piping catches the light. The hoodie: ' + hoodie(K.byId.pink) + '. ' + SAME + ' Backdrop: ' + BACKDROP.pink + '. ' + NEG,
  }));
  shots.push(gpt({
    id: 'fit-back', stage: 3, aspect: '4:5', pal: 'pink', art: 'person-back', refs: [ref('pink-fit')],
    brief: 'The back on a real person, full length: hood hanging, the Eye between the shoulders.',
    alt: 'A woman wearing the Pink Noise hoodie seen from behind, full length, a large ring-and-dot mark on the back.',
    used: ['Home · on a real person', 'Hoodie page · on body'],
    prompt: BODY + ' Full length, seen from directly behind. The same woman as in the reference image, in the same hoodie, arms relaxed at her sides. ' +
      BACK + ' The motif is pale pink (#FFA3D2). The hoodie: ' + hoodie(K.byId.pink) + '. ' + SAME + ' Backdrop: ' + BACKDROP.pink + '. ' + NEG,
  }));

  /* ── stage 1: the rest of the wardrobe. Each takes its palette's logo badge (assets/logo, made by tools/logo.mjs)
        as the reference image, so the real logo lands on the product. ── */
  var LOGO = 'The logo on it is exactly the pixel-art badge in the reference image: a round badge of a cartoon chameleon head in a tall pointed hood inside a coloured ring, ' +
    'made of crisp square pixels. Keep its shape, its pixels and its colours; do not redraw it as a smooth illustration and do not add any letters to it.';
  var lum = function (h) { var n = parseInt(h.slice(1), 16); return 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255); };
  var ITEM_DESC = {
    tee: function (p) { return 'an oversized boxy heavyweight cotton T-shirt with dropped shoulders, solid ' + p.aName + ' (' + p.a + '). The bottom 6 cm of the hem changes into ' + p.bName + ' (' + p.b + ') through a printed pixel dither of small squares. A large screen-printed round badge, about 9 cm wide, sits on the chest'; },
    shell: function (p) { return 'a lightweight rain shell jacket with a stand collar and a full-length zip, two-layer ripstop nylon in ' + p.aName + ' (' + p.a + '); from the elbows down, the sleeves change into ' + p.bName + ' (' + p.b + ') through a printed pixel dither of small squares; a thin silver reflective stripe across each sleeve; a small badge, about 4 cm wide, on the left chest'; },
    varsity: function (p) { return 'a classic baseball varsity jacket: a ' + p.aName + ' (' + p.a + ') wool body, cream faux-leather sleeves, a collar, cuffs and hem in striped rib knit in ' + p.bName + ' (' + p.b + ') and ' + p.glow + ', square silver snap buttons down the front, and a fuzzy chenille patch of the badge, about 10 cm wide, on the left chest'; },
    pants: function (p) { var f = lum(p.b) < lum(p.a) ? p.a : p.b, fn = lum(p.b) < lum(p.a) ? p.aName : p.bName; return 'relaxed straight-leg heavyweight fleece sweatpants, solid black (#16151C) from the waistband to well below the knee. Only on the lower shin does ' + fn + ' (' + f + ') start to knit in, as small square pixels, sparse at first and denser toward the ankle, until the ribbed cuffs are solid ' + fn + '. A small woven badge, about 3 cm wide, on the right thigh just under the pocket'; },
    socks: function (p) { return 'a pair of off-white cotton crew socks laid flat side by side, with ribbed cuffs, toes and heels in ' + p.bName + ' (' + p.b + '), and the badge knitted into each cuff, about 3 cm wide'; },
    cap: function (p) { return 'a six-panel baseball cap seen from the front at a slight three-quarter angle, ' + p.aName + ' (' + p.a + ') cotton twill, a curved brim whose underside fades into ' + p.bName + ' (' + p.b + ') in small square pixels, and a raised embroidered badge, about 6 cm wide, on the front panel'; },
    beanie: function (p) { return 'a rib-knit watch cap beanie with a deep folded-up cuff, the crown rising to a soft point, ' + p.aName + ' (' + p.a + '); the folded cuff changes into ' + p.bName + ' (' + p.b + ') through knitted pixel dither, and a small woven label of the badge, about 4 cm wide, is stitched on the front of the folded cuff'; },
    tote: function (p) { return 'a natural cream canvas tote bag with long black cotton handles; the bottom 8 cm changes into ' + p.bName + ' (' + p.b + ') through a printed pixel dither of small squares; the badge is printed large, about 22 cm wide, on the front'; },
  };
  K.ITEMS.forEach(function (it) {
    var p = K.byId[it.pal];
    shots.push(gpt({
      id: 'item-' + it.id, stage: 1, aspect: '4:5', pal: it.pal, art: 'item', item: it.id, refs: ['assets/logo/hex-badge-' + it.pal + '.png'],
      brief: it.name + ' in ' + p.name + ', studio shot, with the Hex badge where the real logo goes: ' + it.placement.toLowerCase(),
      alt: 'The Kalypt ' + it.name + ' in ' + p.name + '.',
      used: ['Store · card', 'Item page · hero'],
      prompt: STUDIO.replace('The hoodie is shown on an invisible ghost mannequin, standing upright, perfectly centred and symmetrical, sleeves hanging slightly away from the body. ',
        it.cat === 'accessories' ? 'The product is shown alone, centred, as a clean catalogue still life. ' : 'The garment is shown on an invisible ghost mannequin, upright, centred and symmetrical. ') +
        ' The product: ' + ITEM_DESC[it.id](p) + '. ' + LOGO + ' Backdrop: ' + BACKDROP[p.id] + '. ' + NEG,
    }));
  });
  /* one person wearing the set: the look the store opens with */
  shots.push(gpt({
    id: 'store-look', stage: 2, aspect: '4:5', pal: 'pink', art: 'person', refs: [ref('item-varsity'), ref('item-pants')],
    brief: 'One person in the Level Up Varsity and the Dead Pixel Pants, full length: the set worn together.',
    alt: 'A person wearing the Kalypt varsity jacket and pixel-fade pants, full length.',
    used: ['Store · hero'],
    prompt: BODY + ' Full length, from head to trainers, facing the camera, relaxed. The person: a man in his twenties, about 180 cm tall, deep-brown skin, short twists. ' +
      'He wears the varsity jacket from the first reference image, open over a plain black T-shirt, and the pants from the second reference image instead of the black trousers. ' +
      'Both are exactly as in their reference images, including the pixel-art badge and the pixel fade below the knee. Backdrop: ' + BACKDROP.pink + '. ' + NEG,
  }));

  /* ── stage 2: details ── */
  shots.push(gpt({
    id: 'macro-dither', stage: 2, aspect: '16:9', pal: 'pink', art: 'dither', refs: [ref('pink-front')],
    brief: 'The fade up close: knitted squares where ultraviolet turns to pink.',
    alt: 'Macro of knitted fabric where violet squares give way to pink squares.',
    used: ['Home · the cut', 'Hoodie page · gallery'],
    prompt: 'Photoreal textile macro photography, 100mm macro lens, focus-stacked, raking side light so every loop of yarn casts a tiny shadow, fine grain. ' +
      'The fabric of the hoodie in the reference image, filling the frame, at the place where deep ultraviolet (#33186A) turns to hot pink (#FF2F8E): ' +
      'a jacquard-knitted checkerboard of small squares, each about 4 mm, mostly violet at the top of the frame and mostly pink at the bottom. ' + NEG,
  }));
  shots.push(gpt({
    id: 'detail-hood', stage: 2, aspect: '4:5', pal: 'pink', art: 'front', refs: [ref('pink-front')],
    brief: 'The Peak: three panels, pink lining, the piping catching a flash.',
    alt: 'Close view of the tall pointed hood of the Pink Noise hoodie, its piping reflecting light.',
    used: ['Hoodie page · gallery'],
    prompt: STUDIO + ' Close three-quarter view of the hood, up, on the ghost mannequin: the tall pointed peak, the three panels and their seams, the hot pink lining, ' +
      'the silver reflective piping along the hood edge flaring bright where a light hits it, the two square metal aglets. The hoodie: ' + hoodie(pink) + '. ' + SAME + ' Backdrop: ' + BACKDROP.pink + '. ' + NEG,
  }));
  shots.push(gpt({
    id: 'detail-pocket', stage: 2, aspect: '4:5', pal: 'pink', art: 'front', refs: [ref('pink-front')],
    brief: 'The Step Pocket: stair-step opening, the zipped cell inside.',
    alt: 'Close view of the stair-step kangaroo pocket on the Pink Noise hoodie.',
    used: ['Hoodie page · gallery'],
    prompt: STUDIO + ' Close view of the kangaroo pocket: one stair-step side opening pulled slightly open, showing the small zip of the inner cell, ' +
      'the pixel dither of the fabric sharp around it. The hoodie: ' + hoodie(pink) + '. ' + SAME + ' Backdrop: ' + BACKDROP.pink + '. ' + NEG,
  }));

  /* ───────────── FILMS (image to video between two stills; cut into scroll frames by optimize.mjs) ───────────── */
  var films = [
    {
      id: 'film-descent', kind: 'film', name: 'descent', stage: 4, aspect: '16:9', model: 'kling4_0', params: { mode: 'image-to-video', duration: 10, resolution: '1080p' },
      start: 'city-hero', end: 'city-street', focus: 0.5,
      brief: 'The opening: from the rooftop down between the towers to the street. Scroll plays it.',
      used: ['Home · title screen'],
      beats: [
        { at: 0, text: 'Rooftop. The moon, the towers, the rain.' },
        { at: 0.3, text: 'The camera tips forward and falls between the towers.' },
        { at: 0.62, text: 'Signs and cables pass. The street comes up.' },
        { at: 0.88, text: 'Street level. The picture breaks into pixels. Player 1 enters.' },
      ],
      prompt: 'One continuous camera move with no cuts: the camera tips forward off the rooftop and descends smoothly through the rain between the towers, ' +
        'past stacked glowing signs and cables, slowing to settle at street level looking down the wet street. Rain falls throughout, reflections shimmer, nothing else moves fast. ' +
        'No writing appears on any sign.',
    },
    {
      id: 'film-turn', kind: 'film', name: 'turn', stage: 4, aspect: '16:9', model: 'kling4_0', params: { mode: 'image-to-video', duration: 5, resolution: '1080p' },
      start: 'turn-front', end: 'turn-back', focus: 0.5,
      brief: 'The cut, turning half way round: front to back. Scroll plays it.',
      used: ['Home · the cut'],
      beats: [
        { at: 0, text: 'Front. The Peak, the cords, the Step Pocket.' },
        { at: 0.4, text: 'It turns on the spot. Dropped shoulder, the piping on the sleeve.' },
        { at: 0.78, text: 'Back. The hood hangs down. The Eye, 13 × 13.' },
      ],
      prompt: 'The hoodie on its invisible mannequin rotates smoothly half a turn on the spot, from the front view to the back view, at constant speed. ' +
        'The camera, the light and the backdrop do not move. The fabric keeps its shape. Nothing else changes.',
    },
  ];

  var byId = {};
  shots.forEach(function (s) { s.kind = 'image'; byId[s.id] = s; });
  films.forEach(function (f) { byId[f.id] = f; });

  root.KALYPT_SHOTS = {
    look: { STUDIO: STUDIO, CITY: CITY, BODY: BODY, NEG: NEG, SAME: SAME, BACK: BACK },
    hoodie: (function () { var o = {}; K.PALETTES.forEach(function (p) { o[p.name] = hoodie(p); }); return o; })(),
    shots: shots, films: films, models3d: [], all: shots.concat(films), byId: byId,
  };
})(typeof window !== 'undefined' ? window : globalThis);
