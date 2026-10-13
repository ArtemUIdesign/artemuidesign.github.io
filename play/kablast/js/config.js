/* KABLAST — config & tunables.
   Everything about game feel lives here. Units are "world units": the world is CFG.W wide,
   height follows the screen aspect. Up is negative Y (screen convention). */
window.KABLAST = window.KABLAST || {};
KABLAST.VERSION = '1.0';

KABLAST.CFG = {
  W: 420,                       // logical world width (portrait)
  gravity: 1000,                // lower gravity = slower falls, higher arcs, more time to think
  termVel: 900,                 // max fall speed
  wallBounce: 0.55,
  hDrag: 0.45,                  // horizontal velocity kept after 1s of flight
  orb: { r: 11, trail: 26 },

  // Charge ring: grows from r0 to rMax over tMax REAL seconds; auto-fires at tAuto.
  ring: { r0: 40, rMax: 150, tMax: 0.9, tAuto: 1.9 },
  slowmo: 0.14,                 // time scale while charging (the Dark keeps rising in real time!)

  // Launch impulse: U(n) = base * n^pow (capped). n = crystals shattered in the chain.
  blast: { base: 800, pow: 0.38, cap: 2900, hx: 380, hxWave: 60, keepUp: 0.35,
           fizzle: 240, cooldown: 0.26, fizzleCooldown: 0.5, waveDelay: 0.07 },
  lastSecond: { dist: 90, reward: 5 },   // blasting just above the Dark's surface

  // ---------- LEVELS ----------
  // The well is a stack of 1 000 m levels. Each level has its own look and its own mechanic, and its own
  // pacing wave: a light RELIEF start, a NORMAL middle, and a GATE at the end (the challenging phase).
  // Every third level opens with a SUPERNOVA RUSH bonus stretch. After the first 10, levels cycle with two mechanics at once.
  levels: {
    lengthM: 1000, noGateLevels: 1,             // level 1 is the tutorial: no gate
    reliefFrac: 0.25, gateFrac: 0.75,           // level progress fractions where relief ends / the gate begins
    reliefMul: 0.5,                              // difficulty multiplier during relief
    gateBoost0: 0.084, gateBoost1: 0.294,        // difficulty added at the gate (scales with the long ramp)
    gateDarkMul: 1.15, reliefDarkMul: 0.6, bonusDarkMul: 0.4,
    bonusEvery: 3, bonusLenM: 300,               // Supernova Rush at the start of every 3rd level
    continueReliefM: 350,                        // metres of relief after a continue / revive
    order: ['well', 'drift', 'rainbow', 'lowg', 'wind', 'pulse', 'vortex', 'eclipse', 'tide', 'storm'],
    defs: {
      well:    { name: 'CRYSTAL WELL',  hint: 'Hold to charge, let go to blast',          mech: [],                  bg: ['#0a0628', '#120a3a', '#1b0c40'] },
      drift:   { name: 'VIOLET RIFT',   hint: 'The crystals drift. Time your blast',        mech: ['drift'],           bg: ['#16062f', '#2c0b52', '#3b104f'] },
      rainbow: { name: 'PRISM GARDEN',  hint: 'Prisms chain with every colour',              mech: ['rainbow'],         bg: ['#1a0a2e', '#2a1550', '#3a1a5a'] },
      lowg:    { name: 'THE HOLLOW',    hint: 'Low gravity. You float higher',               mech: ['lowg'],            bg: ['#03111e', '#071c2e', '#0a2538'] },
      wind:    { name: 'WINDSHEAR',     hint: 'The wind pushes you sideways',                mech: ['wind'],            bg: ['#061a1a', '#0a2a2a', '#0f3535'] },
      pulse:   { name: 'PULSE CAVERNS', hint: 'Crystals only break while they glow',         mech: ['pulse'],           bg: ['#12061a', '#220a30', '#2e0e40'] },
      vortex:  { name: 'EVENT HORIZON', hint: 'Gravity wells bend your flight',              mech: ['vortex'],          bg: ['#14030d', '#270618', '#3d0a1f'] },
      eclipse: { name: 'ECLIPSE',       hint: 'Only your own light shows the way',           mech: ['eclipse'],         bg: ['#020208', '#06060f', '#0a0a16'] },
      tide:    { name: 'TIDAL DEEP',    hint: 'The Dark surges in waves. Watch for the flash', mech: ['tide'],    bg: ['#0a0420', '#180840', '#240c58'] },
      storm:   { name: 'SINGULARITY',   hint: 'Drifting crystals and gravity wells at once',mech: ['drift', 'vortex'], bg: ['#000000', '#08080f', '#12122a'] },
    },
    bonus: { name: 'SUPERNOVA RUSH', hint: 'No dark shards. Everything chains', bg: ['#2a1a05', '#3d2608', '#4a2f0a'] },
  },
  mech: {
    lowg:   { gravity: 0.6, termVel: 0.85, darkMul: 1.1 },
    wind:   { strength0: 90, strength1: 170, bandH0: 200, bandH1: 320, perChunkP: 0.75 },
    vortex: { radius: 220, pull0: 35000, pull1: 70000, swirl: 0.3, perChunkP: 0.6, rungClear: 220 },
    pulse:  { period: 2.8, solidFrac: 0.62, clusterP: 0.6 },
    eclipse:{ lightR: 330, darkR: 520, darkMul: 0.85 },
    tide:   { period: 7.0, warn: 1.2, surge: 1.3, surgeMul: 2.4, restMul: 0.7 },
    rainbow:{ pPrism: 0.28, sizeBonus: 2 },
    drift:  { ampMul: 1.35 },
  },

  crystal: { r: 14, spacing: 32, chainR: 40 },
  chunkH: 700,
  unitsPerMeter: 6,              // world units per scored metre — sets how long the 0→10 000 m journey takes

  // The Dark: rising void. Speed follows the difficulty curve; rubber-bands if you get too far ahead.
  dark: { startGap: 400, baseSpeed: 23, maxSpeed: 242, catchupScreens0: 3.05, catchupScreens1: 1.8, catchupK: 0.7,
          beyond: { atM: 20000, speed: 284 } },  // past fullAt the Dark keeps creeping up toward `speed` (reached at atM) — still slower than perfect ladder play

  // Nova core: ignites everything in `radius` and vaporises dark shards, then ROCKETS the orb: the launch is at least
  // `launchMin` (×launchMul on a big chain, up to launchCap) and for `boostT` seconds a `lift` pushes against gravity.
  nova: { radius: 210, launchMul: 1.25, launchMin: 2500, launchCap: 3200, boostT: 0.8, lift: 700 },
  closeCall: { dist: 34, reward: 2 },
  // ONE LIFE, ONE SHIELD. Every run starts with exactly one shield (the bubble around the orb). It absorbs the first
  // death — a dark shard inside the ring OR the Dark catching the orb — and shatters. It is never restored during the run;
  // a CONTINUE / REVIVE (a new life) comes with a fresh one when onContinue is true.
  shield: { enabled: true, launch: 3.2, darkPush: 260, invuln: 1.6, onContinue: true },
  // CONTINUE after death. ONE revive per run, and the only way to take it is to watch a rewarded video —
  // there is no shard price for it. Shards buy cosmetics, nothing else. (Web: offered only when the portal can play one.)
  continues: { max: 1 },
  // Rewarded video in the Store: free shards, capped per day so it stays a treat rather than a job.
  adShards: { perDay: 3, reward: 120 },
  // Ad breaks on the web are paced by the portals (CrazyGames / Poki): the game asks at every natural break
  // (see ads.js). There is no ad-free welcome and no pacing counter of our own.
  // ---------- 1.2: THE DAILY LOOP AND THE REWARD ECONOMY (rewards.js) ----------
  // Lots of small, steady rewards on top of the run: a login calendar, daily and weekly tasks with milestone chests,
  // one-off goals, a player Rank with its Star Road, the Shard Mine, a daily Lucky Spin, chests, boosts. Sized against
  // the catalogue (items cost 120-1,400 shards; a mid run pays ~100): a daily player collects roughly 400-600 shards a
  // day from all of it, more with the optional videos. Helpful, never game-breaking: no boost is a life or a shield,
  // and the revive stays one per run, rewarded video only. See docs/REWARDS.md for the research and the numbers.
  rewards: {
    // seven days, one claim per calendar day; a missed day pauses the calendar, it never resets
    login: [ { shards: 60 }, { shards: 80 }, { boost: 'headStart' }, { shards: 120 }, { chest: 'common' }, { shards: 160 }, { chest: 'rare', shards: 200 } ],
    daily: {
      counters: ['login', 'runs', 'missions', 'chest', 'spin', 'mine'],
      tasks: [
        { id: 'login', counter: 'login', target: 1, pts: 10 },
        { id: 'runs', counter: 'runs', target: 3, pts: 15 },
        { id: 'mission1', counter: 'missions', target: 1, pts: 15 },
        { id: 'mission2', counter: 'missions', target: 2, pts: 15 },
        { id: 'mission3', counter: 'missions', target: 3, pts: 15 },
        { id: 'chest', counter: 'chest', target: 1, pts: 10 },
        { id: 'spin', counter: 'spin', target: 1, pts: 10 },
        { id: 'mine', counter: 'mine', target: 1, pts: 10 },
      ],
      milestones: [ { at: 30, reward: { shards: 40 } }, { at: 60, reward: { chest: 'common' } }, { at: 100, reward: { shards: 100, boost: 'random' } } ],
    },
    weekly: {
      tasks: [
        { id: 'runs', target: 25, pts: 20 }, { id: 'missions', target: 12, pts: 20 }, { id: 'height', target: 5000, pts: 20, mode: 'max' },
        { id: 'chests', target: 6, pts: 20 }, { id: 'logins', target: 5, pts: 20 },
      ],
      milestones: [ { at: 40, reward: { shards: 150 } }, { at: 80, reward: { chest: 'rare' } }, { at: 100, reward: { chest: 'epic' } } ],
    },
    // one-off goals: every tier pays once
    goals: [
      { id: 'height',     tiers: [1000, 2500, 5000, 7500, 10000, 15000, 20000], rewards: [50, 80, 120, 160, 250, 400, 600] },
      { id: 'chain',      tiers: [10, 20, 30, 50, 80],             rewards: [50, 80, 120, 200, 300] },
      { id: 'crystals',   tiers: [500, 2500, 10000, 25000, 60000], rewards: [50, 100, 150, 250, 400] },
      { id: 'runs',       tiers: [10, 50, 150, 400, 1000],         rewards: [40, 80, 150, 250, 400] },
      { id: 'novas',      tiers: [5, 25, 100, 250],                rewards: [60, 120, 200, 300] },
      { id: 'level',      tiers: [3, 6, 10, 15, 20],               rewards: [50, 100, 150, 250, 400] },
      { id: 'collection', tiers: [5, 12, 25, 40, 65],              rewards: [60, 120, 200, 300, 500] },
      { id: 'streak',     tiers: [3, 7, 14, 30],                   rewards: [50, 100, 200, 400] },
      { id: 'chests',     tiers: [5, 25, 100],                     rewards: [50, 120, 250] },
    ],
    // the player's Rank: XP from distance and crystals; each rank needs `base + step × (rank − 1)` XP
    xp: { base: 80, step: 40, perMeters: 25, perCrystals: 2 },
    // the Shard Mine fills while you are away; a video adds `adHours` at once
    mine: { perHour: 8, capH: 12, adHours: 3 },
    // the Lucky Spin: one free spin a day (more with a video). The weights ARE the odds and are printed on the wheel.
    spin: { free: 1, wheel: [
      { w: 26, reward: { shards: 30 } }, { w: 20, reward: { shards: 60 } }, { w: 12, reward: { boost: 'random' } }, { w: 14, reward: { shards: 100 } },
      { w: 12, reward: { chest: 'common' } }, { w: 8, reward: { shards: 150 } }, { w: 4, reward: { chest: 'rare' } }, { w: 4, reward: { shards: 300 } },
    ] },
    // optional rewarded videos and their daily caps (web: drawn only while the portal can play one)
    ads: { order: ['double', 'chest', 'spin', 'mine', 'boost'],
           double: { perDay: 5, min: 10 }, chest: { perDay: 3, cooldownH: 4 }, spin: { perDay: 2 }, mine: { perDay: 2 }, boost: { perDay: 3 } },
    // the welcome gift (100 shards and a common chest), waiting in Rewards from the first visit
    welcome: { shards: 100, chest: 'common' },
  },
  // CHESTS. Shards in a fixed range, boosts, and a chance at a cosmetic the player does not own yet (never a premium
  // item, never a duplicate; if none is left the roll pays `itemRefund` shards). These odds are shown in the game,
  // before any chest is bought.
  chests: {
    common: { price: 250,  shards: [50, 100],  boosts: 0, boostChance: 0.3, itemChance: 0.08, itemMaxPrice: 300,  itemRefund: 100 },
    rare:   { price: 650,  shards: [180, 320], boosts: 1, boostChance: 0,   itemChance: 0.35, itemMaxPrice: 600,  itemRefund: 300 },
    epic:   { price: 1500, shards: [450, 750], boosts: 2, boostChance: 0,   itemChance: 1,    itemMaxPrice: 1400, itemRefund: 700 },
  },
  // BOOSTS: single-run helpers, armed on the title screen and spent when the run starts. None is a life or a shield.
  //   headStart     the first launch off the pad rockets you up about a kilometre
  //   doubleShards  every shard the run pays is doubled
  //   bigRing       the charge ring grows 15 % wider
  boosts: {
    headStart:    { price: 200, vy: 3000, lift: 1.0 },
    doubleShards: { price: 250, mult: 2 },
    bigRing:      { price: 150, mult: 1.15 },
  },

  // Every shard the run pays out is scaled by this. The individual awards below stay readable as "1 per crystal,
  // 3 per prism, the chain size again on a big chain"; this one number sets what a run is actually worth.
  // At 0.05 a mid run pays ~100 shards. That is deliberately not generous: the 65-item catalogue is meant to
  // take weeks of play. Daily missions, the daily loop and (where the portal offers them) a few rewarded videos a
  // day add on top; missions are deliberately NOT scaled.
  shards: { rate: 0.05 },

  // Difficulty curve d(m) in [0,1]: flat 0 until easyUntil metres, then (t^curve) up to fullAt metres, then stays at 1.
  // Everything below scales with d — trivial at 0, "a bit harder" around 5 000 m, brutal-but-fair from 10 000 m on.
  difficulty: { easyUntil: 1200, fullAt: 11400, curve: 1.3 },

  // The guaranteed ladder: a clean single-colour cluster is ALWAYS placed within reach of the previous one.
  // gap (units) between ladder clusters, sideways offset, size in crystals, dark-shard clearance radius.
  ladder: { gapMin: 360, gapMax: 540, jitter: 50, dxMin: 20, dxMax0: 90, dxMax1: 130, size0: 10, size1: 6, clearR: 80 },
  // Filler clusters (the risk/reward) — all lerp from d=0 → d=1
  filler: { count0: 4.2, count1: 2.4, sizeLo0: 7, sizeLo1: 5, sizeHi0: 14, sizeHi1: 9, pDom0: 0.98, pDom1: 0.6,
            darkFrom: 0.114, pDark0: 0.0315, pDark1: 0.23, driftFrom: 0.25, driftP1: 0.8, driftAmp0: 10, driftAmp1: 44, prismFrom: 0.15, pPrism: 0.035 },
  lone: { min: 3, max: 5, darkFrom: 0.076, pDark0: 0.063, pDark1: 0.315 },
  rescue: { corridor: 130, minGap: 170, aboveDark: 200, cooldown: 0.8, sizes: [5, 4, 4, 3] },   // "never hopeless" net when falling onto nothing

  colors: [
    { name: 'cyan',    hex: '#3ef2ff' },
    { name: 'magenta', hex: '#ff4fd8' },
    { name: 'lime',    hex: '#8dff5a' },
    { name: 'amber',   hex: '#ffb84a' },
  ],
  darkShard: { hex: '#22103a', crack: '#ff3a30', glow: '#ff3a30' },   // danger red: pure red, well clear of the magenta crystal
  prism:     { hex: '#ffffff' },
  novaCore:  { hex: '#ffe66d' },
  darkSea:   { top: '#3b0f6e', edge: '#9b5cff', bottom: '#05030f' },
};

// d(m): 0 for the first `easyUntil` metres, smooth ramp to 1 at `fullAt`, flat 1 beyond (soft ceiling).
KABLAST.difficulty = function (m) {
  const D = KABLAST.CFG.difficulty;
  const t = Math.min(1, Math.max(0, (m - D.easyUntil) / (D.fullAt - D.easyUntil)));
  return Math.pow(t, D.curve);
};
