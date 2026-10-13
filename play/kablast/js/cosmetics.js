/* KABLAST — cosmetics beyond the orb: CRYSTAL skins (the shapes you blast), WORLD themes (background, walls, the Dark,
   ambient effects) and TRAIL styles. Pure look — no cosmetic changes any rule, hitbox or chain.
   `price` = shards. Items with price 0 are always owned. Every item is bought with shards earned in play; the few
   `premium` ones (paid items in the iOS build) cost more shards and never drop from chests. */
KABLAST.cosmetics = (() => {
  const U = KABLAST.U;

  // ---------- CRYSTALS: shape × style (+ optional 4-colour palette; the four hues must stay distinct — colour IS the chain rule)
  const crystals = [
    { id: 'c.hex',     name: 'Crystal',   shape: 'hex',     style: 'glass', price: 0 },
    { id: 'c.cube',    name: 'Cubes',     shape: 'cube',    style: 'glass', price: 120 },
    { id: 'c.brick',   name: 'Bricks',    shape: 'brick',   style: 'flat',  price: 150 },
    { id: 'c.diamond', name: 'Diamonds',  shape: 'diamond', style: 'glass', price: 150 },
    { id: 'c.bubble',  name: 'Bubbles',   shape: 'round',   style: 'glass', price: 180 },
    { id: 'c.shard',   name: 'Shards',    shape: 'shard',   style: 'glass', price: 200 },
    { id: 'c.star',    name: 'Stars',     shape: 'star',    style: 'flat',  price: 250 },
    { id: 'c.pixel',   name: 'Pixel',     shape: 'pixel',   style: 'pixel', price: 300 },
    { id: 'c.neon',    name: 'Neon Wire', shape: 'hex',     style: 'neon',  price: 350 },
    { id: 'c.candy',   name: 'Candy',     shape: 'round',   style: 'candy', price: 400, palette: ['#ff7ad9', '#6dffc8', '#fff06a', '#b59bff'] },
    { id: 'c.ice',     name: 'Frost',     shape: 'hex',     style: 'ice',   price: 450, palette: ['#5fd8ff', '#ff8ee6', '#9dff6a', '#ffd35a'] },
    { id: 'c.lava',    name: 'Magma',     shape: 'shard',   style: 'lava',  price: 500, palette: ['#ff7a1a', '#ff2d6a', '#ffd400', '#ff9ecb'] },
    { id: 'c.gold',    name: 'Royal Cut', shape: 'octa',    style: 'metal', price: 900, premium: true, palette: ['#ffd23f', '#ff8fc8', '#7fe6ff', '#c3ff5c'] },
    // --- added in 1.1 ---
    { id: 'c.bloom',   name: 'Blossom',   shape: 'star',    style: 'candy', price: 320, palette: ['#ff9ec7', '#c9a7ff', '#a7f0d1', '#ffe08a'] },
    { id: 'c.kyanite', name: 'Kyanite',   shape: 'diamond', style: 'ice',   price: 420, palette: ['#3fb8ff', '#9a6bff', '#3dffb0', '#ff8fcf'] },
    { id: 'c.forge',   name: 'Forge',     shape: 'octa',    style: 'lava',  price: 560, palette: ['#ff8a2b', '#ff3d6e', '#ffd000', '#ff7ab8'] },
    { id: 'c.circuit', name: 'Circuit',   shape: 'brick',   style: 'circuit', price: 680, palette: ['#3efcc0', '#4fa8ff', '#ff5ec4', '#c9ff4f'] },
    { id: 'c.holo',    name: 'Hologram',  shape: 'hex',     style: 'holo',  price: 1100, premium: true, palette: ['#8affff', '#ff9ef0', '#b9ff8a', '#ffd88a'] },
  ];

  // ---------- WORLDS: a colour transform applied to every level palette, the walls, the dust and the Dark, plus an ambient effect
  // tint: { hue: degrees to rotate, sat: multiplier, light: added % }.  fx: stars | aurora | grid | snow | bubbles | fireflies | embers | rain
  const worlds = [
    { id: 'w.well',      name: 'Deep Well',   price: 0,   tint: null,                               fx: null },
    { id: 'w.midnight',  name: 'Midnight',    price: 150, tint: { hue: 0, sat: 0.35, light: -5 },   fx: 'stars',     accent: '#fff2b3' },
    { id: 'w.aurora',    name: 'Aurora',      price: 200, tint: { hue: -100, sat: 1.0, light: 0 },  fx: 'aurora',    accent: '#6dffc8' },
    { id: 'w.abyss',     name: 'Abyss',       price: 250, tint: { hue: -70, sat: 1.05, light: -3 }, fx: 'bubbles',   accent: '#8ff3ff' },
    { id: 'w.arctic',    name: 'Arctic',      price: 300, tint: { hue: -60, sat: 0.55, light: 7 },  fx: 'snow',      accent: '#ffffff' },
    { id: 'w.grove',     name: 'Firefly Grove', price: 350, tint: { hue: -140, sat: 0.7, light: -2 }, fx: 'fireflies', accent: '#e9ff7a' },
    { id: 'w.ember',     name: 'Ember Sky',   price: 400, tint: { hue: 120, sat: 1.1, light: -1 },  fx: 'embers',    accent: '#ffb347' },
    { id: 'w.monsoon',   name: 'Monsoon',     price: 450, tint: { hue: -40, sat: 0.45, light: -1 }, fx: 'rain',      accent: '#bfe6ff' },
    { id: 'w.golden',    name: 'Golden Hour', price: 500, tint: { hue: 145, sat: 0.9, light: 6 },   fx: 'fireflies', accent: '#ffe08a' },
    { id: 'w.synth',     name: 'Synthwave',   price: 1400, premium: true, tint: { hue: 45, sat: 1.35, light: 0 }, fx: 'grid', accent: '#ff4fd8' },
    // --- added in 1.1 ---
    { id: 'w.sakura',    name: 'Sakura',      price: 320, tint: { hue: 200, sat: 0.6, light: 4 },   fx: 'petals',   accent: '#ffc2dd' },
    { id: 'w.trench',    name: 'The Trench',  price: 420, tint: { hue: -85, sat: 1.15, light: -8 }, fx: 'plankton', accent: '#5affd4' },
    { id: 'w.foundry',   name: 'Foundry',     price: 560, tint: { hue: 130, sat: 1.0, light: -4 },  fx: 'sparks',   accent: '#ffa23f' },
    { id: 'w.mono',      name: 'Monochrome',  price: 700, tint: { hue: 0, sat: 0.04, light: 3 },    fx: 'stars',    accent: '#ffffff' },
    { id: 'w.dusk',      name: 'Violet Dusk', price: 1200, tint: { hue: 25, sat: 0.85, light: 6 },  fx: 'fireflies', accent: '#ffb0e8' },
  ];

  // ---------- TRAILS: how the comet tail is drawn (colours come from the orb skin unless the trail has its own)
  const trails = [
    { id: 't.comet',   name: 'Comet',      price: 0 },
    { id: 't.sparkle', name: 'Stardust',   price: 150 },
    { id: 't.neon',    name: 'Neon Line',  price: 200 },
    { id: 't.bubbles', name: 'Bubbles',    price: 250 },
    { id: 't.pixel',   name: 'Pixel Dust', price: 300 },
    { id: 't.fire',    name: 'Wildfire',   price: 400 },
    { id: 't.rainbow', name: 'Rainbow',    price: 1000, premium: true },
    // --- added in 1.1 ---
    { id: 't.ribbon',    name: 'Ribbon',     price: 300 },
    { id: 't.smoke',     name: 'Smoke',      price: 380 },
    { id: 't.notes',     name: 'Chevrons',   price: 480 },
    { id: 't.lightning', name: 'Lightning',  price: 900 },
    { id: 't.void',      name: 'Eventide',   price: 1100, premium: true },
  ];

  const cats = { crystal: { list: crystals, field: 'crystal' }, world: { list: worlds, field: 'world' }, trail: { list: trails, field: 'trail' } };
  const byId = {};
  for (const k in cats) for (const it of cats[k].list) { it.cat = k; byId[it.id] = it; }

  function owned(id) { const it = byId[id]; if (!it) return KABLAST.skins.owned(id); return it.price === 0 || KABLAST.save.data.owned.indexOf(id) >= 0; }
  function grant(id) { if (!owned(id)) { KABLAST.save.data.owned.push(id); KABLAST.save.write(); } }
  function current(cat) { const c = cats[cat]; return byId[KABLAST.save.data[c.field]] || c.list[0]; }
  function select(id) { const it = byId[id]; if (!it || !owned(id)) return false; KABLAST.save.data[cats[it.cat].field] = id; KABLAST.save.write(); return true; }
  // ---------- colour routing
  const gemHex = i => { const p = current('crystal').palette; return p ? p[i] : KABLAST.CFG.colors[i].hex; };

  // hue/sat/light transform with a per-theme cache (called for every palette stop, wall, dust and Dark colour)
  let tintCache = new Map();
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b); let h = 0, s = 0; const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0); else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }
  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360; s = U.clamp(s, 0, 1); l = U.clamp(l, 0, 1);
    const f = n => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(c * 255); };
    return '#' + ((1 << 24) | (f(0) << 16) | (f(8) << 8) | f(4)).toString(16).slice(1);
  }
  function tint(hex, w) {
    w = w || current('world'); if (!w.tint) return hex;
    const key = w.id + hex; let v = tintCache.get(key);
    if (!v) {
      const [r, g, b] = U.hexToRgb(hex), [h, s, l] = rgbToHsl(r, g, b), T = w.tint;
      v = hslToHex(h + T.hue, s * T.sat, l + T.light / 100); tintCache.set(key, v);
    }
    return v;
  }
  const paletteCache = new Map();
  function palette(bg, w) {
    w = w || current('world');
    const key = w.id + '|' + bg.join(',');
    let p = paletteCache.get(key); if (!p) { p = bg.map(h => tint(h, w)); paletteCache.set(key, p); }
    return p;
  }
  function darkSea(w) { const C = KABLAST.CFG.darkSea; return { top: tint(C.top, w), edge: tint(C.edge, w), mid: tint('#1b0838', w), bottom: tint(C.bottom, w) }; }
  function wall(w) { return { fill: tint('#05030f', w), line: tint('#8c64e6', w), glow: tint('#a078ff', w) }; }
  function dust(w) { return [tint('#9fd8ff', w), tint('#ffb8f0', w)]; }
  function embers(w) { return [tint('#9b5cff', w), tint('#ff4fd8', w)]; }

  return { crystals, worlds, trails, cats, byId, owned, grant, current, select, gemHex, tint, palette, darkSea, wall, dust, embers };
})();
