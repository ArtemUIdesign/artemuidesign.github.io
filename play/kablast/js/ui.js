/* KABLAST — DOM UI: HUD, title, game over, skins shop, missions, toasts. */
KABLAST.ui = (() => {
  const $ = id => document.getElementById(id);
  const L = () => KABLAST.i18n, t = (k, v) => KABLAST.i18n.t(k, v);
  let G = null, els = {}, modal = null, toastTimer = 0, hintTimer = 0;

  function init(game) {
    G = game;
    els = { hud: $('hud'), title: $('title'), ready: $('ready'), over: $('over'), paused: $('paused'), shop: $('shop'), missions: $('missions'), rewards: $('rewards'), settings: $('settings'),
            score: $('score-num'), shards: $('shards-num'), hint: $('hint'), toast: $('toast'),
            levelName: $('level-name'), levelPhase: $('level-phase'), levelFill: $('level-fill') };
    // stop UI taps from reaching the game canvas
    const ui = $('ui');
    ['pointerdown', 'pointerup', 'pointercancel', 'touchstart', 'touchend', 'touchmove'].forEach(ev =>
      ui.addEventListener(ev, e => { if (e.target.closest('.btn, .icon-btn, .sheet, .panel, .boost, .rank-pill, #chestopen, #odds')) e.stopPropagation(); }, { passive: false }));
    /* The page itself must never pan or bounce, so a drag is cancelled - EXCEPT inside something that scrolls.
       This used to let through only the skin grid and the mission list: the Store tab, Settings (the language
       list) and a game-over panel taller than a small phone
       could not be dragged with a finger at all, while a desktop wheel still scrolled them. So the named lists
       stay, and anything that can actually scroll right now (overflow-y auto/scroll with content taller than
       itself) is let through too, whatever its class - a new list can no longer be forgotten here. */
    const SCROLLERS = '.skin-grid, .mission-list, #shard-shop, .set-scroll, .panel, .rw-body';
    const inScroller = el => {
      for (let n = el; n && n !== ui; n = n.parentElement) {
        if (n.scrollHeight > n.clientHeight + 1) { const o = getComputedStyle(n).overflowY; if (o === 'auto' || o === 'scroll') return true; }
      }
      return false;
    };
    ui.addEventListener('touchmove', e => { if (!e.target.closest(SCROLLERS) && !inScroller(e.target)) e.preventDefault(); }, { passive: false });

    const tap = (id, fn) => { const el = $(id); if (!el) return; el.addEventListener('click', e => { e.preventDefault(); KABLAST.audio.unlock(); KABLAST.audio.ui(); KABLAST.haptics.selection(); fn(e); }); };
    tap('btn-skins', () => openShop()); tap('btn-skins-2', () => openShop());
    tap('btn-missions', () => openMissions());
    KABLAST.rui.init();             // 1.2: the rewards hub, the missions tabs, the boosts, the chests, the store sections
    tap('btn-settings', () => openSettings());
    tap('btn-retry', () => G.retry());
    tap('btn-home', () => G.home());
    tap('btn-continue', () => G.continueRun());
    tap('btn-ad-shards', () => claimAdShards());
    document.querySelectorAll('#shop-tabs .tab').forEach(b => b.addEventListener('click', e => { e.preventDefault(); KABLAST.audio.ui(); KABLAST.haptics.selection(); setTab(b.dataset.tab); }));
    tap('btn-sound', () => { const s = KABLAST.save.data.settings; s.sound = !s.sound; KABLAST.save.write(); KABLAST.audio.setEnabled(s.sound); syncSettings(); });
    tap('btn-haptics', () => { const s = KABLAST.save.data.settings; s.haptics = !s.haptics; KABLAST.save.write(); syncSettings(); KABLAST.haptics.impact('medium'); });
    document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); KABLAST.audio.ui(); closeModal(); }));
    KABLAST.i18n.init();
    buildLanguages();
    syncSettings();
    // desktop: the hold-to-charge keys next to the launch hint; Settings shows Vibration only where it can work
    const touch = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    document.documentElement.classList.toggle('touch', touch);
    $('btn-haptics').hidden = !KABLAST.haptics.supported();
    fitAll();
  }

  // ---------- language ----------
  // One row per language, each written in its own language, the chosen one lit. Changing it re-paints every
  // screen in place: static text through data-i18n, and each dynamic line from the state it was built from.
  function buildLanguages() {
    const list = $('lang-list'); if (!list) return; list.innerHTML = '';
    for (const l of KABLAST.i18n.LANGS) {
      const b = document.createElement('button');
      b.className = 'btn dark mid lang'; b.dataset.lang = l.id; b.lang = l.tag;
      b.innerHTML = `<span class="lang-name">${l.name}</span><svg class="i lang-check"><use href="#i-check"/></svg>`;
      b.addEventListener('click', e => { e.preventDefault(); KABLAST.audio.unlock(); KABLAST.audio.ui(); KABLAST.haptics.selection(); setLanguage(l.id); });
      list.appendChild(b);
    }
    syncLanguages();
  }
  function syncLanguages() {
    const cur = KABLAST.i18n.lang;
    document.querySelectorAll('#lang-list .lang').forEach(b => { const on = b.dataset.lang === cur; b.classList.toggle('on', on); b.classList.toggle('cyan', on); b.classList.toggle('dark', !on); });
    const v = $('set-version'); if (v) v.textContent = t('set.version', { v: KABLAST.VERSION });
  }
  function setLanguage(id) {
    if (!KABLAST.i18n.set(id)) return;
    relocalize();
  }
  // everything that was written from code, written again in the new language
  function relocalize() {
    KABLAST.i18n.apply();
    syncLanguages(); syncSettings();
    lastLevelKey = ''; if (G && G.G && G.G.level) setLevel(G.G.level);
    setShield(!(G && G.G && G.G.orb) || G.G.orb.shield);
    if (els.title.classList.contains('on')) refreshTitle();
    if (els.over.classList.contains('on') && lastOver) showOver(lastOver, true);
    if (modal === 'shop') renderShop();
    if (modal === 'missions') renderMissions();
    if (modal === 'rewards') KABLAST.rui.renderRewards();
    const fontReady = document.fonts && document.fonts.load ? document.fonts.load(`20px ${KABLAST.i18n.font()}`) : Promise.resolve();
    fontReady.catch(() => {}).then(() => fitAll());
    fitAll();
  }

  // ---------- keeping every word inside its shape ----------
  // A label that is a little too long for its button in some language is set a little smaller instead of being
  // cut off or spilling out: the font steps down (never below 72%) until the text fits the room it has.
  const FIT = '.btn > span:not(.sweep):not(.play), .btn .lbl > span, .btn .lbl > b, .btn .lbl, .btn small, .btn em, .tab span, .sheet-title, .skin-name, .skin-price, '
    + '.m-reward, .pk-tag, .lvl-chip, .over-progress > span, .newbest, .launch-hint > span, .tag, .shards-pill, #shield-text, .lb-label span, '
    + '.over-stats span, .set-name, .lang-name, .best-label, .streak, .pk-bonus, '
    + '.d-n, .ms-at, .track-title, .track-pts, .cc-name, .cc-have, .rank-title, .shop-head > span, .odds-link, .loot b, .co-title, .road-cols span, .road-owned span';
  function fitAll(root) {
    root = root || document;
    root.querySelectorAll('.btn').forEach(clearSides);             // first give each label the room the pills leave it
    root.querySelectorAll(FIT).forEach(fit);
  }
  // A price pill or a medallion pinned to a button's side takes whatever width its words need (R$ 39,90/mês is
  // longer than $7.99/mo), so the button's padding on that side follows the pill instead of guessing a number.
  function clearSides(btn) {
    if (btn.offsetParent === null) return;
    for (const [sel, side] of [[':scope > em', 'Right'], [':scope > .play, :scope > .lead', 'Left']]) {
      const x = btn.querySelector(sel); if (!x || x.offsetParent === null) continue;
      const cs = getComputedStyle(x); if (cs.position !== 'absolute') continue;
      btn.style['padding' + side] = '';
      const need = x.offsetWidth + parseFloat(cs[side.toLowerCase()]) + 10;
      if (need > parseFloat(getComputedStyle(btn)['padding' + side])) btn.style['padding' + side] = need + 'px';
    }
  }
  // a few offer titles may take a second line instead (WRAP): they give up a little size first, then wrap at full size
  const WRAP = '.btn.wide .lbl > b, .btn.double .lbl > span';
  function fit(el) {
    if (!el || !el.isConnected) return;
    el.style.fontSize = ''; el.style.whiteSpace = '';
    if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return;       // not on screen: fitted when shown
    const over = () => el.scrollWidth - el.clientWidth > 0.5 || overflowsParent(el);
    if (!over()) return;
    const base = parseFloat(getComputedStyle(el).fontSize), wraps = el.matches(WRAP), floor = wraps ? 0.86 : 0.72;
    for (let k = 0.94; k >= floor - 1e-9 && base * k >= 9; k -= 0.04) { el.style.fontSize = (base * k).toFixed(2) + 'px'; if (!over()) return; }
    if (wraps) { el.style.fontSize = ''; el.style.whiteSpace = 'normal'; }
  }
  // a label inside a flex button can be squeezed without scrolling: compare it with the room its shape gives it
  // (a button's padding is where its price pill and medallion sit, so a label has to stay inside the padding)
  const SHAPE = '.btn, .tab, .skin-card, .m-reward, .shards-pill, .shield-pill, .streak, .pk-bonus, .pk-tag, .newbest, .lvl-chip, .day, .ms, .chest-card, .track, .rank-card';
  function overflowsParent(el) {
    const inEm = el.closest('.btn em');
    const p = inEm || (el.matches('.btn em') ? el.parentElement : el.closest(SHAPE)) || el.parentElement; if (!p || p === el) return false;
    const cs = getComputedStyle(p), pr = p.getBoundingClientRect();
    // the rects are on screen, the paddings in CSS px: on a wide screen the UI box is scaled (game.js resize)
    const k = p.offsetWidth ? pr.width / p.offsetWidth : 1;
    const left = pr.left + (parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth)) * k, right = pr.right - (parseFloat(cs.paddingRight) + parseFloat(cs.borderRightWidth)) * k;
    const r = document.createRange(); r.selectNodeContents(el); const tr = r.getBoundingClientRect();
    return tr.width > 0 && (tr.left < left - 0.5 || tr.right > right + 0.5);
  }

  function syncSettings() {
    const s = KABLAST.save.data.settings;
    $('btn-sound').classList.toggle('on', s.sound); $('btn-haptics').classList.toggle('on', s.haptics);
    $('btn-sound').setAttribute('aria-pressed', String(!!s.sound)); $('btn-haptics').setAttribute('aria-pressed', String(!!s.haptics));
  }
  function show(name) {
    if (name === 'ready') KABLAST.rui.paintTrays();
    ['title', 'ready', 'over', 'paused'].forEach(n => els[n].classList.toggle('on', n === name));
    requestAnimationFrame(() => fitAll(els[name] || document));
    els.hud.classList.toggle('on', name === 'hud' || name === 'ready' || name === 'over' || name === 'paused');
    els.hud.classList.toggle('over', name === 'over');
    if (name === 'title') refreshTitle();
  }
  let zoneTimer = 0;
  function zone(name, sub, kind, kicker) {
    const z = $('zone'); clearTimeout(zoneTimer);
    z.innerHTML = (kicker ? `<span class="kick">${kicker}</span>` : '') + `<span class="zn">${name}</span>` + (sub ? `<small>${sub}</small>` : ''); z.className = kind || ''; z.classList.add('on');
    fit(z.querySelector('.zn'));
    zoneTimer = setTimeout(() => z.classList.remove('on'), kind === 'gate' ? 2000 : kind === 'shield' ? 2300 : 2600);
  }
  function hideZone() { clearTimeout(zoneTimer); $('zone').classList.remove('on'); }
  // level progress in the HUD
  let lastLevelKey = '';
  // the backdrop beside the playfield on a wide screen follows the level's sky (and the world theme), a shade darker
  let lastSky = '';
  function syncSky(lv) {
    const pal = KABLAST.cosmetics.palette((lv || (G && G.G && G.G.level) || KABLAST.levels.at(0)).palette);
    const key = pal.join(); if (key === lastSky) return; lastSky = key;
    const st = document.documentElement.style, U = KABLAST.U;
    pal.forEach((c, i) => st.setProperty('--sky' + i, U.mix(c, '#000000', 0.3)));
  }
  function setLevel(lv) {
    syncSky(lv);
    const pct = Math.round(lv.t * 100);
    const key = lv.num + ':' + lv.phase + ':' + pct;
    if (key === lastLevelKey) return; lastLevelKey = key;
    els.levelName.textContent = t('level.caps', { n: lv.num });
    els.levelPhase.textContent = lv.phase === 'gate' ? t('phase.gate') : lv.phase === 'bonus' ? t('phase.bonus') : lv.phase === 'relief' ? t('phase.calm') : L().upper(L().levelName(lv));
    els.levelPhase.className = lv.phase === 'gate' ? 'gate' : lv.phase === 'bonus' ? 'bonus' : '';
    fit(els.levelName); fit(els.levelPhase);
    els.levelFill.style.width = pct + '%';
    document.querySelectorAll('.lb-gate').forEach(e => e.hidden = lv.index < (KABLAST.CFG.levels.noGateLevels || 1));
  }
  // the ONE shield indicator: lit while it protects you, cracked + "LAST LIFE" once it has broken
  function setShield(on, justBroke) {
    const el = $('hud-shield'); if (!el) return;
    el.hidden = !KABLAST.CFG.shield.enabled;
    el.classList.toggle('broken', !on);
    $('shield-text').textContent = on ? t('shield.on') : t('shield.off'); fit($('shield-text'));
    if (justBroke) { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; }   // restart the hit animation
  }
  function setContinueBusy(b) {
    const el = $('btn-continue'); if (!el) return;
    el.disabled = b;
    if (b) $('continue-sub').textContent = t('loading'); else paintContinue();
  }
  function refreshTitle() {
    const S = KABLAST.save.data;
    $('title-best').textContent = KABLAST.U.fmt(S.best);
    const st = KABLAST.missions.streak(); $('title-streak').textContent = st >= 2 ? t('streak', { n: st }) : '';
    KABLAST.rui.refreshTitle();     // the rank chip, the boost trays, both badges
    setShards(S.shards);
    requestAnimationFrame(() => fitAll(els.title));
  }
  function setScore(m) { els.score.textContent = KABLAST.U.fmt(m); }
  function setShards(n) { const v = KABLAST.U.fmt(n); els.shards.textContent = v; document.querySelectorAll('.shards-live').forEach(e => e.textContent = v); }
  function hint(text, ms = 2600) {
    clearTimeout(hintTimer);
    if (!text) { els.hint.classList.remove('on'); return; }
    els.hint.textContent = text; els.hint.classList.add('on');
    if (ms > 0) hintTimer = setTimeout(() => els.hint.classList.remove('on'), ms);
  }
  function toast(text, ms = 1800) { clearTimeout(toastTimer); els.toast.textContent = text; els.toast.classList.add('on'); toastTimer = setTimeout(() => els.toast.classList.remove('on'), ms); }

  // ---------- the revive offer ----------
  // ONE revive per run, and a rewarded video is the only way to take it. It is drawn only when the portal can play a
  // video (game.js passes continuesLeft 0 otherwise); RETRY then becomes the primary action. While it is on offer,
  // CONTINUE and RETRY sit side by side at the same size, so declining the video is as easy as taking it.
  let lastOver = null;
  function paintContinue() {
    const r = lastOver; if (!r) return;
    const cb = $('btn-continue'), left = r.continuesLeft || 0;
    const offer = left > 0;
    cb.hidden = !offer;
    cb.disabled = false;
    $('continue-left').textContent = t('badge.once');
    $('continue-sub').textContent = t('continue.video');
    fit(cb.querySelector('.lbl > span')); fit($('continue-sub')); fit($('continue-left'));
    // the primary button is CONTINUE when it is on offer, otherwise RETRY
    $('btn-retry').classList.toggle('primary', !offer);
    els.over.classList.toggle('offer', offer);
  }

  // the final number is written first, then counted up to on the next frames — so anything that reads the DOM
  // (or a frozen clock) always sees the real value, and a player sees it climb
  let countRaf = 0;
  function countUp(el, to, dur = 750) {
    el.textContent = KABLAST.U.fmt(to); cancelAnimationFrame(countRaf);
    if (!(to > 0) || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    const t0 = performance.now() + 120;
    const step = now => { const k = Math.max(0, Math.min(1, (now - t0) / dur)), e = 1 - Math.pow(1 - k, 3); el.textContent = KABLAST.U.fmt(Math.round(to * e)); if (k < 1) countRaf = requestAnimationFrame(step); };
    countRaf = requestAnimationFrame(step);
  }
  function showOver(r, again) {
    if (again) $('over-score').textContent = KABLAST.U.fmt(r.score); else countUp($('over-score'), r.score);
    $('over-best').textContent = KABLAST.U.fmt(r.best);
    $('over-newbest').hidden = !r.newBest;
    $('over-reason').textContent = r.reason === 'shard' ? t('reason.shard') : t('reason.dark');
    $('over-chain').textContent = r.bestChain; $('over-crystals').textContent = r.crystals; $('over-shards').textContent = '+' + r.shards;
    lastOver = r;
    paintContinue();
    KABLAST.rui.paintOver(r, again);
    const lv = r.level;
    $('over-level').textContent = t('level', { n: lv.num });
    $('over-fill').style.width = Math.round(lv.t * 100) + '%';
    const toGate = Math.max(0, Math.round((0.75 - lv.t) * KABLAST.CFG.levels.lengthM)), toNext = Math.max(0, Math.round((1 - lv.t) * KABLAST.CFG.levels.lengthM));
    const tutorialLevel = lv.index < (KABLAST.CFG.levels.noGateLevels || 1);
    $('over-zone').textContent = lv.phase === 'gate' ? t('over.gate') : L().levelName(lv);
    $('over-progress-text').textContent = tutorialLevel || lv.phase === 'gate' ? t('over.toLevel', { m: toNext, n: lv.num + 1 }) : t('over.toGate', { m: toGate });
    if (!again) show('over'); else requestAnimationFrame(() => fitAll(els.over));
  }

  // ---------- skins & cosmetics shop ----------
  let shopTab = 'orb';
  // opens on a tab (the Store from an offer or an empty boost), optionally scrolled to one of its sections
  function openShop(tab, anchor) {
    if (tab) setTab(tab, true);
    renderShop(); openModal('shop');
    if (anchor) requestAnimationFrame(() => { const a = $(anchor), box = $('shard-shop'); if (a && box && !a.hidden) box.scrollTop = Math.max(0, a.offsetTop - box.offsetTop - 6); });
  }
  function setTab(t, quiet) { shopTab = t; document.querySelectorAll('#shop-tabs .tab').forEach(b => b.classList.toggle('on', b.dataset.tab === t)); if (!quiet) renderShop(); }
  const isOrb = it => !it.cat;
  const ownedItem = it => isOrb(it) ? KABLAST.skins.owned(it.id) : KABLAST.cosmetics.owned(it.id);
  const equipped = it => isOrb(it) ? KABLAST.save.data.skin === it.id : KABLAST.cosmetics.current(it.cat).id === it.id;
  function selectItem(it) { if (isOrb(it)) KABLAST.skins.select(it.id); else KABLAST.cosmetics.select(it.id); G.skinChanged(); syncSky(); }
  function grantItem(id) { if (KABLAST.skins.byId[id]) KABLAST.skins.grant(id); else KABLAST.cosmetics.grant(id); }
  function itemsOf(tab) { return tab === 'orb' ? KABLAST.skins.list : KABLAST.cosmetics.cats[tab].list; }

  // previews are drawn with the real sprite / trail / palette code, so what you buy is what you get
  function previewCrystal(cv, sk) {
    // three stones on a soft pool of their own light, the middle one forward — a jeweller's tray
    const c = cv.getContext('2d'), S = KABLAST.sprites, pal = sk.palette || KABLAST.CFG.colors.map(x => x.hex), W = cv.width, H = cv.height;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
    const spots = [[0, 30, 44, 10, 1.75], [2, 90, 44, 10, 1.75], [1, 60, 38, 11, 2.2]];
    c.globalCompositeOperation = 'lighter';
    for (const [ci, x, y, r, z] of spots) { const gs = r * z * 3.6; c.globalAlpha = 0.5; c.drawImage(S.glow(pal[ci], 32), x - gs / 2, y - gs / 2, gs, gs); }
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    for (const [ci, x, y, r, z] of spots) { const spr = S.gem(pal[ci], r, sk), w = spr.width / spr.ss * z; c.drawImage(spr, x - w / 2, y - w / 2, w, w); }
  }
  function previewWorld(cv, w) {
    // a tiny window into the world: its sky, its light, its dust, its walls and its Dark, and one stone to judge it by
    const c = cv.getContext('2d'), K = KABLAST.cosmetics, S = KABLAST.sprites, W = cv.width, H = cv.height;
    const pal = K.palette(KABLAST.CFG.levels.defs.drift.bg, w), D = K.darkSea(w), acc = w.accent || '#ffffff', Wc = K.wall(w), dust = K.dust(w);
    c.setTransform(1, 0, 0, 1, 0, 0);
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, pal[0]); g.addColorStop(0.55, pal[1]); g.addColorStop(1, pal[2]);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const rng = KABLAST.U.mulberry32(3);
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.16; c.drawImage(S.glow(dust[1], 64), W * 0.35, -H * 0.4, W * 0.9, W * 0.9);
    c.globalAlpha = 0.12; c.drawImage(S.glow(dust[0], 64), -W * 0.3, H * 0.1, W * 0.8, W * 0.8);
    c.save(); c.translate(W * 0.55, -4); c.rotate(0.22); c.globalAlpha = 0.14; c.drawImage(S.beam(KABLAST.U.mix(dust[0], '#ffffff', 0.4)), -14, 0, 28, H * 1.3); c.restore();
    for (let i = 0; i < 5; i++) { const s = 4 + rng() * 6; c.globalAlpha = 0.5; c.drawImage(S.bokeh(rng() < 0.5 ? dust[0] : dust[1]), rng() * W - s, rng() * H * 0.7 - s, s * 2, s * 2); }
    for (let i = 0; i < 14; i++) { const s = 1.2 + rng() * 1.6; c.globalAlpha = 0.4 + rng() * 0.5; c.drawImage(S.glow(rng() < 0.5 ? dust[0] : dust[1], 6), rng() * W - s, rng() * H * 0.8 - s, s * 2, s * 2); }
    c.globalAlpha = 1; c.strokeStyle = acc; c.fillStyle = acc; c.lineWidth = 1.5;
    if (w.fx === 'aurora') { c.lineCap = 'round'; for (let k = 0; k < 2; k++) for (const [lw, a] of [[12, 0.12], [6, 0.22], [2, 0.5]]) { c.globalAlpha = a; c.lineWidth = lw; c.beginPath(); for (let x = 0; x <= W; x += 6) { const y = 16 + k * 10 + Math.sin(x * 0.07 + k) * 5; x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); } }
    else if (w.fx === 'grid') { c.globalAlpha = 0.45; c.lineWidth = 1; for (let y = 8; y < H; y += 12) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); } for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(W / 2 + k * 22, 0); c.lineTo(W / 2 + k * 22, H); c.stroke(); } c.globalAlpha = 0.5; c.drawImage(S.glow(acc, 32), W / 2 - 30, -24, 60, 60); }
    else if (w.fx === 'rain') { c.globalAlpha = 0.55; c.lineWidth = 1; for (let i = 0; i < 16; i++) { const x = rng() * W, y = rng() * H; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 2, y - 10); c.stroke(); } }
    else if (w.fx === 'bubbles') { c.lineWidth = 1; for (let i = 0; i < 8; i++) { const x = rng() * W, y = rng() * H * 0.8, r = 2 + rng() * 4; c.globalAlpha = 0.5; c.drawImage(S.bokeh(acc), x - r, y - r, r * 2, r * 2); c.globalAlpha = 0.8; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke(); } }
    else if (w.fx === 'petals') { c.globalCompositeOperation = 'source-over'; for (let i = 0; i < 9; i++) { c.save(); c.translate(rng() * W, rng() * H * 0.8); c.rotate(rng() * 6); c.globalAlpha = 0.75; c.beginPath(); c.ellipse(0, 0, 3.5, 1.5, 0, 0, Math.PI * 2); c.fill(); c.restore(); } c.globalCompositeOperation = 'lighter'; }
    else if (w.fx) { const spr = S.glow(acc, 12); for (let i = 0; i < 16; i++) { const s = w.fx === 'stars' ? 2 + rng() * 2 : 3 + rng() * 5; c.globalAlpha = 0.4 + rng() * 0.6; c.drawImage(spr, rng() * W - s, rng() * H * 0.85 - s, s * 2, s * 2); } }
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    // walls
    for (const side of [0, 1]) {
      c.beginPath(); c.moveTo(side ? W : 0, 0);
      for (let y = 0; y <= H; y += 10) { const x = 5 + ((y * 7 + side * 13) % 9); c.lineTo(side ? W - x : x, y); }
      c.lineTo(side ? W : 0, H); c.closePath(); c.fillStyle = Wc.fill; c.fill();
      c.globalAlpha = 0.7; c.strokeStyle = Wc.line; c.lineWidth = 1; c.stroke(); c.globalAlpha = 1;
    }
    // one stone and the orb, lit by this world
    const gem = S.gem(KABLAST.cosmetics.gemHex(0), 7);
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.45; c.drawImage(S.glow(KABLAST.cosmetics.gemHex(0), 32), W * 0.3 - 18, H * 0.38 - 18, 36, 36); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    const gw = gem.width / gem.ss * 1.4; c.drawImage(gem, W * 0.3 - gw / 2, H * 0.38 - gw / 2, gw, gw);
    const sk = KABLAST.skins.current();
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.8; c.drawImage(S.glow(sk.cycle ? '#00ffb3' : sk.halo, 32), W * 0.66 - 16, H * 0.52 - 16, 32, 32); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    KABLAST.render.drawOrbAt(c, W * 0.66, H * 0.52, 6.5, KABLAST.skins.liveColors(sk, 0));
    // the Dark
    const dg = c.createLinearGradient(0, H - 18, 0, H); dg.addColorStop(0, D.top); dg.addColorStop(1, D.bottom);
    c.beginPath(); c.moveTo(0, H - 16); for (let x = 0; x <= W; x += 8) c.lineTo(x, H - 16 + Math.sin(x * 0.12) * 2); c.lineTo(W, H); c.lineTo(0, H); c.closePath();
    c.fillStyle = dg; c.fill();
    c.globalCompositeOperation = 'lighter'; c.strokeStyle = D.edge; c.globalAlpha = 0.35; c.lineWidth = 5; c.stroke(); c.globalAlpha = 1; c.lineWidth = 1.4; c.stroke(); c.globalCompositeOperation = 'source-over';
  }
  function renderShop() {
    const grid = $('skin-grid'), S = KABLAST.save.data;
    const currency = shopTab === 'shards';
    grid.hidden = currency; $('shard-shop').hidden = !currency;
    $('sheet-title-text').textContent = currency ? t('sheet.shards') : t('skins');
    if (currency) { renderShardShop(); requestAnimationFrame(() => fitAll(els.shop)); return; }
    grid.innerHTML = '';
    grid.className = 'skin-grid ' + shopTab;
    for (const it of itemsOf(shopTab)) {
      const own = ownedItem(it), sel = equipped(it);
      const card = document.createElement('div');
      card.className = 'skin-card' + (sel ? ' sel' : '') + (own ? '' : ' locked') + (it.premium ? ' premium' : '');
      let price;
      if (sel) price = `<div class="skin-price own">${t('price.inUse')}</div>`;
      else if (own) price = `<div class="skin-price own">${t('price.owned')}</div>`;
      else price = `<div class="skin-price${it.premium ? ' prem' : ''} ${S.shards >= it.price ? 'can' : ''}"><i class="gem"></i>${KABLAST.U.fmt(it.price)}</div>`;
      let prev;
      if (shopTab === 'orb') prev = '<canvas class="skin-prev orb" width="216" height="216"></canvas>';
      else if (shopTab === 'trail') prev = '<canvas class="skin-prev trail" width="120" height="120"></canvas>';
      else prev = '<canvas class="skin-prev" width="120" height="80"></canvas>';
      card.innerHTML = `${prev}<div class="skin-name">${L().itemName(it)}</div>${price}`;
      const cv = card.querySelector('canvas');
      if (cv) { if (shopTab === 'orb') KABLAST.render.previewOrb(cv, it, 0); else if (shopTab === 'crystal') previewCrystal(cv, it); else if (shopTab === 'world') previewWorld(cv, it); else KABLAST.render.previewTrail(cv, KABLAST.skins.current(), it, G.G.tReal || 0); }
      card.addEventListener('click', () => onItemTap(it));
      grid.appendChild(card);
    }
    requestAnimationFrame(() => fitAll(els.shop));
  }
  async function onItemTap(it) {
    KABLAST.audio.unlock();
    const S = KABLAST.save.data;
    if (ownedItem(it)) { selectItem(it); KABLAST.audio.ui(); KABLAST.haptics.selection(); renderShop(); return; }
    if (S.shards >= it.price) {
      S.shards -= it.price; grantItem(it.id); selectItem(it); KABLAST.save.write();
      KABLAST.audio.buy(); KABLAST.haptics.notify('success'); setShards(S.shards); toast(t('toast.unlocked', { name: L().itemName(it) })); renderShop();
    } else { KABLAST.haptics.notify('error'); toast(t('toast.need', { n: it.price - S.shards })); }
  }
  // ---------- the Store tab ----------
  // Chests and boosts for shards, and (only where the portal can play a video) the daily free shards.
  function renderShardShop() {
    requestAnimationFrame(() => fitAll(els.shop));
    const A = KABLAST.ads, CFG = KABLAST.CFG.adShards;
    KABLAST.rui.renderStore();      // chests, boosts
    const video = A.available(), left = A.adShardsLeft();
    $('head-shards').hidden = !video;
    const btn = $('btn-ad-shards');
    btn.hidden = !video;
    btn.disabled = left <= 0;
    btn.classList.toggle('spent', left <= 0);
    $('ad-shards-num').textContent = KABLAST.U.fmt(CFG.reward);
    $('ad-shards-sub').textContent = left <= 0 ? t('adshards.spent', { t: A.resetsIn() }) : t('adshards.video', { left, n: CFG.perDay });
  }
  async function claimAdShards() {
    const btn = $('btn-ad-shards');
    btn.disabled = true; $('ad-shards-sub').textContent = t('loading');
    const got = await KABLAST.ads.claimDailyShards();
    if (got > 0) { G.grantShards(got); KABLAST.audio.buy(); KABLAST.haptics.notify('success'); toast(t('toast.gotShards', { n: got })); }
    else if (KABLAST.ads.lastMiss() === 'noad') toast(t('toast.noVideo'));
    else toast(t('toast.noReward'));
    renderShardShop();
  }
  // ---------- missions ----------
  function openMissions(tab) { KABLAST.rui.openMissions(tab); }
  function renderMissions() { KABLAST.rui.renderMissions(); }
  function openRewards(tab) { KABLAST.rui.openRewards(tab); }
  function openSettings() { syncSettings(); syncLanguages(); openModal('settings'); requestAnimationFrame(() => fitAll(els.settings)); }

  function openModal(name) { if (modal && modal !== name) els[modal].classList.remove('on'); modal = name; els[name].classList.add('on'); }
  function closeModal() { if (!modal) return; els[modal].classList.remove('on'); modal = null; refreshTitle(); }
  const isModal = () => !!modal;
  const modalName = () => modal;
  function renderShopNow() { renderShop(); }

  return { init, show, zone, hideZone, setLevel, setShield, setScore, setShards, hint, toast, showOver, openShop, openMissions, openRewards, openSettings, openModal, closeModal, isModal, modalName, renderShopNow, refreshTitle, setContinueBusy, setLanguage, relocalize, fitAll,
           get ready() { return !!G; } };
})();
