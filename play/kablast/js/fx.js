/* KABLAST — camera, time control and screen-level juice (shake, zoom punch, flashes, rings, pops, popups).

   The feel is "weighty but calm". Shake is smooth noise, not per-frame random jitter, and it is scaled down at
   the source (CALM) so every call site keeps its relative weight. Flashes bloom and fade instead of blinking.
   Rings are soft bands of light that ease out; popups never pile on top of each other. */
KABLAST.fx = (() => {
  const U = KABLAST.U;
  const CALM = { shake: 0.5, flash: 0.62 };
  const cam = { y: 0, ty: 0, zoom: 1, zoomT: 1, shakeA: 0, sx: 0, sy: 0, snap: false };
  const time = { scale: 1, target: 1 };
  const popups = [], rings = [], pops = [], bursts = [];
  const flash = { a: 0, color: '#ffffff' };
  let slowBlip = 0, clock = 0;
  const MAX_POPUPS = 5;

  function reset() {
    cam.zoom = cam.zoomT = 1; cam.shakeA = 0; cam.sx = cam.sy = 0; cam.snap = true;
    time.scale = time.target = 1; popups.length = 0; rings.length = 0; pops.length = 0; bursts.length = 0; flash.a = 0; slowBlip = 0;
  }
  function shake(a) { cam.shakeA = Math.max(cam.shakeA, a * CALM.shake); }
  function punch(z) { cam.zoom = Math.max(cam.zoom, 1 + z * 0.8); }
  function zoomTo(z) { cam.zoomT = z; }
  function blip(sec) { slowBlip = Math.max(slowBlip, sec); }
  function doFlash(color, a) { a *= CALM.flash; if (a >= flash.a) { flash.color = color; flash.a = a; } }
  function ring(x, y, r0, r1, color, dur, width = 3) { rings.push({ x, y, r0, r1, color, dur: dur * 1.15, width, life: 0 }); }
  // a soft bloom of light where something just broke: the gentle alternative to a ring per crystal
  function pop(x, y, color, size = 46, dur = 0.42) { if (pops.length < 90) pops.push({ x, y, color, size, dur, life: 0 }); }
  // a star going off: the Nova's corona flung outward, turning as it spreads and burning out
  function starburst(x, y, size, dur = 0.7) { if (bursts.length < 4) bursts.push({ x, y, size, dur, life: 0, rot: Math.random() * U.TAU }); }
  // Popups find their own space: a new one that would land on a live one moves up until it is clear, and there
  // are never more than a handful at once (the oldest small one gives way). Nothing is ever unreadable.
  function popup(text, x, y, color, size = 28, dur = 1.1) {
    const h = size * 1.05;
    for (let guard = 0; guard < 6; guard++) {
      let hit = false;
      for (const p of popups) {
        if (p.life > p.dur * 0.75) continue;
        if (Math.abs(p.x - x) < 150 && Math.abs(p.y - y) < (p.size * 1.05 + h) / 2) { y = p.y - (p.size * 1.05 + h) / 2 - 4; hit = true; }
      }
      if (!hit) break;
    }
    if (popups.length >= MAX_POPUPS) { let k = 0; for (let i = 1; i < popups.length; i++) if (popups[i].size < popups[k].size || (popups[i].size === popups[k].size && popups[i].life > popups[k].life)) k = i; popups.splice(k, 1); }
    popups.push({ text, x, y, color, size, dur, life: 0, vy: -46 });
  }

  function update(dtReal) {
    clock += dtReal;
    // time scale eases toward target; slow-mo blips (close calls) override briefly
    let tgt = time.target;
    if (slowBlip > 0) { slowBlip -= dtReal; tgt = Math.min(tgt, 0.35); }
    const k = tgt < time.scale ? 14 : 5;               // glide into slow-mo, drift back out
    time.scale += (tgt - time.scale) * Math.min(1, dtReal * k);
    const dtGame = dtReal * time.scale;

    // camera
    if (cam.snap) { cam.y = cam.ty; cam.snap = false; }
    else cam.y += (cam.ty - cam.y) * (1 - Math.exp(-dtReal * 10));
    cam.zoom += (cam.zoomT - cam.zoom) * (1 - Math.exp(-dtReal * 5));
    // shake: two sums of incommensurate sines — it rolls instead of buzzing, and it can never repeat a pattern
    cam.shakeA *= Math.exp(-dtReal * 7);
    if (cam.shakeA < 0.05) { cam.shakeA = 0; cam.sx = cam.sy = 0; }
    else {
      const s = clock;
      cam.sx = cam.shakeA * (Math.sin(s * 41.3) * 0.55 + Math.sin(s * 23.9 + 1.3) * 0.3 + Math.sin(s * 67.1 + 0.4) * 0.15);
      cam.sy = cam.shakeA * (Math.sin(s * 37.7 + 2.1) * 0.55 + Math.sin(s * 19.3 + 0.7) * 0.3 + Math.sin(s * 59.9 + 2.9) * 0.15);
    }

    flash.a *= Math.exp(-dtReal * 6);
    for (let i = popups.length - 1; i >= 0; i--) { const p = popups[i]; p.life += dtGame; p.y += p.vy * dtGame; p.vy *= Math.pow(0.25, dtGame); if (p.life > p.dur) popups.splice(i, 1); }
    for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.life += dtGame; if (r.life > r.dur) rings.splice(i, 1); }
    for (let i = pops.length - 1; i >= 0; i--) { const p = pops[i]; p.life += dtGame; if (p.life > p.dur) { pops[i] = pops[pops.length - 1]; pops.pop(); } }
    for (let i = bursts.length - 1; i >= 0; i--) { const b = bursts[i]; b.life += dtReal; if (b.life > b.dur) bursts.splice(i, 1); }
    return dtGame;
  }

  const easeOutQuint = t => 1 - Math.pow(1 - t, 5);
  function renderRings(ctx) {
    const S = KABLAST.sprites;
    for (const p of pops) {                              // additive blooms
      const t = U.clamp(p.life / p.dur, 0, 1), s = p.size * (0.45 + 0.75 * easeOutQuint(t));
      ctx.globalAlpha = Math.pow(1 - t, 1.6) * 0.9; ctx.drawImage(S.glow(p.color, 32), p.x - s / 2, p.y - s / 2, s, s);
    }
    for (const b of bursts) {                            // starbursts: real-time, so the slow-mo moment does not stretch them
      const t = U.clamp(b.life / b.dur, 0, 1), e = easeOutQuint(t), s = b.size * (0.25 + 0.75 * e), a = Math.pow(1 - t, 1.4);
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot + t * 0.5);
      ctx.globalAlpha = a; ctx.drawImage(S.novaRays(), -s / 2, -s / 2, s, s);
      ctx.rotate(0.2 - t); ctx.globalAlpha = a * 0.6; ctx.drawImage(S.novaRays(), -s * 0.35, -s * 0.35, s * 0.7, s * 0.7);
      ctx.restore();
      const c = b.size * 0.5 * (0.4 + 0.6 * e); ctx.globalAlpha = a * 0.9; ctx.drawImage(S.glow('#fff6c8', 32), b.x - c / 2, b.y - c / 2, c, c);
    }
    for (const r of rings) {
      const t = U.clamp(r.life / r.dur, 0, 1), rr = U.lerp(r.r0, r.r1, easeOutQuint(t)), fade = Math.pow(1 - t, 1.5);
      // the soft band: its crest sits exactly on the ring's radius, and heavier rings throw a wider glow
      ctx.globalAlpha = 1; KABLAST.render.softRing(ctx, r.x, r.y, rr, r.color, fade * Math.min(0.9, 0.5 + r.width * 0.08), Math.min(rr * 0.6, 8 + r.width * 5));
      // and a crisp hairline on the heavy ones
      if (r.width >= 3) { ctx.globalAlpha = fade * 0.8; ctx.strokeStyle = U.mix(r.color, '#ffffff', 0.5); ctx.lineWidth = Math.max(0.8, r.width * 0.35 * (1 - t * 0.6)); ctx.beginPath(); ctx.arc(r.x, r.y, rr, 0, U.TAU); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
  }
  // Popups: a soft shadow, a dark keyline, a vertical gradient fill (lit from above) — and a gentle entrance.
  const gradCache = new Map();
  function fillFor(ctx, color, size) {
    const key = color + size; let g = gradCache.get(key);
    if (!g) {
      g = ctx.createLinearGradient(0, -size * 0.5, 0, size * 0.5);
      if (color[0] === '#') { g.addColorStop(0, U.mix(color, '#ffffff', 0.7)); g.addColorStop(0.55, color); g.addColorStop(1, U.mix(color, '#12062e', 0.1)); }
      else { g.addColorStop(0, color); g.addColorStop(1, color); }
      if (gradCache.size > 64) gradCache.clear();
      gradCache.set(key, g);
    }
    return g;
  }
  function renderPopups(ctx) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const p of popups) {
      const t = p.life / p.dur, e = Math.min(1, p.life / 0.28);
      const s = (0.72 + 0.28 * U.easeOutBack(e) * (1 - 0.04 * t)) * (api.popScale || 1);   // popScale: game.js resize()
      const a = Math.min(1, p.life / 0.08) * (t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3);
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(s, s);
      ctx.font = `${Math.round(p.size * 1.08)}px ${KABLAST.i18n.font()}`;
      ctx.globalAlpha = a; ctx.lineWidth = Math.max(3, p.size * 0.2); ctx.strokeStyle = '#0a0626';
      ctx.strokeText(p.text, 0, p.size * 0.1);                                  // the drop, then the keyline
      ctx.strokeText(p.text, 0, 0);
      ctx.fillStyle = fillFor(ctx, p.color, p.size); ctx.fillText(p.text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  const api = { cam, time, reset, shake, punch, zoomTo, blip, flash: doFlash, flashState: flash, ring, pop, starburst, popup, update, renderRings, renderPopups, popScale: 1, get popupCount() { return popups.length; } };
  return api;
})();
