/* KABLAST — renderer. Canvas 2D, batched into additive ("lighter") and normal passes, sprite blits only.
   World transform: x in [0, W]; y grows downward; the camera is a y-offset + zoom + shake.

   Depth, back to front: the palette sky → nebula and light shafts → four parallax layers (far stars, bokeh,
   out-of-focus crystals, near motes) → the world theme → the cavern walls with their crystal outcrops →
   glows → the crystals themselves → the Dark → the orb, its ring and its trail → particles → screen grade.
   Everything that moves on its own moves slowly: the game is fast, the world around it is calm. */
KABLAST.render = (() => {
  const U = KABLAST.U, S = KABLAST.sprites, CFG = KABLAST.CFG, TAU = U.TAU;
  let canvas, ctx, cw = 0, ch = 0, dpr = 1, scale = 1;
  const layers = [];
  const q = [];
  // QUALITY GOVERNOR. Everything decorative has a cheaper form. If the device cannot hold ~42 fps for two seconds,
  // the renderer steps down once, for the rest of the session: no nebula or light shafts, no far bokeh or ghost
  // crystals, no glow strokes on the walls, no sparkles or tendril beads. The game itself looks and plays the same.
  let quality = /[?&]lq/.test(location.search) ? 0 : 1, slowFrames = 0, ema = 1 / 60;
  function govern(dt) {
    if (!(dt > 0) || !quality) return;
    ema += (Math.min(dt, 0.05) - ema) * 0.05;
    if (ema > 1 / 42) { if (++slowFrames > 120) quality = 0; } else slowFrames = Math.max(0, slowFrames - 2);
  }
  const font = () => KABLAST.i18n.font();          // Lilita One, or Nunito Black when the language is Cyrillic

  function init(c) {
    canvas = c; ctx = c.getContext('2d', { alpha: false });
    // parallax layers: {depth, tile, points, kind}
    const mk = (depth, n, tile, kind) => {
      const pts = []; const rng = U.mulberry32(1000 + depth * 1000);
      for (let i = 0; i < n; i++) pts.push({ x: rng() * CFG.W, y: rng() * tile, s: rng(), a: 0.15 + rng() * 0.5, ph: rng() * TAU, hue: rng() });
      return { depth, tile, pts, kind };
    };
    layers.push(mk(0.1, 80, 1400, 'star'), mk(0.22, 8, 1600, 'bokeh'), mk(0.38, 9, 1800, 'gem'), mk(0.58, 26, 1400, 'mote'));
  }
  const gradCache = new Map();
  function resize(w, h, ratio) {
    cw = w; ch = h; dpr = ratio;
    // fit the 420-unit-wide world to the screen width, but never show less than ~780 units of height (tablets)
    scale = Math.min(cw / CFG.W, ch / 780);
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    gradCache.clear();
  }
  function cached(key, make) { let g = gradCache.get(key); if (!g) { g = make(); gradCache.set(key, g); } return g; }
  function paletteGrad(bg) {
    return cached('bg' + bg.join(','), () => { const g = ctx.createLinearGradient(0, 0, 0, ch); g.addColorStop(0, bg[0]); g.addColorStop(0.55, bg[1]); g.addColorStop(1, bg[2]); return g; });
  }
  // background palette follows the level (and the Supernova bonus); crossfades over the first 120 m of each look
  function drawBackground(maxHUnits) {
    const m = maxHUnits / CFG.unitsPerMeter, lv = KABLAST.levels.at(m), K = KABLAST.cosmetics;
    const prev = KABLAST.levels.at(Math.max(0, lv.boundaryM - 1));
    ctx.fillStyle = paletteGrad(K.palette(prev.palette)); ctx.fillRect(0, 0, cw, ch);
    const t = U.clamp((m - lv.boundaryM) / 120, 0, 1);
    if (t > 0) { ctx.globalAlpha = t; ctx.fillStyle = paletteGrad(K.palette(lv.palette)); ctx.fillRect(0, 0, cw, ch); ctx.globalAlpha = 1; }
  }
  const viewH = () => ch / scale;

  function worldTransform(cam) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(cw / 2 + cam.sx, ch / 2 + cam.sy);
    ctx.scale(scale * cam.zoom, scale * cam.zoom);
    ctx.translate(-CFG.W / 2, -cam.y);
  }
  function depthTransform(cam, depth) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(cw / 2, ch / 2); ctx.scale(scale * cam.zoom, scale * cam.zoom); ctx.translate(-CFG.W / 2, -cam.y * depth);
  }

  // ===== atmosphere: nebula clouds far behind everything, and light falling down the well from somewhere above
  const NEB_TILE = 2600, NEB = (() => { const rng = U.mulberry32(77), a = []; for (let i = 0; i < 5; i++) a.push({ x: rng() * CFG.W, y: rng() * NEB_TILE, s: 380 + rng() * 300, a: 0.05 + rng() * 0.05, c: i % 3, ph: rng() * TAU }); return a; })();
  function drawAtmosphere(cam, t) {
    const K = KABLAST.cosmetics, dust = K.dust(), wall = K.wall(), cols = [dust[0], dust[1], wall.glow];
    const depth = 0.05, hv = ch / (2 * scale * cam.zoom);
    depthTransform(cam, depth);
    ctx.globalCompositeOperation = 'lighter';
    const y0 = cam.y * depth - hv - 400, y1 = cam.y * depth + hv + 400;
    for (let i = Math.floor(y0 / NEB_TILE); i <= Math.floor(y1 / NEB_TILE); i++) {
      for (const n of NEB) {
        const y = n.y + i * NEB_TILE; if (y < y0 || y > y1) continue;
        const x = n.x + Math.sin(t * 0.05 + n.ph) * 40, s = n.s * (1 + 0.06 * Math.sin(t * 0.09 + n.ph));
        ctx.globalAlpha = n.a; ctx.drawImage(S.glow(cols[n.c], 64), x - s / 2, y - s / 2, s, s);
      }
    }
    // three shafts of light, swaying very slowly, brighter toward the top of the screen
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bm = S.beam(U.mix(dust[0], '#ffffff', 0.4));
    for (let k = 0; k < 3; k++) {
      const x = cw * (0.18 + 0.32 * k) + Math.sin(t * 0.11 + k * 2.1) * cw * 0.05, w = cw * (0.2 + 0.07 * k), h = ch * 1.25;
      ctx.save(); ctx.translate(x, -ch * 0.05); ctx.rotate(0.2 - k * 0.09 + Math.sin(t * 0.07 + k) * 0.035);
      ctx.globalAlpha = 0.045 + 0.022 * Math.sin(t * 0.23 + k * 1.7); ctx.drawImage(bm, -w / 2, 0, w, h); ctx.restore();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  // The backdrop — sky gradient, nebula, light shafts — is nothing but soft light, so it is painted into a canvas at
  // a quarter of the screen's pixels and stretched over it in one blit. Same picture, a fraction of the fill cost.
  const BACK = 0.5;                                    // backdrop pixels per CSS pixel
  let back = null, bctx = null;
  function drawBackdrop(cam, t, maxH) {
    if (!quality) { drawBackground(maxH); return; }
    const bw = Math.max(2, Math.round(cw * BACK)), bh = Math.max(2, Math.round(ch * BACK));
    if (!back || back.width !== bw || back.height !== bh) { back = document.createElement('canvas'); back.width = bw; back.height = bh; bctx = back.getContext('2d', { alpha: false }); }
    const mainCtx = ctx, mainDpr = dpr;
    ctx = bctx; dpr = BACK;
    try {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      drawBackground(maxH);
      drawAtmosphere(cam, t);
    } finally { ctx = mainCtx; dpr = mainDpr; }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true;
    ctx.drawImage(back, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawParallax(cam, t) {
    const hv = ch / (2 * scale * cam.zoom), K = KABLAST.cosmetics, dust = K.dust(), shape = K.current('crystal').shape;
    for (const L of layers) {
      if (!quality && (L.kind === 'bokeh' || L.kind === 'gem')) continue;
      depthTransform(cam, L.depth);
      const y0 = cam.y * L.depth - hv - 60, y1 = cam.y * L.depth + hv + 60;
      const i0 = Math.floor(y0 / L.tile), i1 = Math.floor(y1 / L.tile);
      ctx.globalCompositeOperation = L.kind === 'gem' ? 'source-over' : 'lighter';
      for (let i = i0; i <= i1; i++) {
        for (const p of L.pts) {
          const y = p.y + i * L.tile; if (y < y0 || y > y1) continue;
          const tw = 0.6 + 0.4 * Math.sin(t * 0.8 + p.ph), col = p.hue < 0.5 ? dust[0] : dust[1];
          if (L.kind === 'star') { const s = 1.4 + p.s * 2.6; ctx.globalAlpha = p.a * tw * 0.8; ctx.drawImage(S.glow(col, 6), p.x - s, y - s, s * 2, s * 2); }
          else if (L.kind === 'bokeh') { const s = 8 + p.s * 14, x = p.x + Math.sin(t * 0.06 + p.ph) * 12; ctx.globalAlpha = (0.12 + 0.1 * tw) * (0.6 + p.a); ctx.drawImage(S.bokeh(col), x - s, y - s, s * 2, s * 2); }
          else if (L.kind === 'gem') { const s = 34 + p.s * 40; ctx.globalAlpha = 0.09 + 0.04 * tw; ctx.save(); ctx.translate(p.x, y); ctx.rotate(p.ph + t * 0.02); ctx.drawImage(S.bgGem(shape, col), -s, -s, s * 2, s * 2); ctx.restore(); }
          else { const s = 1.6 + p.s * 2.8, x = p.x + Math.sin(t * 0.3 + p.ph) * 6; ctx.globalAlpha = p.a * tw; ctx.drawImage(S.glow(col, 6), x - s, y - s, s * 2, s * 2); }
        }
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  // ===== the cavern walls: rock lit from the well side, a lit lip, crystal outcrops that catch the light
  function wallPath(rows, top, bottom, side) {
    ctx.beginPath(); let started = false;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]; if (r.y > bottom + 80 || r.y < top - 80) continue;
      const x = side < 0 ? r.l : CFG.W - r.r;
      if (!started) { ctx.moveTo(side < 0 ? -40 : CFG.W + 40, r.y + 40); started = true; }
      ctx.lineTo(x, r.y);
    }
    if (!started) return false;
    ctx.lineTo(side < 0 ? -40 : CFG.W + 40, top - 80); ctx.closePath();
    return true;
  }
  function wallLip(rows, top, bottom, side) {           // the rock edge alone, as an open path
    ctx.beginPath(); let started = false;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]; if (r.y > bottom + 80 || r.y < top - 80) continue;
      const x = side < 0 ? r.l : CFG.W - r.r;
      started ? ctx.lineTo(x, r.y) : ctx.moveTo(x, r.y); started = true;
    }
    return started;
  }
  function drawWalls(world, top, bottom, t) {
    const rows = world.wall; if (!rows.length) return;
    const Wc = KABLAST.cosmetics.wall();
    // solid rock beyond the world edges (visible on wide screens / tablets)
    ctx.fillStyle = Wc.fill; ctx.fillRect(-1000, top - 200, 960, bottom - top + 400); ctx.fillRect(CFG.W + 40, top - 200, 960, bottom - top + 400);
    for (const side of [-1, 1]) {
      if (!wallPath(rows, top, bottom, side)) continue;
      ctx.fillStyle = cached('wall' + side + Wc.fill, () => {
        const g = side < 0 ? ctx.createLinearGradient(-6, 0, 40, 0) : ctx.createLinearGradient(CFG.W + 6, 0, CFG.W - 40, 0);
        g.addColorStop(0, Wc.fill); g.addColorStop(0.55, U.mix(Wc.fill, Wc.line, 0.1)); g.addColorStop(1, U.mix(Wc.fill, Wc.line, 0.26)); return g;
      });
      ctx.fill();
      if (!wallLip(rows, top, bottom, side)) continue;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (quality) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = Wc.glow; ctx.globalAlpha = 0.06; ctx.lineWidth = 16; ctx.stroke();
        ctx.globalAlpha = 0.14; ctx.lineWidth = 5; ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.strokeStyle = Wc.line; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.strokeStyle = U.mix(Wc.glow, '#ffffff', 0.55); ctx.globalAlpha = 0.45; ctx.lineWidth = 0.7; ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // crystal outcrops: every few rows a small cluster of crystals grows out of the rock, leaning into the well
    const cols = CFG.colors;
    for (let i = 0; quality && i < rows.length; i++) {
      const r = rows[i]; if (r.y > bottom + 40 || r.y < top - 40) continue;
      const hsh = U.hashStr('o' + Math.round(r.y));
      for (const side of [-1, 1]) {
        const h2 = side < 0 ? hsh : (hsh >>> 5); if (h2 % 4) continue;
        const ex = side < 0 ? r.l : CFG.W - r.r, hex = cols[(h2 >>> 3) % 4].hex, spr = S.shard(U.mix(hex, Wc.fill, 0.18));
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.22; ctx.drawImage(S.glow(hex, 16), ex - side * 2 - 22, r.y - 22, 44, 44);
        ctx.globalCompositeOperation = 'source-over';
        for (let k = 0; k < 3; k++) {
          const lean = ((h2 >>> (k * 3 + 4)) % 7 - 3) * 0.14 + (k - 1) * 0.42, sz = (k === 1 ? 17 : 12) + ((h2 >>> (k * 2 + 9)) % 4) * 1.5;
          ctx.save(); ctx.translate(ex + side * 2, r.y + (k - 1) * 5); ctx.rotate(side < 0 ? Math.PI / 2 + lean : -Math.PI / 2 - lean);
          ctx.globalAlpha = 0.9; ctx.drawImage(spr, -sz * 0.36, -sz * 1.05, sz * 0.72, sz * 1.1); ctx.restore();
        }
        const tw = Math.pow(Math.max(0, Math.sin(t * 0.6 + (hsh % 97))), 14);
        if (tw > 0.02) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = tw; const gs = 18; ctx.drawImage(S.glint(), ex - side * 10 - gs / 2, r.y - 8 - gs / 2, gs, gs); ctx.globalCompositeOperation = 'source-over'; }
      }
    }
    ctx.globalAlpha = 1;
  }

  // ===== the Dark: a slow tide of ink with a glowing meniscus and a second wave behind it
  function darkSurface(darkY, x, t) { return darkY + Math.sin(x * 0.021 + t * 1.5) * 7 + Math.sin(x * 0.053 - t * 2.3) * 3.5; }
  function backSurface(darkY, x, t) { return darkY - 10 + Math.sin(x * 0.016 - t * 1.1 + 2) * 8 + Math.sin(x * 0.043 + t * 1.7) * 3; }
  function drawDark(dark, top, bottom, t, tide) {
    if (dark.y > bottom + 60) return;
    const C = KABLAST.cosmetics.darkSea();
    const flash = tide && tide.warn ? 0.5 + 0.5 * Math.sin(t * 18) : tide && tide.surge ? 1 : 0;
    // haze: the Dark's own glow, rising off it
    ctx.globalCompositeOperation = 'lighter';
    const hz = ctx.createLinearGradient(0, dark.y - 130, 0, dark.y + 6);
    hz.addColorStop(0, U.rgba(C.edge, 0)); hz.addColorStop(1, U.rgba(flash ? '#ff9bd6' : C.edge, 0.16 + flash * 0.2));
    ctx.fillStyle = hz; ctx.fillRect(-40, dark.y - 130, CFG.W + 80, 136);
    ctx.globalCompositeOperation = 'source-over';
    // the wave behind, translucent
    ctx.beginPath(); ctx.moveTo(-20, backSurface(dark.y, -20, t));
    for (let x = -10; x <= CFG.W + 20; x += 12) ctx.lineTo(x, backSurface(dark.y, x, t));
    ctx.lineTo(CFG.W + 20, dark.y + 16); ctx.lineTo(-20, dark.y + 16); ctx.closePath();       // the body covers the rest
    ctx.globalAlpha = 0.5; ctx.fillStyle = U.mix(C.top, C.edge, 0.3); ctx.fill(); ctx.globalAlpha = 1;
    // the body
    ctx.beginPath(); ctx.moveTo(-20, darkSurface(dark.y, -20, t));
    for (let x = -10; x <= CFG.W + 20; x += 10) ctx.lineTo(x, darkSurface(dark.y, x, t));
    ctx.lineTo(CFG.W + 20, bottom + 200); ctx.lineTo(-20, bottom + 200); ctx.closePath();
    const g = ctx.createLinearGradient(0, dark.y - 10, 0, dark.y + 280);
    g.addColorStop(0, U.mix(C.top, C.edge, 0.35)); g.addColorStop(0.07, C.top); g.addColorStop(0.35, C.mid); g.addColorStop(1, C.bottom);
    ctx.fillStyle = g; ctx.fill();
    // light deep inside the ink: a few slow luminous currents, so the Dark has depth instead of a flat fill
    if (quality) {
      ctx.save(); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
      const deep = S.glow(C.edge, 64);
      for (let k = 0; k < 4; k++) {
        const x = ((k * 137 + t * (k % 2 ? 7 : -5)) % (CFG.W + 240) + CFG.W + 240) % (CFG.W + 240) - 120, y = dark.y + 70 + k * 46 + Math.sin(t * 0.4 + k) * 12;
        const w = 260 + k * 30, h = 90 + k * 12;
        ctx.globalAlpha = 0.07 + 0.03 * Math.sin(t * 0.5 + k * 1.3); ctx.drawImage(deep, x - w / 2, y - h / 2, w, h);
      }
      ctx.restore();
      ctx.beginPath(); for (let x = -20; x <= CFG.W + 20; x += 10) { const y = darkSurface(dark.y, x, t); x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    }
    // the meniscus: a crisp lit edge inside two soft glows
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = flash ? '#ff9bd6' : C.edge;
    ctx.globalAlpha = 0.1 + flash * 0.2; ctx.lineWidth = 24; ctx.stroke();
    ctx.globalAlpha = 0.28 + flash * 0.4; ctx.lineWidth = 8; ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1; ctx.strokeStyle = U.mix(flash ? U.mix(C.edge, '#ffffff', flash * 0.8) : C.edge, '#ffffff', 0.3); ctx.lineWidth = 1.8 + flash * 1.5; ctx.stroke();
    // light riding the crest
    ctx.globalCompositeOperation = 'lighter';
    const gl = S.glow(U.mix(C.edge, '#ffffff', 0.5), 12);
    for (let k = 0; k < 11; k++) {
      const x = ((k / 11) * (CFG.W + 40) + t * (k % 2 ? 9 : -7) + 4000) % (CFG.W + 40) - 20;
      const a = Math.pow(Math.max(0, Math.sin(t * 0.9 + k * 2.3)), 4);
      if (a < 0.03) continue;
      ctx.globalAlpha = a * 0.8; const s = 7 + 5 * a; ctx.drawImage(gl, x - s, darkSurface(dark.y, x, t) - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  // ECLIPSE: the world beyond the orb's light fades to black; far crystals remain as faint hints
  function drawEclipse(orb, vis, world, dark, top, bottom, t) {
    const E = CFG.mech.eclipse;
    const g = ctx.createRadialGradient(orb.x, orb.y, E.lightR * 0.7, orb.x, orb.y, E.darkR);
    g.addColorStop(0, 'rgba(2,2,8,0)'); g.addColorStop(0.55, 'rgba(2,2,8,0.6)'); g.addColorStop(1, 'rgba(2,2,8,0.96)');
    ctx.fillStyle = g; ctx.fillRect(-60, top - 100, CFG.W + 120, bottom - top + 200);
    ctx.globalCompositeOperation = 'lighter';
    for (const c of vis) {
      const d = Math.hypot(c.x - orb.x, c.y - orb.y); if (d < E.lightR) continue;
      const sz = c.r * 2.2; ctx.globalAlpha = c.kind === 'dark' ? 0.22 : 0.16 + 0.06 * Math.sin(t * 3 + c.phase);
      ctx.drawImage(S.glow(colorOf(c), 16), c.x - sz / 2, c.y - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (dark.y < bottom + 60) { ctx.globalAlpha = 0.8; ctx.strokeStyle = KABLAST.cosmetics.darkSea().edge; ctx.lineWidth = 3; ctx.beginPath(); for (let x = -10; x <= CFG.W + 20; x += 10) { const y = darkSurface(dark.y, x, t); x === -10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.globalAlpha = 1; }
  }

  // wind bands (streaks blowing sideways) and gravity wells (spirals + orbiting motes)
  function drawFields(world, top, bottom, t) {
    for (const b of world.winds) {
      if (b.yBot < top || b.yTop > bottom) continue;
      const g = ctx.createLinearGradient(0, b.yTop, 0, b.yBot);
      g.addColorStop(0, 'rgba(120,255,240,0)'); g.addColorStop(0.5, 'rgba(120,255,240,0.07)'); g.addColorStop(1, 'rgba(120,255,240,0)');
      ctx.fillStyle = g; ctx.fillRect(-40, b.yTop, CFG.W + 80, b.yBot - b.yTop);
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      const rng = U.mulberry32(Math.floor(b.seed * 1000));
      for (let i = 0; i < 16; i++) {
        const y = b.yTop + rng() * (b.yBot - b.yTop), len = 30 + rng() * 60, sp = 0.6 + rng() * 0.8;
        const x = ((rng() * (CFG.W + 200) + t * b.s * sp * b.dir * 1.2) % (CFG.W + 200) + (CFG.W + 200)) % (CFG.W + 200) - 100;
        const lg = ctx.createLinearGradient(x, 0, x + len * b.dir, 0); lg.addColorStop(0, 'rgba(159,255,240,0)'); lg.addColorStop(1, 'rgba(159,255,240,1)');
        ctx.globalAlpha = 0.14 + rng() * 0.22; ctx.strokeStyle = lg; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len * b.dir, y); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    for (const v of world.vortices) {
      if (v.y + v.r < top || v.y - v.r > bottom) continue;
      ctx.save(); ctx.translate(v.x, v.y); ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.9; ctx.drawImage(S.glow('#5a2bff', 32), -70, -70, 140, 140);
      ctx.lineWidth = 2; ctx.strokeStyle = '#b48cff'; ctx.lineCap = 'round';
      for (let arm = 0; arm < 3; arm++) {
        ctx.beginPath();
        for (let k = 0; k <= 28; k++) { const f = k / 28, rr = v.r * (0.12 + 0.88 * f), a = t * 1.2 * v.dir + arm * U.TAU / 3 + f * 3.4 * v.dir; const px = Math.cos(a) * rr, py = Math.sin(a) * rr; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.globalAlpha = 0.26; ctx.stroke();
      }
      for (let i = 0; i < 9; i++) { const f = ((t * 0.2 + i / 9 + v.ph) % 1), rr = v.r * (1 - f) * 0.95, a = t * 1.8 * v.dir + i * U.TAU / 9 + f * 5 * v.dir; ctx.globalAlpha = 0.5 + 0.5 * f; ctx.drawImage(S.glow('#d9c8ff', 8), Math.cos(a) * rr - 6, Math.sin(a) * rr - 6, 12, 12); }
      ctx.globalAlpha = 0.2; ctx.beginPath(); ctx.arc(0, 0, v.r, 0, U.TAU); ctx.setLineDash([4, 12]); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
      ctx.restore(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  }

  function colorOf(c) {
    if (c.kind === 'dark') return CFG.darkShard.glow;
    if (c.kind === 'prism') return CFG.prism.hex;
    if (c.kind === 'nova') return CFG.novaCore.hex;
    return KABLAST.cosmetics.gemHex(c.color);
  }

  // ===== WORLD themes: ambient effects (all deterministic, tile-based, zero allocation per frame) =====
  const fxLayers = new Map();
  function fxLayer(kind) {
    let L = fxLayers.get(kind); if (L) return L;
    const n = { stars: 110, snow: 70, bubbles: 40, fireflies: 34, embers: 60, rain: 90, petals: 46, plankton: 64, sparks: 80 }[kind] || 50, tile = 1400, rng = U.mulberry32(U.hashStr(kind));
    const pts = []; for (let i = 0; i < n; i++) pts.push({ x: rng() * (CFG.W + 80) - 40, y: rng() * tile, s: rng(), ph: rng() * TAU, sp: 0.5 + rng() });
    L = { kind, pts, tile, depth: kind === 'stars' ? 0.12 : kind === 'rain' ? 0.7 : 0.4 }; fxLayers.set(kind, L); return L;
  }
  function drawWorldFx(theme, cam, t) {
    const acc = theme.accent || '#ffffff', kind = theme.fx;
    ctx.globalCompositeOperation = 'lighter';
    if (kind === 'aurora') {                          // screen space: three slow ribbons of light near the top
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.lineCap = 'round';
      const cols = [acc, U.mix(acc, '#7a5cff', 0.5), U.mix(acc, '#ffffff', 0.4)];
      for (let k = 0; k < 3; k++) {
        const yc = ch * (0.16 + 0.11 * k), amp = 22 + 9 * k;
        ctx.beginPath();
        for (let x = -30; x <= cw + 30; x += 16) { const y = yc + Math.sin(x * 0.011 + t * 0.35 + k * 1.7) * amp + Math.sin(x * 0.029 - t * 0.24 + k) * amp * 0.45; x < 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.strokeStyle = cols[k];
        for (const [w, a] of [[80, 0.035], [50, 0.05], [26, 0.08], [10, 0.14]]) { ctx.lineWidth = w; ctx.globalAlpha = a; ctx.stroke(); }
      }
      ctx.lineCap = 'butt';
    } else if (kind === 'grid') {                     // synthwave floor: a glowing grid far behind the well
      const depth = 0.55, hv = ch / (2 * scale * cam.zoom);
      depthTransform(cam, depth);
      const y0 = cam.y * depth - hv - 40, y1 = cam.y * depth + hv + 40;
      ctx.strokeStyle = acc; ctx.lineWidth = 1.2;
      for (let y = Math.floor(y0 / 90) * 90; y <= y1; y += 90) { ctx.globalAlpha = 0.11; ctx.beginPath(); ctx.moveTo(-60, y); ctx.lineTo(CFG.W + 60, y); ctx.stroke(); }
      for (let k = -4; k <= 4; k++) { const x = CFG.W / 2 + k * 62; ctx.globalAlpha = 0.13 - Math.abs(k) * 0.02; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke(); }
      const sun = S.glow(acc, 64); ctx.globalAlpha = 0.18 + 0.04 * Math.sin(t * 0.9); ctx.drawImage(sun, CFG.W / 2 - 170, cam.y * depth - hv * 0.9 - 170, 340, 340);
    } else {                                          // tiled particle layers that drift with time
      const L = fxLayer(kind), hv = ch / (2 * scale * cam.zoom);
      depthTransform(cam, L.depth);
      const y0 = cam.y * L.depth - hv - 60, y1 = cam.y * L.depth + hv + 60, i0 = Math.floor(y0 / L.tile), i1 = Math.floor(y1 / L.tile), WW = CFG.W + 80;
      const spr = S.glow(acc, 12), white = S.glow('#ffffff', 12), bk = S.bokeh(acc);
      for (let i = i0; i <= i1; i++) for (const p of L.pts) {
        let x = p.x, y = p.y, a = 1, sz = 0;
        if (kind === 'stars') { a = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.6 + p.s * 1.2) + p.ph)); sz = 1.2 + p.s * 2.4; }
        else if (kind === 'snow') { y = ((p.y + t * 22 * p.sp) % L.tile + L.tile) % L.tile; x = ((p.x + Math.sin(t * 0.5 + p.ph) * 16) % WW + WW) % WW - 40; a = 0.45 + 0.3 * p.s; sz = 4 + p.s * 6; }
        else if (kind === 'bubbles') { y = ((p.y - t * 28 * p.sp) % L.tile + L.tile) % L.tile; x = ((p.x + Math.sin(t * 0.9 + p.ph) * 9) % WW + WW) % WW - 40; a = 0.5; sz = 3 + p.s * 7; }
        else if (kind === 'fireflies') { x = ((p.x + Math.sin(t * 0.4 + p.ph) * 34) % WW + WW) % WW - 40; y = p.y + Math.cos(t * 0.3 + p.ph * 1.3) * 26; a = 0.15 + 0.85 * Math.pow(0.5 + 0.5 * Math.sin(t * 1.6 + p.ph * 3), 3); sz = 5 + p.s * 8; }
        else if (kind === 'embers') { y = ((p.y - t * 55 * p.sp) % L.tile + L.tile) % L.tile; x = ((p.x + Math.sin(t * 1.4 + p.ph) * 9) % WW + WW) % WW - 40; a = 0.35 + 0.5 * p.s; sz = 3 + p.s * 5; }
        else if (kind === 'rain') { y = ((p.y + t * 380 * p.sp) % L.tile + L.tile) % L.tile; x = ((p.x + t * 50 * p.sp) % WW + WW) % WW - 40; a = 0.16 + 0.18 * p.s; sz = 12 + p.s * 16; }
        // petals: falling slowly, swinging wide as they go, each rotating on its own
        else if (kind === 'petals') { y = ((p.y + t * 20 * p.sp) % L.tile + L.tile) % L.tile; x = ((p.x + Math.sin(t * 0.45 + p.ph) * 40) % WW + WW) % WW - 40; a = 0.35 + 0.35 * p.s; sz = 4 + p.s * 5; }
        // plankton: barely drifting, breathing in and out of visibility
        else if (kind === 'plankton') { y = p.y + Math.sin(t * 0.2 + p.ph) * 18; x = ((p.x + Math.cos(t * 0.17 + p.ph * 1.7) * 22) % WW + WW) % WW - 40; a = 0.12 + 0.6 * Math.pow(0.5 + 0.5 * Math.sin(t * 0.8 + p.ph * 2.3), 2); sz = 2.5 + p.s * 5; }
        // sparks: shooting upward, short and bright
        else if (kind === 'sparks') { y = ((p.y - t * 150 * p.sp) % L.tile + L.tile) % L.tile; x = ((p.x + Math.sin(t * 2.4 + p.ph) * 5) % WW + WW) % WW - 40; a = 0.25 + 0.55 * p.s; sz = 5 + p.s * 9; }
        y += i * L.tile; if (y < y0 || y > y1) continue;
        ctx.globalAlpha = a;
        if (kind === 'rain') { ctx.strokeStyle = acc; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - sz * 0.14, y - sz); ctx.stroke(); }
        else if (kind === 'bubbles') { ctx.drawImage(bk, x - sz, y - sz, sz * 2, sz * 2); ctx.strokeStyle = acc; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(x, y, sz, 0, TAU); ctx.stroke(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x - sz * 0.35, y - sz * 0.35, sz * 0.2, 0, TAU); ctx.fill(); }
        else if (kind === 'petals') { ctx.save(); ctx.translate(x, y); ctx.rotate(t * (0.5 + p.s) + p.ph); ctx.fillStyle = acc;
          ctx.beginPath(); ctx.ellipse(0, 0, sz, sz * 0.42, 0, 0, TAU); ctx.fill(); ctx.restore(); }
        else if (kind === 'sparks') { ctx.strokeStyle = acc; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + sz); ctx.stroke();
          ctx.drawImage(spr, x - 2.5, y - 2.5, 5, 5); }
        else if (kind === 'stars') { ctx.drawImage(p.s > 0.85 ? spr : white, x - sz, y - sz, sz * 2, sz * 2); if (p.s > 0.93) { const gs = sz * 5; ctx.drawImage(S.glint(), x - gs / 2, y - gs / 2, gs, gs); } }
        else ctx.drawImage(kind === 'snow' ? white : spr, x - sz, y - sz, sz * 2, sz * 2);
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  // ===== TRAIL styles (also used by the shop preview) =====
  // A tapered ribbon along the trail points, filled in one pass with a gradient that runs tail → head. One fill per
  // layer instead of one stroke per segment: no beading where segments overlap, and far fewer draw calls.
  function ribbon(c, tr, n, w0, w1, pow) {
    c.beginPath();
    for (let pass = 0; pass < 2; pass++) {
      for (let j = 0; j < n; j++) {
        const i = pass ? n - 1 - j : j;
        const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
        let dx = tr[b * 2] - tr[a * 2], dy = tr[b * 2 + 1] - tr[a * 2 + 1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
        const w = U.lerp(w0, w1, Math.pow(i / (n - 1), pow)) * 0.5 * (pass ? -1 : 1);
        const px = tr[i * 2] - dy * w, py = tr[i * 2 + 1] + dx * w;
        (pass || j) ? c.lineTo(px, py) : c.moveTo(px, py);
      }
    }
    c.closePath();
  }
  function along(c, tr, n, stops) {        // a gradient from the oldest trail point to the newest
    const g = c.createLinearGradient(tr[0], tr[1], tr[n * 2 - 2], tr[n * 2 - 1]);
    for (const [o, col] of stops) g.addColorStop(o, col);
    return g;
  }
  // Every trail is born from the orb and is never wider than it: D is the orb's width across its path (the renderer
  // passes the squashed width when the orb is stretched by speed), and nothing a trail draws is wider than D.
  function drawTrail(c, tr, skin, trailSkin, tReal, D) {
    const n = tr.length / 2, id = trailSkin.id, R = CFG.orb.r; D = D || R * 2;
    if (n < 3) return;
    c.lineCap = 'round'; c.lineJoin = 'round';
    if (id === 't.pixel') {                                        // square dust, no ribbon
      const spr = S.square(skin.trail), sprW = S.square('#ffffff');
      for (let i = 0; i < n; i++) { const k = i / n, sz = U.lerp(2, D * 0.72, k); const jx = Math.sin(i * 12.9898 + tReal * 3) * D * 0.1 * (1 - k); c.globalAlpha = k * 0.9; c.drawImage(i % 3 ? spr : sprW, tr[i * 2] - sz / 2 + jx, tr[i * 2 + 1] - sz / 2, sz, sz); }
    } else if (id === 't.bubbles') {                               // rings of light drifting off the path
      c.strokeStyle = skin.trail; c.lineWidth = 1.2; const bk = S.bokeh(skin.trail);
      for (let i = 0; i < n; i += 1) { const k = i / n, sz = U.lerp(1.5, D * 0.36, k) * (0.7 + 0.3 * Math.abs(Math.sin(i * 1.7))), x = tr[i * 2] + Math.sin(i * 2.3 + tReal * 1.6) * D * 0.1; c.globalAlpha = k * 0.7; c.drawImage(bk, x - sz, tr[i * 2 + 1] - sz, sz * 2, sz * 2); c.beginPath(); c.arc(x, tr[i * 2 + 1], sz, 0, TAU); c.stroke(); }
      c.fillStyle = '#ffffff'; for (let i = 0; i < n; i += 2) { const k = i / n; c.globalAlpha = k * 0.8; c.beginPath(); c.arc(tr[i * 2] + Math.sin(i * 2.3 + tReal * 1.6) * D * 0.1 - 2, tr[i * 2 + 1] - 2, 1.2, 0, TAU); c.fill(); }
    } else if (id === 't.neon') {                                  // one clean bright line with a wide soft halo
      c.globalAlpha = 1;
      ribbon(c, tr, n, 0, D, 1); c.fillStyle = along(c, tr, n, [[0, U.rgba(skin.trail, 0)], [1, U.rgba(skin.trail, 0.26)]]); c.fill();
      ribbon(c, tr, n, 0, D * 0.4, 0.6); c.fillStyle = along(c, tr, n, [[0, U.rgba(skin.trail, 0)], [1, U.rgba(skin.trail, 0.75)]]); c.fill();
      ribbon(c, tr, n, 1.4, 2.2, 1); c.fillStyle = along(c, tr, n, [[0, 'rgba(255,255,255,0)'], [0.3, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0.95)']]); c.fill();
    } else if (id === 't.ribbon') {                                // a flat twisting ribbon that catches the light
      for (let i = 1; i < n; i++) {
        const k = i / n, w = U.lerp(1, D * 0.9, k) * (0.45 + 0.55 * Math.abs(Math.sin(i * 0.5 + tReal * 4)));
        c.strokeStyle = i % 2 ? skin.trail : U.mix(skin.trail, '#ffffff', 0.6);
        c.lineWidth = w; c.globalAlpha = k * k * 0.75;
        c.beginPath(); c.moveTo(tr[i * 2 - 2], tr[i * 2 - 1]); c.lineTo(tr[i * 2], tr[i * 2 + 1]); c.stroke();
      }
    } else if (id === 't.smoke') {                                 // soft puffs that thin and fade behind you
      const spr = S.glow(skin.trail, 20);
      for (let i = 0; i < n; i++) {
        const k = i / n, sz = D * 1.4 * (0.55 + 0.45 * k) * (0.82 + 0.18 * Math.sin(i * 1.3));   // soft puffs: the visible part is about 60% of the sprite
        c.globalAlpha = k * 0.62;
        c.drawImage(spr, tr[i * 2] - sz / 2 + Math.sin(i * 0.9 + tReal * 0.8) * D * 0.08, tr[i * 2 + 1] - sz / 2, sz, sz);
      }
    } else if (id === 't.lightning') {                             // a jagged bolt that re-forks a dozen times a second
      const rng = U.mulberry32(Math.floor(tReal * 12));
      for (const [w, a, col] of [[D * 0.5, 0.16, skin.trail], [1.6, 0.95, '#ffffff']]) {
        c.strokeStyle = col; c.lineWidth = w; c.globalAlpha = a;
        c.beginPath();
        for (let i = 0; i < n; i++) { const k = i / n, j = (rng() * 2 - 1) * D * 0.26 * k; i ? c.lineTo(tr[i * 2] + j, tr[i * 2 + 1]) : c.moveTo(tr[i * 2] + j, tr[i * 2 + 1]); }
        c.stroke();
      }
    } else if (id === 't.notes') {                                 // little chevrons peeling off the path
      c.strokeStyle = skin.trail; c.lineWidth = 2; c.lineCap = 'round';
      for (let i = 2; i < n; i += 3) {
        const k = i / n, sz = 2 + k * D * 0.26, x = tr[i * 2] + Math.sin(i * 1.7 + tReal * 2) * D * 0.18, y = tr[i * 2 + 1];
        c.globalAlpha = k * 0.8; c.strokeStyle = i % 6 < 3 ? skin.trail : '#ffffff';
        c.beginPath(); c.moveTo(x - sz, y + sz * 0.5); c.lineTo(x, y - sz * 0.5); c.lineTo(x + sz, y + sz * 0.5); c.stroke();
      }
      c.lineCap = 'butt';
    } else if (id === 't.void') {                                  // a dark core inside a bright fringe — a hole in the light
      c.globalAlpha = 1;
      ribbon(c, tr, n, 0, D, 1.4); c.fillStyle = along(c, tr, n, [[0, U.rgba(skin.trail, 0)], [1, U.rgba(skin.trail, 0.55)]]); c.fill();
      const op = c.globalCompositeOperation; c.globalCompositeOperation = 'source-over';
      ribbon(c, tr, n, 0, D * 0.66, 1.4); c.fillStyle = along(c, tr, n, [[0, 'rgba(5,3,15,0)'], [0.5, 'rgba(5,3,15,0.6)'], [1, 'rgba(5,3,15,0.92)']]); c.fill();
      c.globalCompositeOperation = op;
    } else {                                                       // ribbon family: comet / sparkle / fire / rainbow
      const fire = id === 't.fire', rainbow = id === 't.rainbow', sparkle = id === 't.sparkle';
      const col = skin.trail, body = sparkle ? 0.5 : 0.8;
      c.globalAlpha = 1;
      // glow
      ribbon(c, tr, n, 0, D * (sparkle ? 0.85 : 1), 1.5);
      c.fillStyle = fire ? along(c, tr, n, [[0, 'rgba(255,61,0,0)'], [0.6, 'rgba(255,90,0,0.14)'], [1, 'rgba(255,170,40,0.34)']])
        : along(c, tr, n, [[0, U.rgba(col, 0)], [0.55, U.rgba(col, 0.1)], [1, U.rgba(col, 0.3)]]);
      c.fill();
      // body
      ribbon(c, tr, n, 0, D * body, 1.3);
      if (rainbow) { const st = []; for (let s = 0; s <= 5; s++) { const o = s / 5; st.push([o, U.rgba(U.hslHex(tReal * 90 + s * 55, 100, 62), 0.85 * o * o)]); } c.fillStyle = along(c, tr, n, st); }
      else if (fire) c.fillStyle = along(c, tr, n, [[0, 'rgba(255,61,0,0)'], [0.4, 'rgba(255,80,0,0.3)'], [0.8, 'rgba(255,154,28,0.7)'], [1, 'rgba(255,214,110,0.95)']]);
      else c.fillStyle = along(c, tr, n, [[0, U.rgba(col, 0)], [0.45, U.rgba(col, 0.22)], [1, U.rgba(col, 0.8)]]);
      c.fill();
      // white-hot core
      ribbon(c, tr, n, 0, D * 0.34, 1.1);
      c.fillStyle = along(c, tr, n, [[0, 'rgba(255,255,255,0)'], [0.55, fire ? 'rgba(255,242,168,0.25)' : 'rgba(255,255,255,0.22)'], [1, fire ? 'rgba(255,242,168,0.9)' : 'rgba(255,255,255,0.85)']]);
      c.fill();
      const tspr = S.glow(fire ? '#ff9a1c' : rainbow ? '#ffffff' : col, 16);
      for (let i = 0; i < n; i += 3) {
        const k = i / n; let sz = U.lerp(3, D * 0.9, k * k), dx = Math.sin(i * 2.1 + tReal * 1.3) * D * 0.08 * (1 - k), dy = 0, a = k * k * 0.22;
        if (fire) { dy = -(1 - k) * 18 - 3; dx = Math.sin(i * 3.1 + tReal * 7) * D * 0.12; a = k * 0.5; sz *= 0.8; }
        if (sparkle) { const tw = 0.5 + 0.5 * Math.sin(tReal * 9 + i * 2.7); dx = Math.sin(i * 7.3) * D * 0.3; dy = Math.cos(i * 5.1) * D * 0.3; a = k * tw * 0.9; sz = 3 + tw * D * 0.3; }
        c.globalAlpha = a; c.drawImage(tspr, tr[i * 2] - sz / 2 + dx, tr[i * 2 + 1] - sz / 2 + dy, sz, sz);
      }
      if (sparkle) { const gl = S.glint(); for (let i = 3; i < n; i += 4) { const k = i / n, tw = 0.5 + 0.5 * Math.sin(tReal * 7 + i * 1.9), x = tr[i * 2] + Math.sin(i * 7.3) * D * 0.3, y = tr[i * 2 + 1] + Math.cos(i * 5.1) * D * 0.3, l = 4 + tw * D * 0.36; c.globalAlpha = k * tw; c.drawImage(gl, x - l / 2, y - l / 2, l, l); } }
    }
    c.globalAlpha = 1;
  }
  // shop preview: a curved sample of a trail on a small canvas, finished with the orb itself
  function previewTrail(canvas, skin, trailSkin, tReal) {
    const c = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
    c.setTransform(w / 120, 0, 0, h / 120, 0, 0);
    // an S-curve that stays inside the round frame, with the orb well clear of the edge
    const P = []; for (let i = 0; i < 26; i++) { const k = i / 25; P.push(20 + k * 64 + Math.sin(k * 5.2) * 7, 100 - k * 64); }
    const live = KABLAST.skins.liveColors(skin, tReal);
    c.globalCompositeOperation = 'lighter';
    drawTrail(c, P, live, trailSkin, tReal);
    drawTrail(c, P, live, trailSkin, tReal);                    // twice: a thumbnail needs the trail at full strength
    const hx = P[50], hy = P[51];
    c.globalAlpha = 0.7; c.drawImage(S.glow(live.halo, 32), hx - 26, hy - 26, 52, 52);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    drawOrbAt(c, hx, hy, CFG.orb.r * 1.15, live);
  }
  // the orb body + its fixed highlight, at any size (used by the game, the shop and the previews)
  function drawOrbAt(c, x, y, r, skin) {
    const sr = r > 13 ? 26 : CFG.orb.r;               // big previews get their own sharp bake
    const o = S.orb(skin.core, skin.halo, sr), os = o.width / o.ss * r / sr;
    c.drawImage(o, x - os / 2, y - os / 2, os, os);
    const sh = S.orbShine(sr), ss = sh.width / sh.ss * r / sr;
    c.drawImage(sh, x - ss / 2, y - ss / 2, ss, ss);
  }
  function previewOrb(canvas, skin, tReal) {
    const c = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
    c.setTransform(w / 120, 0, 0, h / 120, 0, 0);
    const live = KABLAST.skins.liveColors(skin, tReal || 0);
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.5; c.drawImage(S.glow(live.halo, 64), 0, 0, 120, 120);
    c.globalAlpha = 0.85; c.drawImage(S.glow(live.halo, 32), 18, 18, 84, 84);
    c.globalAlpha = 0.4; const D = 44 / S.RING_CREST; c.drawImage(S.ringTex(live.halo), 60 - D, 60 - D, D * 2, D * 2);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    drawOrbAt(c, 60, 60, 33, live);
  }

  // A soft band of light on a circle — a stroked annulus with a radial gradient, so only the pixels of the band
  // itself are touched (a blitted ring texture would push every pixel of its whole bounding square).
  // The bright crest sits exactly on radius R; `w` is how far the glow reaches inward.
  // ===== the KILLER SHARD: a throb of red heat, a turning dashed ring that marks its reach, embers rising off it
  const dangerPulse = (tr, c) => Math.pow(0.5 + 0.5 * Math.sin(tr * 8.2 + c.phase * 3), 3);
  function darkHazard(c, y, tr, hot, solid) {
    const RED = CFG.darkShard.glow, p = dangerPulse(tr, c), k = (hot ? 1.6 : 1) * (solid ? 1 : 0.3), r = c.r;
    ctx.save(); ctx.translate(c.x, y); ctx.rotate(tr * (c.phase > Math.PI ? -0.8 : 0.8));
    ctx.strokeStyle = RED; ctx.lineWidth = 1.5; ctx.setLineDash([6, 7]);
    ctx.globalAlpha = Math.min(1, (0.42 + 0.3 * p) * k); ctx.beginPath(); ctx.arc(0, 0, r * (1.78 + 0.06 * p), 0, TAU); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
    for (let i = 0; i < 2; i++) {                          // embers: it is burning, and it will burn you
      const f = (tr * 0.55 + i * 0.5 + c.phase * 0.2) % 1, ex = c.x + Math.sin(f * 7 + c.phase * 5) * 7 + (i ? 6 : -6), ey = y - r * 0.6 - f * 44;
      const sz = 9 * (1 - f * 0.6); ctx.globalAlpha = Math.sin(f * Math.PI) * 0.85 * k;
      ctx.drawImage(S.glow(RED, 8), ex - sz / 2, ey - sz / 2, sz, sz);
    }
  }
  // ===== the NOVA CORE: everything alive about it. It has to read, from anywhere on screen, as "this one takes you up".
  // A heartbeat (two quick thumps, a rest), a turning corona, a sonar ripple, chevrons rising off it, sparks in orbit,
  // and a pillar of gold light through it that reaches down the well long before the Nova itself scrolls into view.
  const novaBeat = (tr, c) => { const f = (tr * 0.9 + c.phase * 0.16) % 1; return Math.max(Math.exp(-Math.pow((f - 0.08) / 0.05, 2)), 0.7 * Math.exp(-Math.pow((f - 0.24) / 0.05, 2))); };
  function novaBeacon(c, t, tr, hot, solid) {
    const b = novaBeat(tr, c), k = (hot ? 1.7 : 1) * (solid ? 1 : 0.25);
    ctx.globalAlpha = Math.min(1, (0.34 + 0.14 * b) * k);
    ctx.drawImage(S.novaPillar(), c.x - 30, c.y - 900, 60, 1800);
    ctx.globalAlpha = Math.min(1, (0.16 + 0.06 * b) * k);
    ctx.drawImage(S.novaPillar(), c.x - 120, c.y - 640, 240, 1280);          // a wide, faint shaft around the bright core
  }
  function novaAura(c, y, t, tr, hot, solid) {
    const S2 = S.NOVA, b = novaBeat(tr, c), k = (hot ? 1.5 : 1) * (solid ? 1 : 0.2), r = c.r;
    // bloom that thumps with the heartbeat
    let g = r * (7.6 + 2.6 * b) * (hot ? 1.3 : 1);
    ctx.globalAlpha = Math.min(1, (0.78 + 0.22 * b) * k); ctx.drawImage(S.glow(S2.lit, 32), c.x - g / 2, y - g / 2, g, g);
    g = r * 3.2; ctx.globalAlpha = Math.min(1, 0.7 * k); ctx.drawImage(S.glow('#fff6c8', 32), c.x - g / 2, y - g / 2, g, g);
    // the corona: two layers turning against each other
    const rays = S.novaRays(), rs = r * (7.2 + 0.8 * b) * (hot ? 1.2 : 1);
    ctx.save(); ctx.translate(c.x, y);
    ctx.rotate(tr * 0.32); ctx.globalAlpha = Math.min(1, k); ctx.drawImage(rays, -rs / 2, -rs / 2, rs, rs);
    ctx.rotate(-tr * 0.32 - tr * 0.5 + 0.2); ctx.globalAlpha = 0.55 * k; ctx.drawImage(rays, -rs * 0.36, -rs * 0.36, rs * 0.72, rs * 0.72);
    ctx.restore();
    // a thin gold halo that swells with each beat: the frame around something precious
    ctx.globalAlpha = (0.35 + 0.4 * b) * k; ctx.strokeStyle = S2.lit; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(c.x, y, r * (1.95 + 0.12 * b), 0, TAU); ctx.stroke();
    if (!quality) return;
    // sonar: a ring that leaves the star every beat and fades as it spreads
    const f = (tr * 0.9 + c.phase * 0.16) % 1, fr = U.clamp((f - 0.08) / 0.8, 0, 1);
    if (fr > 0) softRing(ctx, c.x, y, r * (1.3 + 3.4 * (1 - Math.pow(1 - fr, 3))), S2.lit, (1 - fr) * 0.7 * k, 9);
    // chevrons rising off the top: this way up
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < 3; i++) {
      const q = (tr * 0.75 + i / 3) % 1, cy = y - r * 2.1 - q * 104, a = Math.sin(q * Math.PI) * 0.95 * k, wv = 12 - q * 3;
      ctx.globalAlpha = a; ctx.strokeStyle = S2.lit; ctx.lineWidth = 4.2;
      ctx.beginPath(); ctx.moveTo(c.x - wv, cy + wv * 0.62); ctx.lineTo(c.x, cy); ctx.lineTo(c.x + wv, cy + wv * 0.62); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6; ctx.stroke();
    }
    // three sparks on a tilted orbit
    for (let i = 0; i < 3; i++) {
      const a = tr * 2.1 + i * TAU / 3, px = Math.cos(a) * r * 2.4, py = Math.sin(a) * r * 0.7;
      const front = Math.sin(a) > 0, sz = front ? 15 : 10;
      ctx.globalAlpha = (front ? 1 : 0.5) * k; ctx.drawImage(S.glow('#fff6c8', 8), c.x + px * 0.94 + py * 0.34 - sz / 2, y + py * 0.94 - px * 0.34 - sz / 2, sz, sz);
    }
    ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
  }
  function novaLabel(c, y, tr) {
    const text = KABLAST.i18n.t('label.boost'), ly = y + c.r * 2.3 + 8;
    ctx.save(); ctx.font = `14px ${font()}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(tr * 3.2);
    ctx.lineWidth = 4.5; ctx.strokeStyle = '#0a0626'; ctx.strokeText(text, c.x, ly + 1.5); ctx.strokeText(text, c.x, ly);
    const g = ctx.createLinearGradient(0, ly - 7, 0, ly + 7); g.addColorStop(0, '#fffbe0'); g.addColorStop(1, '#ffc233');
    ctx.fillStyle = g; ctx.fillText(text, c.x, ly);
    ctx.restore();
  }
  function softRing(c, x, y, R, hex, alpha, w) {
    if (R < 2 || alpha <= 0.01) return;
    const r0 = Math.max(0.5, R - w), r1 = R + w * 0.45, crest = (R - r0) / (r1 - r0);
    const g = c.createRadialGradient(x, y, r0, x, y, r1);
    g.addColorStop(0, U.rgba(hex, 0)); g.addColorStop(crest * 0.6, U.rgba(hex, 0.12 * alpha)); g.addColorStop(crest * 0.9, U.rgba(hex, 0.55 * alpha));
    g.addColorStop(crest, U.rgba(U.mix(hex, '#ffffff', 0.7), alpha)); g.addColorStop(Math.min(0.99, crest + (1 - crest) * 0.35), U.rgba(hex, 0.4 * alpha)); g.addColorStop(1, U.rgba(hex, 0));
    c.strokeStyle = g; c.lineWidth = r1 - r0; c.beginPath(); c.arc(x, y, (r0 + r1) / 2, 0, TAU); c.stroke();
  }

  // ===== the ONE shield: an unmistakable glass bubble around the orb =====
  const SHIELD_HEX = '#9ffcff', SHIELD_PAD = 17;
  function drawShield(orb, tReal, charging) {
    const r = CFG.orb.r + SHIELD_PAD + Math.sin(tReal * 2) * 1.2;
    ctx.save(); ctx.translate(orb.x, orb.y); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    // glass body: clear in the middle, bright toward the rim
    const g = ctx.createRadialGradient(0, 0, r * 0.45, 0, 0, r);
    g.addColorStop(0, 'rgba(159,252,255,0.03)'); g.addColorStop(0.78, 'rgba(159,252,255,0.10)'); g.addColorStop(1, 'rgba(159,252,255,0.42)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    // rim
    ctx.strokeStyle = SHIELD_HEX; ctx.lineWidth = 2.4; ctx.globalAlpha = 0.85 + 0.1 * Math.sin(tReal * 3);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    // faint hex facets slowly turning inside the glass
    ctx.globalAlpha = 0.18; ctx.lineWidth = 0.9; ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = tReal * 0.3 + i * TAU / 6; ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); ctx.lineTo(Math.cos(a + TAU / 3) * r, Math.sin(a + TAU / 3) * r); }
    ctx.stroke();
    // specular highlights sweeping around the rim
    ctx.strokeStyle = '#ffffff'; const sa = -tReal * 1.1;
    ctx.globalAlpha = 0.95; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r - 1.2, sa, sa + 0.85); ctx.stroke();
    ctx.globalAlpha = 0.5; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, r - 1.2, sa + Math.PI * 1.1, sa + Math.PI * 1.1 + 0.45); ctx.stroke();
    // soft outer glow
    ctx.globalAlpha = charging ? 0.3 : 0.45; const gs = r * 3.4; ctx.drawImage(S.glow(SHIELD_HEX, 32), -gs / 2, -gs / 2, gs, gs);
    ctx.restore();
  }
  // The break: a crack phase (the bubble flashes white while jagged cracks race out from the centre), then the
  // bubble flies apart as spinning glass fragments that fade. Driven by G.shatter (game.js).
  function drawShatter(s, tReal) {
    const r = CFG.orb.r + SHIELD_PAD;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (s.life < s.crack) {
      const k = s.life / s.crack;
      ctx.translate(s.x, s.y);
      ctx.fillStyle = `rgba(191,252,255,${0.10 + 0.22 * k})`; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.95; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      for (let pass = 0; pass < 2; pass++) {
        const rng = U.mulberry32(7), segs = 4;
        ctx.strokeStyle = pass ? '#ffffff' : 'rgba(12,6,34,0.9)'; ctx.lineWidth = pass ? 1.1 : 3; ctx.globalAlpha = pass ? 0.9 : 1;
        for (let i = 0; i < 8; i++) {
          const a = i * TAU / 8 + rng() * 0.5, r0 = r * 0.42, r1 = r0 + (r + 3 - r0) * Math.min(1, k * 1.25);
          ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
          for (let sg = 1; sg <= segs; sg++) { const rr = r0 + (r1 - r0) * sg / segs, aa = a + (rng() - 0.5) * 0.7; ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); }
          ctx.stroke();
        }
      }
    } else {
      const k = U.clamp((s.life - s.crack) / (s.dur - s.crack), 0, 1), a = Math.pow(1 - k, 1.4);
      for (const f of s.frags) {
        const cx = Math.cos(f.am) * r, cy = Math.sin(f.am) * r;
        ctx.save(); ctx.translate(s.x + cx + f.x, s.y + cy + f.y); ctx.rotate(f.rot);
        ctx.globalAlpha = a; ctx.strokeStyle = SHIELD_HEX; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(-cx, -cy, r, f.a0, f.a0 + f.span); ctx.stroke();
        ctx.globalAlpha = a * 0.9; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(-cx, -cy, r - 1.2, f.a0 + 0.05, f.a0 + f.span - 0.05); ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  // the launch pad: a holographic disc with a column of light rising from it
  function drawPad(G, skin, t) {
    const a = G.padAlpha, py = 22, cx = CFG.W / 2;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a * 0.22; ctx.drawImage(S.beam(skin.halo), cx - 34, py - 150, 68, 300);
    ctx.globalAlpha = a * 0.55; ctx.drawImage(S.glow(skin.halo, 32), cx - 70, py - 22, 140, 44);
    ctx.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.translate(cx, py + 3); ctx.scale(1, 0.2);
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 58);
    g.addColorStop(0, U.rgba(skin.halo, 0.5 * a)); g.addColorStop(0.7, U.rgba(skin.halo, 0.16 * a)); g.addColorStop(1, U.rgba(skin.halo, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 58, 0, TAU); ctx.fill();
    ctx.globalAlpha = a; ctx.lineWidth = 4;
    ctx.strokeStyle = U.rgba(U.mix(skin.halo, '#ffffff', 0.4), 0.9); ctx.beginPath(); ctx.arc(0, 0, 40, 0, TAU); ctx.stroke();
    ctx.strokeStyle = U.rgba(skin.halo, 0.4); ctx.setLineDash([10, 12]); ctx.lineDashOffset = -t * 14; ctx.beginPath(); ctx.arc(0, 0, 52, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore(); ctx.globalAlpha = 1;
  }

  // a capsule path (roundRect is not in every WebKit this app supports)
  function capsule(x, y, w, h) { const r = h / 2; ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2); ctx.lineTo(x + r, y + h); ctx.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5); ctx.closePath(); }

  function draw(G) {
    const cam = KABLAST.fx.cam, t = G.t, tReal = G.tReal, orb = G.orb, world = G.world;
    govern(G.dtReal);
    const skin = G.skin, crystalSkin = KABLAST.cosmetics.current('crystal'), worldSkin = KABLAST.cosmetics.current('world'), trailSkin = KABLAST.cosmetics.current('trail');
    // --- background (screen space): the soft layers are painted small and stretched, the sharp ones at full size
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    drawBackdrop(cam, tReal, G.maxH || 0);
    drawParallax(cam, tReal);
    if (worldSkin.fx) drawWorldFx(worldSkin, cam, tReal);

    worldTransform(cam);
    const hv = ch / (2 * scale * cam.zoom), top = cam.y - hv, bottom = cam.y + hv;
    drawWalls(world, top, bottom, tReal);
    // personal best marker: a hairline that fades out at both walls, with its label on a small capsule
    const best = KABLAST.save.data.best;
    if (best > 0) {
      const by = -best * CFG.unitsPerMeter;
      if (by > top - 20 && by < bottom + 20) {
        const lg = cached('bestline', () => { const g = ctx.createLinearGradient(20, 0, CFG.W - 20, 0); g.addColorStop(0, 'rgba(255,230,109,0)'); g.addColorStop(0.2, 'rgba(255,230,109,0.55)'); g.addColorStop(0.8, 'rgba(255,230,109,0.55)'); g.addColorStop(1, 'rgba(255,230,109,0)'); return g; });
        ctx.setLineDash([2, 6]); ctx.lineCap = 'round'; ctx.strokeStyle = lg; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(20, by); ctx.lineTo(CFG.W - 20, by); ctx.stroke(); ctx.setLineDash([]); ctx.lineCap = 'butt';
        const T = KABLAST.i18n.t, label = T('best') + '  ' + U.fmt(best) + ' ' + T('unit.m');
        ctx.font = `11px ${font()}`; const tw = ctx.measureText(label).width + 18, lx = CFG.W - 44 - tw, ly = by - 21;
        capsule(lx, ly, tw, 16); ctx.fillStyle = 'rgba(20,12,44,0.78)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,230,109,0.55)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffe66d'; ctx.fillText(label, lx + tw / 2, ly + 8.5);
      }
    }

    drawFields(world, top, bottom, tReal);

    // --- visible crystals
    const vis = [];
    const cr = world.crystals;
    const novas = [];                                   // Nova cores light the well from well above the screen: their beacon reaches down
    for (let i = 0; i < cr.length; i++) { const c = cr[i]; if (!c.alive) continue; if (c.y > top - 60 && c.y < bottom + 60) vis.push(c); if (c.kind === 'nova' && c.y > top - 900 && c.y < bottom + 200) novas.push(c); }
    const charging = orb.charging && orb.alive;
    const R = orb.ringR, inRing = new Set();
    let dangerInRing = false;
    if (charging) {
      world.query(orb.x, orb.y, R + CFG.crystal.r * 0.6, q);
      for (const c of q) { if (c.alive && world.solid(c)) { inRing.add(c.id); if (c.kind === 'dark') dangerInRing = true; } }
    }
    // idle life: every crystal breathes on its own slow cycle (render only — hitboxes never move)
    const bob = c => Math.sin(t * 1.1 + c.phase) * 1.1;

    // ===== additive pass: glows, light, trail, halo
    ctx.globalCompositeOperation = 'lighter';
    // orb light spill (lights the walls)
    const spill = S.glow(skin.halo, 64);
    ctx.globalAlpha = (0.16 + (charging ? 0.12 : 0)) * (orb.alive ? 1 : 0.3);
    ctx.drawImage(spill, orb.x - 210, orb.y - 210, 420, 420);
    for (const c of novas) novaBeacon(c, t, tReal, inRing.has(c.id), world.solid(c));
    for (const c of vis) {
      if (c.kind === 'nova') continue;                  // the Nova has its own light (novaBeacon / novaAura)
      const hex = colorOf(c);
      let a, sz;
      if (c.kind === 'dark') { const p = dangerPulse(tReal, c); a = 0.42 + 0.34 * p; sz = c.r * (4.3 + 0.9 * p); }
      else if (c.kind === 'nova') { a = 0.7 + 0.2 * Math.sin(t * 2.2 + c.phase); sz = c.r * 6; }
      else { a = 0.36 + 0.12 * Math.sin(t * 1.6 + c.phase); sz = c.r * 3.8; }
      if (inRing.has(c.id)) { a = c.kind === 'dark' ? 0.95 : 0.95; sz *= 1.45; }
      if (!world.solid(c)) a *= 0.15;
      ctx.globalAlpha = a; ctx.drawImage(S.glow(hex, 32), c.x - sz / 2, c.y + bob(c) - sz / 2, sz, sz);
      if (c.bonus && world.solid(c)) {                  // Supernova Rush: a warm corona says "this one chains with anything"
        const gs = c.r * 4.4; ctx.globalAlpha = 0.3 + 0.12 * Math.sin(t * 2.6 + c.phase);
        ctx.drawImage(S.glow('#ffd76a', 32), c.x - gs / 2, c.y + bob(c) - gs / 2, gs, gs);
      }
    }
    for (const c of vis) if (c.kind === 'nova') novaAura(c, c.y + bob(c), t, tReal, inRing.has(c.id), world.solid(c));
    if (quality) for (const c of vis) if (c.kind === 'dark') darkHazard(c, c.y + bob(c), tReal, inRing.has(c.id), world.solid(c));
    if (charging) {
      // tendrils: a soft curve from each crystal in the ring to the orb, with a bead of light riding it inward
      ctx.lineCap = 'round';
      for (const c of vis) {
        if (!inRing.has(c.id)) continue;
        const hex = colorOf(c), dark = c.kind === 'dark';
        const mx = (c.x + orb.x) / 2, my = (c.y + orb.y) / 2, dx = orb.x - c.x, dy = orb.y - c.y, d = Math.hypot(dx, dy) || 1;
        const bend = Math.sin(tReal * 1.7 + c.phase * 3) * Math.min(14, d * 0.12);
        const qx = mx - dy / d * bend, qy = my + dx / d * bend;
        ctx.strokeStyle = hex; ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.quadraticCurveTo(qx, qy, orb.x, orb.y);
        if (quality) { ctx.globalAlpha = dark ? 0.3 : 0.14; ctx.lineWidth = 4.5; ctx.stroke(); }
        ctx.globalAlpha = dark ? 0.85 : 0.5; ctx.lineWidth = 1.1; ctx.stroke();
        if (quality) { const f = (tReal * 1.4 + c.phase) % 1, u = 1 - f;       // the bead: a point on the curve at parameter f
        const bx = u * u * c.x + 2 * u * f * qx + f * f * orb.x, by = u * u * c.y + 2 * u * f * qy + f * f * orb.y;
        ctx.globalAlpha = 0.9 * Math.sin(f * Math.PI); ctx.drawImage(S.glow(dark ? hex : U.mix(hex, '#ffffff', 0.5), 8), bx - 6, by - 6, 12, 12); }
        if (dark) { // warning halo, pulsing at a readable (not frantic) rate
          const p = 0.5 + 0.5 * Math.sin(tReal * 11);
          ctx.globalAlpha = 0.55 + 0.4 * p; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(c.x, c.y, c.r + 6 + 3 * p, 0, TAU); ctx.stroke();
        }
      }
      ctx.lineCap = 'butt';
    }
    // comet tail — style from the equipped trail skin
    // (during a Nova boost the tail burns gold: the colour steps in quarters so the sprite cache sees four variants, not hundreds)
    const bq = orb.alive && G.novaBoost > 0 ? Math.ceil(U.clamp(G.novaBoost / CFG.nova.boostT, 0, 1) * 4) / 4 : 0;
    const tailSkin = bq ? Object.assign({}, skin, { trail: U.mix(skin.trail, '#ffb52e', bq), halo: U.mix(skin.halo, '#ffc233', bq) }) : skin;
    const orbW = CFG.orb.r * 2 * (1 - U.clamp(Math.hypot(orb.vx, orb.vy) * KABLAST.fx.time.scale / 2800, 0, 0.42) * 0.45);   // its width across the path, after the speed squash
    if (orb.alive && orb.trail.length > 4 && !orb.onPad) drawTrail(ctx, orb.trail, tailSkin, trailSkin, tReal, orbW * 0.94);
    // the Nova boost: while it lasts the orb burns gold, with a flame streaming out behind it
    if (orb.alive && G.novaBoost > 0) {
      const f = U.clamp(G.novaBoost / CFG.nova.boostT, 0, 1), gs = CFG.orb.r * (10 + 6 * f), fl = 0.85 + 0.15 * Math.sin(tReal * 40);
      ctx.globalAlpha = 0.85 * f; ctx.drawImage(S.glow(S.NOVA.lit, 32), orb.x - gs / 2, orb.y - gs / 2, gs, gs);
      ctx.save(); ctx.translate(orb.x, orb.y); ctx.rotate(Math.atan2(orb.vy, orb.vx) + Math.PI / 2);
      const L = (150 + 170 * f) * fl, W = orbW * 0.9;           // the flame leaves the orb and is never wider than it
      ctx.globalAlpha = Math.min(1, 1.1 * f); ctx.drawImage(S.novaFlame(), -W / 2, 2, W, L);
      ctx.restore();
    }
    // halo, breathing slowly
    if (orb.alive) {
      const k = charging ? U.clamp(orb.chargeT / CFG.ring.tMax, 0, 1) : 0;
      const hs = CFG.orb.r * (4.6 + k * 2.2) + Math.sin(tReal * 2.2) * 2;
      ctx.globalAlpha = 0.85; ctx.drawImage(S.glow(skin.halo, 32), orb.x - hs / 2, orb.y - hs / 2, hs, hs);
      ctx.globalAlpha = 0.55 + k * 0.4; const cs = CFG.orb.r * 2.6; ctx.drawImage(S.glow('#ffffff', 16), orb.x - cs / 2, orb.y - cs / 2, cs, cs);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

    // ===== bodies
    for (const c of vis) {
      const spr = c.kind === 'dark' ? S.darkShard(c.r) : c.kind === 'prism' ? S.prism(c.r) : c.kind === 'nova' ? S.novaCore(c.r) : S.gem(colorOf(c), c.r);
      const hot = inRing.has(c.id);
      const sc = (hot ? 1.12 : 1) * (c.kind === 'nova' ? 1.3 * (1 + 0.08 * novaBeat(tReal, c)) : c.kind === 'dark' ? 1.15 * (1 + 0.05 * dangerPulse(tReal, c)) : 1);
      const w = spr.width / spr.ss * sc, h = spr.height / spr.ss * sc;
      let jx = 0, jy = bob(c);
      if (hot) { // a smooth shiver, and a lean toward the orb
        const dx = orb.x - c.x, dy = orb.y - c.y, d = Math.hypot(dx, dy) || 1;
        const sh = c.kind === 'dark' ? 2.4 : 1.1;        // a killer in the ring rattles hard
        jx = Math.sin(tReal * 43 + c.phase * 9) * sh + dx / d * 3.5; jy += Math.cos(tReal * 37 + c.phase * 7) * sh + dy / d * 3.5;
      }
      const ghost = !world.solid(c);
      ctx.save(); ctx.translate(c.x + jx, c.y + jy);
      ctx.rotate(c.kind === 'nova' ? Math.sin(tReal * 0.9 + c.phase) * 0.12
        : c.kind === 'dark' ? c.rot + tReal * (c.phase > Math.PI ? 0.55 : -0.55)          // killers turn slowly, like a blade
        : c.rot + Math.sin(t * 1.2 + c.phase) * 0.06);
      if (ghost) { ctx.globalAlpha = 0.28; ctx.drawImage(spr, -w / 2, -h / 2, w, h); ctx.globalAlpha = 0.6; ctx.setLineDash([3, 4]); ctx.strokeStyle = colorOf(c); ctx.lineWidth = 1.1; S.shapePath(ctx, c.r + 3, crystalSkin.shape); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
      else ctx.drawImage(spr, -w / 2, -h / 2, w, h);
      if (c.kind === 'dark') {                           // the skull seal stays upright while the thorns turn round it
        ctx.restore(); ctx.save(); ctx.translate(c.x + jx, c.y + jy);
        const se = S.darkSeal(c.r), ss2 = se.width / se.ss * sc;
        if (ghost) ctx.globalAlpha = 0.3;
        ctx.drawImage(se, -ss2 / 2, -ss2 / 2, ss2, ss2); ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
    // sparkle: each stone catches the light for a moment on its own slow cycle
    ctx.globalCompositeOperation = 'lighter';
    const gl = S.glint();
    for (const c of vis) {
      if (!quality || c.kind === 'dark' || c.kind === 'nova' || !world.solid(c)) continue;
      const w = c.bonus ? 0.14 : 0.07, f = (t * (c.bonus ? 0.6 : 0.32) + c.phase * 0.618) % 1; if (f > w) continue;
      const a = Math.sin(f / w * Math.PI), s = 8 + 12 * a;
      ctx.globalAlpha = a; ctx.drawImage(gl, c.x - c.r * 0.38 - s / 2, c.y + bob(c) - c.r * 0.48 - s / 2, s, s);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    // until the player has used a few, every Nova says what it is for
    if ((KABLAST.save.data.novaTotal || 0) < 5) for (const c of vis) if (c.kind === 'nova' && world.solid(c)) novaLabel(c, c.y + bob(c), tReal);
    // launch pad
    if (G.padAlpha > 0) drawPad(G, skin, tReal);
    // the Dark
    drawDark(G.dark, top, bottom, t, G.tide);

    // ===== orb core + charge ring
    if (orb.alive) {
      const k = charging ? U.clamp(orb.chargeT / CFG.ring.tMax, 0, 1) : 0;
      const pulse = orb.unstable ? 0.05 * Math.sin(tReal * 26) : 0;
      const os = CFG.orb.r * 2 * (1 + k * 0.12 + pulse);
      ctx.save(); ctx.translate(orb.x, orb.y);
      if (orb.invuln > 0) ctx.globalAlpha = 0.6 + 0.4 * Math.sin(tReal * 18);
      ctx.save();
      if (!orb.onPad) { // stretch along the velocity (comet squash)
        const sp = Math.hypot(orb.vx, orb.vy) * KABLAST.fx.time.scale, st = U.clamp(sp / 2800, 0, 0.42);
        ctx.rotate(Math.atan2(orb.vy, orb.vx)); ctx.scale(1 + st, 1 - st * 0.45);
      }
      const ob = S.orb(skin.core, skin.halo, CFG.orb.r), obs = ob.width / ob.ss * os / (CFG.orb.r * 2);
      ctx.drawImage(ob, -obs / 2, -obs / 2, obs, obs);
      ctx.restore();
      const sh = S.orbShine(CFG.orb.r), shs = sh.width / sh.ss * os / (CFG.orb.r * 2);
      ctx.drawImage(sh, -shs / 2, -shs / 2, shs, shs);
      ctx.restore(); ctx.globalAlpha = 1;
      if (orb.shield) drawShield(orb, tReal, charging);
      if (charging) {
        const tint = dangerInRing ? CFG.darkShard.glow : orb.unstable ? '#ffb84a' : skin.halo;
        const line = dangerInRing ? '#ff8a7a' : orb.unstable ? '#ffd28a' : '#ffffff';
        const jit = orb.unstable ? Math.sin(tReal * 47) * 1.4 : 0;
        ctx.save(); ctx.translate(orb.x + jit, orb.y + jit * 0.6);
        ctx.globalCompositeOperation = 'lighter';
        // a soft band of light gathering toward the rim (the lens), and one crisp line on its crest
        const pz = dangerInRing ? 0.75 + 0.25 * Math.sin(tReal * 11) : 0.8;
        softRing(ctx, 0, 0, R, tint, pz, Math.min(R * 0.55, 44));
        ctx.strokeStyle = line; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.95; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
        // the gauge: an arc that fills as the ring grows, then runs back down in amber until it lets go on its own
        const T = CFG.ring, prog = orb.unstable ? 1 - U.clamp((orb.chargeT - T.tMax) / (T.tAuto - T.tMax), 0, 1) : k;
        const a0 = -Math.PI / 2, a1 = a0 + prog * TAU, gr = R + 7;
        ctx.lineCap = 'round'; ctx.strokeStyle = U.mix(tint, '#ffffff', 0.35);
        ctx.lineWidth = 2.4;
        if (prog > 0.002) { ctx.globalAlpha = 0.95; ctx.beginPath(); ctx.arc(0, 0, gr, a0, a1); ctx.stroke();
          ctx.globalAlpha = 1; ctx.drawImage(S.glow(tint, 8), Math.cos(a1) * gr - 8, Math.sin(a1) * gr - 8, 16, 16); }
        // fine ticks turning slowly outside the gauge, like an instrument bezel
        ctx.globalAlpha = 0.3; ctx.lineWidth = 1; ctx.strokeStyle = line; ctx.beginPath();
        for (let i = 0; quality && i < 48; i++) { const a = tReal * 0.18 + i * TAU / 48, r0 = gr + 5, r1 = gr + (i % 4 ? 8 : 11); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); }
        ctx.stroke(); ctx.lineCap = 'butt';
        // three motes circling just inside the rim
        for (let i = 0; i < 3; i++) { const a = tReal * 1.5 + i * TAU / 3, rr = R * 0.9; ctx.globalAlpha = 0.85; ctx.drawImage(S.glow(line, 8), Math.cos(a) * rr - 7, Math.sin(a) * rr - 7, 14, 14); }
        ctx.restore(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      }
    }

    if (G.shatter) drawShatter(G.shatter, tReal);

    if (G.level && KABLAST.levels.has(G.level, 'eclipse') && orb.alive) drawEclipse(orb, vis, world, G.dark, top, bottom, t);

    // ===== particles & fx
    KABLAST.particles.render(ctx, false, top - 40, bottom + 40);
    ctx.globalCompositeOperation = 'lighter';
    KABLAST.particles.render(ctx, true, top - 40, bottom + 40);
    KABLAST.fx.renderRings(ctx);
    ctx.globalCompositeOperation = 'source-over';
    KABLAST.fx.renderPopups(ctx);

    // ===== screen-space grade: one vignette, tinted by what is happening (charging cools it, danger warms it)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const k = charging ? U.clamp(orb.chargeT / 0.25, 0, 1) : 0;
    const ox = (orb.x - CFG.W / 2) * scale * cam.zoom + cw / 2, oy = (orb.y - cam.y) * scale * cam.zoom + ch / 2;
    const vg = ctx.createRadialGradient(ox, oy, ch * 0.14, ox, oy, ch * 0.82);
    const edge = dangerInRing ? '46,4,22' : k > 0 ? '3,10,30' : '5,3,20';
    vg.addColorStop(0, `rgba(${edge},0)`); vg.addColorStop(0.6, `rgba(${edge},${0.1 + 0.14 * k})`); vg.addColorStop(1, `rgba(${edge},${0.36 + 0.34 * k})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, cw, ch);
    if (G.level && G.level.phase === 'gate') {          // the challenging phase: a slow red breath at the edges
      const gg = ctx.createRadialGradient(cw / 2, ch / 2, ch * 0.3, cw / 2, ch / 2, ch * 0.85);
      gg.addColorStop(0, 'rgba(255,45,85,0)'); gg.addColorStop(1, `rgba(255,45,85,${0.13 + 0.06 * Math.sin(tReal * 1.6)})`);
      ctx.fillStyle = gg; ctx.fillRect(0, 0, cw, ch);
    } else if (G.level && G.level.phase === 'bonus') {  // Supernova Rush: warm golden light pooling at the edges
      const bg = ctx.createRadialGradient(cw / 2, ch / 2, ch * 0.2, cw / 2, ch / 2, ch * 0.9);
      bg.addColorStop(0, 'rgba(255,210,63,0.03)'); bg.addColorStop(1, `rgba(255,210,63,${0.16 + 0.05 * Math.sin(tReal * 2)})`);
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = bg; ctx.fillRect(0, 0, cw, ch); ctx.globalCompositeOperation = 'source-over';
    }
    // flashes bloom out from the orb rather than whiting out the screen
    const F = KABLAST.fx.flashState;
    if (F.a > 0.01) {
      const fg = ctx.createRadialGradient(ox, oy, 0, ox, oy, Math.max(cw, ch) * 0.9), fa = Math.min(1, F.a);
      fg.addColorStop(0, U.rgba(F.color, fa)); fg.addColorStop(0.45, U.rgba(F.color, fa * 0.55)); fg.addColorStop(1, U.rgba(F.color, fa * 0.25));
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = fg; ctx.fillRect(0, 0, cw, ch); ctx.globalCompositeOperation = 'source-over';
    }

  }
  return { init, resize, draw, viewH, previewTrail, previewOrb, drawTrail, drawOrbAt, softRing, get quality() { return quality; }, set quality(v) { quality = v ? 1 : 0; }, get scale() { return scale; }, get cw() { return cw; }, get ch() { return ch; } };
})();
