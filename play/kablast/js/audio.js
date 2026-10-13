/* KABLAST — audio. Everything is synthesised with WebAudio: zero asset files, instant load.
   iOS needs a user gesture before sound can play: game.js calls unlock() on the first pointerdown.

   The mix: every voice goes to a dry bus and, in its own measure, to a reverb send (a generated hall, ~2.6 s),
   and both meet in a gentle compressor before the speaker — so chimes bloom, big blasts never clip, and quiet
   moments stay quiet. Under it all sits a slow, warm pad in A (A · E · B · C#) that breathes with a filter LFO. */
KABLAST.audio = (() => {
  let ctx = null, master = null, comp = null, dry = null, verb = null, noiseBuf = null, unlocked = false;
  let charge = null, ambient = null;
  // Everything is in A major, the key of the pad underneath (A · E · B · C#), so no sound in the game ever rubs against it.
  // Ascending A-major pentatonic (A B C# E F#): each chain wave plays the next note (the "Peggle" trick).
  const PENTA = [440.0, 493.88, 554.37, 659.25, 739.99, 880.0, 987.77, 1108.73, 1318.51, 1479.98, 1760.0, 1975.53, 2217.46, 2637.02, 2959.96];

  function enabled() { return KABLAST.save.data.settings.sound; }
  // a hall: two channels of decaying noise, darker as it fades (high frequencies die first, as in a real room).
  // Built with running products only (no pow/exp per sample) and off the tap that unlocks audio, so it never hitches.
  function hall(sec) {
    const rate = ctx.sampleRate, len = Math.floor(rate * sec), buf = ctx.createBuffer(2, len, rate), fade = Math.exp(-6.9 / len), att = rate * 0.012;
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch); let lp = 0, env = 1;
      for (let i = 0; i < len; i++) {
        const k = 0.08 + 0.9 * (i / len);                     // one-pole lowpass that closes as the tail decays
        lp += (Math.random() * 2 - 1 - lp) * (1 - k);
        d[i] = lp * env * (i < att ? i / att : 1); env *= fade;
      }
    }
    return buf;
  }
  function buildVerb() {
    if (verb || !ctx) return;
    try {
      const cv = ctx.createConvolver(); cv.buffer = hall(2.6);
      const wet = ctx.createGain(); wet.gain.value = 0.55; cv.connect(wet); wet.connect(comp);
      const v = ctx.createGain(); v.gain.value = 1; v.connect(cv); verb = v;
    } catch (e) { verb = null; }
  }
  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC({ latencyHint: 'interactive' });
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.22;
    master = ctx.createGain(); master.gain.value = enabled() ? 0.9 : 0;
    comp.connect(master); master.connect(ctx.destination);
    dry = ctx.createGain(); dry.gain.value = 1; dry.connect(comp);
    setTimeout(buildVerb, 120);                           // the room arrives a moment after the first sound; nobody hears the gap
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function unlock() {
    init(); if (!ctx) return;
    if (ctx.state === 'suspended' || ctx.state === 'interrupted') ctx.resume().catch(() => {});   // iOS reports 'interrupted' after a full-screen ad or a call
    if (!unlocked) {
      const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0);
      unlocked = true; startAmbient();
    }
  }
  const ready = () => !!ctx && unlocked && enabled();
  // route a voice: always to the dry bus, and `wet` of it into the hall
  function out(node, wet) {
    node.connect(dry);
    if (wet && verb) { const s = ctx.createGain(); s.gain.value = wet; node.connect(s); s.connect(verb); }
  }

  function tone({ type = 'sine', f = 440, f2, t = 0.2, g = 0.3, a = 0.004, detune = 0, delay = 0, wet = 0.15 }) {
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator(), gn = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0); o.detune.value = detune;
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + t);
    gn.gain.setValueAtTime(0.0001, t0); gn.gain.exponentialRampToValueAtTime(g, t0 + a); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
    o.connect(gn); out(gn, wet); o.start(t0); o.stop(t0 + t + 0.02);
  }
  function noise({ t = 0.3, g = 0.3, f = 1000, f2, q = 0.8, type = 'bandpass', a = 0.003, delay = 0, wet = 0.12 }) {
    const t0 = ctx.currentTime + delay;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t0); fl.Q.value = q;
    if (f2) fl.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + t);
    const gn = ctx.createGain(); gn.gain.setValueAtTime(0.0001, t0); gn.gain.exponentialRampToValueAtTime(g, t0 + a); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
    s.connect(fl); fl.connect(gn); out(gn, wet); s.start(t0); s.stop(t0 + t + 0.02);
  }
  // a struck crystal: a clean fundamental, an inharmonic partial (what makes a bell a bell), a soft attack, a long bloom
  function chime(f, g, delay = 0, wet = 0.45) {
    tone({ type: 'sine', f, t: 0.9, g, a: 0.006, delay, wet });
    tone({ type: 'sine', f: f * 2.76, t: 0.32, g: g * 0.22, a: 0.004, delay, wet });
    tone({ type: 'triangle', f: f * 0.5, t: 0.5, g: g * 0.18, a: 0.01, delay, wet: wet * 0.5 });
  }

  // ---- charge ----
  // Holding is the moment the player spends the most time listening to, so it must feel good for the hundredth time.
  // No sliding oscillator (a rising whine is what makes people mute a game): a still A-major chord that swells and
  // opens like a door as the ring grows, air rising through it, and a small glass tick for every crystal the ring
  // gathers, pitched up the scale as the count climbs. Held too long, the chord trembles; a killer in the ring adds
  // a low B-flat that rubs against the A. Nothing in it glides in pitch, and all of it sits in the pad's key.
  const CHORD = [[110, 'triangle', 0.5, 0], [220, 'sine', 0.36, 0], [329.63, 'sine', 0.26, 0], [440, 'sine', 0.2, 1], [554.37, 'sine', 0.14, 1], [659.25, 'sine', 0.1, 1]];
  function chargeStart() {
    if (!ready()) return; chargeStop(true);
    const t0 = ctx.currentTime;
    const bus = ctx.createGain(); bus.gain.setValueAtTime(0.0001, t0); bus.gain.exponentialRampToValueAtTime(0.065, t0 + 0.14);
    const trem = ctx.createGain(); trem.gain.value = 1;
    const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 520; fl.Q.value = 0.8;
    fl.connect(trem); trem.connect(bus); out(bus, 0.5);
    const oscs = [], upper = [];
    for (const [f, type, g, up] of CHORD) {
      for (const d of type === 'triangle' ? [0] : [-6, 6]) {                  // each voice doubled a few cents apart: it shimmers
        const o = ctx.createOscillator(), og = ctx.createGain();
        o.type = type; o.frequency.value = f; o.detune.value = d;
        const base = g / (type === 'triangle' ? 1 : 2); og.gain.value = up ? 0.0001 : base;
        o.connect(og); og.connect(fl); o.start(t0); oscs.push(o); if (up) upper.push([og, base]);
      }
    }
    const ns = ctx.createBufferSource(); ns.buffer = noiseBuf; ns.loop = true;   // air rising through it
    const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 1500; nf.Q.value = 1.5;
    const ng = ctx.createGain(); ng.gain.value = 0.0001; ns.connect(nf); nf.connect(ng); out(ng, 0.7); ns.start(t0);
    const lfo = ctx.createOscillator(), lg = ctx.createGain();                  // the tremble, silent until over-held
    lfo.frequency.value = 6.5; lg.gain.value = 0; lfo.connect(lg); lg.connect(trem.gain); lfo.start(t0);
    const dz = ctx.createOscillator(), dg = ctx.createGain();                   // the warning undertone
    dz.type = 'sine'; dz.frequency.value = 116.54; dg.gain.value = 0.0001; dz.connect(dg); out(dg, 0.2); dz.start(t0);
    charge = { bus, fl, oscs, upper, ns, nf, ng, lfo, lg, dz, dg, danger: false, lastTick: -1 };
  }
  function chargeUpdate(level, unstable) {
    if (!charge) return; const c = charge, t = ctx.currentTime, e = level * level;
    c.fl.frequency.setTargetAtTime(520 + 2600 * e, t, 0.08);
    c.bus.gain.setTargetAtTime(0.065 + 0.045 * level, t, 0.1);
    for (const [og, base] of c.upper) og.gain.setTargetAtTime(Math.max(0.0001, base * level), t, 0.1);
    c.nf.frequency.setTargetAtTime(1500 + 4200 * level, t, 0.1);
    c.ng.gain.setTargetAtTime(0.002 + 0.01 * level, t, 0.1);
    c.lg.gain.setTargetAtTime(unstable ? 0.42 : 0, t, 0.15);
    c.dg.gain.setTargetAtTime(c.danger ? 0.1 : 0.0001, t, 0.06);
  }
  // a crystal just came inside the ring: a small glass tick, higher the more the ring holds
  function chargeGather(n) {
    if (!ready() || !charge) return;
    const t = ctx.currentTime; if (t - charge.lastTick < 0.05) return; charge.lastTick = t;
    const f = PENTA[Math.min(n - 1, 12)];
    tone({ type: 'sine', f, t: 0.24, g: 0.045, a: 0.003, wet: 0.55 });
    tone({ type: 'sine', f: f * 2.76, t: 0.07, g: 0.008, a: 0.002, wet: 0.4 });
  }
  // a killer came inside the ring: one soft low knock, then the undertone holds while it stays in
  function chargeDanger(on, fresh) {
    if (!charge) return; charge.danger = on;
    if (on && fresh && ready()) { tone({ type: 'triangle', f: 233.08, f2: 220, t: 0.3, g: 0.07, wet: 0.3 }); tone({ type: 'sine', f: 116.54, t: 0.35, g: 0.09, wet: 0.2 }); }
  }
  function chargeStop(immediate) {
    if (!charge) return; const c = charge; charge = null; const t = ctx.currentTime, end = t + (immediate ? 0.03 : 0.12);
    for (const g of [c.bus.gain, c.ng.gain, c.dg.gain]) { g.cancelScheduledValues(t); g.setValueAtTime(Math.max(0.0001, g.value), t); g.exponentialRampToValueAtTime(0.0001, end); }
    for (const o of c.oscs) o.stop(end + 0.03);
    c.ns.stop(end + 0.03); c.lfo.stop(end + 0.03); c.dz.stop(end + 0.03);
  }

  // ---- one-shots ----
  // the release: a round kick (no click), the air it pushes, a crisp edge, and the chord the charge was holding,
  // struck once and left to ring in the hall. Bigger chains add weight underneath, never more noise on top.
  function blast(n) {
    if (!ready()) return;
    const k = Math.min(1, 0.5 + n * 0.05);
    tone({ type: 'sine', f: 150, f2: 44, t: 0.34, g: 0.5 * k, a: 0.002, wet: 0.08 });
    noise({ t: 0.34, g: 0.18 * k, f: 3200, f2: 240, type: 'lowpass', q: 0.7, wet: 0.25 });
    noise({ t: 0.08, g: 0.035 * k, f: 7000, type: 'highpass', q: 0.5, wet: 0.3 });
    [880, 1108.73, 1318.51].forEach((f, i) => chime(f, 0.05 * k, i * 0.014, 0.6));
    if (n >= 6) tone({ type: 'triangle', f: 55, f2: 36, t: 0.7, g: 0.26, delay: 0.02, wet: 0.2 });
    if (n >= 12) { noise({ t: 0.9, g: 0.12, f: 480, f2: 90, type: 'lowpass', delay: 0.04, wet: 0.4 }); chime(1760, 0.04, 0.05, 0.7); }
  }
  function ping(i) {
    if (!ready()) return;
    const f = PENTA[Math.min(i, PENTA.length - 1)];
    chime(f, 0.16);
    if (i > 0 && i % 4 === 0) tone({ type: 'sine', f: f / 2, t: 0.6, g: 0.1, wet: 0.5 });
  }
  function fizzle() { if (!ready()) return; noise({ t: 0.18, g: 0.06, f: 900, f2: 300, type: 'lowpass' }); tone({ type: 'sine', f: 329.63, f2: 220, t: 0.2, g: 0.06, wet: 0.3 }); }
  function closeCall() { if (!ready()) return; chime(1318.51, 0.07, 0, 0.4); chime(1975.53, 0.05, 0.06, 0.4); }
  function nova() {
    if (!ready()) return;
    tone({ type: 'sine', f: 90, f2: 30, t: 1.0, g: 0.45, wet: 0.2 });
    noise({ t: 1.2, g: 0.26, f: 3400, f2: 200, q: 0.5, wet: 0.35 });
    tone({ type: 'triangle', f: 220, f2: 880, t: 0.8, g: 0.1, wet: 0.4 });
    noise({ t: 0.9, g: 0.14, f: 500, f2: 4200, q: 0.9, a: 0.3, wet: 0.3 });   // the afterburn: a rising rush of air
    for (let i = 0; i < 6; i++) chime(PENTA[i * 2], 0.1, 0.08 * i, 0.55);
  }
  function death() {
    if (!ready()) return; chargeStop(true);
    tone({ type: 'triangle', f: 330, f2: 55, t: 1.1, g: 0.24, wet: 0.35 });
    tone({ type: 'sine', f: 150, f2: 30, t: 1.1, g: 0.34, wet: 0.2 });
    noise({ t: 0.9, g: 0.2, f: 1000, f2: 90, q: 0.5, wet: 0.3 });
  }
  // the shield: a glass crack, a bright shatter that rings out, then a low "you're on your last life" thud
  function shieldBreak() {
    if (!ready()) return; chargeStop(true);
    noise({ t: 0.05, g: 0.28, f: 6000, f2: 3000, q: 1.2 });
    for (let i = 0; i < 7; i++) tone({ type: 'sine', f: 2200 + i * 430, f2: 900 + i * 120, t: 0.3 + i * 0.03, g: 0.07, delay: 0.03 + i * 0.022, wet: 0.5 });
    noise({ t: 0.6, g: 0.2, f: 5000, f2: 400, q: 0.6, delay: 0.05, wet: 0.35 });
    tone({ type: 'triangle', f: 210, f2: 42, t: 0.7, g: 0.26, delay: 0.08, wet: 0.2 });
    tone({ type: 'sine', f: 90, f2: 28, t: 0.9, g: 0.36, delay: 0.1 });
  }
  function ui() { if (!ready()) return; tone({ type: 'sine', f: 987.77, f2: 1108.73, t: 0.09, g: 0.07, wet: 0.25 }); tone({ type: 'sine', f: 2217.46, t: 0.05, g: 0.015, wet: 0.2 }); }
  function buy() { if (!ready()) return; for (let i = 0; i < 5; i++) chime(PENTA[i + 2], 0.11, i * 0.07, 0.5); }
  function revive() { if (!ready()) return; for (let i = 0; i < 8; i++) chime(PENTA[i], 0.09, i * 0.06, 0.55); noise({ t: 0.9, g: 0.14, f: 300, f2: 3000, wet: 0.5 }); }
  function bounce(v) { if (!ready()) return; const k = Math.min(1, v / 900); tone({ type: 'sine', f: 240, f2: 130, t: 0.1, g: 0.07 * k, wet: 0.1 }); }
  function tideWarn() { if (!ready()) return; tone({ type: 'triangle', f: 55, f2: 42, t: 1.0, g: 0.3, wet: 0.3 }); tone({ type: 'sine', f: 110, f2: 72, t: 1.0, g: 0.26, wet: 0.3 }); noise({ t: 0.9, g: 0.1, f: 200, f2: 60, type: 'lowpass', wet: 0.3 }); }
  function gate() { if (!ready()) return; for (let i = 0; i < 6; i++) chime(PENTA[i * 2 + 1], 0.11, i * 0.08, 0.55); tone({ type: 'sine', f: 70, f2: 50, t: 0.6, g: 0.24, wet: 0.3 }); }

  // ---- the pad: very quiet, very slow — it gives the well its air ----
  function startAmbient() {
    if (ambient || !ctx) return;
    const g = ctx.createGain(); g.gain.value = 0.0;
    const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 520; fl.Q.value = 0.7; fl.connect(g);
    out(g, 0.6);
    // A2 · E3 · B3 · C#4, each doubled a few cents apart so the chord shimmers instead of standing still
    const notes = [110, 164.81, 246.94, 277.18], oscs = [];
    notes.forEach((f, i) => {
      for (const d of [-7, 7]) {
        const o = ctx.createOscillator(), og = ctx.createGain();
        o.type = i === 0 ? 'sine' : 'triangle'; o.frequency.value = f; o.detune.value = d;
        og.gain.value = i === 0 ? 0.5 : 0.22; o.connect(og); og.connect(fl); o.start(); oscs.push(o);
      }
    });
    // the filter breathes over ~18 s; the level breathes over ~13 s
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.055; lg.gain.value = 260; lfo.connect(lg); lg.connect(fl.frequency); lfo.start();
    const lfo2 = ctx.createOscillator(), lg2 = ctx.createGain(); lfo2.frequency.value = 0.077; lg2.gain.value = 0.012; lfo2.connect(lg2); lg2.connect(g.gain); lfo2.start();
    g.gain.setTargetAtTime(0.034, ctx.currentTime, 3);
    ambient = { g, oscs, lfo, lfo2 };
  }
  function setEnabled(b) { if (!ctx) return; master.gain.setTargetAtTime(b ? 0.9 : 0, ctx.currentTime, 0.05); if (!b) chargeStop(true); }
  function suspend() { if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); }
  function resume() { if (ctx && unlocked && (ctx.state === 'suspended' || ctx.state === 'interrupted')) ctx.resume().catch(() => {}); }

  return { unlock, chargeStart, chargeUpdate, chargeGather, chargeDanger, chargeStop, blast, ping, fizzle, closeCall, nova, death, shieldBreak, ui, buy, revive, bounce, tideWarn, gate, setEnabled, suspend, resume };
})();
