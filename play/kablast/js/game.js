/* KABLAST — game core: state machine, input, the blast/chain-reaction rules, the Dark, scoring, revive. */
KABLAST.game = (() => {
  const CFG = KABLAST.CFG, U = KABLAST.U, P = KABLAST.particles, FX = KABLAST.fx, A = KABLAST.audio, H = KABLAST.haptics, TAU = U.TAU;
  const t = (k, v) => KABLAST.i18n.t(k, v), I = () => KABLAST.i18n;
  let canvas, dpr = 1, cw = 0, ch = 0;
  const G = { state: 'BOOT', world: null, orb: null, dark: { y: CFG.dark.startGap }, t: 0, tReal: 0, dtReal: 0, skin: null, padAlpha: 1 };
  let events = [], started = false, maxH = 0, shownScore = -1;
  let runShards = 0, runCrystals = 0, closeCalls = 0, bestChain = 0, novas = 0, airCombo = 0, dieT = 0;
  let lastTs = 0, pointerId = null, holding = false, hidden = false, emberAcc = 0, darkHintShown = false, deathReason = '', continues = 0;
  let gameCounted = false;   // this run has already been counted as one finished game (a revive does not make it two)
  // 1.2: the boosts this run spends (armed on the title screen, taken out of the inventory when the run starts)
  let runBoost = {}, headStartDone = false;
  const q1 = [], q2 = [], q3 = [];

  const viewH = () => KABLAST.render.viewH();
  const colorOf = c => c.kind === 'dark' ? CFG.darkShard.glow : c.kind === 'prism' ? CFG.prism.hex : c.kind === 'nova' ? CFG.novaCore.hex : KABLAST.cosmetics.gemHex(c.color);
  // In-run shard income, scaled by CFG.shards.rate. Fractions carry over between awards so a 1-shard crystal
  // still counts towards the total instead of rounding away to nothing.
  let shardAcc = 0;
  function addShards(n) {
    shardAcc += n * CFG.shards.rate * (runBoost.doubleShards ? CFG.boosts.doubleShards.mult : 1);
    const whole = Math.floor(shardAcc); if (whole <= 0) return;
    shardAcc -= whole;
    const S = KABLAST.save.data; S.shards += whole; runShards += whole; KABLAST.ui.setShards(S.shards);
  }
  function schedule(delay, fn) { events.push({ at: G.t + delay, fn }); }
  function processEvents() {
    if (!events.length) return;
    const due = []; const keep = [];
    for (const e of events) (e.at <= G.t ? due : keep).push(e);
    events = keep; due.sort((a, b) => a.at - b.at); for (const e of due) e.fn();
  }
  function camTarget() {
    const vh = viewH(), o = G.orb;
    if (!o.alive) return o.y;                            // death: centre on the orb
    const k = U.clamp((o.vy + 400) / 800, 0, 1);         // 0 = rising fast … 1 = falling fast
    const f = U.lerp(0.72, 0.40, k);                     // where the orb sits on screen (0 top … 1 bottom): falling → see more below
    return o.y - (f - 0.5) * vh + o.vy * 0.09;           // + velocity lead cancels smoothing lag
  }

  // ---------- run lifecycle ----------
  function newRun(home) {
    G.world = new KABLAST.World(); G.world.spawnOpening(); G.world.ensure(-2200);
    G.orb = new KABLAST.Orb(api); G.dark.y = CFG.dark.startGap;
    events = []; G.t = 0; started = false; maxH = 0; shownScore = -1; G.maxH = 0; G.rescues = 0; rescueT = 0;
    G.level = KABLAST.levels.at(0); G.gateWarned = false; G.reliefUntilM = -1; G.tide = { warn: false, surge: false, warned: false }; continues = 0; G.shatter = null; G.shieldBreaks = 0; G.shieldBreakM = -1; G.shieldBreakCause = ''; gameCounted = false;
    KABLAST.ui.setLevel(G.level); KABLAST.ui.setShield(G.orb.shield);
    runBoost = {}; headStartDone = false; G.orb.ringMul = 1; G.boosts = runBoost;
    runShards = 0; runCrystals = 0; closeCalls = 0; bestChain = 0; novas = 0; airCombo = 0; shardAcc = 0; G.padAlpha = 1; darkHintShown = false; againHintShown = false; novaHintShown = false; G.novaBoost = 0; deathReason = '';
    P.clear(); FX.reset(); FX.cam.ty = camTarget(); FX.cam.y = FX.cam.ty;
    G.state = 'READY';
    KABLAST.ui.show(home ? 'title' : 'ready'); KABLAST.ui.setScore(0); KABLAST.ui.setShards(KABLAST.save.data.shards); KABLAST.ui.hint('');
  }
  function startRun() {
    G.state = 'PLAYING'; KABLAST.ui.show('hud');
    KABLAST.ads.gameplayStart();                    // the player's first real input of the run
    const S = KABLAST.save.data; S.runs++; KABLAST.missions.touchStreak(); KABLAST.missions.event('runs', 1); KABLAST.save.write();
    if (!S.tutorialDone) KABLAST.ui.hint(t('hint.letGo'), 0);
    // the boosts armed on the title screen are spent now, once, for this whole run (a revive keeps them)
    const R = KABLAST.rewards;
    runBoost = R.consumeArmed(); G.boosts = runBoost;
    G.orb.ringMul = runBoost.bigRing ? CFG.boosts.bigRing.mult : 1;
    R.runStarted();
    const o = G.orb; let dy = 0;
    if (runBoost.doubleShards) { FX.popup(t('pop.double'), o.x, o.y - 90 - dy, '#ffe066', 20, 1.6); dy += 30; }
    if (runBoost.bigRing) { FX.popup(t('pop.bigRing'), o.x, o.y - 90 - dy, '#9ffbff', 20, 1.6); dy += 30; }
  }
  // HEAD START: right after the first launch off the pad, the orb is fired up about a kilometre on the Nova's
  // afterburner. No blast can be charged while it climbs (a blast would spend the climb), and nothing else changes:
  // it is a shortcut past the opening, not a shield.
  function headStart() {
    const o = G.orb, B = CFG.boosts.headStart;
    headStartDone = true;
    o.vy = Math.min(o.vy, -B.vy); o.vx *= 0.3;
    G.novaBoost = Math.max(G.novaBoost, B.lift); o.cooldown = Math.max(o.cooldown, B.lift + 0.35); o.cancelCharge();
    FX.popup(t('pop.headStart'), o.x, o.y - 70, CFG.novaCore.hex, 30, 1.6); FX.flash(CFG.novaCore.hex, 0.4); FX.shake(14);
    P.burstSparks(o.x, o.y + 10, '#fff3b0', 40, 520, { life: 1 }); A.nova(); H.notify('success');
  }
  function leavePad() {
    const o = G.orb; if (!o.onPad) return;
    o.onPad = false; started = true;
    P.burstSparks(CFG.W / 2, 22, G.skin.halo, 30, 260, { g: 200 });
    if (!KABLAST.save.data.tutorialDone) KABLAST.ui.hint(t('hint.chain'), 2800);
  }

  // ---------- THE mechanic: blast → chain reaction → launch ----------
  // Evaluate a blast of radius R at (x, y): the crystals it hits directly, the chain waves, and whether a dark shard is inside.
  // Ghost (out-of-phase PULSE) crystals are ignored entirely — they neither chain nor kill.
  function evalChain(x, y, R) {
    const W = G.world;
    W.query(x, y, R + CFG.crystal.r * 0.6, q1);
    const direct = q1.filter(c => c.alive && W.solid(c));
    const shard = direct.find(c => c.kind === 'dark');
    if (shard) return { shard, direct, waves: [], total: 0 };
    const waves = [], seen = new Set(direct.map(c => c.id));
    let frontier = direct.slice(), total = 0;
    while (frontier.length) {
      waves.push(frontier); const next = [];
      for (const c of frontier) {
        if (c.kind !== 'dark') total++;
        const nova = c.kind === 'nova';
        W.query(c.x, c.y, nova ? CFG.nova.radius : CFG.crystal.chainR, q2);
        for (const d of q2) {
          if (!d.alive || seen.has(d.id) || !W.solid(d)) continue;
          if (nova) { seen.add(d.id); next.push(d); continue; }
          if (d.kind === 'dark') continue;
          if (d.kind === 'nova' || d.kind === 'prism' || c.kind === 'prism' || d.bonus || c.bonus || d.color === c.color) { seen.add(d.id); next.push(d); }
        }
      }
      frontier = next;
    }
    return { shard: null, direct, waves, total };
  }
  // ---------- the ONE shield ----------
  // One life, one shield. The bubble around the orb absorbs the first death of the run — a dark shard inside the ring
  // ('shard') or the Dark catching the orb ('dark') — cracks, shatters, and is gone for the rest of the run.
  const SHIELD_HEX = '#9ffcff';
  function shieldBreak(orb, cause, shard) {
    orb.shield = false; orb.invuln = CFG.shield.invuln; orb.cooldown = CFG.blast.cooldown; orb.cancelCharge();
    if (shard) {          // the shard (and any dark neighbours) vaporise
      G.world.query(shard.x, shard.y, 70, q2);
      for (const c of q2.slice()) if (c.alive && c.kind === 'dark') { G.world.kill(c); P.burstShards(c.x, c.y, CFG.darkShard.glow, 10, 420); P.burstSparks(c.x, c.y, '#ffffff', 16, 320); }
    } else {              // the Dark recoils from the shattering shield
      G.dark.y = Math.max(G.dark.y, orb.y) + CFG.shield.darkPush;
      FX.ring(orb.x, G.dark.y - CFG.shield.darkPush, 30, 320, '#9b5cff', 0.8, 6);
      for (let i = 0; i < 40; i++) P.ember(U.rand(0, CFG.W), G.dark.y + U.rand(-4, 14), Math.random() < 0.5 ? '#9b5cff' : '#ff4fd8');
    }
    // the orb is thrown back into the air so it is never left stranded
    const Uv = CFG.blast.base * Math.pow(CFG.shield.launch, CFG.blast.pow);
    orb.vy = Math.min(orb.vy, 0) * 0.3 - Uv; orb.vx *= 0.3;
    leavePad();
    // the shatter: a crack phase (bubble still round, cracks spreading) then 14 glass fragments flying apart — drawn by render.js
    const frags = [], N = 14;
    for (let i = 0; i < N; i++) {
      const a0 = i * TAU / N + U.rand(-0.08, 0.08), span = TAU / N * U.rand(0.6, 1.0), am = a0 + span / 2, v = U.rand(110, 340);
      frags.push({ a0, span, am, x: 0, y: 0, vx: Math.cos(am) * v + orb.vx * 0.2, vy: Math.sin(am) * v - 90, rot: 0, vr: U.rand(-8, 8) });
    }
    G.shatter = { x: orb.x, y: orb.y, life: 0, crack: 0.16, dur: 1.15, frags, cause };
    G.shieldBreaks = (G.shieldBreaks || 0) + 1; G.shieldBreakM = Math.floor(maxH / CFG.unitsPerMeter); G.shieldBreakCause = cause;
    FX.shake(24); FX.punch(0.14); FX.flash('#bffcff', 0.36); FX.blip(0.6);
    FX.ring(orb.x, orb.y, 30, 300, SHIELD_HEX, 0.8, 6);
    P.burstSparks(orb.x, orb.y, SHIELD_HEX, 50, 480, { life: 1.3 });
    KABLAST.ui.setShield(false, true);
    KABLAST.ui.zone(t('zone.shieldBroken'), cause === 'dark' ? t('zone.shieldDark') : t('zone.shieldShard'), 'shield');
    KABLAST.ui.hint(t('hint.lastLife'), 3400);
    A.shieldBreak(); H.notify('warning');
  }
  function blast(orb, R) {
    const ev = evalChain(orb.x, orb.y, R);
    if (ev.shard) { if (CFG.shield.enabled && orb.shield) shieldBreak(orb, 'shard', ev.shard); else die('shard', ev.shard); return; }
    orb.blasts++; KABLAST.missions.event('blasts', orb.blasts); rescueT = Math.min(rescueT, 0.3);
    const wasFlying = !orb.onPad && orb.vy < -150;
    leavePad();
    const direct = ev.direct, waves = ev.waves, total = ev.total;
    if (!direct.length) { airCombo = 0; fizzle(orb, R); return; }
    const counts = [0, 0, 0, 0]; for (const c of direct) if (c.kind === 'gem') counts[c.color]++;
    const domColor = counts.indexOf(Math.max(...counts));
    const hex = counts[domColor] > 0 ? KABLAST.cosmetics.gemHex(domColor) : colorOf(direct[0]);

    let cum = 0;
    waves.forEach((w, k) => {
      cum += w.filter(c => c.kind !== 'dark').length; const cumK = cum;
      if (k === 0) popWave(orb, w, 0, cumK); else schedule(k * CFG.blast.waveDelay, () => popWave(orb, w, k, cumK));
    });
    schedule(waves.length * CFG.blast.waveDelay + 0.04, () => chainDone(orb, total, hex));

    airCombo = wasFlying ? airCombo + 1 : 1;
    if (airCombo >= 2) { FX.popup(t('pop.combo', { n: airCombo }), orb.x, orb.y + 46, '#ffffff', 16, 0.9); addShards(airCombo); }
    if (started && G.dark.y - orb.y < CFG.lastSecond.dist) {
      FX.popup(t('pop.lastSecond'), orb.x, orb.y + 58, '#c9a8ff', 18, 1.1); addShards(CFG.lastSecond.reward); FX.blip(0.2);
    }

    A.blast(total); H.impact(total >= 8 ? 'heavy' : 'medium');
    FX.shake(Math.min(16, 2 + total * 0.9)); FX.punch(Math.min(0.09, 0.012 + total * 0.006));
    FX.ring(orb.x, orb.y, R * 0.5, R * 1.7, '#ffffff', 0.32, 4);
    FX.flash(hex, Math.min(0.3, 0.06 + total * 0.02));
  }
  function popWave(orb, wave, k, cum) {
    let cx = 0, cy = 0, n = 0, novaHit = false, mh = null;
    for (const c of wave) {
      if (!c.alive) continue;
      G.world.kill(c);
      if (c.kind === 'dark') { // vaporised by a Nova — harmless, golden
        P.burstSparks(c.x, c.y, CFG.novaCore.hex, 12, 300); FX.pop(c.x, c.y, CFG.novaCore.hex, 70, 0.5); addShards(2); continue;
      }
      const hex = colorOf(c), big = c.kind === 'nova'; mh = hex;
      P.burstShards(c.x, c.y, hex, big ? 20 : 5, big ? 640 : 380);
      P.burstSparks(c.x, c.y, hex, big ? 34 : 5, big ? 560 : 240);
      FX.pop(c.x, c.y, hex, big ? 120 : 58, big ? 0.6 : 0.4);
      cx += c.x; cy += c.y; n++;
      addShards(c.kind === 'prism' || c.bonus ? 3 : 1); runCrystals++;
      if (big) novaHit = true;
    }
    if (!n) return;
    cx /= n; cy /= n;
    P.motes(cx, cy, mh, Math.min(8, 2 + (n >> 1)), 16 + n * 2);   // the afterglow of this wave
    KABLAST.save.data.totalCrystals += n;
    KABLAST.missions.event('crystalsRun', runCrystals); KABLAST.missions.event('crystals', n);
    if (novaHit) {                                   // a captured star goes off: the whole screen answers, and the orb rockets
      novas++; KABLAST.save.data.novaTotal = (KABLAST.save.data.novaTotal || 0) + 1;
      A.nova(); FX.shake(26); FX.punch(0.16); FX.flash(CFG.novaCore.hex, 0.6); FX.blip(0.16);
      FX.ring(cx, cy, 20, CFG.nova.radius, CFG.novaCore.hex, 0.7, 6);
      FX.ring(cx, cy, 10, CFG.nova.radius * 1.6, '#ffffff', 0.5, 3);
      FX.starburst(cx, cy, CFG.nova.radius * 2.2, 0.75);
      P.burstSparks(cx, cy, '#fff3b0', 44, 720, { life: 1.15 });
      FX.popup(t('pop.nova'), orb.x, orb.y - 64, CFG.novaCore.hex, 38, 1.5); H.notify('success'); KABLAST.missions.event('novas', 1);
      G.novaBoost = CFG.nova.boostT;
    }
    const U0 = Math.min(CFG.blast.cap, CFG.blast.base * Math.pow(cum, CFG.blast.pow)), NV = CFG.nova;
    const Uv = novaHit ? Math.min(NV.launchCap, Math.max(NV.launchMin, U0 * NV.launchMul)) : U0;
    const hdir = U.clamp((orb.x - cx) / 50, -1, 1);
    if (k === 0) { orb.vy = Math.min(orb.vy, 0) * CFG.blast.keepUp - Uv; orb.vx = orb.vx * 0.2 + hdir * CFG.blast.hx; }
    else { if (orb.vy > -Uv) orb.vy = -Uv; orb.vx += hdir * CFG.blast.hxWave; FX.shake(1.5); }
    A.ping(k);
  }
  function chainDone(orb, total, hex) {
    if (total > bestChain) bestChain = total;
    KABLAST.missions.event('chain', total);
    if (total < 3) return;
    const big = total >= 15 ? t('pop.supernova') : total >= 8 ? t('pop.mega') : null;
    FX.popup(`×${total}`, orb.x, orb.y - 34, hex, total >= 8 ? 40 : 30, 1.1);
    if (big) { FX.popup(big, orb.x, orb.y - 80, '#ffffff', 22, 1.3); H.notify('success'); }
    if (total >= 6) addShards(total);
    if (total >= 12) addShards(total);
  }
  function fizzle(orb, R) {
    orb.vy = Math.min(orb.vy, 0) * 0.5 - CFG.blast.fizzle; orb.cooldown = CFG.blast.fizzleCooldown;
    FX.ring(orb.x, orb.y, R * 0.4, R, '#ffffff', 0.25, 2); P.burstSparks(orb.x, orb.y, G.skin.halo, 12, 240);
    A.fizzle(); H.impact('light');
  }
  function onPadLand(orb) {
    G.padAlpha = 1; P.burstSparks(orb.x, 22, G.skin.halo, 14, 180, { g: 200 }); A.bounce(600); H.impact('light');
    if (!KABLAST.save.data.tutorialDone) KABLAST.ui.hint(t('hint.holdLonger'), 2600);
  }
  function onWallHit(orb, side) {
    const v = Math.abs(orb.vx); if (v < 90) return;
    P.burstSparks(orb.x, orb.y, G.skin.halo, Math.min(14, 4 + v / 60), Math.min(320, v * 0.6));
    FX.shake(Math.min(4, v / 200)); A.bounce(v); H.impact('light');
  }

  // ---------- the Dark, death, revive ----------
  function updateDark(dtReal) {
    const D = CFG.dark, vh = viewH(), M = CFG.mech;
    const m = maxH / CFG.unitsPerMeter, d = KABLAST.difficulty(m), lv = G.level;
    let speed = U.lerp(D.baseSpeed, D.maxSpeed, d);
    if (m > CFG.difficulty.fullAt) speed = U.lerp(D.maxSpeed, D.beyond.speed, U.clamp((m - CFG.difficulty.fullAt) / (D.beyond.atM - CFG.difficulty.fullAt), 0, 1));
    speed *= KABLAST.levels.darkMul(m, G.reliefUntilM >= 0 ? G.reliefUntilM : undefined);
    if (KABLAST.levels.has(lv, 'lowg')) speed *= M.lowg.darkMul;
    if (KABLAST.levels.has(lv, 'eclipse')) speed *= M.eclipse.darkMul;
    // TIDE: the Dark rests, flashes a warning, then surges
    G.tide.warn = false; G.tide.surge = false;
    if (KABLAST.levels.has(lv, 'tide')) {
      const T = M.tide, ph = G.t % T.period;
      if (ph > T.period - T.surge) { G.tide.surge = true; speed *= T.surgeMul; }
      else if (ph > T.period - T.surge - T.warn) { G.tide.warn = true; speed *= T.restMul; if (!G.tide.warned) { G.tide.warned = true; A.tideWarn(); H.impact('medium'); } }
      else { speed *= T.restMul; G.tide.warned = false; }
    }
    const excess = (G.dark.y - G.orb.y) - U.lerp(D.catchupScreens0, D.catchupScreens1, d) * vh;   // early fumbles are forgiven more
    if (excess > 0) speed = Math.max(speed, excess * D.catchupK);
    G.dark.y -= speed * dtReal;
  }
  // "Never hopeless": if the orb is falling and there is no safely blastable crystal anywhere in the corridor
  // between it and the Dark, drop a small clean cluster in its path. Fires rarely in practice.
  let rescueT = 0;
  // A crystal counts as "safely blastable from the fall line" when the ring that reaches it from the orb's column
  // (orb beside it at x = o.x) would not swallow a dark shard.
  function safeFromColumn(c, ox) {
    const D = Math.abs(c.x - ox);
    G.world.query(ox, c.y, D + 12, q3);
    for (let i = 0; i < q3.length; i++) if (q3[i].alive && q3[i].kind === 'dark') return false;
    return true;
  }
  function checkRescue(dtReal) {
    rescueT -= dtReal; if (rescueT > 0) return;
    const o = G.orb, R = CFG.rescue;
    if (!started || !o.alive || o.vy < 150) return;
    const gap = G.dark.y - o.y; if (gap < R.minGap) return;
    const cs = G.world.crystals;
    for (let i = 0; i < cs.length; i++) {
      const c = cs[i];
      if (!c.alive || c.kind === 'dark' || c.y < o.y - 120 || c.y > G.dark.y - R.aboveDark || Math.abs(c.x - o.x) > R.corridor) continue;
      if (!safeFromColumn(c, o.x)) continue;
      if ((c.ladder && c.cluster) || c.kind === 'nova' || c.kind === 'prism' || c.bonus) return;   // a rung / jackpot on the way down → no rescue needed
      // a lone gem only counts if it chains into at least one neighbour (a 1-chain barely lifts you)
      G.world.query(c.x, c.y, CFG.crystal.chainR, q3);
      for (let k = 0; k < q3.length; k++) { const d = q3[k]; if (d !== c && d.alive && d.kind !== 'dark' && (d.color === c.color || d.kind === 'prism' || d.bonus)) return; }
    }
    // Drop the cluster slightly to the side AWAY from the nearest rung above, so the blast pushes the player back toward the ladder.
    const y = o.y + U.clamp(gap - 130, 40, 320);
    let rungX = null, bestDy = Infinity;
    for (let i = 0; i < cs.length; i++) { const c = cs[i]; if (c.alive && c.ladder && c.cluster && c.y < o.y - 60 && o.y - c.y < bestDy) { bestDy = o.y - c.y; rungX = c.cluster.cx; } }
    const side = rungX === null ? 0 : (rungX > o.x ? -1 : 1);
    // Each rescue in a run is smaller than the last (4 → 3 → 2 gems) and comes a little later: a safety net, not a farm.
    const n = G.rescues || 0, size = R.sizes[Math.min(n, R.sizes.length - 1)];
    const cl = G.world.spawnRescue(U.clamp(o.x + side * 42, 90, CFG.W - 90), y, size);
    rescueT = R.cooldown * (1 + 0.5 * Math.min(n, 4)); G.rescues = n + 1;
    if (cl) { FX.ring(cl.cx, cl.cy, 10, 90, '#ffffff', 0.6, 2); P.burstSparks(cl.cx, cl.cy, '#ffffff', 16, 200, { g: 0 }); }
  }
  function checkDeath() {
    const o = G.orb; if (o.invuln > 0) return;
    if (o.y + CFG.orb.r > G.dark.y - 4) { if (CFG.shield.enabled && o.shield) shieldBreak(o, 'dark'); else die('dark'); }
  }
  // the shield shatter animation (crack phase follows the orb, then the fragments fly on their own)
  function updateShatter(dt) {
    const s = G.shatter; if (!s) return;
    s.life += dt;
    if (s.life < s.crack) { s.x = G.orb.x; s.y = G.orb.y; return; }
    for (const f of s.frags) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 650 * dt; f.vx *= Math.pow(0.6, dt); f.rot += f.vr * dt; }
    if (s.life > s.dur) G.shatter = null;
  }
  function checkCloseCalls() {
    const o = G.orb; G.world.query(o.x, o.y, CFG.closeCall.dist + CFG.crystal.r, q3);
    for (const c of q3) {
      if (c.kind !== 'dark' || !c.alive || c.cc) continue;
      c.cc = true; closeCalls++; addShards(CFG.closeCall.reward);
      FX.popup(t('pop.closeCall'), o.x, o.y - 30, CFG.darkShard.glow, 17, 0.9); FX.blip(0.14); FX.punch(0.03);
      A.closeCall(); H.impact('light'); KABLAST.missions.event('closeCalls', closeCalls);
    }
  }
  function die(reason, culprit) {
    const o = G.orb; if (!o.alive) return;
    o.cancelCharge(); o.alive = false; holding = false; G.state = 'DYING'; dieT = 0; deathReason = reason; G.novaBoost = 0;
    FX.time.target = 0.12; FX.zoomTo(1.45); FX.shake(22);
    const hex = reason === 'shard' ? CFG.darkShard.glow : '#9b5cff';
    FX.flash(hex, 0.45);
    P.burstShards(o.x, o.y, G.skin.halo, 30, 620); P.burstSparks(o.x, o.y, hex, 60, 520, { life: 1.6 });
    FX.ring(o.x, o.y, 10, 260, hex, 0.9, 6);
    if (culprit) {
      G.world.kill(culprit);
      P.burstShards(culprit.x, culprit.y, CFG.darkShard.glow, 16, 500); P.burstSparks(culprit.x, culprit.y, CFG.darkShard.glow, 30, 400);
      FX.ring(culprit.x, culprit.y, 8, 120, CFG.darkShard.glow, 0.6, 4);
    }
    A.death(); H.notify('error'); KABLAST.ui.hint(''); KABLAST.ui.hideZone();
    KABLAST.ads.gameplayStop();
    KABLAST.save.data.tutorialDone = true;
  }
  function gameOver() {
    G.state = 'OVER'; FX.time.target = 1; FX.zoomTo(1);
    const S = KABLAST.save.data, score = Math.floor(maxH / CFG.unitsPerMeter);
    const newBest = score > S.best && score > 0;
    if (newBest) S.best = score; if (bestChain > S.bestChain) S.bestChain = bestChain;
    if (G.level.num > (S.bestLevel || 0)) S.bestLevel = G.level.num;
    KABLAST.missions.event('height', score);
    KABLAST.save.write();
    // 1.2: rank XP and the weekly best
    const RW = KABLAST.rewards;
    const xp = RW.runOver({ score, crystals: runCrystals, shards: runShards }); RW.panelShown();
    const left = continuesLeft();
    // The run's one revive is a rewarded video, so it is on offer only when the portal can play one
    // (WebPlatform.rewardedEnabled(): false on CrazyGames Basic Launch or with an ad blocker).
    const reviveOnOffer = left > 0 && KABLAST.ads.available();
    // ONE finished game, counted once: the first time this run reaches the game-over panel.
    if (!gameCounted) { gameCounted = true; KABLAST.ads.noteRunEnded(); }
    KABLAST.ui.showOver({ score, best: S.best, newBest, bestChain, crystals: runCrystals, shards: runShards, reason: deathReason,
                       level: G.level, shieldBrokeM: G.shieldBreaks ? G.shieldBreakM : -1,
                       continuesLeft: reviveOnOffer ? left : 0,
                       canWatchAd: reviveOnOffer, xp });
    overReadyAt = performance.now() + 900;
    if (newBest) { A.revive(); if (score >= 1000) KABLAST.ads.happytime(); }
    // A natural break: the run is over for good (no revive on offer), so the portal is asked for an ad break once the
    // panel has settled. While the revive is on offer the break waits for the player's answer (RETRY / HOME ask for
    // it in leave(); CONTINUE carries the same run on), so a break never lands on top of the revive video.
    if (!reviveOnOffer) setTimeout(() => { if (G.state === 'OVER' && !leaving && !adBusy) KABLAST.ads.adBreak('gameover'); }, 700);
  }
  // Leaving the game-over panel. Right before the next run (or the title) the portal is asked for an ad break; a break
  // that is still in flight from the panel is waited for instead of asking twice.
  let leaving = false, overReadyAt = 0;
  async function leave(home) {
    if (G.state === 'READY') { newRun(home); return; }
    if (G.state !== 'OVER' || leaving || adBusy) return;
    leaving = true;
    try { await KABLAST.ads.adBreak(home ? 'home' : 'retry'); } finally { leaving = false; }
    if (G.state !== 'OVER') return;
    newRun(home);
  }
  // Put the orb back in the air above the Dark, clear the danger around it and start a relief stretch.
  function resurrect() {
    const o = G.orb; o.alive = true; o.charging = false; o.cooldown = 0; o.trail.length = 0; o.onPad = false;
    o.shield = !!(CFG.shield.enabled && CFG.shield.onContinue); KABLAST.ui.setShield(o.shield);   // a new life comes with a fresh shield
    o.y = Math.min(o.y, G.dark.y) - 420; o.x = U.clamp(o.x, 60, CFG.W - 60); o.vx = 0; o.vy = -700; o.invuln = 2.2;
    G.dark.y = o.y + 820;
    // purify every dark shard in the next screen and a half: the comeback must feel safe
    const vh = viewH();
    for (const c of G.world.crystals) if (c.alive && c.kind === 'dark' && c.y > o.y - vh * 1.5 && c.y < G.dark.y) { c.kind = 'gem'; P.burstSparks(c.x, c.y, CFG.novaCore.hex, 8, 220); }
    G.reliefUntilM = maxH / CFG.unitsPerMeter + CFG.levels.continueReliefM; G.world.reliefUntilM = G.reliefUntilM;
    FX.cam.ty = camTarget(); FX.cam.snap = true; FX.flash('#ffffff', 0.8); FX.ring(o.x, o.y, 10, 300, '#ffffff', 0.8, 5);
    P.burstSparks(o.x, o.y, G.skin.halo, 50, 500);
    A.revive(); H.notify('success');
    G.state = 'PLAYING'; KABLAST.ui.show('hud'); KABLAST.ui.hint(t('hint.keepClimbing'), 1800);
    KABLAST.ads.gameplayStart();
  }
  // one revive per run, taken by watching a rewarded video
  const continuesLeft = () => Math.max(0, CFG.continues.max - continues);
  // The one revive of the run. It is bought with attention, not shards: watch a rewarded video (granted only when the
  // portal reports the video was watched).
  let adBusy = false;
  async function continueRun() {
    const S = KABLAST.save.data;
    if (G.state !== 'OVER' || adBusy || leaving || KABLAST.ads.breakPlaying() || continuesLeft() <= 0) return;
    if (!KABLAST.ads.available()) { KABLAST.ui.toast(t('toast.noVideo')); return; }
    adBusy = true; KABLAST.ui.setContinueBusy(true);
    const ok = await KABLAST.ads.showRewarded('continue');
    adBusy = false; KABLAST.ui.setContinueBusy(false);
    if (G.state !== 'OVER') return;                       // the panel moved on while the video played
    if (!ok) { KABLAST.ui.toast(t('toast.noVideo')); return; }   // no video, or not watched to the end: the offer stays
    S.adsWatched = (S.adsWatched || 0) + 1;
    continues++;
    S.continuesUsed = (S.continuesUsed || 0) + 1; KABLAST.save.write();
    resurrect();
  }

  // ---------- frame ----------
  const accel = [0, 0];
  // while the ring grows: a glass tick for each crystal it takes in, and a warning when a killer comes inside
  const qRing = []; let ringN = 0, ringDark = 0;
  function ringSound(o) {
    if (!o.charging) { ringN = ringDark = 0; return; }
    G.world.query(o.x, o.y, o.ringR + CFG.crystal.r * 0.6, qRing);
    let n = 0, dk = 0;
    for (const c of qRing) if (c.alive && G.world.solid(c)) { if (c.kind === 'dark') dk++; else n++; }
    if (n > ringN) A.chargeGather(n);
    if (dk !== ringDark) A.chargeDanger(dk > 0, dk > ringDark);
    ringN = n; ringDark = dk;
  }
  function update(dtReal) {
    const o = G.orb;
    G.skin = KABLAST.skins.liveColors(KABLAST.skins.current(), G.tReal);
    if (holding && G.state === 'PLAYING' && o.alive && !o.charging && o.cooldown <= 0) o.startCharge();
    if (o.charging) { o.updateCharge(dtReal); ringSound(o); }    // may auto-release → blast → possibly die
    else ringN = ringDark = 0;
    const dtGame = FX.update(dtReal);
    G.t += dtGame;
    if (G.state === 'READY' || G.state === 'PLAYING') {
      const lvHere = KABLAST.levels.at(-o.y / CFG.unitsPerMeter);           // fields depend on where the orb IS, not on the best height
      const lowg = KABLAST.levels.has(lvHere, 'lowg'), M = CFG.mech;
      const steps = Math.max(1, Math.ceil(dtGame / (1 / 120))), h = dtGame / steps;
      for (let i = 0; i < steps; i++) {
        if (o.onPad) { o.update(h); continue; }
        G.world.fieldAccel(o.x, o.y, accel);
        if (G.novaBoost > 0) { accel[1] -= CFG.nova.lift; G.novaBoost = Math.max(0, G.novaBoost - h); }   // the Nova's afterburn
        o.update(h, lowg ? M.lowg.gravity : 1, lowg ? M.lowg.termVel : 1, accel[0], accel[1]);
      }
      if (G.novaBoost > 0 && !o.onPad) P.burstSparks(o.x + U.rand(-3, 3), o.y + U.rand(4, 14), Math.random() < 0.5 ? '#ffe46b' : '#fff6c8', 2, 80, { life: 0.7 });
      if (!o.onPad) o.recordTrail();
      G.world.update(dtGame, G.t);
      if (G.state === 'PLAYING' && started && runBoost.headStart && !headStartDone && !o.onPad) headStart();
      if (G.state === 'PLAYING' && started) { updateDark(dtReal); checkDeath(); }
      if (G.state === 'PLAYING' && started) { checkCloseCalls(); checkRescue(dtReal); }
      if (-o.y > maxH) maxH = -o.y;
      G.maxH = maxH;
      const m = Math.floor(maxH / CFG.unitsPerMeter);
      if (m !== shownScore) { shownScore = m; KABLAST.ui.setScore(m); trackLevel(m); }
      if (lowg && Math.random() < 0.35) P.ember(o.x + U.rand(-160, 160), o.y + U.rand(-200, 200), '#8fd3ff');   // floating motes
      G.world.ensure(o.y - viewH() * 1.6);
      G.world.prune(Math.max(G.dark.y, o.y + viewH()) + 250);
      if (G.padAlpha > 0 && !o.onPad && G.dark.y < 60) G.padAlpha = Math.max(0, G.padAlpha - dtReal * 2.5);   // the pad fades only once the Dark takes it
      tutorial(); novaHint();
    } else if (G.state === 'DYING') {
      dieT += dtReal; G.world.update(dtGame, G.t); if (dieT > 1.05) gameOver();
    } else if (G.state === 'OVER') { G.world.update(dtGame, G.t); }
    processEvents(); P.update(dtGame); embers(dtGame); updateShatter(dtGame);
    FX.cam.ty = camTarget();
  }
  // level / phase transitions: banners, gate rewards, missions
  function trackLevel(m) {
    const lv = KABLAST.levels.at(m), prev = G.level;
    G.level = lv;
    KABLAST.ui.setLevel(lv);
    if (prev && lv.index !== prev.index) {
      if (lv.index > prev.index && started) {                       // GATE CLEARED (or LEVEL UP for the tutorial level)
        const reward = 20 + 10 * prev.num, hadGate = prev.index >= (CFG.levels.noGateLevels || 1);
        addShards(reward); KABLAST.missions.event('level', lv.num); if (hadGate) KABLAST.missions.event('gates', 1);
        FX.popup(`${hadGate ? t('pop.gateCleared') : t('pop.levelUp')}  +${I().num(reward)}`, G.orb.x, G.orb.y + 70, '#ffe66d', 22, 1.5);   // below the orb: the level banner owns the space above
        FX.flash('#ffffff', 0.35); FX.punch(0.08); A.gate(); H.notify('success');
      }
      KABLAST.ui.zone(I().upper(I().levelName(lv)), I().levelHint(lv), lv.bonus ? 'bonus' : '', t('level.caps', { n: lv.num }));
      G.gateWarned = false;
    } else if (prev && lv.bonus !== prev.bonus && !lv.bonus) {
      KABLAST.ui.zone(I().upper(I().levelName(lv)), I().levelHint(lv), '', t('level.caps', { n: lv.num }));
    } else if (prev && lv.phase === 'gate' && prev.phase !== 'gate' && !G.gateWarned) {
      G.gateWarned = true; KABLAST.ui.zone(t('zone.gate'), t('zone.gateSub'), 'gate'); A.tideWarn(); H.impact('heavy');
    }
  }
  function embers(dt) {
    const vh = viewH(), cy = FX.cam.y;
    if (G.dark.y > cy + vh / 2 + 40 || G.dark.y < cy - vh / 2) return;
    emberAcc += dt * 9;
    const ec = KABLAST.cosmetics.embers();
    while (emberAcc > 1) { emberAcc--; P.ember(U.rand(0, CFG.W), G.dark.y + U.rand(-2, 12), Math.random() < 0.5 ? ec[0] : ec[1]); }
  }
  let againHintShown = false, novaHintShown = false;
  function tutorial() {
    if (KABLAST.save.data.tutorialDone) return;
    const o = G.orb;
    if (!againHintShown && started && o.blasts === 1 && o.vy > 350 && !o.charging) { againHintShown = true; KABLAST.ui.hint(t('hint.again'), 2200); }
    if (darkHintShown) return;
    const vh = viewH(), top = FX.cam.y - vh / 2;
    for (const c of G.world.crystals) if (c.alive && c.kind === 'dark' && c.y > top && c.y < top + vh * 0.7) { darkHintShown = true; KABLAST.ui.hint(t('hint.dark'), 3200); break; }
  }
  // until the player has set off three, the first Nova of a run explains itself as soon as it is on screen
  function novaHint() {
    if (novaHintShown || !started || (KABLAST.save.data.novaTotal || 0) >= 3) return;
    const vh = viewH(), top = FX.cam.y - vh / 2;
    for (const c of G.world.crystals) if (c.alive && c.kind === 'nova' && c.y > top + 60 && c.y < top + vh * 0.75) { novaHintShown = true; KABLAST.ui.hint(t('hint.nova'), 3200); break; }
  }
  function loop(ts) {
    requestAnimationFrame(loop);
    if (!lastTs) { lastTs = ts; return; }
    let dt = (ts - lastTs) / 1000; lastTs = ts;
    if (hidden) return;
    if (dt > 0.05) dt = 0.05;            // physics substeps at 120 Hz inside update(), so any refresh rate plays the same
    G.dtReal = dt; G.tReal += dt;
    update(dt);
    KABLAST.render.draw(G);
  }

  // ---------- input ----------
  // Mouse, touch and pen: hold anywhere on the stage (the playfield and, on a wide screen, the backdrop beside it).
  // Keyboard: hold SPACE / ENTER / UP / W to charge, let go to blast; on the game-over panel the same key is RETRY.
  // P or ESC pauses (and SPACE, a click or a tap resumes); ESC also closes an open sheet.
  function press() {
    A.unlock(); A.resume();
    if (KABLAST.ui.isModal()) { KABLAST.ui.closeModal(); return; }
    if (G.state === 'PAUSED') { resume(); return; } // the un-pause tap never fires a charge
    holding = true;
    if (G.state === 'READY') { startRun(); G.orb.startCharge(); }
    else if (G.state === 'PLAYING') G.orb.startCharge();
  }
  function lift() { A.unlock(); holding = false; if (G.orb && G.orb.charging) G.orb.release(); }
  // manual = the player paused (key): the portal is told gameplay stopped. Losing focus or hiding the tab pauses the
  // game too, but is not reported (the portals do not want a gameplay stop on blur).
  function pause(manual) {
    holding = false; pointerId = null;
    if (G.orb && G.orb.charging) G.orb.cancelCharge();
    if (G.state === 'PLAYING' && started) { G.state = 'PAUSED'; KABLAST.ui.show('paused'); if (manual) KABLAST.ads.gameplayStop(); }
    KABLAST.save.write();
  }
  function resume() {
    if (G.state !== 'PAUSED') return;
    G.state = 'PLAYING'; KABLAST.ui.show('hud'); lastTs = 0;
    KABLAST.ads.gameplayStart();
  }
  const HOLD_KEYS = { Space: 1, Enter: 1, NumpadEnter: 1, ArrowUp: 1, ArrowDown: 1, KeyW: 1 };
  const overlayOpen = () => KABLAST.ui.isModal() || !!document.querySelector('#chestopen.on, #odds.on');
  function bindInput() {
    const stage = canvas.parentNode;
    stage.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (pointerId !== null) return; pointerId = e.pointerId;
      try { stage.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault(); press();
    });
    const up = e => { if (pointerId === null || e.pointerId !== pointerId) return; pointerId = null; lift(); };
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    window.addEventListener('keydown', e => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (document.querySelector('#odds.on')) { if (e.code === 'Escape') document.getElementById('odds').classList.remove('on'); return; }
        if (KABLAST.ui.isModal()) { if (e.code === 'Escape') KABLAST.ui.closeModal(); return; }
        if (G.state === 'PLAYING' && started) pause(true); else if (G.state === 'PAUSED') resume();
        return;
      }
      if (!HOLD_KEYS[e.code]) return;
      e.preventDefault();
      // a button keeps the focus after a click; SPACE / ENTER must not click it again
      const ae = document.activeElement; if (ae && ae !== document.body && ae.blur) ae.blur();
      if (e.repeat || overlayOpen()) return;
      if (G.state === 'OVER') { if (performance.now() > overReadyAt && !leaving && !adBusy) api.retry(); return; }
      if (!holding) press();
    });
    window.addEventListener('keyup', e => { if (HOLD_KEYS[e.code]) { e.preventDefault(); lift(); } });
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('visibilitychange', () => {
      hidden = document.hidden;
      if (hidden) { pause(false); A.suspend(); }
      else { lastTs = 0; A.resume(); }
    });
    window.addEventListener('blur', () => pause(false));
    window.addEventListener('touchend', () => A.unlock(), { passive: true }); // iOS grants audio on touchend
  }
  /* LAYOUT. The playfield is portrait: the 420-unit world, never framed wider than PLAY_ASPECT (0.58, the widest
     portrait phone the game was built for, so the look-ahead stays what it is on a phone).
       • Portrait screens (phones, tall windows): the stage is the screen, or a centred 0.58 column, as on iOS.
       • Wide screens (the portals' 16:9 desktop frame, landscape phones and tablets): the stage fills the window with a
         matching cosmic backdrop, the playfield is a full-height centred column, and the UI is laid out on a fixed
         logical box (390 wide, at least UI_H tall) scaled uniformly to the window height, so every word stays legible
         at 821×462 and 640×360 and is crisp and large on a 1080p screen.
     Measure the stage and the page, never the canvas alone (iOS moves window.innerHeight around). */
  const PLAY_ASPECT = 0.58, WIDE_AT = 1.2, UI_W = 390, UI_H = 460;
  let wide = false;
  function resize() {
    const stage = canvas.parentNode, ui = document.getElementById('ui');
    const vr = document.body.getBoundingClientRect();
    const vw = Math.max(1, Math.round(vr.width)), vh = Math.max(1, Math.round(vr.height));
    const isWide = vw / vh >= WIDE_AT;
    if (isWide !== wide) { wide = isWide; stage.classList.toggle('wide', wide); }
    let w, h, uiW, uiH;
    if (wide) {
      h = vh; w = Math.min(vw, Math.round(vh * PLAY_ASPECT));
      canvas.style.left = Math.round((vw - w) / 2) + 'px'; canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      uiH = Math.max(UI_H, Math.round(vh / 1.6));
      const s = vh / uiH;
      uiW = Math.min(Math.max(UI_W, Math.round(w / s)), Math.floor(vw / s));
      ui.style.width = uiW + 'px'; ui.style.height = uiH + 'px';
      ui.style.left = Math.round((vw - uiW * s) / 2) + 'px';
      ui.style.transform = `scale(${s})`;
      stage.style.setProperty('--uis', s.toFixed(4));
      stage.style.setProperty('--uivw', (vw / s).toFixed(1) + 'px');   // the whole window, in the UI's logical px
    } else {
      canvas.style.left = canvas.style.width = canvas.style.height = '';
      ui.style.width = ui.style.height = ui.style.left = ui.style.transform = '';
      const r = stage.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
      uiW = w; uiH = h;
      stage.style.removeProperty('--uis'); stage.style.removeProperty('--uivw');
    }
    const d = Math.min(window.devicePixelRatio || 1, 2);   // real device pixels, capped at 2x for performance
    if (w === cw && h === ch && d === dpr && uiW === lastUiW && uiH === lastUiH) return;   // nothing changed — don't churn the sprite caches
    cw = w; ch = h; dpr = d; lastUiW = uiW; lastUiH = uiH;
    // the UI sizes itself against its own box, never against the window (see --stagew in style.css)
    stage.style.setProperty('--stagew', uiW + 'px');
    stage.style.setProperty('--stageh', uiH + 'px');
    stage.classList.toggle('short', uiH <= 760);
    stage.classList.toggle('narrow', uiW < 360);            // 4-inch phones: the HUD tightens so the score keeps the middle
    KABLAST.render.resize(cw, ch, dpr);
    // canvas popups keep a readable size when a wide screen makes the playfield small (phone-sized on a 462 px frame)
    FX.popScale = wide ? U.clamp(0.9 / KABLAST.render.scale, 1, 1.45) : 1;
    if (G.orb) { FX.cam.ty = camTarget(); }
    if (KABLAST.ui.ready) KABLAST.ui.fitAll();
  }
  let lastUiW = 0, lastUiH = 0;

  function boot() {
    canvas = document.getElementById('game');
    KABLAST.save.load(); KABLAST.missions.init(); KABLAST.rewards.init();
    KABLAST.render.init(canvas); resize();
    G.skin = KABLAST.skins.liveColors(KABLAST.skins.current(), 0);
    KABLAST.ui.init(api);
    bindInput();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => { resize(); setTimeout(resize, 120); setTimeout(resize, 400); });
    // the stage can change size without a window resize event (iOS status bar, split view, zoom)
    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas.parentNode);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
    newRun(true);
    requestAnimationFrame(loop);
    // the first screen is ready once its faces have loaded (or after a short wait): tell the portal
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.race([fontsReady, new Promise(r => setTimeout(r, 2500))]).then(() => requestAnimationFrame(() => KABLAST.ads.loadingDone()));
  }

  const api = {
    blast, onWallHit, onPadLand, continueRun,
    retry() { return leave(false); },
    home() { return leave(true); },
    skinChanged() { G.skin = KABLAST.skins.liveColors(KABLAST.skins.current(), G.tReal); },
    grantShards(n) { const S = KABLAST.save.data; S.shards += n; KABLAST.save.write(); KABLAST.ui.setShards(S.shards); },   // the daily free-shard video
    get state() { return G.state; }, G,
  };
  return { boot, api, G };
})();
