/* KABLAST — daily missions + streak. Three missions per day, seeded by the date so every
   player gets the same set. Progress types: 'max' (best in one run) or 'sum' (accumulates). */
KABLAST.missions = (() => {
  const U = KABLAST.U;
  const POOL = [
    { id: 'height',      mode: 'max', values: [1000, 2000, 3500, 5000], reward: [25, 35, 50, 70], text: v => `Reach ${v.toLocaleString('en-US')} m in one run` },
    { id: 'chain',       mode: 'max', values: [6, 8, 10, 13],       reward: [30, 40, 55, 75], text: v => `Make a ${v}-crystal chain` },
    { id: 'crystalsRun', mode: 'max', values: [40, 60, 90],         reward: [30, 40, 55],     text: v => `Shatter ${v} crystals in one run` },
    { id: 'crystals',    mode: 'sum', values: [150, 250, 400],      reward: [35, 45, 60],     text: v => `Shatter ${v} crystals today` },
    { id: 'closeCalls',  mode: 'max', values: [2, 3, 5],            reward: [35, 45, 60],     text: v => `${v} close calls in one run` },
    { id: 'blasts',      mode: 'max', values: [15, 25, 40],         reward: [25, 35, 45],     text: v => `Fire ${v} blasts in one run` },
    { id: 'runs',        mode: 'sum', values: [3, 5, 8],            reward: [20, 30, 40],     text: v => `Play ${v} runs` },
    { id: 'novas',       mode: 'sum', values: [1, 2],               reward: [40, 60],         text: v => `Detonate ${v} Nova core${v > 1 ? 's' : ''}` },
    { id: 'level',       mode: 'max', values: [3, 5, 7, 10],        reward: [30, 45, 60, 90], text: v => `Reach level ${v}` },
    { id: 'gates',       mode: 'sum', values: [3, 6, 10],           reward: [30, 45, 70],     text: v => `Clear ${v} gates today` },
  ];

  function ensureToday() {
    const S = KABLAST.save.data, today = U.todayKey();
    if (S.missions.date === today && S.missions.list.length === 3) return;
    const rng = U.mulberry32(U.hashStr('kablast-' + today));
    const ids = POOL.map(p => p.id);
    const chosen = [];
    while (chosen.length < 3) { const i = Math.floor(rng() * ids.length); chosen.push(ids.splice(i, 1)[0]); }
    S.missions = {
      date: today,
      list: chosen.map(id => { const p = POOL.find(q => q.id === id); const k = Math.floor(rng() * p.values.length); return { id, target: p.values[k], reward: p.reward[k] }; }),
      progress: [0, 0, 0], claimed: [false, false, false],
    };
    KABLAST.save.write();
  }
  function init() { ensureToday(); }
  function event(type, value) {
    ensureToday();
    const S = KABLAST.save.data; let changed = false;
    S.missions.list.forEach((m, i) => {
      if (m.id !== type || S.missions.claimed[i]) return;
      const p = POOL.find(q => q.id === type);
      const before = S.missions.progress[i];
      S.missions.progress[i] = p.mode === 'sum' ? before + value : Math.max(before, value);
      if (S.missions.progress[i] !== before) changed = true;
    });
    if (changed) KABLAST.save.write();
    return changed;
  }
  // the words come from i18n (whole sentences with the number in its own place); the English here is the fallback
  function describe(m) { const k = 'm.' + m.id, I = KABLAST.i18n; return I && I.t(k, { v: m.target }) !== k ? I.t(k, { v: m.target }) : POOL.find(p => p.id === m.id).text(m.target); }
  function claimable() { ensureToday(); const S = KABLAST.save.data; return S.missions.list.some((m, i) => !S.missions.claimed[i] && S.missions.progress[i] >= m.target); }
  function claim(i) {
    const S = KABLAST.save.data, m = S.missions.list[i];
    if (!m || S.missions.claimed[i] || S.missions.progress[i] < m.target) return 0;
    S.missions.claimed[i] = true; S.shards += m.reward; KABLAST.save.write();
    // every claimed mission also counts on the daily activity track and the weekly tasks (rewards.js)
    if (KABLAST.rewards) { KABLAST.rewards.task('missions', 1); KABLAST.rewards.weeklyTask('missions', 1); }
    return m.reward;
  }
  // streak: consecutive days with at least one run
  function touchStreak() {
    const S = KABLAST.save.data, today = U.todayKey(), yesterday = U.todayKey(-1);
    if (S.streak.last === today) return S.streak.count;
    S.streak.count = S.streak.last === yesterday ? S.streak.count + 1 : 1;
    S.streak.last = today; KABLAST.save.write(); return S.streak.count;
  }
  function streak() { const S = KABLAST.save.data; return (S.streak.last === U.todayKey() || S.streak.last === U.todayKey(-1)) ? S.streak.count : 0; }
  return { init, event, describe, claimable, claim, touchStreak, streak, ensureToday };
})();
