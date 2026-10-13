/* KABLAST — persistence: one namespaced localStorage key. (In a private portal iframe where localStorage throws, the
   web platform adapter swaps in an in-memory store, so the game still runs; progress then lasts the session.) */
KABLAST.save = (() => {
  const KEY = 'kablast.save.v1';
  const defaults = () => ({
    best: 0, shards: 0, skin: 'nova', owned: ['nova'], crystal: 'c.hex', world: 'w.well', trail: 't.comet',
    runs: 0, totalCrystals: 0, bestChain: 0, bestLevel: 0, novaTotal: 0,
    missions: { date: '', list: [], progress: [0, 0, 0], claimed: [false, false, false] },
    streak: { last: '', count: 0 },
    settings: { sound: true, haptics: true, lang: '' },   // lang '' = follow the phone
    tutorialDone: false, continuesUsed: 0, adsWatched: 0,
    // free-shard videos: how many claimed today, and the highest day key ever seen. Keeping the high-water
    // mark means winding the device clock back does not hand out a fresh set of three.
    adShards: { date: '', used: 0, seen: '' },
    gamesPlayed: 0,          // every finished game, a revived run counted once
    // 1.2: the daily loop (rewards.js). Every array here has a fixed length, so the sanitiser keeps its shape.
    rw: {
      seen: '', bestStreak: 0,
      login: { day: 0, last: '', total: 0 },
      daily: { date: '', pts: 0, ms: [false, false, false], c: [0, 0, 0, 0, 0, 0], done: [false, false, false, false, false, false, false, false] },
      weekly: { week: '', pts: 0, ms: [false, false, false], c: [0, 0, 0, 0, 0], done: [false, false, false, false, false] },
      ach: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      xp: 0, level: 1, roadFree: 1, roadPrem: 1, roadOwned: false,
      mine: { t: 0 },
      spin: { date: '', free: 0 },
      chests: { common: 0, rare: 0, epic: 0, opened: 0, adAt: 0 },
      boosts: { headStart: 0, doubleShards: 0, bigRing: 0 },
      armed: { headStart: false, doubleShards: false, bigRing: false },
      ads: { date: '', used: [0, 0, 0, 0, 0], login2x: '' },
      welcome: 0,              // 0 = not yet, 1 = waiting to be claimed, 2 = claimed
    },
  });
  let mem = null;

  /* ------------------------------------------------------------------ sanitising
     The save we read back is not always the save we wrote. iOS kills apps mid-write, WebKit evicts
     storage under pressure, an older build had a different shape, and a curious player can simply edit
     the file. So every value is checked against the default it is replacing — right type, finite, in
     range — and anything that does not fit is quietly replaced by that default instead of being trusted.

     This is not paranoia for its own sake: before it existed, a save holding `settings: {}` turned the
     sound off for good, `shards: []` turned the shard count into the string "11123111111", and
     `missions: null` stopped the game booting at all. None of those are reachable now, and the player
     keeps whatever parts of their progress were still readable. Nothing in here ever throws. */
  const NUM_MAX = 1e12;                       // far beyond any real total, and still exact in a double
  const STR_MAX = 64;                         // ids and day keys are short; longer is junk
  const OWNED_MAX = 500;
  const BANNED = { __proto__: 1, constructor: 1, prototype: 1 };

  const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const asNum = (v, lo, hi) => {
    const n = typeof v === 'number' ? v : NaN;                 // a numeric STRING is not a number here:
    if (!Number.isFinite(n)) return null;                      // that is what produced "11123111111"
    return Math.min(hi, Math.max(lo, Math.floor(n)));
  };
  const asStr = v => (typeof v === 'string' && v.length <= STR_MAX) ? v : null;
  const asBool = v => typeof v === 'boolean' ? v : null;

  // bounds for the numbers that have them; everything else gets [0, NUM_MAX]
  const RANGE = {
    bestChain: [0, 1e6], bestLevel: [0, 1e6], runsSinceAd: [0, 1e5],
    used: [0, 1e4], count: [0, 1e5], ms: [0, 1e10],
    // 1.2: wall-clock timestamps (ms since 1970) are bigger than NUM_MAX; ranks and calendar days have small ranges
    t: [0, 1e14], at: [0, 1e14], adAt: [0, 1e14], level: [1, 999], day: [0, 6], welcome: [0, 2], roadFree: [1, 999], roadPrem: [1, 999],
  };

  function cleanValue(key, def, got) {
    if (typeof def === 'number') {
      const r = RANGE[key] || [0, NUM_MAX], n = asNum(got, r[0], r[1]);
      return n === null ? def : n;
    }
    if (typeof def === 'boolean') { const b = asBool(got); return b === null ? def : b; }
    if (typeof def === 'string') { const s = asStr(got); return s === null ? def : s; }
    if (Array.isArray(def)) return cleanArray(key, def, got);
    if (isObj(def)) {
      if (!isObj(got)) return def;                             // null / number / array where an object belongs
      for (const k of Object.keys(def)) {
        if (BANNED[k] || !Object.prototype.hasOwnProperty.call(got, k)) continue;
        def[k] = cleanValue(k, def[k], got[k]);
      }
      return def;
    }
    return def;
  }

  function cleanArray(key, def, got) {
    if (!Array.isArray(got)) return def;
    // The named lists come first: `owned` also holds strings, so a length check alone would send it
    // down the fixed-size branch below and throw away everything the player has unlocked.
    if (key === 'owned') {                                     // unlocked cosmetics: unique short ids
      const seen = Object.create(null), out = [];
      for (const v of got) {
        const s = asStr(v);
        if (!s || seen[s] || BANNED[s]) continue;
        seen[s] = 1; out.push(s);
        if (out.length >= OWNED_MAX) break;
      }
      for (const s of def) if (!seen[s]) out.push(s);          // the free starter items can never be lost
      return out;
    }
    if (key === 'list') {                                      // today's three missions
      const ok = got.length === 3 && got.every(m =>
        isObj(m) && asStr(m.id) !== null && asNum(m.target, 1, NUM_MAX) !== null && asNum(m.reward, 0, NUM_MAX) !== null);
      return ok ? got.slice(0, 3) : [];                        // otherwise let missions.js build a fresh set
    }
    // fixed-length arrays of one primitive type: missions.progress and missions.claimed
    if (def.length && (typeof def[0] === 'number' || typeof def[0] === 'boolean')) {
      for (let i = 0; i < def.length; i++) {
        const v = typeof def[i] === 'boolean' ? asBool(got[i]) : asNum(got[i], 0, NUM_MAX);
        if (v !== null) def[i] = v;
      }
      return def;
    }
    return def;
  }

  // Returns a complete, well-shaped save built from `raw` wherever `raw` is usable and from the
  // defaults everywhere else.
  function clean(raw) {
    const out = defaults();
    if (!isObj(raw)) return out;
    for (const key of Object.keys(out)) {
      if (BANNED[key] || !Object.prototype.hasOwnProperty.call(raw, key)) continue;
      out[key] = cleanValue(key, out[key], raw[key]);
    }
    // cross-field repair: a mission list and its counters must agree, or claiming indexes into nothing
    const m = out.missions;
    if (m.list.length !== 3) { m.list = []; m.date = ''; m.progress = [0, 0, 0]; m.claimed = [false, false, false]; }
    return out;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      mem = clean(raw ? JSON.parse(raw) : null);
    } catch (e) { mem = defaults(); }
    return mem;
  }
  function write() {
    if (!mem) return;
    try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) {}
  }
  function reset() { mem = defaults(); write(); }

  return { get data() { return mem || load(); }, load, write, reset, clean };
})();
