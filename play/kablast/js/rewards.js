/* KABLAST — the daily loop and the reward economy (1.2).
   Everything a player collects outside a run lives here: the 7-day login calendar, daily and weekly tasks with
   their activity milestones, one-off goals (achievements), the player level and its Star Road, the Shard Mine
   (idle income), the daily Lucky Spin, chests (and what is inside them), boosts and the welcome gift.
   ui.js draws it, game.js and missions.js report events to it, ads.js plays the optional rewarded videos.
   Web build: nothing here is sold for money. Chests and boosts cost shards earned in play.

   Fairness rules that hold everywhere in this file (and are tested by tools/rewards-test.js):
     · Nothing here touches the revive: one per run, rewarded video only. No boost is a life or a shield.
     · Chests never give a duplicate. Their odds are fixed, listed in CFG.chests and shown in the game before
       any chest is bought.
     · Every day key has a high-water mark: winding the device clock back never re-opens a daily reward.
     · Nothing is lost by missing a day: the calendar waits, it does not reset. */
KABLAST.rewards = (() => {
  const U = KABLAST.U, C = () => KABLAST.CFG.rewards, CH = () => KABLAST.CFG.chests, BO = () => KABLAST.CFG.boosts;
  const D = () => { const S = KABLAST.save.data; S.rw = S.rw || {}; return S.rw; };
  const save = () => KABLAST.save.write();
  const now = () => Date.now();
  let listeners = [];
  const changed = () => { for (const f of listeners) { try { f(); } catch (e) {} } };
  function onChange(f) { listeners.push(f); }

  // ------------------------------------------------------------------ days, weeks, and the clock guard
  // `seen` is the highest day key this install has ever observed. A key below it means the clock went backwards:
  // daily things then answer as if today had already been used up, instead of handing out a fresh set.
  function today() {
    const R = D(), t = U.todayKey();
    if (!R.seen || t > R.seen) { R.seen = t; save(); }
    return t;
  }
  const rolledBack = () => U.todayKey() < (D().seen || '');
  function week() { return U.weekKey(); }
  // the optional rewarded videos are offered only while the portal can play one (ads.js / WebPlatform.rewardedEnabled)
  const videos = () => KABLAST.ads.available();

  // ------------------------------------------------------------------ granting
  // A reward is a small object: { shards, chest: 'common'|'rare'|'epic', boost: id|'random', n }. grant() applies it
  // and returns what was actually given (a random boost resolved to a real one), for the toast and the reveal.
  const BOOST_IDS = ['headStart', 'doubleShards', 'bigRing'];
  function randomBoost(rng = Math.random) { return BOOST_IDS[Math.floor(rng() * BOOST_IDS.length) % BOOST_IDS.length]; }
  function grant(r, mult = 1) {
    const S = KABLAST.save.data, R = D(), out = {};
    if (!r) return out;
    if (r.shards) { const n = Math.round(r.shards * mult); S.shards += n; out.shards = n; }
    if (r.chest) { const n = r.n || 1; R.chests[r.chest] = (R.chests[r.chest] || 0) + n; out.chest = r.chest; out.chestN = n; }
    if (r.boost) { const id = r.boost === 'random' ? randomBoost() : r.boost, n = r.boostN || 1; R.boosts[id] = (R.boosts[id] || 0) + n; out.boost = id; out.boostN = n; }
    if (r.boosts) { for (const id of BOOST_IDS) R.boosts[id] = (R.boosts[id] || 0) + r.boosts; out.boostsAll = r.boosts; }
    save();
    try { KABLAST.ui.setShards(S.shards); } catch (e) {}
    changed();
    return out;
  }

  // ------------------------------------------------------------------ 1. the login calendar
  // Seven days, one claim per calendar day. A missed day pauses it; it never resets. Day 7 loops back to day 1.
  function login() {
    const R = D(), t = today(), cal = C().login;
    const claimedToday = R.login.last === t || rolledBack();
    return { day: R.login.day % cal.length, list: cal, claimable: !claimedToday, claimedToday, doubled: R.ads.login2x === t };
  }
  function claimLogin() {
    const L = login(); if (!L.claimable) return null;
    const R = D(), t = today(), r = L.list[L.day];
    R.login.last = t; R.login.day = (L.day + 1) % L.list.length; R.login.total = (R.login.total || 0) + 1;
    const got = grant(r);
    task('login', 1); weeklyTask('logins', 1);
    return { day: L.day, got };
  }
  // one video a day doubles the shards of the day's login reward (only days that pay shards)
  function canDoubleLogin() {
    const R = D(), t = today(), cal = C().login, last = (R.login.day + cal.length - 1) % cal.length;
    return videos() && R.login.last === t && !rolledBack() && R.ads.login2x !== t && !!cal[last].shards;
  }
  async function doubleLogin() {
    if (!canDoubleLogin()) return null;
    if (!(await video('login2x'))) return null;
    const R = D(), t = today(), cal = C().login, last = (R.login.day + cal.length - 1) % cal.length;
    if (R.ads.login2x === t) return null;
    R.ads.login2x = t;
    return grant({ shards: cal[last].shards });
  }

  // ------------------------------------------------------------------ 2. daily tasks → activity points → milestones
  function dailyState() {
    const R = D(), t = today();
    if (R.daily.date !== t && !rolledBack()) {
      R.daily = { date: t, pts: 0, ms: C().daily.milestones.map(() => false), c: C().daily.counters.map(() => 0), done: C().daily.tasks.map(() => false) };
      save();
    }
    return R.daily;
  }
  function task(counter, n) {
    if (rolledBack()) return;
    const d = dailyState(), cfg = C().daily, ci = cfg.counters.indexOf(counter); if (ci < 0) return;
    d.c[ci] = (d.c[ci] || 0) + n;
    cfg.tasks.forEach((tk, i) => { if (!d.done[i] && tk.counter === counter && d.c[ci] >= tk.target) { d.done[i] = true; d.pts += tk.pts; } });
    save(); changed();
  }
  function daily() {
    const d = dailyState(), cfg = C().daily;
    return {
      pts: d.pts, max: cfg.tasks.reduce((a, t) => a + t.pts, 0),
      tasks: cfg.tasks.map((tk, i) => ({ ...tk, progress: Math.min(tk.target, d.c[cfg.counters.indexOf(tk.counter)] || 0), done: d.done[i] })),
      milestones: cfg.milestones.map((m, i) => ({ ...m, claimed: d.ms[i], ready: !d.ms[i] && d.pts >= m.at })),
    };
  }
  function claimDailyMilestone(i) {
    const d = dailyState(), m = C().daily.milestones[i];
    if (!m || d.ms[i] || d.pts < m.at || rolledBack()) return null;
    d.ms[i] = true; save();
    return grant(m.reward);
  }

  // ------------------------------------------------------------------ 3. weekly tasks (Monday to Sunday)
  function weeklyState() {
    const R = D(), w = week();
    if (R.weekly.week !== w && !rolledBack()) {
      R.weekly = { week: w, pts: 0, ms: C().weekly.milestones.map(() => false), c: C().weekly.tasks.map(() => 0), done: C().weekly.tasks.map(() => false) };
      save();
    }
    return R.weekly;
  }
  function weeklyTask(id, n, mode) {
    if (rolledBack()) return;
    const w = weeklyState(), cfg = C().weekly, i = cfg.tasks.findIndex(t => t.id === id); if (i < 0) return;
    w.c[i] = (mode === 'max' || cfg.tasks[i].mode === 'max') ? Math.max(w.c[i] || 0, n) : (w.c[i] || 0) + n;
    if (!w.done[i] && w.c[i] >= cfg.tasks[i].target) { w.done[i] = true; w.pts += cfg.tasks[i].pts; }
    save(); changed();
  }
  function weekly() {
    const w = weeklyState(), cfg = C().weekly;
    return {
      pts: w.pts, max: cfg.tasks.reduce((a, t) => a + t.pts, 0),
      tasks: cfg.tasks.map((tk, i) => ({ ...tk, progress: Math.min(tk.target, w.c[i] || 0), done: w.done[i] })),
      milestones: cfg.milestones.map((m, i) => ({ ...m, claimed: w.ms[i], ready: !w.ms[i] && w.pts >= m.at })),
      endsIn: msToMonday(),
    };
  }
  function claimWeeklyMilestone(i) {
    const w = weeklyState(), m = C().weekly.milestones[i];
    if (!m || w.ms[i] || w.pts < m.at || rolledBack()) return null;
    w.ms[i] = true; save();
    return grant(m.reward);
  }
  function msToMonday() {
    const d = new Date(), day = (d.getDay() + 6) % 7;                  // 0 = Monday
    const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (7 - day));
    return Math.max(0, next - d);
  }

  // ------------------------------------------------------------------ 4. goals (achievements)
  function statOf(id) {
    const S = KABLAST.save.data, R = D();
    switch (id) {
      case 'height': return S.best || 0;
      case 'chain': return S.bestChain || 0;
      case 'crystals': return S.totalCrystals || 0;
      case 'runs': return S.runs || 0;
      case 'novas': return S.novaTotal || 0;
      case 'level': return S.bestLevel || 0;
      case 'collection': return ownedCount();
      case 'streak': return Math.max(KABLAST.missions.streak(), R.bestStreak || 0);
      case 'chests': return R.chests.opened || 0;
      default: return 0;
    }
  }
  function ownedCount() {
    let n = 0;
    for (const s of KABLAST.skins.list) if (KABLAST.skins.owned(s.id)) n++;
    for (const id in KABLAST.cosmetics.byId) if (KABLAST.cosmetics.owned(id)) n++;
    return n;
  }
  function goals() {
    const R = D();
    return C().goals.map((g, i) => {
      const tier = R.ach[i] || 0, v = statOf(g.id), max = g.tiers.length;
      const target = g.tiers[Math.min(tier, max - 1)];
      return { ...g, index: i, tier, value: v, target, done: tier >= max, ready: tier < max && v >= target, reward: g.rewards[Math.min(tier, max - 1)] };
    });
  }
  function claimGoal(i) {
    const R = D(), g = C().goals[i]; if (!g) return null;
    const tier = R.ach[i] || 0; if (tier >= g.tiers.length || statOf(g.id) < g.tiers[tier]) return null;
    R.ach[i] = tier + 1; save();
    return grant({ shards: g.rewards[tier] });
  }
  const goalsReady = () => goals().some(g => g.ready);

  // ------------------------------------------------------------------ 5. player level, XP and the Star Road
  // XP comes from playing: distance and crystals. Levels need a little more XP each time. Every level has a reward.
  // (The iOS build also sold a premium track; on the web only the free track exists, so `premium` is always false.)
  const xpNeed = L => C().xp.base + C().xp.step * (L - 1);
  function level() {
    const R = D();
    return { level: R.level, xp: R.xp, need: xpNeed(R.level) };
  }
  function addXp(n) {
    const R = D(); n = Math.max(0, Math.floor(n)); if (!n) return 0;
    R.xp += n; let ups = 0;
    while (R.xp >= xpNeed(R.level) && R.level < 999) { R.xp -= xpNeed(R.level); R.level++; ups++; }
    save(); if (ups) changed();
    return ups;
  }
  function roadReward(L, premium) {
    if (premium) {
      if (L % 5 === 0) return { chest: 'epic', n: 1, shards: 200 };
      return L % 2 === 0 ? { shards: 150, boost: 'random' } : { shards: 150 };
    }
    if (L % 10 === 0) return { chest: 'epic', n: 1 };
    if (L % 5 === 0) return { chest: 'rare', n: 1 };
    if (L % 2 === 0) return { boost: BOOST_IDS[(L / 2) % 3] };
    return { shards: Math.min(300, 50 + 5 * L) };
  }
  // level 1 is where everyone starts: the first reward is for reaching level 2
  function road() {
    const R = D(), top = Math.max(R.level + 8, 20), rows = [];
    for (let L = 2; L <= top; L++) rows.push({ level: L, free: roadReward(L, false), prem: roadReward(L, true), reached: R.level >= L, freeClaimed: R.roadFree >= L, premClaimed: R.roadPrem >= L });
    return { rows, premium: !!R.roadOwned, level: R.level };
  }
  function claimRoad(L, premium) {
    const R = D(); if (R.level < L || L < 2) return null;
    if (premium && !R.roadOwned) return null;
    const key = premium ? 'roadPrem' : 'roadFree';
    if (R[key] >= L) return null;
    // claims go in order, so a long list never leaves holes: claiming level L also claims every level below it
    let got = {};
    for (let k = Math.max(2, R[key] + 1); k <= L; k++) got = merge(got, grant(roadReward(k, premium)));
    R[key] = L; save(); changed();
    return got;
  }
  function roadReady() { const R = D(); return R.level > Math.max(1, R.roadFree) || (R.roadOwned && R.level > Math.max(1, R.roadPrem)); }
  function merge(a, b) {
    const o = { ...a };
    if (b.shards) o.shards = (o.shards || 0) + b.shards;
    if (b.chest) { o.chests = o.chests || {}; o.chests[b.chest] = (o.chests[b.chest] || 0) + (b.chestN || 1); }
    if (b.boost) { o.boosts = o.boosts || {}; o.boosts[b.boost] = (o.boosts[b.boost] || 0) + (b.boostN || 1); }
    return o;
  }

  // ------------------------------------------------------------------ 6. the Shard Mine (idle income)
  // Fills at CFG.rewards.mine.perHour while you are away, up to `capH` hours. A video adds `adHours` instantly.
  function mineState() {
    const R = D(), cfg = C().mine, t = now();
    if (!R.mine.t || R.mine.t > t) { R.mine.t = t; save(); }            // first visit, or the clock went back
    const hours = Math.min(cfg.capH, (t - R.mine.t) / 3600000);
    return { hours, shards: Math.floor(hours * cfg.perHour), cap: cfg.capH * cfg.perHour, full: hours >= cfg.capH, perHour: cfg.perHour, capH: cfg.capH,
             adLeft: adLeft('mine'), fullIn: Math.max(0, (cfg.capH - hours) * 3600000) };
  }
  function claimMine() {
    const M = mineState(); if (M.shards < 1) return null;
    const R = D(), cfg = C().mine;
    // keep the fraction of a shard that has not finished forming
    R.mine.t = now() - Math.round((M.hours - M.shards / cfg.perHour) * 3600000);
    if (M.full) R.mine.t = now();
    save(); task('mine', 1);
    return grant({ shards: M.shards });
  }
  async function boostMine() {
    if (!videos() || adLeft('mine') <= 0) return null;
    if (!(await video('mine'))) return null;
    if (!useAd('mine')) return null;
    return grant({ shards: C().mine.perHour * C().mine.adHours });
  }

  // ------------------------------------------------------------------ 7. the Lucky Spin
  function spinState() {
    const R = D(), t = today();
    if (R.spin.date !== t && !rolledBack()) { R.spin = { date: t, free: 0 }; save(); }
    return { freeLeft: rolledBack() ? 0 : Math.max(0, C().spin.free - R.spin.free), adLeft: adLeft('spin'), wheel: C().spin.wheel };
  }
  // the weights are the odds: shown on the wheel screen as percentages
  function pickSpin(rng = Math.random) {
    const W = C().spin.wheel, total = W.reduce((a, s) => a + s.w, 0);
    let x = rng() * total;
    for (let i = 0; i < W.length; i++) { x -= W[i].w; if (x < 0) return i; }
    return W.length - 1;
  }
  async function spin(withVideo) {
    const st = spinState();
    if (withVideo) {
      if (!videos() || st.adLeft <= 0) return null;
      if (!(await video('spin'))) return null;
      if (!useAd('spin')) return null;
    } else {
      if (st.freeLeft <= 0) return null;
      D().spin.free++; save();
    }
    const i = pickSpin(), seg = C().spin.wheel[i];
    task('spin', 1);
    return { index: i, got: grant(seg.reward) };
  }

  // ------------------------------------------------------------------ 8. chests
  // A chest is shards (a fixed range), maybe boosts, and maybe a cosmetic the player does not own yet. Premium
  // cosmetics never drop (they are bought in the Skins sheet), and never a duplicate. If every eligible cosmetic is owned,
  // the cosmetic roll pays its listed shard value instead. The odds below are the whole truth and are what the
  // chest screen prints.
  function dropPool(maxPrice) {
    const out = [];
    for (const s of KABLAST.skins.list) if (!s.premium && s.price > 0 && s.price <= maxPrice && !KABLAST.skins.owned(s.id)) out.push(s);
    for (const id in KABLAST.cosmetics.byId) { const it = KABLAST.cosmetics.byId[id]; if (!it.premium && it.price > 0 && it.price <= maxPrice && !KABLAST.cosmetics.owned(id)) out.push(it); }
    return out;
  }
  function rollChest(type, rng = Math.random) {
    const c = CH()[type]; if (!c) return null;
    const res = { type, shards: c.shards[0] + Math.floor(rng() * (c.shards[1] - c.shards[0] + 1)), boosts: [], item: null, refund: 0 };
    for (let k = 0; k < c.boosts; k++) res.boosts.push(randomBoost(rng));
    if (c.boostChance && rng() < c.boostChance) res.boosts.push(randomBoost(rng));
    if (rng() < c.itemChance) {
      const pool = dropPool(c.itemMaxPrice);
      if (pool.length) res.item = pool[Math.floor(rng() * pool.length) % pool.length];
      else res.refund = c.itemRefund;
    }
    return res;
  }
  function openChest(type) {
    const R = D(); if (!(R.chests[type] > 0)) return null;
    R.chests[type]--;
    const r = rollChest(type);
    const S = KABLAST.save.data;
    S.shards += r.shards + r.refund;
    for (const b of r.boosts) R.boosts[b] = (R.boosts[b] || 0) + 1;
    if (r.item) { if (KABLAST.skins.byId[r.item.id]) KABLAST.skins.grant(r.item.id); else KABLAST.cosmetics.grant(r.item.id); }
    R.chests.opened = (R.chests.opened || 0) + 1;
    save(); task('chest', 1); weeklyTask('chests', 1);
    try { KABLAST.ui.setShards(S.shards); } catch (e) {}
    changed();
    return r;
  }
  function buyChest(type) {
    const S = KABLAST.save.data, price = CH()[type] && CH()[type].price; if (!price || S.shards < price) return false;
    S.shards -= price; D().chests[type]++; save(); changed(); return true;
  }
  // a free common chest for a video, a few times a day with a cooldown between them
  function adChestState() {
    const R = D(), wait = Math.max(0, (R.chests.adAt || 0) - now());
    return { left: adLeft('chest'), wait, ready: videos() && adLeft('chest') > 0 && wait <= 0 };
  }
  async function adChest() {
    if (!adChestState().ready) return null;
    if (!(await video('chest'))) return null;
    if (!useAd('chest')) return null;
    D().chests.adAt = now() + C().ads.chest.cooldownH * 3600000;
    return grant({ chest: 'common', n: 1 });
  }
  const chestCount = () => { const c = D().chests; return (c.common || 0) + (c.rare || 0) + (c.epic || 0); };

  // ------------------------------------------------------------------ 9. boosts
  // Small, single-run helpers. None of them is a life, a shield or a revive. Armed before a run, spent when it starts.
  function boosts() { const R = D(); return BOOST_IDS.map(id => ({ id, n: R.boosts[id] || 0, armed: !!R.armed[id] && (R.boosts[id] || 0) > 0, price: BO()[id].price })); }
  function toggleBoost(id) {
    const R = D(); if (BOOST_IDS.indexOf(id) < 0) return false;
    if (!(R.boosts[id] > 0)) { R.armed[id] = false; save(); return false; }
    R.armed[id] = !R.armed[id]; save(); changed(); return R.armed[id];
  }
  // called once when a run starts: returns the boosts it uses and takes them out of the inventory
  function consumeArmed() {
    const R = D(), used = {};
    for (const id of BOOST_IDS) if (R.armed[id] && R.boosts[id] > 0) { R.boosts[id]--; used[id] = true; if (!R.boosts[id]) R.armed[id] = false; }
    save(); changed();
    return used;
  }
  function buyBoost(id) {
    const S = KABLAST.save.data, b = BO()[id]; if (!b || S.shards < b.price) return false;
    S.shards -= b.price; D().boosts[id]++; save(); changed(); return true;
  }
  async function adBoost() {
    if (!videos() || adLeft('boost') <= 0) return null;
    if (!(await video('boost'))) return null;
    if (!useAd('boost')) return null;
    return grant({ boost: 'random' });
  }

  // the welcome gift: waiting in Rewards from the first visit
  function welcomeReady() { return D().welcome === 1; }
  function welcomeArm() { const R = D(); if (!R.welcome) { R.welcome = 1; save(); changed(); } }
  function claimWelcome() { const R = D(); if (R.welcome !== 1) return null; R.welcome = 2; save(); return grant(C().welcome); }

  // ------------------------------------------------------------------ optional videos: caps per placement per day
  // Every one of these is an OPTIONAL rewarded video. They are not drawn at all while the portal cannot play one.
  function adsDay() {
    const R = D(), t = today();
    if (R.ads.date !== t && !rolledBack()) { R.ads.date = t; R.ads.used = C().ads.order.map(() => 0); save(); }
    return R.ads;
  }
  function adLeft(p) {
    if (rolledBack()) return 0;
    const A = adsDay(), i = C().ads.order.indexOf(p); if (i < 0) return 0;
    return Math.max(0, C().ads[p].perDay - (A.used[i] || 0));
  }
  function useAd(p) {
    if (adLeft(p) <= 0) return false;
    const A = adsDay(), i = C().ads.order.indexOf(p); A.used[i] = (A.used[i] || 0) + 1;
    const S = KABLAST.save.data; S.adsWatched = (S.adsWatched || 0) + 1;
    save(); return true;
  }
  let videoBusy = false;
  async function video(placement) {
    if (videoBusy) return false;
    if (!KABLAST.ads.available()) { KABLAST.ads.noteMiss('noad'); return false; }
    videoBusy = true;
    try { return await KABLAST.ads.showRewarded(placement); } finally { videoBusy = false; }
  }

  // ------------------------------------------------------------------ the run: XP, weekly bests, double shards
  let runAward = { m: 0, c: 0 }, lastRunShards = 0, doubledBase = 0;
  function runStarted() { runAward = { m: 0, c: 0 }; lastRunShards = 0; doubledBase = 0; task('runs', 1); weeklyTask('runs', 1); }
  // called at every game-over panel (a revived run reaches it twice: only the new distance and crystals count)
  function runOver(r) {
    const dm = Math.max(0, r.score - runAward.m), dc = Math.max(0, r.crystals - runAward.c);
    runAward = { m: Math.max(runAward.m, r.score), c: Math.max(runAward.c, r.crystals) };
    const xp = Math.floor(dm / C().xp.perMeters) + Math.floor(dc / C().xp.perCrystals);
    const before = D().level, ups = addXp(xp);
    weeklyTask('height', r.score, 'max');
    const st = KABLAST.missions.streak(), R = D(); if (st > (R.bestStreak || 0)) { R.bestStreak = st; save(); }
    lastRunShards = r.shards;
    return { xp, levelUps: ups, level: D().level, from: before };
  }
  // "watch a video, double the shards of this run" — once per game-over panel, a few times a day
  let doubledThisPanel = false;
  function panelShown() { doubledThisPanel = false; }
  const doubleable = () => Math.max(0, lastRunShards - doubledBase);
  function canDouble() { return videos() && !doubledThisPanel && doubleable() >= C().ads.double.min && adLeft('double') > 0; }
  async function doubleRun() {
    if (!canDouble()) return null;
    const n = doubleable();
    if (!(await video('double'))) return null;
    if (doubledThisPanel || !useAd('double')) return null;
    doubledThisPanel = true; doubledBase = lastRunShards;
    return grant({ shards: n });
  }

  // ------------------------------------------------------------------ what needs the player (title badges)
  function attention() {
    const L = login(), dl = daily(), wk = weekly();
    return {
      login: L.claimable || welcomeReady(),
      tasks: dl.milestones.some(m => m.ready) || wk.milestones.some(m => m.ready) || goalsReady() || roadReady() || KABLAST.missions.claimable(),
      spin: spinState().freeLeft > 0,
      mine: mineState().full,
      chests: chestCount() > 0 || adChestState().ready,
    };
  }

  function init() {
    const R = D();
    today(); dailyState(); weeklyState(); adsDay(); spinState(); mineState();
    welcomeArm();
    void R;
  }

  return { init, onChange, videos, grant, randomBoost, BOOST_IDS,
           login, claimLogin, canDoubleLogin, doubleLogin,
           daily, task, claimDailyMilestone, weekly, weeklyTask, claimWeeklyMilestone,
           goals, claimGoal, goalsReady,
           level, addXp, xpNeed, road, roadReward, claimRoad, roadReady,
           mineState, claimMine, boostMine,
           spinState, pickSpin, spin,
           dropPool, rollChest, openChest, buyChest, adChestState, adChest, chestCount,
           boosts, toggleBoost, consumeArmed, buyBoost, adBoost,
           welcomeReady, welcomeArm, claimWelcome,
           adLeft, runStarted, runOver, panelShown, canDouble, doubleable, doubleRun, attention, msToMonday };
})();
