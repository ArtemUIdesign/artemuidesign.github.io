/* KABLAST — ads on the web (CrazyGames / Poki). Everything goes through window.WebPlatform, the portal adapter the
   packager injects before this file (see the web port notes). Without it (a plain local build, or an ad blocker
   that removed the portal SDK) every call is a safe no-op: no rewarded offers are drawn and breaks resolve at once.

     • Rewarded videos: offered ONLY while WebPlatform.rewardedEnabled() is true (it is false on CrazyGames Basic
       Launch and when the SDK is blocked). A reward is granted only when WebPlatform.rewarded() resolves true.
     • Ad breaks: the portal decides whether an ad plays. The game simply asks at every natural break (the
       game-over panel when no revive is on offer, and right before the next run starts) through midgame().
       There is no pacing counter of our own and no ad-free welcome: the portals pace their own ads.
     • Audio is muted and input is blocked by the adapter while an ad runs. */
KABLAST.ads = (() => {
  const WP = () => window.WebPlatform || null;
  /* WHY THE LAST VIDEO PAID NOTHING, so a screen can answer the right way:
       'noad'   no video could be shown, or it was not watched to the end: "No video available"
       'cap'    the daily free-shard allowance is spent */
  let miss = null;
  function noteMiss(why) { miss = why; }
  function lastMiss() { return miss; }

  // ---------- the ad break (midgame) ----------
  // One at a time: a break that is still in flight is shared, so the game-over panel and a fast RETRY never stack two
  // requests, and a rewarded video asked for meanwhile waits for it instead of being refused.
  let breaking = null;
  function adBreak(reason) {
    if (breaking) return breaking;
    const W = WP();
    if (!W || !W.midgame) return Promise.resolve();
    breaking = Promise.resolve()
      .then(() => W.midgame(reason || 'break'))
      .catch(() => {})
      .then(() => { breaking = null; });
    return breaking;
  }
  const breakPlaying = () => !!breaking;

  // ---------- rewarded videos ----------
  function available() { const W = WP(); try { return !!(W && W.rewardedEnabled && W.rewardedEnabled()); } catch (e) { return false; } }
  let rewardBusy = false;
  async function showRewarded(placement) {
    miss = null;
    if (!available() || rewardBusy) { miss = 'noad'; return false; }
    rewardBusy = true;
    try {
      if (breaking) await breaking;
      const ok = !!(await WP().rewarded(placement));
      if (!ok) miss = 'noad';
      return ok;
    } catch (e) { miss = 'noad'; return false; }
    finally { rewardBusy = false; }
  }

  // ---------- statistics only ----------
  // A game is one run from the first tap to the final death, its revive included; game.js reports it once.
  function noteRunEnded() {
    const S = KABLAST.save.data;
    S.gamesPlayed = (S.gamesPlayed || 0) + 1;
    KABLAST.save.write();
  }

  // ---------- the daily free-shard video ----------
  // Capped at CFG.adShards.perDay. The cap is stored against a day key; a key LOWER than the highest one we have
  // ever seen means the device clock went backwards, and we refuse to reset rather than hand out free shards.
  const U = () => KABLAST.U, CFG = () => KABLAST.CFG.adShards;
  function dayState() {
    const S = KABLAST.save.data, today = U().todayKey();
    S.adShards = S.adShards || { date: '', used: 0, seen: '' };
    const a = S.adShards;
    if (a.date !== today) {
      if (!a.seen || today > a.seen) { a.date = today; a.used = 0; a.seen = today; KABLAST.save.write(); }
      else { return { used: CFG().perDay, left: 0, rolledBack: true }; }   // clock moved back: no new allowance
    }
    if (!a.seen || today > a.seen) { a.seen = today; KABLAST.save.write(); }
    return { used: a.used, left: Math.max(0, CFG().perDay - a.used), rolledBack: false };
  }
  function adShardsLeft() { return dayState().left; }
  // Resolves with the number of shards granted (0 if no video played to the end or the cap is spent).
  async function claimDailyShards() {
    miss = null;
    if (adShardsLeft() <= 0) { miss = 'cap'; return 0; }
    const ok = await showRewarded('shards');
    if (!ok) return 0;
    const S = KABLAST.save.data;
    if (adShardsLeft() <= 0) { miss = 'cap'; return 0; }   // cap could have been spent while the video played
    S.adShards.used++; S.adsWatched = (S.adsWatched || 0) + 1; KABLAST.save.write();
    return CFG().reward;
  }
  // "resets in 7h 20m" — the wall-clock gap to the next local midnight
  function resetsIn() {
    const now = new Date(), next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const m = Math.max(0, Math.round((next - now) / 60000));
    const t = (k, v) => KABLAST.i18n ? KABLAST.i18n.t(k, v) : (k === 'time.hm' ? `${v.h}h ${v.m}m` : `${v.m}m`);
    return m >= 60 ? t('time.hm', { h: Math.floor(m / 60), m: m % 60 }) : t('time.m', { m });
  }

  // ---------- the portal's gameplay events ----------
  function gameplayStart() { const W = WP(); if (W && W.gameplayStart) try { W.gameplayStart(); } catch (e) {} }
  function gameplayStop() { const W = WP(); if (W && W.gameplayStop) try { W.gameplayStop(); } catch (e) {} }
  function loadingDone() { const W = WP(); if (W && W.loadingDone) try { W.loadingDone(); } catch (e) {} }
  function happytime() { const W = WP(); if (W && W.happytime) try { W.happytime(); } catch (e) {} }

  return { available, showRewarded, noteMiss, lastMiss, adShardsLeft, claimDailyShards, resetsIn,
           noteRunEnded, adBreak, breakPlaying,
           gameplayStart, gameplayStop, loadingDone, happytime };
})();
