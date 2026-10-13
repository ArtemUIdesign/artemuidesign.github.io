/* KABLAST — pre-rendered sprites. Glows via shadowBlur are far too slow on mobile canvas per frame, so every
   glowing, shaded or blurred thing is rendered ONCE into an offscreen canvas (supersampled) and blitted with
   drawImage. Blur, soft shadows and layered facet lighting are all spent here, at bake time, never per frame.

   One light rig for the whole game: a key light from the upper left, a transmitted "caustic" glow on the far
   side of every gem, a cool rim along the lit edges, a soft contact shadow underneath. Because every model
   shares it, a cluster of forty crystals reads as forty objects sitting in the same space.

   Crystals come in SHAPES (hex, cube, brick, diamond, round, shard, star, octa, pixel) and STYLES
   (glass, flat, neon, pixel, candy, ice, lava, metal, holo, circuit) — chosen by the equipped crystal skin. */
KABLAST.sprites = (() => {
  const U = KABLAST.U, TAU = U.TAU;
  const SS = 3;                       // supersample: sprite pixels per world unit
  // A bounded cache. Every sprite is keyed by colour and size; nothing in the game can mint keys without limit
  // (skins.liveColors quantises the cycling hue for exactly this reason), and this cap is the belt to that brace.
  const cache = new Map();
  const BUDGET = 48 * 1024 * 1024;    // bytes of sprite pixels kept alive (a normal run uses a few MB)
  let bytes = 0;

  function make(w, h, draw, ss = SS) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * ss); c.height = Math.ceil(h * ss);
    const x = c.getContext('2d'); x.scale(ss, ss); x.translate(w / 2, h / 2);
    draw(x, w, h, ss);
    c.ss = ss;
    return c;
  }
  function get(key, w, h, draw, ss) {
    let s = cache.get(key);
    if (s) { cache.delete(key); cache.set(key, s); return s; }     // most recently used goes to the back
    s = make(w, h, draw, ss); cache.set(key, s); bytes += s.width * s.height * 4;
    while (bytes > BUDGET && cache.size > 1) {                       // evict the least recently used
      const k = cache.keys().next().value, old = cache.get(k); cache.delete(k); bytes -= old.width * old.height * 4;
    }
    return s;
  }

  // ---------- the light rig ----------
  const LX = -0.57, LY = -0.82;                 // unit vector pointing at the key light (upper left)
  const SHADOW = '#12062e';                     // shadows lean toward the well's indigo, never to grey
  // brightness of a facet whose outward direction is (mx, my): -1 facing away from the light, +1 facing it
  const facing = (mx, my) => { const d = Math.hypot(mx, my) || 1; return (mx * LX + my * LY) / d; };
  const shade = (hex, l, up = 0.62, down = 0.55) => l >= 0 ? U.mix(hex, '#ffffff', l * up) : U.mix(hex, SHADOW, -l * down);

  // ---------- shapes ----------
  // vertices (world units, centred) + corner radius; 'round' is a circle with 8 pseudo-vertices for facets
  function verts(shape, r) {
    const P = [], reg = (n, rr, rot) => { for (let k = 0; k < n; k++) { const a = rot + k * TAU / n; P.push([Math.cos(a) * rr, Math.sin(a) * rr]); } };
    switch (shape) {
      case 'cube':    { const h = r * 0.86; P.push([-h, -h], [h, -h], [h, h], [-h, h]); return { P, rc: 2.5 }; }
      case 'pixel':   { const h = r * 0.86; P.push([-h, -h], [h, -h], [h, h], [-h, h]); return { P, rc: 0 }; }
      case 'brick':   { const w = r * 1.04, h = r * 0.7; P.push([-w, -h], [w, -h], [w, h], [-w, h]); return { P, rc: 3 }; }
      case 'diamond': P.push([0, -r * 1.14], [r * 0.82, 0], [0, r * 1.14], [-r * 0.82, 0]); return { P, rc: 1.2 };
      case 'shard':   reg(3, r * 1.2, -Math.PI / 2); return { P, rc: 2.2 };
      case 'star':    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * TAU / 10, d = k % 2 ? r * 0.56 : r * 1.2; P.push([Math.cos(a) * d, Math.sin(a) * d]); } return { P, rc: 1 };
      case 'octa':    reg(8, r * 1.02, Math.PI / 8); return { P, rc: 1 };
      case 'round':   reg(8, r * 0.96, -Math.PI / 2); return { P, rc: 0, round: r * 0.96 };
      default:        reg(6, r, -Math.PI / 2); return { P, rc: 0 };
    }
  }
  function polyPath(x, P, rc) {
    x.beginPath();
    if (!rc) { P.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); return; }
    const n = P.length;
    for (let i = 0; i < n; i++) {
      const p = P[i], q = P[(i + 1) % n], o = P[(i + n - 1) % n];
      const d1 = Math.hypot(p[0] - o[0], p[1] - o[1]), d2 = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const c = Math.min(rc, d1 / 2, d2 / 2);
      const ax = p[0] + (o[0] - p[0]) / d1 * c, ay = p[1] + (o[1] - p[1]) / d1 * c, bx = p[0] + (q[0] - p[0]) / d2 * c, by = p[1] + (q[1] - p[1]) / d2 * c;
      i ? x.lineTo(ax, ay) : x.moveTo(ax, ay);
      x.quadraticCurveTo(p[0], p[1], bx, by);
    }
    x.closePath();
  }
  // path of a crystal shape at circumradius r (used by sprites and by the renderer for ghost outlines)
  function shapePath(x, r, shape = 'hex', rot = 0) {
    const v = verts(shape, r);
    if (v.round) { x.beginPath(); x.arc(0, 0, v.round, 0, TAU); x.closePath(); return; }
    if (!rot) { polyPath(x, v.P, v.rc); return; }
    const c = Math.cos(rot), s = Math.sin(rot);
    polyPath(x, v.P.map(p => [p[0] * c - p[1] * s, p[0] * s + p[1] * c]), v.rc);
  }
  const scaled = (P, k, ox = 0, oy = 0) => P.map(p => [p[0] * k + ox, p[1] * k + oy]);
  function poly(x, P) { x.beginPath(); P.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); }

  // soft contact shadow, baked: the shape is drawn far off-canvas and only its blurred shadow lands here
  function dropShadow(x, ss, pathFn, blur, dy, alpha) {
    x.save();
    x.shadowColor = `rgba(4,1,16,${alpha})`; x.shadowBlur = blur * ss; x.shadowOffsetX = 0; x.shadowOffsetY = (600 + dy) * ss;
    x.translate(0, -600); pathFn(); x.fillStyle = '#000'; x.fill();
    x.restore();
  }
  // rim light: the silhouette edge, bright where it faces the key light, falling away into the gem's own colour
  function rim(x, pathFn, r, hex, w, a = 1) {
    const g = x.createLinearGradient(-r * 0.7, -r, r * 0.7, r);
    g.addColorStop(0, `rgba(255,255,255,${0.95 * a})`); g.addColorStop(0.45, U.rgba(U.mix(hex, '#ffffff', 0.55), 0.55 * a)); g.addColorStop(1, U.rgba(shade(hex, -0.3), 0.8 * a));
    pathFn(); x.strokeStyle = g; x.lineWidth = w; x.lineJoin = 'round'; x.stroke();
  }
  // a four-point star glint, the sparkle on a cut stone
  function glintAt(x, px, py, s, a = 1) {
    x.save(); x.translate(px, py); x.globalAlpha = a; x.fillStyle = '#ffffff';
    x.beginPath(); x.moveTo(0, -s); x.quadraticCurveTo(0, 0, s * 0.9, 0); x.quadraticCurveTo(0, 0, 0, s); x.quadraticCurveTo(0, 0, -s * 0.9, 0); x.quadraticCurveTo(0, 0, 0, -s); x.fill();
    const g = x.createRadialGradient(0, 0, 0, 0, 0, s * 0.55); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, s * 0.55, 0, TAU); x.fill();
    x.restore();
  }
  // crown facets: the ring of trapezoids between the girdle (P) and the table (T), each lit by where it faces
  function crown(x, P, T, hex, up, down, bias = 0) {
    const n = P.length;
    for (let k = 0; k < n; k++) {
      const a = P[k], b = P[(k + 1) % n], c = T[(k + 1) % n], d = T[k];
      x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.lineTo(c[0], c[1]); x.lineTo(d[0], d[1]); x.closePath();
      x.fillStyle = shade(hex, U.clamp(facing((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) + bias, -1, 1), up, down); x.fill();
    }
  }
  function ridges(x, P, T, style, w) {
    x.strokeStyle = style; x.lineWidth = w; x.beginPath();
    for (let k = 0; k < P.length; k++) { x.moveTo(P[k][0], P[k][1]); x.lineTo(T[k][0], T[k][1]); }
    x.stroke();
  }
  function cracks(x, r, seed, n, col, w) {
    x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; x.lineJoin = 'round';
    const rng = U.mulberry32(seed);
    for (let k = 0; k < n; k++) {
      let a = k * TAU / n + 0.4; x.beginPath(); x.moveTo(0, 0);
      for (let j = 1; j <= 3; j++) { a += (rng() - 0.5) * 1.1; const d = r * 0.3 * j; x.lineTo(Math.cos(a) * d, Math.sin(a) * d); }
      x.stroke();
    }
  }
  // light that has passed through the stone and pools on the far side from the key light
  function caustic(x, r, hex, a) {
    const g = x.createRadialGradient(r * 0.26, r * 0.34, 0, r * 0.26, r * 0.34, r * 0.78);
    g.addColorStop(0, U.rgba(U.mix(hex, '#ffffff', 0.55), a)); g.addColorStop(0.5, U.rgba(hex, a * 0.35)); g.addColorStop(1, U.rgba(hex, 0));
    x.save(); x.globalCompositeOperation = 'lighter'; x.fillStyle = g; x.fillRect(-r * 1.4, -r * 1.4, r * 2.8, r * 2.8); x.restore();
  }

  // soft radial glow, radius r (drawn at 2r x 2r). Glows are soft by nature, so they bake at a lower density.
  function glow(hex, r, power = 1) {
    return get('glow:' + hex + ':' + r + ':' + power, r * 2, r * 2, (x) => {
      const g = x.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, U.rgba(hex, 1 * power)); g.addColorStop(0.18, U.rgba(hex, 0.62 * power)); g.addColorStop(0.4, U.rgba(hex, 0.26 * power));
      g.addColorStop(0.65, U.rgba(hex, 0.08 * power)); g.addColorStop(0.85, U.rgba(hex, 0.02 * power)); g.addColorStop(1, U.rgba(hex, 0));
      x.fillStyle = g; x.beginPath(); x.arc(0, 0, r, 0, TAU); x.fill();
    }, r >= 32 ? 2 : SS);
  }

  // ---------- the crystal body, per style ----------
  function gem(hex, r, skin) {
    skin = skin || KABLAST.cosmetics.current('crystal');
    const pad = 8, s = r * 2.5 + pad * 2, shape = skin.shape, style = skin.style;
    return get('gem:' + skin.id + ':' + hex + ':' + r, s, s, (x, w, h, ss) => {
      const V = verts(shape, r), P = V.P, path = () => shapePath(x, r, shape);
      const light = U.mix(hex, '#ffffff', 0.5);
      const clip = fn => { x.save(); path(); x.clip(); fn(); x.restore(); };
      const T = scaled(P, 0.54, -r * 0.03, -r * 0.05);        // the table sits a touch toward the light
      if (style !== 'neon') dropShadow(x, ss, path, 3.2, 2.4, style === 'flat' || style === 'candy' ? 0.5 : 0.62);

      if (style === 'flat') {                  // soft-touch vinyl: two-tone body, a lit inner edge, one broad highlight
        const g = x.createLinearGradient(0, -r, 0, r); g.addColorStop(0, U.mix(hex, '#ffffff', 0.3)); g.addColorStop(0.5, hex); g.addColorStop(1, shade(hex, -0.4));
        path(); x.fillStyle = g; x.fill();
        clip(() => {
          const b = x.createLinearGradient(0, -r, 0, r); b.addColorStop(0, 'rgba(255,255,255,0.75)'); b.addColorStop(0.35, 'rgba(255,255,255,0)'); b.addColorStop(0.7, U.rgba(SHADOW, 0)); b.addColorStop(1, U.rgba(SHADOW, 0.55));
          path(); x.strokeStyle = b; x.lineWidth = 4; x.lineJoin = 'round'; x.stroke();
          const hg = x.createLinearGradient(0, -r, 0, -r * 0.05); hg.addColorStop(0, 'rgba(255,255,255,0.55)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
          x.fillStyle = hg; x.beginPath(); x.ellipse(-r * 0.1, -r * 0.46, r * 0.72, r * 0.34, -0.18, 0, TAU); x.fill();
          caustic(x, r, hex, 0.3);
        });
        rim(x, path, r, hex, 1.2, 0.8);
        glintAt(x, -r * 0.42, -r * 0.4, 2.2, 0.8);
      } else if (style === 'neon') {           // a lit glass tube bent into the shape: halo, coloured tube, white-hot core
        path(); x.fillStyle = U.rgba(hex, 0.08); x.fill();
        const c = x.createRadialGradient(0, 0, 0, 0, 0, r); c.addColorStop(0, U.rgba(hex, 0.34)); c.addColorStop(1, U.rgba(hex, 0));
        path(); x.fillStyle = c; x.fill();
        path(); x.lineJoin = 'round';
        x.strokeStyle = U.rgba(hex, 0.22); x.lineWidth = 6; x.stroke();
        x.strokeStyle = U.rgba(hex, 0.45); x.lineWidth = 3.8; x.stroke();
        x.strokeStyle = hex; x.lineWidth = 2.2; x.stroke();
        x.strokeStyle = U.mix(hex, '#ffffff', 0.8); x.lineWidth = 0.9; x.stroke();
        x.save(); x.scale(0.6, 0.6); path(); x.restore(); x.strokeStyle = U.rgba(U.mix(hex, '#ffffff', 0.5), 0.55); x.lineWidth = 0.8; x.stroke();
        glintAt(x, 0, 0, 3.2, 0.9);
      } else if (style === 'pixel') {          // chunky pixel art, lit with the same rig so it still sits in the world
        const cell = Math.max(2, r / 3.5); x.save(); path(); x.clip();
        const rng = U.mulberry32(U.hashStr(hex));
        for (let py = -r * 1.3; py < r * 1.3; py += cell) for (let px = -r * 1.3; px < r * 1.3; px += cell) {
          const d = (px + py) / (r * 2.2), n = rng();
          x.fillStyle = d < -0.45 ? (n < 0.8 ? light : hex) : d > 0.45 ? (n < 0.8 ? shade(hex, -0.45) : hex) : (n < 0.12 ? light : n > 0.9 ? shade(hex, -0.45) : hex);
          x.fillRect(px, py, cell + 0.2, cell + 0.2);
        }
        x.restore();
        path(); x.strokeStyle = shade(hex, -0.7); x.lineWidth = cell * 0.9; x.stroke();
        x.fillStyle = '#ffffff'; x.fillRect(-r * 0.7, -r * 0.7, cell, cell); x.fillRect(-r * 0.7 + cell, -r * 0.7, cell, cell);
        x.fillStyle = 'rgba(255,255,255,0.55)'; x.fillRect(-r * 0.7, -r * 0.7 + cell, cell, cell);
      } else if (style === 'candy') {          // boiled sugar: deep saturated body, glossy cap, light glowing up from inside
        const g = x.createRadialGradient(-r * 0.2, -r * 0.3, r * 0.1, 0, 0, r * 1.1);
        g.addColorStop(0, U.mix(hex, '#ffffff', 0.4)); g.addColorStop(0.55, hex); g.addColorStop(1, shade(hex, -0.45));
        path(); x.fillStyle = g; x.fill();
        clip(() => {
          caustic(x, r, hex, 0.7);
          const hg = x.createLinearGradient(0, -r, 0, -r * 0.1); hg.addColorStop(0, 'rgba(255,255,255,0.85)'); hg.addColorStop(1, 'rgba(255,255,255,0.05)');
          x.fillStyle = hg; x.beginPath(); x.ellipse(-r * 0.05, -r * 0.52, r * 0.66, r * 0.3, -0.12, 0, TAU); x.fill();
          x.strokeStyle = 'rgba(255,255,255,0.6)'; x.lineWidth = 1.3; x.lineCap = 'round'; x.beginPath(); x.arc(0, 0, r * 0.7, Math.PI * 0.2, Math.PI * 0.55); x.stroke();
        });
        rim(x, path, r, hex, 1.3, 0.7);
        glintAt(x, -r * 0.42, -r * 0.5, 2.6, 0.95);
      } else if (style === 'ice') {            // frosted: cut like glass, then misted, veined, with a cold bright rim
        if (V.round) { orbGem(x, r * 0.96, hex, 0.75); }
        else {
          path(); x.fillStyle = shade(hex, -0.2); x.fill();
          clip(() => {
            crown(x, P, T, U.mix(hex, '#dff6ff', 0.25), 0.7, 0.35, 0.15);
            const tg = x.createLinearGradient(-r * 0.5, -r * 0.5, r * 0.5, r * 0.5); tg.addColorStop(0, U.mix(hex, '#ffffff', 0.72)); tg.addColorStop(1, U.mix(hex, '#ffffff', 0.25));
            poly(x, T); x.fillStyle = tg; x.fill();
            cracks(x, r * 1.1, 11, 4, 'rgba(255,255,255,0.7)', 0.8);
            const rng = U.mulberry32(U.hashStr('frost' + hex)); x.fillStyle = 'rgba(255,255,255,0.5)';
            for (let i = 0; i < 26; i++) { const a = rng() * TAU, d = Math.sqrt(rng()) * r; x.beginPath(); x.arc(Math.cos(a) * d, Math.sin(a) * d, 0.35 + rng() * 0.5, 0, TAU); x.fill(); }
            caustic(x, r, '#bff4ff', 0.35);
          });
        }
        rim(x, path, r, '#dff8ff', 1.4, 1);
        glintAt(x, -r * 0.44, -r * 0.52, 3, 0.95);
      } else if (style === 'lava') {           // a crust of cooled rock split by veins of light from a molten heart
        path(); x.fillStyle = U.mix(hex, '#0a0306', 0.8); x.fill();
        clip(() => {
          crown(x, P, T, U.mix(hex, '#1a0808', 0.72), 0.35, 0.6);
          poly(x, T); x.fillStyle = U.mix(hex, '#1a0808', 0.66); x.fill();
          const c = x.createRadialGradient(0, 0, 0, 0, 0, r); c.addColorStop(0, U.rgba(hex, 0.62)); c.addColorStop(0.55, U.rgba(hex, 0.18)); c.addColorStop(1, U.rgba(hex, 0));
          x.fillStyle = c; x.fillRect(-r * 1.4, -r * 1.4, r * 2.8, r * 2.8);
          x.globalCompositeOperation = 'lighter';
          cracks(x, r * 1.15, 5, 4, U.rgba(hex, 0.28), 4.2);
          cracks(x, r * 1.15, 5, 4, U.rgba(hex, 0.7), 2);
          cracks(x, r * 1.15, 5, 4, U.mix(hex, '#fff6d0', 0.6), 0.8);
          x.globalCompositeOperation = 'source-over';
        });
        const core = x.createRadialGradient(0, 0, 0, 0, 0, 3.4); core.addColorStop(0, '#fffbe8'); core.addColorStop(1, U.rgba(hex, 0));
        x.fillStyle = core; x.beginPath(); x.arc(0, 0, 3.4, 0, TAU); x.fill();
        rim(x, path, r, hex, 1.3, 0.75);
      } else if (style === 'metal') {          // polished precious metal: hard facets, mirror-bright where they face the light
        path(); x.fillStyle = shade(hex, -0.3); x.fill();
        clip(() => {
          crown(x, P, T, hex, 0.9, 0.7);
          const tg = x.createLinearGradient(-r * 0.6, -r * 0.6, r * 0.6, r * 0.6);
          tg.addColorStop(0, U.mix(hex, '#ffffff', 0.7)); tg.addColorStop(0.42, hex); tg.addColorStop(0.5, '#ffffff'); tg.addColorStop(0.58, hex); tg.addColorStop(1, shade(hex, -0.45));
          poly(x, T); x.fillStyle = tg; x.fill();
          ridges(x, P, T, 'rgba(255,255,255,0.45)', 0.6);
          poly(x, T); x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = 0.7; x.stroke();
        });
        rim(x, path, r, hex, 1.5, 1);
        glintAt(x, -r * 0.4, -r * 0.48, 3.4, 1);
      } else if (style === 'holo') {           // iridescent foil in the gem's OWN colour: the hue only shifts a little across the facets
        const hue0 = U.hueOf(hex), sw = [-26, -10, 8, 22, 34, 12, -18, 4];   // small, uneven swings, like light moving on foil
        path(); x.fillStyle = U.hslHex(hue0, 85, 38); x.fill();
        clip(() => {
          for (let k = 0; k < P.length; k++) {
            const a = P[k], b = P[(k + 1) % P.length], c2 = T[(k + 1) % P.length], d = T[k];
            x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.lineTo(c2[0], c2[1]); x.lineTo(d[0], d[1]); x.closePath();
            x.fillStyle = shade(U.hslHex(hue0 + sw[k % sw.length], 90, 58), facing((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), 0.55, 0.45); x.fill();
          }
          const g = x.createLinearGradient(-r, -r, r, r);
          g.addColorStop(0, U.hslHex(hue0 - 18, 95, 82)); g.addColorStop(0.45, U.hslHex(hue0, 92, 66)); g.addColorStop(1, U.hslHex(hue0 + 24, 90, 52));
          poly(x, T); x.fillStyle = g; x.fill();
          const sheen = x.createLinearGradient(-r, r * 0.2, r, -r * 0.6);   // the foil flash: a narrow band, tinted a step round the wheel
          sheen.addColorStop(0, 'rgba(255,255,255,0)'); sheen.addColorStop(0.45, U.rgba(U.hslHex(hue0 + 40, 100, 88), 0.55)); sheen.addColorStop(0.6, 'rgba(255,255,255,0)');
          x.fillStyle = sheen; x.fillRect(-r * 1.4, -r * 1.4, r * 2.8, r * 2.8);
          ridges(x, P, T, 'rgba(255,255,255,0.4)', 0.6);
        });
        rim(x, path, r, hex, 1.4, 1);
        glintAt(x, -r * 0.4, -r * 0.5, 3, 1);
      } else if (style === 'circuit') {        // a dark board with glowing traces and solder points, under a glass bevel
        path(); x.fillStyle = U.mix(hex, '#05060f', 0.76); x.fill();
        clip(() => {
          x.strokeStyle = U.rgba(hex, 0.95); x.lineWidth = 1.3; x.lineCap = 'square';
          const rng = U.mulberry32(U.hashStr(hex + shape));
          for (let k = 0; k < 6; k++) {                       // traces: two axis-aligned legs each
            const px = (rng() * 2 - 1) * r * 0.9, py = (rng() * 2 - 1) * r * 0.9;
            const dx = (rng() < 0.5 ? -1 : 1) * r * (0.4 + rng() * 0.6), dy = (rng() < 0.5 ? -1 : 1) * r * (0.35 + rng() * 0.5);
            x.beginPath(); x.moveTo(px, py); x.lineTo(px + dx, py); x.lineTo(px + dx, py + dy); x.stroke();
            x.fillStyle = U.mix(hex, '#ffffff', 0.55); x.beginPath(); x.arc(px + dx, py + dy, 1.6, 0, TAU); x.fill();
          }
          x.lineCap = 'butt';
          const c = x.createRadialGradient(0, 0, 0, 0, 0, r); c.addColorStop(0, U.rgba(hex, 0.34)); c.addColorStop(1, U.rgba(hex, 0));
          x.fillStyle = c; x.fillRect(-r * 1.4, -r * 1.4, r * 2.8, r * 2.8);
          const hg = x.createLinearGradient(0, -r, 0, 0); hg.addColorStop(0, 'rgba(255,255,255,0.22)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
          x.fillStyle = hg; x.fillRect(-r * 1.4, -r * 1.4, r * 2.8, r * 1.4);
        });
        rim(x, path, r, hex, 1.7, 0.9);
      } else if (V.round) {                    // glass marble
        orbGem(x, r * 0.96, hex, 1);
        rim(x, path, r, hex, 1.2, 0.8);
      } else {                                 // glass (default): a brilliant cut — girdle, lit crown facets, a table, a caustic
        path(); x.fillStyle = shade(hex, -0.45); x.fill();
        clip(() => {
          crown(x, P, T, hex, 0.62, 0.58);
          const tg = x.createLinearGradient(-r * 0.55, -r * 0.6, r * 0.5, r * 0.55);
          tg.addColorStop(0, U.mix(hex, '#ffffff', 0.55)); tg.addColorStop(0.5, U.mix(hex, '#ffffff', 0.12)); tg.addColorStop(1, shade(hex, -0.3));
          poly(x, T); x.fillStyle = tg; x.fill();
          // the pavilion, seen through the table: faint arrows converging on the culet
          x.fillStyle = 'rgba(255,255,255,0.10)';
          for (let k = 0; k < T.length; k += 2) { const a = T[k], b = T[(k + 1) % T.length]; x.beginPath(); x.moveTo(-r * 0.03, -r * 0.05); x.lineTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.closePath(); x.fill(); }
          caustic(x, r, hex, 0.55);
          ridges(x, P, T, 'rgba(255,255,255,0.26)', 0.6);
          poly(x, T); x.strokeStyle = 'rgba(255,255,255,0.5)'; x.lineWidth = 0.7; x.stroke();
        });
        rim(x, path, r, hex, 1.3, 1);
        glintAt(x, T[0][0] * 0.2 - r * 0.36, -r * 0.46, 2.8, 0.95);
      }
    });
  }
  // a sphere of coloured glass: dark rim, glowing depth, a window reflection and a caustic on the far side
  function orbGem(x, r, hex, a) {
    const g = x.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.05, 0, 0, r);
    g.addColorStop(0, U.mix(hex, '#ffffff', 0.55)); g.addColorStop(0.45, hex); g.addColorStop(0.85, shade(hex, -0.5)); g.addColorStop(1, shade(hex, -0.75));
    x.beginPath(); x.arc(0, 0, r, 0, TAU); x.fillStyle = g; x.fill();
    x.save(); x.beginPath(); x.arc(0, 0, r, 0, TAU); x.clip();
    caustic(x, r, hex, 0.75 * a);
    const w = x.createLinearGradient(0, -r, 0, -r * 0.2); w.addColorStop(0, 'rgba(255,255,255,0.8)'); w.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = w; x.beginPath(); x.ellipse(-r * 0.12, -r * 0.55, r * 0.55, r * 0.3, -0.35, 0, TAU); x.fill();
    x.restore();
    glintAt(x, -r * 0.42, -r * 0.5, r * 0.22, 1);
  }

  // DARK SHARD, the killer: one blast that touches it ends the run (or takes the shield), so it must never read as a gem.
  function darkShard(r) {
    // It never takes the crystal skin's shape: whatever the skin, a killer is a black thorn star, so the silhouette
    // alone says "sharp, keep away" (colour-blind players read the spikes, not the red). Obsidian facets, molten red
    // veins running from a white-hot heart out to every tip, a hot red rim, and a red aura baked behind it.
    const s = r * 3.4, RED = KABLAST.CFG.darkShard.glow, N = 8;
    return get('dark:' + r + ':' + RED, s, s, (x, w, h, ss) => {
      const L = [1.32, 1.02, 1.2, 1.08, 1.3, 0.98, 1.18, 1.1];                     // uneven, like something that grew wrong
      const ta = k => -Math.PI / 2 + k * TAU / N + (k % 2 ? 0.05 : -0.04);
      const tip = k => { const kk = (k + N) % N, a = ta(kk); return [Math.cos(a) * r * L[kk], Math.sin(a) * r * L[kk]]; };
      const val = k => { const kk = (k + N) % N, a = ta(kk) + TAU / (2 * N), rv = r * (kk % 3 ? 0.68 : 0.62); return [Math.cos(a) * rv, Math.sin(a) * rv]; };
      const star = () => { x.beginPath(); for (let k = 0; k < N; k++) { const t2 = tip(k), v = val(k); k ? x.lineTo(t2[0], t2[1]) : x.moveTo(t2[0], t2[1]); x.lineTo(v[0], v[1]); } x.closePath(); };
      // the aura: red heat behind the body
      const au = x.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 1.62); au.addColorStop(0, U.rgba(RED, 0.55)); au.addColorStop(0.55, U.rgba(RED, 0.18)); au.addColorStop(1, U.rgba(RED, 0));
      x.fillStyle = au; x.beginPath(); x.arc(0, 0, r * 1.62, 0, TAU); x.fill();
      dropShadow(x, ss, star, 3.4, 2.4, 0.75);
      // obsidian: every spike is two facets, the one turned to the key light a cold violet-black, the other near-black
      for (let k = 0; k < N; k++) {
        const t2 = tip(k), vp = val(k - 1), vn = val(k), am = ta(k), lit = Math.cos(am + Math.PI * 0.75);
        const face = (v, bright) => {
          const g = x.createLinearGradient(0, 0, t2[0], t2[1]);
          g.addColorStop(0, bright ? '#2c1a3c' : '#0d0612'); g.addColorStop(1, bright ? '#4e3266' : '#050207');
          x.fillStyle = g; x.beginPath(); x.moveTo(0, 0); x.lineTo(v[0], v[1]); x.lineTo(t2[0], t2[1]); x.closePath(); x.fill();
        };
        face(vp, lit > -0.1); face(vn, lit > 0.6);
      }
      // molten veins from the heart to each tip: a wide red glow, a hot line, a white-hot thread
      x.save(); star(); x.clip(); x.globalCompositeOperation = 'lighter'; x.lineCap = 'round';
      const vein = (wd, col) => { x.strokeStyle = col; x.lineWidth = wd; x.beginPath(); for (let k = 0; k < N; k++) { const t2 = tip(k); x.moveTo(0, 0); x.lineTo(t2[0] * 0.86, t2[1] * 0.86); } x.stroke(); };
      vein(4, U.rgba(RED, 0.28)); vein(1.5, RED); vein(0.5, '#ffd2a8');
      const heat = x.createRadialGradient(0, 0, 0, 0, 0, r * 0.95); heat.addColorStop(0, U.rgba(RED, 0.42)); heat.addColorStop(0.5, U.rgba(RED, 0.08)); heat.addColorStop(1, U.rgba(RED, 0));
      x.fillStyle = heat; x.fillRect(-r * 1.4, -r * 1.4, r * 2.8, r * 2.8);
      x.restore();
      // (the heart, a skull seal, is its own sprite: the thorns turn, the skull stays upright — darkSeal)
      // edges: a cold glint on the lit side, and a hot red rim all round so it cuts out of any background
      star(); x.lineJoin = 'miter'; x.miterLimit = 6;
      const rim = x.createLinearGradient(-r, -r, r, r); rim.addColorStop(0, 'rgba(235,215,255,0.9)'); rim.addColorStop(0.42, U.rgba(RED, 0.9)); rim.addColorStop(1, RED);
      x.strokeStyle = rim; x.lineWidth = 1.5; x.stroke();
      x.strokeStyle = 'rgba(10,2,6,0.9)'; x.lineWidth = 0.6; x.stroke();
      glintAt(x, tip(7)[0] * 0.55, tip(7)[1] * 0.55, 2.2, 0.8);
    });
  }

  // the killer's heart: a red-hot seal with a skull on it, the one symbol every player reads as "this kills you"
  function darkSeal(r) {
    const RED = KABLAST.CFG.darkShard.glow;
    return get('darkseal:' + r + ':' + RED, r * 1.2, r * 1.2, (x) => {
        const Rc = r * 0.46;
        const seal = x.createRadialGradient(-Rc * 0.3, -Rc * 0.35, 0, 0, 0, Rc);
        seal.addColorStop(0, '#ff8a5c'); seal.addColorStop(0.55, RED); seal.addColorStop(1, '#8a0812');
        x.fillStyle = seal; x.beginPath(); x.arc(0, 0, Rc, 0, TAU); x.fill();
        x.strokeStyle = '#1a0205'; x.lineWidth = 1.1; x.stroke();
        x.strokeStyle = 'rgba(255,200,170,0.55)'; x.lineWidth = 0.6; x.beginPath(); x.arc(0, 0, Rc - 1.2, Math.PI * 1.05, Math.PI * 1.7); x.stroke();
        // the skull, in bone white with a dark keyline
        const sk = () => {
          x.beginPath();
          x.arc(0, -Rc * 0.14, Rc * 0.52, Math.PI * 0.82, Math.PI * 2.18);             // cranium
          x.lineTo(Rc * 0.3, Rc * 0.36); x.lineTo(-Rc * 0.3, Rc * 0.36); x.closePath();  // jaw
        };
        sk(); x.fillStyle = '#fff4ea'; x.fill(); x.strokeStyle = '#1a0205'; x.lineWidth = 0.9; x.lineJoin = 'round'; x.stroke();
        x.fillStyle = '#2a0408';
        x.beginPath(); x.ellipse(-Rc * 0.21, -Rc * 0.12, Rc * 0.15, Rc * 0.17, 0.2, 0, TAU); x.fill();
        x.beginPath(); x.ellipse(Rc * 0.21, -Rc * 0.12, Rc * 0.15, Rc * 0.17, -0.2, 0, TAU); x.fill();
        x.beginPath(); x.moveTo(0, Rc * 0.04); x.lineTo(-Rc * 0.07, Rc * 0.16); x.lineTo(Rc * 0.07, Rc * 0.16); x.closePath(); x.fill();
        x.strokeStyle = '#2a0408'; x.lineWidth = 0.6; x.beginPath();
        for (const tx of [-0.12, 0, 0.12]) { x.moveTo(Rc * tx, Rc * 0.22); x.lineTo(Rc * tx, Rc * 0.36); } x.stroke();
    });
  }

  // PRISM: a water-clear diamond throwing a spectrum out of every facet
  function prism(r, skin) {
    // PRISM: a white diamond. It is the one stone with no colour of its own (it chains with all of them), so it is cut
    // clear and silver-white; the only colour in it is the fire a real diamond throws, in thin fringes on a few facets.
    skin = skin || KABLAST.cosmetics.current('crystal');
    const pad = 8, s = r * 2.5 + pad * 2, shape = skin.shape;
    return get('prism:' + shape + ':' + r, s, s, (x, w, h, ss) => {
      const V = verts(shape, r), P = V.P, T = scaled(P, 0.54, -r * 0.03, -r * 0.05), path = () => shapePath(x, r, shape);
      dropShadow(x, ss, path, 3.2, 2.4, 0.5);
      const FIRE = ['#ff6b8b', '#ffd35a', '#7dffa8', '#5fd8ff', '#b48cff'];
      if (V.round) {
        orbGem(x, r * 0.96, '#dfe9ff', 1);
        x.save(); x.beginPath(); x.arc(0, 0, r * 0.96, 0, TAU); x.clip(); x.globalCompositeOperation = 'lighter';
        const g = x.createLinearGradient(r * 0.05, r * 0.2, r * 0.75, r * 0.72);
        FIRE.forEach((c, i) => g.addColorStop(i / (FIRE.length - 1), U.rgba(c, 0.3)));
        x.strokeStyle = g; x.lineWidth = r * 0.14; x.lineCap = 'round'; x.beginPath(); x.arc(0, 0, r * 0.7, Math.PI * 0.08, Math.PI * 0.45); x.stroke();
        x.restore();
        rim(x, path, r, '#ffffff', 1.4, 1);
        return;
      }
      path(); x.fillStyle = '#7d8ab8'; x.fill();                      // the girdle in cool shadow
      x.save(); path(); x.clip();
      crown(x, P, T, '#e6eeff', 0.8, 0.5);                            // silver-white crown, lit by the same rig as every gem
      const tg = x.createLinearGradient(-r * 0.55, -r * 0.6, r * 0.5, r * 0.55);
      tg.addColorStop(0, '#ffffff'); tg.addColorStop(0.5, '#f0f5ff'); tg.addColorStop(1, '#c3cff0');
      poly(x, T); x.fillStyle = tg; x.fill();
      // fire: short spectral fringes along the lower crown facets only, the way a stone flashes colour as it turns
      x.globalCompositeOperation = 'lighter'; x.lineCap = 'round';
      const n = P.length;
      for (let k = 0; k < n; k++) {
        const a = P[k], b2 = P[(k + 1) % n];
        const mx = (a[0] + b2[0]) / 2, my = (a[1] + b2[1]) / 2; if (my < r * 0.05) continue;   // only the facets turned away from the light
        const c = FIRE[(k * 2) % FIRE.length], d = FIRE[(k * 2 + 1) % FIRE.length];
        const g = x.createLinearGradient(a[0], a[1], b2[0], b2[1]); g.addColorStop(0, U.rgba(c, 0)); g.addColorStop(0.5, U.rgba(c, 0.5)); g.addColorStop(1, U.rgba(d, 0.2));
        const ta = T[k], tb = T[(k + 1) % n];
        x.strokeStyle = g; x.lineWidth = 1.6;
        x.beginPath(); x.moveTo(a[0] * 0.55 + ta[0] * 0.45, a[1] * 0.55 + ta[1] * 0.45); x.lineTo(b2[0] * 0.55 + tb[0] * 0.45, b2[1] * 0.55 + tb[1] * 0.45); x.stroke();
      }
      x.globalCompositeOperation = 'source-over';
      caustic(x, r, '#cfe6ff', 0.45);
      ridges(x, P, T, 'rgba(255,255,255,0.6)', 0.7);
      poly(x, T); x.strokeStyle = 'rgba(255,255,255,0.85)'; x.lineWidth = 0.8; x.stroke();
      x.restore();
      rim(x, path, r, '#ffffff', 1.5, 1);
      glintAt(x, -r * 0.38, -r * 0.46, 3.4, 1);
      glintAt(x, r * 0.34, r * 0.3, 1.8, 0.7);
    });
  }

  // NOVA CORE: a small sun cut as a gem — soft rays behind, gold facets, a white-hot heart
  // NOVA CORE: a captured star. It never takes the crystal skin's shape: an eight-point gold star with bevelled facets
  // around a white-hot sun, so it can never be mistaken for an amber gem. The living parts (corona, pulse, beacon,
  // rising chevrons, orbiting sparks) are drawn per frame by render.js; this is only the solid body.
  const NOVA = { hi: '#fffbe0', lit: '#ffe46b', mid: '#ffc233', shade: '#e8891a', deep: '#a8500c', core: '#fff3b0' };
  function novaCore(r) {
    const s = r * 3.2;
    return get('novacore:' + r, s, s, (x, w, h, ss) => {
      const N = 8, R1 = r * 1.16, R2 = r * 0.74, Ri = r * 0.5;
      const pt = (k, rad) => { const a = -Math.PI / 2 + k * Math.PI / N; return [Math.cos(a) * rad, Math.sin(a) * rad]; };
      const star = () => { x.beginPath(); for (let k = 0; k < N * 2; k++) { const p = pt(k, k % 2 ? Ri : (k % 4 ? R2 : R1)); k ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); } x.closePath(); };
      // a warm bloom baked behind the body so it glows even where the additive pass is skipped
      const bl = x.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 1.55); bl.addColorStop(0, U.rgba(NOVA.lit, 0.55)); bl.addColorStop(1, U.rgba(NOVA.lit, 0));
      x.fillStyle = bl; x.beginPath(); x.arc(0, 0, r * 1.55, 0, TAU); x.fill();
      dropShadow(x, ss, star, 3, 2.2, 0.45);
      // each point is two facets: the half turned to the key light (upper left) is lit, the other half falls into shadow
      for (let k = 0; k < N * 2; k += 2) {
        const tip = pt(k, k % 4 ? R2 : R1), l = pt(k - 1, Ri), rr = pt(k + 1, Ri);
        const ang = -Math.PI / 2 + k * Math.PI / N, lit = Math.cos(ang - (-Math.PI * 0.75));   // 1 = facing the light
        const fa = (p1, bright) => {
          const g = x.createLinearGradient(0, 0, tip[0], tip[1]);
          g.addColorStop(0, bright ? NOVA.hi : NOVA.mid); g.addColorStop(1, bright ? NOVA.lit : NOVA.shade);
          x.fillStyle = g; x.beginPath(); x.moveTo(0, 0); x.lineTo(p1[0], p1[1]); x.lineTo(tip[0], tip[1]); x.closePath(); x.fill();
        };
        fa(l, lit > -0.2); fa(rr, lit > 0.55);
      }
      // bevel ridges from the heart to every tip, and a warm rim on the silhouette
      x.strokeStyle = 'rgba(255,252,230,0.7)'; x.lineWidth = 0.7; x.beginPath();
      for (let k = 0; k < N * 2; k += 2) { const t2 = pt(k, k % 4 ? R2 : R1); x.moveTo(0, 0); x.lineTo(t2[0], t2[1]); } x.stroke();
      star(); x.strokeStyle = NOVA.deep; x.lineWidth = 1.1; x.lineJoin = 'round'; x.stroke();
      const rg = x.createLinearGradient(-R1, -R1, R1, R1); rg.addColorStop(0, 'rgba(255,255,255,0.95)'); rg.addColorStop(0.5, 'rgba(255,236,150,0.5)'); rg.addColorStop(1, 'rgba(180,90,10,0.6)');
      star(); x.strokeStyle = rg; x.lineWidth = 0.8; x.stroke();
      // the sun at the centre: white-hot, a gold limb, a thin bright ring where it meets the star
      const cg = x.createRadialGradient(-Ri * 0.2, -Ri * 0.25, 0, 0, 0, Ri);
      cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.45, NOVA.core); cg.addColorStop(0.85, NOVA.lit); cg.addColorStop(1, NOVA.shade);
      x.fillStyle = cg; x.beginPath(); x.arc(0, 0, Ri, 0, TAU); x.fill();
      x.strokeStyle = 'rgba(255,255,255,0.85)'; x.lineWidth = 1; x.beginPath(); x.arc(0, 0, Ri, 0, TAU); x.stroke();
      x.save(); x.beginPath(); x.arc(0, 0, Ri, 0, TAU); x.clip(); x.globalCompositeOperation = 'lighter';
      x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = Ri * 0.18; x.lineCap = 'round';
      x.beginPath(); x.arc(Ri * 0.08, Ri * 0.05, Ri * 0.62, -0.4, 1.4); x.stroke();     // a slow swirl of plasma, like the orb's
      x.restore();
      glintAt(x, -Ri * 0.42, -Ri * 0.5, 3.2, 1);
      glintAt(x, -R1 * 0.02, -R1 * 0.9, 2.2, 0.85);
    });
  }
  // the corona: sixteen soft rays, long and short, baked once and turned by the renderer
  function novaRays() {
    return get('novarays', 160, 160, (x) => {
      for (let k = 0; k < 16; k++) {
        const a = k * TAU / 16, L = k % 2 ? 50 : 78, wd = k % 2 ? 0.07 : 0.1;
        const g = x.createLinearGradient(0, 0, Math.cos(a) * L, Math.sin(a) * L);
        g.addColorStop(0, 'rgba(255,246,200,0.9)'); g.addColorStop(0.35, U.rgba(NOVA.lit, 0.45)); g.addColorStop(1, U.rgba(NOVA.mid, 0));
        x.fillStyle = g; x.beginPath(); x.moveTo(Math.cos(a - wd) * 8, Math.sin(a - wd) * 8); x.lineTo(Math.cos(a) * L, Math.sin(a) * L); x.lineTo(Math.cos(a + wd) * 8, Math.sin(a + wd) * 8); x.closePath(); x.fill();
      }
    }, 2);
  }
  // the beacon: a pillar of gold light through the Nova, brightest at the star and fading up and down the well
  // the afterburn behind a boosted orb: white-hot at the nozzle, gold, then gone
  function novaFlame() {
    return get('novaflame', 64, 256, (x) => {
      const g = x.createLinearGradient(-32, 0, 32, 0);
      g.addColorStop(0, 'rgba(255,194,51,0)'); g.addColorStop(0.3, 'rgba(255,194,51,0.55)'); g.addColorStop(0.5, 'rgba(255,252,235,1)'); g.addColorStop(0.7, 'rgba(255,194,51,0.55)'); g.addColorStop(1, 'rgba(255,194,51,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(-26, -128); x.quadraticCurveTo(0, -150, 26, -128); x.lineTo(3, 128); x.lineTo(-3, 128); x.closePath(); x.fill();
      x.globalCompositeOperation = 'destination-in';
      const v = x.createLinearGradient(0, -128, 0, 128); v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(0.35, 'rgba(0,0,0,0.7)'); v.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = v; x.fillRect(-32, -128, 64, 256);
    }, 1);
  }
  function novaPillar() {
    return get('novapillar', 64, 1024, (x) => {
      const g = x.createLinearGradient(-32, 0, 32, 0);
      g.addColorStop(0, U.rgba(NOVA.mid, 0)); g.addColorStop(0.32, U.rgba(NOVA.lit, 0.35)); g.addColorStop(0.5, 'rgba(255,250,220,1)'); g.addColorStop(0.68, U.rgba(NOVA.lit, 0.35)); g.addColorStop(1, U.rgba(NOVA.mid, 0));
      x.fillStyle = g; x.fillRect(-32, -512, 64, 1024);
      x.globalCompositeOperation = 'destination-in';
      const v = x.createLinearGradient(0, -512, 0, 512);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.12, 'rgba(0,0,0,0.22)'); v.addColorStop(0.36, 'rgba(0,0,0,0.6)'); v.addColorStop(0.5, 'rgba(0,0,0,1)');
      v.addColorStop(0.64, 'rgba(0,0,0,0.6)'); v.addColorStop(0.88, 'rgba(0,0,0,0.22)'); v.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = v; x.fillRect(-32, -512, 64, 1024);
    }, 1);
  }

  // THE ORB: a bead of light in a glass skin. The body is baked round; the specular (orbShine) is a separate sprite so
  // that when the renderer stretches the orb along its velocity, the highlight stays put, the way light does.
  function orb(core, halo, r) {
    const s = r * 2 + 6;
    return get('orb:' + core + ':' + halo + ':' + r, s, s, (x) => {
      const darkCore = U.luma(core) < 0.25;          // Void / Eclipse: a black heart inside a bright corona
      const g = x.createRadialGradient(0, 0, 0, 0, 0, r);
      if (darkCore) {
        g.addColorStop(0, core); g.addColorStop(0.5, U.mix(core, halo, 0.12)); g.addColorStop(0.78, U.mix(halo, core, 0.35)); g.addColorStop(0.93, halo); g.addColorStop(1, U.mix(halo, '#ffffff', 0.5));
      } else {
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.26, U.mix(core, '#ffffff', 0.6)); g.addColorStop(0.5, U.mix(core, halo, 0.45));
        g.addColorStop(0.8, halo); g.addColorStop(0.94, U.mix(halo, '#ffffff', 0.25)); g.addColorStop(1, U.mix(halo, '#ffffff', 0.6));
      }
      x.fillStyle = g; x.beginPath(); x.arc(0, 0, r, 0, TAU); x.fill();
      // a slow internal swirl, like a plasma lamp caught mid-turn
      x.save(); x.beginPath(); x.arc(0, 0, r, 0, TAU); x.clip(); x.globalCompositeOperation = 'lighter'; x.lineCap = 'round';
      x.strokeStyle = U.rgba(darkCore ? halo : '#ffffff', 0.22); x.lineWidth = r * 0.16;
      x.beginPath(); x.arc(r * 0.1, r * 0.05, r * 0.58, -0.3, 1.5); x.stroke();
      x.strokeStyle = U.rgba(halo, 0.3); x.lineWidth = r * 0.12;
      x.beginPath(); x.arc(-r * 0.08, -r * 0.02, r * 0.66, 2.6, 4.1); x.stroke();
      x.restore();
      x.strokeStyle = 'rgba(255,255,255,0.7)'; x.lineWidth = 0.9; x.beginPath(); x.arc(0, 0, r - 0.5, 0, TAU); x.stroke();
    });
  }
  function orbShine(r) {
    const s = r * 2 + 4;
    return get('orbshine:' + r, s, s, (x) => {
      const g = x.createRadialGradient(-r * 0.36, -r * 0.42, 0, -r * 0.36, -r * 0.42, r * 0.5);
      g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.4, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.beginPath(); x.ellipse(-r * 0.36, -r * 0.42, r * 0.5, r * 0.34, -0.6, 0, TAU); x.fill();
      x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(-r * 0.4, -r * 0.46, r * 0.14, r * 0.09, -0.6, 0, TAU); x.fill();
      x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = r * 0.07; x.lineCap = 'round';
      x.beginPath(); x.arc(0, 0, r * 0.8, 0.35, 1.25); x.stroke();          // bounce light on the lower right
    });
  }

  // a soft shockwave band; drawn scaled so its bright crest sits exactly on the ring's radius (see RING_CREST)
  const RING_CREST = 0.9;
  function ringTex(hex) {
    const R = 64;
    return get('ring:' + hex, R * 2, R * 2, (x) => {
      const g = x.createRadialGradient(0, 0, 0, 0, 0, R);
      g.addColorStop(0, U.rgba(hex, 0)); g.addColorStop(0.55, U.rgba(hex, 0)); g.addColorStop(0.76, U.rgba(hex, 0.16));
      g.addColorStop(0.86, U.rgba(hex, 0.55)); g.addColorStop(RING_CREST, U.rgba(U.mix(hex, '#ffffff', 0.7), 1));
      g.addColorStop(0.94, U.rgba(hex, 0.45)); g.addColorStop(1, U.rgba(hex, 0));
      x.fillStyle = g; x.beginPath(); x.arc(0, 0, R, 0, TAU); x.fill();
    }, 2);
  }
  // out-of-focus light, like a lens sees a far spark: flat disc, slightly brighter at its edge
  function bokeh(hex) {
    return get('bokeh:' + hex, 32, 32, (x) => {
      const g = x.createRadialGradient(0, 0, 0, 0, 0, 16);
      g.addColorStop(0, U.rgba(hex, 0.26)); g.addColorStop(0.72, U.rgba(hex, 0.32)); g.addColorStop(0.88, U.rgba(hex, 0.5)); g.addColorStop(1, U.rgba(hex, 0));
      x.fillStyle = g; x.beginPath(); x.arc(0, 0, 16, 0, TAU); x.fill();
    }, 2);
  }
  // a shaft of light falling from above: soft edges, bright at the top, gone by the bottom
  function beam(hex) {
    return get('beam:' + hex, 64, 512, (x) => {
      const g = x.createLinearGradient(-32, 0, 32, 0);
      g.addColorStop(0, U.rgba(hex, 0)); g.addColorStop(0.3, U.rgba(hex, 0.5)); g.addColorStop(0.5, U.rgba(hex, 1)); g.addColorStop(0.7, U.rgba(hex, 0.5)); g.addColorStop(1, U.rgba(hex, 0));
      x.fillStyle = g; x.fillRect(-32, -256, 64, 512);
      x.globalCompositeOperation = 'destination-in';
      const v = x.createLinearGradient(0, -256, 0, 256); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.08, 'rgba(0,0,0,1)'); v.addColorStop(0.45, 'rgba(0,0,0,0.5)'); v.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = v; x.fillRect(-32, -256, 64, 512);
    }, 1);
  }
  // a far-away crystal, out of focus: the silhouette only, blurred, for the depth layers behind the well
  function bgGem(shape, hex) {
    return get('bggem:' + shape + ':' + hex, 96, 96, (x, w, h, ss) => {
      x.save(); x.shadowColor = U.rgba(hex, 1); x.shadowBlur = 7 * ss; x.shadowOffsetY = 900 * ss; x.translate(0, -900);
      shapePath(x, 28, shape); x.fillStyle = '#000'; x.fill(); x.restore();
    }, 1.5);
  }
  function glint() { return get('glint', 24, 24, (x) => glintAt(x, 0, 0, 11, 1)); }

  // a splinter of the crystal that just broke: three lit facets, so it tumbles convincingly
  function shard(hex) {
    const s = 16;
    return get('shard:' + hex, s, s, (x) => {
      const P = [[0, -6.4], [5.6, 4.2], [-5.6, 4.2]], C = [0.4, 0.2];
      for (let k = 0; k < 3; k++) {
        const a = P[k], b = P[(k + 1) % 3];
        x.beginPath(); x.moveTo(C[0], C[1]); x.lineTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.closePath();
        x.fillStyle = shade(hex, facing((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), 0.7, 0.5); x.fill();
      }
      poly(x, P); x.strokeStyle = U.rgba(U.mix(hex, '#ffffff', 0.7), 0.9); x.lineWidth = 0.7; x.lineJoin = 'round'; x.stroke();
    });
  }
  // square "pixel" particle for the Pixel Dust trail
  function square(hex) {
    const s = 10;
    return get('square:' + hex, s, s, (x) => { x.fillStyle = hex; x.fillRect(-4, -4, 8, 8); x.fillStyle = 'rgba(255,255,255,0.7)'; x.fillRect(-4, -4, 3, 3); });
  }
  const spark = hex => glow(hex, 6, 1);

  function clear() { cache.clear(); bytes = 0; }
  return { SS, RING_CREST, glow, gem, darkShard, prism, novaCore, novaRays, novaPillar, novaFlame, NOVA, darkSeal, orb, orbShine, ringTex, bokeh, beam, bgGem, glint, shard, square, spark, shapePath, verts, clear,
           get cacheSize() { return cache.size; }, get cacheBytes() { return bytes; } };
})();
