/* KABLAST — the crystal well.
   Two layers of procedural content, both driven by the difficulty curve d = KABLAST.difficulty(metres):
     1. THE LADDER — a clean, single-colour cluster is always placed within launch reach of the previous one
        (vertical gap ≤ what a minimum-size ladder chain can climb, sideways offset small enough to steer to).
        No dark shard may sit within `ladder.clearR` of a ladder crystal. This is the "never impossible" guarantee.
     2. FILLER — bigger/smaller clusters, mixed colours, dark shards, prisms, drift, lone crystals, Nova cores.
        This is the risk/reward layer; it thins out and gets nastier as d → 1.
   Plus a spatial hash for fast radius queries and the cavern wall silhouettes. */
KABLAST.World = class {
  constructor() {
    const CFG = KABLAST.CFG;
    this.crystals = []; this.clusters = [];
    this.nextChunkY = -60; this.chunkIndex = 0;
    this.recentCenters = [];
    this.ladderY = 0; this.ladderX = CFG.W / 2; this.ladderCount = 0;
    this.cell = 64; this.grid = new Map(); this.idSeq = 1;
    this.wall = []; this.wallStep = 70; this.wallTop = 200;
    this.vortices = []; this.winds = []; this.t = 0; this.reliefUntilM = -1;
    this.ensureWalls(-CFG.chunkH);
    this._q = [];
  }
  // PULSE crystals phase in and out; a ghost crystal neither chains nor kills
  solid(c) {
    const p = c.cluster && c.cluster.pulse; if (!p) return true;
    return ((this.t + p.ph) % p.period) < p.period * KABLAST.CFG.mech.pulse.solidFrac;
  }

  // ---------- spatial hash ----------
  key(cx, cy) { return (cx + 512) * 1048576 + (cy + 524288); }
  cellOf(v) { return Math.floor(v / this.cell); }
  insert(c) {
    c.cx = this.cellOf(c.x); c.cy = this.cellOf(c.y);
    const k = this.key(c.cx, c.cy); let b = this.grid.get(k); if (!b) { b = []; this.grid.set(k, b); } b.push(c);
  }
  remove(c) {
    const k = this.key(c.cx, c.cy), b = this.grid.get(k); if (!b) return;
    const i = b.indexOf(c); if (i >= 0) { b[i] = b[b.length - 1]; b.pop(); }
    if (!b.length) this.grid.delete(k);
  }
  move(c, x, y) {
    const cx = this.cellOf(x), cy = this.cellOf(y);
    if (cx !== c.cx || cy !== c.cy) { this.remove(c); c.x = x; c.y = y; this.insert(c); } else { c.x = x; c.y = y; }
  }
  query(x, y, r, out) {
    out = out || []; out.length = 0;
    const r2 = r * r, x0 = this.cellOf(x - r), x1 = this.cellOf(x + r), y0 = this.cellOf(y - r), y1 = this.cellOf(y + r);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const b = this.grid.get(this.key(cx, cy)); if (!b) continue;
      for (let i = 0; i < b.length; i++) { const c = b[i]; const dx = c.x - x, dy = c.y - y; if (dx * dx + dy * dy <= r2) out.push(c); }
    }
    return out;
  }
  hasNear(x, y, r) { return this.query(x, y, r, this._q).length > 0; }
  nearLadder(x, y, r) { const q = this.query(x, y, r, this._q); for (let i = 0; i < q.length; i++) if (q[i].ladder && q[i].alive) return true; return false; }
  nearDark(x, y, r) { const q = this.query(x, y, r, this._q); for (let i = 0; i < q.length; i++) if (q[i].kind === 'dark' && q[i].alive) return true; return false; }

  // ---------- crystals ----------
  add(x, y, kind, color, cluster, ladder) {
    const c = { id: this.idSeq++, x, y, bx: x, by: y, r: kind === 'nova' ? 22 : KABLAST.CFG.crystal.r, kind, color, alive: true, cluster,
                ladder: !!ladder, phase: Math.random() * KABLAST.U.TAU, rot: (Math.random() - 0.5) * 0.5, cc: false };
    this.crystals.push(c); this.insert(c); if (cluster) cluster.members.push(c);
    return c;
  }
  kill(c) { c.alive = false; this.remove(c); }

  // grows a compact blob of n cells on an axial hex grid
  static blob(n) {
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];
    const set = new Set(['0,0']), cells = [[0, 0]];
    const frontier = new Map();
    const addFrontier = (q, r) => { for (const [dq, dr] of dirs) { const k = (q + dq) + ',' + (r + dr); if (!set.has(k)) frontier.set(k, (frontier.get(k) || 0) + 1); } };
    addFrontier(0, 0);
    while (cells.length < n && frontier.size) {
      const keys = [...frontier.keys()];
      let best = null, bestScore = -1;
      for (let t = 0; t < 3; t++) { const k = keys[(Math.random() * keys.length) | 0]; const s = frontier.get(k) + Math.random() * 1.5; if (s > bestScore) { bestScore = s; best = k; } }
      frontier.delete(best); set.add(best);
      const [q, r] = best.split(',').map(Number); cells.push([q, r]); addFrontier(q, r);
    }
    return cells;
  }

  /* opts: { size, pDom, pDark, pPrism, drift: {p, amp}, color, ladder, bonus } */
  spawnCluster(cx, cy, o) {
    const CFG = KABLAST.CFG, U = KABLAST.U, sp = CFG.crystal.spacing;
    const cells = KABLAST.World.blob(o.size);
    const dom = o.color !== undefined ? o.color : U.randInt(0, CFG.colors.length - 1);
    const drift = o.drift && Math.random() < o.drift.p ? { amp: o.drift.amp * U.rand(0.6, 1), w: U.rand(0.6, 1.4), ph: U.rand(U.TAU) } : null;
    const cluster = { id: this.idSeq++, members: [], cx, cy, rot: U.rand(U.TAU), drift, ladder: !!o.ladder,
                      pulse: o.pulse ? { period: KABLAST.CFG.mech.pulse.period, ph: U.rand(KABLAST.CFG.mech.pulse.period) } : null };
    const cr = Math.cos(cluster.rot), sr = Math.sin(cluster.rot);
    for (const [q, r] of cells) {
      const lx = (q + r * 0.5) * sp, ly = r * sp * 0.8660254;
      const x = cx + lx * cr - ly * sr, y = cy + lx * sr + ly * cr;
      if (x < 52 || x > CFG.W - 52) continue;
      if (this.hasNear(x, y, sp * 0.8)) continue;
      let kind = 'gem', color = dom;
      const rnd = Math.random();
      if (rnd < (o.pDark || 0)) kind = 'dark';
      else if (rnd < (o.pDark || 0) + (o.pPrism || 0)) kind = 'prism';
      else if (Math.random() > o.pDom) color = U.randInt(0, CFG.colors.length - 1);
      if (kind === 'dark' && this.nearLadder(x, y, CFG.ladder.clearR)) { kind = 'gem'; color = dom; } // keep the ladder clean
      const c = this.add(x, y, kind, color, cluster, o.ladder);
      if (o.bonus && kind === 'gem') c.bonus = true;             // Supernova Rush: keeps its colour, chains with every colour
    }
    if (cluster.members.length) this.clusters.push(cluster);
    return cluster;
  }

  // the hand-made opening: a clean 7-crystal flower right above the pad (ladder rung #0) + two easy targets
  spawnOpening() {
    const CFG = KABLAST.CFG, W = CFG.W, sp = CFG.crystal.spacing;
    const cluster = { id: this.idSeq++, members: [], cx: W / 2, cy: -66, rot: 0, drift: null, ladder: true };
    const pts = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];
    for (const [q, r] of pts) this.add(W / 2 + (q + r * 0.5) * sp, -66 + r * sp * 0.866, 'gem', 0, cluster, true);
    this.clusters.push(cluster);
    this.ladderY = -66; this.ladderX = W / 2;
    this.spawnCluster(W * 0.26, -330, { size: 8, pDom: 1, pDark: 0, color: 1 });
    this.spawnCluster(W * 0.74, -520, { size: 9, pDom: 1, pDark: 0, color: 2 });
    this.recentCenters.push({ x: W / 2, y: -66 }, { x: W * 0.26, y: -330 }, { x: W * 0.74, y: -520 });
  }

  // one guaranteed rung: clean, single colour, within reach of the previous rung
  placeLadderRung(d, lv) {
    const CFG = KABLAST.CFG, U = KABLAST.U, L = CFG.ladder;
    const gap = U.lerp(L.gapMin, L.gapMax, d) + U.rand(-L.jitter, L.jitter);
    const ny = this.ladderY - gap;
    const dxMax = U.lerp(L.dxMax0, L.dxMax1, d);
    let nx = this.ladderX;
    for (let tries = 0; tries < 12; tries++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      nx = U.clamp(this.ladderX + side * U.rand(L.dxMin, dxMax), 100, CFG.W - 100);
      if (!this.hasNear(nx, ny, 110)) break;
    }
    const size = Math.max(L.size1, Math.round(U.lerp(L.size0, L.size1, d) + U.rand(-1, 1)));
    // ladder rungs only drift late, and gently — they are the safety net
    let drift = d > 0.6 ? { p: (d - 0.6) / 0.4 * 0.6, amp: 18 } : null;
    if (lv && KABLAST.levels.has(lv, 'drift')) drift = { p: 0.8, amp: 22 };     // drift levels: even the rungs sway a little
    let cluster = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      if (attempt === 4) {            // last resort: the ladder outranks filler — clear whatever is in the way
        const q = this.query(nx, ny, 95, []);
        for (const c of q) if (c.alive && !c.ladder) this.kill(c);
      }
      cluster = this.spawnCluster(nx, ny, { size, pDom: 1, pDark: 0, drift, ladder: true });
      if (cluster.members.length >= Math.min(size, L.size1)) break;   // enough crystals survived the overlap checks
      for (const m of cluster.members) this.kill(m);
      this.clusters = this.clusters.filter(c => c !== cluster);
      if (attempt < 3) nx = U.clamp(U.clamp(nx + (attempt % 2 ? -1 : 1) * 55 * (attempt + 1), this.ladderX - 170, this.ladderX + 170), 100, CFG.W - 100);
      else nx = U.clamp(this.ladderX + (this.ladderX < CFG.W / 2 ? 1 : -1) * U.rand(L.dxMin, dxMax), 100, CFG.W - 100);
    }
    this.cleanseAround(cluster);
    // a rung placed after a vortex takes priority: no gravity well may sit on the ladder
    const vc = KABLAST.CFG.mech.vortex.rungClear;
    this.vortices = this.vortices.filter(v => U.dist2(v.x, v.y, nx, ny) > (vc + 90) * (vc + 90));
    // stepping stones: 1–2 clean gems on the way from the previous rung to this one (small boosts for a short launch)
    const px = this.ladderX, py = this.ladderY, stones = d < 0.5 ? 1 : 2;
    for (let k = 0; k < stones; k++) {
      const f = stones === 1 ? 0.55 : 0.38 + k * 0.32;
      const sx = U.clamp(px + (nx - px) * f + U.rand(-45, 45), 60, CFG.W - 60), sy = py + (ny - py) * f + U.rand(-30, 30);
      if (!this.hasNear(sx, sy, 60)) { this.add(sx, sy, 'gem', U.randInt(0, CFG.colors.length - 1), null, true); this.vortices = this.vortices.filter(v => U.dist2(v.x, v.y, sx, sy) > (vc + 20) * (vc + 20)); }
    }
    this.ladderY = ny; this.ladderX = nx; this.ladderCount++;
    this.recentCenters.push({ x: nx, y: ny });
  }
  // dark shards placed earlier that ended up too close to a rung become plain gems
  cleanseAround(cluster) {
    const R = KABLAST.CFG.ladder.clearR, q = [];
    for (const m of cluster.members) {
      this.query(m.x, m.y, R, q);
      for (const c of q) if (c.kind === 'dark' && c.alive) { c.kind = 'gem'; c.color = m.color; }
    }
  }

  generateChunk() {
    const CFG = KABLAST.CFG, U = KABLAST.U, F = CFG.filler, M = CFG.mech;
    const y0 = this.nextChunkY, y1 = y0 - CFG.chunkH, idx = this.chunkIndex;
    const m = -y1 / CFG.unitsPerMeter;
    const lv = KABLAST.levels.at(m);                              // level + phase at the top of this chunk
    const d = KABLAST.levels.dEff(m, this.reliefUntilM >= 0 ? this.reliefUntilM : undefined);
    const has = k => KABLAST.levels.has(lv, k);
    const bonus = lv.phase === 'bonus';

    // 1) the ladder
    for (let guard = 0; guard < 6; guard++) {
      const gap = U.lerp(CFG.ladder.gapMin, CFG.ladder.gapMax, d);
      if (this.ladderY - gap - CFG.ladder.jitter < y1) break;   // next rung belongs to the next chunk
      this.placeLadderRung(d, lv);
    }

    // 2) filler clusters (the risk/reward layer), shaped by the level's mechanic
    let nFill = Math.round(U.lerp(F.count0, F.count1, d) + U.rand(-0.5, 0.5)) + (bonus ? 1 : 0);
    let pDark = d < F.darkFrom ? 0 : U.lerp(F.pDark0, F.pDark1, (d - F.darkFrom) / (1 - F.darkFrom));
    let pPrism = d >= F.prismFrom ? F.pPrism : 0;
    let driftP = d > F.driftFrom ? U.lerp(0, F.driftP1, (d - F.driftFrom) / (1 - F.driftFrom)) : 0;
    let driftAmp = U.lerp(F.driftAmp0, F.driftAmp1, d), sizeBonus = 0;
    if (has('drift'))   { driftP = 1; driftAmp = Math.max(24, driftAmp) * M.drift.ampMul; }
    if (has('rainbow')) { pPrism = M.rainbow.pPrism; sizeBonus += M.rainbow.sizeBonus; }
    if (bonus)          { pPrism = 0; pDark = 0; sizeBonus += 3; }   // every gem keeps its colour and chains with all of them
    for (let i = 0; i < nFill; i++) {
      let cx = 0, cy = 0, ok = false;
      for (let tries = 0; tries < 30 && !ok; tries++) {
        cx = U.rand(88, CFG.W - 88); cy = U.rand(y1 + 70, y0 - 70);
        ok = this.recentCenters.every(p => U.dist2(p.x, p.y, cx, cy) > 150 * 150);
      }
      if (!ok) continue;
      this.recentCenters.push({ x: cx, y: cy });
      const size = U.randInt(Math.round(U.lerp(F.sizeLo0, F.sizeLo1, d)), Math.round(U.lerp(F.sizeHi0, F.sizeHi1, d))) + sizeBonus;
      const clean = idx < 2 && i === 0;                          // the first filler of the first chunks is a gift
      this.spawnCluster(cx, cy, { size, pDom: clean ? 1 : U.lerp(F.pDom0, F.pDom1, d), pDark: clean ? 0 : pDark, pPrism,
                                  drift: driftP > 0 ? { p: driftP, amp: driftAmp } : null,
                                  pulse: has('pulse') && Math.random() < M.pulse.clusterP, bonus });
    }

    // 3) lone crystals (stepping stones; some of them are traps later on)
    const lone = U.randInt(CFG.lone.min, CFG.lone.max);
    const pLoneDark = bonus || d < CFG.lone.darkFrom ? 0 : U.lerp(CFG.lone.pDark0, CFG.lone.pDark1, (d - CFG.lone.darkFrom) / (1 - CFG.lone.darkFrom));
    for (let i = 0; i < lone; i++) {
      const x = U.rand(56, CFG.W - 56), y = U.rand(y1 + 30, y0 - 30);
      if (this.hasNear(x, y, 70)) continue;
      let dark = Math.random() < pLoneDark;
      if (dark && this.nearLadder(x, y, CFG.ladder.clearR)) dark = false;
      const c = this.add(x, y, dark ? 'dark' : 'gem', U.randInt(0, CFG.colors.length - 1), null);
      if (bonus && !dark) c.bonus = true;
    }

    // 4) Nova core: rare jackpot
    if (idx >= 3 && (idx - 3) % 4 === 0) {
      for (let tries = 0; tries < 20; tries++) {
        const x = U.rand(80, CFG.W - 80), y = U.rand(y1 + 60, y0 - 60);
        if (!this.hasNear(x, y, 60)) { this.add(x, y, 'nova', 0, null); break; }
      }
    }

    // 5) level fields: gravity wells and wind bands
    if (has('vortex') && Math.random() < M.vortex.perChunkP) {
      for (let tries = 0; tries < 12; tries++) {
        const x = U.rand(110, CFG.W - 110), y = U.rand(y1 + 130, y0 - 130);
        if (this.nearLadder(x, y, M.vortex.rungClear)) continue;
        this.vortices.push({ x, y, r: M.vortex.radius, k: U.lerp(M.vortex.pull0, M.vortex.pull1, d), dir: Math.random() < 0.5 ? -1 : 1, ph: U.rand(U.TAU) });
        break;
      }
    }
    if (has('wind') && Math.random() < M.wind.perChunkP) {
      const h = U.rand(M.wind.bandH0, M.wind.bandH1), yTop = U.rand(y1 + 30, y0 - h - 30);
      const last = this.winds[this.winds.length - 1];
      this.winds.push({ yTop, yBot: yTop + h, dir: last ? -last.dir : (Math.random() < 0.5 ? -1 : 1), s: U.lerp(M.wind.strength0, M.wind.strength1, d), seed: Math.random() * 1000 });
    }

    this.recentCenters = this.recentCenters.filter(p => p.y < y0 + CFG.chunkH);
    this.nextChunkY = y1; this.chunkIndex++;
    this.ensureWalls(y1 - CFG.chunkH);
  }
  ensure(topY) { while (this.nextChunkY > topY) this.generateChunk(); }

  // small clean cluster dropped in front of a player who is falling onto nothing at all
  spawnRescue(x, y, size = 4) {
    const CFG = KABLAST.CFG, U = KABLAST.U;
    for (const dx of [0, -60, 60, -120, 120]) {
      const cx = U.clamp(x + dx, 80, CFG.W - 80);
      if (this.nearDark(cx, y, 90)) continue;
      const cl = this.spawnCluster(cx, y, { size, pDom: 1, pDark: 0, ladder: true });
      if (cl.members.length >= Math.min(size, 3)) return cl;
    }
    // everything nearby is dark or crowded: purify the darks around the spot and place it anyway
    const q = this.query(x, y, 100, []);
    for (const c of q) if (c.alive && c.kind === 'dark') { c.kind = 'gem'; }
    const cl = this.spawnCluster(x, y, { size, pDom: 1, pDark: 0, ladder: true });
    return cl.members.length ? cl : null;
  }

  prune(bottomY) {
    if (this.crystals.length < 60) return;
    let w = 0;
    for (let i = 0; i < this.crystals.length; i++) {
      const c = this.crystals[i];
      if (!c.alive) continue;
      if (c.y > bottomY) { this.remove(c); c.alive = false; continue; }
      this.crystals[w++] = c;
    }
    this.crystals.length = w;
    this.clusters = this.clusters.filter(cl => cl.members.some(m => m.alive));
    this.vortices = this.vortices.filter(v => v.y < bottomY + 300);
    this.winds = this.winds.filter(b => b.yTop < bottomY + 300);
  }

  update(dt, t) {
    this.t = t;
    for (const cl of this.clusters) {
      if (!cl.drift) continue;
      const dx = Math.sin(t * cl.drift.w + cl.drift.ph) * cl.drift.amp;
      const dy = Math.cos(t * cl.drift.w * 0.7 + cl.drift.ph) * cl.drift.amp * 0.25;
      for (const m of cl.members) if (m.alive) this.move(m, m.bx + dx, m.by + dy);
    }
  }

  // wind bands + gravity wells acting on a body at (x, y): returns [ax, ay]
  fieldAccel(x, y, out) {
    out[0] = 0; out[1] = 0;
    for (let i = 0; i < this.winds.length; i++) { const b = this.winds[i]; if (y >= b.yTop && y <= b.yBot) out[0] += b.dir * b.s; }
    const sw = KABLAST.CFG.mech.vortex.swirl;
    for (let i = 0; i < this.vortices.length; i++) {
      const v = this.vortices[i], dx = v.x - x, dy = v.y - y, r = Math.hypot(dx, dy);
      if (r > v.r || r < 1) continue;
      const a = v.k / Math.max(r, 60), fall = 1 - r / v.r;          // strong near the eye, fades to nothing at the rim
      const nx = dx / r, ny = dy / r;
      out[0] += (nx + -ny * v.dir * sw) * a * fall; out[1] += (ny + nx * v.dir * sw) * a * fall;
    }
    return out;
  }

  // jagged cavern wall silhouettes (x offsets sampled every wallStep units, deterministic per row)
  ensureWalls(toY) {
    const U = KABLAST.U;
    while (this.wallTop > toY) {
      const seed = U.hashStr('w' + Math.round(this.wallTop));
      const rng = U.mulberry32(seed);
      this.wall.push({ y: this.wallTop, l: 8 + rng() * 30, r: 8 + rng() * 30 });
      this.wallTop -= this.wallStep;
    }
  }
  // wall inset at a given y (interpolated), so physics bounces exactly on the drawn rock
  wallAt(y) {
    const rows = this.wall, f = (rows[0].y - y) / this.wallStep;
    const i = Math.max(0, Math.min(rows.length - 2, Math.floor(f))), t = Math.max(0, Math.min(1, f - i));
    const a = rows[i], b = rows[i + 1];
    return { l: a.l + (b.l - a.l) * t, r: a.r + (b.r - a.r) * t };
  }
};
