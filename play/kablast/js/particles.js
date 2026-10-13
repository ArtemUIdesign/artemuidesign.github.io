/* KABLAST — particle system. One flat array, swap-pop removal, sprite blits. Two render passes:
   normal (crystal shards) and additive (sparks, embers, motes) so glows stack properly.
   Motion is tuned floaty: shards tumble and settle rather than drop, sparks decelerate softly, and every big
   break leaves a few motes of light that drift upward for a couple of seconds — the afterglow. */
KABLAST.particles = (() => {
  const U = KABLAST.U, S = KABLAST.sprites;
  const list = [];
  const MAX = 1100;

  function spawn(p) {
    if (list.length >= MAX) list[(Math.random() * list.length) | 0] = p; else list.push(p);
  }
  function burstShards(x, y, hex, n, speed) {
    const spr = S.shard(hex);
    for (let i = 0; i < n; i++) {
      const a = U.rand(U.TAU), v = U.rand(0.3, 1) * speed * 0.85;
      spawn({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.22, life: 0, max: U.rand(0.65, 1.15), size: U.rand(6, 12),
              rot: U.rand(U.TAU), vr: U.rand(-9, 9), spr, g: 760, drag: 0.978, add: false, shrink: true });
    }
  }
  function burstSparks(x, y, hex, n, speed, opts = {}) {
    const spr = S.spark(hex);
    for (let i = 0; i < n; i++) {
      const a = U.rand(U.TAU), v = U.rand(0.2, 1) * speed;
      spawn({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: U.rand(0.35, 0.8) * (opts.life || 1), size: U.rand(5, 11) * (opts.size || 1),
              rot: 0, vr: 0, spr, g: opts.g === undefined ? 260 : opts.g, drag: 0.955, add: true });
    }
  }
  // the afterglow: slow motes that rise and sway where something just broke
  function motes(x, y, hex, n, spread = 30) {
    const spr = S.glow(hex, 8);
    for (let i = 0; i < n; i++) {
      spawn({ x: x + U.rand(-spread, spread), y: y + U.rand(-spread, spread), vx: U.rand(-18, 18), vy: U.rand(-55, -20), life: 0, max: U.rand(1.2, 2.3),
              size: U.rand(4, 9), rot: 0, vr: 0, spr, g: -12, drag: 0.985, add: true, sway: U.rand(U.TAU), mote: true });
    }
  }
  // ember drifting upward from the Dark
  function ember(x, y, hex) {
    spawn({ x, y, vx: U.rand(-15, 15), vy: U.rand(-60, -22), life: 0, max: U.rand(1.4, 2.6), size: U.rand(3, 7), rot: 0, vr: 0, spr: S.spark(hex), g: -18, drag: 0.995, add: true, sway: U.rand(U.TAU), mote: true });
  }
  function trailPuff(x, y, hex, size) {
    spawn({ x, y, vx: U.rand(-12, 12), vy: U.rand(-12, 12), life: 0, max: 0.35, size, rot: 0, vr: 0, spr: S.spark(hex), g: 0, drag: 0.9, add: true });
  }

  function update(dt) {
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life += dt;
      if (p.life >= p.max) { list[i] = list[list.length - 1]; list.pop(); continue; }
      const dr = Math.pow(p.drag, dt * 60);
      p.vy += p.g * dt; p.vx *= dr; p.vy *= dr;
      if (p.mote) p.vx += Math.sin(p.life * 2.2 + p.sway) * 24 * dt;          // a lazy side-to-side drift
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    }
  }
  function render(ctx, additive, top, bottom) {
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (p.add !== additive || p.y < top || p.y > bottom) continue;
      const t = p.life / p.max;
      let a, s;
      if (p.mote) { a = Math.sin(Math.PI * Math.min(1, t * 1.15)) * 0.85; s = p.size * (0.7 + 0.3 * Math.sin(p.life * 3 + p.sway)); }
      else if (additive) { a = (1 - t) * (1 - t); s = p.size * (1.6 - t * 0.9); }
      else { a = t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35; s = p.shrink ? p.size * (1 - t * 0.45) : p.size; }
      if (a <= 0.01) continue;
      ctx.globalAlpha = a;
      if (p.rot) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.drawImage(p.spr, -s / 2, -s / 2, s, s); ctx.restore(); }
      else ctx.drawImage(p.spr, p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }
  function clear() { list.length = 0; }
  return { burstShards, burstSparks, motes, ember, trailPuff, update, render, clear, get count() { return list.length; } };
})();
