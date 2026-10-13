/* KABLAST — the orb (player). Ballistic motion, wall bounces, charge state, trail. */
KABLAST.Orb = class {
  constructor(game) { this.g = game; this.reset(); }
  reset() {
    const CFG = KABLAST.CFG;
    this.x = CFG.W / 2; this.y = 0; this.vx = 0; this.vy = 0;
    this.alive = true; this.onPad = true;
    this.charging = false; this.chargeT = 0; this.ringR = 0; this.unstable = false; this.cooldown = 0;
    this.trail = []; this.blasts = 0; this.invuln = 0; this.spin = 0; this.airT = 0; this.bob = 0;
    this.shield = !!(CFG.shield && CFG.shield.enabled);
  }
  startCharge() {
    if (!this.alive || this.charging || this.cooldown > 0) return false;
    const CFG = KABLAST.CFG;
    this.charging = true; this.chargeT = 0; this.ringR = CFG.ring.r0 * (this.ringMul || 1); this.unstable = false;
    KABLAST.fx.time.target = CFG.slowmo;
    KABLAST.audio.chargeStart(); KABLAST.haptics.impact('light');
    return true;
  }
  updateCharge(dtReal) {
    const CFG = KABLAST.CFG, U = KABLAST.U;
    this.chargeT += dtReal;
    const k = U.clamp(this.chargeT / CFG.ring.tMax, 0, 1);
    this.ringR = U.lerp(CFG.ring.r0, CFG.ring.rMax, U.easeOutCubic(k)) * (this.ringMul || 1);   // ringMul: the Big Ring boost
    this.unstable = this.chargeT > CFG.ring.tMax;
    KABLAST.audio.chargeUpdate(k, this.unstable);
    if (this.chargeT >= CFG.ring.tAuto) this.release();
  }
  release() {
    if (!this.charging) return;
    this.charging = false;
    KABLAST.fx.time.target = 1;
    KABLAST.audio.chargeStop();
    this.cooldown = KABLAST.CFG.blast.cooldown;
    this.g.blast(this, this.ringR);
  }
  cancelCharge() { if (!this.charging) return; this.charging = false; KABLAST.fx.time.target = 1; KABLAST.audio.chargeStop(); }

  // gravMul / termMul come from the level (low gravity); ax / ay are the level's fields (wind, vortices)
  update(dt, gravMul = 1, termMul = 1, ax = 0, ay = 0) {
    const CFG = KABLAST.CFG;
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    this.spin += dt * (2 + Math.abs(this.vx) * 0.01);
    if (this.onPad) { this.bob += dt; this.y = Math.sin(this.bob * 2.2) * 3; return; }
    this.airT += dt;
    this.vy = Math.min(this.vy + (CFG.gravity * gravMul + ay) * dt, CFG.termVel * termMul);
    this.vx = this.vx * Math.pow(CFG.hDrag, dt) + ax * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    // the launch pad stays solid until the Dark swallows it: a fumbled first blast lands you back on it
    if (this.vy > 0 && this.y >= 0 && this.y - this.vy * dt < 0 && Math.abs(this.x - CFG.W / 2) < 70 && this.g.G.dark.y > 40) {
      this.y = 0; this.vy = 0; this.vx *= 0.3; this.onPad = true; this.bob = 0; this.trail.length = 0; this.g.onPadLand(this); return;
    }
    const r = CFG.orb.r, w = this.g.G.world.wallAt(this.y);
    const minX = w.l + r, maxX = CFG.W - w.r - r;
    if (this.x < minX) { this.x = minX; if (this.vx < 0) { this.vx = -this.vx * CFG.wallBounce; this.g.onWallHit(this, -1); } }
    else if (this.x > maxX) { this.x = maxX; if (this.vx > 0) { this.vx = -this.vx * CFG.wallBounce; this.g.onWallHit(this, 1); } }
  }
  recordTrail() {
    const t = this.trail;
    t.push(this.x, this.y);
    const max = KABLAST.CFG.orb.trail * 2;
    if (t.length > max) t.splice(0, t.length - max);
  }
};
