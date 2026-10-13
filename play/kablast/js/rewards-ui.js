/* KABLAST — the screens of the daily loop (1.2). rewards.js keeps the state and the rules; this file draws them:
   the rank chip and the boost trays on the title, the Missions sheet (today, this week, goals, the Star Road), the
   Rewards sheet (daily gift, Lucky Spin, Shard Mine, chests), the chest reveal, the odds sheet, the chests / boosts
   sections of the Store tab, and the "double your shards" video on the game-over panel.

   Two rules hold on every screen here:
     · nothing is sold for money; an optional rewarded video is drawn only while the portal can play one
       (KABLAST.ads.available()), and the free loop is always there
     · a chest's contents and odds are one tap away wherever a chest can be bought, before it is bought */
KABLAST.rui = (() => {
  const $ = id => document.getElementById(id);
  const t = (k, v) => KABLAST.i18n.t(k, v), F = n => KABLAST.U.fmt(n);
  const R = () => KABLAST.rewards, UI = () => KABLAST.ui, CFG = () => KABLAST.CFG;
  let mtab = 'daily', rtab = 'login', busy = false;
  const ticks = { rewards: [], missions: [], store: [] };

  // ------------------------------------------------------------------ small pieces
  const icon = (id, cls) => `<svg class="i${cls ? ' ' + cls : ''}"><use href="#${id}"/></svg>`;
  const CHEST_ICON = { common: 'i-chest', rare: 'i-chest-r', epic: 'i-chest-e' };
  const BOOST_ICON = { headStart: 'i-rocket', doubleShards: 'i-x2', bigRing: 'i-bigring' };
  const CAT_ICON = { crystal: 'i-gem', world: 'i-world', trail: 'i-comet' };
  const CHESTS = ['common', 'rare', 'epic'];
  const play = `<span class="play">${icon('i-play')}</span>`;
  const tapFx = () => { KABLAST.audio.unlock(); KABLAST.audio.ui(); KABLAST.haptics.selection(); };
  const won = () => { KABLAST.audio.buy(); KABLAST.haptics.notify('success'); };
  const toMidnight = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1) - n; };
  function dur(ms) {
    const m = Math.max(1, Math.ceil(ms / 60000));
    if (m >= 1440) return t('time.dh', { d: Math.floor(m / 1440), h: Math.floor(m % 1440 / 60) });
    return m >= 60 ? t('time.hm', { h: Math.floor(m / 60), m: m % 60 }) : t('time.m', { m });
  }
  function clock(ms) {
    const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`;
  }
  // a reward as a row of icon + amount chips
  function chips(r) {
    const out = [];
    if (r.shards) out.push(`<span class="rc"><i class="gem"></i>${F(r.shards)}</span>`);
    if (r.chest) out.push(`<span class="rc">${icon(CHEST_ICON[r.chest])}${(r.n || 1) > 1 ? '×' + r.n : ''}</span>`);
    if (r.boost) out.push(`<span class="rc">${icon(r.boost === 'random' ? 'i-gift' : BOOST_ICON[r.boost])}</span>`);
    if (r.boosts) out.push(`<span class="rc">${icon('i-rocket')}×${r.boosts}</span>`);
    return out.join('');
  }
  // what grant() handed over, as one toast line
  function gotText(g) {
    if (!g) return '';
    const out = [], x = n => (n > 1 ? ' ×' + n : '');
    if (g.shards) out.push(t('toast.gotShards', { n: g.shards }));
    if (g.chest) out.push(t('chest.' + g.chest) + x(g.chestN));
    if (g.chests) for (const k in g.chests) out.push(t('chest.' + k) + x(g.chests[k]));
    if (g.boost) out.push(t('boost.' + g.boost) + x(g.boostN));
    if (g.boosts) for (const k in g.boosts) out.push(t('boost.' + k) + x(g.boosts[k]));
    return out.join(' · ');
  }
  function gotToast(g) { const s = gotText(g); if (s) { UI().toast(s, 2400); won(); } UI().setShards(KABLAST.save.data.shards); }
  // a rewarded video: one at a time, the button held down while it plays, and the right words when nothing paid
  async function withVideo(btn, fn) {
    if (busy) return null;
    busy = true; if (btn) btn.disabled = true;
    let r = null;
    try { r = await fn(); } catch (e) { r = null; } finally { busy = false; if (btn) btn.disabled = false; }
    if (!r) {
      const why = KABLAST.ads.lastMiss();
      UI().toast(why === 'noad' ? t('toast.noVideo') : t('toast.noReward'));
    }
    return r;
  }
  const vids = () => KABLAST.ads.available();                          // optional rewarded videos may be offered
  // a full-width offer button: a lead icon, a title and a line under it, the price pressed into its right end
  const wide = (cls, attrs, ico, title, sub, em, extra) =>
    `<button class="btn wide ${cls}" ${attrs}>${icon(ico, 'lead')}<span class="lbl"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span>${em ? `<em>${em}</em>` : ''}${extra || ''}</button>`;
  const vid = (id, title, sub, em, disabled) =>
    `<button class="btn cyan wide vid" id="${id}"${disabled ? ' disabled' : ''}>${play}<span class="lbl"><b>${title}</b><small>${sub}</small></span>${em ? `<em>${em}</em>` : ''}</button>`;
  const videoSub = (left, n) => left > 0 ? t('video.left', { left, n }) : t('video.spent', { t: dur(toMidnight()) });

  // ------------------------------------------------------------------ the title: rank, boosts, badges
  function paintTrays() {
    const RW = R(), list = RW.boosts(), show = true;          // boosts can always be bought for shards in the Store
    document.querySelectorAll('.boost-tray').forEach(tray => {
      tray.hidden = !show;
      tray.querySelectorAll('.boost').forEach(b => {
        const it = list.find(x => x.id === b.dataset.boost);
        b.classList.toggle('on', it.armed); b.classList.toggle('empty', it.n <= 0);
        b.querySelector('.bn').textContent = it.n > 99 ? '99+' : String(it.n);
        b.setAttribute('aria-pressed', String(it.armed));
      });
    });
  }
  function onBoost(id) {
    const RW = R(), it = RW.boosts().find(x => x.id === id), name = t('boost.' + id);
    if (it.n <= 0) {
      UI().openShop('shards', 'head-boosts');
      return;
    }
    const on = RW.toggleBoost(id);
    UI().toast(on ? t('toast.armed', { name }) + '. ' + t('boostd.' + id) : t('toast.disarmed', { name }), 2600);
    paintTrays();
  }
  function badges() {
    const A = R().attention();
    const rb = $('rewards-badge'); if (rb) rb.hidden = !(A.login || A.spin || A.mine || A.chests);
    const mb = $('missions-badge'); if (mb) mb.hidden = !A.tasks;
    return A;
  }
  function refreshTitle() {
    const L = R().level();
    $('rank-num').textContent = F(L.level); $('rank-fill').style.width = Math.round(L.xp / L.need * 100) + '%';
    badges(); paintTrays();
  }

  // ------------------------------------------------------------------ the Missions sheet
  function openMissions(tab) { mtab = tab || mtab; renderMissions(); UI().openModal('missions'); if (mtab === 'rank') scrollToRank(); }
  function missionDots() {
    const RW = R(), d = RW.daily(), w = RW.weekly();
    const on = { daily: d.milestones.some(m => m.ready) || KABLAST.missions.claimable(), weekly: w.milestones.some(m => m.ready), goals: RW.goalsReady(), rank: RW.roadReady() };
    document.querySelectorAll('#mission-tabs .tab').forEach(b => { b.classList.toggle('on', b.dataset.mtab === mtab); b.querySelector('.dot').hidden = !on[b.dataset.mtab]; });
  }
  function renderMissions() {
    KABLAST.missions.ensureToday();
    missionDots();
    const list = $('mission-list'); list.innerHTML = ''; ticks.missions = [];
    const foot = $('mission-foot-text'), streak = $('mission-streak');
    streak.textContent = '';
    if (mtab === 'daily') {
      list.insertAdjacentHTML('beforeend', track(t('act.title'), R().daily(), 'd'));
      list.insertAdjacentHTML('beforeend', `<div class="list-head">${t('head.missions')}</div><div class="list-group" id="ml-missions"></div><div class="list-head">${t('head.tasks')}</div><div class="list-group" id="ml-tasks"></div>`);
      dailyMissions($('ml-missions'));
      tasks($('ml-tasks'), R().daily().tasks, tk => t('task.' + tk.id, { v: tk.target }));
      foot.textContent = t('missions.foot');
      const st = KABLAST.missions.streak(); streak.textContent = st >= 2 ? t('streak', { n: st }) : '';
    } else if (mtab === 'weekly') {
      const w = R().weekly();
      list.insertAdjacentHTML('beforeend', track(t('act.week'), w, 'w') + `<div class="list-head">${t('head.weekly')}</div><div class="list-group" id="ml-weekly"></div>`);
      tasks($('ml-weekly'), w.tasks, tk => t('wk.' + tk.id, { v: tk.target }));
      const paint = () => { foot.textContent = t('wk.foot', { t: dur(R().msToMonday()) }); };
      paint(); ticks.missions.push(paint);
    } else if (mtab === 'goals') {
      list.insertAdjacentHTML('beforeend', '<div class="list-group" id="ml-goals"></div>');
      goalsList($('ml-goals'));
      foot.textContent = t('goals.foot');
    } else {
      rankTab(list);
      foot.textContent = t('road.foot');
    }
    requestAnimationFrame(() => UI().fitAll($('missions')));
  }
  // an activity track: points, a bar with a notch at each milestone, and the milestone rewards under it
  function track(title, st, kind) {
    const pct = Math.min(100, Math.round(st.pts / st.max * 100));
    const notches = st.milestones.map(m => `<b class="tk" style="left:${m.at / st.max * 100}%"></b>`).join('');
    const ms = st.milestones.map((m, i) => `<button class="ms${m.claimed ? ' claimed' : m.ready ? ' ready' : ''}" data-ms="${kind}${i}"><b class="ms-at">${F(m.at)}</b><span class="ms-r">${m.claimed ? icon('i-check') : chips(m.reward)}</span></button>`).join('');
    return `<div class="track"><div class="track-head"><span class="track-title">${title}</span><b class="track-pts">${F(st.pts)} / ${F(st.max)}</b></div>
      <div class="track-bar"><i style="width:${pct}%"></i>${notches}</div><div class="ms-row">${ms}</div></div>`;
  }
  function onMilestone(key) {
    const kind = key[0], i = +key.slice(1), RW = R();
    const st = kind === 'd' ? RW.daily() : RW.weekly(), m = st.milestones[i]; if (!m) return;
    if (m.claimed) return;
    if (!m.ready) { UI().toast(t('act.locked', { n: m.at })); return; }
    gotToast(kind === 'd' ? RW.claimDailyMilestone(i) : RW.claimWeeklyMilestone(i));
    renderMissions(); refreshTitle();
  }
  // the three daily missions, exactly as before 1.2
  function dailyMissions(box) {
    const S = KABLAST.save.data;
    S.missions.list.forEach((m, i) => {
      const prog = Math.min(S.missions.progress[i], m.target), done = prog >= m.target, claimed = S.missions.claimed[i];
      const el = document.createElement('div');
      el.className = 'mission' + (claimed ? ' claimed' : done ? ' done' : '');
      el.innerHTML = `<div class="m-text"><div class="m-title">${KABLAST.missions.describe(m)}</div>
        <div class="m-bar"><i style="width:${Math.round(prog / m.target * 100)}%"></i></div>
        <div class="m-prog">${F(prog)} / ${F(m.target)}</div></div>
        <div class="m-reward">${claimed ? `${icon('i-check')}${t('m.done')}` : `<i class="gem"></i>${done ? t('m.claim') + ' ' : ''}${F(m.reward)}`}</div>`;
      if (done && !claimed) el.querySelector('.m-reward').addEventListener('click', () => {
        const r = KABLAST.missions.claim(i);
        if (r) { won(); UI().toast(t('toast.gotShards', { n: r })); UI().setShards(S.shards); renderMissions(); refreshTitle(); }
      });
      box.appendChild(el);
    });
  }
  // activity / weekly tasks: they fill by themselves and pay their points the moment they are done
  function tasks(box, list, text) {
    for (const tk of list) {
      const el = document.createElement('div');
      el.className = 'mission task' + (tk.done ? ' claimed' : '');
      const bar = tk.target > 1 ? `<div class="m-bar"><i style="width:${Math.round(tk.progress / tk.target * 100)}%"></i></div><div class="m-prog">${F(tk.progress)} / ${F(tk.target)}</div>` : '';
      el.innerHTML = `<div class="m-text"><div class="m-title">${text(tk)}</div>${bar}</div><div class="m-reward pts">${tk.done ? icon('i-check') : icon('i-star')}+${F(tk.pts)}</div>`;
      box.appendChild(el);
    }
  }
  function goalsList(box) {
    for (const g of R().goals()) {
      const v = Math.min(g.value, g.target), el = document.createElement('div');
      el.className = 'mission goal' + (g.done ? ' claimed' : g.ready ? ' done' : '');
      el.innerHTML = `<div class="m-text"><div class="m-title">${t('goal.' + g.id, { v: g.target })}</div>
        <div class="m-bar"><i style="width:${Math.round(v / g.target * 100)}%"></i></div>
        <div class="m-prog">${F(v)} / ${F(g.target)} · ${t('goal.tier', { n: Math.min(g.tier + 1, g.tiers.length), max: g.tiers.length })}</div></div>
        <div class="m-reward">${g.done ? `${icon('i-check')}${t('goal.done')}` : `<i class="gem"></i>${g.ready ? t('m.claim') + ' ' : ''}${F(g.reward)}`}</div>`;
      if (g.ready) el.querySelector('.m-reward').addEventListener('click', () => { gotToast(R().claimGoal(g.index)); renderMissions(); refreshTitle(); });
      box.appendChild(el);
    }
  }
  // the player's Rank and its Star Road: a reward at every rank
  function rankTab(list) {
    const RW = R(), L = RW.level(), road = RW.road();
    let h = `<div class="rank-card"><div class="rank-big">${icon('i-star')}<b>${F(L.level)}</b></div>
      <div class="rank-info"><div class="rank-title">${t('rank.n', { n: L.level })}</div><div class="m-bar xp"><i style="width:${Math.round(L.xp / L.need * 100)}%"></i></div>
      <div class="m-prog">${t('rank.xp', { n: L.xp, max: L.need })}</div><div class="m-prog">${t('rank.how')}</div></div></div>`;
    h += `<div class="road-cols solo"><span>${t('road.free')}</span></div><div class="list-group road" id="ml-road">`;
    for (const r of road.rows) {
      const fs = r.freeClaimed ? 'claimed' : r.reached ? 'ready' : 'locked';
      h += `<div class="mission road-row${r.reached ? ' reached' : ''}${r.level === L.level ? ' here' : ''}" data-lv="${r.level}"><div class="rr-lv">${F(r.level)}</div>
        <button class="rr ${fs}" data-road="${r.level}" data-p="0">${fs === 'claimed' ? icon('i-check') : chips(r.free)}</button></div>`;
    }
    list.insertAdjacentHTML('beforeend', h + '</div>');
  }
  function scrollToRank() {
    requestAnimationFrame(() => {
      const list = $('mission-list'), lv = R().level().level, row = list.querySelector(`.road-row[data-lv="${Math.max(2, lv)}"]`);
      if (row) list.scrollTop = Math.max(0, row.offsetTop - list.offsetTop - 120);
    });
  }
  function onRoad(lv, premium) {
    const RW = R(), road = RW.road(), row = road.rows.find(r => r.level === lv); if (!row) return;
    if (!row.reached) { UI().toast(t('road.locked', { n: lv })); return; }
    if (premium && !road.premium) return;
    if (premium ? row.premClaimed : row.freeClaimed) return;
    gotToast(RW.claimRoad(lv, premium)); renderMissions(); refreshTitle();
  }

  // ------------------------------------------------------------------ the Rewards sheet
  function openRewards(tab) {
    if (tab) rtab = tab;
    else { const A = badges(); rtab = A.login ? 'login' : A.spin ? 'spin' : A.mine ? 'mine' : A.chests ? 'chests' : rtab; }
    renderRewards(); UI().openModal('rewards');
  }
  function rewardDots() {
    const A = R().attention(), on = { login: A.login, spin: A.spin, mine: A.mine, chests: A.chests };
    document.querySelectorAll('#rewards-tabs .tab').forEach(b => { b.classList.toggle('on', b.dataset.rtab === rtab); b.querySelector('.dot').hidden = !on[b.dataset.rtab]; });
  }
  function renderRewards() {
    rewardDots();
    const body = $('rewards-body'); body.innerHTML = ''; ticks.rewards = [];
    if (rtab === 'login') loginTab(body); else if (rtab === 'spin') spinTab(body); else if (rtab === 'mine') mineTab(body); else chestsTab(body);
    requestAnimationFrame(() => UI().fitAll($('rewards')));
  }
  function loginTab(body) {
    const RW = R(), L = RW.login(), C = CFG().rewards;
    let h = '';
    if (RW.welcomeReady()) h += `<div class="list-group"><div class="mission gift done"><div class="m-text"><div class="m-title">${t('welcome.title')}</div><div class="m-chips">${chips(C.welcome)}</div></div><div class="m-reward" id="rw-welcome">${t('m.claim')}</div></div></div>`;
    const doneN = L.claimedToday && L.day === 0 ? 7 : L.day;
    h += '<div class="cal">' + L.list.map((r, i) => {
      const st = i < doneN ? 'got' : i === L.day && L.claimable ? 'today' : '';
      return `<div class="day ${st}${i === 6 ? ' big' : ''}"><b class="d-n">${t('day.n', { n: i + 1 })}</b><span class="d-r">${chips(r)}</span>${st === 'got' ? icon('i-check', 'd-ok') : ''}</div>`;
    }).join('') + '</div>';
    h += `<div class="list-group"><button class="btn green" id="btn-login"${L.claimable ? '' : ' disabled'}><span id="login-label">${L.claimable ? t('login.claim', { n: L.day + 1 }) : t('login.next', { t: dur(toMidnight()) })}</span></button>`;
    if (RW.canDoubleLogin()) { const last = (L.day + 6) % 7; h += vid('btn-login2x', t('login.double'), t('login.doubleSub'), `<i class="gem"></i>+${F(L.list[last].shards)}`); }
    h += `</div><p class="rw-note">${t('login.foot')}</p>`;
    body.innerHTML = h;
    if (!L.claimable) ticks.rewards.push(() => { if (R().login().claimable) renderRewards(); else $('login-label').textContent = t('login.next', { t: dur(toMidnight()) }); });
  }
  // the Lucky Spin: a wheel of eight slices, sized by nothing but the odds printed under it
  let wheelAngle = 0, spinning = false;
  function spinTab(body) {
    const RW = R(), st = RW.spinState(), W = st.wheel, total = W.reduce((a, s) => a + s.w, 0);
    const segs = W.map((s, i) => `<div class="seg" style="transform:rotate(${i * 45 + 22.5}deg)"><span>${chips(s.reward)}</span></div>`).join('');
    let h = `<div class="wheel-wrap"><div class="wheel" id="wheel" style="transform:rotate(${wheelAngle}deg)">${segs}</div><i class="wheel-pin"></i><i class="wheel-hub"></i></div><div class="list-group">`;
    if (st.freeLeft > 0) h += `<button class="btn green wide spin-go" id="btn-spin">${icon('i-wheel', 'lead')}<span class="lbl"><b>${t('spin.go')}</b><small>${t('spin.goSub')}</small></span></button>`;
    else if (vids()) h += vid('btn-spin-ad', t('spin.again'), videoSub(st.adLeft, CFG().rewards.ads.spin.perDay), '', st.adLeft <= 0);
    h += '</div>';
    if (st.freeLeft <= 0) h += `<p class="rw-note" id="spin-next">${t('spin.next', { t: dur(toMidnight()) })}</p>`;
    h += `<div class="odds-grid"><div class="odds-head">${t('spin.odds')}</div>${W.map(s => `<div class="og"><span class="og-r">${chips(s.reward)}</span><b>${Math.round(s.w / total * 1000) / 10}%</b></div>`).join('')}</div>`;
    body.innerHTML = h;
    if (st.freeLeft <= 0) ticks.rewards.push(() => { if (spinning) return; if (R().spinState().freeLeft > 0) renderRewards(); else { const e = $('spin-next'); if (e) e.textContent = t('spin.next', { t: dur(toMidnight()) }); } });
  }
  async function doSpin(useVideo, btn) {
    if (spinning) return;
    const res = useVideo ? await withVideo(btn, () => R().spin(true)) : await R().spin(false);
    if (!res) return;
    spinning = true;
    const wheel = $('wheel'), seg = res.index * 45 + 22.5;
    const cur = ((wheelAngle % 360) + 360) % 360, target = (360 - seg) % 360;
    wheelAngle += 360 * 5 + ((target - cur) + 360) % 360;
    if (wheel) { wheel.classList.add('turning'); wheel.style.transform = `rotate(${wheelAngle}deg)`; }
    document.querySelectorAll('#rewards-body .btn').forEach(b => b.disabled = true);
    setTimeout(() => { spinning = false; if (wheel) wheel.classList.remove('turning'); gotToast(res.got); renderRewards(); refreshTitle(); }, 3300);
  }
  function mineTab(body) {
    const RW = R(), M = RW.mineState(), C = CFG().rewards;
    const paint = () => {
      const m = R().mineState(), pct = Math.round(m.shards / m.cap * 100);
      const bar = $('mine-fill'), txt = $('mine-text'), btn = $('btn-mine');
      if (!bar) return;
      bar.style.width = pct + '%';
      txt.textContent = `${F(m.shards)} / ${F(m.cap)} · ${m.full ? t('mine.full') : t('mine.fills', { t: dur(m.fullIn) })}`;
      btn.disabled = m.shards < 1 || busy; $('mine-amt').textContent = F(m.shards);
    };
    let h = `<div class="mine-card"><div class="mine-ico">${icon('i-mine')}</div><div class="mine-info"><div class="mine-title">${t('mine.title')}</div>
      <div class="m-bar gold"><i id="mine-fill" style="width:0%"></i></div><div class="m-prog" id="mine-text"></div></div></div>
      <p class="rw-note">${t('mine.rate', { n: M.perHour, h: M.capH })}</p><div class="list-group">
      <button class="btn green wide" id="btn-mine">${icon('i-shard', 'lead')}<span class="lbl"><b>${t('mine.collect')}</b></span><em class="sh"><i class="gem"></i><span id="mine-amt">0</span></em></button>`;
    if (vids()) h += vid('btn-mine-ad', t('mine.boost'), videoSub(M.adLeft, C.ads.mine.perDay), `<i class="gem"></i>+${F(C.mine.perHour * C.mine.adHours)}`, M.adLeft <= 0);
    body.innerHTML = h + '</div>';
    paint(); ticks.rewards.push(paint);
  }
  function chestsTab(body) {
    const RW = R(), owned = KABLAST.save.data.rw.chests, C = CFG(), ad = RW.adChestState();
    let h = '';
    if (vids()) {
      const sub = ad.ready ? videoSub(ad.left, C.rewards.ads.chest.perDay) : ad.left > 0 ? t('chest.wait', { t: dur(ad.wait) }) : videoSub(0, 1);
      h += `<div class="list-group">${vid('btn-chest-ad', t('chest.free'), sub, icon('i-chest'), !ad.ready)}</div>`;
    }
    for (const type of CHESTS) {
      const c = C.chests[type], n = owned[type] || 0;
      const sum = [`<span class="rc"><i class="gem"></i>${F(c.shards[0])}–${F(c.shards[1])}</span>`];
      if (c.boosts) sum.push(`<span class="rc">${icon('i-rocket')}×${c.boosts}</span>`);
      if (c.boostChance) sum.push(`<span class="rc">${icon('i-rocket')}${Math.round(c.boostChance * 100)}%</span>`);
      sum.push(`<span class="rc">${icon('i-orb')}${Math.round(c.itemChance * 100)}%</span>`);
      h += `<div class="chest-card ${type}"><div class="cc-top">${icon(CHEST_ICON[type], 'cc-ico')}<div class="cc-text"><div class="cc-name">${t('chest.' + type)}</div><div class="cc-have">${t('chest.have', { n })}</div></div></div>
        <div class="cc-sum">${sum.join('')}</div>
        <div class="row cc-btns"><button class="btn green mid" data-open="${type}"${n > 0 ? '' : ' disabled'}><span>${t('chest.open')}</span></button><button class="btn dark mid" data-buychest="${type}"><i class="gem"></i><span>${F(c.price)}</span></button></div></div>`;
    }
    h += `<button class="odds-link center" data-odds="1">${t('chest.odds')}</button>`;
    body.innerHTML = h;
    if (vids() && !ad.ready && ad.left > 0) ticks.rewards.push(() => { if (R().adChestState().ready) renderRewards(); });
  }

  // ------------------------------------------------------------------ opening a chest
  let coType = null;
  function openChest(type) {
    const res = R().openChest(type); if (!res) return;
    coType = type;
    const box = $('chestopen'), loot = $('co-loot'), ch = $('co-chest');
    $('co-title').textContent = t('chest.' + type);
    ch.className = 'co-chest ' + type; ch.innerHTML = icon(CHEST_ICON[type]);
    loot.innerHTML = '';
    $('co-next').hidden = true; $('co-done').hidden = true;
    box.classList.add('on');
    KABLAST.audio.unlock(); KABLAST.haptics.impact('medium');
    const rows = [`<div class="loot"><i class="gem"></i><b>+${F(res.shards + res.refund)}</b></div>`];
    for (const b of res.boosts) rows.push(`<div class="loot">${icon(BOOST_ICON[b])}<b>${t('boost.' + b)}</b></div>`);
    if (res.item) rows.push(`<div class="loot item">${icon(res.item.cat ? CAT_ICON[res.item.cat] : 'i-orb')}<b>${KABLAST.i18n.itemName(res.item)}</b><small>${t('chest.newItem')}</small></div>`);
    ch.classList.add('shake');
    setTimeout(() => {
      ch.classList.remove('shake'); ch.classList.add('burst'); won();
      rows.forEach((r, i) => setTimeout(() => { loot.insertAdjacentHTML('beforeend', r); if (i === rows.length - 1) done(); }, 140 * i));
      if (!rows.length) done();
    }, 650);
    function done() {
      const left = KABLAST.save.data.rw.chests[type] || 0;
      $('co-next').hidden = left <= 0; $('co-next-text').textContent = t('chest.openNext', { n: left });
      $('co-done').hidden = false;
      UI().setShards(KABLAST.save.data.shards);
      requestAnimationFrame(() => UI().fitAll(box));
    }
  }
  function closeChest() { $('chestopen').classList.remove('on'); rerender(); refreshTitle(); }

  // ------------------------------------------------------------------ the odds sheet (Guideline 3.1.1)
  function openOdds() {
    const C = CFG(), body = $('odds-body'), W = C.rewards.spin.wheel, total = W.reduce((a, s) => a + s.w, 0);
    let h = '';
    for (const type of CHESTS) {
      const c = C.chests[type];
      const lines = [t('odds.shards', { a: c.shards[0], b: c.shards[1] })];
      if (c.boosts) lines.push(t('odds.boosts', { n: c.boosts }));
      if (c.boostChance) lines.push(t('odds.boostChance', { p: Math.round(c.boostChance * 100) }));
      lines.push(t('odds.item', { p: Math.round(c.itemChance * 100), max: c.itemMaxPrice, r: c.itemRefund }));
      h += `<div class="odds-card"><div class="oc-head">${icon(CHEST_ICON[type])}<b>${t('chest.' + type)}</b><span class="oc-price"><i class="gem"></i>${F(c.price)}</span></div><ul>${lines.map(l => `<li>${l}</li>`).join('')}</ul></div>`;
    }
    h += `<p class="rw-note">${t('odds.never')}</p>`;
    h += `<div class="odds-grid"><div class="odds-head">${t('spin.title')}</div>${W.map(s => `<div class="og"><span class="og-r">${chips(s.reward)}</span><b>${Math.round(s.w / total * 1000) / 10}%</b></div>`).join('')}</div>`;
    body.innerHTML = h; body.scrollTop = 0;
    $('odds').classList.add('on');
    requestAnimationFrame(() => UI().fitAll($('odds')));
  }

  // ------------------------------------------------------------------ the Store tab: chests and boosts, for shards
  function renderStore() {
    const RW = R(), C = CFG();
    ticks.store = [];
    // chests: the same three as in Rewards › Chests, bought here for shards (what is inside is one tap away)
    let h = '';
    for (const type of CHESTS) {
      const c = C.chests[type], n = KABLAST.save.data.rw.chests[type] || 0;
      h += wide('dark offer', `data-buychest="${type}"`, CHEST_ICON[type], t('chest.' + type), t('chest.have', { n }), `<i class="gem"></i>${F(c.price)}`).replace('<em>', '<em class="sh">');
    }
    $('store-chests').innerHTML = h;
    // boosts: a free one for a video (where the portal can play one), and each for shards
    const left = RW.adLeft('boost');
    h = vids() ? vid('btn-boost-ad', t('boost.free'), videoSub(left, C.rewards.ads.boost.perDay), icon('i-gift'), left <= 0) : '';
    for (const id of RW.BOOST_IDS) h += wide('dark offer', `data-boostbuy="${id}"`, BOOST_ICON[id], t('boost.' + id), t('boostd.' + id), `<i class="gem"></i>${F(C.boosts[id].price)}`).replace('<em>', '<em class="sh">');
    $('store-boosts').innerHTML = h;
  }

  // ------------------------------------------------------------------ the game-over panel: double the shards
  let overShards = 0;
  function paintOver(r, again) {
    if (!again) overShards = r.shards;
    const b = $('btn-double'), can = R().canDouble();
    b.hidden = !can; b.disabled = false;
    if (can) $('double-num').textContent = '+' + F(R().doubleable());
    if (!again && r.xp && r.xp.levelUps > 0) setTimeout(() => UI().toast(t('toast.rankUp', { n: r.xp.level }), 2600), 900);
  }
  async function doubleTap() {
    const b = $('btn-double');
    const g = await withVideo(b, () => R().doubleRun());
    if (!g) return;
    overShards += g.shards; $('over-shards').textContent = '+' + F(overShards);
    gotToast(g); b.hidden = true;
  }

  // ------------------------------------------------------------------ wiring
  function rerender() {
    const m = UI().modalName && UI().modalName();
    if (m === 'rewards') renderRewards();
    else if (m === 'missions') renderMissions();
    else if (m === 'shop') UI().renderShopNow();
    if ($('odds').classList.contains('on')) openOdds();
    refreshTitle();
  }
  function init() {
    const on = (sel, fn) => document.addEventListener('click', e => {
      const el = e.target.closest(sel); if (!el || el.disabled) return;
      e.preventDefault(); tapFx(); fn(el, e);
    });
    on('#btn-rewards', () => openRewards());
    on('#btn-rank', () => openMissions('rank'));
    on('.boost', el => onBoost(el.dataset.boost));
    on('#mission-tabs .tab', el => { mtab = el.dataset.mtab; renderMissions(); $('mission-list').scrollTop = 0; if (mtab === 'rank') scrollToRank(); });
    on('#rewards-tabs .tab', el => { rtab = el.dataset.rtab; renderRewards(); $('rewards-body').scrollTop = 0; });
    on('.ms', el => onMilestone(el.dataset.ms));
    on('.rr', el => onRoad(+el.dataset.road, el.dataset.p === '1'));
    on('#rw-welcome', () => { gotToast(R().claimWelcome()); renderRewards(); refreshTitle(); });
    on('#btn-login', () => { const r = R().claimLogin(); if (r) { gotToast(r.got); renderRewards(); refreshTitle(); } });
    on('#btn-login2x', async el => { const g = await withVideo(el, () => R().doubleLogin()); if (g) { gotToast(g); renderRewards(); } });
    on('#btn-spin', el => doSpin(false, el));
    on('#btn-spin-ad', el => doSpin(true, el));
    on('#btn-mine', () => { const g = R().claimMine(); if (g) { gotToast(g); renderRewards(); refreshTitle(); } });
    on('#btn-mine-ad', async el => { const g = await withVideo(el, () => R().boostMine()); if (g) { gotToast(g); renderRewards(); } });
    on('#btn-chest-ad', async el => { const g = await withVideo(el, () => R().adChest()); if (g) { gotToast(g); renderRewards(); refreshTitle(); } });
    on('[data-open]', el => openChest(el.dataset.open));
    on('[data-buychest]', el => {
      const type = el.dataset.buychest, p = CFG().chests[type].price, S = KABLAST.save.data;
      if (R().buyChest(type)) { won(); UI().setShards(S.shards); UI().toast(t('chest.' + type) + ' · ' + t('chest.have', { n: S.rw.chests[type] })); rerender(); }
      else { KABLAST.haptics.notify('error'); UI().toast(t('toast.need', { n: p - S.shards })); }
    });
    on('[data-boostbuy]', el => {
      const id = el.dataset.boostbuy, p = CFG().boosts[id].price, S = KABLAST.save.data;
      if (R().buyBoost(id)) { won(); UI().setShards(S.shards); UI().toast('+1 ' + t('boost.' + id)); paintTrays(); }
      else { KABLAST.haptics.notify('error'); UI().toast(t('toast.need', { n: p - S.shards })); }
    });
    on('#btn-boost-ad', async el => { const g = await withVideo(el, () => R().adBoost()); if (g) { gotToast(g); renderStore(); paintTrays(); } });
    on('[data-odds], #btn-odds', () => openOdds());
    on('#odds-close', () => $('odds').classList.remove('on'));
    on('#co-next', () => { if (coType && (KABLAST.save.data.rw.chests[coType] || 0) > 0) openChest(coType); });
    on('#co-done', () => closeChest());
    on('#btn-double', () => doubleTap());
    R().onChange(() => { try { badges(); paintTrays(); } catch (e) {} });
    setInterval(tick, 1000);
  }
  function tick() {
    const m = UI().modalName && UI().modalName();
    const list = m === 'rewards' ? ticks.rewards : m === 'missions' ? ticks.missions : m === 'shop' ? ticks.store : [];
    for (const f of list.slice()) { try { f(); } catch (e) {} }
  }
  return { init, refreshTitle, paintTrays, openMissions, renderMissions, openRewards, renderRewards, renderStore, openOdds, openChest,
           paintOver, gotText, rerender, get mtab() { return mtab; }, get rtab() { return rtab; } };
})();
