/*!
 * webplatform.js — one adapter for the CrazyGames HTML5 SDK v3 and the Poki SDK v2.
 * Loaded as the first scripts of <head> by tools/package.mjs:
 *   <script>window.WEBPLATFORM_TARGET="crazygames"|"poki"; window.WEBPLATFORM_OPTIONS={...}</script>
 *   <script src="<platform sdk>"></script>
 *   <script src="webplatform.js"></script>
 * Everything is safe to call when the SDK is missing (ad blocker, local file, no target):
 * calls become no-ops, midgame() resolves, rewarded() resolves false.
 *
 * Game-facing API (window.WebPlatform):
 *   target                      'crazygames' | 'poki' | 'none'
 *   whenReady                   Promise, resolves after SDK init (or failure / 6 s timeout)
 *   loadingDone()               call once, when the first menu/gameplay screen is ready
 *   gameplayStart()/gameplayStop()  deduplicated; start on first real input / unpause, stop on
 *                               game over, level end, pause, menus, shop
 *   midgame([reason]) -> Promise<void>   natural break (after game over / level end / before
 *                               "play again"). Platform decides if an ad shows. Audio is muted,
 *                               input blocked, gameplay stopped while an ad runs.
 *   rewardedEnabled() -> bool   show rewarded-ad buttons ONLY when true. Check it every time an offer is
 *                               about to be shown (it turns true on CrazyGames once the portal enables ads;
 *                               event 'rewardedchange' fires then)
 *   rewarded([reason]) -> Promise<bool>  true = grant the reward
 *   happytime()                 rare big moments (new record, boss beaten)
 *   on(evt, fn) / off(evt, fn)  'adstart' 'adend' 'audiomute' 'audiounmute'
 *   audioBlocked() -> bool      true while an ad runs or the platform asked for mute
 *   isMobile() -> bool, locale() -> 'en' etc.
 *   openURL(url)                opens a link in a new tab (privacy policy only)
 */
(function () {
  'use strict';
  if (window.WebPlatform) return;

  var TARGET = String(window.WEBPLATFORM_TARGET || 'none');
  var OPTS = window.WEBPLATFORM_OPTIONS || {};
  var DEBUG = !!OPTS.debug || /[?&]wpdebug=1/.test(location.search);
  function dbg() { if (DEBUG) try { console.log.apply(console, ['[WebPlatform]'].concat([].slice.call(arguments))); } catch (e) {} }

  /* ------------------------------------------------------------------ storage safety
   * Third-party iframes in private windows / strict browsers can throw on localStorage.
   * Replace it with an in-memory store so the game never crashes. */
  function memStorage() {
    var m = Object.create(null);
    return {
      getItem: function (k) { k = String(k); return k in m ? m[k] : null; },
      setItem: function (k, v) { m[String(k)] = String(v); },
      removeItem: function (k) { delete m[String(k)]; },
      clear: function () { m = Object.create(null); },
      key: function (i) { var ks = Object.keys(m); return i < ks.length ? ks[i] : null; },
      get length() { return Object.keys(m).length; }
    };
  }
  ['localStorage', 'sessionStorage'].forEach(function (name) {
    try { var s = window[name]; s.setItem('__wp_probe', '1'); s.removeItem('__wp_probe'); }
    catch (e) { try { Object.defineProperty(window, name, { value: memStorage(), configurable: true }); } catch (e2) {} }
  });

  /* ------------------------------------------------------------------ events */
  var handlers = {};
  function on(evt, fn) { (handlers[evt] = handlers[evt] || []).push(fn); }
  function off(evt, fn) { var a = handlers[evt]; if (a) { var i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } }
  function emit(evt, arg) {
    (handlers[evt] || []).slice().forEach(function (fn) { try { fn(arg); } catch (e) { console.error(e); } });
    try { window.dispatchEvent(new CustomEvent('webplatform:' + evt, { detail: arg })); } catch (e) {}
  }

  /* ------------------------------------------------------------------ audio control
   * Every AudioContext the game creates and every <audio>/<video> it plays is tracked, so ads and
   * the platform's mute setting silence the game without game-specific code. */
  var adActive = false, platformMute = false;
  function audioBlocked() { return adActive || platformMute; }
  var contexts = [];
  var media = new Set();
  var NativeAC = window.AudioContext || window.webkitAudioContext;
  var acResume = null, acSuspend = null;
  if (NativeAC) {
    acResume = NativeAC.prototype.resume;
    acSuspend = NativeAC.prototype.suspend;
    var Wrapped = function AudioContext(opts) {
      var c = arguments.length ? new NativeAC(opts) : new NativeAC();
      c.__wpWant = true; // a fresh context wants to run (it may still need a user gesture)
      contexts.push(c);
      if (audioBlocked()) { try { acSuspend.call(c); } catch (e) {} }
      // a resume() that was already pending when an ad started can still land later: undo it
      try { c.addEventListener('statechange', function () { if (audioBlocked() && c.state === 'running') { try { acSuspend.call(c); } catch (e) {} } }); } catch (e) {}
      return c;
    };
    Wrapped.prototype = NativeAC.prototype;
    try { Object.setPrototypeOf(Wrapped, NativeAC); } catch (e) {}
    NativeAC.prototype.resume = function () {
      this.__wpWant = true;
      if (audioBlocked()) return Promise.resolve();
      return acResume.call(this);
    };
    NativeAC.prototype.suspend = function () {
      this.__wpWant = false;
      return acSuspend.call(this);
    };
    try { window.AudioContext = Wrapped; } catch (e) {}
    if (window.webkitAudioContext) try { window.webkitAudioContext = Wrapped; } catch (e) {}
  }
  var HME = window.HTMLMediaElement && window.HTMLMediaElement.prototype;
  var mePlay = HME && HME.play;
  if (HME && mePlay) {
    HME.play = function () {
      media.add(this);
      if (audioBlocked()) { this.__wpResume = true; return Promise.resolve(); }
      return mePlay.apply(this, arguments);
    };
  }
  var silenced = false;
  function applyAudio() {
    var block = audioBlocked();
    if (block === silenced) return;
    silenced = block;
    if (block) {
      contexts.forEach(function (c) { try { if (c.state !== 'closed') acSuspend.call(c); } catch (e) {} });
      media.forEach(function (el) { try { if (!el.paused) { el.__wpResume = true; el.pause(); } } catch (e) {} });
      emit('audiomute');
    } else {
      contexts.forEach(function (c) { try { if (c.__wpWant && c.state === 'suspended') acResume.call(c); } catch (e) {} });
      media.forEach(function (el) { try { if (el.__wpResume) { el.__wpResume = false; var p = mePlay.call(el); if (p && p.catch) p.catch(function () {}); } } catch (e) {} });
      emit('audiounmute');
    }
  }
  function audioRunning() { // used by the test mocks to detect sound during ads
    return contexts.some(function (c) { return c.state === 'running'; }) ||
      Array.from(media).some(function (el) { return !el.paused && !el.muted && el.volume > 0; });
  }

  /* ------------------------------------------------------------------ input blocking during ads */
  var shield = null;
  function swallow(e) { if (adActive) { e.stopPropagation(); e.stopImmediatePropagation && e.stopImmediatePropagation(); if (e.cancelable) e.preventDefault(); } }
  ['keydown', 'keyup', 'keypress'].forEach(function (t) { window.addEventListener(t, swallow, true); });
  function setShield(onOff) {
    if (onOff) {
      if (!shield) {
        shield = document.createElement('div');
        shield.setAttribute('data-webplatform-shield', '');
        shield.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147483647;background:transparent;touch-action:none;';
        ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'touchstart', 'touchend', 'wheel'].forEach(function (t) {
          shield.addEventListener(t, function (e) { e.stopPropagation(); if (e.cancelable) e.preventDefault(); }, { passive: false });
        });
      }
      (document.body || document.documentElement).appendChild(shield);
    } else if (shield && shield.parentNode) {
      shield.parentNode.removeChild(shield);
    }
  }

  /* ------------------------------------------------------------------ page scroll prevention
   * The game sits in a scrollable portal page: arrows/space/wheel must not scroll it.
   * Wheel is only prevented when nothing inside the game can scroll (keeps shop lists working). */
  function isEditable(t) { return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); }
  window.addEventListener('keydown', function (e) {
    if (isEditable(e.target)) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Spacebar', 'PageUp', 'PageDown', 'Home', 'End'].indexOf(e.key) >= 0 && e.cancelable) e.preventDefault();
  }, { passive: false });
  function canScroll(el, dy, dx) {
    for (; el && el !== document.body && el !== document.documentElement && el.nodeType === 1; el = el.parentNode) {
      var cs = getComputedStyle(el);
      if (dy && /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1) return true;
      if (dx && /(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1) return true;
    }
    return false;
  }
  window.addEventListener('wheel', function (e) {
    if (e.ctrlKey) return; // pinch-zoom gesture on trackpads
    if (!canScroll(e.target, e.deltaY, e.deltaX) && e.cancelable) e.preventDefault();
  }, { passive: false });

  /* ------------------------------------------------------------------ SDK detection */
  function cg() { return TARGET === 'crazygames' && window.CrazyGames && window.CrazyGames.SDK ? window.CrazyGames.SDK : null; }
  function poki() { return TARGET === 'poki' && window.PokiSDK ? window.PokiSDK : null; }
  var hasSdk = !!(cg() || poki());

  var ready = false, sdkOk = false;
  var queue = [];
  function whenReadyRun(fn) { if (ready) fn(); else queue.push(fn); }
  function withTimeout(p, ms) {
    return new Promise(function (res) {
      var done = false;
      var t = setTimeout(function () { if (!done) { done = true; res(false); } }, ms);
      Promise.resolve(p).then(function () { if (!done) { done = true; clearTimeout(t); res(true); } },
        function () { if (!done) { done = true; clearTimeout(t); res(false); } });
    });
  }
  /* CrazyGames Data module: after init, window.localStorage is replaced by a store that writes to BOTH
   * the real localStorage and SDK.data (cloud save for logged-in players, synced across devices) and reads
   * SDK.data first (falls back to — and migrates — the local value). Games must not read saves before
   * WebPlatform.whenReady resolves. Disable with WEBPLATFORM_OPTIONS.cgData = false. */
  function installCgData() {
    var D = cg() && cg().data;
    if (!D || OPTS.cgData === false) return false;
    try { D.getItem('__wp_probe'); } catch (e) { dbg('data module unavailable', e); return false; }
    var real = window.localStorage;
    function rg(k) { try { return real.getItem(k); } catch (e) { return null; } }
    var store = {
      getItem: function (k) {
        k = String(k);
        var v = null;
        try { v = D.getItem(k); } catch (e) {}
        if (v === null || v === undefined) {
          v = rg(k);
          if (v !== null) { try { D.setItem(k, v); } catch (e) {} }
        }
        return v === undefined ? null : v;
      },
      setItem: function (k, v) {
        k = String(k); v = String(v);
        try { real.setItem(k, v); } catch (e) {}
        try { D.setItem(k, v); } catch (e) {}
      },
      removeItem: function (k) {
        k = String(k);
        try { real.removeItem(k); } catch (e) {}
        try { D.removeItem(k); } catch (e) {}
      },
      clear: function () { try { real.clear(); } catch (e) {} try { D.clear(); } catch (e) {} },
      key: function (i) { try { return real.key(i); } catch (e) { return null; } },
      get length() { try { return real.length; } catch (e) { return 0; } }
    };
    var api = { getItem: 1, setItem: 1, removeItem: 1, clear: 1, key: 1, length: 1 };
    var proxy = typeof Proxy === 'function' ? new Proxy(store, {
      get: function (t, p) { if (typeof p !== 'string' || api[p]) return t[p]; var v = t.getItem(p); return v === null ? undefined : v; },
      set: function (t, p, v) { if (typeof p === 'string' && !api[p]) t.setItem(p, v); return true; },
      deleteProperty: function (t, p) { if (typeof p === 'string') t.removeItem(p); return true; },
      has: function (t, p) { return typeof p === 'string' && (api[p] ? true : t.getItem(p) !== null); },
      ownKeys: function () { var ks = []; try { for (var i = 0; i < real.length; i++) ks.push(real.key(i)); } catch (e) {} return ks; },
      getOwnPropertyDescriptor: function (t, p) {
        if (typeof p !== 'string' || api[p]) return undefined;
        var v = t.getItem(p);
        return v === null ? undefined : { value: v, writable: true, enumerable: true, configurable: true };
      }
    }) : store;
    try { Object.defineProperty(window, 'localStorage', { value: proxy, configurable: true }); return true; }
    catch (e) { dbg('cannot replace localStorage', e); return false; }
  }

  var whenReady = (function () {
    var p;
    if (cg()) {
      p = withTimeout(cg().init(), 6000).then(function (ok) {
        sdkOk = ok;
        if (ok) { try { if (installCgData()) dbg('localStorage mapped to CrazyGames Data module'); } catch (e) {} }
        try {
          var s = cg().game && cg().game.settings;
          if (s && s.muteAudio) { platformMute = true; applyAudio(); }
          if (cg().game && cg().game.addSettingsChangeListener) {
            cg().game.addSettingsChangeListener(function (ns) {
              platformMute = !!(ns && ns.muteAudio); applyAudio();
            });
          }
        } catch (e) {}
      });
    } else if (poki()) {
      p = withTimeout(poki().init(), 6000).then(function (ok) { sdkOk = ok || true; });
    } else {
      p = Promise.resolve();
    }
    return p.then(function () {
      ready = true;
      dbg('ready', TARGET, 'sdk:', hasSdk, 'ok:', sdkOk);
      var q = queue; queue = [];
      q.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });
    });
  })();

  /* ------------------------------------------------------------------ loading */
  var loadingStarted = false, loadingFinished = false;
  if (cg()) whenReadyRun(function () { try { cg().game.loadingStart(); loadingStarted = true; } catch (e) {} });
  function loadingDone() {
    if (loadingFinished) return;
    loadingFinished = true;
    whenReadyRun(function () {
      try {
        if (cg()) { if (loadingStarted) cg().game.loadingStop(); }
        else if (poki()) poki().gameLoadingFinished();
      } catch (e) {}
      dbg('loadingDone');
    });
  }
  // safety net: if a game forgets loadingDone(), report it 20 s after the page loaded
  window.addEventListener('load', function () { setTimeout(loadingDone, 20000); });

  /* ------------------------------------------------------------------ gameplay */
  var inGameplay = false;
  function gameplayStart() {
    if (inGameplay) return;
    inGameplay = true;
    loadingDone();
    whenReadyRun(function () {
      try { if (cg()) cg().game.gameplayStart(); else if (poki()) poki().gameplayStart(); } catch (e) {}
    });
    dbg('gameplayStart');
  }
  function gameplayStop() {
    if (!inGameplay) return;
    inGameplay = false;
    whenReadyRun(function () {
      try { if (cg()) cg().game.gameplayStop(); else if (poki()) poki().gameplayStop(); } catch (e) {}
    });
    dbg('gameplayStop');
  }

  /* ------------------------------------------------------------------ ads */
  var adBusy = false;
  function beginAd() {
    if (adActive) return;
    adActive = true; setShield(true); applyAudio(); emit('adstart');
  }
  function endAd() {
    if (!adActive) return;
    adActive = false; setShield(false); applyAudio(); emit('adend');
  }

  function midgame(reason) {
    if (!hasSdk || adBusy) return Promise.resolve();
    adBusy = true;
    var wasPlaying = inGameplay;
    if (wasPlaying) gameplayStop();
    return withTimeout(whenReady, 6500).then(function () {
      return new Promise(function (resolve) {
        var finished = false;
        function finish() { if (finished) return; finished = true; endAd(); resolve(); }
        try {
          if (cg()) {
            cg().ad.requestAd('midgame', {
              adStarted: function () { markCgAds(true); beginAd(); },
              adFinished: finish,
              adError: function (err) {
                dbg('midgame error', err);
                if (err && err.code === 'adsDisabledBasicLaunch') markCgAds(false);
                finish();
              }
            });
          } else if (poki()) {
            beginAd(); // Poki: the start callback is not guaranteed, so mute/block up front
            Promise.resolve(poki().commercialBreak(function () { beginAd(); })).then(finish, finish);
          } else finish();
        } catch (e) { finish(); }
        setTimeout(finish, 120000); // never leave the game stuck
      });
    }).then(function () {
      adBusy = false;
      if (wasPlaying) gameplayStart();
      dbg('midgame done', reason || '');
    });
  }

  // CrazyGames Basic Launch: ads are disabled by the portal, so rewarded UI must stay hidden.
  // As soon as a real midgame ad plays (Full Launch), remember it on this device and enable rewarded offers.
  var CG_LIVE_KEY = '__wp_cg_ads_live';
  var cgAdsLive = false;
  try { cgAdsLive = window.localStorage.getItem(CG_LIVE_KEY) === '1'; } catch (e) {}
  function markCgAds(live) {
    if (cgAdsLive === live) return;
    cgAdsLive = live;
    try { if (live) window.localStorage.setItem(CG_LIVE_KEY, '1'); else window.localStorage.removeItem(CG_LIVE_KEY); } catch (e) {}
    emit('rewardedchange', rewardedEnabled());
  }
  function rewardedEnabled() {
    if (!hasSdk) return false;
    if (TARGET === 'crazygames') return !!OPTS.cgRewarded || cgAdsLive;
    if (TARGET === 'poki') return true;
    return false;
  }

  function rewarded(reason) {
    if (!rewardedEnabled() || adBusy) return Promise.resolve(false);
    adBusy = true;
    var wasPlaying = inGameplay;
    if (wasPlaying) gameplayStop();
    return withTimeout(whenReady, 6500).then(function () {
      return new Promise(function (resolve) {
        var finished = false;
        function finish(ok) { if (finished) return; finished = true; endAd(); resolve(!!ok); }
        try {
          if (cg()) {
            cg().ad.requestAd('rewarded', {
              adStarted: function () { beginAd(); },
              adFinished: function () { finish(true); },
              adError: function (err) { dbg('rewarded error', err); finish(false); }
            });
          } else if (poki()) {
            beginAd();
            Promise.resolve(poki().rewardedBreak({ size: 'medium', onStart: function () { beginAd(); } }))
              .then(function (ok) { finish(ok); }, function () { finish(false); });
          } else finish(false);
        } catch (e) { finish(false); }
        setTimeout(function () { finish(false); }, 120000);
      });
    }).then(function (ok) {
      adBusy = false;
      if (wasPlaying) gameplayStart();
      dbg('rewarded', reason || '', ok);
      return ok;
    });
  }

  function happytime() {
    whenReadyRun(function () {
      try {
        if (cg()) cg().game.happytime();
        else if (poki() && typeof poki().happyTime === 'function') poki().happyTime(1);
      } catch (e) {}
    });
  }

  /* ------------------------------------------------------------------ misc */
  function isMobile() {
    try {
      var si = cg() && cg().user && cg().user.systemInfo;
      if (si && si.device && si.device.type) return si.device.type !== 'desktop';
    } catch (e) {}
    return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  }
  function locale() {
    try {
      var si = cg() && cg().user && cg().user.systemInfo;
      if (si && si.locale) return String(si.locale);
    } catch (e) {}
    return (navigator.language || 'en');
  }
  function openURL(url) { try { window.open(url, '_blank', 'noopener'); } catch (e) {} }

  window.WebPlatform = {
    target: TARGET,
    options: OPTS,
    whenReady: whenReady,
    loadingDone: loadingDone,
    gameplayStart: gameplayStart,
    gameplayStop: gameplayStop,
    midgame: midgame,
    rewardedEnabled: rewardedEnabled,
    rewarded: rewarded,
    happytime: happytime,
    on: on,
    off: off,
    audioBlocked: audioBlocked,
    isMobile: isMobile,
    locale: locale,
    openURL: openURL,
    get inGameplay() { return inGameplay; },
    get adActive() { return adActive; },
    _audioRunning: audioRunning,
    _contexts: contexts
  };
})();
