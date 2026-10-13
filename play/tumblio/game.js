/* Tumblio v1.0 - built 2026-10-13T08:52:57.319Z */
(function () {
'use strict';
const __modules = Object.create(null);
const __import = (id) => { const m = __modules[id]; if (!m) throw new Error("Module not found: " + id); return m; };
const __define = (id, fn) => { const exports = Object.create(null); fn(exports); __modules[id] = exports; };
// ---- config.js ----
__define("config.js", function (__exports) {
/**
 * Central configuration for Tumblio.
 * Everything tunable lives here: grid size, spawn rules, economy, ads, review prompts, store links.
 */

const APP = {
  name: 'Tumblio',
  version: '1.0',
  saveKey: 'tumblio.save.v1',
};

const GRID = {
  COLS: 5,
  ROWS: 6,           // rows below the dashed danger line (matches the original layout)
  HOVER_ROW: 6.85,   // where the "current" tile hovers, in row units above the bottom row
};

const SPAWN = {
  START_MAX_EXP: 3,   // at the start the spawner produces 2, 4, 8  (exp 1..3)
  MAX_EXP: 7,         // never spawns above 128 (exp 7)
  EXP_LAG: 3,         // spawn range top = highest tile exp - EXP_LAG
  WEIGHT_FALLOFF: 0.45,
  JOKER_CHANCE: 0.012,
  JOKER_MIN_DROPS: 15,
  // When the highest tile reaches `atExp`, every tile of `removeExp` disappears and is no longer spawned.
  REMOVAL_MILESTONES: [
    { atExp: 10, removeExp: 1 },   // reach 1024  -> 2s are removed from the game
    { atExp: 13, removeExp: 2 },   // reach 8192  -> 4s are removed
    { atExp: 16, removeExp: 3 },   // reach 65536 -> 8s are removed
  ],
};

const TIMING = {
  dropBase: 90,        // ms
  dropPerRow: 42,
  mergeSlide: 140,
  mergePop: 200,
  fallBase: 70,
  fallPerRow: 38,
  removePop: 180,
  hoverSlide: 110,
  overflowShake: 500,
};

const RULES = {
  CONTINUE_CLEAR_ROWS: 2,   // "continue" after game over clears the top N rows
  MAX_CONTINUES: 1,
  UNDO_DEPTH: 1,
};

const ECONOMY = {
  startingCoins: 100,
  // Coins earned per merge, by resulting exponent (64 = exp 6 gives 1 coin, 128 -> 2 ...)
  coinsForMerge: (exp) => Math.max(0, exp - 5),
  gameOverBonusDivisor: 400,   // + floor(score / 400) coins at game over
  milestoneBonus: (exp) => Math.max(10, (exp - 6) * 15),
  powerups: {
    hammer: { price: 100, label: 'Hammer', icon: '🔨', hint: 'Tap any block to remove it' },
    joker: { price: 150, label: 'Joker', icon: '∞', hint: 'Turn the current block into a ∞ block' },
    undo: { price: 50, label: 'Undo', icon: '↶', hint: 'Undo your last drop' },
  },
  // Power-up usage budget per game: the first use of each helper is unlocked by a
  // rewarded ad, the remaining ones are bought with coins. 1 ad + 2 coin = 3 total.
  powerupUsesPerGame: 3,
  powerupAdUses: 1,
  rewardedCoins: 60,
  rewardedCoinsCooldownSec: 120,
  doubleCoinsAtGameOver: true,
  dailyBonus: 50,
};

/**
 * Ads (browser-portal build): the portal SDK runs every ad (services/ads.js, services/web.js).
 * Breaks between games are requested at every hand-over and paced by the portal; rewarded videos
 * are offered only while the portal allows them. There is nothing to buy: no store, no prices.
 */
const ADS = {
  rewarded: { enabled: true },
};

/**
 * Daily play, rewards and offers (the "live" layer): daily login calendar, daily missions with
 * an activity bar, the weekly bar, achievements, the season pass, chests, the lucky spin, the
 * piggy bank and the Coin Club. A reward is an object such as
 *   { coins: 50 }  { hammer: 1 }  { joker: 1, undo: 1 }  { chest: 'gold' }  { xp: 40 }
 * Numbers are tuned so a free player is helped every day without the coin economy collapsing:
 * an engaged day earns roughly 400-700 coins and 4-6 helpers on top of play (docs/LIVE_OPS.md).
 */
const LIVE = {
  // The native build's 10-minute welcome period does not exist on the web (the portals pace ads):
  // services/progress.js starts every player as if it were over.
  // The calendar day turns over at local midnight; the week on Monday.
  login: [
    { coins: 50 },
    { hammer: 1 },
    { coins: 80 },
    { joker: 1 },
    { coins: 120 },
    { undo: 2 },
    { chest: 'gold' },
  ],
  missions: {
    perDay: 5,
    points: 20, // activity points per mission: 5 x 20 = 100 a day
    milestones: [
      { at: 20, reward: { coins: 30 } },
      { at: 40, reward: { undo: 1 } },
      { at: 60, reward: { coins: 50 } },
      { at: 80, reward: { joker: 1 } },
      { at: 100, reward: { chest: 'silver' } },
    ],
    // goals[0] for new players, [1] after 10 games, [2] after 40 games
    pool: [
      { id: 'games', metric: 'games', goals: [2, 3, 4], coins: 20, always: true },
      { id: 'merges', metric: 'merges', goals: [40, 70, 100], coins: 25 },
      { id: 'drops', metric: 'drops', goals: [50, 90, 140], coins: 20 },
      { id: 'chain', metric: 'chain', goals: [3, 4, 5], coins: 25 },
      { id: 'block', metric: 'block', goals: [7, 8, 9], coins: 30 },
      { id: 'score', metric: 'score', goals: [1500, 3000, 6000], coins: 25 },
      { id: 'helper', metric: 'helpers', goals: [1, 2, 3], coins: 20 },
      { id: 'chest', metric: 'chests', goals: [1, 1, 2], coins: 15 },
      { id: 'spin', metric: 'spins', goals: [1, 1, 2], coins: 15 },
      { id: 'earn', metric: 'earned', goals: [60, 120, 200], coins: 20 },
      { id: 'video', metric: 'videos', goals: [1, 2, 2], coins: 20, needsAds: true },
    ],
  },
  week: {
    milestones: [
      { at: 100, reward: { coins: 100 } },
      { at: 250, reward: { hammer: 2 } },
      { at: 400, reward: { coins: 200 } },
      { at: 550, reward: { joker: 2, undo: 2 } },
      { at: 700, reward: { chest: 'gold' } },
    ],
  },
  chests: {
    freeEveryHours: 4, // a free Wooden chest
    silverPrice: 300, // coins
    /* What each chest holds. coins: a random amount in [min, max]. helpers: how many random
       helpers, plus `extra` chance of one more. look: chance of a skin or map you don't own yet
       (when you own them all, lookCoins instead). These figures are shown in the game as the
       drop rates - change them here and the disclosure follows. */
    kinds: {
      wood: { coins: [20, 60], helpers: 0, extra: 0.5, look: 0, lookCoins: 0 },
      silver: { coins: [60, 150], helpers: 1, extra: 0.4, look: 0.06, lookCoins: 150 },
      gold: { coins: [200, 500], helpers: 3, extra: 0, look: 0.3, lookCoins: 300 },
    },
  },
  spin: {
    // weights are percentages; the game shows them as the wheel's odds
    segments: [
      { reward: { coins: 20 }, weight: 25 },
      { reward: { hammer: 1 }, weight: 12 },
      { reward: { coins: 40 }, weight: 20 },
      { reward: { undo: 1 }, weight: 14 },
      { reward: { coins: 80 }, weight: 12 },
      { reward: { joker: 1 }, weight: 8 },
      { reward: { coins: 150 }, weight: 5 },
      { reward: { chest: 'silver' }, weight: 4 },
    ],
  },
  pass: {
    tiers: 30,
    xpPerTier: 100,
    seasonDays: 28,
    seasonEpoch: Date.UTC(2026, 8, 28), // Monday 28 September 2026: season 1 starts here
    xp: { gameBase: 10, gameScoreStep: 500, gameMax: 40, mission: 20, login: 20, video: 40 },
    // tier 10 / 20 / 30 of the premium track give a look; owned already -> its coin value
    premiumLooks: { 10: ['skins', 'glass'], 20: ['themes', 'space'], 30: ['skins', 'metal'] },
  },
  piggy: { share: 0.1, cap: 3000, min: 500 }, // 10% of the coins won in play, up to 3,000
  club: { days: 30, instant: 300, daily: 100 },
  starter: { showHours: 72 }, // the Starter Pack is offered for 3 days after the shop opens
  // rewarded videos per day, per kind
  adCaps: { spin: 3, chest: 2, chestNow: 2, login: 1, reroll: 2, xp: 2, helper: 3, coins: 12 },
  achievements: [
    { id: 'games', metric: 'games', tiers: [[5, { coins: 50 }], [25, { coins: 100 }], [100, { chest: 'silver' }], [500, { chest: 'gold' }]] },
    { id: 'merges', metric: 'merges', tiers: [[200, { coins: 50 }], [1000, { hammer: 1, coins: 50 }], [5000, { chest: 'silver' }], [20000, { chest: 'gold' }]] },
    { id: 'block', metric: 'highestExp', tiers: [[8, { coins: 40 }], [9, { coins: 80 }], [10, { joker: 1, coins: 100 }], [11, { chest: 'silver' }], [12, { chest: 'gold' }]] },
    { id: 'chain', metric: 'bestChain', tiers: [[4, { coins: 40 }], [6, { undo: 1, coins: 60 }], [8, { chest: 'silver' }], [10, { chest: 'gold' }]] },
    { id: 'best', metric: 'best', tiers: [[5000, { coins: 50 }], [20000, { coins: 120 }], [50000, { chest: 'silver' }], [100000, { chest: 'gold' }]] },
    { id: 'helpers', metric: 'helpersUsed', tiers: [[5, { coins: 40 }], [25, { hammer: 1, joker: 1 }], [100, { chest: 'silver' }]] },
    { id: 'chests', metric: 'chestsOpened', tiers: [[5, { coins: 50 }], [25, { chest: 'silver' }], [100, { chest: 'gold' }]] },
    { id: 'missions', metric: 'missionsDone', tiers: [[10, { coins: 60 }], [50, { chest: 'silver' }], [200, { chest: 'gold' }]] },
    { id: 'collect', metric: 'collection', tiers: [[4, { coins: 60 }], [8, { chest: 'silver' }], [12, { chest: 'silver' }], [17, { chest: 'gold' }]] },
    { id: 'days', metric: 'loginDays', tiers: [[3, { coins: 50 }], [7, { chest: 'silver' }], [30, { chest: 'gold' }]] },
  ],
};
__exports.APP = APP;
__exports.GRID = GRID;
__exports.SPAWN = SPAWN;
__exports.TIMING = TIMING;
__exports.RULES = RULES;
__exports.ECONOMY = ECONOMY;
__exports.ADS = ADS;
__exports.LIVE = LIVE;
});
// ---- core/utils.js ----
__define("core/utils.js", function (__exports) {
/** Small shared helpers: math, easing, colors, formatting, RNG. */

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const Ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  outBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  outElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
  // a soft, damped spring: overshoots once, settles like jelly
  outSpring: (t) => (t >= 1 ? 1 : 1 - Math.exp(-6.5 * t) * Math.cos(t * 11)),
  outBounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

/** Deterministic PRNG (mulberry32) so games can be saved/resumed and tests are reproducible. */
class RNG {
  constructor(seed) {
    this.state = (seed >>> 0) || (Math.floor(Math.random() * 0xffffffff) >>> 0);
  }
  next() {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(min, max) {
    return min + Math.floor(this.next() * (max - min + 1));
  }
  pick(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }
  weighted(items, weightOf) {
    let total = 0;
    for (const it of items) total += weightOf(it);
    let r = this.next() * total;
    for (const it of items) {
      r -= weightOf(it);
      if (r <= 0) return it;
    }
    return items[items.length - 1];
  }
}

/** Value of a tile from its exponent (exp 1 = 2, exp 10 = 1024). */
const valueOf = (exp) => Math.pow(2, exp);

/** Short label for a tile: 2 ... 8192, then 16K, 32K ... 1M. */
function tileLabel(exp) {
  const v = valueOf(exp);
  if (v < 10000) return String(v);
  if (v < 1000000) return `${Math.round(v / 1024)}K`;
  return `${Math.round(v / 1048576)}M`;
}

// the language picker switches this so 12,345 reads 12.345 in German and 12 345 in French
let numberLocale = 'en-US';
function setNumberLocale(locale) {
  numberLocale = locale || 'en-US';
}

function formatNumber(n) {
  n = Math.floor(n || 0);
  try {
    // French groups digits with a narrow no-break space; a full one reads clearly at every size
    return n.toLocaleString(numberLocale).replace(/\u202f/g, '\u00a0');
  } catch (err) {
    return n.toLocaleString('en-US');
  }
}

/** Coin balances: in full up to 999,999, then "1.2M" / "1,2 Mio." / "1,2 млн" so a pill never overflows. */
function formatCoins(n) {
  n = Math.floor(n || 0);
  if (n < 1000000) return formatNumber(n);
  try {
    return new Intl.NumberFormat(numberLocale, { notation: 'compact', maximumFractionDigits: 1 }).format(n).replace(/\u202f/g, '\u00a0');
  } catch (err) {
    return formatCompact(n);
  }
}

function formatCompact(n) {
  n = Math.floor(n || 0);
  if (n < 10000) return formatNumber(n);
  if (n < 1000000) return `${(n / 1000).toFixed(n < 100000 ? 1 : 0)}K`;
  return `${(n / 1000000).toFixed(2)}M`;
}

// ---- colours ---------------------------------------------------------------
function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex({ r, g, b }) {
  const c = (v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Lighten (amount > 0) or darken (amount < 0) a hex colour. amount in [-1, 1]. */
function shade(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const f = (v) => (amount >= 0 ? v + (255 - v) * amount : v * (1 + amount));
  return rgbToHex({ r: f(r), g: f(g), b: f(b) });
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function mix(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex({ r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t) });
}

/** Relative luminance 0..1 (for picking readable text colours). */
function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

// ---- canvas helpers ---------------------------------------------------------
function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

const FONT_STACK = "'Fredoka Variable', 'Avenir Next', 'Segoe UI', system-ui, -apple-system, Helvetica, Arial, sans-serif";

function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
__exports.clamp = clamp;
__exports.lerp = lerp;
__exports.now = now;
__exports.sleep = sleep;
__exports.Ease = Ease;
__exports.RNG = RNG;
__exports.valueOf = valueOf;
__exports.tileLabel = tileLabel;
__exports.setNumberLocale = setNumberLocale;
__exports.formatNumber = formatNumber;
__exports.formatCoins = formatCoins;
__exports.formatCompact = formatCompact;
__exports.hexToRgb = hexToRgb;
__exports.rgbToHex = rgbToHex;
__exports.shade = shade;
__exports.rgba = rgba;
__exports.mix = mix;
__exports.luminance = luminance;
__exports.roundRectPath = roundRectPath;
__exports.FONT_STACK = FONT_STACK;
__exports.todayKey = todayKey;
});
// ---- core/i18n.js ----
__define("core/i18n.js", function (__exports) {
const { formatNumber, setNumberLocale } = __import("core/utils.js");

/**
 * Every word the player sees, in five languages.
 *
 * Written, not machine-translated: each language keeps the tone of a friendly casual game
 * (tu / du / tú / ты), its own punctuation (the French space before ! and ?, the German
 * quotes), and its own grammar for numbers - Russian has three plural forms, so anything
 * counted ("5 монет", "2 монеты", "1 монета") comes from a plural table, never from
 * gluing a word onto a number.
 *
 * t('key', { n: 3, name: 'Jelly' })  - {placeholders} are filled in; a number in `n`
 *                                      also picks the plural form.
 * Missing keys fall back to English, then to the key itself, so nothing ever shows blank.
 */

const LANGS = [
  { id: 'en', name: 'English', locale: 'en-US', badge: 'EN' },
  { id: 'es', name: 'Español', locale: 'es-ES', badge: 'ES' },
  { id: 'de', name: 'Deutsch', locale: 'de-DE', badge: 'DE' },
  { id: 'fr', name: 'Français', locale: 'fr-FR', badge: 'FR' },
  { id: 'ru', name: 'Русский', locale: 'ru-RU', badge: 'RU' },
];

// U+00A0: the no-break space French puts before ! ? : so the mark never wraps alone
const NB = ' ';

const STRINGS = {
  en: {
    'common.cancel': 'Cancel',
    'common.ok': 'OK',
    'common.score': 'Score',
    'common.best': 'Best',
    'common.top': 'Top',
    'common.next': 'Next',
    'common.shop': 'Shop',
    'common.settings': 'Settings',
    'common.home': 'Home',
    'common.play': 'Play',
    'common.continue': 'Continue',
    'common.newGame': 'New game',
    'common.resume': 'Resume',
    'common.restart': 'Restart',
    'common.playAgain': 'Play again',
    'common.gift': 'Gift',
    'common.coins': 'Coins',
    'common.close': 'Close',
    'common.pause': 'Pause',
    'common.sound': 'Sound',
    'common.music': 'Music',
    'common.haptics': 'Haptics',
    'common.locked': 'Locked',
    'menu.getCoins': 'Get coins',
    'menu.tomorrow': 'tomorrow',
    'menu.minutes': '{n} min',
    'pause.title': 'Paused',
    'go.title': 'Game over',
    'go.record': 'New record!',
    'go.newBest': 'New best',
    'go.continue': 'Continue',
    'go.continueSub': 'watch a video · top rows cleared',
    'go.double': 'Double coins',
    'go.doubleMore': '+{n} more',
    'go.doubled': 'doubled!',
    'power.hammer': 'Hammer',
    'power.joker': 'Joker',
    'power.undo': 'Undo',
    'power.usedUp': 'Used up',
    'power.free': 'Free',
    'power.left': '{left}/{max} left',
    'power.exhausted': '{power} is used up for this game',
    'power.noUndo': 'Nothing to undo yet',
    'power.alreadyJoker': 'Already a joker block',
    'power.wait': 'Wait for the board to settle',
    'power.tapBlock': 'Tap a block to smash it',
    'power.noVideo': 'No video available right now. Try again in a moment.',
    'power.noVideoShort': 'No video available right now',
    'power.watchWhole': 'Watch the whole video to get the reward',
    'power.freeTitle': 'Free {power}',
    'power.freeBody': 'Watch a short video and the first <b>{power}</b> of this game is on us.',
    'power.freeAfter': 'After that: {n} more, <b>{coins}</b> each.',
    'power.watchFree': 'Watch video · free',
    'power.notEnough': 'Not enough coins',
    'power.costs': '{power} costs <b>{coins}</b>.',
    'power.usesLeft': { one: '{n} use left this game.', other: '{n} uses left this game.' },
    'power.getCoins': 'Get coins',
    'fmt.coins': { one: '{n} coin', other: '{n} coins' },
    'fmt.coinsGen': { one: '{n} coin', other: '{n} coins' },
    'fmt.plusCoins': { one: '<b>+{n}</b> coin', other: '<b>+{n}</b> coins' },
    'toast.newBlock': 'New block {block}',
    'toast.retired': '{block} blocks are out of the game',
    'toast.dailyGift': 'Daily gift',
    'toast.giftTomorrow': 'Your next gift unlocks tomorrow',
    'toast.nextCoins': 'Next free coins in {n} min',
    'toast.watchCoins': 'Watch the whole video to get the coins',
    'toast.watchContinue': 'Watch the whole video to continue',
    'toast.rowsCleared': 'Top rows cleared',
    'toast.watchDouble': 'Watch the whole video to double your coins',
    'toast.unlocked': '{name} unlocked',
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.sound': 'Sound effects',
    'settings.music': 'Music',
    'settings.haptics': 'Haptics',
    'settings.hints': 'Landing hints',
    'settings.reset': 'Reset all progress',
    'stats.games': 'Games',
    'stats.merges': 'Merges',
    'stats.bestChain': 'Best chain',
    'stats.topBlock': 'Top block',
    'stats.bestScore': 'Best score',
    'stats.allTime': 'All-time',
    'reset.title': 'Reset all progress?',
    'reset.body': 'Best score, coins, unlocked skins and maps will be deleted.',
    'reset.confirm': 'Reset',
    'newGame.title': 'Start a new game?',
    'newGame.body': 'Your current game will be lost.',
    'newGame.keep': 'Keep playing',
    'restart.title': 'Restart?',
    'restart.body': 'Your current score will be lost.',
    'shop.title': 'Shop',
    'shop.skins': 'Skins',
    'shop.maps': 'Maps',
    'shop.coins': 'Coins',
    'shop.inUse': 'In use',
    'shop.use': 'Use',
    'shop.unlockTitle': 'Unlock {name}?',
    'shop.priceLine': 'Price: {coins}. You have {have}.',
    'shop.unlock': 'Unlock',
    'shop.needMore': 'You need <b>{coins}</b> more for {name}.',
    'shop.watchCoins': 'Watch video · +{n}',
    'shop.freeCoins': 'Free coins',
    'shop.shortVideo': 'Short video · +{n}',
    'shop.readyIn': 'Ready in {n} min',
    'shop.watch': 'Watch',
    'shop.dailyGift': 'Daily gift',
    'shop.everyDay': '+{n} every day',
    'shop.claim': 'Claim',
    'shop.claimed': 'Claimed',
    'fx.combo': 'COMBO x{n}',
    'fx.words': ['', '', 'Nice!', 'Great!', 'Amazing!', 'Incredible!', 'Legendary!'],
    'fx.newBlock': 'NEW BLOCK {block}!',
    'fx.removed': '{block} BLOCKS REMOVED!',
    'skin.classic': 'Classic',
    'skin.soft': 'Mallow',
    'skin.glossy': 'Jelly',
    'skin.candy': 'Candy',
    'skin.neon': 'Neon',
    'skin.glass': 'Glass',
    'skin.metal': 'Metal',
    'skin.pastel': 'Pastel',
    'skin.retro': 'Retro',
    'skin.classic.desc': 'Chunky moulded blocks with real depth.',
    'skin.soft.desc': 'Puffy marshmallow blocks dusted with sugar.',
    'skin.glossy.desc': 'Wobbly see-through jelly with tiny bubbles.',
    'skin.candy.desc': 'Hard-boiled candy with a sugar-glass shell.',
    'skin.neon.desc': 'Glowing tubes on dark glass. Best on dark maps.',
    'skin.glass.desc': 'Frosted crystal with lit edges.',
    'skin.metal.desc': 'Brushed, bevelled plates with rivets.',
    'skin.pastel.desc': 'Speckled matte ceramic, easy on the eyes.',
    'skin.retro.desc': '8-bit blocks with pixel faces.',
    'map.classic': 'Classic',
    'map.midnight': 'Midnight',
    'map.ocean': 'Ocean',
    'map.sunset': 'Sunset',
    'map.forest': 'Forest',
    'map.neon': 'Neon Grid',
    'map.candy': 'Candy',
    'map.space': 'Deep Space',
    'map.classic.desc': 'Warm coral sky with drifting toy blocks.',
    'map.midnight.desc': 'Deep blue night mode, easy on the eyes.',
    'map.ocean.desc': 'Deep water with rising bubbles and light rays.',
    'map.sunset.desc': 'Warm evening sky with a setting sun.',
    'map.forest.desc': 'Night forest with drifting fireflies.',
    'map.neon.desc': 'Synthwave grid rushing towards you.',
    'map.candy.desc': 'Soft pastel clouds and floating sprinkles.',
    'map.space.desc': 'Twinkling stars and a purple nebula.',
    // ---- the live layer: daily rewards, missions, the pass, chests, offers
    'live.daily': 'Daily',
    'live.spin': 'Spin',
    'live.missions': 'Missions',
    'live.pass': 'Pass',
    'live.chests': 'Chests',
    'live.xp': 'XP',
    'live.owned': 'had it: +{n}',
    'live.ready': 'Ready!',
    'shop.open': 'Open',
    'shop.everyDayCal': 'A reward every day, a Golden chest on day 7',
    'shop.earnByPlaying': 'Keep playing: every merge earns coins.',
    'missions.daily': 'Daily',
    'missions.weekly': 'Weekly',
    'missions.goals': 'Goals',
    'missions.title': 'Missions',
    'missions.activity': 'Today’s activity',
    'missions.newIn': 'New missions in',
    'missions.pts': 'pts',
    'missions.ptsEarned': '+{n} activity points',
    'missions.reachPoints': 'Reach {n} points to open it',
    'missions.go': 'Go',
    'missions.swap': 'Swap this mission',
    'missions.swapped': 'New mission!',
    'missions.swapHint': 'Not your thing? Swap a mission for a video ({n} left today).',
    'mission.done': 'Mission complete!',
    'mission.games': { one: 'Play {n} game', other: 'Play {n} games' },
    'mission.merges': { one: 'Make {n} merge', other: 'Make {n} merges' },
    'mission.drops': { one: 'Drop {n} block', other: 'Drop {n} blocks' },
    'mission.chain': 'Make a ×{n} chain',
    'mission.block': 'Make a {block} block',
    'mission.score': 'Score {n} in one game',
    'mission.helpers': { one: 'Use a helper', other: 'Use {n} helpers' },
    'mission.chests': { one: 'Open a chest', other: 'Open {n} chests' },
    'mission.spins': { one: 'Spin the lucky wheel', other: 'Spin the lucky wheel {n} times' },
    'mission.earned': { one: 'Earn {n} coin in games', other: 'Earn {n} coins in games' },
    'mission.videos': { one: 'Watch a bonus video', other: 'Watch {n} bonus videos' },
    'weekly.title': 'This week',
    'weekly.resetsIn': 'Starts over in',
    'weekly.reach': 'Reach {n} points',
    'weekly.hint': 'Every mission you finish adds {n} points to the week.',
    'ach.title': 'Goal reached!',
    'ach.complete': 'All done!',
    'ach.games': { one: 'Play {n} game', other: 'Play {n} games' },
    'ach.merges': { one: 'Make {n} merge', other: 'Make {n} merges' },
    'ach.highestExp': 'Make a {block} block',
    'ach.bestChain': 'Make a ×{n} chain',
    'ach.best': 'Score {n} in one game',
    'ach.helpersUsed': { one: 'Use {n} helper', other: 'Use {n} helpers' },
    'ach.chestsOpened': { one: 'Open {n} chest', other: 'Open {n} chests' },
    'ach.missionsDone': { one: 'Finish {n} mission', other: 'Finish {n} missions' },
    'ach.collection': 'Own {n} skins and maps',
    'ach.loginDays': { one: 'Claim daily rewards on {n} day', other: 'Claim daily rewards on {n} days' },
    'reward.title': 'Rewards',
    'reward.collect': 'Collect',
    'reward.claim': 'Claim',
    'reward.thanks': 'Thank you!',
    'daily.title': 'Daily rewards',
    'daily.sub': 'A reward for every day you play. Day 7 brings a Golden chest!',
    'daily.day': 'Day {n}',
    'daily.claim': 'Claim',
    'daily.tomorrow': 'Come back tomorrow',
    'daily.double': 'Double it',
    'daily.doubled': 'Doubled!',
    'spin.title': 'Lucky spin',
    'spin.free': 'Spin free',
    'spin.freeTag': 'Free',
    'spin.oneFree': 'A free spin every day',
    'spin.again': 'Spin again',
    'spin.adsLeft': { one: '{n} more spin with a video today', other: '{n} more spins with a video today' },
    'spin.tomorrow': 'Tomorrow',
    'spin.comeBack': 'Your next free spin comes tomorrow',
    'spin.won': 'You won!',
    'odds.link': 'Drop rates',
    'odds.title': 'Drop rates',
    'odds.spinTitle': 'The chance of each prize, on every spin:',
    'odds.coins': '{a}–{b} coins',
    'odds.helpers': { one: '{n} helper', other: '{n} helpers' },
    'odds.extraHelper': '1 extra helper',
    'odds.look': 'A skin or map you don’t own',
    'odds.helperNote': 'Each helper is a Hammer, a Joker or an Undo, all equally likely.',
    'odds.allOwned': 'Own every skin and map already? You get {s} coins (Silver) or {g} coins (Golden) instead.',
    'chest.wood': 'Wooden chest',
    'chest.silver': 'Silver chest',
    'chest.gold': 'Golden chest',
    'chests.title': 'Chests',
    'chests.yourHelpers': 'Your helpers',
    'chests.helpersNote': 'Helpers you own are used first in a game: no coins, no video.',
    'chests.open': 'Open',
    'chests.openNow': 'Open now',
    'chests.freeReady': 'Free and ready!',
    'chests.freeEvery': 'Free every {n} hours',
    'chests.forCoins': 'For coins',
    'chests.needCoins': { one: 'You need {n} more coin', other: 'You need {n} more coins' },
    'chests.videoChest': 'Video chest',
    'chests.leftToday': '{n} left today',
    'chests.tomorrow': 'Tomorrow',
    'chests.goldSub': 'Lots of coins, 3 helpers, rare skins',
    'chests.goldEarn': 'Found on day 7, in the pass and in goals',
    'chests.earnIt': 'Earn it',
    'pass.title': 'Season pass',
    'pass.season': 'Season {n}',
    'pass.lvl': 'Lv {n}',
    'pass.max': 'Max level!',
    'pass.howXp': 'Games, missions and daily rewards all give XP.',
    'pass.claimAll': 'Claim all',
    'pass.adXp': '+{n} XP',
    'pass.xpAdded': '+{n} XP!',
    'pass.free': 'Free',
    'pass.premium': 'Premium',
    'pass.reachTier': 'Reach level {n} to claim it',
    'offer.freeHelper': 'Free helper',
    'offer.freeHelperSub': '{n} left today',
    'ad.capReached': 'That’s all the videos for today. Come back tomorrow!',
    'power.use': 'Use',
    'power.keepPlaying': 'Keep playing: every merge earns coins.',
    'power.watchOne': 'Free {power}',
    'time.dh': '{d}d {h}h',
    'time.hm': '{h}h {m}m',
    'time.ms': '{m}m {s}s',
    'time.s': '{s}s',
    // web build: the keyboard hint on desktop
    'web.aim': 'move',
    'web.drop': 'drop',
    'web.column': 'column',
  },

  es: {
    'common.cancel': 'Cancelar',
    'common.ok': 'Vale',
    'common.score': 'Puntos',
    'common.best': 'Récord',
    'common.top': 'Máx.',
    'common.next': 'Siguiente',
    'common.shop': 'Tienda',
    'common.settings': 'Ajustes',
    'common.home': 'Inicio',
    'common.play': 'Jugar',
    'common.continue': 'Continuar',
    'common.newGame': 'Nueva partida',
    'common.resume': 'Reanudar',
    'common.restart': 'Reiniciar',
    'common.playAgain': 'Otra partida',
    'common.gift': 'Regalo',
    'common.coins': 'Monedas',
    'common.close': 'Cerrar',
    'common.pause': 'Pausa',
    'common.sound': 'Sonido',
    'common.music': 'Música',
    'common.haptics': 'Vibración',
    'common.locked': 'Bloqueado',
    'menu.getCoins': 'Conseguir monedas',
    'menu.tomorrow': 'mañana',
    'menu.minutes': '{n} min',
    'pause.title': 'En pausa',
    'go.title': 'Fin de la partida',
    'go.record': '¡Nuevo récord!',
    'go.newBest': 'Mejor marca',
    'go.continue': 'Continuar',
    'go.continueSub': 'con un vídeo · se despejan las filas de arriba',
    'go.double': 'Duplicar monedas',
    'go.doubleMore': '+{n} más',
    'go.doubled': '¡duplicadas!',
    'power.hammer': 'Martillo',
    'power.joker': 'Comodín',
    'power.undo': 'Deshacer',
    'power.usedUp': 'Agotado',
    'power.free': 'Gratis',
    'power.left': 'quedan {left}/{max}',
    'power.exhausted': 'Ya no te quedan usos de {power} en esta partida',
    'power.noUndo': 'Aún no hay nada que deshacer',
    'power.alreadyJoker': 'Ya es un comodín',
    'power.wait': 'Espera a que se asiente el tablero',
    'power.tapBlock': 'Toca un bloque para romperlo',
    'power.noVideo': 'Ahora mismo no hay vídeos. Prueba de nuevo en un momento.',
    'power.noVideoShort': 'Ahora mismo no hay vídeos',
    'power.watchWhole': 'Mira el vídeo completo para conseguir la recompensa',
    'power.freeTitle': '{power} gratis',
    'power.freeBody': 'Mira un vídeo corto y el primer uso de <b>{power}</b> en esta partida corre de nuestra cuenta.',
    'power.freeAfter': 'Después: {n} más, a <b>{coins}</b> cada uno.',
    'power.watchFree': 'Ver vídeo · gratis',
    'power.notEnough': 'Monedas insuficientes',
    'power.costs': '{power} cuesta <b>{coins}</b>.',
    'power.usesLeft': { one: 'Te queda {n} uso en esta partida.', other: 'Te quedan {n} usos en esta partida.' },
    'power.getCoins': 'Conseguir monedas',
    'fmt.coins': { one: '{n} moneda', other: '{n} monedas' },
    'fmt.coinsGen': { one: '{n} moneda', other: '{n} monedas' },
    'fmt.plusCoins': { one: '<b>+{n}</b> moneda', other: '<b>+{n}</b> monedas' },
    'toast.newBlock': 'Nuevo bloque: {block}',
    'toast.retired': 'Los bloques {block} salen del juego',
    'toast.dailyGift': 'Regalo diario',
    'toast.giftTomorrow': 'Tu próximo regalo llega mañana',
    'toast.nextCoins': 'Más monedas gratis en {n} min',
    'toast.watchCoins': 'Mira el vídeo completo para conseguir las monedas',
    'toast.watchContinue': 'Mira el vídeo completo para continuar',
    'toast.rowsCleared': 'Filas de arriba despejadas',
    'toast.watchDouble': 'Mira el vídeo completo para duplicar tus monedas',
    'toast.unlocked': 'Desbloqueado: {name}',
    'settings.title': 'Ajustes',
    'settings.language': 'Idioma',
    'settings.sound': 'Efectos de sonido',
    'settings.music': 'Música',
    'settings.haptics': 'Vibración',
    'settings.hints': 'Guía de caída',
    'settings.reset': 'Borrar todo el progreso',
    'stats.games': 'Partidas',
    'stats.merges': 'Fusiones',
    'stats.bestChain': 'Mejor cadena',
    'stats.topBlock': 'Mejor bloque',
    'stats.bestScore': 'Récord',
    'stats.allTime': 'En total',
    'reset.title': '¿Borrar todo el progreso?',
    'reset.body': 'Se borrarán tu récord, tus monedas y los aspectos y mundos desbloqueados.',
    'reset.confirm': 'Borrar',
    'newGame.title': '¿Empezar una partida nueva?',
    'newGame.body': 'Perderás la partida actual.',
    'newGame.keep': 'Seguir jugando',
    'restart.title': '¿Reiniciar?',
    'restart.body': 'Perderás la puntuación actual.',
    'shop.title': 'Tienda',
    'shop.skins': 'Aspectos',
    'shop.maps': 'Mundos',
    'shop.coins': 'Monedas',
    'shop.inUse': 'En uso',
    'shop.use': 'Usar',
    'shop.unlockTitle': '¿Desbloquear {name}?',
    'shop.priceLine': 'Precio: {coins}. Tienes {have}.',
    'shop.unlock': 'Desbloquear',
    'shop.needMore': 'Te faltan <b>{coins}</b> para {name}.',
    'shop.watchCoins': 'Ver vídeo · +{n}',
    'shop.freeCoins': 'Monedas gratis',
    'shop.shortVideo': 'Vídeo corto · +{n}',
    'shop.readyIn': 'Disponible en {n} min',
    'shop.watch': 'Ver',
    'shop.dailyGift': 'Regalo diario',
    'shop.everyDay': '+{n} cada día',
    'shop.claim': 'Recoger',
    'shop.claimed': 'Recogido',
    'fx.combo': 'COMBO x{n}',
    'fx.words': ['', '', '¡Bien!', '¡Genial!', '¡Increíble!', '¡Brutal!', '¡Legendario!'],
    'fx.newBlock': '¡NUEVO BLOQUE: {block}!',
    'fx.removed': '¡ADIÓS A LOS {block}!',
    'skin.classic': 'Clásico',
    'skin.soft': 'Malvavisco',
    'skin.glossy': 'Gelatina',
    'skin.candy': 'Caramelo',
    'skin.neon': 'Neón',
    'skin.glass': 'Cristal',
    'skin.metal': 'Metal',
    'skin.pastel': 'Pastel',
    'skin.retro': 'Retro',
    'skin.classic.desc': 'Bloques robustos y moldeados, con volumen de verdad.',
    'skin.soft.desc': 'Bloques esponjosos de malvavisco, espolvoreados de azúcar.',
    'skin.glossy.desc': 'Gelatina translúcida y temblorosa con burbujitas.',
    'skin.candy.desc': 'Caramelo duro con una capa de azúcar cristalizado.',
    'skin.neon.desc': 'Tubos brillantes sobre cristal oscuro. Luce más en mundos oscuros.',
    'skin.glass.desc': 'Cristal esmerilado con bordes iluminados.',
    'skin.metal.desc': 'Placas de metal cepillado con remaches.',
    'skin.pastel.desc': 'Cerámica mate moteada, suave para la vista.',
    'skin.retro.desc': 'Bloques de 8 bits con caritas pixeladas.',
    'map.classic': 'Clásico',
    'map.midnight': 'Medianoche',
    'map.ocean': 'Océano',
    'map.sunset': 'Atardecer',
    'map.forest': 'Bosque',
    'map.neon': 'Rejilla neón',
    'map.candy': 'Algodón de azúcar',
    'map.space': 'Espacio',
    'map.classic.desc': 'Cielo coral y cálido con bloques de juguete a la deriva.',
    'map.midnight.desc': 'Modo noche en azul profundo, suave para la vista.',
    'map.ocean.desc': 'Aguas profundas con burbujas y rayos de luz.',
    'map.sunset.desc': 'Cielo de tarde cálido con el sol poniéndose.',
    'map.forest.desc': 'Bosque nocturno lleno de luciérnagas.',
    'map.neon.desc': 'Una rejilla synthwave que corre hacia ti.',
    'map.candy.desc': 'Nubes pastel y fideos de colores flotando.',
    'map.space.desc': 'Estrellas titilantes y una nebulosa violeta.',
    // ---- la capa diaria: premios, misiones, pase, cofres, ofertas
    'live.daily': 'Diario',
    'live.spin': 'Ruleta',
    'live.missions': 'Misiones',
    'live.pass': 'Pase',
    'live.chests': 'Cofres',
    'live.xp': 'XP',
    'live.owned': 'ya lo tenías: +{n}',
    'live.ready': '¡Listo!',
    'shop.open': 'Abrir',
    'shop.everyDayCal': 'Un premio cada día y un cofre de oro el día 7',
    'shop.earnByPlaying': 'Sigue jugando: cada fusión da monedas.',
    'missions.daily': 'Diarias',
    'missions.weekly': 'Semana',
    'missions.goals': 'Logros',
    'missions.title': 'Misiones',
    'missions.activity': 'Actividad de hoy',
    'missions.newIn': 'Misiones nuevas en',
    'missions.pts': 'pts',
    'missions.ptsEarned': '+{n} puntos de actividad',
    'missions.reachPoints': 'Consigue {n} puntos para abrirlo',
    'missions.go': 'Ir',
    'missions.swap': 'Cambiar esta misión',
    'missions.swapped': '¡Misión nueva!',
    'missions.swapHint': { one: '¿No te convence? Cambia una misión por un vídeo (hoy te queda {n}).', other: '¿No te convence? Cambia una misión por un vídeo (hoy te quedan {n}).' },
    'mission.done': '¡Misión cumplida!',
    'mission.games': { one: 'Juega {n} partida', other: 'Juega {n} partidas' },
    'mission.merges': { one: 'Haz {n} fusión', other: 'Haz {n} fusiones' },
    'mission.drops': { one: 'Suelta {n} bloque', other: 'Suelta {n} bloques' },
    'mission.chain': 'Haz una cadena ×{n}',
    'mission.block': 'Crea un bloque {block}',
    'mission.score': 'Haz {n} puntos en una partida',
    'mission.helpers': { one: 'Usa una ayuda', other: 'Usa {n} ayudas' },
    'mission.chests': { one: 'Abre un cofre', other: 'Abre {n} cofres' },
    'mission.spins': { one: 'Gira la ruleta', other: 'Gira la ruleta {n} veces' },
    'mission.earned': { one: 'Gana {n} moneda jugando', other: 'Gana {n} monedas jugando' },
    'mission.videos': { one: 'Mira un vídeo de premio', other: 'Mira {n} vídeos de premio' },
    'weekly.title': 'Esta semana',
    'weekly.resetsIn': 'Empieza de nuevo en',
    'weekly.reach': 'Consigue {n} puntos',
    'weekly.hint': 'Cada misión que completas suma {n} puntos a la semana.',
    'ach.title': '¡Logro conseguido!',
    'ach.complete': '¡Completado!',
    'ach.games': { one: 'Juega {n} partida', other: 'Juega {n} partidas' },
    'ach.merges': { one: 'Haz {n} fusión', other: 'Haz {n} fusiones' },
    'ach.highestExp': 'Crea un bloque {block}',
    'ach.bestChain': 'Haz una cadena ×{n}',
    'ach.best': 'Haz {n} puntos en una partida',
    'ach.helpersUsed': { one: 'Usa {n} ayuda', other: 'Usa {n} ayudas' },
    'ach.chestsOpened': { one: 'Abre {n} cofre', other: 'Abre {n} cofres' },
    'ach.missionsDone': { one: 'Completa {n} misión', other: 'Completa {n} misiones' },
    'ach.collection': 'Ten {n} aspectos y mundos',
    'ach.loginDays': { one: 'Recoge el premio diario {n} día', other: 'Recoge el premio diario {n} días' },
    'reward.title': 'Recompensas',
    'reward.collect': 'Recoger',
    'reward.claim': 'Recoger',
    'reward.thanks': '¡Gracias!',
    'daily.title': 'Premios diarios',
    'daily.sub': 'Un premio por cada día que juegas. ¡El día 7 trae un cofre de oro!',
    'daily.day': 'Día {n}',
    'daily.claim': 'Recoger',
    'daily.tomorrow': 'Vuelve mañana',
    'daily.double': 'Duplicar',
    'daily.doubled': '¡Duplicado!',
    'spin.title': 'Ruleta de la suerte',
    'spin.free': 'Girar gratis',
    'spin.freeTag': 'Gratis',
    'spin.oneFree': 'Un giro gratis cada día',
    'spin.again': 'Girar otra vez',
    'spin.adsLeft': { one: 'Hoy te queda {n} giro más con vídeo', other: 'Hoy te quedan {n} giros más con vídeo' },
    'spin.tomorrow': 'Mañana',
    'spin.comeBack': 'Tu próximo giro gratis llega mañana',
    'spin.won': '¡Has ganado!',
    'odds.link': 'Probabilidades',
    'odds.title': 'Probabilidades',
    'odds.spinTitle': 'La probabilidad de cada premio en cada giro:',
    'odds.coins': '{a}–{b} monedas',
    'odds.helpers': { one: '{n} ayuda', other: '{n} ayudas' },
    'odds.extraHelper': '1 ayuda extra',
    'odds.look': 'Un aspecto o mundo que no tienes',
    'odds.helperNote': 'Cada ayuda es un Martillo, un Comodín o un Deshacer, con la misma probabilidad.',
    'odds.allOwned': '¿Ya tienes todos los aspectos y mundos? Recibes {s} monedas (plata) o {g} monedas (oro) en su lugar.',
    'chest.wood': 'Cofre de madera',
    'chest.silver': 'Cofre de plata',
    'chest.gold': 'Cofre de oro',
    'chests.title': 'Cofres',
    'chests.yourHelpers': 'Tus ayudas',
    'chests.helpersNote': 'Las ayudas que tienes se usan primero en la partida: sin monedas ni vídeos.',
    'chests.open': 'Abrir',
    'chests.openNow': 'Abrir ya',
    'chests.freeReady': '¡Gratis y listo!',
    'chests.freeEvery': 'Gratis cada {n} horas',
    'chests.forCoins': 'Por monedas',
    'chests.needCoins': { one: 'Te falta {n} moneda', other: 'Te faltan {n} monedas' },
    'chests.videoChest': 'Cofre por vídeo',
    'chests.leftToday': { one: 'Hoy queda {n}', other: 'Hoy quedan {n}' },
    'chests.tomorrow': 'Mañana',
    'chests.goldSub': 'Muchas monedas, 3 ayudas y aspectos raros',
    'chests.goldEarn': 'En el día 7, en el pase y en los logros',
    'chests.earnIt': 'Gánalo',
    'pass.title': 'Pase de temporada',
    'pass.season': 'Temporada {n}',
    'pass.lvl': 'Nv. {n}',
    'pass.max': '¡Nivel máximo!',
    'pass.howXp': 'Las partidas, las misiones y los premios diarios dan XP.',
    'pass.claimAll': 'Recoger todo',
    'pass.adXp': '+{n} XP',
    'pass.xpAdded': '¡+{n} XP!',
    'pass.free': 'Gratis',
    'pass.premium': 'Premium',
    'pass.reachTier': 'Llega al nivel {n} para recogerlo',
    'offer.freeHelper': 'Ayuda gratis',
    'offer.freeHelperSub': { one: 'Hoy queda {n}', other: 'Hoy quedan {n}' },
    'ad.capReached': 'Ya has visto todos los vídeos de hoy. ¡Vuelve mañana!',
    'power.use': 'Usar',
    'power.keepPlaying': 'Sigue jugando: cada fusión da monedas.',
    'power.watchOne': '{power} gratis',
    'time.dh': '{d}d {h}h',
    'time.hm': '{h}h {m}m',
    'time.ms': '{m}m {s}s',
    'time.s': '{s}s',
    // web build: the keyboard hint on desktop
    'web.aim': 'mover',
    'web.drop': 'soltar',
    'web.column': 'columna',
  },

  de: {
    'common.cancel': 'Abbrechen',
    'common.ok': 'OK',
    'common.score': 'Punkte',
    'common.best': 'Rekord',
    'common.top': 'Top',
    'common.next': 'Nächster',
    'common.shop': 'Shop',
    'common.settings': 'Einstellungen',
    'common.home': 'Menü',
    'common.play': 'Spielen',
    'common.continue': 'Weiter',
    'common.newGame': 'Neues Spiel',
    'common.resume': 'Weiter',
    'common.restart': 'Neustart',
    'common.playAgain': 'Neue Runde',
    'common.gift': 'Geschenk',
    'common.coins': 'Münzen',
    'common.close': 'Schließen',
    'common.pause': 'Pause',
    'common.sound': 'Ton',
    'common.music': 'Musik',
    'common.haptics': 'Vibration',
    'common.locked': 'Gesperrt',
    'menu.getCoins': 'Münzen holen',
    'menu.tomorrow': 'morgen',
    'menu.minutes': '{n} Min.',
    'pause.title': 'Pause',
    'go.title': 'Spiel vorbei',
    'go.record': 'Neuer Rekord!',
    'go.newBest': 'Bestleistung',
    'go.continue': 'Weiterspielen',
    'go.continueSub': 'per Video · obere Reihen werden frei',
    'go.double': 'Münzen verdoppeln',
    'go.doubleMore': '+{n} extra',
    'go.doubled': 'verdoppelt!',
    'power.hammer': 'Hammer',
    'power.joker': 'Joker',
    'power.undo': 'Zurück',
    'power.usedUp': 'Verbraucht',
    'power.free': 'Gratis',
    'power.left': 'noch {left}/{max}',
    'power.exhausted': '{power} ist in dieser Runde aufgebraucht',
    'power.noUndo': 'Noch nichts zum Zurücknehmen',
    'power.alreadyJoker': 'Das ist schon ein Joker',
    'power.wait': 'Warte, bis alles gelandet ist',
    'power.tapBlock': 'Tippe auf einen Block',
    'power.noVideo': 'Gerade ist kein Video verfügbar. Versuch es gleich noch mal.',
    'power.noVideoShort': 'Gerade ist kein Video verfügbar',
    'power.watchWhole': 'Schau das Video bis zum Ende, um die Belohnung zu bekommen',
    'power.freeTitle': 'Einmal gratis: {power}',
    'power.freeBody': 'Schau ein kurzes Video – dann ist der erste Einsatz von <b>{power}</b> in dieser Runde gratis.',
    'power.freeAfter': 'Danach: noch {n}, je <b>{coins}</b>.',
    'power.watchFree': 'Video ansehen · gratis',
    'power.notEnough': 'Nicht genug Münzen',
    'power.costs': '{power} kostet <b>{coins}</b>.',
    'power.usesLeft': { one: 'Noch {n} Einsatz in dieser Runde.', other: 'Noch {n} Einsätze in dieser Runde.' },
    'power.getCoins': 'Münzen holen',
    'fmt.coins': { one: '{n} Münze', other: '{n} Münzen' },
    'fmt.coinsGen': { one: '{n} Münze', other: '{n} Münzen' },
    'fmt.plusCoins': { one: '<b>+{n}</b> Münze', other: '<b>+{n}</b> Münzen' },
    'toast.newBlock': 'Neuer Block: {block}',
    'toast.retired': 'Blöcke mit {block} sind raus',
    'toast.dailyGift': 'Tagesgeschenk',
    'toast.giftTomorrow': 'Dein nächstes Geschenk gibt’s morgen',
    'toast.nextCoins': 'Nächste Gratis-Münzen in {n} Min.',
    'toast.watchCoins': 'Schau das Video bis zum Ende, um die Münzen zu bekommen',
    'toast.watchContinue': 'Schau das Video bis zum Ende, um weiterzuspielen',
    'toast.rowsCleared': 'Obere Reihen geräumt',
    'toast.watchDouble': 'Schau das Video bis zum Ende, um deine Münzen zu verdoppeln',
    'toast.unlocked': '{name} freigeschaltet',
    'settings.title': 'Einstellungen',
    'settings.language': 'Sprache',
    'settings.sound': 'Soundeffekte',
    'settings.music': 'Musik',
    'settings.haptics': 'Vibration',
    'settings.hints': 'Landevorschau',
    'settings.reset': 'Fortschritt zurücksetzen',
    'stats.games': 'Spiele',
    'stats.merges': 'Fusionen',
    'stats.bestChain': 'Beste Kette',
    'stats.topBlock': 'Höchster Block',
    'stats.bestScore': 'Rekord',
    'stats.allTime': 'Insgesamt',
    'reset.title': 'Fortschritt zurücksetzen?',
    'reset.body': 'Rekord, Münzen und freigeschaltete Skins und Welten werden gelöscht.',
    'reset.confirm': 'Zurücksetzen',
    'newGame.title': 'Neues Spiel starten?',
    'newGame.body': 'Dein aktuelles Spiel geht verloren.',
    'newGame.keep': 'Weiterspielen',
    'restart.title': 'Neu starten?',
    'restart.body': 'Deine aktuellen Punkte gehen verloren.',
    'shop.title': 'Shop',
    'shop.skins': 'Skins',
    'shop.maps': 'Welten',
    'shop.coins': 'Münzen',
    'shop.inUse': 'Aktiv',
    'shop.use': 'Wählen',
    'shop.unlockTitle': '{name} freischalten?',
    'shop.priceLine': 'Preis: {coins}. Du hast {have}.',
    'shop.unlock': 'Freischalten',
    'shop.needMore': 'Dir fehlen <b>{coins}</b> für {name}.',
    'shop.watchCoins': 'Video · +{n}',
    'shop.freeCoins': 'Gratis-Münzen',
    'shop.shortVideo': 'Kurzes Video · +{n}',
    'shop.readyIn': 'Bereit in {n} Min.',
    'shop.watch': 'Ansehen',
    'shop.dailyGift': 'Tagesgeschenk',
    'shop.everyDay': '+{n} jeden Tag',
    'shop.claim': 'Abholen',
    'shop.claimed': 'Abgeholt',
    'fx.combo': 'KOMBO x{n}',
    'fx.words': ['', '', 'Gut!', 'Super!', 'Klasse!', 'Unglaublich!', 'Legendär!'],
    'fx.newBlock': 'NEUER BLOCK: {block}!',
    'fx.removed': 'TSCHÜSS, {block}ER!',
    'skin.classic': 'Klassik',
    'skin.soft': 'Marshmallow',
    'skin.glossy': 'Gelee',
    'skin.candy': 'Bonbon',
    'skin.neon': 'Neon',
    'skin.glass': 'Glas',
    'skin.metal': 'Metall',
    'skin.pastel': 'Pastell',
    'skin.retro': 'Retro',
    'skin.classic.desc': 'Kräftige, gegossene Blöcke mit echter Tiefe.',
    'skin.soft.desc': 'Fluffige Marshmallow-Blöcke mit Puderzucker.',
    'skin.glossy.desc': 'Wackeliges, durchsichtiges Gelee mit kleinen Bläschen.',
    'skin.candy.desc': 'Harte Bonbons mit gläserner Zuckerschale.',
    'skin.neon.desc': 'Leuchtröhren auf dunklem Glas. Am schönsten in dunklen Welten.',
    'skin.glass.desc': 'Mattiertes Kristall mit leuchtenden Kanten.',
    'skin.metal.desc': 'Gebürstete, abgeschrägte Platten mit Nieten.',
    'skin.pastel.desc': 'Gesprenkelte matte Keramik, angenehm fürs Auge.',
    'skin.retro.desc': '8-Bit-Blöcke mit Pixelgesichtern.',
    'map.classic': 'Klassik',
    'map.midnight': 'Mitternacht',
    'map.ocean': 'Ozean',
    'map.sunset': 'Abendrot',
    'map.forest': 'Wald',
    'map.neon': 'Neon-Raster',
    'map.candy': 'Zuckerwatte',
    'map.space': 'Weltall',
    'map.classic.desc': 'Warmer Korallenhimmel mit schwebenden Spielzeugblöcken.',
    'map.midnight.desc': 'Tiefblauer Nachtmodus, angenehm fürs Auge.',
    'map.ocean.desc': 'Tiefes Wasser mit aufsteigenden Blasen und Lichtstrahlen.',
    'map.sunset.desc': 'Warmer Abendhimmel mit untergehender Sonne.',
    'map.forest.desc': 'Nächtlicher Wald voller Glühwürmchen.',
    'map.neon.desc': 'Ein Synthwave-Raster, das auf dich zurast.',
    'map.candy.desc': 'Pastellwolken und schwebende Zuckerstreusel.',
    'map.space.desc': 'Funkelnde Sterne und ein violetter Nebel.',
    // ---- die tägliche Ebene: Belohnungen, Aufgaben, Pass, Truhen, Angebote
    'live.daily': 'Täglich',
    'live.spin': 'Glücksrad',
    'live.missions': 'Aufgaben',
    'live.pass': 'Pass',
    'live.chests': 'Truhen',
    'live.xp': 'EP',
    'live.owned': 'schon da: +{n}',
    'live.ready': 'Bereit!',
    'shop.open': 'Öffnen',
    'shop.everyDayCal': 'Jeden Tag ein Geschenk, an Tag 7 eine Goldtruhe',
    'shop.earnByPlaying': 'Spiel weiter: Jede Fusion bringt Münzen.',
    'missions.daily': 'Heute',
    'missions.weekly': 'Woche',
    'missions.goals': 'Ziele',
    'missions.title': 'Aufgaben',
    'missions.activity': 'Heutige Aktivität',
    'missions.newIn': 'Neue Aufgaben in',
    'missions.pts': 'P.',
    'missions.ptsEarned': '+{n} Aktivitätspunkte',
    'missions.reachPoints': 'Sammle {n} Punkte, um sie zu öffnen',
    'missions.go': 'Los',
    'missions.swap': 'Aufgabe tauschen',
    'missions.swapped': 'Neue Aufgabe!',
    'missions.swapHint': 'Keine Lust darauf? Tausch eine Aufgabe gegen ein Video (heute noch {n}).',
    'mission.done': 'Aufgabe geschafft!',
    'mission.games': { one: 'Spiele {n} Runde', other: 'Spiele {n} Runden' },
    'mission.merges': { one: 'Schaffe {n} Fusion', other: 'Schaffe {n} Fusionen' },
    'mission.drops': { one: 'Lass {n} Block fallen', other: 'Lass {n} Blöcke fallen' },
    'mission.chain': 'Schaffe eine ×{n}-Kette',
    'mission.block': 'Bau einen {block}er-Block',
    'mission.score': 'Hol {n} Punkte in einer Runde',
    'mission.helpers': { one: 'Setz einen Helfer ein', other: 'Setz {n} Helfer ein' },
    'mission.chests': { one: 'Öffne eine Truhe', other: 'Öffne {n} Truhen' },
    'mission.spins': { one: 'Dreh am Glücksrad', other: 'Dreh {n}-mal am Glücksrad' },
    'mission.earned': { one: 'Verdien {n} Münze im Spiel', other: 'Verdien {n} Münzen im Spiel' },
    'mission.videos': { one: 'Schau ein Bonusvideo', other: 'Schau {n} Bonusvideos' },
    'weekly.title': 'Diese Woche',
    'weekly.resetsIn': 'Neustart in',
    'weekly.reach': 'Sammle {n} Punkte',
    'weekly.hint': 'Jede geschaffte Aufgabe bringt der Woche {n} Punkte.',
    'ach.title': 'Ziel erreicht!',
    'ach.complete': 'Alles geschafft!',
    'ach.games': { one: 'Spiele {n} Runde', other: 'Spiele {n} Runden' },
    'ach.merges': { one: 'Schaffe {n} Fusion', other: 'Schaffe {n} Fusionen' },
    'ach.highestExp': 'Bau einen {block}er-Block',
    'ach.bestChain': 'Schaffe eine ×{n}-Kette',
    'ach.best': 'Hol {n} Punkte in einer Runde',
    'ach.helpersUsed': { one: 'Setz {n} Helfer ein', other: 'Setz {n} Helfer ein' },
    'ach.chestsOpened': { one: 'Öffne {n} Truhe', other: 'Öffne {n} Truhen' },
    'ach.missionsDone': { one: 'Schaffe {n} Aufgabe', other: 'Schaffe {n} Aufgaben' },
    'ach.collection': 'Besitze {n} Skins und Welten',
    'ach.loginDays': { one: 'Hol dir an {n} Tag die Tagesbelohnung', other: 'Hol dir an {n} Tagen die Tagesbelohnung' },
    'reward.title': 'Belohnungen',
    'reward.collect': 'Einsammeln',
    'reward.claim': 'Abholen',
    'reward.thanks': 'Danke!',
    'daily.title': 'Tagesbelohnungen',
    'daily.sub': 'Ein Geschenk für jeden Tag, an dem du spielst. Tag 7 bringt eine Goldtruhe!',
    'daily.day': 'Tag {n}',
    'daily.claim': 'Abholen',
    'daily.tomorrow': 'Komm morgen wieder',
    'daily.double': 'Verdoppeln',
    'daily.doubled': 'Verdoppelt!',
    'spin.title': 'Glücksrad',
    'spin.free': 'Gratis drehen',
    'spin.freeTag': 'Gratis',
    'spin.oneFree': 'Jeden Tag einmal gratis drehen',
    'spin.again': 'Noch mal drehen',
    'spin.adsLeft': { one: 'Heute noch {n} Dreh per Video', other: 'Heute noch {n} Drehs per Video' },
    'spin.tomorrow': 'Morgen',
    'spin.comeBack': 'Morgen gibt’s wieder einen Gratis-Dreh',
    'spin.won': 'Gewonnen!',
    'odds.link': 'Gewinnchancen',
    'odds.title': 'Gewinnchancen',
    'odds.spinTitle': 'Die Chance auf jeden Preis bei jedem Dreh:',
    'odds.coins': '{a}–{b} Münzen',
    'odds.helpers': { one: '{n} Helfer', other: '{n} Helfer' },
    'odds.extraHelper': '1 Extra-Helfer',
    'odds.look': 'Ein Skin oder eine Welt, die du noch nicht hast',
    'odds.helperNote': 'Jeder Helfer ist ein Hammer, ein Joker oder ein Zurück – alle gleich wahrscheinlich.',
    'odds.allOwned': 'Du hast schon alle Skins und Welten? Dann gibt’s stattdessen {s} Münzen (Silber) oder {g} Münzen (Gold).',
    'chest.wood': 'Holztruhe',
    'chest.silver': 'Silbertruhe',
    'chest.gold': 'Goldtruhe',
    'chests.title': 'Truhen',
    'chests.yourHelpers': 'Deine Helfer',
    'chests.helpersNote': 'Eigene Helfer werden im Spiel zuerst benutzt: keine Münzen, kein Video.',
    'chests.open': 'Öffnen',
    'chests.openNow': 'Jetzt öffnen',
    'chests.freeReady': 'Gratis und bereit!',
    'chests.freeEvery': 'Alle {n} Stunden gratis',
    'chests.forCoins': 'Für Münzen',
    'chests.needCoins': { one: 'Dir fehlt noch {n} Münze', other: 'Dir fehlen noch {n} Münzen' },
    'chests.videoChest': 'Video-Truhe',
    'chests.leftToday': 'Heute noch {n}',
    'chests.tomorrow': 'Morgen',
    'chests.goldSub': 'Viele Münzen, 3 Helfer, seltene Skins',
    'chests.goldEarn': 'An Tag 7, im Pass und bei den Zielen',
    'chests.earnIt': 'Verdienen',
    'pass.title': 'Saison-Pass',
    'pass.season': 'Saison {n}',
    'pass.lvl': 'Lv. {n}',
    'pass.max': 'Höchste Stufe!',
    'pass.howXp': 'Runden, Aufgaben und Tagesbelohnungen bringen EP.',
    'pass.claimAll': 'Alle abholen',
    'pass.adXp': '+{n} EP',
    'pass.xpAdded': '+{n} EP!',
    'pass.free': 'Gratis',
    'pass.premium': 'Premium',
    'pass.reachTier': 'Erreiche Stufe {n}, um sie abzuholen',
    'offer.freeHelper': 'Gratis-Helfer',
    'offer.freeHelperSub': 'Heute noch {n}',
    'ad.capReached': 'Das waren alle Videos für heute. Komm morgen wieder!',
    'power.use': 'Nutzen',
    'power.keepPlaying': 'Spiel weiter: Jede Fusion bringt Münzen.',
    'power.watchOne': '{power} gratis',
    'time.dh': '{d}T {h}h',
    'time.hm': '{h}h {m}m',
    'time.ms': '{m}m {s}s',
    'time.s': '{s}s',
    // web build: the keyboard hint on desktop
    'web.aim': 'bewegen',
    'web.drop': 'fallen lassen',
    'web.column': 'Spalte',
  },

  fr: {
    'common.cancel': 'Annuler',
    'common.ok': 'OK',
    'common.score': 'Score',
    'common.best': 'Record',
    'common.top': 'Max',
    'common.next': 'Suivant',
    'common.shop': 'Boutique',
    'common.settings': 'Réglages',
    'common.home': 'Accueil',
    'common.play': 'Jouer',
    'common.continue': 'Continuer',
    'common.newGame': 'Nouvelle partie',
    'common.resume': 'Reprendre',
    'common.restart': 'Recommencer',
    'common.playAgain': 'Rejouer',
    'common.gift': 'Cadeau',
    'common.coins': 'Pièces',
    'common.close': 'Fermer',
    'common.pause': 'Pause',
    'common.sound': 'Son',
    'common.music': 'Musique',
    'common.haptics': 'Vibrations',
    'common.locked': 'Verrouillé',
    'menu.getCoins': 'Obtenir des pièces',
    'menu.tomorrow': 'demain',
    'menu.minutes': '{n} min',
    'pause.title': 'Pause',
    'go.title': 'Partie terminée',
    'go.record': `Nouveau record${NB}!`,
    'go.newBest': 'Meilleur score',
    'go.continue': 'Continuer',
    'go.continueSub': 'avec une vidéo · les rangées du haut se vident',
    'go.double': 'Doubler les pièces',
    'go.doubleMore': '+{n} en plus',
    'go.doubled': `doublées${NB}!`,
    'power.hammer': 'Marteau',
    'power.joker': 'Joker',
    'power.undo': 'Retour',
    'power.usedUp': 'Épuisé',
    'power.free': 'Gratuit',
    'power.left': '{left}/{max} restants',
    'power.exhausted': 'Plus de {power} pour cette partie',
    'power.noUndo': 'Rien à annuler pour l’instant',
    'power.alreadyJoker': 'C’est déjà un joker',
    'power.wait': 'Attends que le plateau se stabilise',
    'power.tapBlock': 'Touche un bloc pour le casser',
    'power.noVideo': 'Aucune vidéo pour le moment. Réessaie dans un instant.',
    'power.noVideoShort': 'Aucune vidéo pour le moment',
    'power.watchWhole': 'Regarde la vidéo jusqu’au bout pour obtenir la récompense',
    'power.freeTitle': '{power} gratuit',
    'power.freeBody': 'Regarde une courte vidéo et ta première utilisation de <b>{power}</b> dans cette partie est offerte.',
    'power.freeAfter': `Ensuite${NB}: encore {n}, à <b>{coins}</b> l’unité.`,
    'power.watchFree': 'Voir la vidéo · gratuit',
    'power.notEnough': 'Pas assez de pièces',
    'power.costs': '{power} coûte <b>{coins}</b>.',
    'power.usesLeft': { one: 'Encore {n} utilisation pour cette partie.', other: 'Encore {n} utilisations pour cette partie.' },
    'power.getCoins': 'Obtenir des pièces',
    'fmt.coins': { one: '{n} pièce', other: '{n} pièces' },
    'fmt.coinsGen': { one: '{n} pièce', other: '{n} pièces' },
    'fmt.plusCoins': { one: '<b>+{n}</b> pièce', other: '<b>+{n}</b> pièces' },
    'toast.newBlock': `Nouveau bloc${NB}: {block}`,
    'toast.retired': 'Les blocs {block} quittent la partie',
    'toast.dailyGift': 'Cadeau du jour',
    'toast.giftTomorrow': 'Ton prochain cadeau arrive demain',
    'toast.nextCoins': 'Prochaines pièces gratuites dans {n} min',
    'toast.watchCoins': 'Regarde la vidéo jusqu’au bout pour obtenir les pièces',
    'toast.watchContinue': 'Regarde la vidéo jusqu’au bout pour continuer',
    'toast.rowsCleared': 'Rangées du haut dégagées',
    'toast.watchDouble': 'Regarde la vidéo jusqu’au bout pour doubler tes pièces',
    'toast.unlocked': `Débloqué${NB}: {name}`,
    'settings.title': 'Réglages',
    'settings.language': 'Langue',
    'settings.sound': 'Effets sonores',
    'settings.music': 'Musique',
    'settings.haptics': 'Vibrations',
    'settings.hints': 'Guide de chute',
    'settings.reset': 'Réinitialiser la progression',
    'stats.games': 'Parties',
    'stats.merges': 'Fusions',
    'stats.bestChain': 'Meilleure chaîne',
    'stats.topBlock': 'Meilleur bloc',
    'stats.bestScore': 'Record',
    'stats.allTime': 'Au total',
    'reset.title': `Tout réinitialiser${NB}?`,
    'reset.body': 'Ton record, tes pièces, tes skins et tes mondes débloqués seront supprimés.',
    'reset.confirm': 'Réinitialiser',
    'newGame.title': `Commencer une nouvelle partie${NB}?`,
    'newGame.body': 'Ta partie en cours sera perdue.',
    'newGame.keep': 'Continuer',
    'restart.title': `Recommencer${NB}?`,
    'restart.body': 'Ton score actuel sera perdu.',
    'shop.title': 'Boutique',
    'shop.skins': 'Skins',
    'shop.maps': 'Mondes',
    'shop.coins': 'Pièces',
    'shop.inUse': 'Équipé',
    'shop.use': 'Choisir',
    'shop.unlockTitle': `Débloquer {name}${NB}?`,
    'shop.priceLine': `Prix${NB}: {coins}. Tu en as {have}.`,
    'shop.unlock': 'Débloquer',
    'shop.needMore': 'Il te manque <b>{coins}</b> pour {name}.',
    'shop.watchCoins': 'Vidéo · +{n}',
    'shop.freeCoins': 'Pièces gratuites',
    'shop.shortVideo': 'Vidéo courte · +{n}',
    'shop.readyIn': 'Disponible dans {n} min',
    'shop.watch': 'Regarder',
    'shop.dailyGift': 'Cadeau du jour',
    'shop.everyDay': '+{n} chaque jour',
    'shop.claim': 'Récupérer',
    'shop.claimed': 'Récupéré',
    'fx.combo': 'COMBO x{n}',
    'fx.words': ['', '', `Bien${NB}!`, `Super${NB}!`, `Génial${NB}!`, `Incroyable${NB}!`, `Légendaire${NB}!`],
    'fx.newBlock': `NOUVEAU BLOC${NB}: {block}${NB}!`,
    'fx.removed': `ADIEU LES {block}${NB}!`,
    'skin.classic': 'Classique',
    'skin.soft': 'Guimauve',
    'skin.glossy': 'Gelée',
    'skin.candy': 'Bonbon',
    'skin.neon': 'Néon',
    'skin.glass': 'Verre',
    'skin.metal': 'Métal',
    'skin.pastel': 'Pastel',
    'skin.retro': 'Rétro',
    'skin.classic.desc': 'Des blocs moulés bien dodus, avec du vrai relief.',
    'skin.soft.desc': 'Des blocs de guimauve moelleux, saupoudrés de sucre.',
    'skin.glossy.desc': 'Une gelée translucide et tremblotante, pleine de petites bulles.',
    'skin.candy.desc': 'Des bonbons durs dans une coque de sucre glacé.',
    'skin.neon.desc': 'Des tubes lumineux sur verre sombre. Parfait dans les mondes sombres.',
    'skin.glass.desc': 'Du cristal dépoli aux bords lumineux.',
    'skin.metal.desc': 'Des plaques de métal brossé et biseauté, avec rivets.',
    'skin.pastel.desc': 'Une céramique mate mouchetée, douce pour les yeux.',
    'skin.retro.desc': 'Des blocs 8 bits aux visages pixelisés.',
    'map.classic': 'Classique',
    'map.midnight': 'Minuit',
    'map.ocean': 'Océan',
    'map.sunset': 'Crépuscule',
    'map.forest': 'Forêt',
    'map.neon': 'Grille néon',
    'map.candy': 'Barbe à papa',
    'map.space': 'Espace',
    'map.classic.desc': 'Un ciel corail et chaleureux où flottent des blocs-jouets.',
    'map.midnight.desc': 'Un mode nuit bleu profond, doux pour les yeux.',
    'map.ocean.desc': 'Des eaux profondes, des bulles et des rayons de lumière.',
    'map.sunset.desc': 'Un ciel du soir tout en chaleur, au soleil couchant.',
    'map.forest.desc': 'Une forêt de nuit peuplée de lucioles.',
    'map.neon.desc': 'Une grille synthwave qui fonce vers toi.',
    'map.candy.desc': 'Des nuages pastel et des vermicelles de sucre qui flottent.',
    'map.space.desc': 'Des étoiles scintillantes et une nébuleuse violette.',
    // ---- la couche quotidienne : récompenses, missions, passe, coffres, offres
    'live.daily': 'Du jour',
    'live.spin': 'Roue',
    'live.missions': 'Missions',
    'live.pass': 'Passe',
    'live.chests': 'Coffres',
    'live.xp': 'XP',
    'live.owned': `déjà à toi${NB}: +{n}`,
    'live.ready': `Prêt${NB}!`,
    'shop.open': 'Ouvrir',
    'shop.everyDayCal': 'Une récompense par jour, un coffre en or au jour 7',
    'shop.earnByPlaying': `Continue à jouer${NB}: chaque fusion rapporte des pièces.`,
    'missions.daily': 'Du jour',
    'missions.weekly': 'Semaine',
    'missions.goals': 'Objectifs',
    'missions.title': 'Missions',
    'missions.activity': 'Activité du jour',
    'missions.newIn': 'Nouvelles missions dans',
    'missions.pts': 'pts',
    'missions.ptsEarned': '+{n} points d’activité',
    'missions.reachPoints': 'Atteins {n} points pour l’ouvrir',
    'missions.go': 'Jouer',
    'missions.swap': 'Changer de mission',
    'missions.swapped': `Nouvelle mission${NB}!`,
    'missions.swapHint': `Pas ton truc${NB}? Change une mission contre une vidéo (encore {n} aujourd’hui).`,
    'mission.done': `Mission accomplie${NB}!`,
    'mission.games': { one: 'Joue {n} partie', other: 'Joue {n} parties' },
    'mission.merges': { one: 'Fais {n} fusion', other: 'Fais {n} fusions' },
    'mission.drops': { one: 'Lâche {n} bloc', other: 'Lâche {n} blocs' },
    'mission.chain': 'Fais une chaîne ×{n}',
    'mission.block': 'Crée un bloc {block}',
    'mission.score': 'Marque {n} points en une partie',
    'mission.helpers': { one: 'Utilise un bonus', other: 'Utilise {n} bonus' },
    'mission.chests': { one: 'Ouvre un coffre', other: 'Ouvre {n} coffres' },
    'mission.spins': { one: 'Fais tourner la roue', other: 'Fais tourner la roue {n} fois' },
    'mission.earned': { one: 'Gagne {n} pièce en jouant', other: 'Gagne {n} pièces en jouant' },
    'mission.videos': { one: 'Regarde une vidéo bonus', other: 'Regarde {n} vidéos bonus' },
    'weekly.title': 'Cette semaine',
    'weekly.resetsIn': 'Repart à zéro dans',
    'weekly.reach': 'Atteins {n} points',
    'weekly.hint': 'Chaque mission terminée ajoute {n} points à la semaine.',
    'ach.title': `Objectif atteint${NB}!`,
    'ach.complete': `Tout est fait${NB}!`,
    'ach.games': { one: 'Joue {n} partie', other: 'Joue {n} parties' },
    'ach.merges': { one: 'Fais {n} fusion', other: 'Fais {n} fusions' },
    'ach.highestExp': 'Crée un bloc {block}',
    'ach.bestChain': 'Fais une chaîne ×{n}',
    'ach.best': 'Marque {n} points en une partie',
    'ach.helpersUsed': { one: 'Utilise {n} bonus', other: 'Utilise {n} bonus' },
    'ach.chestsOpened': { one: 'Ouvre {n} coffre', other: 'Ouvre {n} coffres' },
    'ach.missionsDone': { one: 'Termine {n} mission', other: 'Termine {n} missions' },
    'ach.collection': 'Possède {n} skins et mondes',
    'ach.loginDays': `Récompenses du jour récupérées${NB}: {n}`,
    'reward.title': 'Récompenses',
    'reward.collect': 'Récupérer',
    'reward.claim': 'Récupérer',
    'reward.thanks': `Merci${NB}!`,
    'daily.title': 'Récompenses du jour',
    'daily.sub': `Une récompense pour chaque jour où tu joues. Le jour 7, c’est un coffre en or${NB}!`,
    'daily.day': 'Jour {n}',
    'daily.claim': 'Récupérer',
    'daily.tomorrow': 'Reviens demain',
    'daily.double': 'Doubler',
    'daily.doubled': `Doublé${NB}!`,
    'spin.title': 'Roue de la chance',
    'spin.free': 'Tourner gratis',
    'spin.freeTag': 'Gratuit',
    'spin.oneFree': 'Un tour gratuit chaque jour',
    'spin.again': 'Encore un tour',
    'spin.adsLeft': { one: 'Encore {n} tour avec une vidéo aujourd’hui', other: 'Encore {n} tours avec une vidéo aujourd’hui' },
    'spin.tomorrow': 'Demain',
    'spin.comeBack': 'Ton prochain tour gratuit arrive demain',
    'spin.won': `Gagné${NB}!`,
    'odds.link': 'Probabilités',
    'odds.title': 'Probabilités',
    'odds.spinTitle': `La chance de chaque prix, à chaque tour${NB}:`,
    'odds.coins': '{a}–{b} pièces',
    'odds.helpers': { one: '{n} bonus', other: '{n} bonus' },
    'odds.extraHelper': '1 bonus en plus',
    'odds.look': 'Un skin ou un monde que tu n’as pas',
    'odds.helperNote': 'Chaque bonus est un Marteau, un Joker ou un Retour, avec la même chance.',
    'odds.allOwned': `Tu as déjà tous les skins et mondes${NB}? Tu reçois {s} pièces (argent) ou {g} pièces (or) à la place.`,
    'chest.wood': 'Coffre en bois',
    'chest.silver': 'Coffre en argent',
    'chest.gold': 'Coffre en or',
    'chests.title': 'Coffres',
    'chests.yourHelpers': 'Tes bonus',
    'chests.helpersNote': `Tes bonus servent en premier en partie${NB}: ni pièces, ni vidéo.`,
    'chests.open': 'Ouvrir',
    'chests.openNow': 'Ouvrir',
    'chests.freeReady': `Gratuit et prêt${NB}!`,
    'chests.freeEvery': 'Gratuit toutes les {n} heures',
    'chests.forCoins': 'Contre des pièces',
    'chests.needCoins': { one: 'Il te manque {n} pièce', other: 'Il te manque {n} pièces' },
    'chests.videoChest': 'Coffre vidéo',
    'chests.leftToday': { one: 'Encore {n} aujourd’hui', other: 'Encore {n} aujourd’hui' },
    'chests.tomorrow': 'Demain',
    'chests.goldSub': 'Plein de pièces, 3 bonus, des skins rares',
    'chests.goldEarn': 'Au jour 7, dans le passe et les objectifs',
    'chests.earnIt': 'À gagner',
    'pass.title': 'Passe de saison',
    'pass.season': 'Saison {n}',
    'pass.lvl': 'Niv. {n}',
    'pass.max': `Niveau max${NB}!`,
    'pass.howXp': 'Les parties, les missions et les récompenses du jour donnent de l’XP.',
    'pass.claimAll': 'Tout récupérer',
    'pass.adXp': '+{n} XP',
    'pass.xpAdded': `+{n} XP${NB}!`,
    'pass.free': 'Gratuit',
    'pass.premium': 'Premium',
    'pass.reachTier': 'Atteins le niveau {n} pour le récupérer',
    'offer.freeHelper': 'Bonus gratuit',
    'offer.freeHelperSub': { one: 'Encore {n} aujourd’hui', other: 'Encore {n} aujourd’hui' },
    'ad.capReached': `C’est tout pour les vidéos aujourd’hui. Reviens demain${NB}!`,
    'power.use': 'Utiliser',
    'power.keepPlaying': `Continue à jouer${NB}: chaque fusion rapporte des pièces.`,
    'power.watchOne': '{power} gratuit',
    'time.dh': '{d}j {h}h',
    'time.hm': '{h}h {m}m',
    'time.ms': '{m}m {s}s',
    'time.s': '{s}s',
    // web build: the keyboard hint on desktop
    'web.aim': 'déplacer',
    'web.drop': 'lâcher',
    'web.column': 'colonne',
  },

  ru: {
    'common.cancel': 'Отмена',
    'common.ok': 'ОК',
    'common.score': 'Счёт',
    'common.best': 'Рекорд',
    'common.top': 'Макс.',
    'common.next': 'Далее',
    'common.shop': 'Магазин',
    'common.settings': 'Настройки',
    'common.home': 'Меню',
    'common.play': 'Играть',
    'common.continue': 'Продолжить',
    'common.newGame': 'Новая игра',
    'common.resume': 'Продолжить',
    'common.restart': 'Заново',
    'common.playAgain': 'Ещё раз',
    'common.gift': 'Подарок',
    'common.coins': 'Монеты',
    'common.close': 'Закрыть',
    'common.pause': 'Пауза',
    'common.sound': 'Звук',
    'common.music': 'Музыка',
    'common.haptics': 'Вибрация',
    'common.locked': 'Закрыто',
    'menu.getCoins': 'Получить монеты',
    'menu.tomorrow': 'завтра',
    'menu.minutes': '{n} мин',
    'pause.title': 'Пауза',
    'go.title': 'Игра окончена',
    'go.record': 'Новый рекорд!',
    'go.newBest': 'Лучший счёт',
    'go.continue': 'Продолжить',
    'go.continueSub': 'за видео · верхние ряды очистятся',
    'go.double': 'Удвоить монеты',
    'go.doubleMore': 'ещё +{n}',
    'go.doubled': 'удвоено!',
    'power.hammer': 'Молот',
    'power.joker': 'Джокер',
    'power.undo': 'Отменить',
    'power.usedUp': 'Больше нет',
    'power.free': 'Бесплатно',
    'power.left': 'осталось {left}/{max}',
    'power.exhausted': 'Лимит «{power}» на эту игру исчерпан',
    'power.noUndo': 'Пока нечего отменять',
    'power.alreadyJoker': 'Это уже джокер',
    'power.wait': 'Подожди, пока блоки встанут на место',
    'power.tapBlock': 'Нажми на блок, чтобы разбить',
    'power.noVideo': 'Сейчас нет доступных видео. Попробуй чуть позже.',
    'power.noVideoShort': 'Сейчас нет доступных видео',
    'power.watchWhole': 'Досмотри видео до конца, чтобы получить награду',
    'power.freeTitle': 'Первый раз — бесплатно',
    'power.freeBody': 'Посмотри короткое видео — и первое использование <b>«{power}»</b> в этой игре будет бесплатным.',
    'power.freeAfter': 'Потом: ещё {n}, по <b>{coins}</b> за раз.',
    'power.watchFree': 'Видео · бесплатно',
    'power.notEnough': 'Не хватает монет',
    'power.costs': '«{power}» стоит <b>{coins}</b>.',
    'power.usesLeft': {
      one: 'В этой игре осталось {n} использование.',
      few: 'В этой игре осталось {n} использования.',
      many: 'В этой игре осталось {n} использований.',
      other: 'В этой игре осталось {n} использования.',
    },
    'power.getCoins': 'Получить монеты',
    'fmt.coins': { one: '{n} монета', few: '{n} монеты', many: '{n} монет', other: '{n} монеты' },
    'fmt.coinsGen': { one: '{n} монеты', few: '{n} монет', many: '{n} монет', other: '{n} монеты' },
    'fmt.plusCoins': { one: '<b>+{n}</b> монета', few: '<b>+{n}</b> монеты', many: '<b>+{n}</b> монет', other: '<b>+{n}</b> монеты' },
    'toast.newBlock': 'Новый блок: {block}',
    'toast.retired': 'Блоки {block} больше не появятся',
    'toast.dailyGift': 'Ежедневный подарок',
    'toast.giftTomorrow': 'Следующий подарок — завтра',
    'toast.nextCoins': 'Бесплатные монеты — через {n} мин',
    'toast.watchCoins': 'Досмотри видео до конца, чтобы получить монеты',
    'toast.watchContinue': 'Досмотри видео до конца, чтобы продолжить',
    'toast.rowsCleared': 'Верхние ряды очищены',
    'toast.watchDouble': 'Досмотри видео до конца, чтобы удвоить монеты',
    'toast.unlocked': 'Открыто: {name}',
    'settings.title': 'Настройки',
    'settings.language': 'Язык',
    'settings.sound': 'Звуки',
    'settings.music': 'Музыка',
    'settings.haptics': 'Вибрация',
    'settings.hints': 'Подсказка падения',
    'settings.reset': 'Сбросить весь прогресс',
    'stats.games': 'Игры',
    'stats.merges': 'Слияния',
    'stats.bestChain': 'Лучшая цепочка',
    'stats.topBlock': 'Лучший блок',
    'stats.bestScore': 'Рекорд',
    'stats.allTime': 'Всего очков',
    'reset.title': 'Сбросить весь прогресс?',
    'reset.body': 'Рекорд, монеты, открытые скины и миры будут удалены.',
    'reset.confirm': 'Сбросить',
    'newGame.title': 'Начать новую игру?',
    'newGame.body': 'Текущая игра не сохранится.',
    'newGame.keep': 'Продолжить',
    'restart.title': 'Начать заново?',
    'restart.body': 'Текущий счёт пропадёт.',
    'shop.title': 'Магазин',
    'shop.skins': 'Скины',
    'shop.maps': 'Миры',
    'shop.coins': 'Монеты',
    'shop.inUse': 'Выбрано',
    'shop.use': 'Выбрать',
    'shop.unlockTitle': 'Открыть «{name}»?',
    'shop.priceLine': 'Цена: {coins}. У тебя {have}.',
    'shop.unlock': 'Открыть',
    'shop.needMore': 'Для «{name}» не хватает <b>{coins}</b>.',
    'shop.watchCoins': 'Видео · +{n}',
    'shop.freeCoins': 'Бесплатные монеты',
    'shop.shortVideo': 'Короткое видео · +{n}',
    'shop.readyIn': 'Будет через {n} мин',
    'shop.watch': 'Смотреть',
    'shop.dailyGift': 'Подарок дня',
    'shop.everyDay': '+{n} каждый день',
    'shop.claim': 'Забрать',
    'shop.claimed': 'Получено',
    'fx.combo': 'КОМБО x{n}',
    'fx.words': ['', '', 'Неплохо!', 'Отлично!', 'Потрясающе!', 'Невероятно!', 'Легендарно!'],
    'fx.newBlock': 'НОВЫЙ БЛОК: {block}!',
    'fx.removed': 'БЛОКИ {block} УБРАНЫ!',
    'fx.removed.2': 'ПРОЩАЙТЕ, ДВОЙКИ!',
    'fx.removed.4': 'ПРОЩАЙТЕ, ЧЕТВЁРКИ!',
    'fx.removed.8': 'ПРОЩАЙТЕ, ВОСЬМЁРКИ!',
    'skin.classic': 'Классика',
    'skin.soft': 'Зефир',
    'skin.glossy': 'Желе',
    'skin.candy': 'Леденец',
    'skin.neon': 'Неон',
    'skin.glass': 'Стекло',
    'skin.metal': 'Металл',
    'skin.pastel': 'Пастель',
    'skin.retro': 'Ретро',
    'skin.classic.desc': 'Пухлые литые блоки с настоящим объёмом.',
    'skin.soft.desc': 'Воздушные блоки-зефирки в сахарной пудре.',
    'skin.glossy.desc': 'Прозрачное дрожащее желе с крошечными пузырьками.',
    'skin.candy.desc': 'Твёрдые леденцы в хрустящей сахарной глазури.',
    'skin.neon.desc': 'Светящиеся трубки на тёмном стекле. Лучше всего — в тёмных мирах.',
    'skin.glass.desc': 'Матовый хрусталь с сияющими гранями.',
    'skin.metal.desc': 'Шлифованные пластины с фаской и заклёпками.',
    'skin.pastel.desc': 'Матовая керамика в крапинку, приятная для глаз.',
    'skin.retro.desc': '8-битные блоки с пиксельными лицами.',
    'map.classic': 'Классика',
    'map.midnight': 'Полночь',
    'map.ocean': 'Океан',
    'map.sunset': 'Закат',
    'map.forest': 'Лес',
    'map.neon': 'Неоновая сетка',
    'map.candy': 'Сахарная вата',
    'map.space': 'Космос',
    'map.classic.desc': 'Тёплое коралловое небо и плывущие игрушечные блоки.',
    'map.midnight.desc': 'Ночной режим в глубоких синих тонах, бережёт глаза.',
    'map.ocean.desc': 'Морская глубина, пузырьки и лучи света.',
    'map.sunset.desc': 'Тёплое вечернее небо и заходящее солнце.',
    'map.forest.desc': 'Ночной лес, полный светлячков.',
    'map.neon.desc': 'Неоновая сетка в стиле синтвейв несётся навстречу.',
    'map.candy.desc': 'Пастельные облака и парящая сахарная посыпка.',
    'map.space.desc': 'Мерцающие звёзды и фиолетовая туманность.',
    // ---- ежедневный слой: награды, задания, пропуск, сундуки, предложения
    'live.daily': 'Награды',
    'live.spin': 'Колесо',
    'live.missions': 'Задания',
    'live.pass': 'Пропуск',
    'live.chests': 'Сундуки',
    'live.xp': 'опыта',
    'live.owned': 'уже есть: +{n}',
    'live.ready': 'Готово!',
    'shop.open': 'Открыть',
    'shop.everyDayCal': 'Награда каждый день, на 7-й день — золотой сундук',
    'shop.earnByPlaying': 'Играй дальше: каждое слияние приносит монеты.',
    'missions.daily': 'Сегодня',
    'missions.weekly': 'Неделя',
    'missions.goals': 'Цели',
    'missions.title': 'Задания',
    'missions.activity': 'Активность за сегодня',
    'missions.newIn': 'Новые задания через',
    'missions.pts': 'очк.',
    'missions.ptsEarned': { one: '+{n} очко активности', few: '+{n} очка активности', many: '+{n} очков активности', other: '+{n} очка активности' },
    'missions.reachPoints': { one: 'Набери {n} очко, чтобы открыть', few: 'Набери {n} очка, чтобы открыть', many: 'Набери {n} очков, чтобы открыть', other: 'Набери {n} очка, чтобы открыть' },
    'missions.go': 'Вперёд',
    'missions.swap': 'Заменить задание',
    'missions.swapped': 'Новое задание!',
    'missions.swapHint': 'Не нравится задание? Замени его за видео (сегодня осталось: {n}).',
    'mission.done': 'Задание выполнено!',
    'mission.games': { one: 'Сыграй {n} игру', few: 'Сыграй {n} игры', many: 'Сыграй {n} игр', other: 'Сыграй {n} игры' },
    'mission.merges': { one: 'Сделай {n} слияние', few: 'Сделай {n} слияния', many: 'Сделай {n} слияний', other: 'Сделай {n} слияния' },
    'mission.drops': { one: 'Брось {n} блок', few: 'Брось {n} блока', many: 'Брось {n} блоков', other: 'Брось {n} блока' },
    'mission.chain': 'Собери цепочку ×{n}',
    'mission.block': 'Собери блок {block}',
    'mission.score': 'Набери {n} очков за игру',
    'mission.helpers': { one: 'Используй {n} бустер', few: 'Используй {n} бустера', many: 'Используй {n} бустеров', other: 'Используй {n} бустера' },
    'mission.chests': { one: 'Открой {n} сундук', few: 'Открой {n} сундука', many: 'Открой {n} сундуков', other: 'Открой {n} сундука' },
    'mission.spins': { one: 'Крутани колесо удачи', few: 'Крутани колесо удачи {n} раза', many: 'Крутани колесо удачи {n} раз', other: 'Крутани колесо удачи {n} раза' },
    'mission.earned': { one: 'Заработай в игре {n} монету', few: 'Заработай в игре {n} монеты', many: 'Заработай в игре {n} монет', other: 'Заработай в игре {n} монеты' },
    'mission.videos': { one: 'Посмотри {n} бонусное видео', few: 'Посмотри {n} бонусных видео', many: 'Посмотри {n} бонусных видео', other: 'Посмотри {n} бонусного видео' },
    'weekly.title': 'Эта неделя',
    'weekly.resetsIn': 'Сброс через',
    'weekly.reach': { one: 'Набери {n} очко', few: 'Набери {n} очка', many: 'Набери {n} очков', other: 'Набери {n} очка' },
    'weekly.hint': { one: 'Каждое выполненное задание добавляет к неделе {n} очко.', few: 'Каждое выполненное задание добавляет к неделе {n} очка.', many: 'Каждое выполненное задание добавляет к неделе {n} очков.', other: 'Каждое выполненное задание добавляет к неделе {n} очка.' },
    'ach.title': 'Цель достигнута!',
    'ach.complete': 'Всё выполнено!',
    'ach.games': { one: 'Сыграй {n} игру', few: 'Сыграй {n} игры', many: 'Сыграй {n} игр', other: 'Сыграй {n} игры' },
    'ach.merges': { one: 'Сделай {n} слияние', few: 'Сделай {n} слияния', many: 'Сделай {n} слияний', other: 'Сделай {n} слияния' },
    'ach.highestExp': 'Собери блок {block}',
    'ach.bestChain': 'Собери цепочку ×{n}',
    'ach.best': 'Набери {n} очков за игру',
    'ach.helpersUsed': { one: 'Используй {n} бустер', few: 'Используй {n} бустера', many: 'Используй {n} бустеров', other: 'Используй {n} бустера' },
    'ach.chestsOpened': { one: 'Открой {n} сундук', few: 'Открой {n} сундука', many: 'Открой {n} сундуков', other: 'Открой {n} сундука' },
    'ach.missionsDone': { one: 'Выполни {n} задание', few: 'Выполни {n} задания', many: 'Выполни {n} заданий', other: 'Выполни {n} задания' },
    'ach.collection': 'Скины и миры в коллекции: {n}',
    'ach.loginDays': { one: 'Забирай ежедневную награду {n} день', few: 'Забирай ежедневную награду {n} дня', many: 'Забирай ежедневную награду {n} дней', other: 'Забирай ежедневную награду {n} дня' },
    'reward.title': 'Награды',
    'reward.collect': 'Забрать',
    'reward.claim': 'Забрать',
    'reward.thanks': 'Спасибо!',
    'daily.title': 'Ежедневные награды',
    'daily.sub': 'Награда за каждый день в игре. На 7-й день — золотой сундук!',
    'daily.day': 'День {n}',
    'daily.claim': 'Забрать',
    'daily.tomorrow': 'Возвращайся завтра',
    'daily.double': 'Удвоить',
    'daily.doubled': 'Удвоено!',
    'spin.title': 'Колесо удачи',
    'spin.free': 'Крутить бесплатно',
    'spin.freeTag': 'Даром',
    'spin.oneFree': 'Один бесплатный оборот каждый день',
    'spin.again': 'Крутить ещё',
    'spin.adsLeft': 'Ещё за видео сегодня: {n}',
    'spin.tomorrow': 'Завтра',
    'spin.comeBack': 'Следующий бесплатный оборот — завтра',
    'spin.won': 'Выигрыш!',
    'odds.link': 'Шансы выпадения',
    'odds.title': 'Шансы выпадения',
    'odds.spinTitle': 'Шанс каждого приза при каждом обороте:',
    'odds.coins': '{a}–{b} монет',
    'odds.helpers': { one: '{n} бустер', few: '{n} бустера', many: '{n} бустеров', other: '{n} бустера' },
    'odds.extraHelper': '+1 бустер',
    'odds.look': 'Скин или мир, которого у тебя нет',
    'odds.helperNote': 'Каждый бустер — Молот, Джокер или Отмена, все с равным шансом.',
    'odds.allOwned': 'Уже есть все скины и миры? Тогда вместо них {s} монет (серебряный) или {g} монет (золотой).',
    'chest.wood': 'Деревянный сундук',
    'chest.silver': 'Серебряный сундук',
    'chest.gold': 'Золотой сундук',
    'chests.title': 'Сундуки',
    'chests.yourHelpers': 'Твои бустеры',
    'chests.helpersNote': 'Свои бустеры тратятся в игре первыми: без монет и видео.',
    'chests.open': 'Открыть',
    'chests.openNow': 'Открыть',
    'chests.freeReady': 'Бесплатно и готово!',
    'chests.freeEvery': { one: 'Бесплатно раз в {n} час', few: 'Бесплатно раз в {n} часа', many: 'Бесплатно раз в {n} часов', other: 'Бесплатно раз в {n} часа' },
    'chests.forCoins': 'За монеты',
    'chests.needCoins': { one: 'Не хватает {n} монеты', few: 'Не хватает {n} монет', many: 'Не хватает {n} монет', other: 'Не хватает {n} монеты' },
    'chests.videoChest': 'Сундук за видео',
    'chests.leftToday': 'Сегодня ещё: {n}',
    'chests.tomorrow': 'Завтра',
    'chests.goldSub': 'Много монет, 3 бустера, редкие скины',
    'chests.goldEarn': 'На 7-й день, в пропуске и за цели',
    'chests.earnIt': 'Заработать',
    'pass.title': 'Сезонный пропуск',
    'pass.season': 'Сезон {n}',
    'pass.lvl': 'Ур. {n}',
    'pass.max': 'Максимум!',
    'pass.howXp': 'Опыт дают игры, задания и ежедневные награды.',
    'pass.claimAll': 'Забрать всё',
    'pass.adXp': '+{n} опыта',
    'pass.xpAdded': '+{n} опыта!',
    'pass.free': 'Бесплатно',
    'pass.premium': 'Премиум',
    'pass.reachTier': 'Достигни уровня {n}, чтобы забрать',
    'offer.freeHelper': 'Бустер даром',
    'offer.freeHelperSub': 'Сегодня ещё: {n}',
    'ad.capReached': 'На сегодня видео закончились. Возвращайся завтра!',
    'power.use': 'Взять',
    'power.keepPlaying': 'Играй дальше: каждое слияние приносит монеты.',
    'power.watchOne': '«{power}» бесплатно',
    'time.dh': '{d}д {h}ч',
    'time.hm': '{h}ч {m}м',
    'time.ms': '{m}м {s}с',
    'time.s': '{s}с',
    // web build: the keyboard hint on desktop
    'web.aim': 'двигать',
    'web.drop': 'бросить',
    'web.column': 'столбец',
  },
};

let current = 'en';
const listeners = [];
let rules = null;

function pluralForm(n) {
  try {
    if (!rules || rules._lang !== current) {
      rules = new Intl.PluralRules(LANGS.find((l) => l.id === current).locale);
      rules._lang = current;
    }
    return rules.select(n);
  } catch (err) {
    return n === 1 ? 'one' : 'other';
  }
}

function lookup(lang, key) {
  const table = STRINGS[lang];
  return table && Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;
}

/** The string for `key` in the current language, placeholders filled in. */
function t(key, vars) {
  let s = lookup(current, key);
  if (s === undefined) s = lookup('en', key);
  if (s === undefined) return key;
  if (s && typeof s === 'object' && !Array.isArray(s)) {
    const n = vars && typeof vars.n === 'number' ? vars.n : 0;
    s = s[pluralForm(n)] ?? s.other ?? s.one;
  }
  if (!vars || typeof s !== 'string') return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => {
    if (!(k in vars)) return m;
    const v = vars[k];
    return typeof v === 'number' ? formatNumber(v) : String(v);
  });
}

/** "100 coins" / "100 монет" - a count of coins with the right word form. */
function coins(n) {
  return t('fmt.coins', { n });
}

function lang() {
  return current;
}

function detect() {
  const list = (typeof navigator !== 'undefined' && (navigator.languages || [navigator.language])) || [];
  for (const tag of list) {
    const code = String(tag || '').slice(0, 2).toLowerCase();
    if (STRINGS[code]) return code;
  }
  return 'en';
}

function setLanguage(id) {
  const next = STRINGS[id] ? id : 'en';
  current = next;
  const meta = LANGS.find((l) => l.id === next);
  setNumberLocale(meta.locale);
  if (typeof document !== 'undefined') document.documentElement.lang = next;
  for (const fn of listeners) fn(next);
  return next;
}

function onLanguage(fn) {
  listeners.push(fn);
}

/**
 * Fill every tagged element under `root`:
 *   data-i18n="key"        -> text
 *   data-i18n-aria="key"   -> aria-label
 */
function translateDom(root) {
  const scope = root || document;
  scope.querySelectorAll('[data-i18n]').forEach((el) => {
    const s = t(el.getAttribute('data-i18n'));
    if (el.textContent !== s) el.textContent = s;
  });
  scope.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
  });
}
__exports.LANGS = LANGS;
__exports.STRINGS = STRINGS;
__exports.t = t;
__exports.coins = coins;
__exports.lang = lang;
__exports.detect = detect;
__exports.setLanguage = setLanguage;
__exports.onLanguage = onLanguage;
__exports.translateDom = translateDom;
});
// ---- core/events.js ----
__define("core/events.js", function (__exports) {
/** Minimal event emitter. */
class Emitter {
  constructor() {
    this._handlers = new Map();
  }
  on(event, fn) {
    if (!this._handlers.has(event)) this._handlers.set(event, new Set());
    this._handlers.get(event).add(fn);
    return () => this.off(event, fn);
  }
  once(event, fn) {
    const off = this.on(event, (...args) => {
      off();
      fn(...args);
    });
    return off;
  }
  off(event, fn) {
    const set = this._handlers.get(event);
    if (set) set.delete(fn);
  }
  emit(event, ...args) {
    const set = this._handlers.get(event);
    if (!set) return;
    for (const fn of [...set]) {
      try {
        fn(...args);
      } catch (err) {
        console.error(`[events] handler for "${event}" failed`, err);
      }
    }
  }
}
__exports.Emitter = Emitter;
});
// ---- core/particles.js ----
__define("core/particles.js", function (__exports) {
const { shade } = __import("core/utils.js");

/**
 * Lightweight particle system. Shapes are chosen to belong to the toy world:
 * tiny rounded blocks, soft dust puffs, four-point glints and confetti ribbons.
 */
class Particles {
  constructor() {
    this.items = [];
  }

  burst(x, y, color, opts = {}) {
    const count = opts.count ?? 12;
    const speed = opts.speed ?? 260;
    const size = opts.size ?? 7;
    const light = shade(color, 0.4);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      const roll = Math.random();
      const shape = opts.shape || (roll < 0.55 ? 'block' : roll < 0.8 ? 'circle' : 'star');
      this.items.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 60,
        life: 0,
        ttl: 0.5 + Math.random() * 0.4,
        size: size * (0.5 + Math.random()) * (shape === 'star' ? 0.8 : 1),
        color: shape === 'star' ? '#FFFFFF' : Math.random() < 0.35 ? light : color,
        hi: light,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 10,
        gravity: opts.gravity ?? 620,
        drag: 0.975,
        shape,
        shrink: true,
      });
    }
  }

  /** Soft dust kicked out from under a block when it lands. */
  puff(x, y, w, color = 'rgba(255,255,255,0.8)', count = 6) {
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      this.items.push({
        x: x + side * w * (0.3 + Math.random() * 0.2),
        y: y - Math.random() * 4,
        vx: side * (40 + Math.random() * 70),
        vy: -(10 + Math.random() * 30),
        life: 0,
        ttl: 0.4 + Math.random() * 0.25,
        size: w * (0.1 + Math.random() * 0.08),
        grow: 1.8,
        color,
        rot: 0,
        vr: 0,
        gravity: 0,
        drag: 0.9,
        shape: 'puff',
      });
    }
  }

  confetti(x, y, colors, count = 60) {
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const s = 380 + Math.random() * 420;
      this.items.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0,
        ttl: 1.3 + Math.random() * 0.9,
        size: 6 + Math.random() * 6,
        color: colors[i % colors.length],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 14,
        gravity: 820,
        shape: Math.random() < 0.5 ? 'block' : 'strip',
        drag: 0.982,
        flutter: Math.random() * 6,
      });
    }
  }

  sparkle(x, y, color = '#FFFFFF', count = 6, spread = 20) {
    for (let i = 0; i < count; i++) {
      this.items.push({
        x: x + (Math.random() - 0.5) * spread,
        y: y + (Math.random() - 0.5) * spread,
        vx: (Math.random() - 0.5) * 50,
        vy: -30 - Math.random() * 60,
        life: 0,
        ttl: 0.55 + Math.random() * 0.45,
        size: 3.5 + Math.random() * 4,
        color,
        rot: Math.random(),
        vr: (Math.random() - 0.5) * 3,
        gravity: 0,
        drag: 0.97,
        shape: 'star',
        twinkle: true,
      });
    }
  }

  update(dt) {
    if (!this.items.length) return;
    const f = Math.min(dt, 0.05) * 60;
    for (const p of this.items) {
      p.life += dt;
      p.vy += p.gravity * dt;
      if (p.drag) {
        const d = Math.pow(p.drag, f);
        p.vx *= d;
        p.vy *= d;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.flutter) p.x += Math.sin(p.life * 9 + p.flutter) * 0.6;
    }
    this.items = this.items.filter((p) => p.life < p.ttl);
  }

  draw(ctx) {
    for (const p of this.items) {
      const t = p.life / p.ttl;
      let alpha = t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35;
      let s = p.size;
      if (p.shrink) s *= 1 - t * 0.5;
      if (p.grow) s *= 1 + t * p.grow;
      if (p.twinkle) {
        const k = Math.sin(t * Math.PI);
        s *= 0.4 + 0.8 * k;
        alpha = k;
      }
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha) * (p.shape === 'puff' ? 0.55 : 1);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'block' || p.shape === 'square') {
        const r = s * 0.28;
        ctx.beginPath();
        ctx.moveTo(-s / 2 + r, -s / 2);
        ctx.arcTo(s / 2, -s / 2, s / 2, s / 2, r);
        ctx.arcTo(s / 2, s / 2, -s / 2, s / 2, r);
        ctx.arcTo(-s / 2, s / 2, -s / 2, -s / 2, r);
        ctx.arcTo(-s / 2, -s / 2, s / 2, -s / 2, r);
        ctx.fill();
        if (s > 4) {
          ctx.fillStyle = 'rgba(255,255,255,0.45)';
          ctx.fillRect(-s * 0.3, -s * 0.36, s * 0.6, s * 0.18);
        }
      } else if (p.shape === 'strip') {
        ctx.fillRect(-s / 2, -s / 5, s, s / 2.5);
      } else if (p.shape === 'star') {
        // four-point glint with curved sides
        const R = s * 1.5;
        const q = s * 0.22;
        ctx.beginPath();
        ctx.moveTo(0, -R);
        ctx.quadraticCurveTo(q, -q, R, 0);
        ctx.quadraticCurveTo(q, q, 0, R);
        ctx.quadraticCurveTo(-q, q, -R, 0);
        ctx.quadraticCurveTo(-q, -q, 0, -R);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  get count() {
    return this.items.length;
  }

  clear() {
    this.items = [];
  }
}
__exports.Particles = Particles;
});
// ---- core/tween.js ----
__define("core/tween.js", function (__exports) {
const { Ease, clamp } = __import("core/utils.js");

/**
 * Tiny tween manager driven by the game loop (Tweens.update(now)).
 * tweens.to(obj, { x: 10 }, { duration, ease, delay, onUpdate }) -> Promise
 */
class Tweens {
  constructor() {
    this.list = [];
    this.time = 0;
  }

  to(target, props, opts = {}) {
    const duration = Math.max(1, opts.duration ?? 200);
    const ease = typeof opts.ease === 'function' ? opts.ease : Ease[opts.ease || 'outQuad'] || Ease.outQuad;
    const delay = opts.delay || 0;
    const keys = Object.keys(props);
    const from = {};
    return new Promise((resolve) => {
      this.list.push({
        target,
        props,
        keys,
        from,
        duration,
        ease,
        onUpdate: opts.onUpdate,
        start: this.time + delay,
        started: false,
        done: false,
        resolve,
      });
    });
  }

  /** Run a function every frame for `duration` ms with progress 0..1. */
  run(duration, fn, opts = {}) {
    const obj = { t: 0 };
    return this.to(obj, { t: 1 }, { duration, ease: opts.ease || 'linear', delay: opts.delay, onUpdate: () => fn(obj.t) });
  }

  delay(ms) {
    return this.run(ms, () => {});
  }

  update(time) {
    this.time = time;
    if (!this.list.length) return;
    const finished = [];
    for (const tw of this.list) {
      if (time < tw.start) continue;
      if (!tw.started) {
        tw.started = true;
        for (const k of tw.keys) tw.from[k] = tw.target[k];
      }
      const p = clamp((time - tw.start) / tw.duration, 0, 1);
      const e = tw.ease(p);
      for (const k of tw.keys) tw.target[k] = tw.from[k] + (tw.props[k] - tw.from[k]) * e;
      if (tw.onUpdate) tw.onUpdate(e, p);
      if (p >= 1) {
        tw.done = true;
        finished.push(tw);
      }
    }
    if (finished.length) {
      this.list = this.list.filter((t) => !t.done);
      for (const tw of finished) tw.resolve();
    }
  }

  get active() {
    return this.list.length > 0;
  }

  clear() {
    const pending = this.list;
    this.list = [];
    for (const tw of pending) tw.resolve();
  }
}
__exports.Tweens = Tweens;
});
// ---- render/effects.js ----
__define("render/effects.js", function (__exports) {
const { Ease, FONT_STACK, shade } = __import("core/utils.js");
const { t } = __import("core/i18n.js");

const hex = (c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);

/**
 * Floating score popups, combo call-outs, shock rings and screen flashes drawn on
 * the game canvas. Text is styled like the numerals on the blocks: white candy
 * lettering with a coloured outline and a soft drop, so it belongs to the same world.
 */
class Effects {
  constructor() {
    this.popups = [];
    this.rings = [];
    this.combo = null;
    this.flash = null;
  }

  popup(x, y, text, color, opts = {}) {
    this.popups.push({
      x,
      y,
      text,
      color,
      life: 0,
      ttl: opts.ttl ?? 0.95,
      size: opts.size ?? 18,
      rise: opts.rise ?? 54,
      weight: opts.weight ?? 900,
    });
  }

  /** An expanding soft ring — the shockwave of a merge. */
  ring(x, y, color, radius, opts = {}) {
    this.rings.push({ x, y, color, radius, life: 0, ttl: opts.ttl ?? 0.5, width: opts.width ?? 6 });
  }

  comboText(x, y, chain, color) {
    const words = t('fx.words');
    const sub = words[Math.min(chain, words.length - 1)];
    this.combo = { x, y, text: t('fx.combo', { n: chain }), sub, color, life: 0, ttl: 1.25, chain };
  }

  banner(x, y, text, color) {
    this.combo = { x, y, text, color, life: 0, ttl: 1.8, big: true };
  }

  flashScreen(color = 'rgba(255,255,255,0.5)', ttl = 0.25) {
    this.flash = { color, life: 0, ttl };
  }

  update(dt) {
    for (const p of this.popups) p.life += dt;
    this.popups = this.popups.filter((p) => p.life < p.ttl);
    for (const r of this.rings) r.life += dt;
    this.rings = this.rings.filter((r) => r.life < r.ttl);
    if (this.combo) {
      this.combo.life += dt;
      if (this.combo.life >= this.combo.ttl) this.combo = null;
    }
    if (this.flash) {
      this.flash.life += dt;
      if (this.flash.life >= this.flash.ttl) this.flash = null;
    }
  }

  get active() {
    return this.popups.length > 0 || this.rings.length > 0 || !!this.combo || !!this.flash;
  }

  /**
   * White candy lettering with a coloured outline and a soft shadow. With `maxW` the words
   * shrink to fit, so a longer language never runs off the board.
   */
  candyText(ctx, text, size, color, maxW = 0) {
    const dark = hex(color) ? shade(color, -0.38) : 'rgba(0,0,0,0.45)';
    ctx.font = `900 ${size}px ${FONT_STACK}`;
    if (maxW > 0) {
      const w = ctx.measureText(text).width + size * 0.3;
      if (w > maxW) {
        size *= maxW / w;
        ctx.font = `900 ${size}px ${FONT_STACK}`;
      }
    }
    ctx.lineJoin = 'round';
    ctx.fillStyle = 'rgba(40,20,30,0.22)';
    ctx.fillText(text, 0, size * 0.1);
    ctx.lineWidth = Math.max(4, size * 0.24);
    ctx.strokeStyle = dark;
    ctx.strokeText(text, 0, 0);
    ctx.lineWidth = Math.max(2, size * 0.1);
    ctx.strokeStyle = hex(color) ? color : dark;
    ctx.strokeText(text, 0, 0);
    const g = ctx.createLinearGradient(0, -size * 0.5, 0, size * 0.5);
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(1, hex(color) ? shade(color, 0.78) : '#FFF6E8');
    ctx.fillStyle = g;
    ctx.fillText(text, 0, 0);
  }

  draw(ctx, w, h) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const r of this.rings) {
      const t = r.life / r.ttl;
      const e = Ease.outCubic(t);
      ctx.save();
      ctx.globalAlpha = (1 - t) * 0.85;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = Math.max(1, r.width * (1 - t));
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius * (0.35 + e * 0.9), 0, Math.PI * 2);
      ctx.stroke();
      if (hex(r.color)) {
        ctx.globalAlpha = (1 - t) * 0.5;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = Math.max(1, r.width * 1.8 * (1 - t));
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius * (0.3 + e * 0.75), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    for (const p of this.popups) {
      const t = p.life / p.ttl;
      const y = p.y - Ease.outCubic(t) * p.rise;
      const alpha = t < 0.62 ? 1 : 1 - (t - 0.62) / 0.38;
      const scale = 0.5 + 0.5 * Ease.outBack(Math.min(1, t * 3.2));
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.translate(p.x, y);
      ctx.scale(scale, scale);
      this.candyText(ctx, p.text, p.size, p.color);
      ctx.restore();
    }

    if (this.combo) {
      const c = this.combo;
      const t = c.life / c.ttl;
      const inT = Math.min(1, t * (c.big ? 2.6 : 2.2));
      const scale = c.big ? 0.4 + 0.6 * Ease.outBack(inT) : 0.3 + 0.7 * Ease.outElastic(inT);
      const alpha = t < 0.72 ? 1 : 1 - (t - 0.72) / 0.28;
      const size = Math.min(w * 0.085, c.big ? 34 : 32);
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.translate(c.x, c.y - Ease.outCubic(t) * 16);
      ctx.rotate(c.big ? 0 : Math.sin(c.life * 7) * 0.04 * (1 - t));
      ctx.scale(scale, scale);
      // soft glow plate behind the words
      const glowR = size * (c.big ? 5 : 4);
      ctx.save();
      ctx.scale(1, 0.42);
      const gl = ctx.createRadialGradient(0, size * 0.6, 0, 0, size * 0.6, glowR);
      gl.addColorStop(0, 'rgba(255,255,255,0.42)');
      gl.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gl;
      ctx.beginPath();
      ctx.arc(0, size * 0.6, glowR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      const room = w * 0.9;
      this.candyText(ctx, c.text, size, c.color, room);
      if (c.sub) {
        ctx.translate(0, size * 0.95);
        this.candyText(ctx, c.sub, size * 0.58, c.color, room);
      }
      ctx.restore();
    }

    if (this.flash) {
      const t = this.flash.life / this.flash.ttl;
      ctx.save();
      ctx.globalAlpha = 1 - Ease.outQuad(t);
      ctx.fillStyle = this.flash.color;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }
}
__exports.Effects = Effects;
});
// ---- render/palette.js ----
__define("render/palette.js", function (__exports) {
/** Tile colours by exponent (2 = exp 1). 8 and 16 match the original game's pink and blue. */
const TILE_COLORS = {
  1: '#F6C445', // 2
  2: '#F79A3E', // 4
  3: '#E9637A', // 8
  4: '#59B8E7', // 16
  5: '#5DC87E', // 32
  6: '#9B6EE0', // 64
  7: '#3EC1B5', // 128
  8: '#EA5A4C', // 256
  9: '#5C6BC0', // 512
  10: '#D65AA8', // 1024
  11: '#F0B429', // 2048
  12: '#3F51B5', // 4096
  13: '#2E8B7A', // 8192
  14: '#7B1FA2', // 16K
  15: '#C62828', // 32K
  16: '#37474F', // 65K
};
const EXTRA = ['#1B5E20', '#4E342E', '#263238', '#6A1B9A', '#00695C'];

const JOKER_COLOR = '#E9637A';

function tileColor(exp, joker = false) {
  if (joker) return JOKER_COLOR;
  return TILE_COLORS[exp] || EXTRA[(exp - 17) % EXTRA.length];
}

/** Colours used for confetti and celebrations. */
const PARTY_COLORS = ['#F6C445', '#F79A3E', '#E9637A', '#59B8E7', '#5DC87E', '#9B6EE0', '#3EC1B5'];
__exports.TILE_COLORS = TILE_COLORS;
__exports.JOKER_COLOR = JOKER_COLOR;
__exports.tileColor = tileColor;
__exports.PARTY_COLORS = PARTY_COLORS;
});
// ---- services/audio.js ----
__define("services/audio.js", function (__exports) {
/**
 * Sound for Tumblio, synthesised with the Web Audio API - no audio files, nothing
 * to license, and the app stays tiny.
 *
 * The palette is deliberately soft: marimba and kalimba tones, felt thumps and
 * glassy chimes, all sent through a gentle room reverb. Merges climb a pentatonic
 * scale as a chain grows, so a big combo plays a little melody instead of beeps.
 * An optional generative music bed (slow pads + sparse kalimba) runs underneath.
 */

// C major pentatonic across three octaves - any two of these sound good together
const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.7, 1318.5, 1568.0];

// music: four gentle chords, each held for a bar (Cmaj9, Am9, Fmaj9, G6/9)
const CHORDS = [
  [130.81, 196.0, 246.94, 329.63, 293.66],
  [110.0, 164.81, 196.0, 261.63, 246.94],
  [87.31, 130.81, 164.81, 220.0, 196.0],
  [98.0, 146.83, 196.0, 246.94, 220.0],
];
const MELODY = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.7];
const MASTER = 0.9;
const MUSIC = 0.36;

const Audio = {
  ctx: null,
  master: null,
  sfx: null,
  musicBus: null,
  reverb: null,
  enabled: true,
  musicOn: true,
  unlocked: false,
  _ducked: false,
  _music: null,

  init(enabled = true, music = true) {
    this.enabled = enabled;
    this.musicOn = music;
    // (the method is not called `unlock`: that name is the shop's unlock jingle, and a
    // second key with the same name silently replaced this one - the game had no sound)
    const unlock = () => this.wake();
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this._stopMusic();
      else this._syncMusic();
    });
  },

  /** Create/resume the audio context. Must run inside a user gesture on iOS. */
  wake() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const ctx = new AC();
        this.ctx = ctx;
        // master -> soft limiter -> speakers
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -14;
        comp.knee.value = 18;
        comp.ratio.value = 3;
        comp.attack.value = 0.004;
        comp.release.value = 0.2;
        comp.connect(ctx.destination);
        this.master = ctx.createGain();
        this.master.gain.value = MASTER;
        this.master.connect(comp);
        // a warm room: generated impulse response, darkened with a lowpass
        this.reverb = ctx.createConvolver();
        this.reverb.buffer = this._impulse(2.2, 2.8);
        const wetTone = ctx.createBiquadFilter();
        wetTone.type = 'lowpass';
        wetTone.frequency.value = 3800;
        const wet = ctx.createGain();
        wet.gain.value = 0.32;
        this.reverb.connect(wetTone);
        wetTone.connect(wet);
        wet.connect(this.master);
        // effects bus: rounded-off highs so nothing is ever sharp
        const soften = ctx.createBiquadFilter();
        soften.type = 'lowpass';
        soften.frequency.value = 7000;
        soften.connect(this.master);
        this.sfx = ctx.createGain();
        this.sfx.gain.value = 1;
        this.sfx.connect(soften);
        this.musicBus = ctx.createGain();
        this.musicBus.gain.value = 0;
        this.musicBus.connect(this.master);
        const musicSend = ctx.createGain();
        musicSend.gain.value = 0.9;
        this.musicBus.connect(musicSend);
        musicSend.connect(this.reverb);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.unlocked = true;
      this._syncMusic();
    } catch (err) {
      console.warn('[audio] unavailable', err);
    }
  },

  _impulse(seconds, decay) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  },

  setEnabled(v) {
    this.enabled = v;
  },

  setMusic(v) {
    this.musicOn = v;
    this._syncMusic();
  },

  /** Quieten everything while an ad plays its own audio. */
  setDucked(v) {
    this._ducked = v;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(v ? 0 : MASTER, t, 0.08);
  },

  _ready() {
    return this.enabled && this.ctx && this.ctx.state === 'running';
  },

  _out(send) {
    // returns a gain node wired to the effects bus, plus a reverb send
    const g = this.ctx.createGain();
    g.connect(this.sfx);
    if (send > 0) {
      const s = this.ctx.createGain();
      s.gain.value = send;
      g.connect(s);
      s.connect(this.reverb);
    }
    return g;
  },

  tone({ type = 'sine', freq = 440, to = null, dur = 0.15, vol = 0.3, delay = 0, attack = 0.005, filter = null, curve = 'exp', send = 0.25, dest = null } = {}) {
    if (!dest && !this._ready()) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) {
      if (curve === 'exp') osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
      else osc.frequency.linearRampToValueAtTime(to, t0 + dur);
    }
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = osc;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = filter.type || 'lowpass';
      f.frequency.value = filter.freq || 1200;
      f.Q.value = filter.q || 0.7;
      osc.connect(f);
      node = f;
    }
    node.connect(gain);
    gain.connect(dest || this._out(send));
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  },

  noise({ dur = 0.12, vol = 0.2, delay = 0, freq = 1500, type = 'lowpass', sweepTo = null, q = 0.8, attack = 0.004, send = 0.15 } = {}) {
    if (!this._ready()) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    if (!this._noiseBuf) {
      const len = Math.floor(ctx.sampleRate * 1.0);
      this._noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this._noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t0);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(gain);
    gain.connect(this._out(send));
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.02);
  },

  /** Marimba-ish: a round fundamental plus the bar's bright 4th partial, decaying fast. */
  marimba(freq, { vol = 0.22, delay = 0, dur = 0.7, send = 0.3 } = {}) {
    this.tone({ type: 'sine', freq, dur, vol, delay, attack: 0.004, send });
    this.tone({ type: 'sine', freq: freq * 3.99, dur: dur * 0.18, vol: vol * 0.28, delay, attack: 0.002, send });
    this.tone({ type: 'triangle', freq: freq * 2, dur: dur * 0.35, vol: vol * 0.12, delay, attack: 0.003, send });
  },

  /** Glassy chime: inharmonic partials give it that bell shimmer. */
  chime(freq, { vol = 0.12, delay = 0, dur = 1.2, send = 0.5 } = {}) {
    this.tone({ type: 'sine', freq, dur, vol, delay, attack: 0.003, send });
    this.tone({ type: 'sine', freq: freq * 2.76, dur: dur * 0.5, vol: vol * 0.35, delay, attack: 0.002, send });
    this.tone({ type: 'sine', freq: freq * 5.4, dur: dur * 0.25, vol: vol * 0.15, delay, attack: 0.002, send });
  },

  // ---- game sounds ----------------------------------------------------------
  click() {
    // a soft wooden "tok"
    this.tone({ type: 'sine', freq: 1250, to: 820, dur: 0.06, vol: 0.09, send: 0.05 });
    this.noise({ dur: 0.03, vol: 0.03, freq: 2600, type: 'bandpass', q: 2, send: 0 });
  },
  drop() {
    this.noise({ dur: 0.2, vol: 0.05, freq: 1600, sweepTo: 450, type: 'bandpass', q: 1.2, attack: 0.03, send: 0.1 });
  },
  land() {
    // felt thump + a tiny woody knock
    this.tone({ type: 'sine', freq: 170, to: 82, dur: 0.16, vol: 0.26, send: 0.08 });
    this.tone({ type: 'triangle', freq: 330, dur: 0.07, vol: 0.05, filter: { freq: 900 }, send: 0.1 });
  },
  merge(chain = 1, exp = 3) {
    // each link in a chain climbs the scale; bigger blocks ring lower and fuller
    const base = 5 + Math.min(4, Math.max(0, exp - 3) >> 1);
    const idx = Math.min(SCALE.length - 1, base + (chain - 1));
    const f = SCALE[idx];
    this.marimba(f, { vol: 0.2, dur: 0.8 });
    this.marimba(f / 2, { vol: 0.08, dur: 0.6, delay: 0.004 });
    if (chain >= 2) this.chime(SCALE[Math.min(SCALE.length - 1, idx + 2)], { vol: 0.05 + Math.min(0.06, chain * 0.012), delay: 0.05 });
    this.noise({ dur: 0.18, vol: 0.02, freq: 5200, type: 'highpass', send: 0.4, attack: 0.01 });
  },
  bigMerge() {
    [5, 7, 9, 10].forEach((i, k) => this.marimba(SCALE[i], { vol: 0.16, delay: k * 0.08 }));
  },
  milestone() {
    [5, 7, 8, 10, 12].forEach((i, k) => this.chime(SCALE[i], { vol: 0.1, delay: k * 0.09, dur: 1.6 }));
    this.marimba(SCALE[0], { vol: 0.14, delay: 0.05, dur: 1.4 });
    this.marimba(SCALE[5], { vol: 0.1, delay: 0.05, dur: 1.2 });
  },
  removeTiles() {
    this.noise({ dur: 0.5, vol: 0.05, freq: 900, sweepTo: 5000, type: 'bandpass', q: 1.4, attack: 0.08, send: 0.5 });
    [7, 9, 10, 12].forEach((i, k) => this.chime(SCALE[i], { vol: 0.06, delay: 0.1 + k * 0.06 }));
  },
  coin() {
    this.chime(1318.5, { vol: 0.08, dur: 0.5 });
    this.chime(1760.0, { vol: 0.08, dur: 0.8, delay: 0.07 });
  },
  unlock() {
    [5, 7, 8, 10].forEach((i, k) => this.marimba(SCALE[i], { vol: 0.15, delay: k * 0.08 }));
    this.chime(SCALE[12], { vol: 0.08, delay: 0.34, dur: 1.6 });
  },
  gameOver() {
    // a gentle, unhurried fall - no buzzers
    [8, 7, 5, 3].forEach((i, k) => this.marimba(SCALE[i], { vol: 0.15, delay: k * 0.2, dur: 1.0 }));
    this.marimba(SCALE[0] / 2, { vol: 0.12, delay: 0.8, dur: 1.8 });
  },
  error() {
    this.tone({ type: 'sine', freq: 220, to: 160, dur: 0.18, vol: 0.14, send: 0.1 });
    this.tone({ type: 'sine', freq: 233, to: 170, dur: 0.18, vol: 0.07, send: 0.1 });
  },
  hammer() {
    this.tone({ type: 'sine', freq: 140, to: 60, dur: 0.22, vol: 0.3, send: 0.1 });
    this.noise({ dur: 0.14, vol: 0.12, freq: 1400, sweepTo: 300, send: 0.15 });
    this.tone({ type: 'triangle', freq: 520, dur: 0.08, vol: 0.05, filter: { freq: 1400 } });
  },
  undo() {
    this.tone({ type: 'sine', freq: 520, to: 330, dur: 0.22, vol: 0.1, attack: 0.02, send: 0.35 });
    this.chime(659.25, { vol: 0.04, delay: 0.12, dur: 0.6 });
  },
  joker() {
    [9, 10, 11, 12].forEach((i, k) => this.chime(SCALE[i], { vol: 0.07, delay: k * 0.05, dur: 1.0 }));
  },
  whoosh() {
    this.noise({ dur: 0.3, vol: 0.05, freq: 500, sweepTo: 2600, type: 'bandpass', q: 1.2, attack: 0.06, send: 0.3 });
  },

  // ---- music ----------------------------------------------------------------
  _syncMusic() {
    const want = this.musicOn && this.ctx && this.ctx.state === 'running' && !document.hidden;
    if (want && !this._music) this._startMusic();
    else if (!want && this._music) this._stopMusic();
  },

  _startMusic() {
    const ctx = this.ctx;
    const bar = 7.2; // seconds per chord - slow on purpose
    const m = { next: ctx.currentTime + 0.3, chord: 0, timer: null, noteAt: ctx.currentTime + 1.5 };
    this._music = m;
    const t = ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, t);
    this.musicBus.gain.linearRampToValueAtTime(MUSIC, t + 3);
    const schedule = () => {
      if (this._music !== m) return;
      const now = ctx.currentTime;
      // pads, scheduled a bar ahead
      while (m.next < now + 1.5) {
        const chord = CHORDS[m.chord % CHORDS.length];
        chord.forEach((f, i) => this._pad(f, m.next, bar, i));
        m.next += bar;
        m.chord++;
      }
      // sparse kalimba notes drifting over the top
      while (m.noteAt < now + 1.5) {
        if (Math.random() < 0.62) {
          const f = MELODY[Math.floor(Math.random() * MELODY.length)];
          this._pluck(f, m.noteAt);
          if (Math.random() < 0.25) this._pluck(f * 1.5 > 1400 ? f * 0.75 : f * 1.5, m.noteAt + 0.18);
        }
        m.noteAt += 0.9 + Math.random() * 1.6;
      }
    };
    schedule();
    m.timer = setInterval(schedule, 400);
  },

  _stopMusic() {
    const m = this._music;
    if (!m) return;
    clearInterval(m.timer);
    this._music = null;
    if (this.ctx) {
      const t = this.ctx.currentTime;
      this.musicBus.gain.cancelScheduledValues(t);
      this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, t);
      this.musicBus.gain.linearRampToValueAtTime(0, t + 0.6);
    }
  },

  _pad(freq, t0, len, i) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(700, t0);
    f.frequency.linearRampToValueAtTime(1100, t0 + len * 0.5);
    f.frequency.linearRampToValueAtTime(700, t0 + len + 2);
    f.connect(g);
    g.connect(this.musicBus);
    const peak = i === 0 ? 0.07 : 0.045;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 2.2);
    g.gain.setValueAtTime(peak, t0 + len - 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + len + 2.4);
    for (const det of [-5, 5]) {
      const o = ctx.createOscillator();
      o.type = i === 0 ? 'sine' : 'triangle';
      o.frequency.value = freq;
      o.detune.value = det;
      o.connect(f);
      o.start(t0);
      o.stop(t0 + len + 2.5);
    }
  },

  _pluck(freq, t0) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.connect(this.musicBus);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.05, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    o.connect(g);
    o.start(t0);
    o.stop(t0 + 1.7);
    const g2 = ctx.createGain();
    g2.connect(this.musicBus);
    g2.gain.setValueAtTime(0.0001, t0);
    g2.gain.linearRampToValueAtTime(0.012, t0 + 0.003);
    g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = freq * 5.95;
    o2.connect(g2);
    o2.start(t0);
    o2.stop(t0 + 0.35);
  },
};
__exports.Audio = Audio;
});
// ---- services/haptics.js ----
__define("services/haptics.js", function (__exports) {
/** Haptic feedback in the browser: navigator.vibrate where the device has it (Android phones). */
const Haptics = {
  enabled: true,

  /** True when this device can vibrate at all (the Haptics switches are hidden otherwise). */
  get supported() {
    try {
      return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function' && matchMedia('(pointer: coarse)').matches;
    } catch {
      return false;
    }
  },

  init(enabled = true) {
    this.enabled = enabled;
  },

  async impact(style = 'light') {
    if (!this.enabled) return;
    this._vibrate(style === 'heavy' ? 30 : style === 'medium' ? 18 : 8);
  },

  async notification(type = 'success') {
    if (!this.enabled) return;
    this._vibrate(type === 'error' ? [30, 40, 30] : [12, 30, 12]);
  },

  _vibrate(pattern) {
    try {
      if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  },
};
__exports.Haptics = Haptics;
});
// ---- game/board.js ----
__define("game/board.js", function (__exports) {
const { GRID } = __import("config.js");

/**
 * Pure game logic for the drop-and-merge board. No rendering, no timers.
 *
 * Coordinates: column c (0 = left), row r (0 = bottom). Columns are always compact
 * (no gaps) - gravity() restores that after removals.
 *
 * Merge rule (same as the original game):
 *   when a block "lands" (dropped, fell, or was just merged) it looks at the block
 *   below, left and right. Every neighbour with the same number merges into it:
 *   1 match -> x2, 2 matches -> x4, 3 matches -> x8.
 *   If the block below matched, the result moves down into that cell.
 *   A joker (∞) matches any number and takes the highest neighbour's value.
 *   Merges chain until nothing matches anymore.
 */
class Board {
  constructor(cols = GRID.COLS, rows = GRID.ROWS) {
    this.cols = cols;
    this.rows = rows;
    this.cells = Array.from({ length: cols }, () => new Array(rows).fill(null));
    this.pos = new Map(); // tile id -> {c, r}
    this.nextId = 1;
  }

  createTile(exp, joker = false) {
    return { id: this.nextId++, exp: joker ? 0 : exp, joker: !!joker };
  }

  inBounds(c, r) {
    return c >= 0 && c < this.cols && r >= 0 && r < this.rows;
  }

  get(c, r) {
    return this.inBounds(c, r) ? this.cells[c][r] : null;
  }

  positionOf(tile) {
    return this.pos.get(tile.id) || null;
  }

  height(c) {
    const col = this.cells[c];
    for (let r = 0; r < this.rows; r++) if (!col[r]) return r;
    return this.rows;
  }

  isFull(c) {
    return this.height(c) >= this.rows;
  }

  allFull() {
    for (let c = 0; c < this.cols; c++) if (!this.isFull(c)) return false;
    return true;
  }

  isEmpty() {
    return this.count() === 0;
  }

  count() {
    let n = 0;
    for (let c = 0; c < this.cols; c++) n += this.height(c);
    return n;
  }

  /** Row the next block lands on in column c (== rows when the column is full). */
  landingRow(c) {
    return this.height(c);
  }

  maxExp() {
    let m = 0;
    for (const { tile } of this.tiles()) if (!tile.joker && tile.exp > m) m = tile.exp;
    return m;
  }

  tiles() {
    const out = [];
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        const tile = this.cells[c][r];
        if (tile) out.push({ tile, c, r });
      }
    }
    return out;
  }

  _set(c, r, tile) {
    this.cells[c][r] = tile;
    if (tile) this.pos.set(tile.id, { c, r });
  }

  _clear(c, r) {
    const t = this.cells[c][r];
    if (t) this.pos.delete(t.id);
    this.cells[c][r] = null;
    return t;
  }

  place(c, tile) {
    const r = this.height(c);
    if (r >= this.rows) throw new Error(`Column ${c} is full`);
    this._set(c, r, tile);
    return r;
  }

  /** Remove a tile without applying gravity (call resolve({initialGravity:true}) afterwards). */
  remove(c, r) {
    return this._clear(c, r);
  }

  removeAllOfExp(exp) {
    const removed = [];
    for (const { tile, c, r } of this.tiles()) {
      if (!tile.joker && tile.exp === exp) {
        this._clear(c, r);
        removed.push({ tile, c, r });
      }
    }
    return removed;
  }

  findMatches(c, r) {
    const tile = this.get(c, r);
    if (!tile) return null;
    const nb = [];
    const push = (cc, rr, dir) => {
      const t = this.get(cc, rr);
      if (t) nb.push({ c: cc, r: rr, tile: t, dir });
    };
    push(c, r - 1, 'below');
    push(c - 1, r, 'left');
    push(c + 1, r, 'right');
    if (!nb.length) return null;

    let base;
    if (tile.joker) {
      const vals = nb.filter((n) => !n.tile.joker).map((n) => n.tile.exp);
      if (!vals.length) return null; // jokers next to jokers wait for a number
      base = Math.max(...vals);
    } else {
      base = tile.exp;
    }
    const matches = nb.filter((n) => n.tile.joker || n.tile.exp === base);
    if (!matches.length) return null;
    const below = matches.find((n) => n.dir === 'below');
    const target = below ? { c: below.c, r: below.r } : { c, r };
    return {
      c,
      r,
      tile,
      base,
      count: matches.length,
      newExp: base + matches.length,
      target,
      matches: matches.map((n) => ({ c: n.c, r: n.r, tile: n.tile, dir: n.dir })),
    };
  }

  applyMerge(m) {
    const { c, r, tile, target, matches, newExp } = m;
    const removed = [];
    for (const n of matches) {
      this._clear(n.c, n.r);
      removed.push({ tile: n.tile, c: n.c, r: n.r });
    }
    if (target.c !== c || target.r !== r) this._clear(c, r);
    tile.exp = newExp;
    tile.joker = false;
    this._set(target.c, target.r, tile);
    return { tile, from: { c, r }, target: { c: target.c, r: target.r }, removed, newExp, count: m.count, base: m.base };
  }

  /** Let every tile fall as far as it can. Returns the moves that happened. */
  gravity() {
    const moves = [];
    for (let c = 0; c < this.cols; c++) {
      let w = 0;
      for (let r = 0; r < this.rows; r++) {
        const t = this.cells[c][r];
        if (!t) continue;
        if (w !== r) {
          this.cells[c][r] = null;
          this.cells[c][w] = t;
          this.pos.set(t.id, { c, r: w });
          moves.push({ tile: t, from: { c, r }, to: { c, r: w } });
        }
        w++;
      }
    }
    return moves;
  }

  /**
   * Resolve all merges starting from the given active positions.
   * Returns an ordered list of steps: { merge: {...}|null, moves: [...] } that the
   * game animates one after another. The board is already in its final state
   * when this returns.
   */
  resolve({ active = [], initialGravity = false } = {}) {
    const steps = [];
    const activeIds = new Set();
    for (const p of active) {
      const t = this.get(p.c, p.r);
      if (t) activeIds.add(t.id);
    }
    if (initialGravity) {
      const moves = this.gravity();
      if (moves.length) {
        steps.push({ merge: null, moves });
        for (const mv of moves) activeIds.add(mv.tile.id);
      }
    }
    for (let guard = 0; guard < 500; guard++) {
      const cands = [...activeIds]
        .map((id) => ({ id, pos: this.pos.get(id) }))
        .filter((x) => x.pos)
        .sort((a, b) => a.pos.r - b.pos.r || a.pos.c - b.pos.c);
      let m = null;
      for (const cand of cands) {
        m = this.findMatches(cand.pos.c, cand.pos.r);
        if (m) break;
      }
      if (!m) break;
      const merge = this.applyMerge(m);
      const moves = this.gravity();
      steps.push({ merge, moves });
      for (const rm of merge.removed) activeIds.delete(rm.tile.id);
      activeIds.add(merge.tile.id);
      for (const mv of moves) activeIds.add(mv.tile.id);
    }
    return steps;
  }

  serialize() {
    return {
      cols: this.cols,
      rows: this.rows,
      nextId: this.nextId,
      cells: this.cells.map((col) => col.map((t) => (t ? { id: t.id, exp: t.exp, joker: t.joker } : null))),
    };
  }

  static deserialize(data) {
    const b = new Board(data.cols, data.rows);
    b.nextId = data.nextId || 1;
    for (let c = 0; c < b.cols; c++) {
      for (let r = 0; r < b.rows; r++) {
        const t = data.cells[c] && data.cells[c][r];
        if (t) b._set(c, r, { id: t.id, exp: t.exp, joker: !!t.joker });
      }
    }
    return b;
  }

  clone() {
    return Board.deserialize(this.serialize());
  }

  /** Debug helper: prints the board bottom-up as text. */
  toString() {
    const lines = [];
    for (let r = this.rows - 1; r >= 0; r--) {
      const row = [];
      for (let c = 0; c < this.cols; c++) {
        const t = this.cells[c][r];
        row.push(t ? (t.joker ? '  ∞ ' : String(Math.pow(2, t.exp)).padStart(4)) : '   .');
      }
      lines.push(row.join(''));
    }
    return lines.join('\n');
  }
}
__exports.Board = Board;
});
// ---- game/spawner.js ----
__define("game/spawner.js", function (__exports) {
const { SPAWN } = __import("config.js");
const { clamp } = __import("core/utils.js");

/**
 * Decides which block comes next. The range grows with the highest tile on the
 * board (lagging behind it), small numbers are more common, and the smallest
 * numbers get retired after removal milestones.
 */
class Spawner {
  constructor(rng) {
    this.rng = rng;
    this.minExp = 1;
    this.history = [];
  }

  rangeFor(board) {
    const top = clamp(board.maxExp() - SPAWN.EXP_LAG, SPAWN.START_MAX_EXP, SPAWN.MAX_EXP);
    const min = Math.min(this.minExp, top);
    return { min, max: Math.max(min, top) };
  }

  next(board, dropCount = 0) {
    if (dropCount >= SPAWN.JOKER_MIN_DROPS && this.rng.next() < SPAWN.JOKER_CHANCE) {
      return { exp: 0, joker: true };
    }
    const { min, max } = this.rangeFor(board);
    const cands = [];
    for (let e = min; e <= max; e++) cands.push(e);
    const weight = (e) => 1 / (1 + SPAWN.WEIGHT_FALLOFF * (e - min));
    let exp = this.rng.weighted(cands, weight);
    if (cands.length > 1 && this.history.length >= 2 && this.history[0] === exp && this.history[1] === exp) {
      exp = this.rng.weighted(cands.filter((e) => e !== exp), weight);
    }
    this.history.unshift(exp);
    if (this.history.length > 2) this.history.length = 2;
    return { exp, joker: false };
  }

  retireExp(exp) {
    this.minExp = Math.max(this.minExp, exp + 1);
  }

  serialize() {
    return { minExp: this.minExp, history: [...this.history] };
  }

  restore(data) {
    if (!data) return;
    this.minExp = data.minExp || 1;
    this.history = Array.isArray(data.history) ? [...data.history] : [];
  }
}
__exports.Spawner = Spawner;
});
// ---- game/game.js ----
__define("game/game.js", function (__exports) {
const { ECONOMY, GRID, RULES, SPAWN, TIMING } = __import("config.js");
const { Emitter } = __import("core/events.js");
const { Particles } = __import("core/particles.js");
const { Tweens } = __import("core/tween.js");
const { RNG, clamp, tileLabel, valueOf } = __import("core/utils.js");
const { Effects } = __import("render/effects.js");
const { PARTY_COLORS, tileColor } = __import("render/palette.js");
const { Audio } = __import("services/audio.js");
const { Haptics } = __import("services/haptics.js");
const { Board } = __import("game/board.js");
const { Spawner } = __import("game/spawner.js");
const { t } = __import("core/i18n.js");

/** "Goodbye, 2s!" - some languages name the retired number with a word of its own. */
function removedText(label) {
  const own = t(`fx.removed.${label}`);
  return own === `fx.removed.${label}` ? t('fx.removed', { block: label }) : own;
}

/**
 * Game controller: owns the board, the current/next blocks, score, power-ups,
 * animations and the save/resume cycle. Emits events for the HUD and screens:
 *   'state' (name), 'score' (score, delta), 'next', 'turn', 'milestone' ({exp,bonus}),
 *   'gameover' (summary), 'continued', 'hammer' (bool), 'insufficient' (powerup), 'undo'
 */
class Game extends Emitter {
  constructor({ renderer, storage, economy }) {
    super();
    this.renderer = renderer;
    this.storage = storage;
    this.economy = economy;
    this.tweens = new Tweens();
    this.particles = new Particles();
    this.effects = new Effects();

    this.board = new Board();
    this.rng = new RNG();
    this.spawner = new Spawner(this.rng);
    this.state = 'menu'; // menu | idle | dropping | resolving | gameover
    this.score = 0;
    this.current = null;
    this.next = null;
    this.hoverX = 2;
    this.hoverTarget = 2;
    this.dragging = false;
    this.showHover = false;
    this.hoverVisual = { scale: 1, alpha: 1 };
    this.ghosts = [];
    this.dropCount = 0;
    this.continuesUsed = 0;
    this.undoSnapshot = null;
    this.queuedDrop = null;
    this.hammerMode = false;
    this.hammerPrepaid = false;
    this.hammerAdCredit = false;
    this.powerUses = { hammer: 0, joker: 0, undo: 0 };
    this.maxExpReached = 0;
    this.chainBest = 0;
    this.coinsThisGame = 0;
    this.countedGameOver = false;
    this.bonusAwardedForScore = 0;
    this.paused = false;
    // whether a power-up's first use each game can be a rewarded video (set by the app)
    this.adUses = () => true;
  }

  get stats() {
    return this.storage.data.stats;
  }

  get best() {
    return this.storage.data.best;
  }

  // ---------------------------------------------------------------------------
  // lifecycle
  // ---------------------------------------------------------------------------
  newGame() {
    this.tweens.clear();
    this.particles.clear();
    // every game gets its own id, so the ad count can tell one game from the next
    this.gameId = `g${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
    this.board = new Board();
    this.rng = new RNG();
    this.spawner = new Spawner(this.rng);
    this.score = 0;
    this.dropCount = 0;
    this.continuesUsed = 0;
    this.undoSnapshot = null;
    this.queuedDrop = null;
    this.hammerMode = false;
    this.hammerPrepaid = false;
    this.hammerAdCredit = false;
    this.powerUses = { hammer: 0, joker: 0, undo: 0 };
    this.maxExpReached = 0;
    this.chainBest = 0;
    this.coinsThisGame = 0;
    this.countedGameOver = false;
    this.bonusAwardedForScore = 0;
    this.ghosts = [];
    this.current = this.spawner.next(this.board, 0);
    this.next = this.spawner.next(this.board, 0);
    this.hoverX = this.hoverTarget = Math.floor(GRID.COLS / 2);
    this.showHover = true;
    this.paused = false;
    this.setState('idle');
    this.emit('score', this.score, 0);
    this.emit('next');
    this.autosave();
  }

  hasSavedGame() {
    const g = this.storage.data.game;
    return !!(g && g.board && g.current);
  }

  resumeSavedGame() {
    const data = this.storage.data.game;
    if (!data) return false;
    try {
      this.restore(data);
    } catch (err) {
      console.warn('[game] could not resume saved game', err);
      this.storage.data.game = null;
      this.storage.save();
      return false;
    }
    this.showHover = true;
    this.paused = false;
    this.setState('idle');
    this.emit('score', this.score, 0);
    this.emit('next');
    return true;
  }

  leaveToMenu() {
    if (this.state !== 'gameover' && this.state !== 'menu') this.autosave(true);
    this.hammerMode = false;
    this.showHover = false;
    this.setState('menu');
  }

  setState(s) {
    this.state = s;
    this.emit('state', s);
  }

  serialize() {
    return {
      gameId: this.gameId,
      board: this.board.serialize(),
      spawner: this.spawner.serialize(),
      rng: this.rng.state,
      score: this.score,
      current: this.current,
      next: this.next,
      dropCount: this.dropCount,
      continuesUsed: this.continuesUsed,
      powerUses: { ...this.powerUses },
      hammerAdCredit: this.hammerAdCredit,
      maxExpReached: this.maxExpReached,
      chainBest: this.chainBest,
      coinsThisGame: this.coinsThisGame,
      countedGameOver: this.countedGameOver,
      bonusAwardedForScore: this.bonusAwardedForScore,
      savedAt: Date.now(),
    };
  }

  restore(data) {
    this.tweens.clear();
    this.particles.clear();
    this.ghosts = [];
    this.gameId = data.gameId || `g${(data.savedAt || Date.now()).toString(36)}`;
    this.board = Board.deserialize(data.board);
    this.board.gravity(); // in case the save happened mid-animation
    for (const { tile, c, r } of this.board.tiles()) this.initVisual(tile, c, r);
    this.rng = new RNG(1);
    this.rng.state = data.rng >>> 0;
    this.spawner = new Spawner(this.rng);
    this.spawner.restore(data.spawner);
    this.score = data.score || 0;
    this.current = data.current || this.spawner.next(this.board, 0);
    this.next = data.next || this.spawner.next(this.board, 0);
    this.dropCount = data.dropCount || 0;
    this.continuesUsed = data.continuesUsed || 0;
    this.powerUses = Object.assign({ hammer: 0, joker: 0, undo: 0 }, data.powerUses || {});
    this.hammerAdCredit = !!data.hammerAdCredit;
    this.maxExpReached = data.maxExpReached || 0;
    this.chainBest = data.chainBest || 0;
    this.coinsThisGame = data.coinsThisGame || 0;
    this.countedGameOver = !!data.countedGameOver;
    this.bonusAwardedForScore = data.bonusAwardedForScore || 0;
    this.undoSnapshot = null;
    this.queuedDrop = null;
    this.hammerMode = false;
    this.hoverX = this.hoverTarget = Math.floor(GRID.COLS / 2);
  }

  autosave(immediate = false) {
    if (this.state === 'gameover' || this.state === 'menu') return;
    this.storage.data.game = this.serialize();
    this.storage.save(immediate);
  }

  initVisual(tile, c, r) {
    tile.vx = c;
    tile.vy = r;
    tile.scale = 1;
    tile.alpha = 1;
    tile.sx = 1;
    tile.sy = 1;
    tile.z = 0;
    tile.displayExp = tile.exp;
    tile.displayJoker = tile.joker;
  }

  // ---------------------------------------------------------------------------
  // per-frame update (called by the main loop)
  // ---------------------------------------------------------------------------
  update(time, dt) {
    this.tweens.update(time);
    this.particles.update(dt);
    this.effects.update(dt);
    if (!this.dragging && (this.state === 'idle' || this.state === 'gameover')) {
      this.hoverTarget = Math.round(this.hoverTarget);
    }
    const k = Math.min(1, dt * 22);
    this.hoverX += (this.hoverTarget - this.hoverX) * k;
    if (Math.abs(this.hoverTarget - this.hoverX) < 0.002) this.hoverX = this.hoverTarget;
  }

  get busy() {
    return this.tweens.active || this.particles.count > 0 || this.effects.active;
  }

  dangerLevel() {
    let lvl = 0;
    for (let c = 0; c < GRID.COLS; c++) {
      const h = this.board.height(c);
      if (h >= GRID.ROWS - 1) return 1;
      if (h >= GRID.ROWS - 2) lvl = Math.max(lvl, 0.45);
    }
    return lvl;
  }

  // ---------------------------------------------------------------------------
  // input
  // ---------------------------------------------------------------------------
  canInteract() {
    return !this.paused && (this.state === 'idle' || this.state === 'dropping' || this.state === 'resolving');
  }

  pointerDown(x) {
    if (!this.canInteract() || this.hammerMode) return;
    this.dragging = true;
    this.hoverTarget = this.renderer.colFloatAt(x);
  }

  pointerMove(x) {
    if (!this.dragging || !this.canInteract() || this.hammerMode) return;
    this.hoverTarget = this.renderer.colFloatAt(x);
  }

  pointerUp(x) {
    if (!this.dragging) return;
    this.dragging = false;
    if (!this.canInteract() || this.hammerMode) return;
    const col = this.renderer.colAt(x);
    this.hoverTarget = col;
    this.drop(col);
  }

  pointerCancel() {
    this.dragging = false;
    this.hoverTarget = Math.round(this.hoverTarget);
  }

  moveHover(dir) {
    if (!this.canInteract() || this.hammerMode) return;
    this.dragging = false;
    this.hoverTarget = clamp(Math.round(this.hoverTarget) + dir, 0, GRID.COLS - 1);
    Audio.click();
  }

  dropHere() {
    if (!this.canInteract() || this.hammerMode) return;
    this.drop(Math.round(this.hoverTarget));
  }

  // ---------------------------------------------------------------------------
  // the turn
  // ---------------------------------------------------------------------------
  async drop(col) {
    if (!this.canInteract() || this.hammerMode) return;
    col = clamp(Math.round(col), 0, GRID.COLS - 1);
    if (this.state !== 'idle') {
      this.queuedDrop = col;
      return;
    }
    if (this.board.isFull(col)) {
      await this.overflow(col);
      return;
    }
    this.snapshotForUndo();
    this.setState('dropping');
    const tile = this.board.createTile(this.current.exp, this.current.joker);
    const r = this.board.place(col, tile);
    this.initVisual(tile, this.hoverX, GRID.HOVER_ROW);
    tile.z = 2;
    this.dropCount++;
    this.stats.drops++;

    // the next block appears at the top right away
    this.current = this.next;
    this.next = this.spawner.next(this.board, this.dropCount);
    this.hoverTarget = col;
    this.hoverVisual.scale = 0.4;
    this.tweens.to(this.hoverVisual, { scale: 1 }, { duration: 220, ease: 'outBack' });
    this.emit('next');

    Audio.drop();
    const dist = GRID.HOVER_ROW - r;
    // a little stretch while it falls sells the speed; the landing squash undoes it
    tile.sx = 0.9;
    tile.sy = 1.1;
    await Promise.all([
      this.tweens.to(tile, { vy: r }, { duration: TIMING.dropBase + TIMING.dropPerRow * dist, ease: 'inQuad' }),
      this.tweens.to(tile, { vx: col }, { duration: 90, ease: 'outQuad' }),
    ]);
    tile.z = 0;
    Audio.land();
    Haptics.impact('light');
    this.squash(tile);
    this.bumpBelow(col, r);
    this.dust(col, r);

    this.setState('resolving');
    await this.resolveFrom([{ c: col, r }]);
    await this.afterTurn();
  }

  squash(tile, k = 1) {
    tile.sx = 1 + 0.18 * k;
    tile.sy = 1 - 0.24 * k;
    tile.landAt = this.tweens.time;
    // not awaited: the jelly settle keeps playing while the turn moves on
    return this.tweens.to(tile, { sx: 1, sy: 1 }, { duration: 460, ease: 'outSpring' });
  }

  /** The block underneath takes a little of the impact, like stacked jelly. */
  bumpBelow(c, r) {
    const below = r > 0 ? this.board.get(c, r - 1) : null;
    if (!below) return;
    below.sx = 1.06;
    below.sy = 0.93;
    this.tweens.to(below, { sx: 1, sy: 1 }, { duration: 380, delay: 30, ease: 'outSpring' });
  }

  /** Blocks touching a merge flinch in surprise and everyone else looks over. */
  reactToMerge(target, at) {
    const now = this.tweens.time;
    for (const [dc, dr] of [[-1, 0], [1, 0], [0, 1], [0, -1]]) {
      const t = this.board.get(target.c + dc, target.r + dr);
      if (!t || t.mergeAt === now) continue;
      t.surpriseAt = now;
      t.sx = 1 - 0.05 * Math.abs(dc) + 0.04 * Math.abs(dr);
      t.sy = 1 + 0.05 * Math.abs(dc) - 0.06 * Math.abs(dr);
      this.tweens.to(t, { sx: 1, sy: 1 }, { duration: 420, ease: 'outSpring' });
    }
    this.lookPoint = { x: at.x, y: at.y, until: now + 700 };
  }

  /** Soft dust from under a block that just landed. */
  dust(c, r) {
    const rc = this.renderer.cellRect(c, r);
    const ui = this.renderer.theme && this.renderer.theme.ui;
    const col = ui && ui.dust ? ui.dust : 'rgba(255,255,255,0.85)';
    this.particles.puff(rc.x + rc.s / 2, rc.y + rc.s, rc.s, col, 6);
  }

  async resolveFrom(active, { initialGravity = false } = {}) {
    const steps = this.board.resolve({ active, initialGravity });
    // Tiles removed in later steps must stay visible until their own animation runs.
    for (const step of steps) {
      if (!step.merge) continue;
      for (const rm of step.merge.removed) {
        if (!this.ghosts.includes(rm.tile)) this.ghosts.push(rm.tile);
      }
    }
    let chain = 0;
    for (const step of steps) {
      if (step.merge) {
        chain++;
        await this.animateMerge(step.merge, chain);
      }
      if (step.moves.length) await this.animateMoves(step.moves);
    }
    if (chain > this.chainBest) this.chainBest = chain;
    if (chain > this.stats.bestChain) this.stats.bestChain = chain;
    return chain;
  }

  async animateMerge(merge, chain) {
    const { tile, from, target, removed, newExp, count } = merge;
    const L = this.renderer.layout;
    const tgt = this.renderer.cellCenter(target.c, target.r);
    const ps = [];
    tile.mergeAt = this.tweens.time;
    for (const rm of removed) {
      const t = rm.tile;
      t.mergeAt = this.tweens.time;
      const inTargetCell = rm.c === target.c && rm.r === target.r;
      if (inTargetCell) {
        ps.push(this.tweens.to(t, { scale: 0.92 }, { duration: TIMING.mergeSlide, ease: 'inQuad' }));
      } else {
        t.z = 1;
        ps.push(this.tweens.to(t, { vx: target.c, vy: target.r, scale: 0.75 }, { duration: TIMING.mergeSlide, ease: 'inQuad' }));
      }
    }
    if (from.c !== target.c || from.r !== target.r) {
      tile.z = 2;
      ps.push(this.tweens.to(tile, { vx: target.c, vy: target.r }, { duration: TIMING.mergeSlide, ease: 'inQuad' }));
    }
    await Promise.all(ps);

    const ids = new Set(removed.map((r) => r.tile.id));
    this.ghosts = this.ghosts.filter((g) => !ids.has(g.id));

    // pop with the new value: flash white, ring out, glitter
    tile.displayExp = newExp;
    tile.displayJoker = false;
    tile.z = 3;
    tile.scale = 1.34;
    tile.mergeAt = this.tweens.time;
    tile.flash = 1;
    this.tweens.to(tile, { flash: 0 }, { duration: 320, ease: 'outQuad' });
    const color = tileColor(newExp);
    Audio.merge(chain, newExp);
    Haptics.impact(newExp >= 8 ? 'medium' : 'light');
    this.particles.burst(tgt.x, tgt.y, color, {
      count: 8 + count * 3 + Math.min(10, chain * 2),
      speed: 170 + chain * 30 + count * 30,
      size: L.cell * 0.15,
    });
    this.particles.sparkle(tgt.x, tgt.y, '#FFFFFF', 3 + Math.min(6, chain * 2), L.cell * 0.9);
    this.effects.ring(tgt.x, tgt.y, color, L.cell * (0.85 + Math.min(0.9, chain * 0.18)), { width: 5 + chain });
    this.reactToMerge(target, tgt);
    if (chain >= 3) this.renderer.punch(0.012 + Math.min(0.02, (chain - 3) * 0.006));
    if (chain >= 4) this.effects.flashScreen('rgba(255,255,255,0.28)', 0.35);

    const base = valueOf(newExp);
    const gained = Math.round(base * (1 + 0.25 * (chain - 1)));
    this.addScore(gained);
    this.effects.popup(tgt.x, tgt.y - L.cell * 0.35, `+${gained}`, color, { size: Math.max(16, L.cell * 0.34) });
    if (chain >= 2) {
      this.effects.comboText(L.boardX + L.boardW / 2, L.lineY + L.pitch * 1.1, chain, color);
      if (chain >= 3) Haptics.impact('heavy');
    }
    const coins = ECONOMY.coinsForMerge(newExp);
    if (coins > 0) {
      this.economy.earn(coins, 'merge');
      this.coinsThisGame += coins;
    }
    this.stats.merges++;
    this.emit('merge', { exp: newExp, chain, count });

    // the jelly settle runs on; the turn only waits for the snappy part of it
    this.tweens.to(tile, { scale: 1 }, { duration: TIMING.mergePop * 2.2, ease: 'outSpring' });
    await this.tweens.delay(TIMING.mergePop);
    tile.z = 0;
  }

  async animateMoves(moves) {
    const ps = moves.map((m) => {
      const dist = m.from.r - m.to.r;
      return this.tweens.to(m.tile, { vy: m.to.r }, { duration: TIMING.fallBase + TIMING.fallPerRow * dist, ease: 'inQuad' });
    });
    await Promise.all(ps);
    for (const m of moves) {
      this.squash(m.tile, 0.7);
      this.dust(m.to.c, m.to.r);
    }
    Audio.land();
  }

  addScore(n) {
    this.score += n;
    this.emit('score', this.score, n);
  }

  async afterTurn() {
    await this.checkMilestones();
    if (this.board.allFull()) {
      await this.gameOver('full');
      return;
    }
    this.setState('idle');
    this.autosave();
    this.emit('turn');
    if (this.queuedDrop != null) {
      const q = this.queuedDrop;
      this.queuedDrop = null;
      this.drop(q);
    }
  }

  async checkMilestones() {
    const L = this.renderer.layout;
    for (let guard = 0; guard < 6; guard++) {
      const maxExp = this.board.maxExp();
      if (maxExp <= this.maxExpReached) return;
      const prev = this.maxExpReached;
      this.maxExpReached = maxExp;
      if (maxExp > this.stats.highestExp) this.stats.highestExp = maxExp;
      if (maxExp >= 7) {
        const color = tileColor(maxExp);
        this.effects.banner(L.boardX + L.boardW / 2, L.lineY + (L.boardBottom - L.lineY) * 0.4, t('fx.newBlock', { block: tileLabel(maxExp) }), color);
        this.particles.confetti(L.boardX + L.boardW / 2, L.lineY, PARTY_COLORS, 40 + Math.min(60, (maxExp - 6) * 8));
        Audio.milestone();
        Haptics.notification('success');
        const bonus = ECONOMY.milestoneBonus(maxExp);
        this.economy.earn(bonus, 'milestone');
        this.coinsThisGame += bonus;
        this.emit('milestone', { exp: maxExp, bonus });
        await this.tweens.delay(450);
      }
      let removedAny = false;
      for (const m of SPAWN.REMOVAL_MILESTONES) {
        if (maxExp >= m.atExp && prev < m.atExp) {
          await this.removeExpFromGame(m.removeExp);
          removedAny = true;
        }
      }
      if (!removedAny) return;
    }
  }

  async removeExpFromGame(exp) {
    const L = this.renderer.layout;
    this.spawner.retireExp(exp);
    const retired = (t) => t && !t.joker && t.exp <= exp;
    if (retired(this.current)) this.current = this.spawner.next(this.board, this.dropCount);
    if (retired(this.next)) this.next = this.spawner.next(this.board, this.dropCount);
    this.emit('next');
    this.effects.banner(L.boardX + L.boardW / 2, L.lineY + (L.boardBottom - L.lineY) * 0.4, removedText(tileLabel(exp)), tileColor(exp));
    const removed = this.board.removeAllOfExp(exp);
    this.emit('retire', { exp, removed: removed.length });
    if (!removed.length) {
      await this.tweens.delay(400);
      return;
    }
    Audio.removeTiles();
    Haptics.impact('medium');
    for (const rm of removed) {
      rm.tile.z = 1;
      this.ghosts.push(rm.tile);
    }
    await Promise.all(
      removed.map((rm, i) => {
        const c = this.renderer.cellCenter(rm.c, rm.r);
        setTimeout(() => this.particles.burst(c.x, c.y, tileColor(exp), { count: 6, speed: 150, size: L.cell * 0.1 }), i * 25);
        return this.tweens.to(rm.tile, { scale: 0, alpha: 0 }, { duration: 260, delay: i * 25, ease: 'inQuad' });
      })
    );
    const ids = new Set(removed.map((r) => r.tile.id));
    this.ghosts = this.ghosts.filter((g) => !ids.has(g.id));
    await this.resolveFrom([], { initialGravity: true });
  }

  // ---------------------------------------------------------------------------
  // game over / continue
  // ---------------------------------------------------------------------------
  async overflow(col) {
    this.setState('dropping');
    const ghost = {
      id: -1,
      exp: this.current.exp,
      joker: this.current.joker,
      displayExp: this.current.exp,
      displayJoker: this.current.joker,
      vx: this.hoverX,
      vy: GRID.HOVER_ROW,
      scale: 1,
      alpha: 1,
      sx: 1,
      sy: 1,
      z: 3,
    };
    this.ghosts.push(ghost);
    this.showHover = false;
    await Promise.all([
      this.tweens.to(ghost, { vy: GRID.ROWS }, { duration: 220, ease: 'inQuad' }),
      this.tweens.to(ghost, { vx: col }, { duration: 90, ease: 'outQuad' }),
    ]);
    ghost.sx = 1.12;
    ghost.sy = 0.85;
    this.tweens.to(ghost, { sx: 1, sy: 1 }, { duration: 200, ease: 'outBack' });
    this.renderer.shake(8, 420);
    Audio.error();
    Haptics.notification('error');
    await this.tweens.delay(350);
    await this.gameOver('overflow');
  }

  async gameOver(reason = 'full') {
    this.hammerMode = false;
    this.queuedDrop = null;
    this.dragging = false;
    this.showHover = false;
    this.setState('gameover');
    Audio.gameOver();
    const tiles = this.board.tiles();
    tiles.sort((a, b) => b.r - a.r || a.c - b.c);
    tiles.forEach(({ tile }, i) => this.tweens.to(tile, { alpha: 0.5 }, { duration: 200, delay: i * 18 }));

    const prevBest = this.storage.data.best;
    const isNewBest = this.score > prevBest;
    if (isNewBest) this.storage.data.best = this.score;
    if (!this.countedGameOver) {
      this.stats.games++;
      this.countedGameOver = true;
    }
    this.stats.totalScore += this.score - this.bonusAwardedForScore;
    const bonus = Math.max(0, Math.floor(this.score / ECONOMY.gameOverBonusDivisor) - Math.floor(this.bonusAwardedForScore / ECONOMY.gameOverBonusDivisor));
    this.bonusAwardedForScore = this.score;
    if (bonus > 0) {
      this.economy.earn(bonus, 'gameover');
      this.coinsThisGame += bonus;
    }
    this.storage.data.game = null;
    this.storage.save(true);
    await this.tweens.delay(Math.min(600, 200 + tiles.length * 18));
    this.emit('gameover', {
      score: this.score,
      best: this.storage.data.best,
      prevBest,
      isNewBest,
      coins: this.coinsThisGame,
      bonus,
      chain: this.chainBest,
      highestExp: this.maxExpReached,
      canContinue: this.continuesUsed < RULES.MAX_CONTINUES,
      reason,
    });
  }

  canContinue() {
    return this.state === 'gameover' && this.continuesUsed < RULES.MAX_CONTINUES;
  }

  /**
   * Continue after game over: clears the top rows so play can go on.
   * One per game (RULES.MAX_CONTINUES) and only ever paid for with a watched
   * rewarded ad - `prepaid` is the caller confirming the reward was granted.
   */
  async continueGame({ prepaid = false } = {}) {
    if (!this.canContinue()) return false;
    if (!prepaid) return false;
    this.continuesUsed++;
    this.ghosts = this.ghosts.filter((g) => g.id !== -1);
    this.setState('resolving');
    for (const { tile } of this.board.tiles()) this.tweens.to(tile, { alpha: 1 }, { duration: 150 });
    const removed = [];
    for (const { tile, c, r } of this.board.tiles()) {
      if (r >= GRID.ROWS - RULES.CONTINUE_CLEAR_ROWS) {
        this.board.remove(c, r);
        removed.push({ tile, c, r });
      }
    }
    Audio.removeTiles();
    const L = this.renderer.layout;
    for (const rm of removed) {
      rm.tile.z = 1;
      this.ghosts.push(rm.tile);
    }
    await Promise.all(
      removed.map((rm, i) => {
        const c = this.renderer.cellCenter(rm.c, rm.r);
        setTimeout(() => this.particles.burst(c.x, c.y, tileColor(rm.tile.exp, rm.tile.joker), { count: 6, speed: 150, size: L.cell * 0.1 }), i * 20);
        return this.tweens.to(rm.tile, { scale: 0, alpha: 0 }, { duration: 240, delay: i * 20, ease: 'inQuad' });
      })
    );
    const ids = new Set(removed.map((r) => r.tile.id));
    this.ghosts = this.ghosts.filter((g) => !ids.has(g.id));
    await this.resolveFrom([], { initialGravity: true });
    this.showHover = true;
    this.hoverVisual.scale = 0.4;
    this.tweens.to(this.hoverVisual, { scale: 1 }, { duration: 220, ease: 'outBack' });
    this.setState('idle');
    this.autosave(true);
    this.emit('continued');
    return true;
  }

  // ---------------------------------------------------------------------------
  // power-ups
  // ---------------------------------------------------------------------------
  snapshotForUndo() {
    this.undoSnapshot = this.serialize();
  }

  canUndo() {
    return this.state === 'idle' && !!this.undoSnapshot && !this.hammerMode;
  }

  /** How many uses of a power-up are left in this game. */
  powerUsesLeft(id) {
    return Math.max(0, ECONOMY.powerupUsesPerGame - (this.powerUses[id] || 0));
  }

  /**
   * How the next use of a power-up is unlocked this game:
   *   'ad'    - the first use(s), free but a rewarded ad must be watched first
   *   'coins' - the remaining uses, bought with coins (every use, when no videos are offered)
   *   'none'  - the per-game budget is spent
   */
  powerMode(id) {
    if (this.powerUsesLeft(id) <= 0) return 'none';
    return (this.powerUses[id] || 0) < ECONOMY.powerupAdUses && this.adUses() ? 'ad' : 'coins';
  }

  _consume(id) {
    this.powerUses[id] = (this.powerUses[id] || 0) + 1;
    this.emit('poweruses', id, this.powerUsesLeft(id));
  }

  /**
   * Charges for a power-up and books one use against the per-game budget.
   * The first use of each helper is ad-only, later ones cost coins. `prepaid` means it is
   * already paid for - a video watched, a helper the player owns spent, or the free first use
   * of the welcome period - so only the use is booked. Returns true when the power-up may run.
   */
  _pay(id, prepaid) {
    const mode = this.powerMode(id);
    if (mode === 'none') {
      this.emit('exhausted', id);
      return false;
    }
    if (prepaid) {
      this._consume(id);
      return true;
    }
    if (mode === 'ad') {
      if (!prepaid) {
        this.emit('needad', id);
        return false;
      }
      this._consume(id);
      return true;
    }
    const price = ECONOMY.powerups[id].price;
    if (this.economy.spend(price, `powerup:${id}`)) {
      this._consume(id);
      return true;
    }
    this.emit('insufficient', id);
    return false;
  }

  useUndo({ prepaid = false } = {}) {
    if (!this.canUndo()) return false;
    if (!this._pay('undo', prepaid)) return false;
    const snap = this.undoSnapshot;
    const uses = { ...this.powerUses };
    const credit = this.hammerAdCredit;
    this.restore(snap);
    this.powerUses = uses; // undoing a drop must not refund power-up uses
    this.hammerAdCredit = credit;
    this.undoSnapshot = null;
    this.showHover = true;
    this.setState('idle');
    Audio.undo();
    Haptics.impact('light');
    this.emit('score', this.score, 0);
    this.emit('next');
    this.emit('undo');
    this.autosave();
    return true;
  }

  canUseJoker() {
    return this.state === 'idle' && this.current && !this.current.joker && !this.hammerMode;
  }

  useJoker({ prepaid = false } = {}) {
    if (!this.canUseJoker()) return false;
    if (!this._pay('joker', prepaid)) return false;
    this.current = { exp: 0, joker: true };
    this.hoverVisual.scale = 0.5;
    this.tweens.to(this.hoverVisual, { scale: 1 }, { duration: 260, ease: 'outBack' });
    Audio.joker();
    Haptics.impact('medium');
    const rc = this.renderer.cellCenter(this.hoverX, GRID.HOVER_ROW);
    this.particles.sparkle(rc.x, rc.y, '#ffffff', 10);
    this.emit('next');
    this.autosave();
    return true;
  }

  canUseHammer() {
    return this.state === 'idle' && !this.board.isEmpty();
  }

  /**
   * `prepaid`: a video was watched (or it is the welcome period's free use). `token`: a Hammer
   * the player owns pays for it - spent only when a block is actually smashed ('token' event).
   */
  enterHammer({ prepaid = false, token = false } = {}) {
    if (!this.canUseHammer()) return false;
    const mode = this.powerMode('hammer');
    if (mode === 'none') {
      this.emit('exhausted', 'hammer');
      return false;
    }
    const paid = token || prepaid || this.hammerAdCredit;
    if (mode === 'ad' && !paid) {
      this.emit('needad', 'hammer');
      return false;
    }
    if (mode === 'coins' && !paid && !this.economy.canAfford(ECONOMY.powerups.hammer.price)) {
      this.emit('insufficient', 'hammer');
      return false;
    }
    this.hammerMode = true;
    this.hammerPrepaid = paid;
    this.hammerToken = token;
    // an owned Hammer does not use up a video already watched
    if (!token) this.hammerAdCredit = false;
    this.dragging = false;
    this.emit('hammer', true);
    return true;
  }

  cancelHammer() {
    if (!this.hammerMode) return;
    // the ad was already watched - keep the credit instead of burning it (an owned one is kept anyway)
    if (this.hammerPrepaid && !this.hammerToken) this.hammerAdCredit = true;
    this.hammerMode = false;
    this.hammerPrepaid = false;
    this.hammerToken = false;
    this.emit('hammer', false);
  }

  /** Called with a board cell while in hammer mode. */
  async hammerAt(c, r) {
    if (!this.hammerMode || this.state !== 'idle') return false;
    const tile = this.board.get(c, r);
    if (!tile) return false;
    if (!this._pay('hammer', this.hammerPrepaid)) {
      this.cancelHammer();
      return false;
    }
    if (this.hammerToken) this.emit('token', 'hammer');
    this.hammerMode = false;
    this.hammerPrepaid = false;
    this.hammerToken = false;
    this.emit('hammer', false);
    this.snapshotForUndo();
    this.setState('resolving');
    this.board.remove(c, r);
    const L = this.renderer.layout;
    const center = this.renderer.cellCenter(c, r);
    tile.z = 3;
    this.ghosts.push(tile);
    Audio.hammer();
    Haptics.impact('heavy');
    this.renderer.shake(5, 250);
    this.particles.burst(center.x, center.y, tileColor(tile.exp, tile.joker), { count: 18, speed: 260, size: L.cell * 0.14 });
    await this.tweens.to(tile, { scale: 0, alpha: 0 }, { duration: 200, ease: 'inQuad' });
    this.ghosts = this.ghosts.filter((g) => g !== tile);
    await this.resolveFrom([], { initialGravity: true });
    await this.afterTurn();
    return true;
  }

  // ---------------------------------------------------------------------------
  pause() {
    this.paused = true;
    this.dragging = false;
    this.autosave(true);
  }

  unpause() {
    this.paused = false;
  }
}
__exports.Game = Game;
});
// ---- render/tileSkins.js ----
__define("render/tileSkins.js", function (__exports) {
const { FONT_STACK, mix, rgba, roundRectPath, shade } = __import("core/utils.js");
const { tileColor } = __import("render/palette.js");

/**
 * Tile skins.
 *
 * Every skin paints a *sprite* once per (skin, colour, size, dpr) into an offscreen
 * canvas, and the game blits that sprite each frame. That is what buys the heavy
 * shading — gradients, bevels, grain, bubbles, rivets — for roughly the cost of one
 * drawImage per tile. Only the parts that act (the face, the joker's shine) are
 * drawn live on top.
 */

// ---------------------------------------------------------------------------
// shared paint helpers
// ---------------------------------------------------------------------------

/** Baked noise tile, made once, used as a subtle surface grain. */
let _grain = null;
function grainPattern(ctx) {
  if (!_grain) {
    const n = 96;
    const cv = document.createElement('canvas');
    cv.width = cv.height = n;
    const g = cv.getContext('2d');
    const img = g.createImageData(n, n);
    let seed = 1337;
    for (let i = 0; i < img.data.length; i += 4) {
      seed = (seed * 16807) % 2147483647;
      const v = 128 + ((seed / 2147483647) - 0.5) * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    _grain = cv;
  }
  return ctx.createPattern(_grain, 'repeat');
}

/** Small deterministic PRNG so a sprite looks the same every time it is rebuilt. */
function rng(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6D2B79F5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The core solid: a slab with a lit top face and a darker wall along the bottom,
 * which is what reads as real thickness rather than a drop shadow.
 */
function slab(ctx, S, color, o = {}) {
  const lift = S * (o.lift ?? 0.1);
  const r = S * (o.radius ?? 0.2);
  const faceH = S;
  const wall = o.wall ?? -0.34;
  const topLift = o.topLift ?? 0.2;
  const botLift = o.botLift ?? -0.05;

  // contact shadow + the wall underneath, in one pass
  ctx.save();
  ctx.shadowColor = o.shadow ?? 'rgba(46,26,10,0.34)';
  ctx.shadowBlur = S * (o.shadowBlur ?? 0.12);
  ctx.shadowOffsetY = S * (o.shadowY ?? 0.06);
  ctx.fillStyle = shade(color, wall);
  roundRectPath(ctx, 0, lift, S, faceH, r);
  ctx.fill();
  ctx.restore();
  // a second, darker sliver right under the face sharpens the thickness read
  ctx.save();
  ctx.fillStyle = shade(color, wall - 0.1);
  roundRectPath(ctx, S * 0.03, lift * 0.55, S - S * 0.06, faceH, r);
  ctx.fill();
  ctx.restore();

  // lit top face
  const g = ctx.createLinearGradient(0, 0, 0, faceH);
  g.addColorStop(0, shade(color, topLift));
  g.addColorStop(0.62, color);
  g.addColorStop(1, shade(color, botLift));
  ctx.fillStyle = g;
  roundRectPath(ctx, 0, 0, S, faceH, r);
  ctx.fill();

  // everything below is confined to the face
  ctx.save();
  roundRectPath(ctx, 0, 0, S, faceH, r);
  ctx.clip();

  // broad sheen across the upper third
  const sh = ctx.createLinearGradient(0, 0, 0, faceH * 0.55);
  sh.addColorStop(0, `rgba(255,255,255,${o.sheen ?? 0.34})`);
  sh.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(0, 0, S, faceH * 0.55);

  // corner bloom where the key light lands
  const bl = ctx.createRadialGradient(S * 0.3, faceH * 0.22, 0, S * 0.3, faceH * 0.22, S * 0.6);
  bl.addColorStop(0, `rgba(255,255,255,${o.bloom ?? 0.2})`);
  bl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = bl;
  ctx.fillRect(0, 0, S, faceH);

  // grain — the thing that stops it looking like flat vector art
  if (o.grain !== 0) {
    ctx.save();
    ctx.globalAlpha = o.grain ?? 0.03;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = grainPattern(ctx);
    ctx.fillRect(0, 0, S, faceH);
    ctx.restore();
  }
  ctx.restore();

  // lit rim along the top edge, faded out before it can leave a seam
  if ((o.rim ?? 0.5) > 0) {
    ctx.save();
    roundRectPath(ctx, 0, 0, S, faceH, r);
    ctx.clip();
    const lw = S * 0.04;
    const rimGrad = ctx.createLinearGradient(0, 0, 0, faceH * 0.46);
    rimGrad.addColorStop(0, `rgba(255,255,255,${o.rim ?? 0.5})`);
    rimGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = rimGrad;
    ctx.lineWidth = lw;
    roundRectPath(ctx, lw * 0.5, lw * 0.5, S - lw, faceH - lw, r * 0.94);
    ctx.stroke();
    ctx.restore();
  }

  return faceH;
}

/** A soft, blurred highlight ellipse — the "wet" spot of light on a glossy surface. */
function softSpot(g, x, y, rx, ry, alpha, rot = 0) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(1, ry / rx);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
  gr.addColorStop(0, `rgba(255,255,255,${alpha})`);
  gr.addColorStop(0.5, `rgba(255,255,255,${alpha * 0.38})`);
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.beginPath();
  g.arc(0, 0, rx, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/** Iridescent wash for the joker, laid under whichever numeral the skin draws. */
function jokerTint(g, S, radius = 0.24) {
  if (!g._joker) return;
  g._joker = false;
  g.save();
  roundRectPath(g, 0, 0, S, S * 1.02, S * radius);
  g.clip();
  g.globalCompositeOperation = 'source-atop';
  g.globalAlpha = 0.62;
  const gr = g.createLinearGradient(0, 0, S, S);
  gr.addColorStop(0, '#FF8FB8');
  gr.addColorStop(0.22, '#FFC46B');
  gr.addColorStop(0.42, '#FFF08A');
  gr.addColorStop(0.6, '#8BE8B0');
  gr.addColorStop(0.8, '#7CC8FF');
  gr.addColorStop(1, '#B69CFF');
  g.fillStyle = gr;
  g.fillRect(0, 0, S, S * 1.1);
  g.restore();
}

/** The numeral, built like moulded plastic sitting on the face. */
function numeral(ctx, S, faceH, label, color, o = {}) {
  jokerTint(ctx, S);
  const size = fontSizeFor(S, label) * (o.scale ?? 1);
  ctx.font = `${o.weight ?? 900} ${size}px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = S / 2;
  // the numeral sits in the upper third; the eyes and mouth live below it
  const cy = faceH * (label === '∞' ? 0.29 : 0.305);

  // a round stroke in the fill colour fattens the rounded face into chunky toy lettering
  const fat = size * (o.fat ?? 0.03);
  ctx.lineJoin = 'round';
  ctx.lineWidth = fat;

  // seated shadow: the number presses into the face
  ctx.save();
  ctx.fillStyle = o.shadow ?? rgba(shade(color, -0.55), 0.42);
  ctx.strokeStyle = ctx.fillStyle;
  ctx.fillText(label, cx, cy + S * (o.depth ?? 0.036));
  if (fat > 0) ctx.strokeText(label, cx, cy + S * (o.depth ?? 0.036));
  ctx.restore();

  // the face of the numeral
  const fg = o.color ?? '#FFF8EE';
  const grad = ctx.createLinearGradient(0, cy - size * 0.5, 0, cy + size * 0.5);
  grad.addColorStop(0, o.top ?? '#FFFFFF');
  grad.addColorStop(1, fg);
  ctx.fillStyle = grad;
  ctx.strokeStyle = grad;
  ctx.fillText(label, cx, cy);
  if (fat > 0) ctx.strokeText(label, cx, cy);
}

function fontSizeFor(s, label) {
  if (label === '∞') return s * 0.46;
  const n = String(label).length;
  const k = n <= 1 ? 0.5 : n === 2 ? 0.42 : n === 3 ? 0.34 : n === 4 ? 0.27 : 0.22;
  return s * k;
}

// 5x7 bitmap glyphs for the Retro skin — real pixels, not a font pretending
const PIXEL_FONT = {
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  '∞': ['.......', '.##.##.', '#..#..#', '#..#..#', '#..#..#', '.##.##.', '.......'],
};

function pixelNumeral(g, S, faceH, label, color) {
  jokerTint(g, S, 0);
  const glyphs = String(label).split('').map((ch) => PIXEL_FONT[ch] || PIXEL_FONT[0]);
  const units = glyphs.reduce((a, gl) => a + gl[0].length, 0) + (glyphs.length - 1);
  const p = Math.min(S * 0.05, (S * 0.8) / units);
  const w = units * p;
  const top = faceH * 0.305 - p * 3.5;
  const drawAll = (dx, dy, fill) => {
    g.fillStyle = fill;
    let x0 = (S - w) / 2 + dx;
    for (const gl of glyphs) {
      for (let r = 0; r < gl.length; r++) {
        for (let c = 0; c < gl[r].length; c++) {
          // overlap by a hair so no anti-aliasing seams show between pixels
          if (gl[r][c] === '#') g.fillRect(x0 + c * p, top + dy + r * p, p + 0.6, p + 0.6);
        }
      }
      x0 += (gl[0].length + 1) * p;
    }
  };
  drawAll(p * 0.7, p * 0.7, shade(color, -0.55));
  drawAll(0, 0, '#FFFFFF');
}

// ---------------------------------------------------------------------------
// the face
// ---------------------------------------------------------------------------

/**
 * Never baked into the sprite — it has to act, so it is drawn fresh each frame
 * over the cached body. States:
 *   idle   calm smile, blinks on its own rhythm, eyes follow the block you hold
 *   hover  the block in your hand: bright-eyed, peeking down at the board
 *   fall   eyes stretched wide, mouth an "o"
 *   land   squeezed "> <" from the bump, little "oof" mouth
 *   merge  happy arcs, big grin, cheeks flush
 *   worry  the stack is near the line: brows up, wobbly mouth, glancing upward
 */
function drawFace(ctx, x, y, s, state, seed, time, f, look) {
  const t = time || 0;
  const cx = x + s / 2;
  const eyeY = y + s * 0.645;
  const gap = s * 0.175;
  const ink = f.ink || 'rgba(22,18,28,0.94)';
  const pixel = f.style === 'pixel';

  // each block blinks to its own clock so a full board never blinks in unison
  const period = 2600 + (seed % 9) * 470;
  const canBlink = state === 'idle' || state === 'hover' || state === 'worry';
  const blink = canBlink && ((t + seed * 313) % period) < 120;

  // where the eyes point
  let lx = 0;
  let ly = 0;
  if (look && (state === 'idle' || state === 'worry')) {
    const dx = look.x - cx;
    const dy = look.y - eyeY;
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, d / (s * 2.5));
    lx = (dx / d) * s * 0.024 * k;
    ly = (dy / d) * s * 0.018 * k;
  } else if (state === 'idle') {
    lx = Math.sin((t + seed * 800) / 1400) * s * 0.012;
  }
  if (state === 'hover') ly = s * 0.02;
  if (state === 'worry') ly = Math.min(ly, -s * 0.012);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // cheeks first, so the eyes sit on top
  if (f.cheek) {
    const warm = state === 'merge' ? 1.6 : state === 'land' ? 1.25 : 1;
    ctx.fillStyle = f.cheek;
    ctx.globalAlpha = Math.min(1, warm);
    if (pixel) {
      const p = s * 0.045;
      for (const sgn of [-1, 1]) ctx.fillRect(cx + sgn * gap * 1.62 - p, eyeY + s * 0.085, p * 2, p);
    } else {
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(cx + sgn * gap * 1.6, eyeY + s * 0.095, s * 0.062, s * 0.036, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  if (pixel) {
    drawPixelFace(ctx, cx, eyeY, s, state, blink, lx, ly, ink, f);
    ctx.restore();
    return;
  }

  let rx = s * 0.085;
  let ry = s * 0.108;
  if (state === 'fall') { rx = s * 0.092; ry = s * 0.132; ly = s * 0.016; }
  if (state === 'hover') { rx = s * 0.09; ry = s * 0.116; }
  if (state === 'worry') { rx = s * 0.08; ry = s * 0.1; }

  if (state === 'merge') {
    ctx.strokeStyle = ink;
    ctx.lineWidth = s * 0.052;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + sgn * gap, eyeY + s * 0.03, s * 0.088, Math.PI * 1.14, Math.PI * 1.86);
      ctx.stroke();
    }
  } else if (state === 'land') {
    ctx.strokeStyle = ink;
    ctx.lineWidth = s * 0.05;
    const w = s * 0.06;
    const h = s * 0.052;
    for (const sgn of [-1, 1]) {
      const ex = cx + sgn * gap;
      ctx.beginPath();
      // left eye ">", right eye "<" — both point at the nose
      ctx.moveTo(ex + sgn * w, eyeY - h);
      ctx.lineTo(ex - sgn * w * 0.9, eyeY);
      ctx.lineTo(ex + sgn * w, eyeY + h);
      ctx.stroke();
    }
  } else if (blink) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = s * 0.046;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + sgn * gap, eyeY - s * 0.03, rx * 0.95, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
    }
  } else {
    for (const sgn of [-1, 1]) {
      const ex = cx + sgn * gap + lx;
      const ey = eyeY + ly;
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      // two catchlights: a big soft one and a tiny sharp one — the "alive" look
      ctx.fillStyle = f.glint || 'rgba(255,255,255,0.97)';
      ctx.beginPath();
      ctx.ellipse(ex - rx * 0.32, ey - ry * 0.38, rx * 0.34, ry * 0.28, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ex + rx * 0.36, ey + ry * 0.36, rx * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (state === 'worry') {
    ctx.strokeStyle = ink;
    ctx.lineWidth = s * 0.036;
    for (const sgn of [-1, 1]) {
      const ex = cx + sgn * gap;
      ctx.beginPath();
      ctx.moveTo(ex - sgn * s * 0.065, eyeY - s * 0.158);
      ctx.lineTo(ex + sgn * s * 0.055, eyeY - s * 0.128);
      ctx.stroke();
    }
  }

  const my = eyeY + s * 0.15;
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  if (state === 'fall') {
    ctx.beginPath();
    ctx.ellipse(cx, my, s * 0.046, s * 0.058, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (state === 'land') {
    ctx.beginPath();
    ctx.ellipse(cx, my - s * 0.01, s * 0.05, s * 0.034, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (state === 'merge') {
    ctx.beginPath();
    ctx.arc(cx, my - s * 0.035, s * 0.1, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.closePath();
    ctx.fill();
    // a little tongue makes the grin read as joy, not teeth
    ctx.save();
    ctx.clip();
    ctx.fillStyle = f.tongue || '#FF7B93';
    ctx.beginPath();
    ctx.ellipse(cx, my + s * 0.055, s * 0.05, s * 0.034, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (state === 'worry') {
    ctx.lineWidth = s * 0.036;
    ctx.beginPath();
    const w = s * 0.06;
    ctx.moveTo(cx - w, my - s * 0.015);
    ctx.bezierCurveTo(cx - w * 0.4, my - s * 0.04, cx + w * 0.4, my + s * 0.01, cx + w, my - s * 0.015);
    ctx.stroke();
  } else {
    ctx.lineWidth = s * 0.044;
    ctx.beginPath();
    ctx.arc(cx, my - s * 0.055, s * 0.075, 0.18 * Math.PI, 0.82 * Math.PI);
    ctx.stroke();
  }
  ctx.restore();
}

/** Retro's face: square eyes and a stepped smile, drawn in the same pixel grid. */
function drawPixelFace(ctx, cx, eyeY, s, state, blink, lx, ly, ink, f) {
  const p = s * 0.045;
  const gap = s * 0.175;
  const snap = (v) => Math.round(v / (p * 0.5)) * (p * 0.5);
  ctx.fillStyle = ink;
  const px = (x, y, w = 1, h = 1) => ctx.fillRect(x, y, p * w + 0.5, p * h + 0.5);
  for (const sgn of [-1, 1]) {
    const ex = cx + sgn * gap + snap(lx);
    const ey = eyeY + snap(ly);
    if (state === 'merge') {
      // ^ ^
      px(ex - p * 1.5, ey);
      px(ex - p * 0.5, ey - p);
      px(ex + p * 0.5, ey);
    } else if (state === 'land') {
      // > <
      const outer = sgn < 0 ? ex - p * 1.5 : ex + p * 0.5;
      px(outer, ey - p);
      px(ex - p * 0.5, ey);
      px(outer, ey + p);
    } else if (blink) {
      px(ex - p * 1.5, ey, 3, 1);
    } else {
      const tall = state === 'fall' ? 3 : 2.4;
      px(ex - p, ey - p * tall * 0.5, 2, tall);
      ctx.fillStyle = f.glint || '#FFFFFF';
      px(ex - p, ey - p * tall * 0.5, 0.9, 0.9);
      ctx.fillStyle = ink;
    }
  }
  if (state === 'worry') {
    for (const sgn of [-1, 1]) {
      const ex = cx + sgn * gap;
      px(ex - sgn * p * 1.2 - p * 0.5, eyeY - p * 3.4);
      px(ex + sgn * p * 0.2 - p * 0.5, eyeY - p * 2.8);
    }
  }
  const my = eyeY + s * 0.13;
  if (state === 'fall' || state === 'land') {
    px(cx - p, my - p * 0.5, 2, 2);
  } else if (state === 'merge') {
    px(cx - p * 2, my - p, 4, 1);
    px(cx - p * 1.5, my, 3, 1);
  } else if (state === 'worry') {
    px(cx - p * 1.5, my, 1, 1);
    px(cx - p * 0.5, my - p * 0.5, 1, 1);
    px(cx + p * 0.5, my, 1, 1);
  } else {
    px(cx - p * 2, my - p);
    px(cx + p, my - p);
    px(cx - p, my, 2, 1);
  }
}

/** Live shine sweeping across a joker, drawn per frame over the sprite. */
function jokerShine(ctx, x, y, s, r, time) {
  const t = ((time || 0) % 2200) / 2200;
  const px = x - s * 0.6 + s * 2.2 * t;
  ctx.save();
  roundRectPath(ctx, x, y, s, s, r);
  ctx.clip();
  const g = ctx.createLinearGradient(px - s * 0.5, y, px + s * 0.5, y + s);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - s, y - s, s * 3, s * 3);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// sprite cache
// ---------------------------------------------------------------------------

const PAD = 0.2; // sprite padding as a fraction of tile size, room for shadows
const _cache = new Map();
let _cacheDpr = 1;

// Numerals are baked into sprites, so a sprite made before the game font arrives
// would keep the fallback face forever. Load the font up front and rebuild once it lands.
if (typeof document !== 'undefined' && document.fonts && document.fonts.load) {
  document.fonts
    .load("700 40px 'Fredoka Variable'", '0123456789K')
    .then(() => _cache.clear())
    .catch(() => {});
}

function dpr() {
  return Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2);
}

function sprite(skin, color, s, joker, label, ratio) {
  const screen = dpr();
  if (screen !== _cacheDpr) {
    _cache.clear();
    _cacheDpr = screen;
  }
  // a caller drawing into a canvas of its own resolution (shop thumbnails) passes that
  // ratio, so the sprite is painted at exactly the pixels it will cover: never upscaled
  const d = ratio ? Math.round(ratio * 100) / 100 : screen;
  const size = Math.max(4, Math.round(s));
  const key = `${skin.id}|${color}|${size}|${label}|${joker ? 1 : 0}|${d}`;
  let cv = _cache.get(key);
  if (cv) return cv;

  const S = size * d;
  const pad = Math.ceil(S * PAD);
  cv = document.createElement('canvas');
  cv.width = cv.height = S + pad * 2;
  const g = cv.getContext('2d');
  g.translate(pad, pad);
  g._joker = !!joker;
  skin.paint(g, S, color, { joker, label, rand: rng(key) });
  g._joker = false;
  cv._pad = pad / d;
  cv._size = size + (pad / d) * 2;

  // a cache this small never needs eviction in practice, but be safe on resize churn
  if (_cache.size > 480) _cache.clear();
  _cache.set(key, cv);
  return cv;
}

// ---------------------------------------------------------------------------
// the skins
// ---------------------------------------------------------------------------

const CHEEK = 'rgba(255,96,128,0.3)';

const SKINS = [
  {
    id: 'classic',
    name: 'Classic',
    price: 0,
    desc: 'Chunky moulded blocks with real depth.',
    face: { cheek: CHEEK },
    paint(g, S, color, { label }) {
      const faceH = slab(g, S, color, { lift: 0.14, radius: 0.23, wall: -0.3, topLift: 0.17, sheen: 0.24, bloom: 0.15 });
      numeral(g, S, faceH, label, color);
    },
  },
  {
    id: 'soft',
    name: 'Mallow',
    price: 200,
    desc: 'Puffy marshmallow blocks dusted with sugar.',
    face: { cheek: 'rgba(255,92,130,0.36)' },
    paint(g, S, color, { label, rand }) {
      const base = mix(color, '#FFFFFF', 0.2);
      const r = S * 0.38;
      // a big, soft contact shadow — it sits *on* the board, squishy and light
      g.save();
      g.shadowColor = rgba(shade(color, -0.6), 0.3);
      g.shadowBlur = S * 0.18;
      g.shadowOffsetY = S * 0.08;
      g.fillStyle = shade(base, -0.16);
      roundRectPath(g, S * 0.02, S * 0.06, S * 0.96, S * 0.98, r);
      g.fill();
      g.restore();
      // pillow body: bright in the middle, rolling off to the edges
      const body = g.createRadialGradient(S * 0.46, S * 0.38, S * 0.04, S * 0.5, S * 0.5, S * 0.78);
      body.addColorStop(0, shade(base, 0.32));
      body.addColorStop(0.5, base);
      body.addColorStop(1, shade(base, -0.16));
      g.fillStyle = body;
      roundRectPath(g, 0, 0, S, S, r);
      g.fill();
      g.save();
      roundRectPath(g, 0, 0, S, S, r);
      g.clip();
      // underside falloff
      const under = g.createLinearGradient(0, S * 0.7, 0, S);
      under.addColorStop(0, rgba(shade(color, -0.45), 0));
      under.addColorStop(1, rgba(shade(color, -0.45), 0.22));
      g.fillStyle = under;
      g.fillRect(0, S * 0.7, S, S * 0.3);
      // the dome highlight
      softSpot(g, S * 0.42, S * 0.17, S * 0.36, S * 0.13, 0.62);
      // powdered sugar
      for (let i = 0; i < 46; i++) {
        const px = rand() * S;
        const py = rand() * S;
        g.fillStyle = `rgba(255,255,255,${0.25 + rand() * 0.45})`;
        g.beginPath();
        g.arc(px, py, S * (0.004 + rand() * 0.008), 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
      numeral(g, S, S, label, color, { depth: 0.034, shadow: rgba(shade(color, -0.5), 0.5) });
    },
  },
  {
    id: 'glossy',
    name: 'Jelly',
    price: 400,
    desc: 'Wobbly see-through jelly with tiny bubbles.',
    face: { cheek: 'rgba(255,110,140,0.3)', ink: 'rgba(24,14,30,0.9)' },
    paint(g, S, color, { label, rand }) {
      const r = S * 0.27;
      // jelly casts a coloured shadow, not a grey one
      g.save();
      g.shadowColor = rgba(shade(color, -0.2), 0.55);
      g.shadowBlur = S * 0.16;
      g.shadowOffsetY = S * 0.07;
      g.fillStyle = shade(color, -0.26);
      roundRectPath(g, 0, S * 0.07, S, S, r);
      g.fill();
      g.restore();
      // translucent body: light pools in the middle, the edges go deep
      const body = g.createRadialGradient(S * 0.5, S * 0.64, 0, S * 0.5, S * 0.52, S * 0.74);
      body.addColorStop(0, shade(color, 0.42));
      body.addColorStop(0.55, shade(color, 0.08));
      body.addColorStop(1, shade(color, -0.3));
      g.fillStyle = body;
      roundRectPath(g, 0, 0, S, S, r);
      g.fill();
      g.save();
      roundRectPath(g, 0, 0, S, S, r);
      g.clip();
      // caustic glow where light exits the bottom
      softSpot(g, S * 0.5, S * 0.93, S * 0.4, S * 0.1, 0.5);
      // bubbles suspended in the jelly, kept to the edges so the face stays clean
      const spots = [[0.13, 0.5], [0.87, 0.56], [0.1, 0.8], [0.9, 0.84], [0.24, 0.9], [0.76, 0.93], [0.16, 0.66], [0.84, 0.72]];
      for (const [bx, by] of spots) {
        if (rand() < 0.25) continue;
        const br = S * (0.014 + rand() * 0.024);
        const px = S * (bx + (rand() - 0.5) * 0.05);
        const py = S * (by + (rand() - 0.5) * 0.05);
        g.fillStyle = 'rgba(255,255,255,0.14)';
        g.strokeStyle = 'rgba(255,255,255,0.55)';
        g.lineWidth = Math.max(0.8, S * 0.006);
        g.beginPath();
        g.arc(px, py, br, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.9)';
        g.beginPath();
        g.arc(px - br * 0.35, py - br * 0.35, br * 0.28, 0, Math.PI * 2);
        g.fill();
      }
      // fresnel edge
      g.strokeStyle = rgba(shade(color, 0.5), 0.5);
      g.lineWidth = S * 0.028;
      roundRectPath(g, S * 0.014, S * 0.014, S * 0.972, S * 0.972, r * 0.96);
      g.stroke();
      // the wet highlight: a curved window reflection + a pin-point glint
      const cap = g.createLinearGradient(0, S * 0.05, 0, S * 0.3);
      cap.addColorStop(0, 'rgba(255,255,255,0.85)');
      cap.addColorStop(1, 'rgba(255,255,255,0.04)');
      g.fillStyle = cap;
      roundRectPath(g, S * 0.1, S * 0.055, S * 0.8, S * 0.22, S * 0.11);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.95)';
      g.beginPath();
      g.ellipse(S * 0.2, S * 0.115, S * 0.045, S * 0.024, -0.2, 0, Math.PI * 2);
      g.fill();
      g.restore();
      numeral(g, S, S, label, color, { depth: 0.03, shadow: rgba(shade(color, -0.55), 0.45) });
    },
  },
  {
    id: 'candy',
    name: 'Candy',
    price: 500,
    desc: 'Hard-boiled candy with a sugar-glass shell.',
    face: { cheek: CHEEK },
    paint(g, S, color, { label }) {
      const faceH = slab(g, S, color, {
        lift: 0.13, radius: 0.31, wall: -0.3, topLift: 0.22, botLift: -0.12,
        sheen: 0.12, bloom: 0.1, rim: 0.7, grain: 0,
      });
      const r = S * 0.31;
      g.save();
      roundRectPath(g, 0, 0, S, faceH, r);
      g.clip();
      // candy stripes, twisted at 45°
      g.save();
      g.translate(S / 2, faceH / 2);
      g.rotate(-Math.PI / 4);
      const band = S * 0.12;
      for (let i = -6; i <= 6; i++) {
        const sx = i * band * 2.2;
        const st = g.createLinearGradient(sx, 0, sx + band, 0);
        st.addColorStop(0, 'rgba(255,255,255,0.08)');
        st.addColorStop(0.5, 'rgba(255,255,255,0.34)');
        st.addColorStop(1, 'rgba(255,255,255,0.08)');
        g.fillStyle = st;
        g.fillRect(sx, -S, band, S * 2);
      }
      g.restore();
      // glassy shell: hard specular + bounce light
      softSpot(g, S * 0.34, faceH * 0.22, S * 0.28, S * 0.14, 0.95, -0.45);
      g.fillStyle = 'rgba(255,255,255,0.95)';
      g.beginPath();
      g.ellipse(S * 0.25, faceH * 0.18, S * 0.07, S * 0.035, -0.45, 0, Math.PI * 2);
      g.fill();
      softSpot(g, S * 0.8, faceH * 0.86, S * 0.16, S * 0.07, 0.5, -0.45);
      const bo = g.createLinearGradient(0, faceH * 0.74, 0, faceH);
      bo.addColorStop(0, 'rgba(255,255,255,0)');
      bo.addColorStop(1, 'rgba(255,255,255,0.28)');
      g.fillStyle = bo;
      g.fillRect(0, faceH * 0.74, S, faceH * 0.26);
      g.restore();
      numeral(g, S, faceH, label, color, { depth: 0.04 });
    },
  },
  {
    id: 'neon',
    name: 'Neon',
    price: 600,
    desc: 'Glowing tubes on dark glass. Best on dark maps.',
    face: { ink: 'rgba(240,246,255,0.96)', glint: 'rgba(20,16,40,0.85)', tongue: '#FF4FA0' },
    paint(g, S, color, { label }) {
      const r = S * 0.19;
      const joker = g._joker;
      g._joker = false;
      const c = joker ? '#FF7AD9' : shade(color, 0.16);
      const faceH = S * 0.93;
      // dark glass body
      g.save();
      g.shadowColor = rgba(c, 0.5);
      g.shadowBlur = S * 0.22;
      g.fillStyle = 'rgba(11,13,26,0.95)';
      roundRectPath(g, 0, 0, S, faceH, r);
      g.fill();
      g.restore();
      // inner colour wash
      g.save();
      roundRectPath(g, 0, 0, S, faceH, r);
      g.clip();
      const w = g.createRadialGradient(S * 0.5, faceH * 0.95, 0, S * 0.5, faceH * 0.5, S * 0.9);
      w.addColorStop(0, rgba(c, 0.36));
      w.addColorStop(1, rgba(c, 0.05));
      g.fillStyle = w;
      g.fillRect(0, 0, S, faceH);
      // glass reflection
      const rf = g.createLinearGradient(0, 0, 0, faceH * 0.4);
      rf.addColorStop(0, 'rgba(255,255,255,0.14)');
      rf.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rf;
      g.fillRect(0, 0, S, faceH * 0.4);
      g.restore();
      // the tube: outer bloom then a crisp core line
      g.save();
      g.shadowColor = c;
      g.shadowBlur = S * 0.3;
      g.strokeStyle = c;
      g.lineWidth = Math.max(1.4, S * 0.05);
      roundRectPath(g, S * 0.055, S * 0.055, S - S * 0.11, faceH - S * 0.11, r * 0.82);
      g.stroke();
      g.stroke();
      g.restore();
      g.strokeStyle = shade(c, 0.55);
      g.lineWidth = Math.max(1, S * 0.018);
      roundRectPath(g, S * 0.055, S * 0.055, S - S * 0.11, faceH - S * 0.11, r * 0.82);
      g.stroke();
      // glowing numeral
      g.save();
      g.shadowColor = c;
      g.shadowBlur = S * 0.22;
      numeral(g, S, faceH, label, color, { color: '#FFFFFF', top: '#FFFFFF', shadow: 'rgba(0,0,0,0)', depth: 0 });
      g.restore();
    },
  },
  {
    id: 'glass',
    name: 'Glass',
    price: 700,
    desc: 'Frosted crystal with lit edges.',
    face: { ink: 'rgba(255,255,255,0.94)', glint: 'rgba(40,40,70,0.55)', cheek: 'rgba(255,150,180,0.4)', tongue: '#FF9DB4' },
    paint(g, S, color, { label }) {
      const r = S * 0.24;
      const faceH = S * 0.94;
      g.save();
      roundRectPath(g, 0, 0, S, faceH, r);
      g.shadowColor = rgba(shade(color, -0.5), 0.32);
      g.shadowBlur = S * 0.12;
      g.shadowOffsetY = S * 0.06;
      const bg = g.createLinearGradient(0, 0, S, faceH);
      bg.addColorStop(0, rgba(shade(color, 0.5), 0.86));
      bg.addColorStop(1, rgba(shade(color, 0.12), 0.76));
      g.fillStyle = bg;
      g.fill();
      g.restore();
      g.save();
      roundRectPath(g, 0, 0, S, faceH, r);
      g.clip();
      // frost
      g.globalAlpha = 0.16;
      g.globalCompositeOperation = 'overlay';
      g.fillStyle = grainPattern(g);
      g.fillRect(0, 0, S, faceH);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      // thicker glass pools colour along the bottom
      const thick = g.createLinearGradient(0, faceH * 0.7, 0, faceH);
      thick.addColorStop(0, rgba(color, 0));
      thick.addColorStop(1, rgba(shade(color, -0.1), 0.5));
      g.fillStyle = thick;
      g.fillRect(0, faceH * 0.7, S, faceH * 0.3);
      // the classic double streak of a window reflected in glass
      g.save();
      g.translate(S * 0.5, faceH * 0.5);
      g.rotate(-0.62);
      g.fillStyle = 'rgba(255,255,255,0.3)';
      g.fillRect(-S * 0.62, -S * 0.9, S * 0.2, S * 1.8);
      g.fillStyle = 'rgba(255,255,255,0.18)';
      g.fillRect(-S * 0.36, -S * 0.9, S * 0.06, S * 1.8);
      g.restore();
      g.restore();
      // lit edge, brighter at the top
      const eg = g.createLinearGradient(0, 0, 0, faceH);
      eg.addColorStop(0, 'rgba(255,255,255,0.95)');
      eg.addColorStop(1, 'rgba(255,255,255,0.45)');
      g.strokeStyle = eg;
      g.lineWidth = Math.max(1, S * 0.03);
      roundRectPath(g, g.lineWidth * 0.6, g.lineWidth * 0.6, S - g.lineWidth * 1.2, faceH - g.lineWidth * 1.2, r * 0.9);
      g.stroke();
      numeral(g, S, faceH, label, color, {
        color: shade(color, -0.45), top: shade(color, -0.3), shadow: 'rgba(255,255,255,0.6)', depth: -0.022,
      });
    },
  },
  {
    id: 'metal',
    name: 'Metal',
    price: 800,
    desc: 'Brushed, bevelled plates with rivets.',
    face: { cheek: 'rgba(255,110,130,0.22)' },
    paint(g, S, color, { label, rand }) {
      const rad = S * 0.15;
      const faceH = slab(g, S, color, {
        lift: 0.085, radius: 0.15, wall: -0.46, topLift: 0.1, botLift: -0.18,
        sheen: 0.06, bloom: 0.05, rim: 0, grain: 0,
      });
      g.save();
      roundRectPath(g, 0, 0, S, faceH, rad);
      g.clip();
      // anisotropic bands
      const bands = g.createLinearGradient(0, 0, 0, faceH);
      bands.addColorStop(0, 'rgba(255,255,255,0.48)');
      bands.addColorStop(0.3, 'rgba(255,255,255,0.06)');
      bands.addColorStop(0.46, 'rgba(0,0,0,0.12)');
      bands.addColorStop(0.62, 'rgba(255,255,255,0.26)');
      bands.addColorStop(0.8, 'rgba(255,255,255,0.02)');
      bands.addColorStop(1, 'rgba(0,0,0,0.14)');
      g.fillStyle = bands;
      g.fillRect(0, 0, S, faceH);
      // fine brushing
      g.lineWidth = Math.max(0.5, S * 0.005);
      for (let i = 0; i < faceH; i += Math.max(1.5, S * 0.022)) {
        g.strokeStyle = rand() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)';
        g.beginPath();
        g.moveTo(0, i + (rand() - 0.5) * 1.5);
        g.lineTo(S, i + (rand() - 0.5) * 1.5);
        g.stroke();
      }
      g.restore();
      // chamfered bevel: lit top-left edge, shadowed bottom-right edge
      const bw = S * 0.05;
      const bev = g.createLinearGradient(0, 0, S, faceH);
      bev.addColorStop(0, 'rgba(255,255,255,0.75)');
      bev.addColorStop(0.5, 'rgba(255,255,255,0.1)');
      bev.addColorStop(1, 'rgba(0,0,0,0.32)');
      g.strokeStyle = bev;
      g.lineWidth = bw;
      roundRectPath(g, bw / 2, bw / 2, S - bw, faceH - bw, rad * 0.8);
      g.stroke();
      // rivets
      for (const [rx, ry] of [[0.13, 0.13], [0.87, 0.13], [0.13, 0.87], [0.87, 0.87]]) {
        const x = S * rx;
        const y = faceH * ry;
        const rr = S * 0.03;
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.beginPath();
        g.arc(x + rr * 0.25, y + rr * 0.35, rr, 0, Math.PI * 2);
        g.fill();
        const rv = g.createRadialGradient(x - rr * 0.35, y - rr * 0.35, 0, x, y, rr);
        rv.addColorStop(0, '#FFFFFF');
        rv.addColorStop(0.45, shade(color, 0.35));
        rv.addColorStop(1, shade(color, -0.4));
        g.fillStyle = rv;
        g.beginPath();
        g.arc(x, y, rr, 0, Math.PI * 2);
        g.fill();
      }
      numeral(g, S, faceH, label, color, { depth: 0.032, shadow: rgba(shade(color, -0.65), 0.55) });
    },
  },
  {
    id: 'pastel',
    name: 'Pastel',
    price: 300,
    desc: 'Speckled matte ceramic, easy on the eyes.',
    face: { cheek: 'rgba(255,110,140,0.42)' },
    paint(g, S, color, { label, rand }) {
      const soft = mix(color, '#FFFFFF', 0.34);
      const faceH = slab(g, S, soft, {
        lift: 0.08, radius: 0.28, wall: -0.16, topLift: 0.1, botLift: -0.05,
        sheen: 0.1, bloom: 0.08, rim: 0.22, grain: 0.05,
        shadow: 'rgba(90,80,110,0.22)',
      });
      const r = S * 0.28;
      g.save();
      roundRectPath(g, 0, 0, S, faceH, r);
      g.clip();
      // ceramic speckle
      const tones = [shade(color, -0.35), '#FFFFFF', shade(color, -0.15)];
      for (let i = 0; i < 34; i++) {
        g.fillStyle = rgba(tones[i % 3], i % 3 === 1 ? 0.7 : 0.32);
        g.beginPath();
        g.arc(rand() * S, rand() * faceH, S * (0.006 + rand() * 0.01), 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
      // pressed-in frame, like a glazed tile
      const ins = S * 0.075;
      g.strokeStyle = rgba(shade(color, -0.3), 0.22);
      g.lineWidth = S * 0.018;
      roundRectPath(g, ins, ins + S * 0.012, S - ins * 2, faceH - ins * 2, r * 0.7);
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.7)';
      roundRectPath(g, ins, ins, S - ins * 2, faceH - ins * 2, r * 0.7);
      g.stroke();
      numeral(g, S, faceH, label, soft, {
        color: shade(color, -0.42), top: shade(color, -0.3), shadow: 'rgba(255,255,255,0.7)', depth: -0.02,
      });
    },
  },
  {
    id: 'retro',
    name: 'Retro',
    price: 400,
    desc: '8-bit blocks with pixel faces.',
    face: { style: 'pixel', cheek: 'rgba(255,90,130,0.5)' },
    paint(g, S, color, { label }) {
      const off = S * 0.09;
      g.fillStyle = shade(color, -0.48);
      g.fillRect(off, off, S - off, S - off);
      g.fillStyle = color;
      g.fillRect(0, 0, S - off, S - off);
      // dithered shading in the lower half, the way the old consoles did gradients
      const p = S * 0.045;
      g.fillStyle = rgba(shade(color, -0.3), 0.4);
      for (let y = S * 0.55; y < S - off - p * 1.2; y += p) {
        for (let x = p * 1.2; x < S - off - p * 1.2; x += p) {
          const row = Math.round(y / p);
          const col = Math.round(x / p);
          const density = (y - S * 0.55) / (S * 0.36);
          if ((row + col) % 2 === 0 && ((row * 7 + col * 3) % 5) / 5 < density * 0.8) g.fillRect(x, y, p, p);
        }
      }
      // chunky lit and shaded edges, no curves anywhere
      g.fillStyle = rgba('#FFFFFF', 0.45);
      g.fillRect(0, 0, S - off, S * 0.055);
      g.fillRect(0, 0, S * 0.055, S - off);
      g.fillStyle = rgba('#FFFFFF', 0.85);
      g.fillRect(S * 0.055, S * 0.055, S * 0.055, S * 0.055);
      g.fillStyle = rgba('#000000', 0.2);
      g.fillRect(0, S - off - S * 0.055, S - off, S * 0.055);
      g.fillRect(S - off - S * 0.055, 0, S * 0.055, S - off);
      pixelNumeral(g, S, S - off, label, color);
    },
  },
];

const SKIN_BY_ID = {};
for (const s of SKINS) SKIN_BY_ID[s.id] = s;

function getSkin(id) {
  return SKIN_BY_ID[id] || SKINS[0];
}

const NO_FACE = {};

/** Blit the cached sprite, then any live animation on top. */
function drawTile(ctx, skin, x, y, s, { exp, joker, label, time, face, id, look, flash, ratio }) {
  const sk = skin && skin.paint ? skin : getSkin(skin && skin.id);
  const color = sk.colorFor ? sk.colorFor(exp, joker) : tileColor(exp, joker);
  const cv = sprite(sk, color, s, joker, label, ratio);
  const scale = s / Math.max(4, Math.round(s));
  ctx.drawImage(cv, x - cv._pad * scale, y - cv._pad * scale, cv._size * scale, cv._size * scale);
  if (joker) jokerShine(ctx, x, y, s * 0.94, s * 0.2, time);
  if (flash > 0.01) {
    // merge flash: the block lights up white and fades back to its colour
    ctx.save();
    ctx.globalAlpha *= Math.min(1, flash) * 0.85;
    ctx.fillStyle = '#FFFFFF';
    roundRectPath(ctx, x, y, s, s, s * 0.24);
    ctx.fill();
    ctx.restore();
  }
  if (face !== 'none') drawFace(ctx, x, y, s, face || 'idle', id || 0, time, sk.face || NO_FACE, look);
}
__exports.drawFace = drawFace;
__exports.SKINS = SKINS;
__exports.SKIN_BY_ID = SKIN_BY_ID;
__exports.getSkin = getSkin;
__exports.drawTile = drawTile;
});
// ---- render/ambient.js ----
__define("render/ambient.js", function (__exports) {
const { shade, rgba } = __import("core/utils.js");

/**
 * Ambient life for every map: soft toy blocks drifting up through the air at three
 * depths, glowing bokeh, and a per-map motif (motes, stars, bubbles, fireflies,
 * sprinkles). Everything moves slowly on purpose - this layer is what makes the
 * game feel calm rather than busy.
 *
 * All shapes are pre-rendered once into small sprites (blur baked in with the
 * shadow trick, which works on every WebView), so a frame is ~40 drawImage calls.
 */

const REDUCED_MOTION = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** A soft toy block, optionally defocused. Blur is baked with an offset shadow. */
function blockSprite(color, size, blur) {
  const pad = Math.ceil(blur * 2.4 + size * 0.2);
  const c = makeCanvas(size + pad * 2, size + pad * 2);
  const g = c.getContext('2d');
  const r = size * 0.26;
  const OFF = 10000;
  const paint = (dx) => {
    // body wall
    g.fillStyle = shade(color, -0.22);
    rr(g, pad + dx, pad + size * 0.1, size, size * 0.9, r);
    g.fill();
    // lit face
    const gr = g.createLinearGradient(0, pad, 0, pad + size * 0.9);
    gr.addColorStop(0, shade(color, 0.32));
    gr.addColorStop(1, color);
    g.fillStyle = gr;
    rr(g, pad + dx, pad, size, size * 0.88, r);
    g.fill();
  };
  if (blur > 0.5) {
    g.save();
    g.shadowColor = color;
    g.shadowBlur = blur;
    g.shadowOffsetX = OFF;
    // draw the shape far off-canvas; only its blurred shadow lands in view
    g.translate(-OFF, 0);
    g.fillStyle = color;
    rr(g, pad, pad, size, size, r);
    g.fill();
    g.restore();
    g.globalAlpha = 0.35;
    paint(0);
    g.globalAlpha = 1;
  } else {
    paint(0);
    // gloss
    g.fillStyle = 'rgba(255,255,255,0.35)';
    rr(g, pad + size * 0.12, pad + size * 0.08, size * 0.76, size * 0.26, size * 0.12);
    g.fill();
  }
  c._pad = pad;
  c._size = size;
  return c;
}

function glowSprite(color, radius) {
  const c = makeCanvas(radius * 2, radius * 2);
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(radius, radius, 0, radius, radius, radius);
  gr.addColorStop(0, rgba(color, 0.9));
  gr.addColorStop(0.35, rgba(color, 0.35));
  gr.addColorStop(1, rgba(color, 0));
  g.fillStyle = gr;
  g.fillRect(0, 0, radius * 2, radius * 2);
  return c;
}

function starSprite(color, r) {
  const c = makeCanvas(r * 6, r * 6);
  const g = c.getContext('2d');
  const cx = r * 3;
  const glow = g.createRadialGradient(cx, cx, 0, cx, cx, r * 3);
  glow.addColorStop(0, rgba(color, 0.55));
  glow.addColorStop(1, rgba(color, 0));
  g.fillStyle = glow;
  g.fillRect(0, 0, r * 6, r * 6);
  g.fillStyle = color;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 === 0 ? r * 2.4 : r * 0.45;
    g.lineTo(cx + Math.cos(a) * rad, cx + Math.sin(a) * rad);
  }
  g.closePath();
  g.fill();
  return c;
}

const DEFAULTS = {
  light: { blockAlpha: 0.2, bokehAlpha: 0.22, blocks: ['#FFE3A3', '#FFFFFF', '#FFD0B8', '#FFC9D6'], bokeh: '#FFFFFF', motif: 'sparkle' },
  dark: { blockAlpha: 0.13, bokehAlpha: 0.2, blocks: ['#59B8E7', '#9B6EE0', '#3EC1B5', '#E9637A'], bokeh: '#9FB4FF', motif: 'stars' },
};

/**
 * The ambient layer lives in the DOM, not on a canvas: every element moves only by
 * transform/opacity through the Web Animations API, which the browser runs on the
 * GPU compositor. The main thread never repaints it, so it costs gameplay nothing.
 */
class Ambient {
  constructor() {
    this.root = null;
    this.anims = [];
    this.cfg = null;
  }

  attach(afterEl) {
    if (this.root) return this.root;
    const el = document.createElement('div');
    el.id = 'ambient';
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = 'position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden;contain:strict;';
    afterEl.insertAdjacentElement('afterend', el);
    this.root = el;
    return el;
  }

  clear() {
    for (const a of this.anims) {
      try { a.cancel(); } catch (e) { /* already gone */ }
    }
    this.anims = [];
    if (this.root) this.root.textContent = '';
  }

  /** Put a sprite canvas in the layer, scaled from device pixels to CSS pixels. */
  place(sprite, cssSize, opacity, blend) {
    sprite.style.cssText = `position:absolute;left:0;top:0;width:${cssSize}px;height:${cssSize}px;opacity:${opacity};will-change:transform,opacity;`;
    return sprite;
  }

  animate(el, frames, opts) {
    if (REDUCED_MOTION || typeof el.animate !== 'function') {
      const f = frames[Math.floor(frames.length / 2)] || frames[0];
      if (f.transform) el.style.transform = f.transform;
      return;
    }
    this.anims.push(el.animate(frames, Object.assign({ iterations: Infinity }, opts)));
  }

  configure(theme, w, h) {
    if (!this.root) return;
    this.clear();
    const base = theme.dark ? DEFAULTS.dark : DEFAULTS.light;
    const cfg = Object.assign({}, base, theme.ambient || {});
    this.cfg = cfg;
    const unit = Math.min(w, h);
    const R = (a, b) => a + Math.random() * (b - a);
    const D = 2; // sprites are drawn at 2x for crisp edges

    // drifting toy blocks at three depths: far & soft, mid & crisp, near & defocused
    // every block is crisp: depth comes from size, speed and opacity, never from blur
    const planes = [
      { n: 4, size: [0.07, 0.1], blur: 0, dur: [80, 105], alpha: 0.5 },
      { n: 4, size: [0.12, 0.17], blur: 0, dur: [52, 70], alpha: 0.8 },
      { n: 2, size: [0.19, 0.23], blur: 0, dur: [38, 48], alpha: 0.55 },
    ];
    let k = 0;
    for (const pl of planes) {
      for (let i = 0; i < pl.n; i++, k++) {
        const color = cfg.blocks[k % cfg.blocks.length];
        const size = Math.round(unit * R(pl.size[0], pl.size[1]));
        const spr = blockSprite(color, size * D, pl.blur * D);
        const css = (spr._size + spr._pad * 2) / D;
        const x = R(-0.05, 0.95) * w;
        const dur = R(pl.dur[0], pl.dur[1]) * 1000;
        // outer: slow rise from below the screen to above it
        const outer = document.createElement('div');
        outer.style.cssText = `position:absolute;left:${x}px;top:0;width:${css}px;height:${css}px;will-change:transform;`;
        this.animate(outer, [
          { transform: `translate3d(0,${h + css}px,0)` },
          { transform: `translate3d(0,${-css * 1.2}px,0)` },
        ], { duration: dur, delay: -Math.random() * dur, easing: 'linear' });
        // inner: gentle sway and a lazy turn
        const sway = R(10, 26);
        const rot = R(8, 26) * (Math.random() < 0.5 ? -1 : 1);
        const el = this.place(spr, css, cfg.blockAlpha * pl.alpha, false);
        this.animate(el, [
          { transform: `translate3d(${-sway}px,0,0) rotate(${-rot}deg)` },
          { transform: `translate3d(${sway}px,0,0) rotate(${rot}deg)` },
        ], { duration: R(7, 12) * 1000, delay: -Math.random() * 9000, direction: 'alternate', easing: 'ease-in-out' });
        outer.appendChild(el);
        this.root.appendChild(outer);
      }
    }

    // bokeh: big soft glows that breathe and drift
    for (let i = 0; i < 6; i++) {
      const r = Math.round(unit * R(0.07, 0.16));
      const spr = glowSprite(cfg.bokeh, r);
      const el = this.place(spr, r * 2, 1, true);
      el.style.left = `${R(-0.1, 0.9) * w}px`;
      el.style.top = `${R(-0.05, 0.95) * h}px`;
      const dx = R(-40, 40);
      const dy = R(-60, -20);
      this.animate(el, [
        { transform: 'translate3d(0,0,0) scale(0.9)', opacity: cfg.bokehAlpha * 0.35 },
        { transform: `translate3d(${dx}px,${dy}px,0) scale(1.1)`, opacity: cfg.bokehAlpha },
      ], { duration: R(9, 16) * 1000, delay: -Math.random() * 12000, direction: 'alternate', easing: 'ease-in-out' });
      this.root.appendChild(el);
    }

    // motif: twinkling stars / glints / motes
    if (cfg.motif) {
      const n = cfg.motif === 'stars' ? 16 : 10;
      const col = cfg.moteColor || '#FFFFFF';
      for (let i = 0; i < n; i++) {
        const rr0 = Math.max(1.2, unit * R(0.003, 0.006));
        const spr = starSprite(col, rr0 * D);
        const css = spr.width / D;
        const el = this.place(spr, css, 0, true);
        el.style.left = `${R(0, 1) * w - css / 2}px`;
        el.style.top = `${R(0, 1) * h - css / 2}px`;
        const peak = (cfg.moteAlpha ?? 0.9) * R(0.5, 1);
        this.animate(el, [
          { opacity: 0, transform: 'scale(0.4) rotate(0deg)' },
          { opacity: peak, transform: 'scale(1) rotate(45deg)', offset: 0.5 },
          { opacity: 0, transform: 'scale(0.4) rotate(90deg)' },
        ], { duration: R(2.6, 5.5) * 1000, delay: -Math.random() * 6000, easing: 'ease-in-out' });
        this.root.appendChild(el);
      }
    }
  }
}
__exports.REDUCED_MOTION = REDUCED_MOTION;
__exports.Ambient = Ambient;
});
// ---- render/renderer.js ----
__define("render/renderer.js", function (__exports) {
const { GRID } = __import("config.js");
const { clamp, roundRectPath, tileLabel, rgba } = __import("core/utils.js");
const { tileColor } = __import("render/palette.js");
const { drawTile } = __import("render/tileSkins.js");
const { Ambient, REDUCED_MOTION } = __import("render/ambient.js");

/**
 * Full-screen background: the map's painted backdrop plus a living ambient layer.
 * Static backdrops are painted once into an offscreen canvas and blitted, so every
 * map can afford gentle motion on top at ~30 fps.
 */
class Background {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.theme = null;
    this.state = null;
    this.dirty = true;
    this.last = 0;
    this.w = 0;
    this.h = 0;
    this.dpr = 1;
    this.base = null;
    this.ambient = new Ambient();
    this.ambient.attach(canvas);
  }

  setTheme(theme) {
    this.theme = theme;
    this.state = theme.init ? theme.init(this.w || 1, this.h || 1) : null;
    this.base = null;
    if (this.w) this.ambient.configure(theme, this.w, this.h);
    this.dirty = true;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.theme && this.theme.init) this.state = this.theme.init(this.w, this.h);
    this.base = null;
    if (this.theme) this.ambient.configure(this.theme, this.w, this.h);
    this.dirty = true;
  }

  /** Paint a static backdrop once, at device resolution. */
  paintBase() {
    const c = document.createElement('canvas');
    c.width = this.canvas.width;
    c.height = this.canvas.height;
    const g = c.getContext('2d');
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.theme.draw(g, this.w, this.h, 0, this.state);
    this.base = c;
  }

  draw(time) {
    if (!this.theme) return;
    // static maps paint once; the drifting layer above is animated by the compositor
    if (!this.theme.animated || REDUCED_MOTION) {
      if (!this.dirty) return;
    } else if (!this.dirty && time - this.last < 33) {
      return; // ~30 fps is plenty for a map's own motion
    }
    this.last = time;
    this.dirty = false;
    const ctx = this.ctx;
    ctx.save();
    this.theme.draw(ctx, this.w, this.h, time, this.state);
    ctx.restore();
  }
}

/** Draws the board, tiles, hover block, effects and particles on the game canvas. */
class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.skin = null;
    this.theme = null;
    this.layout = null;
    this.shakeAmp = 0;
    this.shakeUntil = 0;
    this.punchV = 0;
    this.w = 0;
    this.h = 0;
  }

  setSkin(skin) {
    this.skin = skin;
  }

  setTheme(theme) {
    this.theme = theme;
  }

  resize() {
    // screen pixels (getBoundingClientRect includes the stage's scale), capped at 2x for speed
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(1, rect.width);
    this.h = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.computeLayout();
  }

  computeLayout() {
    const { COLS, ROWS, HOVER_ROW } = GRID;
    const w = this.w;
    const h = this.h;
    const gapRatio = 0.13;
    const padX = Math.max(10, w * 0.055);
    const padTop = 6;
    const padBottom = Math.max(10, h * 0.02);
    const cellW = (w - padX * 2) / (COLS + (COLS - 1) * gapRatio);
    const unitsTall = (HOVER_ROW + 1) * (1 + gapRatio) + 0.25;
    const cellH = (h - padTop - padBottom) / unitsTall;
    const cell = Math.floor(Math.min(cellW, cellH));
    const gap = Math.round(cell * gapRatio);
    const pitch = cell + gap;
    const boardW = COLS * pitch - gap;
    const boardX = Math.round((w - boardW) / 2);
    const boardBottom = Math.round(h - padBottom);
    const topRowY = boardBottom - ROWS * pitch + gap;
    this.layout = {
      cell,
      gap,
      pitch,
      boardX,
      boardW,
      boardBottom,
      boardTop: topRowY,
      lineY: topRowY - gap * 1.1,
      radius: cell * 0.07,
    };
  }

  /** Top-left corner + size of a cell. c and r may be fractional (animations). */
  cellRect(c, r) {
    const L = this.layout;
    return { x: L.boardX + c * L.pitch, y: L.boardBottom - (r + 1) * L.pitch + L.gap, s: L.cell };
  }

  cellCenter(c, r) {
    const rc = this.cellRect(c, r);
    return { x: rc.x + rc.s / 2, y: rc.y + rc.s / 2 };
  }

  /** Column under an x coordinate (clamped). */
  colAt(x) {
    const L = this.layout;
    return clamp(Math.floor((x - L.boardX + L.gap / 2) / L.pitch), 0, GRID.COLS - 1);
  }

  /** Fractional column position for the hover block following a finger. */
  colFloatAt(x) {
    const L = this.layout;
    return clamp((x - L.boardX - L.cell / 2) / L.pitch, 0, GRID.COLS - 1);
  }

  /** Cell under a point, or null. */
  cellAt(x, y) {
    const L = this.layout;
    const c = Math.floor((x - L.boardX) / L.pitch);
    const r = Math.floor((L.boardBottom - y) / L.pitch);
    if (c < 0 || c >= GRID.COLS || r < 0 || r >= GRID.ROWS) return null;
    return { c, r };
  }

  shake(amp = 6, ms = 350) {
    this.shakeAmp = amp;
    this.shakeUntil = performance.now() + ms;
  }

  /** A soft camera push toward the board — weightier and calmer than a shake. */
  punch(amount = 0.015) {
    this.punchV = Math.max(this.punchV, amount);
  }

  draw(game, time) {
    const ctx = this.ctx;
    const L = this.layout;
    const ui = this.theme.ui;
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.save();
    if (time < this.shakeUntil) {
      // a smooth wobble rather than random jitter: it reads as weight, not glitch
      const k = (this.shakeUntil - time) / 350;
      ctx.translate(Math.sin(time / 26) * this.shakeAmp * k, Math.cos(time / 33) * this.shakeAmp * 0.5 * k);
    }
    if (this.punchV > 0.0005) {
      const cx = L.boardX + L.boardW / 2;
      const cy = (L.lineY + L.boardBottom) / 2;
      const k = 1 + this.punchV;
      ctx.translate(cx, cy);
      ctx.scale(k, k);
      ctx.translate(-cx, -cy);
      this.punchV *= 0.86;
    } else {
      this.punchV = 0;
    }
    // what the blocks look at, and how they feel about the stack
    this.look = null;
    if (game.lookPoint && time < game.lookPoint.until) {
      this.look = game.lookPoint;
    } else if (game.showHover && game.current) {
      const hc = this.cellRect(game.hoverX, GRID.HOVER_ROW);
      this.look = { x: hc.x + hc.s / 2, y: hc.y + hc.s / 2 };
    }

    // board cells - recessed wells, so blocks look like they sit *in* something
    if (ui.cell !== 'rgba(0,0,0,0)' || ui.cellStroke !== 'rgba(0,0,0,0)') {
      const wellR = L.radius * 2.2;
      const bx = this.cellRect(0, 0).x;
      const bw = this.cellRect(GRID.COLS - 1, 0).x + this.cellRect(0, 0).s - bx;
      const gy = L.lineY;
      const gh = L.boardBottom - L.lineY;
      const glow = ctx.createRadialGradient(bx + bw / 2, gy + gh * 0.55, 0, bx + bw / 2, gy + gh * 0.55, bw * 0.82);
      glow.addColorStop(0, ui.boardGlow || 'rgba(255,255,255,0)');
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(bx - bw * 0.3, gy - gh * 0.1, bw * 1.6, gh * 1.2);

      for (let c = 0; c < GRID.COLS; c++) {
        for (let r = 0; r < GRID.ROWS; r++) {
          const rc = this.cellRect(c, r);
          roundRectPath(ctx, rc.x, rc.y, rc.s, rc.s, wellR);
          ctx.fillStyle = ui.cell;
          ctx.fill();
          ctx.save();
          roundRectPath(ctx, rc.x, rc.y, rc.s, rc.s, wellR);
          ctx.clip();
          const ins = ctx.createLinearGradient(0, rc.y, 0, rc.y + rc.s * 0.42);
          ins.addColorStop(0, ui.cellInner || 'rgba(0,0,0,0.09)');
          ins.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = ins;
          ctx.fillRect(rc.x, rc.y, rc.s, rc.s * 0.42);
          const lip = ctx.createLinearGradient(0, rc.y + rc.s * 0.72, 0, rc.y + rc.s);
          lip.addColorStop(0, 'rgba(255,255,255,0)');
          lip.addColorStop(1, ui.cellLip || 'rgba(255,255,255,0.35)');
          ctx.fillStyle = lip;
          ctx.fillRect(rc.x, rc.y + rc.s * 0.72, rc.s, rc.s * 0.28);
          ctx.restore();
          if (ui.cellStroke !== 'rgba(0,0,0,0)') {
            ctx.strokeStyle = ui.cellStroke;
            ctx.lineWidth = 1;
            roundRectPath(ctx, rc.x, rc.y, rc.s, rc.s, wellR);
            ctx.stroke();
          }
        }
      }
    }

    // column highlight under the hover block
    if (game.showHover && game.current && game.state === 'idle') {
      const col = Math.round(game.hoverX);
      const rc = this.cellRect(col, GRID.ROWS - 1);
      ctx.fillStyle = ui.columnHi;
      roundRectPath(ctx, rc.x - L.gap / 2, L.lineY + 4, rc.s + L.gap, L.boardBottom - L.lineY - 4, L.radius * 2);
      ctx.fill();
      // landing preview
      const lr = game.board.landingRow(col);
      if (this.hints !== false && lr < GRID.ROWS) {
        const prc = this.cellRect(col, lr);
        ctx.strokeStyle = rgba(tileColor(game.current.exp, game.current.joker), 0.45);
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 5]);
        roundRectPath(ctx, prc.x + 1, prc.y + 1, prc.s - 2, prc.s - 2, L.radius * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // limit line: calm by default; when the stack gets close it warms and breathes
    // slowly rather than strobing, so pressure builds without the game feeling harsh
    const danger = game.dangerLevel();
    this.dangerVis = (this.dangerVis || 0) + (danger - (this.dangerVis || 0)) * 0.06;
    const dv = this.dangerVis;
    ctx.save();
    if (dv > 0.02) {
      const breathe = 0.6 + 0.4 * Math.sin(time / 650);
      const col = ui.danger.startsWith('#') ? ui.danger : '#ff7a8a';
      const band = ctx.createLinearGradient(0, L.lineY - L.cell * 0.55, 0, L.lineY + L.cell * 0.25);
      band.addColorStop(0, rgba(col, 0));
      band.addColorStop(0.72, rgba(col, 0.22 * dv * breathe));
      band.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = band;
      ctx.fillRect(L.boardX - L.gap, L.lineY - L.cell * 0.55, L.boardW + L.gap * 2, L.cell * 0.8);
    }
    const dash = Math.max(8, L.cell * 0.2);
    ctx.setLineDash([dash, dash * 0.8]);
    ctx.lineDashOffset = -time / 90;
    ctx.lineCap = 'round';
    ctx.lineWidth = 2.5 + dv * 1.5;
    ctx.strokeStyle = dv > 0.02 ? rgba(ui.danger.startsWith('#') ? ui.danger : '#ff7a8a', 0.55 + 0.4 * dv) : ui.line;
    ctx.beginPath();
    ctx.moveTo(L.boardX + 2, L.lineY);
    ctx.lineTo(L.boardX + L.boardW - 2, L.lineY);
    ctx.stroke();
    ctx.restore();

    // tiles (board + ghosts), sorted by z
    const items = [];
    for (const { tile, c, r } of game.board.tiles()) items.push({ tile, c, r });
    for (const tile of game.ghosts) items.push({ tile, c: tile.vx, r: tile.vy });
    items.sort((a, b) => (a.tile.z || 0) - (b.tile.z || 0));
    for (const it of items) this.drawTile(it.tile, it.tile.vx ?? it.c, it.tile.vy ?? it.r, time);

    // hover block: floats with a slow bob, tilts toward where you drag it
    if (game.showHover && game.current) {
      const hv = game.hoverVisual;
      const rc = this.cellRect(game.hoverX, GRID.HOVER_ROW);
      const bob = REDUCED_MOTION ? 0 : Math.sin(time / 520) * L.cell * 0.035;
      const lean = clamp((game.hoverTarget - game.hoverX) * 0.5, -0.18, 0.18);
      const ctx2 = this.ctx;
      ctx2.save();
      if (lean) {
        const px = rc.x + rc.s / 2;
        const py = rc.y + rc.s / 2 + bob;
        ctx2.translate(px, py);
        ctx2.rotate(lean);
        ctx2.translate(-px, -py);
      }
      this.drawTileAt(rc.x, rc.y + bob, rc.s, game.current.exp, game.current.joker, hv.scale, hv.alpha, 1, 1, time, 'hover', 7);
      ctx2.restore();
    }

    // hammer mode hint
    if (game.hammerMode) {
      ctx.save();
      ctx.strokeStyle = rgba(ui.accent.startsWith('#') ? ui.accent : '#ff5d5d', 0.8);
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -time / 40;
      roundRectPath(ctx, L.boardX - 6, L.boardTop - 6, L.boardW + 12, L.boardBottom - L.boardTop + 12, L.radius * 3);
      ctx.stroke();
      ctx.restore();
    }

    game.particles.draw(ctx);
    game.effects.draw(ctx, this.w, this.h);
    ctx.restore();
  }

  /** Which face a block wears, inferred from how it is currently moving. */
  faceState(tile, c, r, time) {
    if (tile.mergeAt != null && time - tile.mergeAt < 520) return 'merge';
    if ((tile.scale ?? 1) > 1.04) return 'merge';
    if (tile.landAt != null && time - tile.landAt < 300) return 'land';
    if (tile.surpriseAt != null && time - tile.surpriseAt < 420) return 'fall';
    if ((tile.sy ?? 1) < 0.94) return 'land';
    const dy = Math.abs((tile.vy ?? r) - r);
    if (dy > 0.07) return 'fall';
    if (this.dangerVis > 0.55) return 'worry';
    return 'idle';
  }

  drawTile(tile, c, r, time) {
    const rc = this.cellRect(c, r);
    const exp = tile.displayExp ?? tile.exp;
    const joker = tile.displayJoker ?? tile.joker;
    const face = this.faceState(tile, c, r, time);
    let sx = tile.sx ?? 1;
    let sy = tile.sy ?? 1;
    const id = tile.id ?? 0;
    if ((face === 'idle' || face === 'worry') && !REDUCED_MOTION && sx === 1 && sy === 1) {
      // resting blocks breathe, each on its own slow clock
      const b = Math.sin(time / 1500 + id * 1.9) * 0.014;
      sy = 1 + b;
      sx = 1 - b * 0.6;
    }
    this.drawTileAt(rc.x, rc.y, rc.s, exp, joker, tile.scale ?? 1, tile.alpha ?? 1, sx, sy, time, face, id, tile.flash || 0);
  }

  drawTileAt(x, y, s, exp, joker, scale = 1, alpha = 1, sx = 1, sy = 1, time = 0, face = 'idle', id = 0, flash = 0) {
    const ctx = this.ctx;
    const label = joker ? '∞' : tileLabel(exp);
    if (alpha <= 0.001 || scale <= 0.001) return;
    ctx.save();
    if (alpha < 1) ctx.globalAlpha = alpha;
    if (scale !== 1) {
      // pop in/out from the centre
      const cx = x + s / 2;
      const cy = y + s / 2;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
    }
    if (sx !== 1 || sy !== 1) {
      // squash & stretch anchored to the bottom edge (landing)
      const cx = x + s / 2;
      const cy = y + s;
      ctx.translate(cx, cy);
      ctx.scale(sx, sy);
      ctx.translate(-cx, -cy);
    }
    drawTile(ctx, this.skin, x, y, s, { exp, joker, label, time, face, id, look: this.look, flash });
    ctx.restore();
  }
}
__exports.Background = Background;
__exports.Renderer = Renderer;
});
// ---- render/themes.js ----
__define("render/themes.js", function (__exports) {
/**
 * Map themes ("looks"). Each theme paints the full-screen background canvas and
 * provides UI colours that are applied as CSS variables, so menus match the board.
 *
 *   ui: bg, text, muted, panel, panelBorder, accent, accentText, line, cell,
 *       cellStroke, columnHi, overlay, danger
 *   animated: whether draw() must run every frame (ambient effects)
 *   init(w, h) -> state, draw(ctx, w, h, t, state)
 */

function vGrad(ctx, w, h, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  stops.forEach(([p, c]) => g.addColorStop(p, c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function vignette(ctx, w, h, strength = 0.45) {
  const g = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.8);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function rand(a, b) {
  return a + Math.random() * (b - a);
}

const THEMES = [
  {
    id: 'classic',
    name: 'Classic',
    price: 0,
    desc: 'Warm coral sky with drifting toy blocks.',
    dark: false,
    animated: false,
    ambient: { blocks: ['#FFE8B0', '#FFFFFF', '#FFD6C2', '#FFC2CF', '#FFF3D6'], blockAlpha: 0.3, bokeh: '#FFD8B0', bokehAlpha: 0.26, motif: 'sparkle', moteColor: '#FFFFFF' },
    ui: {
      bg: '#F2586E',
      // text/muted also colour the white HUD panels, so they stay dark
      text: '#2B2B33',
      muted: '#8E4756',
      panel: '#ffffff',
      panelBorder: '#e9e9ef',
      accent: '#E9637A',
      accentText: '#ffffff',
      line: 'rgba(255,255,255,0.92)',
      cell: 'rgba(150,26,48,0.17)',
      cellStroke: 'rgba(255,255,255,0.07)',
      cellInner: 'rgba(120,16,38,0.24)',
      cellLip: 'rgba(255,255,255,0.16)',
      boardGlow: 'rgba(255,196,140,0.42)',
      columnHi: 'rgba(255,255,255,0.09)',
      overlay: 'rgba(255,255,255,0.88)',
      danger: '#e9637a',
    },
    draw(ctx, w, h) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#F8697F');
      g.addColorStop(0.55, '#F0576F');
      g.addColorStop(1, '#DC4560');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      const glow = ctx.createRadialGradient(w * 0.5, h * 0.52, 0, w * 0.5, h * 0.52, w * 0.95);
      glow.addColorStop(0, 'rgba(255,190,130,0.34)');
      glow.addColorStop(1, 'rgba(255,190,130,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      const v = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.35, w * 0.5, h * 0.5, w * 1.05);
      v.addColorStop(0, 'rgba(120,20,44,0)');
      v.addColorStop(1, 'rgba(120,20,44,0.26)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    price: 150,
    desc: 'Deep blue night mode, easy on the eyes.',
    dark: true,
    animated: false,
    ambient: { blocks: ['#59B8E7', '#9B6EE0', '#5C6BC0'], blockAlpha: 0.11, bokeh: '#6E8BFF', bokehAlpha: 0.18, motif: 'stars', moteColor: '#DCE6FF' },
    ui: {
      bg: '#161a2b',
      text: '#ffffff',
      muted: '#9aa1bd',
      panel: '#1f2439',
      panelBorder: '#2c3352',
      accent: '#59B8E7',
      accentText: '#0b1020',
      line: 'rgba(255,255,255,0.28)',
      cell: 'rgba(255,255,255,0.05)',
      cellStroke: 'rgba(255,255,255,0)',
      columnHi: 'rgba(255,255,255,0.06)',
      overlay: 'rgba(10,12,24,0.86)',
      danger: '#ff6b81',
    },
    draw(ctx, w, h) {
      vGrad(ctx, w, h, [
        [0, '#1b2038'],
        [1, '#0d101c'],
      ]);
      vignette(ctx, w, h, 0.35);
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    price: 400,
    desc: 'Deep water with rising bubbles and light rays.',
    dark: true,
    animated: true,
    ambient: { blocks: ['#3EC1B5', '#59B8E7', '#A6F0FF'], blockAlpha: 0.11, bokeh: '#6FE3FF', bokehAlpha: 0.2, motif: null },
    ui: {
      bg: '#0b3d63',
      text: '#ffffff',
      muted: '#9fc6dd',
      panel: 'rgba(8,40,66,0.85)',
      panelBorder: 'rgba(120,190,230,0.25)',
      accent: '#3EC1B5',
      accentText: '#04201c',
      line: 'rgba(200,235,255,0.35)',
      cell: 'rgba(255,255,255,0.07)',
      cellStroke: 'rgba(255,255,255,0)',
      columnHi: 'rgba(255,255,255,0.07)',
      overlay: 'rgba(4,24,44,0.86)',
      danger: '#ff7b7b',
    },
    init(w, h) {
      return {
        bubbles: Array.from({ length: 26 }, () => ({ x: rand(0, w), y: rand(0, h), r: rand(2, 9), v: rand(12, 40), s: rand(0, 6.28) })),
      };
    },
    draw(ctx, w, h, t, st) {
      vGrad(ctx, w, h, [
        [0, '#0f5c8f'],
        [0.55, '#0a3f68'],
        [1, '#051f36'],
      ]);
      // light rays
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const x = w * (0.15 + i * 0.25) + Math.sin(t / 4000 + i) * 30;
        const g = ctx.createLinearGradient(x, 0, x + 80, h);
        g.addColorStop(0, 'rgba(120,200,255,0.10)');
        g.addColorStop(1, 'rgba(120,200,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x - 40, 0);
        ctx.lineTo(x + 40, 0);
        ctx.lineTo(x + 160, h);
        ctx.lineTo(x - 60, h);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      const dt = 1 / 30;
      for (const b of st.bubbles) {
        b.y -= b.v * dt;
        b.s += dt;
        if (b.y < -12) {
          b.y = h + 12;
          b.x = rand(0, w);
        }
        const x = b.x + Math.sin(b.s) * 6;
        ctx.strokeStyle = 'rgba(200,235,255,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, b.y, b.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(200,235,255,0.08)';
        ctx.fill();
      }
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    price: 400,
    desc: 'Warm evening sky with a setting sun.',
    dark: true,
    animated: false,
    ambient: { blocks: ['#FFB36B', '#FF8FA3', '#FFD37A'], blockAlpha: 0.14, bokeh: '#FFB38A', bokehAlpha: 0.22, motif: 'sparkle', moteColor: '#FFE7B8' },
    ui: {
      bg: '#7a2f6b',
      text: '#ffffff',
      muted: '#f5cfd8',
      panel: 'rgba(70,20,70,0.7)',
      panelBorder: 'rgba(255,200,180,0.25)',
      accent: '#FFD166',
      accentText: '#4a1e3c',
      line: 'rgba(255,240,230,0.45)',
      cell: 'rgba(255,255,255,0.12)',
      cellStroke: 'rgba(255,255,255,0)',
      columnHi: 'rgba(255,255,255,0.1)',
      overlay: 'rgba(60,15,60,0.85)',
      danger: '#ffe08a',
    },
    draw(ctx, w, h) {
      vGrad(ctx, w, h, [
        [0, '#ff9a5a'],
        [0.35, '#e8637a'],
        [0.7, '#8e3b8c'],
        [1, '#3b1f5e'],
      ]);
      const sun = ctx.createRadialGradient(w * 0.5, h * 0.3, 10, w * 0.5, h * 0.3, w * 0.55);
      sun.addColorStop(0, 'rgba(255,230,160,0.75)');
      sun.addColorStop(0.25, 'rgba(255,190,120,0.35)');
      sun.addColorStop(1, 'rgba(255,190,120,0)');
      ctx.fillStyle = sun;
      ctx.fillRect(0, 0, w, h);
      // soft horizon bands
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      for (let i = 0; i < 5; i++) ctx.fillRect(0, h * (0.5 + i * 0.08), w, 6 + i * 3);
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    price: 500,
    desc: 'Night forest with drifting fireflies.',
    dark: true,
    animated: true,
    ambient: { blocks: ['#7ED957', '#3EC1B5', '#C8F28A'], blockAlpha: 0.08, bokeh: '#B8FF8A', bokehAlpha: 0.14, motif: null },
    ui: {
      bg: '#0f3b2e',
      text: '#ffffff',
      muted: '#a8cbb8',
      panel: 'rgba(10,45,35,0.85)',
      panelBorder: 'rgba(140,220,170,0.22)',
      accent: '#7ED957',
      accentText: '#0b2a1c',
      line: 'rgba(210,255,225,0.35)',
      cell: 'rgba(255,255,255,0.06)',
      cellStroke: 'rgba(255,255,255,0)',
      columnHi: 'rgba(255,255,255,0.07)',
      overlay: 'rgba(4,26,18,0.87)',
      danger: '#ff8e72',
    },
    init(w, h) {
      return {
        flies: Array.from({ length: 22 }, () => ({ x: rand(0, w), y: rand(0, h), a: rand(0, 6.28), s: rand(8, 22), p: rand(0, 6.28) })),
        trees: Array.from({ length: 9 }, (_, i) => ({ x: (i / 9) * w + rand(-20, 20), h: rand(0.25, 0.5), w: rand(60, 120) })),
      };
    },
    draw(ctx, w, h, t, st) {
      vGrad(ctx, w, h, [
        [0, '#0c3b2f'],
        [0.6, '#082a21'],
        [1, '#04160f'],
      ]);
      // silhouettes
      ctx.fillStyle = 'rgba(0,20,12,0.55)';
      for (const tr of st.trees) {
        ctx.beginPath();
        ctx.moveTo(tr.x - tr.w / 2, h);
        ctx.lineTo(tr.x, h - h * tr.h);
        ctx.lineTo(tr.x + tr.w / 2, h);
        ctx.closePath();
        ctx.fill();
      }
      const dt = 1 / 30;
      for (const f of st.flies) {
        f.a += (Math.random() - 0.5) * 0.6;
        f.x += Math.cos(f.a) * f.s * dt;
        f.y += Math.sin(f.a) * f.s * dt;
        if (f.x < 0) f.x = w;
        if (f.x > w) f.x = 0;
        if (f.y < 0) f.y = h;
        if (f.y > h) f.y = 0;
        const glow = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 500 + f.p));
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 10);
        g.addColorStop(0, `rgba(210,255,140,${0.9 * glow})`);
        g.addColorStop(0.3, `rgba(180,255,120,${0.35 * glow})`);
        g.addColorStop(1, 'rgba(180,255,120,0)');
        ctx.fillStyle = g;
        ctx.fillRect(f.x - 10, f.y - 10, 20, 20);
      }
    },
  },
  {
    id: 'neon',
    name: 'Neon Grid',
    price: 600,
    desc: 'Synthwave grid rushing towards you.',
    dark: true,
    animated: true,
    ambient: { blocks: ['#00E5FF', '#FF2D95', '#B388FF'], blockAlpha: 0.1, bokeh: '#FF2D95', bokehAlpha: 0.16, motif: 'stars', moteColor: '#9FF6FF' },
    ui: {
      bg: '#08061a',
      text: '#ffffff',
      muted: '#a89ad6',
      panel: 'rgba(20,12,50,0.85)',
      panelBorder: 'rgba(0,229,255,0.35)',
      accent: '#00E5FF',
      accentText: '#06111a',
      line: 'rgba(0,229,255,0.5)',
      cell: 'rgba(0,229,255,0.045)',
      cellStroke: 'rgba(0,229,255,0.16)',
      columnHi: 'rgba(255,0,200,0.08)',
      overlay: 'rgba(8,6,26,0.88)',
      danger: '#ff2d95',
    },
    draw(ctx, w, h, t) {
      vGrad(ctx, w, h, [
        [0, '#0a0620'],
        [0.6, '#15083a'],
        [1, '#2a0a4a'],
      ]);
      const horizon = h * 0.62;
      const sun = ctx.createRadialGradient(w / 2, horizon, 0, w / 2, horizon, w * 0.5);
      sun.addColorStop(0, 'rgba(255,60,180,0.35)');
      sun.addColorStop(1, 'rgba(255,60,180,0)');
      ctx.fillStyle = sun;
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.strokeStyle = 'rgba(0,229,255,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      // vertical perspective lines
      for (let i = -8; i <= 8; i++) {
        ctx.moveTo(w / 2 + i * w * 0.08, horizon);
        ctx.lineTo(w / 2 + i * w * 0.45, h);
      }
      // horizontal lines moving towards the viewer
      const phase = ((t / 1800) % 1 + 1) % 1;
      for (let k = 0; k < 10; k++) {
        const p = ((k + phase) / 10) ** 2.2;
        const y = horizon + p * (h - horizon);
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();
      ctx.restore();
      const fade = ctx.createLinearGradient(0, horizon, 0, h);
      fade.addColorStop(0, 'rgba(8,6,26,0.9)');
      fade.addColorStop(0.4, 'rgba(8,6,26,0)');
      ctx.fillStyle = fade;
      ctx.fillRect(0, horizon, w, h - horizon);
      vignette(ctx, w, h, 0.4);
    },
  },
  {
    id: 'candy',
    name: 'Candy',
    price: 500,
    desc: 'Soft pastel clouds and floating sprinkles.',
    dark: false,
    animated: true,
    ambient: { blocks: ['#FFB3D1', '#B8E3FF', '#FFF1A8', '#CDB8FF'], blockAlpha: 0.34, bokeh: '#FFFFFF', bokehAlpha: 0.3, motif: null },
    ui: {
      bg: '#ffe6ef',
      text: '#5a4a6a',
      muted: '#a58fb0',
      panel: 'rgba(255,255,255,0.75)',
      panelBorder: 'rgba(255,140,180,0.3)',
      accent: '#FF7AA2',
      accentText: '#ffffff',
      line: 'rgba(120,80,120,0.35)',
      cell: 'rgba(255,255,255,0.55)',
      cellStroke: 'rgba(255,255,255,0)',
      columnHi: 'rgba(255,120,170,0.12)',
      overlay: 'rgba(255,235,243,0.9)',
      danger: '#ff5d8f',
    },
    init(w, h) {
      return {
        blobs: Array.from({ length: 6 }, (_, i) => ({ x: rand(0, w), y: rand(0, h), r: rand(90, 180), c: ['#ffd1e0', '#e2d4ff', '#d4f1ff', '#fff0c9'][i % 4], vx: rand(-6, 6), vy: rand(-6, 6) })),
        sprinkles: Array.from({ length: 30 }, () => ({ x: rand(0, w), y: rand(0, h), a: rand(0, 3.14), c: ['#ff7aa2', '#7ac9ff', '#ffd166', '#b388ff', '#7ED957'][Math.floor(rand(0, 5))], v: rand(6, 16) })),
      };
    },
    draw(ctx, w, h, t, st) {
      vGrad(ctx, w, h, [
        [0, '#ffe3ec'],
        [1, '#e7dbff'],
      ]);
      const dt = 1 / 30;
      for (const b of st.blobs) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.x < -b.r) b.x = w + b.r;
        if (b.x > w + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = h + b.r;
        if (b.y > h + b.r) b.y = -b.r;
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, b.c);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
      }
      for (const s of st.sprinkles) {
        s.y += s.v * dt;
        s.a += dt * 0.6;
        if (s.y > h + 10) {
          s.y = -10;
          s.x = rand(0, w);
        }
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.a);
        ctx.fillStyle = s.c;
        ctx.globalAlpha = 0.6;
        ctx.fillRect(-5, -2, 10, 4);
        ctx.restore();
      }
    },
  },
  {
    id: 'space',
    name: 'Deep Space',
    price: 700,
    desc: 'Twinkling stars and a purple nebula.',
    dark: true,
    animated: true,
    ambient: { blocks: ['#B388FF', '#59B8E7', '#FF7AA2'], blockAlpha: 0.09, bokeh: '#8C7BFF', bokehAlpha: 0.16, motif: null },
    ui: {
      bg: '#070818',
      text: '#ffffff',
      muted: '#a4a6cc',
      panel: 'rgba(16,18,46,0.85)',
      panelBorder: 'rgba(179,136,255,0.3)',
      accent: '#B388FF',
      accentText: '#150a2a',
      line: 'rgba(220,210,255,0.4)',
      cell: 'rgba(255,255,255,0.05)',
      cellStroke: 'rgba(255,255,255,0)',
      columnHi: 'rgba(179,136,255,0.1)',
      overlay: 'rgba(6,7,24,0.88)',
      danger: '#ff6b9d',
    },
    init(w, h) {
      return {
        stars: Array.from({ length: 110 }, () => ({ x: rand(0, w), y: rand(0, h), r: rand(0.5, 1.8), p: rand(0, 6.28), s: rand(0.5, 2) })),
        nebula: [
          { x: w * 0.25, y: h * 0.3, r: w * 0.5, c: 'rgba(120,60,200,0.35)' },
          { x: w * 0.8, y: h * 0.7, r: w * 0.45, c: 'rgba(40,120,220,0.28)' },
          { x: w * 0.6, y: h * 0.15, r: w * 0.3, c: 'rgba(220,80,160,0.22)' },
        ],
      };
    },
    draw(ctx, w, h, t, st) {
      vGrad(ctx, w, h, [
        [0, '#05061a'],
        [1, '#12102e'],
      ]);
      for (const n of st.nebula) {
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
        g.addColorStop(0, n.c);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
      }
      for (const s of st.stars) {
        const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / (600 * s.s) + s.p));
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
];

const THEME_BY_ID = Object.fromEntries(THEMES.map((t) => [t.id, t]));

function getTheme(id) {
  return THEME_BY_ID[id] || THEMES[0];
}

/** Push the theme's UI colours into CSS variables so HTML overlays match the canvas. */
function applyThemeCss(theme) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(theme.ui)) root.style.setProperty(`--t-${k}`, v);
  root.style.setProperty('--t-panel-shadow', theme.dark ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 30px rgba(40,40,80,0.16)');
  document.body.classList.toggle('theme-dark', !!theme.dark);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme.ui.bg);
}
// Every map gets a recessed grid and a pool of light unless it sets its own.
for (const t of THEMES) {
  const u = t.ui;
  if (u.cell === 'rgba(0,0,0,0)') u.cell = t.dark ? 'rgba(255,255,255,0.05)' : 'rgba(60,40,70,0.06)';
  if (!u.cellInner) u.cellInner = t.dark ? 'rgba(0,0,0,0.34)' : 'rgba(60,40,70,0.12)';
  if (!u.cellLip) u.cellLip = t.dark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.4)';
  if (!u.boardGlow) u.boardGlow = t.dark ? 'rgba(130,160,255,0.11)' : 'rgba(255,242,218,0.5)';
}
__exports.THEMES = THEMES;
__exports.THEME_BY_ID = THEME_BY_ID;
__exports.getTheme = getTheme;
__exports.applyThemeCss = applyThemeCss;
});
// ---- services/web.js ----
__define("services/web.js", function (__exports) {
/**
 * The browser-portal layer (CrazyGames / Poki). window.WebPlatform is injected by the portal
 * packager before game.js; every call here is guarded, so the clean web build also runs without
 * it (then: no ads, no rewarded offers, midgame resolves at once).
 */
const wp = () => (typeof window !== 'undefined' && window.WebPlatform) || null;

const Web = {
  /** Resolves once the portal SDK is up (at once without it). Saves are read only after this. */
  whenReady() {
    const p = wp();
    return p && p.whenReady ? Promise.resolve(p.whenReady).catch(() => {}) : Promise.resolve();
  },

  loadingDone() {
    const p = wp();
    if (p) p.loadingDone();
  },

  gameplayStart() {
    const p = wp();
    if (p) p.gameplayStart();
  },

  gameplayStop() {
    const p = wp();
    if (p) p.gameplayStop();
  },

  /** A natural break (between games): the portal decides whether an ad plays. */
  midgame(reason) {
    const p = wp();
    return p ? Promise.resolve(p.midgame(reason)).catch(() => {}) : Promise.resolve();
  },

  /** Rewarded offers are shown only while this is true. */
  rewardedEnabled() {
    const p = wp();
    try {
      return !!(p && p.rewardedEnabled());
    } catch {
      return false;
    }
  },

  /** Resolves true only when the reward was earned. */
  rewarded(reason) {
    const p = wp();
    return p ? Promise.resolve(p.rewarded(reason)).then((ok) => !!ok, () => false) : Promise.resolve(false);
  },

  happytime() {
    const p = wp();
    if (p) p.happytime();
  },

  on(evt, fn) {
    const p = wp();
    if (p) p.on(evt, fn);
  },

  /** The player's language tag: the portal's (CrazyGames) or the browser's first choice. */
  locale() {
    const p = wp();
    try {
      if (p) return String(p.locale() || 'en');
    } catch {
      /* fall through */
    }
    return (typeof navigator !== 'undefined' && navigator.language) || 'en';
  },
};
__exports.Web = Web;
});
// ---- services/ads.js ----
__define("services/ads.js", function (__exports) {
const { ADS } = __import("config.js");
const { Emitter } = __import("core/events.js");
const { Web } = __import("services/web.js");

/**
 * Ads in the browser-portal build: everything goes through the portal SDK (services/web.js).
 *
 *   breakBetweenGames(reason) - the natural break between two games (Play again, Restart, Home,
 *                               a new game from the menu). The portal decides if an ad plays and
 *                               paces them itself: the game keeps no counters of its own.
 *   showRewarded(placement)   - continue after game over, double coins, free helpers, +coins, the
 *                               live layer's videos. Offered only while rewardedOffered() is true
 *                               (false on CrazyGames Basic Launch and when an ad blocker removed
 *                               the SDK); the reward is granted only when the portal says so.
 * Emits: 'rewarded' (placement) after a reward was earned.
 */
class AdsService extends Emitter {
  constructor(storage) {
    super();
    this.storage = storage;
    this.busy = false;
    this.started = true;
  }

  get state() {
    return this.storage.data.ads;
  }

  /** There is nothing to buy on the web: ads are never "removed". */
  get removed() {
    return false;
  }

  async init() {
    return 'web';
  }

  /** Kept for the callers of the native build; the portal SDK preloads by itself. */
  refresh() {}

  /** A natural break between games. Resolves when the game may go on. */
  async breakBetweenGames(reason = 'break') {
    if (this.busy) return;
    this.busy = true;
    try {
      await Web.midgame(reason);
    } finally {
      this.busy = false;
    }
  }

  /** Whether rewarded videos are offered at all. */
  rewardedOffered() {
    return !!ADS.rewarded.enabled && Web.rewardedEnabled();
  }

  isRewardedAvailable() {
    return this.rewardedOffered() && !this.busy;
  }

  /**
   * Shows a rewarded ad. Resolves { rewarded: boolean, error?: string }:
   *   'unavailable' no video was shown or it paid nothing: the caller says so, the button stays
   *   'busy'        a second tap while a video is on its way: ignore it
   */
  async showRewarded(placement = 'generic') {
    if (!this.rewardedOffered()) return { rewarded: false, error: 'disabled' };
    if (this.busy) return { rewarded: false, error: 'busy' };
    this.busy = true;
    let ok = false;
    try {
      ok = await Web.rewarded(placement);
    } finally {
      this.busy = false;
    }
    if (!ok) return { rewarded: false, error: 'unavailable' };
    this.state.rewardedWatched = (this.state.rewardedWatched || 0) + 1;
    this.storage.save();
    this.emit('rewarded', placement);
    return { rewarded: true };
  }
}
__exports.AdsService = AdsService;
});
// ---- services/analytics.js ----
__define("services/analytics.js", function (__exports) {
/**
 * Analytics stub. Wire up Firebase Analytics (@capacitor-firebase/analytics) or any other
 * provider here; the rest of the game only calls Analytics.track(event, props).
 */
const Analytics = {
  debug: false,
  track(event, props = {}) {
    if (this.debug) console.debug('[analytics]', event, props);
    // Example for Firebase: FirebaseAnalytics.logEvent({ name: event, params: props });
  },
};
__exports.Analytics = Analytics;
});
// ---- services/economy.js ----
__define("services/economy.js", function (__exports) {
const { ECONOMY } = __import("config.js");
const { Emitter } = __import("core/events.js");
const { todayKey } = __import("core/utils.js");

/** Coins, unlocks and selections. Emits: 'coins' (balance, delta, reason), 'unlock' (kind, id), 'select' (kind, id). */
class Economy extends Emitter {
  constructor(storage) {
    super();
    this.storage = storage;
  }

  get data() {
    return this.storage.data;
  }

  get coins() {
    return this.data.coins;
  }

  earn(amount, reason = '') {
    amount = Math.floor(amount);
    if (amount <= 0) return 0;
    this.data.coins += amount;
    this.storage.save();
    this.emit('coins', this.data.coins, amount, reason);
    return amount;
  }

  canAfford(amount) {
    return this.data.coins >= amount;
  }

  spend(amount, reason = '') {
    amount = Math.floor(amount);
    if (amount <= 0) return true;
    if (this.data.coins < amount) return false;
    this.data.coins -= amount;
    this.storage.save();
    this.emit('coins', this.data.coins, -amount, reason);
    return true;
  }

  owns(kind, id) {
    const list = this.data.owned[kind] || [];
    return list.includes(id);
  }

  /** kind: 'skins' | 'themes'. Returns 'ok' | 'owned' | 'insufficient'. */
  unlock(kind, id, price) {
    if (this.owns(kind, id)) return 'owned';
    if (price > 0 && !this.spend(price, `unlock:${kind}:${id}`)) return 'insufficient';
    if (!this.data.owned[kind]) this.data.owned[kind] = [];
    this.data.owned[kind].push(id);
    this.storage.save();
    this.emit('unlock', kind, id);
    return 'ok';
  }

  grant(kind, id) {
    if (this.owns(kind, id)) return;
    if (!this.data.owned[kind]) this.data.owned[kind] = [];
    this.data.owned[kind].push(id);
    this.storage.save();
    this.emit('unlock', kind, id);
  }

  select(kind, id) {
    if (!this.owns(kind, id)) return false;
    if (kind === 'skins') this.data.skin = id;
    else if (kind === 'themes') this.data.theme = id;
    this.storage.save();
    this.emit('select', kind, id);
    return true;
  }

  selected(kind) {
    return kind === 'skins' ? this.data.skin : this.data.theme;
  }

  /** Daily login bonus. Returns the amount granted (0 if already claimed today). */
  claimDaily() {
    const key = todayKey();
    if (this.data.daily.lastClaim === key) return 0;
    this.data.daily.lastClaim = key;
    this.earn(ECONOMY.dailyBonus, 'daily');
    return ECONOMY.dailyBonus;
  }

  dailyAvailable() {
    return this.data.daily.lastClaim !== todayKey();
  }

  powerupPrice(id) {
    return ECONOMY.powerups[id].price;
  }
}
__exports.Economy = Economy;
});
// ---- services/progress.js ----
__define("services/progress.js", function (__exports) {
const { LIVE } = __import("config.js");
const { Emitter } = __import("core/events.js");
const { todayKey } = __import("core/utils.js");
const { SKINS } = __import("render/tileSkins.js");
const { THEMES } = __import("render/themes.js");

/**
 * The live layer: everything that rewards coming back and playing on.
 *
 *   - (web build) no welcome period: every player starts as if it were over (the portals pace ads)
 *   - daily login calendar (7 days, a Golden chest on day 7)
 *   - 5 daily missions -> activity points -> 5 milestone rewards; the points also fill the week
 *   - achievements in tiers, the season pass (web build: the free track only), chests, the lucky spin
 *   - helper tokens (Hammer, Joker, Undo you own)
 *
 * No DOM here: the UI (ui/live.js) reads this state and calls the claim methods, so every rule
 * can be tested in Node (scripts/live-test.mjs). Every change emits 'change'.
 */

const HELPERS = ['hammer', 'joker', 'undo'];
const GAMEPLAY = new Set(['merge', 'milestone', 'gameover', 'double']);
const DAY = 86400000;

function defaultLive() {
  return {
    playSec: 0,
    unlocked: false,
    unlockedAt: 0,
    unlockSeen: false,
    day: '',
    week: '',
    today: emptyToday(),
    login: { claimed: '', index: 0, days: 0, doubled: '' },
    missions: { day: '', list: [], points: 0, ms: [], rerolls: 0 },
    weekPts: 0,
    weekMs: [],
    inv: { hammer: 0, joker: 0, undo: 0 },
    totals: { helpersUsed: 0, chestsOpened: 0, missionsDone: 0, loginDays: 0, videos: 0 },
    ach: {},
    pass: { season: -1, xp: 0, premium: false, free: [], prem: [] },
    chest: { freeAt: 0 },
    spin: { day: '', free: false, ads: 0 },
    caps: { day: '', n: {} },
    lastGame: '',
  };
}

function emptyToday() {
  return { games: 0, merges: 0, drops: 0, chain: 0, block: 0, score: 0, helpers: 0, chests: 0, spins: 0, earned: 0, videos: 0 };
}

/** Monday-based week key, e.g. "2026-W41". */
function weekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const wk = Math.ceil(((t - y0) / DAY + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(wk).padStart(2, '0')}`;
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The reward of a pass tier (1-based) on 'free' or 'premium'. */
function passReward(track, tier) {
  const k = tier % 5;
  if (track === 'free') {
    if (tier === 30) return { chest: 'gold' };
    if (tier % 10 === 0) return { chest: 'silver' };
    if (k === 0) return { chest: 'wood' };
    if (k === 1) return { coins: 30 + tier * 2 };
    if (k === 2) return { undo: 1 };
    if (k === 3) return { coins: 40 + tier * 2 };
    return { [tier % 2 ? 'joker' : 'hammer']: 1 };
  }
  const look = LIVE.pass.premiumLooks[tier];
  if (look) return tier === 30 ? { look, chest: 'gold' } : { look };
  if (k === 0) return { chest: 'silver' };
  if (k === 1) return { coins: 100 + tier * 5 };
  if (k === 2) return { hammer: 1, joker: 1 };
  if (k === 3) return { coins: 120 + tier * 5 };
  return { undo: 2, joker: 1 };
}

class Progress extends Emitter {
  constructor(storage, economy, opts = {}) {
    super();
    this.storage = storage;
    this.economy = economy;
    this.now = opts.now || (() => Date.now());
    this.random = opts.random || Math.random;
    // whether rewarded videos are offered right now (no "watch videos" mission without them)
    this.videos = opts.videos || (() => true);
    this.saveTimer = 0;
    this.rollTimer = 0;
  }

  /** Fills in anything a save from an older version lacks, then starts today if needed. */
  init() {
    const fill = (base, data) => {
      if (!data || typeof data !== 'object') return base;
      for (const k of Object.keys(base)) {
        const b = base[k];
        const d = data[k];
        if (d === undefined) continue;
        base[k] = b && typeof b === 'object' && !Array.isArray(b) && d && typeof d === 'object' && !Array.isArray(d) ? fill(b, d) : d;
      }
      for (const k of Object.keys(data)) if (!(k in base)) base[k] = data[k];
      return base;
    };
    this.storage.data.live = fill(defaultLive(), this.storage.data.live);
    // web build: the welcome period (and its gift card) does not exist
    const s = this.storage.data.live;
    s.unlocked = true;
    s.unlockSeen = true;
    if (!s.unlockedAt) s.unlockedAt = this.now();
    this.rollover();
    this.checkMissions();
    return this;
  }

  /**
   * Emits 'missionDone' once for each of today's missions the moment its goal is reached
   * (missions already finished when the app starts, or when a new day begins, stay quiet).
   */
  checkMissions() {
    const day = this.s.missions.day;
    const list = this.missions();
    if (this.seenDay !== day) {
      this.seenDay = day;
      this.seen = new Set(list.filter((m) => m.done).map((m) => m.id));
      return;
    }
    for (const m of list) {
      if (m.done && !this.seen.has(m.id)) {
        this.seen.add(m.id);
        this.emit('missionDone', m);
      }
    }
  }

  get s() {
    if (!this.storage.data.live) this.storage.data.live = defaultLive();
    return this.storage.data.live;
  }

  get data() {
    return this.storage.data;
  }

  save(now = false) {
    this.storage.save(now);
  }

  changed() {
    this.save();
    this.emit('change');
  }

  date() {
    return new Date(this.now());
  }

  // ---------------------------------------------------------------- the welcome period
  get unlocked() {
    return !!this.s.unlocked;
  }

  /** Time on screen. `dt` in seconds; the app calls this from its frame loop. */
  tick(dt) {
    if (!(dt > 0)) return;
    const s = this.s;
    s.playSec += Math.min(dt, 1);
    this.saveTimer += dt;
    if (this.saveTimer > 10) {
      this.saveTimer = 0;
      this.save();
    }
    this.rollTimer += dt;
    if (this.rollTimer > 5) {
      this.rollTimer = 0;
      this.rollover();
    }
  }

  // ---------------------------------------------------------------- day / week turnover
  /** Starts a new day / week when the calendar has moved on. Safe to call any time. */
  rollover() {
    const s = this.s;
    const d = this.date();
    const day = todayKey(d);
    let moved = false;
    if (s.day !== day) {
      s.day = day;
      s.today = emptyToday();
      s.spin = { day, free: false, ads: 0 };
      s.caps = { day, n: {} };
      this.newMissions(day);
      moved = true;
    }
    const wk = weekKey(d);
    if (s.week !== wk) {
      s.week = wk;
      s.weekPts = 0;
      s.weekMs = [];
      moved = true;
    }
    const season = this.season().id;
    if (s.pass.season !== season) {
      s.pass = { season, xp: 0, premium: false, free: [], prem: [] };
      moved = true;
    }
    if (moved) this.changed();
  }

  // ---------------------------------------------------------------- rewarded-video caps
  capLeft(kind) {
    this.rollover();
    const max = LIVE.adCaps[kind] ?? 0;
    return Math.max(0, max - (this.s.caps.n[kind] || 0));
  }

  useCap(kind) {
    this.s.caps.n[kind] = (this.s.caps.n[kind] || 0) + 1;
    this.changed();
  }

  // ---------------------------------------------------------------- events from the game
  onTurn() {
    this.rollover();
    this.s.today.drops++;
    this.checkMissions();
  }

  onMerge({ exp, chain }) {
    this.rollover();
    const t = this.s.today;
    t.merges++;
    if (chain > t.chain) t.chain = chain;
    if (exp > t.block) t.block = exp;
    this.checkMissions();
  }

  onScore(score) {
    const t = this.s.today;
    if (score > t.score) {
      t.score = score;
      this.checkMissions();
    }
  }

  /** `gameId` keeps a game that was continued and then ended again from counting twice. */
  onGameOver(summary, gameId) {
    this.rollover();
    const t = this.s.today;
    if (summary.score > t.score) t.score = summary.score;
    if (gameId && this.s.lastGame === gameId) {
      this.checkMissions();
      this.changed();
      return;
    }
    if (gameId) this.s.lastGame = gameId;
    t.games++;
    const xp = LIVE.pass.xp;
    this.addXp(Math.min(xp.gameMax, xp.gameBase + Math.floor((summary.score || 0) / xp.gameScoreStep)));
    this.checkMissions();
    this.changed();
  }

  onHelperUsed() {
    this.rollover();
    this.s.today.helpers++;
    this.s.totals.helpersUsed++;
    this.checkMissions();
    this.changed();
  }

  onCoins(delta, reason) {
    if (!(delta > 0) || !GAMEPLAY.has(reason)) return;
    this.rollover();
    this.s.today.earned += delta;
    this.checkMissions();
  }

  onVideo() {
    this.rollover();
    this.s.today.videos++;
    this.s.totals.videos++;
        this.checkMissions();
    this.changed();
  }

  // ---------------------------------------------------------------- rewards
  /**
   * Grants a reward and returns what was given, as a flat list of lines for the reveal screen:
   *   { type: 'coins', n } | { type: 'hammer'|'joker'|'undo', n } | { type: 'xp', n }
   *   { type: 'look', kind, id, dup } | { type: 'chest', kind, contents: [...lines] }
   */
  grant(reward, source = 'reward') {
    const lines = [];
    if (!reward) return lines;
    if (reward.coins) {
      this.economy.earn(reward.coins, `live:${source}`);
      lines.push({ type: 'coins', n: reward.coins });
    }
    for (const id of HELPERS) {
      if (reward[id]) {
        this.s.inv[id] = (this.s.inv[id] || 0) + reward[id];
        lines.push({ type: id, n: reward[id] });
      }
    }
    if (reward.xp) {
      this.addXp(reward.xp);
      lines.push({ type: 'xp', n: reward.xp });
    }
    if (reward.look) lines.push(this.grantLook(reward.look[0], reward.look[1], LIVE.chests.kinds.gold.lookCoins, source));
    if (reward.chest) lines.push({ type: 'chest', kind: reward.chest, contents: this.rollChest(reward.chest, source) });
    this.changed();
    return lines;
  }

  grantLook(kind, id, coinsIfOwned, source) {
    if (this.economy.owns(kind, id)) {
      this.economy.earn(coinsIfOwned, `live:${source}:dup`);
      return { type: 'look', kind, id, dup: coinsIfOwned };
    }
    this.economy.grant(kind, id);
    return { type: 'look', kind, id, dup: 0 };
  }

  /** Opens a chest: picks its contents, grants them, counts it. */
  rollChest(kind, source = 'chest') {
    const k = LIVE.chests.kinds[kind];
    const r = this.random;
    const out = [];
    const coins = Math.round(k.coins[0] + r() * (k.coins[1] - k.coins[0]));
    this.economy.earn(coins, `chest:${kind}`);
    out.push({ type: 'coins', n: coins });
    const helpers = {};
    let n = k.helpers + (r() < k.extra ? 1 : 0);
    while (n-- > 0) {
      const id = HELPERS[Math.floor(r() * HELPERS.length)];
      helpers[id] = (helpers[id] || 0) + 1;
    }
    for (const id of HELPERS) {
      if (helpers[id]) {
        this.s.inv[id] += helpers[id];
        out.push({ type: id, n: helpers[id] });
      }
    }
    if (k.look > 0 && r() < k.look) {
      const missing = [
        ...SKINS.filter((x) => !this.economy.owns('skins', x.id)).map((x) => ['skins', x.id]),
        ...THEMES.filter((x) => !this.economy.owns('themes', x.id)).map((x) => ['themes', x.id]),
      ];
      if (missing.length) {
        const [lk, id] = missing[Math.floor(r() * missing.length)];
        this.economy.grant(lk, id);
        out.push({ type: 'look', kind: lk, id, dup: 0 });
      } else if (k.lookCoins) {
        this.economy.earn(k.lookCoins, `chest:${kind}:all-owned`);
        out.push({ type: 'coins', n: k.lookCoins });
      }
    }
    this.rollover();
    this.s.today.chests++;
    this.s.totals.chestsOpened++;
    this.checkMissions();
    this.changed();
    return out;
  }

  /** Drop rates of a chest, for the odds disclosure. */
  chestOdds(kind) {
    const k = LIVE.chests.kinds[kind];
    return {
      coins: k.coins,
      helpers: k.helpers,
      extra: k.extra,
      look: k.look,
      lookCoins: k.lookCoins,
    };
  }

  // ---------------------------------------------------------------- helper tokens
  items() {
    return { ...this.s.inv };
  }

  has(id) {
    return (this.s.inv[id] || 0) > 0;
  }

  /** Spends one owned helper. Returns false when there is none. */
  take(id) {
    if (!this.has(id)) return false;
    this.s.inv[id]--;
    this.changed();
    return true;
  }

  // ---------------------------------------------------------------- daily login
  login() {
    this.rollover();
    const s = this.s.login;
    const today = this.s.day;
    const claimedToday = s.claimed === today;
    // the day you claim today is the one just claimed; otherwise the next one in the cycle
    const index = claimedToday ? (s.index + 6) % 7 : s.index;
    return { index, claimedToday, canClaim: !claimedToday, rewards: LIVE.login, doubled: s.doubled === today };
  }

  claimLogin() {
    const st = this.login();
    if (!st.canClaim) return null;
    const s = this.s.login;
    const reward = LIVE.login[s.index];
    s.claimed = this.s.day;
    s.index = (s.index + 1) % 7;
    s.days++;
    this.s.totals.loginDays++;
    this.addXp(LIVE.pass.xp.login);
    return { day: st.index, lines: this.grant(reward, 'login') };
  }

  /** After a rewarded video: today's calendar reward once more (chests excluded: coins instead). */
  doubleLogin() {
    const s = this.s.login;
    if (s.claimed !== this.s.day || s.doubled === this.s.day) return null;
    s.doubled = this.s.day;
    const reward = LIVE.login[(s.index + 6) % 7];
    return this.grant(reward.chest ? { coins: 150 } : reward, 'login2');
  }

  // ---------------------------------------------------------------- daily missions
  tier() {
    const games = this.data.stats.games || 0;
    return games >= 40 ? 2 : games >= 10 ? 1 : 0;
  }

  newMissions(day) {
    const rnd = seeded(hash(`missions:${day}`));
    const pool = LIVE.missions.pool.filter((m) => !m.needsAds || this.videos());
    const pick = pool.filter((m) => m.always);
    const rest = pool.filter((m) => !m.always);
    while (pick.length < LIVE.missions.perDay && rest.length) pick.push(rest.splice(Math.floor(rnd() * rest.length), 1)[0]);
    const tier = this.tier();
    this.s.missions = {
      day,
      list: pick.map((m) => ({ id: m.id, metric: m.metric, goal: m.goals[tier], coins: m.coins, claimed: false })),
      points: 0,
      ms: [],
      rerolls: 0,
    };
  }

  missions() {
    this.rollover();
    const t = this.s.today;
    return this.s.missions.list.map((m, i) => {
      const value = t[m.metric] || 0;
      return { ...m, index: i, value: Math.min(value, m.goal), done: value >= m.goal, claimable: value >= m.goal && !m.claimed };
    });
  }

  claimMission(i) {
    const m = this.missions()[i];
    if (!m || !m.claimable) return null;
    this.s.missions.list[i].claimed = true;
    const pts = LIVE.missions.points;
    this.s.missions.points += pts;
    this.s.weekPts += pts;
    this.s.totals.missionsDone++;
    const lines = this.grant({ coins: m.coins, xp: LIVE.pass.xp.mission }, 'mission');
    return { points: pts, lines };
  }

  /** Swaps an unfinished mission for another one (after a rewarded video). */
  rerollMission(i) {
    const list = this.s.missions.list;
    const m = list[i];
    if (!m || m.claimed) return false;
    const used = new Set(list.map((x) => x.id));
    const options = LIVE.missions.pool.filter((p) => !used.has(p.id) && !p.always && (!p.needsAds || this.videos()));
    if (!options.length) return false;
    const p = options[Math.floor(this.random() * options.length)];
    list[i] = { id: p.id, metric: p.metric, goal: p.goals[this.tier()], coins: p.coins, claimed: false };
    this.s.missions.rerolls++;
    if (this.seen && (this.s.today[p.metric] || 0) >= list[i].goal) this.seen.add(p.id);
    this.changed();
    return true;
  }

  milestones() {
    const pts = this.s.missions.points;
    return LIVE.missions.milestones.map((m, i) => ({ ...m, index: i, reached: pts >= m.at, claimed: !!this.s.missions.ms[i], claimable: pts >= m.at && !this.s.missions.ms[i] }));
  }

  claimMilestone(i) {
    const m = this.milestones()[i];
    if (!m || !m.claimable) return null;
    this.s.missions.ms[i] = true;
    return this.grant(m.reward, 'milestone');
  }

  weekMilestones() {
    this.rollover();
    const pts = this.s.weekPts;
    return LIVE.week.milestones.map((m, i) => ({ ...m, index: i, reached: pts >= m.at, claimed: !!this.s.weekMs[i], claimable: pts >= m.at && !this.s.weekMs[i] }));
  }

  claimWeek(i) {
    const m = this.weekMilestones()[i];
    if (!m || !m.claimable) return null;
    this.s.weekMs[i] = true;
    return this.grant(m.reward, 'week');
  }

  /** Milliseconds to the next local midnight / next Monday. */
  dayLeft() {
    const d = this.date();
    const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    return next - d;
  }

  weekLeft() {
    const d = this.date();
    const dow = d.getDay() || 7;
    const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (8 - dow));
    return next - d;
  }

  // ---------------------------------------------------------------- achievements
  metric(name) {
    const d = this.data;
    switch (name) {
      case 'games':
      case 'merges':
      case 'highestExp':
      case 'bestChain':
        return d.stats[name] || 0;
      case 'best':
        return d.best || 0;
      case 'collection':
        return (d.owned.skins || []).length + (d.owned.themes || []).length;
      default:
        return this.s.totals[name] || 0;
    }
  }

  achievements() {
    return LIVE.achievements.map((a) => {
      const done = this.s.ach[a.id] || 0; // tiers claimed
      const value = this.metric(a.metric);
      const tier = a.tiers[Math.min(done, a.tiers.length - 1)];
      const complete = done >= a.tiers.length;
      return {
        id: a.id,
        metric: a.metric,
        level: done,
        levels: a.tiers.length,
        goal: tier[0],
        reward: tier[1],
        value,
        complete,
        claimable: !complete && value >= tier[0],
      };
    });
  }

  claimAchievement(id) {
    const a = this.achievements().find((x) => x.id === id);
    if (!a || !a.claimable) return null;
    this.s.ach[id] = a.level + 1;
    return this.grant(a.reward, 'achievement');
  }

  // ---------------------------------------------------------------- season pass
  season() {
    const len = LIVE.pass.seasonDays * DAY;
    const t = this.now();
    const id = Math.max(0, Math.floor((t - LIVE.pass.seasonEpoch) / len));
    const start = LIVE.pass.seasonEpoch + id * len;
    return { id, number: id + 1, start, end: start + len, left: Math.max(0, start + len - t) };
  }

  addXp(n) {
    this.rollover();
    this.s.pass.xp += Math.max(0, Math.round(n));
  }

  pass() {
    this.rollover();
    const p = this.s.pass;
    const per = LIVE.pass.xpPerTier;
    const level = Math.min(LIVE.pass.tiers, Math.floor(p.xp / per));
    const tiers = [];
    for (let i = 1; i <= LIVE.pass.tiers; i++) {
      const reached = level >= i;
      tiers.push({
        tier: i,
        reached,
        free: { reward: passReward('free', i), claimed: p.free.includes(i), claimable: reached && !p.free.includes(i) },
        premium: { reward: passReward('premium', i), claimed: p.prem.includes(i), claimable: reached && p.premium && !p.prem.includes(i) },
      });
    }
    return { season: this.season(), xp: p.xp, level, inTier: level >= LIVE.pass.tiers ? per : p.xp - level * per, per, premium: p.premium, tiers };
  }

  claimPass(track, tier) {
    const t = this.pass().tiers[tier - 1];
    if (!t) return null;
    const cell = track === 'free' ? t.free : t.premium;
    if (!cell.claimable) return null;
    (track === 'free' ? this.s.pass.free : this.s.pass.prem).push(tier);
    return this.grant(cell.reward, `pass:${track}`);
  }

  /** Claims every reward the pass holds for the player right now. */
  claimAllPass() {
    const lines = [];
    for (const t of this.pass().tiers) {
      if (t.free.claimable) lines.push(...this.claimPass('free', t.tier));
      if (t.premium.claimable) lines.push(...this.claimPass('premium', t.tier));
    }
    return lines;
  }

  // ---------------------------------------------------------------- chests
  freeChestLeft() {
    return Math.max(0, (this.s.chest.freeAt || 0) - this.now());
  }

  openFreeChest() {
    if (this.freeChestLeft() > 0) return null;
    this.s.chest.freeAt = this.now() + LIVE.chests.freeEveryHours * 3600000;
    return this.rollChest('wood', 'free');
  }

  /** After a rewarded video: the free chest is ready now. */
  readyFreeChest() {
    this.s.chest.freeAt = 0;
    this.changed();
  }

  buySilverChest() {
    if (!this.economy.spend(LIVE.chests.silverPrice, 'chest:silver')) return null;
    return this.rollChest('silver', 'coins');
  }

  // ---------------------------------------------------------------- lucky spin
  spinState() {
    this.rollover();
    return { free: !this.s.spin.free, ads: this.capLeft('spin') };
  }

  /** Spins the wheel: `paid` is 'free' or 'ad'. Returns { index, lines } or null. */
  spin(paid) {
    this.rollover();
    if (paid === 'free') {
      if (this.s.spin.free) return null;
      this.s.spin.free = true;
    }
    const segs = LIVE.spin.segments;
    const total = segs.reduce((a, x) => a + x.weight, 0);
    let r = this.random() * total;
    let index = segs.length - 1;
    for (let i = 0; i < segs.length; i++) {
      r -= segs[i].weight;
      if (r < 0) {
        index = i;
        break;
      }
    }
    this.s.today.spins++;
    this.checkMissions();
    return { index, lines: this.grant(segs[index].reward, 'spin') };
  }

  // ---------------------------------------------------------------- red dots
  badges() {
    this.rollover();
    const m = this.missions();
    const missions = m.filter((x) => x.claimable).length + this.milestones().filter((x) => x.claimable).length + this.weekMilestones().filter((x) => x.claimable).length;
    const goals = this.achievements().filter((x) => x.claimable).length;
    const pass = this.pass().tiers.reduce((n, t) => n + (t.free.claimable ? 1 : 0) + (t.premium.claimable ? 1 : 0), 0);
    return {
      daily: this.login().canClaim,
      spin: this.spinState().free,
      chest: this.freeChestLeft() <= 0,
      missions: missions + goals,
      goals,
      pass,
    };
  }
}
__exports.HELPERS = HELPERS;
__exports.defaultLive = defaultLive;
__exports.weekKey = weekKey;
__exports.passReward = passReward;
__exports.Progress = Progress;
});
// ---- services/storage.js ----
__define("services/storage.js", function (__exports) {
const { APP, ECONOMY } = __import("config.js");

/** Default save data. Everything the game remembers lives in this one object. */
function defaultSave() {
  return {
    version: 1,
    best: 0,
    coins: ECONOMY.startingCoins,
    skin: 'classic',
    theme: 'classic',
    owned: { skins: ['classic'], themes: ['classic'] },
    settings: { sound: true, music: true, haptics: true, hints: true, lang: '' }, // lang '' = follow the phone
    stats: { games: 0, merges: 0, highestExp: 0, totalScore: 0, drops: 0, bestChain: 0 },
    ads: { lastRewardCoinsAt: 0, rewardedWatched: 0 },
    daily: { lastClaim: '' },
    live: null, // daily rewards, missions, pass, chests... (services/progress.js fills it in)
    game: null,
    createdAt: Date.now(),
  };
}

function mergeDefaults(base, data) {
  if (!data || typeof data !== 'object') return base;
  for (const key of Object.keys(base)) {
    const b = base[key];
    const d = data[key];
    if (d === undefined) continue;
    if (b && typeof b === 'object' && !Array.isArray(b) && d && typeof d === 'object' && !Array.isArray(d)) {
      base[key] = mergeDefaults(b, d);
    } else {
      base[key] = d;
    }
  }
  return base;
}

/**
 * Persistent storage: localStorage (one namespaced key, APP.saveKey).
 * All reads go through the in-memory `data` object; writes are debounced.
 */
class Storage {
  constructor(key = APP.saveKey) {
    this.key = key;
    this.data = defaultSave();
    this._timer = null;
    this.ready = false;
  }

  async init() {
    let raw = null;
    try {
      raw = window.localStorage.getItem(this.key);
    } catch (err) {
      console.warn('[storage] load failed', err);
    }
    if (raw) {
      try {
        this.data = mergeDefaults(defaultSave(), JSON.parse(raw));
      } catch (err) {
        console.warn('[storage] corrupt save, starting fresh', err);
      }
    }
    this.ready = true;
    return this.data;
  }

  save(immediate = false) {
    if (immediate) {
      this._flush();
      return;
    }
    if (this._timer) return;
    this._timer = setTimeout(() => this._flush(), 250);
  }

  _flush() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    // nothing is written before the save was read (it may still be on its way from the portal's cloud)
    if (!this.ready) return Promise.resolve();
    const raw = JSON.stringify(this.data);
    try {
      window.localStorage.setItem(this.key, raw);
    } catch (err) {
      console.warn('[storage] save failed', err);
    }
    return Promise.resolve();
  }

  async reset() {
    this.data = defaultSave();
    try {
      window.localStorage.removeItem(this.key);
    } catch (err) {
      console.warn('[storage] reset failed', err);
    }
  }
}
__exports.defaultSave = defaultSave;
__exports.Storage = Storage;
});
// ---- ui/stage.js ----
__define("ui/stage.js", function (__exports) {
/**
 * The stage: every screen of the game except the map backdrop (which always fills the window).
 *
 *   Phones (portrait) and other tall or square windows: the stage is the game's own phone layout
 *   at 1:1 - as wide as the window, at most 0.8 x its height (a centred column on a desktop
 *   window that is only a little wider than tall, the map fills the sides).
 *   Wide windows (desktop iframes, 16:9 portal frames, phones held sideways): the stage is laid
 *   out at a fixed logical height of WIDE_H px - the board in a centre column, the HUD and the
 *   helpers in side panels (styles/web.css, body.wide) - and scaled uniformly to the window.
 *   At CrazyGames' smallest desktop frame (821 x 462) that is exactly 1:1; at 1920 x 1080 it is
 *   2.34x, with every canvas drawn in screen pixels so nothing turns blurry.
 * CSS size queries are container queries on the stage (@container stage), so the layout rules
 * see the logical size, never the scaled window.
 */
const WIDE_H = 462;
const WIDE_ASPECT = 1.4;

const STAGE = { scale: 1, wide: false, w: 0, h: 0 };

function applyStage() {
  const el = document.getElementById('stage');
  if (!el) return STAGE;
  const W = Math.max(1, window.innerWidth);
  const H = Math.max(1, window.innerHeight);
  const wide = W / H >= WIDE_ASPECT;
  let scale = 1;
  let w = W;
  let h = H;
  let left = 0;
  if (wide) {
    scale = H / WIDE_H;
    w = W / scale;
    h = WIDE_H;
  } else {
    w = Math.min(W, Math.max(360, Math.round(H * 0.8)));
    left = Math.round((W - w) / 2);
  }
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
  el.style.left = `${left}px`;
  el.style.transform = scale !== 1 ? `scale(${scale})` : '';
  document.body.classList.toggle('wide', wide);
  // mouse + keyboard device: the HUD shows the keys (styles/web.css)
  let keys = false;
  try {
    keys = matchMedia('(hover: hover) and (pointer: fine)').matches;
  } catch {
    keys = false;
  }
  document.body.classList.toggle('has-keys', keys);
  document.documentElement.style.setProperty('--stage-scale', String(scale));
  STAGE.scale = scale;
  STAGE.wide = wide;
  STAGE.w = w;
  STAGE.h = h;
  return STAGE;
}
__exports.WIDE_H = WIDE_H;
__exports.STAGE = STAGE;
__exports.applyStage = applyStage;
});
// ---- ui/dom.js ----
__define("ui/dom.js", function (__exports) {
/** Tiny DOM helpers. */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function show(el) {
  if (typeof el === 'string') el = $(el);
  if (!el) return;
  el.classList.remove('hidden');
  fitAll(el);
}

function hide(el) {
  if (typeof el === 'string') el = $(el);
  if (el) el.classList.add('hidden');
}

function setText(sel, text) {
  const el = typeof sel === 'string' ? $(sel) : sel;
  if (el && el.textContent !== String(text)) el.textContent = text;
}

function on(el, event, fn, opts) {
  if (typeof el === 'string') el = $(el);
  if (el) el.addEventListener(event, fn, opts);
  return el;
}

/** Briefly bump an element (score / coin counters). */
function bump(el, cls = 'bump') {
  if (typeof el === 'string') el = $(el);
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

// ---- text fitting ------------------------------------------------------------
/*
 * Five languages, one layout. "Play" is four letters, "Weiterspielen" is thirteen, and a label
 * must never spill out of its button. Anything that has to stay on one line is listed here;
 * when its words do not fit, the letters shrink (never below FIT_MIN of their size) until they do.
 * Groups shrink together, so a row of buttons keeps one type size instead of a ragged mix.
 */
const FIT_GROUPS = '.modal-row, .dialog-actions, .go-stats, .tabs, .menu-dock, .hud-bottom, .round-row, .shop-legal-links, .rail, .pass-actions';
const FIT_SINGLES =
  '.btn, .modal-title, .screen-head h1, .go-newbest, .pause-stats, .menu-best, .shop-card-body, .coin-pill, .next-chip, #go-score, .hammer-hint, .set-value, .stat-label, .live-head-row, .cal-day, .chest-card, .offer-top, .offer-foot, .mini-bar, .chips, .pass-cell, .live-sub, .rw.big';
const FIT_MIN = 0.58;

/** Every element under `el` that holds text of its own (the ones whose font-size we scale). */
function textHolders(el) {
  const out = [];
  const walk = (n) => {
    let direct = false;
    for (const c of n.childNodes) {
      if (c.nodeType === 3) {
        if (c.textContent.trim()) direct = true;
      } else if (c.nodeType === 1 && c.namespaceURI === 'http://www.w3.org/1999/xhtml' && c.tagName !== 'CANVAS') {
        walk(c);
      }
    }
    if (direct) out.push(n);
  };
  walk(el);
  return out;
}

function sticksOut(el) {
  const p = el.parentElement;
  if (!p || getComputedStyle(el).position === 'absolute') return false;
  const r = el.getBoundingClientRect();
  const q = p.getBoundingClientRect();
  const cs = getComputedStyle(p);
  const k = p.offsetWidth ? q.width / p.offsetWidth : 1; // same scale as any entrance animation
  const left = q.left + (parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth)) * k * 0.5;
  const right = q.right - (parseFloat(cs.paddingRight) + parseFloat(cs.borderRightWidth)) * k * 0.5;
  return r.left < left - 1 || r.right > right + 1;
}

/** A button whose icon and words have been pushed onto separate rows by flex-wrap. */
function splitRows(el) {
  if (!el.classList.contains('btn')) return false;
  let band = null;
  for (const c of el.childNodes) {
    let r = null;
    if (c.nodeType === 1 && c.tagName !== 'SMALL') r = c.getBoundingClientRect();
    else if (c.nodeType === 3 && c.textContent.trim()) {
      const rg = document.createRange();
      rg.selectNodeContents(c);
      r = rg.getBoundingClientRect();
    }
    if (!r || !r.width) continue;
    const mid = (r.top + r.bottom) / 2;
    if (!band) band = [r.top, r.bottom];
    else if (mid < band[0] || mid > band[1]) return true;
  }
  return false;
}

/** The box the words of `h` actually occupy (its own text nodes only). */
function textRect(h) {
  let box = null;
  for (const c of h.childNodes) {
    if (c.nodeType !== 3 || !c.textContent.trim()) continue;
    const rg = document.createRange();
    rg.selectNodeContents(c);
    const r = rg.getBoundingClientRect();
    if (!r.width) continue;
    box = box ? { left: Math.min(box.left, r.left), right: Math.max(box.right, r.right) } : { left: r.left, right: r.right };
  }
  return box;
}

const clips = (h) => {
  const cs = getComputedStyle(h);
  return cs.overflowX !== 'visible' || cs.textOverflow === 'ellipsis';
};

/**
 * True when any words inside `el` spill past its edges (or past a clipping box of their own),
 * when a button's icon and words have split onto two rows, or when `el` pokes out of its parent.
 * Badges pinned outside a tile on purpose (position: absolute) are left alone.
 */
function overflowing(el, holders) {
  if (splitRows(el) || sticksOut(el)) return true;
  const r = el.getBoundingClientRect();
  for (const h of holders) {
    if (!el.contains(h)) continue;
    if (h !== el && getComputedStyle(h).position === 'absolute') continue;
    const tr = textRect(h);
    if (!tr) continue;
    if (tr.left < r.left - 1 || tr.right > r.right + 1) return true;
    if (h !== el && clips(h)) {
      const hr = h.getBoundingClientRect();
      if (tr.left < hr.left - 1 || tr.right > hr.right + 1) return true;
    }
  }
  return false;
}

function fitBox(el, members = [el]) {
  const holders = members.flatMap((m) => textHolders(m));
  if (!holders.length) return;
  for (const h of holders) if (h.dataset.fit) h.style.fontSize = '';
  const tooBig = () => members.some((m) => overflowing(m, holders));
  if (!tooBig()) return;
  const base = holders.map((h) => parseFloat(getComputedStyle(h).fontSize));
  const apply = (k) => holders.forEach((h, i) => {
    h.style.fontSize = `${Math.max(9, base[i] * k).toFixed(2)}px`;
    h.dataset.fit = '1';
  });
  let lo = FIT_MIN;
  let hi = 1;
  for (let i = 0; i < 7; i++) {
    const mid = (lo + hi) / 2;
    apply(mid);
    if (tooBig()) hi = mid;
    else lo = mid;
  }
  apply(lo);
}

function visible(el) {
  return !!(el.offsetParent || (el.getClientRects && el.getClientRects().length));
}

/** Fit every one-line label inside `root` (only what is on screen can be measured). */
function fitAll(root = document) {
  if (typeof root === 'string') root = $(root);
  if (!root || typeof root.querySelectorAll !== 'function') return;
  const within = (sel) => {
    const list = Array.from(root.querySelectorAll(sel));
    if (root.matches && root.matches(sel)) list.unshift(root);
    return list.filter(visible);
  };
  const grouped = new Set();
  for (const g of within(FIT_GROUPS)) {
    const kids = Array.from(g.children).filter(visible);
    kids.forEach((k) => grouped.add(k));
    fitBox(g, kids);
  }
  for (const el of within(FIT_SINGLES)) if (!grouped.has(el) && !el.closest('[data-fit-skip]')) fitBox(el);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
__exports.$ = $;
__exports.$$ = $$;
__exports.show = show;
__exports.hide = hide;
__exports.setText = setText;
__exports.on = on;
__exports.bump = bump;
__exports.fitBox = fitBox;
__exports.fitAll = fitAll;
__exports.escapeHtml = escapeHtml;
});
// ---- ui/dialog.js ----
__define("ui/dialog.js", function (__exports) {
/** Generic modal dialog and toast notifications (HTML overlays). */
const { t } = __import("core/i18n.js");
const { fitAll } = __import("ui/dom.js");

let queue = Promise.resolve();

/** A glossy icon medallion (same family as the power-up buttons) for dialogs and toasts. */
function ico(name, tone = 'gold') {
  if (name === 'coin') return '<i class="coin-icon"></i>';
  if (name === 'joker') return `<span class="medal tone-${tone}"><b>∞</b></span>`;
  return `<span class="medal tone-${tone}"><svg class="ic"><use href="#i-${name}"/></svg></span>`;
}

const PLAY = '<svg class="ic"><use href="#i-video"/></svg>';

function root() {
  let el = document.getElementById('dialog');
  if (!el) {
    el = document.createElement('div');
    el.id = 'dialog';
    el.className = 'layer modal hidden';
    document.getElementById('app').appendChild(el);
  }
  return el;
}

/**
 * dialog({ title, html, buttons: [{ label, value, kind: 'primary'|'ghost'|'danger' }], dismissible })
 * Resolves with the value of the pressed button (or undefined when dismissed).
 */
function dialog(opts) {
  const run = () =>
    new Promise((resolve) => {
      const el = root();
      const buttons = opts.buttons || [{ label: t('common.ok'), value: true, kind: 'primary' }];
      el.innerHTML = `
        <div class="modal-card dialog-card${opts.cls ? ` ${opts.cls}` : ''}" role="dialog" aria-modal="true">
          ${opts.dismissible ? `<button class="icon-btn round dialog-x" data-x aria-label="${t('common.close')}"><svg class="ic"><use href="#i-close"/></svg></button>` : ''}
          ${opts.icon ? `<div class="dialog-icon">${opts.icon}</div>` : ''}
          ${opts.title ? `<h2 class="dialog-title">${opts.title}</h2>` : ''}
          <div class="dialog-body">${opts.html || (opts.text ? `<p>${opts.text}</p>` : '')}</div>
          <div class="dialog-actions">
            ${buttons.map((b, i) => `<button class="btn ${b.kind || 'ghost'}" data-i="${i}">${b.icon ? `<span class="btn-icon">${b.icon === '▶' ? PLAY : b.icon}</span>` : ''}${b.label}</button>`).join('')}
          </div>
        </div>`;
      el.classList.remove('hidden');
      fitAll(el);
      requestAnimationFrame(() => el.classList.add('open'));
      const close = (value) => {
        el.classList.remove('open');
        setTimeout(() => {
          el.classList.add('hidden');
          el.innerHTML = '';
        }, 180);
        resolve(value);
      };
      el.querySelectorAll('button[data-i]').forEach((btn) => {
        btn.addEventListener('click', () => close(buttons[Number(btn.dataset.i)].value));
      });
      if (opts.dismissible) {
        const x = el.querySelector('[data-x]');
        if (x) x.addEventListener('click', () => close(undefined));
        el.addEventListener(
          'click',
          (e) => {
            if (e.target === el) close(undefined);
          },
          { once: true }
        );
      }
    });
  const p = queue.then(run, run);
  queue = p.catch(() => {});
  return p;
}

function confirmDialog(title, html, okLabel = t('common.ok'), cancelLabel = t('common.cancel')) {
  return dialog({
    title,
    html,
    buttons: [
      { label: cancelLabel, value: false, kind: 'ghost' },
      { label: okLabel, value: true, kind: 'primary' },
    ],
  });
}

let toastTimer = null;
function toast(message, opts = {}) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.getElementById('app').appendChild(el);
  }
  el.innerHTML = `${opts.icon ? `<span class="toast-icon">${opts.icon}</span>` : ''}<span>${message}</span>`;
  el.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), opts.duration || 2200);
}
__exports.ico = ico;
__exports.dialog = dialog;
__exports.confirmDialog = confirmDialog;
__exports.toast = toast;
});
// ---- ui/hud.js ----
__define("ui/hud.js", function (__exports) {
const { ECONOMY } = __import("config.js");
const { formatCoins, formatNumber, tileLabel } = __import("core/utils.js");
const { drawTile } = __import("render/tileSkins.js");
const { $, $$, bump, fitAll, hide, setText, show } = __import("ui/dom.js");
const { dialog, ico, toast } = __import("ui/dialog.js");
const { Audio } = __import("services/audio.js");
const { coins, t } = __import("core/i18n.js");
const { STAGE } = __import("ui/stage.js");

const MEDAL = { hammer: 'hammer', joker: 'joker', undo: 'undo' };
const TONE = { hammer: 'orange', joker: 'rainbow', undo: 'blue' };

/** In-game overlay: score, best, coins, next block preview and power-up buttons. */
class HUD {
  constructor(app) {
    this.app = app;
    this.game = app.game;
    this.economy = app.economy;
    this.el = $('#hud');
    this.nextCanvas = $('#hud-next');
    this.powerButtons = $$('.power-btn');
    this.visible = false;
  }

  init() {
    const { game, economy } = this;
    game.on('score', (score, delta) => {
      this.countTo(score);
      if (delta > 0) bump('#hud-score');
      if (score > this.app.storage.data.best) setText('#hud-best', formatNumber(score));
    });
    game.on('next', () => this.updateNext());
    game.on('state', () => this.updatePowerups());
    game.on('turn', () => this.updatePowerups());
    game.on('hammer', (on) => {
      this.powerButtons.forEach((b) => b.classList.toggle('active', on && b.dataset.power === 'hammer'));
      if (on) show('#hammer-hint');
      else hide('#hammer-hint');
      this.updatePowerups();
    });
    game.on('insufficient', (id) => this.offerCoinsForPowerup(id));
    game.on('needad', (id) => this.offerAdForPowerup(id));
    game.on('exhausted', (id) => this.toastExhausted(id));
    game.on('poweruses', () => this.updatePowerups());
    game.on('milestone', ({ exp, bonus }) => toast(`${t('toast.newBlock', { block: tileLabel(exp) })} &nbsp;<b>+${formatNumber(bonus)}</b>`, { icon: ico('coin') }));
    game.on('retire', ({ exp }) => toast(t('toast.retired', { block: tileLabel(exp) }), { icon: ico('sparkle', 'purple') }));
    economy.on('coins', (balance, delta) => {
      setText('#hud-coins-value', formatCoins(balance));
      this.fitScore();
      if (delta > 0) bump('#hud-coins');
      this.updatePowerups();
    });
    this.app.ads.on('change', () => this.updatePowerups());
    this.app.progress.on('change', () => {
      if (this.visible) this.updatePowerups();
    });

    $('#btn-pause').addEventListener('click', () => {
      Audio.click();
      this.app.pause();
    });
    $('#hud-coins').addEventListener('click', () => {
      Audio.click();
      this.app.openShop(this.app.ads.rewardedOffered() ? 'coins' : 'skins');
    });
    $('#hammer-cancel').addEventListener('click', () => {
      Audio.click();
      game.cancelHammer();
    });
    for (const btn of this.powerButtons) {
      btn.addEventListener('click', () => {
        this.app.playerInput();
        this.onPowerup(btn.dataset.power);
      });
    }
    for (const [id, p] of Object.entries(ECONOMY.powerups)) {
      const el = $(`[data-cost="${id}"]`);
      if (el) el.textContent = formatNumber(p.price);
    }
  }

  show() {
    this.visible = true;
    show(this.el);
    this.refresh();
  }

  hide() {
    this.visible = false;
    hide(this.el);
  }

  /**
   * The score sits dead centre between the pause button and the coin pill. When a long score
   * (or a wide coin balance) leaves it too little room, the digits shrink instead of colliding.
   */
  fitScore(force) {
    const el = $('#hud-score');
    const block = el && el.parentElement;
    const top = block && block.parentElement;
    if (!top || !this.visible) return;
    const key = `${el.textContent.length}|${$('#hud-coins-value').textContent.length}|${$('#hud-best').textContent.length}|${top.clientWidth}|${STAGE.wide}`;
    if (!force && key === this.fitKey) return;
    this.fitKey = key;
    el.style.fontSize = '';
    const best = block.querySelector('.score-best');
    if (best) best.style.fontSize = '';
    top.classList.remove('tight');
    if (STAGE.wide) {
      // wide layout: the score has its side panel to itself (styles/web.css)
      const room = top.clientWidth - 28;
      const need = el.scrollWidth;
      if (need > room && room > 0) {
        const size = parseFloat(getComputedStyle(el).fontSize);
        el.style.fontSize = `${Math.max(14, size * (room / need) * 0.97).toFixed(1)}px`;
      }
      return;
    }
    const cs = getComputedStyle(top);
    const inner = top.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const left = top.children[0].offsetWidth;
    const right = top.children[2].offsetWidth;
    const need = Math.max(el.scrollWidth, best ? best.scrollWidth : 0);
    // centred on the screen when there is room for it...
    if (need <= inner - Math.max(left, right) * 2 - 16) return;
    // ...otherwise centred in the space the buttons leave, and smaller only if it must be
    top.classList.add('tight');
    const room = inner - left - right - 20;
    if (need <= room || room <= 0) return;
    const size = parseFloat(getComputedStyle(el).fontSize);
    let k = Math.max(0.26, (room / need) * 0.96);
    el.style.fontSize = `${(size * k).toFixed(1)}px`;
    // one more pass: outlines and letter-spacing do not scale exactly with the type
    if (el.scrollWidth > room && k > 0.26) {
      k = Math.max(0.26, k * (room / el.scrollWidth) * 0.98);
      el.style.fontSize = `${(size * k).toFixed(1)}px`;
    }
    if (best && best.scrollWidth > room) {
      best.style.fontSize = `${Math.max(9, parseFloat(getComputedStyle(best).fontSize) * Math.max(0.7, room / best.scrollWidth)).toFixed(1)}px`;
    }
  }

  /** The score rolls up to its new value instead of jumping. */
  countTo(target) {
    const from = this.shownScore ?? target;
    this.scoreTarget = target;
    if (from === target || !(target > from)) {
      this.shownScore = target;
      setText('#hud-score', formatNumber(target));
      this.fitScore();
      return;
    }
    const start = performance.now();
    const dur = Math.min(700, 280 + (target - from) * 0.6);
    const tick = () => {
      if (this.scoreTarget !== target) return;
      const t = Math.min(1, (performance.now() - start) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      this.shownScore = Math.round(from + (target - from) * e);
      setText('#hud-score', formatNumber(this.shownScore));
      this.fitScore();
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  refresh() {
    this.scoreTarget = this.game.score;
    this.shownScore = this.game.score;
    setText('#hud-score', formatNumber(this.game.score));
    setText('#hud-best', formatNumber(Math.max(this.app.storage.data.best, this.game.score)));
    setText('#hud-coins-value', formatCoins(this.economy.coins));
    this.updateNext();
    this.updatePowerups(true);
    fitAll('.hud-top');
    this.fitScore(true);
  }

  updateNext() {
    const canvas = this.nextCanvas;
    const next = this.game.next;
    const ctx = canvas.getContext('2d');
    // pixels of the canvas as it is shown (the stage may be scaled up on big screens)
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * STAGE.scale;
    const size = 30;
    const px = Math.round(size * dpr);
    if (canvas.width !== px) {
      canvas.width = px;
      canvas.height = px;
    }
    ctx.setTransform(px / size, 0, 0, px / size, 0, 0);
    ctx.clearRect(0, 0, size, size);
    if (!next) return;
    drawTile(ctx, this.app.renderer.skin, 2, 2, size - 4, {
      exp: next.exp,
      joker: next.joker,
      label: next.joker ? '∞' : tileLabel(next.exp),
      time: performance.now(),
      ratio: px / size,
    });
  }

  updatePowerups(force) {
    const { game, economy } = this;
    // mid-turn every helper is briefly unavailable; greying them out on each drop would
    // make the whole bar flicker, so keep the last settled look until the turn ends
    if (game.state === 'dropping' || game.state === 'resolving') return;
    const can = {
      hammer: game.canUseHammer() || game.hammerMode,
      joker: game.canUseJoker(),
      undo: game.canUndo(),
    };
    const adReady = this.app.ads.isRewardedAvailable();
    const inv = this.app.progress.items();
    const max = ECONOMY.powerupUsesPerGame;
    for (const btn of this.powerButtons) {
      const id = btn.dataset.power;
      const price = ECONOMY.powerups[id].price;
      const mode = game.powerMode(id);
      const left = game.powerUsesLeft(id);
      const owned = inv[id] || 0;
      // what pays for the next use: a helper the player owns, a video or coins
      const pay = mode === 'none' ? 'none' : owned > 0 ? 'own' : mode === 'ad' ? 'ad' : 'coins';
      const ready = pay === 'none' ? false : pay === 'own' ? can[id] : pay === 'ad' ? can[id] && adReady : can[id] && economy.canAfford(price);
      btn.classList.toggle('disabled', !ready);
      btn.classList.toggle('spent', mode === 'none');
      const badge = btn.querySelector('.power-own');
      if (badge) {
        badge.textContent = owned > 99 ? '99+' : String(owned);
        badge.classList.toggle('hidden', !(owned > 0));
      }
      const cost = btn.querySelector('.power-cost');
      cost.classList.toggle('ad', pay === 'ad');
      cost.classList.toggle('own', pay === 'own');
      cost.classList.toggle('spent', mode === 'none');
      if (pay === 'none') cost.innerHTML = `<span>${t('power.usedUp')}</span>`;
      else if (pay === 'own') cost.innerHTML = `<svg class="ic"><use href="#i-check"/></svg><span>${t('power.use')}</span>`;
      else if (pay === 'ad') cost.innerHTML = `<svg class="ic"><use href="#i-video"/></svg><span>${t('power.free')}</span>`;
      else cost.innerHTML = `<i class="coin-icon small"></i><span>${formatNumber(price)}</span>`;
      const uses = btn.querySelector('.power-uses');
      if (uses) uses.textContent = t('power.left', { left, max });
    }
    // refit only when the words changed, not on every turn
    const words = this.powerButtons.map((b) => b.textContent).join('|');
    if (force || words !== this.powerWords) {
      this.powerWords = words;
      fitAll('.hud-bottom');
    }
  }

  toastExhausted(id) {
    toast(t('power.exhausted', { power: t(`power.${id}`) }), { icon: ico(MEDAL[id], 'grey') });
  }

  async onPowerup(id) {
    const { game, economy } = this;
    Audio.click();
    if (id === 'hammer' && game.hammerMode) {
      game.cancelHammer();
      return;
    }
    const mode = game.powerMode(id);
    if (mode === 'none') {
      this.toastExhausted(id);
      return;
    }
    const can = id === 'hammer' ? game.canUseHammer() : id === 'joker' ? game.canUseJoker() : game.canUndo();
    if (!can) {
      const why = id === 'undo' ? t('power.noUndo') : id === 'joker' ? t('power.alreadyJoker') : t('power.wait');
      toast(why);
      return;
    }
    // a helper the player owns (from chests, the pass, missions, the store) is used first
    if (this.app.progress.has(id)) {
      this.usePowerup(id, true, true);
      return;
    }
    // an ad watched for a hammer that was then cancelled still counts
    if (id === 'hammer' && game.hammerAdCredit) {
      this.usePowerup(id, true);
      return;
    }
    // first use of each helper this game is unlocked by a rewarded ad (coins when no videos)
    if (mode === 'ad') {
      this.offerAdForPowerup(id);
      return;
    }
    if (economy.canAfford(ECONOMY.powerups[id].price)) {
      this.usePowerup(id, false);
      return;
    }
    this.offerCoinsForPowerup(id);
  }

  /** `token`: paid with a helper the player owns (taken only once the helper has really run). */
  usePowerup(id, prepaid, token = false) {
    const { game } = this;
    if (id === 'hammer') {
      if (game.enterHammer({ prepaid, token })) toast(t('power.tapBlock'), { icon: ico('hammer', 'orange') });
    } else if (id === 'joker') {
      if (game.useJoker({ prepaid }) && token) this.app.progress.take('joker');
    } else if (id === 'undo') {
      if (game.useUndo({ prepaid }) && token) this.app.progress.take('undo');
    }
    this.updatePowerups();
  }

  /** First use of a helper each game: rewarded ad only. */
  async offerAdForPowerup(id) {
    const p = ECONOMY.powerups[id];
    if (!this.app.ads.isRewardedAvailable()) {
      this.app.ads.refresh();   // and ask for one, so the next tap may find it
      toast(t('power.noVideo'), { icon: ico(MEDAL[id], TONE[id]) });
      return;
    }
    const later = ECONOMY.powerupUsesPerGame - ECONOMY.powerupAdUses;
    const power = t(`power.${id}`);
    const answer = await dialog({
      icon: ico(MEDAL[id], TONE[id]),
      title: t('power.freeTitle', { power }),
      html: `<p>${t('power.freeBody', { power })}</p><p class="dialog-sub">${t('power.freeAfter', { n: later, coins: coins(p.price) })}</p>`,
      // "no thanks" looks exactly like the video button: same size, font and colour (portal rule)
      buttons: [
        { label: t('common.cancel'), value: 'cancel', kind: 'reward' },
        { label: t('power.watchFree'), value: 'ad', kind: 'reward', icon: '▶' },
      ],
    });
    if (answer !== 'ad') return;
    const res = await this.app.ads.showRewarded(`powerup:${id}`);
    if (res.rewarded) this.usePowerup(id, true);
    else if (res.error === 'unavailable') toast(t('power.noVideoShort'));   // closed early / busy: nothing to say
  }

  /**
   * Later uses cost coins. When the player is short: a video for this one use (a few a day),
   * when the portal offers videos; otherwise just keep playing - every merge earns coins.
   */
  async offerCoinsForPowerup(id) {
    const { app } = this;
    const p = ECONOMY.powerups[id];
    const left = this.game.powerUsesLeft(id);
    const power = t(`power.${id}`);
    const video = app.ads.rewardedOffered() && app.progress.capLeft('helper') > 0;
    if (!video) {
      await dialog({
        icon: ico('coin'),
        title: t('power.notEnough'),
        html: `<p>${t('power.costs', { power, coins: coins(p.price) })}</p><p class="dialog-sub">${t('power.keepPlaying')}</p>`,
        buttons: [{ label: t('common.ok'), value: 'ok', kind: 'primary' }],
      });
      return;
    }
    // "no thanks" looks exactly like the video button: same size, font and colour (portal rule)
    const buttons = [
      { label: t('common.cancel'), value: 'cancel', kind: 'reward' },
      { label: t('power.watchOne', { power }), value: 'ad', kind: 'reward', icon: '▶' },
    ];
    const answer = await dialog({
      icon: ico('coin'),
      title: t('power.notEnough'),
      html: `<p>${t('power.costs', { power, coins: coins(p.price) })}</p><p class="dialog-sub">${t('power.usesLeft', { n: left })}</p>`,
      buttons,
    });
    if (answer === 'ad') {
      const res = await app.ads.showRewarded(`powerup:${id}:coins`);
      if (res.rewarded) {
        app.progress.useCap('helper');
        this.usePowerup(id, true);
      } else if (res.error === 'unavailable') toast(t('power.noVideoShort'));
    }
  }
}
__exports.HUD = HUD;
});
// ---- ui/screens.js ----
__define("ui/screens.js", function (__exports) {
const { ECONOMY } = __import("config.js");
const { Ease, formatCoins, formatNumber, tileLabel } = __import("core/utils.js");
const { drawTile } = __import("render/tileSkins.js");
const { REDUCED_MOTION } = __import("render/ambient.js");
const { $, fitAll, hide, setText, show } = __import("ui/dom.js");
const { confirmDialog, dialog, ico, toast } = __import("ui/dialog.js");
const { Audio } = __import("services/audio.js");
const { Haptics } = __import("services/haptics.js");
const { LANGS, lang, setLanguage, t } = __import("core/i18n.js");

/**
 * The block family on the title screen. They hop on their own rhythms, squash when
 * they land, watch your finger, and the big one giggles when you poke it.
 * Everything is derived from the clock, so there is no state to drift or leak.
 */
class MenuHero {
  constructor(app, canvas) {
    this.app = app;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.running = false;
    this.look = null;
    this.tapAt = -1e9;
    this.cw = 0;
    this.ch = 0;
    canvas.addEventListener('pointerdown', () => this.tap());
    // drawn in screen pixels (the stage may be scaled), so the pointer needs no conversion
    window.addEventListener(
      'pointermove',
      (e) => {
        if (!this.running) return;
        const r = canvas.getBoundingClientRect();
        this.look = { x: e.clientX - r.left, y: e.clientY - r.top, until: performance.now() + 2600 };
      },
      { passive: true }
    );
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = (t) => {
      if (!this.running) return;
      this.draw(t);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
  }

  tap() {
    const now = performance.now();
    if (now - this.tapAt < 700) return;
    this.tapAt = now;
    Audio.merge(2, 3);
    Haptics.impact('light');
  }

  fit() {
    // screen pixels, not layout pixels: on a scaled stage the hero stays sharp
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    if (!w || !h) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (w !== this.cw || h !== this.ch || this.canvas.width !== Math.round(w * dpr)) {
      this.cw = w;
      this.ch = h;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  /** Pose of a block at `local` ms into its hop: lift, squash/stretch and face. */
  hop(local, height, happy) {
    if (local < 130) {
      const k = Ease.outQuad(local / 130);
      return { y: 0, sx: 1 + 0.1 * k, sy: 1 - 0.14 * k, face: happy ? 'merge' : 'idle' };
    }
    if (local < 600) {
      const k = (local - 130) / 470;
      const e = Math.abs(2 * k - 1);
      return { y: -height * 4 * k * (1 - k), sx: 1 - 0.07 * e, sy: 1 + 0.11 * e, face: happy ? 'merge' : 'fall' };
    }
    const k = Math.min(1, (local - 600) / 480);
    const s = 1 - Ease.outSpring(k);
    return { y: 0, sx: 1 + 0.17 * s, sy: 1 - 0.22 * s, face: happy ? 'merge' : k < 0.45 ? 'land' : 'idle', land: local - 600 };
  }

  draw(t) {
    if (!this.fit()) return;
    const ctx = this.ctx;
    const W = this.cw;
    const H = this.ch;
    ctx.clearRect(0, 0, W, H);
    const skin = this.app.renderer.skin;
    const ground = H - 12;
    const big = Math.min(H * 0.5, W * 0.25);
    const mid = big * 0.66;
    const small = big * 0.46;
    const cast = [
      { exp: 5, s: small, x: W / 2 - W * 0.44, period: 4100, off: 2300, id: 11 },
      { exp: 2, s: mid, x: W / 2 - W * 0.29, period: 3600, off: 900, id: 12 },
      { exp: 3, s: mid, x: W / 2 + W * 0.29, period: 3900, off: 2900, id: 13 },
      { exp: 7, s: small, x: W / 2 + W * 0.44, period: 4400, off: 400, id: 14 },
      { exp: 1, s: big, x: W / 2, period: 3200, off: 0, id: 15, hero: true },
    ];
    const lookAt = this.look && this.look.until > t ? this.look : null;
    const heroTap = t - this.tapAt;
    for (const b of cast) {
      let pose;
      if (b.hero && heroTap < 1300) pose = this.hop(heroTap, big * 0.62, true);
      else if (REDUCED_MOTION) pose = { y: 0, sx: 1, sy: 1, face: 'idle' };
      else {
        const local = (t + b.off) % b.period;
        pose = local < 1100 ? this.hop(local, b.s * 0.5, false) : { y: 0, sx: 1, sy: 1, face: 'idle' };
        if (pose.face === 'idle') {
          const br = Math.sin(t / 1400 + b.id) * 0.016;
          pose.sy = 1 + br;
          pose.sx = 1 - br * 0.6;
        }
      }
      if (b.hero && heroTap < 2200 && pose.face === 'idle') pose.face = 'merge';
      b.pose = pose;
      // soft contact shadow that shrinks as the block leaves the ground
      const lift = Math.min(1, -pose.y / (b.s * 0.6));
      ctx.save();
      ctx.globalAlpha = 0.22 * (1 - lift * 0.6);
      ctx.fillStyle = '#3a0a1e';
      ctx.beginPath();
      ctx.ellipse(b.x, ground + 2, b.s * 0.5 * (1 - lift * 0.35), b.s * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    const hero = cast[cast.length - 1];
    for (const b of cast) {
      const p = b.pose;
      const x = b.x - b.s / 2;
      const y = ground - b.s + p.y;
      ctx.save();
      ctx.translate(b.x, ground + p.y);
      ctx.scale(p.sx, p.sy);
      ctx.translate(-b.x, -(ground + p.y));
      // the family watches your finger, or else the big one
      const look = lookAt || (b.hero ? { x: W / 2, y: H * 2 } : { x: hero.x, y: ground - hero.s * 0.6 + hero.pose.y });
      drawTile(ctx, skin, x, y, b.s, { exp: b.exp, joker: false, label: tileLabel(b.exp), time: t, face: p.face, id: b.id, look });
      ctx.restore();
      // a puff of dust when it lands
      if (p.land != null && p.land < 380) {
        const k = p.land / 380;
        ctx.save();
        ctx.globalAlpha = 0.6 * (1 - k);
        ctx.fillStyle = '#ffffff';
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(b.x + side * b.s * (0.45 + k * 0.35), ground - 2 - k * 6, b.s * (0.06 + k * 0.08), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }
    // glints around the big one after a poke
    if (heroTap < 1100) {
      const k = heroTap / 1100;
      ctx.save();
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.4;
        const r = hero.s * (0.55 + k * 0.5);
        const sx = hero.x + Math.cos(a) * r;
        const sy = ground - hero.s * 0.5 + hero.pose.y + Math.sin(a) * r * 0.8;
        const R = hero.s * 0.07 * Math.sin(k * Math.PI);
        ctx.globalAlpha = Math.sin(k * Math.PI);
        ctx.beginPath();
        ctx.moveTo(sx, sy - R * 1.6);
        ctx.quadraticCurveTo(sx, sy, sx + R * 1.6, sy);
        ctx.quadraticCurveTo(sx, sy, sx, sy + R * 1.6);
        ctx.quadraticCurveTo(sx, sy, sx - R * 1.6, sy);
        ctx.quadraticCurveTo(sx, sy, sx, sy - R * 1.6);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

/** Main menu, pause and game-over screens. */
class Screens {
  constructor(app) {
    this.app = app;
    this.summary = null;
    this.hero = null;
  }

  init() {
    const { app } = this;
    const heroCanvas = $('#menu-hero');
    if (heroCanvas) this.hero = new MenuHero(app, heroCanvas);
    // ---- menu
    $('#btn-play').addEventListener('click', async () => {
      Audio.click();
      if (app.game.hasSavedGame()) {
        const ok = await confirmDialog(t('newGame.title'), `<p>${t('newGame.body')}</p>`, t('common.newGame'), t('newGame.keep'));
        if (!ok) return;
        await app.leaveGame('new'); // the saved game is given up: it ends here
        return;
      }
      app.playFromMenu(false);
    });
    $('#btn-continue').addEventListener('click', () => {
      Audio.click();
      app.playFromMenu(true);
    });
    $('#btn-shop').addEventListener('click', () => {
      Audio.click();
      app.openShop('skins');
    });
    $('#btn-settings').addEventListener('click', () => {
      Audio.click();
      app.openSettings();
    });
    $('#btn-menu-ad').addEventListener('click', () => this.watchAdForCoins('menu'));
    $('#menu-coins-btn').addEventListener('click', () => {
      Audio.click();
      app.openShop(app.ads.rewardedOffered() ? 'coins' : 'skins');
    });

    // ---- pause
    $('#pause-resume').addEventListener('click', () => {
      Audio.click();
      app.resume();
    });
    $('#pause-restart').addEventListener('click', async () => {
      Audio.click();
      const ok = await confirmDialog(t('restart.title'), `<p>${t('restart.body')}</p>`, t('common.restart'), t('common.cancel'));
      if (!ok) return;
      this.hidePause();
      await app.leaveGame('new');
    });
    $('#pause-home').addEventListener('click', () => {
      Audio.click();
      this.hidePause();
      app.goHome();
    });
    $('#pause-shop').addEventListener('click', () => {
      Audio.click();
      app.openShop('skins');
    });
    $('#pause-settings').addEventListener('click', () => {
      Audio.click();
      app.openSettings();
    });
    $('#pause-sound').addEventListener('click', () => {
      app.setSetting('sound', !app.storage.data.settings.sound);
      this.refreshPause();
    });
    $('#pause-music').addEventListener('click', () => {
      app.setSetting('music', !(app.storage.data.settings.music !== false));
      this.refreshPause();
    });
    $('#pause-haptics').addEventListener('click', () => {
      app.setSetting('haptics', !app.storage.data.settings.haptics);
      this.refreshPause();
    });

    // ---- game over
    $('#go-continue').addEventListener('click', () => this.continueWithAd());
    $('#go-double').addEventListener('click', () => this.doubleCoins());
    $('#go-restart').addEventListener('click', () => {
      Audio.click();
      this.hideGameOver();
      app.leaveGame('new');
    });
    $('#go-home').addEventListener('click', () => {
      Audio.click();
      this.hideGameOver();
      app.leaveGame('home');
    });
  }

  // ---------------------------------------------------------------------------
  refreshMenu() {
    const { app } = this;
    const d = app.storage.data;
    setText('#menu-best', formatNumber(d.best));
    setText('#menu-coins', formatCoins(d.coins));
    setText('#menu-top', d.stats.highestExp ? tileLabel(d.stats.highestExp) : '-');
    $('#menu-best-wrap').classList.toggle('hidden', !(d.best > 0));
    const hasSave = app.game.hasSavedGame();
    if (hasSave) show('#btn-continue');
    else hide('#btn-continue');
    const play = $('#btn-play');
    play.querySelector('.btn-label').textContent = hasSave ? t('common.newGame') : t('common.play');
    play.classList.toggle('play', !hasSave);
    play.classList.toggle('secondary', hasSave);
    // the side rails, the dock's red dots and the Coins video
    if (app.live) app.live.refreshMenu();
    fitAll('#screen-menu');
  }

  rewardCoinsCooldownLeft() {
    const last = this.app.storage.data.ads.lastRewardCoinsAt || 0;
    return Math.max(0, ECONOMY.rewardedCoinsCooldownSec - (Date.now() - last) / 1000);
  }

  async watchAdForCoins(placement) {
    const { app } = this;
    Audio.click();
    if (this.rewardCoinsCooldownLeft() > 0) {
      toast(t('toast.nextCoins', { n: Math.ceil(this.rewardCoinsCooldownLeft() / 60) }), { icon: ico('video', 'green') });
      return false;
    }
    if (!app.ads.rewardedOffered()) return false;
    if (app.progress.capLeft('coins') <= 0) {
      toast(t('ad.capReached'), { icon: ico('video', 'green') });
      return false;
    }
    const res = await app.ads.showRewarded(`coins:${placement}`);
    if (res.rewarded) {
      app.progress.useCap('coins');
      app.storage.data.ads.lastRewardCoinsAt = Date.now();
      app.economy.earn(ECONOMY.rewardedCoins, 'rewarded');
      Audio.coin();
      Haptics.notification('success');
      toast(t('fmt.plusCoins', { n: ECONOMY.rewardedCoins }), { icon: ico('coin') });
      this.refreshMenu();
      return true;
    }
    // no video to show: say so, the button stays; closed early or a second tap: nothing to say
    if (res.error === 'unavailable') toast(t('power.noVideo'));
    return false;
  }

  showMenu() {
    this.refreshMenu();
    show('#screen-menu');
    document.body.classList.add('in-menu');
    if (this.hero) this.hero.start();
  }

  hideMenu() {
    hide('#screen-menu');
    document.body.classList.remove('in-menu');
    if (this.hero) this.hero.stop();
  }

  // ---------------------------------------------------------------------------
  refreshPause() {
    const s = this.app.storage.data.settings;
    $('#pause-haptics').classList.toggle('hidden', !Haptics.supported);
    setText('#pause-score', formatNumber(this.app.game.score));
    setText('#pause-best', formatNumber(this.app.storage.data.best));
    $('#pause-sound').classList.toggle('on', !!s.sound);
    $('#pause-haptics').classList.toggle('on', !!s.haptics);
    $('#pause-music').classList.toggle('on', s.music !== false);
  }

  showPause() {
    this.refreshPause();
    show('#screen-pause');
  }

  hidePause() {
    hide('#screen-pause');
  }

  // ---------------------------------------------------------------------------
  showGameOver(summary) {
    const { app } = this;
    this.summary = summary;
    this.doubled = false;
    setText('#go-title', summary.isNewBest ? t('go.record') : t('go.title'));
    if (summary.isNewBest) show('#go-newbest');
    else hide('#go-newbest');
    setText('#go-score', formatNumber(summary.score));
    setText('#go-best', formatNumber(summary.best));
    setText('#go-coins', `+${formatNumber(summary.coins)}`);
    setText('#go-chain', `x${Math.max(1, summary.chain)}`);
    /* The video offers (Continue, Double coins) are shown only while the portal offers rewarded
       videos; without them the results keep their own way on: Play again and Home. */
    const cont = $('#go-continue');
    const videos = app.ads.rewardedOffered();
    if (summary.canContinue && videos) show(cont);
    else hide(cont);
    cont.querySelector('small').textContent = t('go.continueSub');
    const dbl = $('#go-double');
    if (ECONOMY.doubleCoinsAtGameOver && summary.coins > 0 && videos) {
      show(dbl);
      dbl.disabled = false;
      setText('#go-double-amount', t('go.doubleMore', { n: summary.coins }));
    } else hide(dbl);
    show('#screen-gameover');
  }

  hideGameOver() {
    hide('#screen-gameover');
  }

  async continueWithAd() {
    const { app } = this;
    Audio.click();
    if (!app.ads.rewardedOffered()) return;
    const res = await app.ads.showRewarded('continue');
    if (!res.rewarded) {
      if (res.error === 'unavailable') toast(t('power.noVideoShort'));
      return;
    }
    this.hideGameOver();
    app.hud.show();
    await app.game.continueGame({ prepaid: true });
    toast(t('toast.rowsCleared'), { icon: ico('sparkle', 'green') });
  }

  async doubleCoins() {
    const { app } = this;
    Audio.click();
    if (this.doubled || !this.summary) return;
    const res = await app.ads.showRewarded('double');
    if (!res.rewarded) {
      if (res.error === 'unavailable') toast(t('power.noVideoShort'));
      return;
    }
    this.doubled = true;
    app.economy.earn(this.summary.coins, 'double');
    Audio.coin();
    Haptics.notification('success');
    setText('#go-coins', `+${formatNumber(this.summary.coins * 2)}`);
    const dbl = $('#go-double');
    dbl.disabled = true;
    setText('#go-double-amount', t('go.doubled'));
    fitAll('#screen-gameover');
    toast(t('fmt.plusCoins', { n: this.summary.coins }), { icon: ico('coin') });
  }
}

/** Settings screen. */
class SettingsScreen {
  constructor(app) {
    this.app = app;
  }

  init() {
    const { app } = this;
    $('#settings-close').addEventListener('click', () => {
      Audio.click();
      app.closeSettings();
    });
    const bindSwitch = (id, key) => {
      $(id).addEventListener('click', () => {
        app.setSetting(key, !app.storage.data.settings[key]);
        Audio.click();
        this.refresh();
      });
    };
    bindSwitch('#set-sound', 'sound');
    bindSwitch('#set-haptics', 'haptics');
    $('#set-music').addEventListener('click', () => {
      app.setSetting('music', !(app.storage.data.settings.music !== false));
      Audio.click();
      this.refresh();
    });
    bindSwitch('#set-hints', 'hints');
    $('#set-language').addEventListener('click', () => this.pickLanguage());
    $('#set-reset').addEventListener('click', async () => {
      Audio.click();
      const ok = await dialog({
        icon: ico('restart', 'red'),
        title: t('reset.title'),
        html: `<p>${t('reset.body')}</p>`,
        buttons: [
          { label: t('common.cancel'), value: false, kind: 'secondary' },
          { label: t('reset.confirm'), value: true, kind: 'danger' },
        ],
      });
      if (!ok) return;
      await app.resetAll();
    });
  }

  /** Five languages, each written in its own name so anyone can find theirs. */
  async pickLanguage() {
    Audio.click();
    const cur = lang();
    const id = await dialog({
      icon: ico('globe', 'blue'),
      title: t('settings.language'),
      cls: 'lang-dialog',
      dismissible: true,
      buttons: LANGS.map((l) => ({
        label: `<span class="lang-badge" aria-hidden="true">${l.badge}</span><span class="lang-name" lang="${l.id}">${l.name}</span>${l.id === cur ? '<svg class="ic lang-check"><use href="#i-check"/></svg>' : ''}`,
        value: l.id,
        kind: l.id === cur ? 'lang current' : 'lang',
      })),
    });
    if (!id || id === cur) return;
    this.app.setLanguage(id);
  }

  refresh() {
    const s = this.app.storage.data.settings;
    $('#set-sound .switch').dataset.on = String(!!s.sound);
    $('#set-haptics .switch').dataset.on = String(!!s.haptics);
    $('#set-music .switch').dataset.on = String(s.music !== false);
    $('#set-hints .switch').dataset.on = String(!!s.hints);
    $('#set-haptics').classList.toggle('hidden', !Haptics.supported);
    const st = this.app.storage.data.stats;
    $('#settings-stats').innerHTML = `
      <div><span class="stat-label">${t('stats.games')}</span><b>${formatNumber(st.games)}</b></div>
      <div><span class="stat-label">${t('stats.merges')}</span><b>${formatNumber(st.merges)}</b></div>
      <div><span class="stat-label">${t('stats.bestChain')}</span><b>x${st.bestChain || 0}</b></div>
      <div><span class="stat-label">${t('stats.topBlock')}</span><b>${st.highestExp ? tileLabel(st.highestExp) : '-'}</b></div>
      <div><span class="stat-label">${t('stats.bestScore')}</span><b>${formatNumber(this.app.storage.data.best)}</b></div>
      <div><span class="stat-label">${t('stats.allTime')}</span><b>${formatNumber(st.totalScore)}</b></div>`;
    const cur = LANGS.find((l) => l.id === lang()) || LANGS[0];
    setText('#set-language-value', cur.name);
    fitAll('#screen-settings');
  }

  show() {
    this.refresh();
    show('#screen-settings');
  }

  hide() {
    hide('#screen-settings');
  }
}
__exports.Screens = Screens;
__exports.SettingsScreen = SettingsScreen;
});
// ---- ui/shop.js ----
__define("ui/shop.js", function (__exports) {
const { ECONOMY } = __import("config.js");
const { Ease, formatCoins, formatNumber, rgba, roundRectPath, shade, tileLabel } = __import("core/utils.js");
const { REDUCED_MOTION } = __import("render/ambient.js");
const { SKINS, drawTile, getSkin } = __import("render/tileSkins.js");
const { THEMES, getTheme } = __import("render/themes.js");
const { $, $$, escapeHtml, fitAll, hide, setText, show } = __import("ui/dom.js");
const { dialog, ico, toast } = __import("ui/dialog.js");
const { Audio } = __import("services/audio.js");
const { Haptics } = __import("services/haptics.js");
const { coins: coinText, t } = __import("core/i18n.js");
const { HELPERS } = __import("services/progress.js");

/** Shop items and store products carry English data; the words shown come from the dictionary. */
const itemName = (kind, item) => t(`${kind === 'skins' ? 'skin' : 'map'}.${item.id}`);
const itemDesc = (kind, item) => t(`${kind === 'skins' ? 'skin' : 'map'}.${item.id}.desc`);
const PREVIEW_W = 240;
const PREVIEW_H = 240;
const COLS = 3;
const LOOP = 3600;

/**
 * Every card in the shop is a tiny live scene: a block drops, lands with a squash,
 * slides into its twin and pops into the next number — in that card's skin and map.
 * One animation loop drives all visible cards at ~30 fps; off-screen cards sleep.
 */
class PreviewScene {
  constructor(canvas, skin, theme, offset) {
    this.canvas = canvas;
    this.skin = skin;
    this.theme = theme;
    this.offset = offset;
    this.visible = true;
    this.bg = null;
    this.dpr = 0;
    this.ctx = canvas.getContext('2d');
    // board geometry
    // three big columns: fewer blocks, each one large enough to show its material
    this.cell = 68;
    this.gap = 8;
    this.pitch = this.cell + this.gap;
    this.x0 = (PREVIEW_W - (COLS * this.pitch - this.gap)) / 2;
    this.y0 = PREVIEW_H - 10 - this.cell;
  }

  cellXY(c, r) {
    return { x: this.x0 + c * this.pitch, y: this.y0 - r * this.pitch };
  }

  /**
   * Match the canvas to the pixels it actually covers on this screen, so a thumbnail is
   * as sharp on a big tablet card as on a phone. Returns true when it changed.
   */
  fitResolution() {
    // screen pixels (the stage may be scaled up on big screens)
    const cssW = this.canvas.getBoundingClientRect().width || PREVIEW_W;
    const screen = Math.min(window.devicePixelRatio || 1, 2);
    const k = Math.max(1, Math.min(6, Math.round(((cssW * screen) / PREVIEW_W) * 4) / 4));
    if (k === this.dpr) return false;
    this.dpr = k;
    this.canvas.width = Math.round(PREVIEW_W * k);
    this.canvas.height = Math.round(PREVIEW_H * k);
    this.bg = null;
    return true;
  }

  /** The map and the recessed wells, painted once per resolution. */
  paintBackground() {
    const d = this.dpr;
    const c = document.createElement('canvas');
    c.width = PREVIEW_W * d;
    c.height = PREVIEW_H * d;
    const g = c.getContext('2d');
    g.setTransform(d, 0, 0, d, 0, 0);
    const theme = this.theme;
    const st = theme.init ? theme.init(PREVIEW_W, PREVIEW_H) : null;
    theme.draw(g, PREVIEW_W, PREVIEW_H, 1200, st);
    const ui = theme.ui;
    const wellR = this.cell * 0.16;
    const bw = COLS * this.pitch - this.gap;
    const glow = g.createRadialGradient(PREVIEW_W / 2, this.y0 - 10, 0, PREVIEW_W / 2, this.y0 - 10, bw * 0.8);
    glow.addColorStop(0, ui.boardGlow || 'rgba(255,255,255,0)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, PREVIEW_W, PREVIEW_H);
    for (let col = 0; col < COLS; col++) {
      for (let r = 0; r < 2; r++) {
        const { x, y } = this.cellXY(col, r);
        roundRectPath(g, x, y, this.cell, this.cell, wellR);
        g.fillStyle = ui.cell;
        g.fill();
        g.save();
        roundRectPath(g, x, y, this.cell, this.cell, wellR);
        g.clip();
        const ins = g.createLinearGradient(0, y, 0, y + this.cell * 0.45);
        ins.addColorStop(0, ui.cellInner || 'rgba(0,0,0,0.1)');
        ins.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = ins;
        g.fillRect(x, y, this.cell, this.cell * 0.45);
        g.restore();
      }
    }
    g.save();
    g.setLineDash([7, 6]);
    g.lineCap = 'round';
    g.strokeStyle = ui.line;
    g.lineWidth = 2;
    const ly = this.y0 - this.pitch - 5;
    g.beginPath();
    g.moveTo(this.x0 + 2, ly);
    g.lineTo(this.x0 + bw - 2, ly);
    g.stroke();
    g.restore();
    this.bg = c;
  }

  tile(ctx, c, r, exp, t, o = {}) {
    const { x, y } = this.cellXY(c, r);
    const s = this.cell;
    const sx = o.sx ?? 1;
    const sy = o.sy ?? 1;
    const sc = o.scale ?? 1;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    const ax = x + s / 2;
    const ay = y + s;
    ctx.translate(ax, ay);
    ctx.scale(sx * sc, sy * sc);
    ctx.translate(-ax, -ay - (sc !== 1 ? (s / 2) * (1 - 1 / sc) : 0));
    drawTile(ctx, this.skin, x, y + (o.dy || 0), s, {
      exp,
      joker: !!o.joker,
      label: o.joker ? '∞' : tileLabel(exp),
      time: t,
      face: o.face || 'idle',
      id: o.id || 0,
      look: o.look,
      flash: o.flash || 0,
      ratio: this.dpr,
    });
    ctx.restore();
  }

  draw(now) {
    this.fitResolution();
    if (!this.bg) this.paintBackground();
    const ctx = this.ctx;
    const d = this.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.bg, 0, 0);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    const t = REDUCED_MOTION ? 2400 : (now + this.offset) % LOOP;
    const time = now + this.offset;
    const P = this.pitch;
    const hoverR = 2.04;
    // where the falling block is, and how it feels
    let fr = hoverR;
    let fall = { face: 'hover', sx: 1, sy: 1, dy: Math.sin(time / 420) * 2.5 };
    if (t >= 700 && t < 980) {
      const k = Ease.inQuad((t - 700) / 280);
      fr = hoverR + (1 - hoverR) * k;
      fall = { face: 'fall', sx: 0.9, sy: 1.1 };
    } else if (t >= 980 && t < 1170) {
      fr = 1;
      const s = 1 - Ease.outSpring((t - 980) / 420);
      fall = { face: 'land', sx: 1 + 0.18 * s, sy: 1 - 0.22 * s };
    } else if (t >= 1170 && t < 1320) {
      const k = Ease.inQuad((t - 1170) / 150);
      fr = 1 - k;
      fall = { face: 'merge', scale: 1 - 0.2 * k };
    } else if (t >= 1320) {
      fr = null;
    }
    const merged = t >= 1320 && t < 3300;
    const fx = this.cellXY(1, 0).x + this.cell / 2;
    const look = fr != null ? { x: fx, y: this.y0 - fr * P + this.cell / 2 } : null;

    // resting blocks breathe and watch the drop
    const rest = (c, r, exp, id) => {
      const br = REDUCED_MOTION ? 0 : Math.sin(time / 1400 + id * 1.9) * 0.018;
      this.tile(ctx, c, r, exp, time, { id, look, sy: 1 + br, sx: 1 - br * 0.6, face: merged && t < 1900 && Math.abs(c - 1) === 1 && r === 0 ? 'merge' : 'idle' });
    };
    rest(0, 0, 6, 1);
    rest(2, 0, 5, 2);
    rest(0, 1, 1, 3);
    rest(2, 1, 7, 5);

    // the target block: an 8 that becomes a 16
    if (!merged) {
      const back = t >= 3300 ? Math.min(1, (t - 3300) / 250) : 1;
      const tf = t >= 1170 && t < 1320 ? { face: 'merge', scale: 0.94 } : { face: 'idle', look };
      this.tile(ctx, 1, 0, 3, time, Object.assign({ id: 6, alpha: back }, tf));
      if (t >= 3300) this.tile(ctx, 1, 0, 4, time, { id: 6, alpha: 1 - back, face: 'idle' });
    } else {
      const k = (t - 1320) / 520;
      const scale = k < 1 ? 1.3 - 0.3 * Ease.outSpring(k) : 1;
      const flash = Math.max(0, 1 - (t - 1320) / 320);
      this.tile(ctx, 1, 0, 4, time, { id: 6, scale, flash, face: t < 1950 ? 'merge' : 'idle', look: null });
    }
    // the drop itself
    if (fr != null) {
      this.tile(ctx, 1, fr, 3, time, Object.assign({ id: 7 }, fall));
    }
    // pop: shock ring + glints
    if (t >= 1320 && t < 1900) {
      const k = (t - 1320) / 580;
      const c = this.cellXY(1, 0);
      const cx = c.x + this.cell / 2;
      const cy = c.y + this.cell / 2;
      ctx.save();
      ctx.globalAlpha = (1 - k) * 0.9;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4 * (1 - k) + 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy, this.cell * (0.4 + Ease.outCubic(k) * 0.75), 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3;
        const r = this.cell * (0.5 + Ease.outCubic(k) * 0.55);
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r - k * 8;
        const R = 3.6 * Math.sin(k * Math.PI);
        ctx.globalAlpha = Math.sin(k * Math.PI);
        ctx.beginPath();
        ctx.moveTo(px, py - R * 1.5);
        ctx.quadraticCurveTo(px, py, px + R * 1.5, py);
        ctx.quadraticCurveTo(px, py, px, py + R * 1.5);
        ctx.quadraticCurveTo(px, py, px - R * 1.5, py);
        ctx.quadraticCurveTo(px, py, px, py - R * 1.5);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

/** Shop: tile skins, map themes for coins, and free coins / helpers (rewarded videos, daily gift). */
class Shop {
  constructor(app) {
    this.app = app;
    this.tab = 'skins';
    this.el = $('#screen-shop');
    this.body = $('#shop-body');
  }

  init() {
    $('#shop-close').addEventListener('click', () => {
      Audio.click();
      this.app.closeShop();
    });
    for (const tab of $$('.tab', this.el)) {
      tab.addEventListener('click', () => {
        Audio.click();
        this.tab = tab.dataset.tab;
        this.render();
      });
    }
    this.app.economy.on('coins', (balance) => setText('#shop-coins', formatCoins(balance)));
  }

  open(tab) {
    if (tab) this.tab = tab;
    setText('#shop-coins', formatCoins(this.app.economy.coins));
    this.render();
    show(this.el);
  }

  close() {
    hide(this.el);
    this.stopPreviews();
  }

  startPreviews() {
    if (this.previewRaf) return;
    let frame = 0;
    const loop = (now) => {
      this.previewRaf = requestAnimationFrame(loop);
      // 30 fps is plenty for thumbnails and halves the cost
      if (frame++ % 2) return;
      for (const sc of this.scenes) if (sc.visible) sc.draw(now);
    };
    this.previewRaf = requestAnimationFrame(loop);
  }

  stopPreviews() {
    if (this.previewRaf) cancelAnimationFrame(this.previewRaf);
    this.previewRaf = 0;
    if (this.observer) this.observer.disconnect();
    this.observer = null;
    this.scenes = [];
  }

  render() {
    this.renderSeq = (this.renderSeq || 0) + 1;
    // the Coins tab holds the free videos: it is there only while the portal offers videos
    const videos = this.app.ads.rewardedOffered();
    if (!videos && this.tab === 'coins') this.tab = 'skins';
    for (const tab of $$('.tab', this.el)) {
      tab.classList.toggle('active', tab.dataset.tab === this.tab);
      tab.classList.toggle('hidden', !videos && tab.dataset.tab === 'coins');
    }
    this.stopPreviews();
    this.body.innerHTML = '';
    if (this.tab === 'skins') this.renderItems('skins', SKINS);
    else if (this.tab === 'themes') this.renderItems('themes', THEMES);
    else this.renderCoins();
    this.body.scrollTop = 0;
    fitAll(this.el);
  }

  renderItems(kind, items) {
    const { economy } = this.app;
    const grid = document.createElement('div');
    grid.className = 'shop-grid';
    const selectedId = economy.selected(kind);
    this.scenes = [];
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        for (const e of entries) if (e.target._scene) e.target._scene.visible = e.isIntersecting;
      }, { root: this.body, rootMargin: '40px' });
    }
    items.forEach((item, index) => {
      const owned = economy.owns(kind, item.id);
      const selected = selectedId === item.id;
      const card = document.createElement('div');
      card.className = `shop-card${selected ? ' selected' : ''}${owned ? '' : ' locked'}`;
      const thumb = document.createElement('div');
      thumb.className = 'shop-thumb';
      const canvas = document.createElement('canvas');
      thumb.appendChild(canvas);
      if (!owned) thumb.insertAdjacentHTML('beforeend', `<span class="thumb-lock" aria-label="${t('common.locked')}"><svg class="ic"><use href="#i-lock"/></svg></span>`);
      card.appendChild(thumb);
      const body = document.createElement('div');
      body.className = 'shop-card-body';
      body.innerHTML = `
        <div class="shop-card-name"><span>${escapeHtml(itemName(kind, item))}</span></div>`;
      const btn = document.createElement('button');
      if (selected) {
        btn.className = 'btn selected-btn';
        btn.innerHTML = `<svg class="ic btn-glyph"><use href="#i-check"/></svg><span>${t('shop.inUse')}</span>`;
        btn.disabled = true;
      } else if (owned) {
        btn.className = 'btn owned c-blue';
        btn.textContent = t('shop.use');
      } else {
        btn.className = 'btn buy';
        btn.innerHTML = `<i class="coin-icon small"></i> ${formatNumber(item.price)}`;
      }
      btn.addEventListener('click', () => this.onItem(kind, item));
      body.appendChild(btn);
      card.appendChild(body);
      grid.appendChild(card);
      const skin = kind === 'skins' ? item : getSkin(economy.selected('skins'));
      const theme = kind === 'skins' ? getTheme(economy.selected('themes')) : item;
      const scene = new PreviewScene(canvas, skin, theme, index * 470);
      thumb._scene = scene;
      this.scenes.push(scene);
      if (this.observer) this.observer.observe(thumb);
    });
    this.body.appendChild(grid);
    requestAnimationFrame((now) => {
      for (const sc of this.scenes) sc.draw(now);
      this.startPreviews();
    });
  }

  async onItem(kind, item) {
    const { economy, ads } = this.app;
    Audio.click();
    if (economy.owns(kind, item.id)) {
      economy.select(kind, item.id);
      this.app.applyLook();
      this.render();
      Haptics.impact('light');
      return;
    }
    if (economy.canAfford(item.price)) {
      const ok = await dialog({
        title: t('shop.unlockTitle', { name: escapeHtml(itemName(kind, item)) }),
        html: `<p>${escapeHtml(itemDesc(kind, item))}</p><p class="muted">${t('shop.priceLine', { coins: coinText(item.price), have: coinText(economy.coins) })}</p>`,
        buttons: [
          { label: t('common.cancel'), value: false, kind: 'ghost' },
          { label: t('shop.unlock'), value: true, kind: 'primary' },
        ],
      });
      if (!ok) return;
      const res = economy.unlock(kind, item.id, item.price);
      if (res === 'ok') {
        economy.select(kind, item.id);
        this.app.applyLook();
        Audio.unlock();
        Haptics.notification('success');
        toast(t('toast.unlocked', { name: escapeHtml(itemName(kind, item)) }), { icon: ico('check', 'green') });
      }
      this.render();
      return;
    }
    const missing = item.price - economy.coins;
    // a video for coins when the portal offers one; "no thanks" looks exactly like the video button
    const video = ads.isRewardedAvailable() && this.app.screens.rewardCoinsCooldownLeft() <= 0 && this.app.progress.capLeft('coins') > 0;
    const buttons = [{ label: video ? t('common.cancel') : t('common.ok'), value: false, kind: video ? 'reward' : 'primary' }];
    if (video) buttons.push({ label: t('shop.watchCoins', { n: ECONOMY.rewardedCoins }), value: 'ad', kind: 'reward', icon: '▶' });
    const answer = await dialog({
      title: t('power.notEnough'),
      html: `<p>${t('shop.needMore', { coins: t('fmt.coinsGen', { n: missing }), name: escapeHtml(itemName(kind, item)) })}</p><p class="dialog-sub">${t('shop.earnByPlaying')}</p>`,
      buttons,
    });
    if (answer === 'ad') await this.app.screens.watchAdForCoins('shop');
  }

  /** Free coins and helpers: rewarded videos (shown only while the portal offers them) and the daily gift. */
  renderCoins() {
    const { app } = this;
    const { progress } = app;
    const list = document.createElement('div');
    list.className = 'coin-list';
    const row = (html, cls = '') => {
      const el = document.createElement('div');
      el.className = `coin-row ${cls}`;
      el.innerHTML = html;
      list.appendChild(el);
      return el;
    };
    if (app.ads.rewardedOffered()) {
      // +coins for a video (cooldown + daily cap as in the game)
      const left = app.screens.rewardCoinsCooldownLeft();
      const adRow = row(
        `<div class="coin-big medal-green"><svg class="ic solid"><use href="#i-play"/></svg></div><div class="coin-row-text"><b>${t('shop.freeCoins')}</b><span>${left > 0 ? t('shop.readyIn', { n: Math.ceil(left / 60) }) : t('shop.shortVideo', { n: ECONOMY.rewardedCoins })}</span></div><button class="btn reward"><span class="btn-icon"><svg class="ic"><use href="#i-video"/></svg></span><span>${t('shop.watch')}</span></button>`,
        'highlight'
      );
      const adBtn = adRow.querySelector('button');
      adBtn.disabled = left > 0;
      adBtn.addEventListener('click', async () => {
        const ok = await app.screens.watchAdForCoins('shop');
        if (ok) this.render();
      });
      // a free helper for a video (a few a day)
      const hl = progress.capLeft('helper');
      const helperRow = row(
        `<div class="coin-big medal-wrap">${ico('hammer', 'orange')}</div><div class="coin-row-text"><b>${t('offer.freeHelper')}</b><span>${t('offer.freeHelperSub', { n: hl })}</span></div><button class="btn ${hl > 0 ? 'reward' : 'secondary'}">${hl > 0 ? `<span class="btn-icon"><svg class="ic"><use href="#i-video"/></svg></span><span>${t('shop.watch')}</span>` : t('chests.tomorrow')}</button>`
      );
      const hBtn = helperRow.querySelector('button');
      hBtn.disabled = hl <= 0;
      hBtn.addEventListener('click', async () => {
        Audio.click();
        if (await app.live.watch('helper', 'shop:helper')) {
          const id = HELPERS[Math.floor(Math.random() * HELPERS.length)];
          const lines = progress.grant({ [id]: 1 }, 'video');
          await app.live.reveal(lines, { title: t('offer.freeHelper') });
          if (!this.el.classList.contains('hidden')) this.render();
        }
      });
    }
    // daily rewards: the 7-day calendar
    const login = progress.login();
    const dailyRow = row(
      `<div class="coin-big medal-pink"><svg class="ic"><use href="#i-calendar"/></svg></div><div class="coin-row-text"><b>${t('shop.dailyGift')}</b><span>${t('shop.everyDayCal')}</span></div><button class="btn c-orange">${login.canClaim ? t('shop.claim') : t('shop.open')}</button>`
    );
    dailyRow.querySelector('button').addEventListener('click', async () => {
      Audio.click();
      await app.live.openDaily();
      if (!this.el.classList.contains('hidden')) this.render();
    });
    this.body.appendChild(list);
    fitAll(this.body);
  }
}
__exports.Shop = Shop;
});
// ---- ui/live.js ----
__define("ui/live.js", function (__exports) {
const { ECONOMY, LIVE } = __import("config.js");
const { formatNumber, tileLabel } = __import("core/utils.js");
const { t } = __import("core/i18n.js");
const { drawTile, getSkin } = __import("render/tileSkins.js");
const { getTheme } = __import("render/themes.js");
const { HELPERS } = __import("services/progress.js");
const { Audio } = __import("services/audio.js");
const { Haptics } = __import("services/haptics.js");
const { Analytics } = __import("services/analytics.js");
const { $, $$, escapeHtml, fitAll, hide, setText, show } = __import("ui/dom.js");
const { ico, toast } = __import("ui/dialog.js");

/**
 * Screens of the live layer: the menu's side rails and dock badges, the Missions / Pass /
 * Chests panel, the daily calendar, the lucky spin, the reward reveal and the odds sheets.
 * All rules live in services/progress.js; this file only shows them. Every video offer is shown
 * only while the portal offers rewarded videos (`videos`).
 */

const TONE = { hammer: 'orange', joker: 'rainbow', undo: 'blue' };
const MISSION_ICON = { games: ['play', 'green'], merges: ['sparkle', 'purple'], drops: ['chev', 'blue'], chain: ['sparkle', 'orange'], block: ['trophy', 'gold'], score: ['star', 'gold'], helpers: ['hammer', 'orange'], chests: ['chest', 'gold'], spins: ['wheel', 'purple'], earned: ['coin'], videos: ['video', 'green'] };
const ACH_ICON = { games: ['play', 'green'], merges: ['sparkle', 'purple'], highestExp: ['trophy', 'gold'], bestChain: ['sparkle', 'orange'], best: ['star', 'gold'], helpersUsed: ['hammer', 'orange'], chestsOpened: ['chest', 'gold'], missionsDone: ['target', 'red'], collection: ['palette', 'pink'], loginDays: ['calendar', 'blue'] };

/** A chest drawing, tinted by kind (wood / silver / gold). */
function chestHtml(kind, cls = '') {
  return `<span class="chest chest-${kind} ${cls}"><svg viewBox="0 0 64 56" aria-hidden="true"><use href="#i-chest"/></svg></span>`;
}

function medal(name, tone) {
  if (name === 'coin') return '<i class="coin-icon"></i>';
  if (name === 'joker') return ico('joker', 'rainbow');
  if (name === 'chest') return chestHtml('gold', 'small');
  return ico(name, tone);
}

/** "2h 05m", "3d 4h", "45s" */
function duration(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return t('time.dh', { d, h });
  if (h > 0) return t('time.hm', { h, m: String(m).padStart(2, '0') });
  if (m > 0) return t('time.ms', { m, s: String(s % 60).padStart(2, '0') });
  return t('time.s', { s });
}

/** The icon + amount of one reward line (or of a reward object, through rewardLines). */
function lineHtml(line, big = false) {
  const cls = `rw${big ? ' big' : ''}`;
  switch (line.type) {
    case 'coins':
      return `<span class="${cls} rw-coins"><i class="coin-icon"></i><b>${formatNumber(line.n)}</b></span>`;
    case 'hammer':
    case 'undo':
      return `<span class="${cls}">${ico(line.type, TONE[line.type])}<b>×${line.n}</b></span>`;
    case 'joker':
      return `<span class="${cls}">${ico('joker', 'rainbow')}<b>×${line.n}</b></span>`;
    case 'xp':
      return `<span class="${cls}">${ico('star', 'purple')}<b>${formatNumber(line.n)} ${t('live.xp')}</b></span>`;
    case 'chest':
      return `<span class="${cls}">${chestHtml(line.kind)}<b>${t(`chest.${line.kind}`)}</b></span>`;
    case 'look':
      return `<span class="${cls} rw-look"><canvas class="look-thumb" data-kind="${line.kind}" data-id="${line.id}" width="96" height="96"></canvas><b>${escapeHtml(t(`${line.kind === 'skins' ? 'skin' : 'map'}.${line.id}`))}</b>${line.dup ? `<small>${t('live.owned', { n: line.dup })}</small>` : ''}</span>`;
    case 'pass':
      return `<span class="${cls}">${ico('crown', 'gold')}<b>${t('pass.premium')}</b></span>`;
    default:
      return '';
  }
}

/** A reward object as display lines (without granting it). */
function rewardLines(reward) {
  const out = [];
  if (!reward) return out;
  if (reward.coins) out.push({ type: 'coins', n: reward.coins });
  for (const id of HELPERS) if (reward[id]) out.push({ type: id, n: reward[id] });
  if (reward.xp) out.push({ type: 'xp', n: reward.xp });
  if (reward.look) out.push({ type: 'look', kind: reward.look[0], id: reward.look[1], dup: 0 });
  if (reward.chest) out.push({ type: 'chest', kind: reward.chest });
  if (reward.items) for (const id of HELPERS) if (reward.items[id]) out.push({ type: id, n: reward.items[id] });
  if (reward.chests) for (const k of ['wood', 'silver', 'gold']) if (reward.chests[k]) out.push({ type: 'chest', kind: k, n: reward.chests[k] });
  return out;
}

/** Paints skin / map thumbnails left in `root` by lineHtml. */
function paintLooks(root, app) {
  for (const c of $$('canvas.look-thumb', root)) {
    if (c._done) continue;
    c._done = true;
    const g = c.getContext('2d');
    const kind = c.dataset.kind;
    const skin = kind === 'skins' ? getSkin(c.dataset.id) : app.renderer.skin;
    const theme = kind === 'themes' ? getTheme(c.dataset.id) : getTheme(app.storage.data.theme);
    const st = theme.init ? theme.init(96, 96) : null;
    g.save();
    g.beginPath();
    g.roundRect ? g.roundRect(0, 0, 96, 96, 22) : g.rect(0, 0, 96, 96);
    g.clip();
    theme.draw(g, 96, 96, 1500, st);
    g.restore();
    drawTile(g, skin, 18, 18, 60, { exp: 4, joker: false, label: tileLabel(4), time: 0, face: 'idle', id: 3 });
  }
}

class LiveUI {
  constructor(app) {
    this.app = app;
    this.p = app.progress;
    this.view = null;
    this.tab = 'daily';
    this.timer = 0;
    this.pendingUnlock = false;
  }

  /** True while the portal offers rewarded videos: every video button depends on it. */
  get videos() {
    return this.app.ads.rewardedOffered();
  }

  init() {
    const { app } = this;
    const bind = (sel, fn) => {
      const el = $(sel);
      if (el) el.addEventListener('click', () => {
        Audio.click();
        fn();
      });
    };
    bind('#btn-daily', () => this.openDaily());
    bind('#btn-spin', () => this.openSpin());
    bind('#btn-missions', () => this.open('missions', 'daily'));
    bind('#btn-pass', () => this.open('pass'));
    bind('#btn-chests', () => this.open('chests'));
    bind('#live-close', () => this.close());
    for (const tab of $$('#screen-live .tab')) {
      tab.addEventListener('click', () => {
        Audio.click();
        this.tab = tab.dataset.tab;
        this.render();
      });
    }
    app.economy.on('coins', (balance) => setText('#live-coins', formatNumber(balance)));
    this.p.on('change', () => this.soon());
    this.p.on('missionDone', (m) => {
      if (app.mode === 'game') toast(`${t('mission.done')} &nbsp;<b>${escapeHtml(this.missionText(m))}</b>`, { icon: ico('target', 'red') });
    });
    // a clock for the timers on screen
    setInterval(() => {
      if (!$('#screen-menu').classList.contains('hidden')) this.refreshMenu();
      if (this.view && !$('#screen-live').classList.contains('hidden')) this.tickTimers();
    }, 1000);
  }

  soon() {
    if (this.soonTimer) return;
    this.soonTimer = setTimeout(() => {
      this.soonTimer = 0;
      if (!$('#screen-menu').classList.contains('hidden')) this.refreshMenu();
      if (this.view && !$('#screen-live').classList.contains('hidden')) this.render(true);
    }, 60);
  }

  // =========================================================================== menu
  refreshMenu() {
    const { p, app } = this;
    const b = p.badges();
    const on = this.videos;
    const dot = (sel, v) => {
      const el = $(sel);
      if (el) el.classList.toggle('has-dot', !!v);
    };
    dot('#btn-daily', b.daily);
    dot('#btn-spin', b.spin);
    dot('#btn-missions', b.missions);
    dot('#btn-pass', b.pass);
    // the chest tile says "Ready!" on its tag instead of a dot
    dot('#btn-chests', false);
    const chestsBtn = $('#btn-chests');
    if (chestsBtn) chestsBtn.classList.toggle('ready', !!b.chest);
    // the right rail holds the coins video: there only while the portal offers videos
    const toggle = (sel, v) => {
      const el = $(sel);
      if (el) el.classList.toggle('hidden', !v);
    };
    toggle('#btn-menu-ad', on);
    toggle('#rail-right', on);
    document.body.classList.toggle('money-on', on);
    const daily = $('#btn-daily');
    if (daily) daily.classList.toggle('ready', !!b.daily);
    const spin = $('#btn-spin');
    if (spin) spin.classList.toggle('ready', !!b.spin);
    const chestLeft = p.freeChestLeft();
    setText('#chest-timer', chestLeft > 0 ? duration(chestLeft) : t('live.ready'));
    const adBtn = $('#btn-menu-ad');
    if (adBtn) {
      const left = app.screens.rewardCoinsCooldownLeft();
      // only the cooldown greys it out: with no video loaded a tap says so instead of doing nothing
      adBtn.disabled = !on || left > 0;
      adBtn.querySelector('small').textContent = left > 0 ? duration(left * 1000) : `+${formatNumber(ECONOMY.rewardedCoins)}`;
    }
    const lg = p.login();
    setText('#daily-tag', t('daily.day', { n: (lg.canClaim ? lg.index : lg.index) + 1 }));
    setText('#spin-tag', b.spin ? t('spin.freeTag') : '');
    const pass = p.pass();
    setText('#pass-tag', t('pass.lvl', { n: pass.level }));
    const ms = p.missions();
    setText('#missions-tag', `${ms.filter((m) => m.claimed).length}/${ms.length}`);
  }

  // =========================================================================== rewarded videos
  /**
   * A rewarded video for one of the live placements. Checks the daily cap, says why when
   * there is no video, and books the cap only when the reward was earned.
   */
  async watch(kind, placement) {
    const { app, p } = this;
    if (!this.videos) return false;
    if (p.capLeft(kind) <= 0) {
      toast(t('ad.capReached'));
      return false;
    }
    const res = await app.ads.showRewarded(placement || kind);
    if (!res.rewarded) {
      if (res.error === 'unavailable') toast(t('power.noVideo'));
      return false;
    }
    p.useCap(kind);
    return true;
  }

  // =========================================================================== modal + reveal
  /**
   * A rich modal: { title, body (element or html), buttons: [{label, value, kind}], cls,
   * dismissible, onOpen(card, close) }. Resolves with the pressed button's value.
   */
  modal(opts) {
    return new Promise((resolve) => {
      const root = $('#live-modal');
      // every modal is its own layer, so a reward can open over the wheel and close back to it
      const layer = document.createElement('div');
      layer.className = 'live-layer';
      const card = document.createElement('div');
      card.className = `modal-card live-card ${opts.cls || ''}`;
      card.setAttribute('role', 'dialog');
      card.setAttribute('aria-modal', 'true');
      if (opts.dismissible) card.insertAdjacentHTML('beforeend', `<button class="icon-btn round dialog-x" data-x aria-label="${t('common.close')}"><svg class="ic"><use href="#i-close"/></svg></button>`);
      if (opts.title) card.insertAdjacentHTML('beforeend', `<h2 class="modal-title">${opts.title}</h2>`);
      const body = document.createElement('div');
      body.className = 'live-modal-body';
      if (typeof opts.body === 'string') body.innerHTML = opts.body;
      else if (opts.body) body.appendChild(opts.body);
      card.appendChild(body);
      const actions = document.createElement('div');
      actions.className = 'dialog-actions';
      card.appendChild(actions);
      let closed = false;
      const close = (v) => {
        if (closed) return;
        closed = true;
        layer.classList.remove('open');
        layer.classList.add('closing');
        setTimeout(() => {
          layer.remove();
          if (!root.children.length) root.classList.add('hidden');
        }, 180);
        resolve(v);
      };
      (opts.buttons || []).forEach((bt) => {
        const el = document.createElement('button');
        el.className = `btn ${bt.kind || 'primary'}`;
        el.innerHTML = `${bt.icon ? `<span class="btn-icon"><svg class="ic"><use href="#i-${bt.icon}"/></svg></span>` : ''}<span>${bt.label}</span>`;
        if (bt.disabled) el.disabled = true;
        el.addEventListener('click', () => {
          Audio.click();
          if (bt.onClick) bt.onClick(el, close);
          else close(bt.value);
        });
        actions.appendChild(el);
      });
      if (!actions.children.length) actions.remove();
      layer.appendChild(card);
      root.appendChild(layer);
      root.classList.remove('hidden');
      const x = card.querySelector('[data-x]');
      if (x) {
        x.addEventListener('click', () => {
          Audio.click();
          close(undefined);
        });
      }
      if (opts.dismissible) {
        layer.addEventListener('click', (e) => {
          if (e.target === layer) close(undefined);
        });
      }
      if (opts.onOpen) opts.onOpen(card, close);
      paintLooks(card, this.app);
      fitAll(card);
      requestAnimationFrame(() => layer.classList.add('open'));
    });
  }

  /**
   * The reward screen: chests shake and burst open, then everything inside pops in.
   * opts: { title, text, extra: { label, onClick } } - an optional "x2 with video" button.
   */
  reveal(lines, opts = {}) {
    if (!lines || !lines.length) return Promise.resolve();
    const flat = [];
    const chests = [];
    for (const l of lines) {
      if (l.type === 'chest') {
        chests.push(l);
        for (const c of l.contents || []) flat.push(c);
      } else flat.push(l);
    }
    // the same kind of item from several chests is shown once, added up
    const merged = [];
    for (const l of flat) {
      const same = merged.find((m) => m.type === l.type && l.type !== 'look' && l.type !== 'pass');
      if (same && same.n != null) same.n += l.n;
      else merged.push({ ...l });
    }
    const body = document.createElement('div');
    body.className = 'reveal';
    if (opts.text) body.insertAdjacentHTML('beforeend', `<p class="reveal-text">${opts.text}</p>`);
    if (chests.length) {
      const kind = chests.some((c) => c.kind === 'gold') ? 'gold' : chests.some((c) => c.kind === 'silver') ? 'silver' : 'wood';
      body.insertAdjacentHTML('beforeend', `<div class="reveal-chest">${chestHtml(kind, 'shake')}${chests.length > 1 ? `<b class="chest-count">×${chests.length}</b>` : ''}</div>`);
    }
    // a tidy block of cards: 2 x 2 for four, rows of three for five or six
    const n = merged.length;
    const cols = n <= 3 ? n : n === 4 ? 2 : n <= 6 ? 3 : 4;
    body.insertAdjacentHTML('beforeend', `<div class="rw-grid reveal-grid" style="--cols:${cols}">${merged.map((l) => lineHtml(l, true)).join('')}</div>`);
    const buttons = [{ label: t('reward.collect'), value: 'ok', kind: 'play big' }];
    if (opts.extra) buttons.unshift({ label: opts.extra.label, kind: 'reward', icon: 'video', onClick: opts.extra.onClick });
    return this.modal({
      title: opts.title || t('reward.title'),
      body,
      cls: `reveal-modal ${opts.cls || ''}`,
      buttons,
      onOpen: (card) => {
        const items = $$('.reveal-grid .rw', card);
        const delay = chests.length ? 900 : 120;
        if (chests.length) {
          Audio.whoosh();
          setTimeout(() => {
            const ch = card.querySelector('.reveal-chest .chest');
            if (ch) ch.classList.add('burst');
            Audio.unlock();
            Haptics.impact('heavy');
          }, 750);
        }
        items.forEach((el, i) => {
          el.style.animationDelay = `${delay + i * 140}ms`;
          setTimeout(() => {
            if (el.classList.contains('rw-coins')) Audio.coin();
            else Audio.merge(Math.min(6, i + 1), 4);
          }, delay + i * 140);
        });
      },
    });
  }

  // =========================================================================== daily calendar
  async openDaily() {
    const { p } = this;
    const draw = (card) => {
      const st = p.login();
      const grid = card.querySelector('.cal-grid');
      grid.innerHTML = st.rewards
        .map((r, i) => {
          const state = i < st.index || (st.claimedToday && i === st.index) ? 'done' : i === st.index && st.canClaim ? 'today' : 'later';
          const line = rewardLines(r)[0];
          return `<div class="cal-day ${state}${i === 6 ? ' big' : ''}"><small>${t('daily.day', { n: i + 1 })}</small>${lineHtml(line)}${state === 'done' ? `<span class="cal-check">${ico('check', 'green')}</span>` : ''}</div>`;
        })
        .join('');
      fitAll(card);
    };
    const body = document.createElement('div');
    body.className = 'daily-cal';
    body.innerHTML = `<p class="live-sub">${t('daily.sub')}</p><div class="cal-grid"></div>`;
    const st = p.login();
    const buttons = [];
    if (st.canClaim) {
      buttons.push({
        label: t('daily.claim'),
        kind: 'play big',
        onClick: async (btn, close) => {
          const res = p.claimLogin();
          if (!res) return;
          // the calendar ticks the day off, the reward opens over it, then both close
          btn.disabled = true;
          btn.className = 'btn secondary big';
          btn.innerHTML = `<span>${t('daily.tomorrow')}</span>`;
          if (calCard) draw(calCard);
          Analytics.track('live_login', { day: res.day + 1 });
          const canDouble = this.videos && p.capLeft('login') > 0;
          await this.reveal(res.lines, {
            title: t('daily.title'),
            extra: canDouble
              ? {
                  label: t('daily.double'),
                  onClick: async (btn, closeReveal) => {
                    btn.disabled = true;
                    if (await this.watch('login', 'login:double')) {
                      const more = p.doubleLogin();
                      closeReveal('doubled');
                      if (more) await this.reveal(more, { title: t('daily.doubled') });
                    } else btn.disabled = false;
                  },
                }
              : null,
          });
          this.refreshMenu();
          close('claimed');
        },
      });
    } else buttons.push({ label: t('daily.tomorrow'), kind: 'secondary', value: 'ok' });
    let calCard = null;
    await this.modal({
      title: t('daily.title'),
      body,
      cls: 'daily-modal',
      dismissible: true,
      buttons,
      onOpen: (card) => {
        calCard = card;
        draw(card);
      },
    });
    this.refreshMenu();
  }

  // =========================================================================== lucky spin
  async openSpin() {
    const { p } = this;
    const segs = LIVE.spin.segments;
    const n = segs.length;
    const step = 360 / n;
    const colors = ['#ffd04a', '#ff8fb0', '#7fd7ff', '#a6f08a', '#ffb35c', '#c7a6ff', '#ffe27a', '#79e3d0'];
    const stops = segs.map((_, i) => `${colors[i % colors.length]} ${i * step}deg ${(i + 1) * step}deg`).join(', ');
    const body = document.createElement('div');
    body.className = 'spin-wrap';
    body.innerHTML = `
      <div class="wheel">
        <div class="wheel-rot" style="background: conic-gradient(from ${-step / 2}deg, ${stops})">
          ${segs.map((sg, i) => `<div class="wheel-seg" style="--a:${i * step}deg">${lineHtml(rewardLines(sg.reward)[0])}</div>`).join('')}
        </div>
        <div class="wheel-hub">${ico('star', 'gold')}</div>
        <div class="wheel-pin"></div>
      </div>
      <p class="live-sub spin-left"></p>
      <button class="link-btn odds-link" type="button">${t('odds.link')}</button>`;
    let angle = 0;
    let spinning = false;
    let spinCard = null;
    const update = () => {
      const card = spinCard;
      if (!card) return;
      const st = p.spinState();
      const btn = card.querySelector('.dialog-actions .btn');
      const left = card.querySelector('.spin-left');
      if (!btn) return;
      if (st.free) {
        btn.innerHTML = `<span>${t('spin.free')}</span>`;
        btn.className = 'btn play big';
        btn.disabled = false;
        left.textContent = t('spin.oneFree');
      } else if (this.videos && st.ads > 0) {
        btn.innerHTML = `<span class="btn-icon"><svg class="ic"><use href="#i-video"/></svg></span><span>${t('spin.again')}</span>`;
        btn.className = 'btn reward big';
        btn.disabled = false;
        left.textContent = t('spin.adsLeft', { n: st.ads });
      } else {
        btn.innerHTML = `<span>${t('spin.tomorrow')}</span>`;
        btn.className = 'btn secondary big';
        btn.disabled = true;
        left.textContent = t('spin.comeBack');
      }
      fitAll(card);
    };
    const doSpin = async (btn) => {
      if (spinning) return;
      const st = p.spinState();
      let paid = null;
      if (st.free) paid = 'free';
      else if (this.videos && st.ads > 0) {
        btn.disabled = true;
        if (await this.watch('spin', 'spin')) paid = 'ad';
        else {
          btn.disabled = false;
          return;
        }
      }
      if (!paid) return;
      const res = p.spin(paid);
      if (!res) return;
      spinning = true;
      btn.disabled = true;
      Analytics.track('live_spin', { paid, index: res.index });
      const rot = spinCard.querySelector('.wheel-rot');
      // the wheel turns clockwise; segment i sits under the pin when the turn is -i * step (mod 360)
      const jitter = (Math.random() - 0.5) * step * 0.6;
      const goal = (((360 - res.index * step + jitter) % 360) + 360) % 360;
      const from = angle;
      const total = 360 * 5 + ((((goal - (from % 360)) % 360) + 360) % 360);
      const start = performance.now();
      const dur = 4200;
      let lastTick = Math.floor(from / step);
      await new Promise((done) => {
        const frame = (now) => {
          const k = Math.min(1, (now - start) / dur);
          const e = 1 - Math.pow(1 - k, 4);
          const a = from + total * e;
          rot.style.setProperty('--spin', `${a}deg`);
          const tick = Math.floor((a + step / 2) / step);
          if (tick !== lastTick) {
            lastTick = tick;
            Audio.click();
          }
          if (k < 1) requestAnimationFrame(frame);
          else {
            angle = a;
            done();
          }
        };
        requestAnimationFrame(frame);
      });
      Haptics.notification('success');
      const seg = spinCard.querySelectorAll('.wheel-seg')[res.index];
      if (seg) seg.classList.add('won');
      await new Promise((r) => setTimeout(r, 450));
      spinning = false;
      await this.reveal(res.lines, { title: t('spin.won') });
      if (seg) seg.classList.remove('won');
      update();
      this.refreshMenu();
    };
    await this.modal({
      title: t('spin.title'),
      body,
      cls: 'spin-modal',
      dismissible: true,
      buttons: [{ label: t('spin.free'), kind: 'play big', onClick: (btn) => doSpin(btn) }],
      onOpen: (card) => {
        spinCard = card;
        update();
        card.querySelector('.odds-link').addEventListener('click', () => {
          Audio.click();
          this.showOdds('spin');
        });
      },
    });
    this.refreshMenu();
  }

  /** Odds disclosure for the wheel and the chests. */
  async showOdds(kind) {
    const sheet = document.createElement('div');
    sheet.className = 'odds';
    if (kind === 'spin') {
      const segs = LIVE.spin.segments;
      const total = segs.reduce((a, x) => a + x.weight, 0);
      sheet.innerHTML = `<p class="live-sub">${t('odds.spinTitle')}</p><table>${segs
        .map((x) => `<tr><td>${lineHtml(rewardLines(x.reward)[0])}</td><td>${((x.weight / total) * 100).toFixed(0)}%</td></tr>`)
        .join('')}</table>`;
    } else {
      sheet.innerHTML =
        ['wood', 'silver', 'gold']
          .map((k) => {
            const o = this.p.chestOdds(k);
            const rows = [`<tr><td>${t('odds.coins', { a: formatNumber(o.coins[0]), b: formatNumber(o.coins[1]) })}</td><td>100%</td></tr>`];
            if (o.helpers) rows.push(`<tr><td>${t('odds.helpers', { n: o.helpers })}</td><td>100%</td></tr>`);
            if (o.extra) rows.push(`<tr><td>${t('odds.extraHelper')}</td><td>${Math.round(o.extra * 100)}%</td></tr>`);
            if (o.look) rows.push(`<tr><td>${t('odds.look')}</td><td>${Math.round(o.look * 100)}%</td></tr>`);
            return `<div class="odds-chest"><div class="odds-head">${chestHtml(k, 'small')}<b>${t(`chest.${k}`)}</b></div><table>${rows.join('')}</table></div>`;
          })
          .join('') + `<p class="live-sub">${t('odds.helperNote')}</p><p class="live-sub">${t('odds.allOwned', { s: LIVE.chests.kinds.silver.lookCoins, g: LIVE.chests.kinds.gold.lookCoins })}</p>`;
    }
    await this.modal({ title: t('odds.title'), body: sheet, cls: 'odds-modal', dismissible: true, buttons: [{ label: t('common.ok'), value: 'ok', kind: 'primary' }] });
  }

  // =========================================================================== panel
  open(view, tab) {
    const { app } = this;
    if (app.mode === 'game' && $('#screen-pause').classList.contains('hidden') && $('#screen-gameover').classList.contains('hidden')) app.pause();
    this.view = view;
    if (tab) this.tab = tab;
    else if (view === 'missions' && !['daily', 'weekly', 'goals'].includes(this.tab)) this.tab = 'daily';
    setText('#live-coins', formatNumber(app.economy.coins));
    this.render();
    show('#screen-live');
    Analytics.track('live_open', { view });
  }

  close() {
    hide('#screen-live');
    this.view = null;
    this.app.screens.refreshMenu();
  }

  render(keepScroll) {
    const body = $('#live-body');
    const scroll = keepScroll ? body.scrollTop : 0;
    const titles = { missions: t('missions.title'), pass: t('pass.title'), chests: t('chests.title') };
    setText('#live-title', titles[this.view] || '');
    const tabs = $('#live-tabs');
    tabs.classList.toggle('hidden', this.view !== 'missions');
    for (const tab of $$('.tab', tabs)) tab.classList.toggle('active', tab.dataset.tab === this.tab);
    const b = this.p.badges();
    const dot = (sel, v) => {
      const el = $(sel);
      if (el) el.classList.toggle('has-dot', !!v);
    };
    dot('#live-tabs [data-tab="goals"]', b.goals);
    dot('#live-tabs [data-tab="daily"]', this.p.missions().some((m) => m.claimable) || this.p.milestones().some((m) => m.claimable));
    dot('#live-tabs [data-tab="weekly"]', this.p.weekMilestones().some((m) => m.claimable));
    body.innerHTML = '';
    if (this.view === 'missions') {
      if (this.tab === 'weekly') this.renderWeekly(body);
      else if (this.tab === 'goals') this.renderGoals(body);
      else this.renderDaily(body);
    } else if (this.view === 'pass') this.renderPass(body);
    else if (this.view === 'chests') this.renderChests(body);
    paintLooks(body, this.app);
    fitAll($('#screen-live'));
    body.scrollTop = scroll;
  }

  tickTimers() {
    const { p } = this;
    for (const el of $$('[data-timer]', $('#live-body'))) {
      const k = el.dataset.timer;
      const ms = k === 'day' ? p.dayLeft() : k === 'week' ? p.weekLeft() : k === 'season' ? p.season().left : k === 'chest' ? p.freeChestLeft() : 0;
      if (k === 'chest' && ms <= 0) {
        this.render(true);
        return;
      }
      el.textContent = duration(ms);
    }
  }

  /** The activity bar: points so far and the rewards waiting at each step. */
  bar(points, max, steps, onClaim) {
    const el = document.createElement('div');
    el.className = 'act-bar';
    el.innerHTML = `<div class="act-track"><div class="act-fill" style="width:${Math.min(100, (points / max) * 100)}%"></div></div>`;
    for (const s of steps) {
      const node = document.createElement('button');
      node.type = 'button';
      node.className = `act-node${s.claimed ? ' claimed' : s.claimable ? ' ready' : ''}`;
      node.style.left = `${(s.at / max) * 100}%`;
      const line = rewardLines(s.reward)[0];
      node.innerHTML = `<span class="act-reward">${s.reward.chest ? chestHtml(s.reward.chest, 'small') : lineHtml(line)}</span><small>${formatNumber(s.at)}</small>${s.claimed ? `<span class="act-check">${ico('check', 'green')}</span>` : ''}`;
      node.addEventListener('click', async () => {
        Audio.click();
        if (s.claimable) await onClaim(s.index);
        else if (!s.claimed) toast(t('missions.reachPoints', { n: s.at }), { icon: ico('target', 'red') });
      });
      el.appendChild(node);
    }
    return el;
  }

  missionText(m) {
    const n = m.goal;
    if (m.metric === 'block') return t('mission.block', { block: tileLabel(n) });
    return t(`mission.${m.metric}`, { n });
  }

  renderDaily(body) {
    const { p } = this;
    const pts = p.s.missions.points;
    const head = document.createElement('div');
    head.className = 'live-card-head';
    head.innerHTML = `<div class="live-head-row"><b>${t('missions.activity')}</b><span class="pts">${ico('target', 'red')}<b>${pts}</b>/100</span></div>`;
    head.appendChild(
      this.bar(pts, 100, p.milestones(), async (i) => {
        const lines = p.claimMilestone(i);
        if (lines) await this.reveal(lines);
      })
    );
    head.insertAdjacentHTML('beforeend', `<p class="live-sub">${ico('clock', 'grey')} ${t('missions.newIn')} <b data-timer="day">${duration(p.dayLeft())}</b></p>`);
    body.appendChild(head);
    const list = document.createElement('div');
    list.className = 'coin-list live-list';
    for (const m of p.missions()) {
      const [icon, tone] = MISSION_ICON[m.metric] || ['target', 'red'];
      const row = document.createElement('div');
      row.className = `coin-row mission${m.claimed ? ' claimed' : m.claimable ? ' highlight' : ''}`;
      const prog = Math.min(1, m.value / m.goal);
      const value = m.metric === 'block' ? (m.done ? 1 : 0) : m.value;
      const goal = m.metric === 'block' ? 1 : m.goal;
      row.innerHTML = `
        <div class="coin-big medal-wrap">${medal(icon, tone)}</div>
        <div class="coin-row-text">
          <b>${escapeHtml(this.missionText(m))}</b>
          <div class="mini-bar"><i style="width:${prog * 100}%"></i><span>${formatNumber(value)}/${formatNumber(goal)}</span></div>
          <span class="chips"><span class="chip pts">+${LIVE.missions.points} ${t('missions.pts')}</span><span class="chip"><i class="coin-icon small"></i>${m.coins}</span></span>
        </div>`;
      const btn = document.createElement('button');
      if (m.claimed) {
        btn.className = 'btn secondary small';
        btn.disabled = true;
        btn.innerHTML = `<svg class="ic btn-glyph"><use href="#i-check"/></svg>`;
      } else if (m.claimable) {
        btn.className = 'btn c-green small';
        btn.textContent = t('reward.claim');
        btn.addEventListener('click', async () => {
          Audio.click();
          const res = p.claimMission(m.index);
          if (!res) return;
          Haptics.notification('success');
          await this.reveal(res.lines, { title: t('mission.done'), text: t('missions.ptsEarned', { n: res.points }) });
        });
      } else {
        btn.className = 'btn play small';
        btn.textContent = t('missions.go');
        btn.addEventListener('click', () => {
          Audio.click();
          this.close();
          if (this.app.mode !== 'game') this.app.playFromMenu(true);
          else this.app.resume();
        });
      }
      row.appendChild(btn);
      if (!m.claimed && !m.claimable && this.videos && p.capLeft('reroll') > 0) {
        const sw = document.createElement('button');
        sw.className = 'swap-btn';
        sw.type = 'button';
        sw.setAttribute('aria-label', t('missions.swap'));
        sw.innerHTML = `<svg class="ic"><use href="#i-video"/></svg><svg class="ic"><use href="#i-restart"/></svg>`;
        sw.addEventListener('click', async () => {
          Audio.click();
          if (await this.watch('reroll', 'mission:swap')) {
            p.rerollMission(m.index);
            toast(t('missions.swapped'), { icon: ico('restart', 'blue') });
          }
        });
        row.appendChild(sw);
      }
      list.appendChild(row);
    }
    body.appendChild(list);
    if (this.videos && p.capLeft('reroll') > 0) body.insertAdjacentHTML('beforeend', `<p class="live-sub center">${t('missions.swapHint', { n: p.capLeft('reroll') })}</p>`);
  }

  renderWeekly(body) {
    const { p } = this;
    const ms = p.weekMilestones();
    const max = ms[ms.length - 1].at;
    const head = document.createElement('div');
    head.className = 'live-card-head';
    head.innerHTML = `<div class="live-head-row"><b>${t('weekly.title')}</b><span class="pts">${ico('target', 'red')}<b>${formatNumber(p.s.weekPts)}</b>/${formatNumber(max)}</span></div>`;
    head.appendChild(
      this.bar(p.s.weekPts, max, ms, async (i) => {
        const lines = p.claimWeek(i);
        if (lines) await this.reveal(lines);
      })
    );
    head.insertAdjacentHTML('beforeend', `<p class="live-sub">${ico('clock', 'grey')} ${t('weekly.resetsIn')} <b data-timer="week">${duration(p.weekLeft())}</b></p>`);
    body.appendChild(head);
    const list = document.createElement('div');
    list.className = 'coin-list live-list';
    for (const m of ms) {
      const row = document.createElement('div');
      row.className = `coin-row${m.claimed ? ' claimed' : m.claimable ? ' highlight' : ''}`;
      row.innerHTML = `<div class="coin-big medal-wrap">${ico('target', 'red')}</div><div class="coin-row-text"><b>${t('weekly.reach', { n: m.at })}</b><span class="chips">${rewardLines(m.reward).map((l) => `<span class="chip">${lineHtml(l)}</span>`).join('')}</span></div>`;
      const btn = document.createElement('button');
      btn.className = m.claimed ? 'btn secondary small' : m.claimable ? 'btn c-green small' : 'btn secondary small';
      btn.disabled = !m.claimable;
      btn.innerHTML = m.claimed ? '<svg class="ic btn-glyph"><use href="#i-check"/></svg>' : m.claimable ? t('reward.claim') : `${formatNumber(Math.min(p.s.weekPts, m.at))}/${formatNumber(m.at)}`;
      btn.addEventListener('click', async () => {
        Audio.click();
        const lines = p.claimWeek(m.index);
        if (lines) await this.reveal(lines);
      });
      row.appendChild(btn);
      list.appendChild(row);
    }
    body.appendChild(list);
    body.insertAdjacentHTML('beforeend', `<p class="live-sub center">${t('weekly.hint', { n: LIVE.missions.points })}</p>`);
  }

  achText(a) {
    if (a.metric === 'highestExp') return t('ach.highestExp', { block: tileLabel(a.goal) });
    return t(`ach.${a.metric}`, { n: a.goal });
  }

  renderGoals(body) {
    const { p } = this;
    const list = document.createElement('div');
    list.className = 'coin-list live-list';
    const all = p.achievements().sort((a, b) => (b.claimable - a.claimable) || (a.complete - b.complete));
    for (const a of all) {
      const [icon, tone] = ACH_ICON[a.metric] || ['trophy', 'gold'];
      const row = document.createElement('div');
      row.className = `coin-row ach${a.complete ? ' claimed' : a.claimable ? ' highlight' : ''}`;
      const shown = a.metric === 'highestExp' ? (a.value >= a.goal ? 1 : 0) : Math.min(a.value, a.goal);
      const goal = a.metric === 'highestExp' ? 1 : a.goal;
      const stars = Array.from({ length: a.levels }, (_, i) => `<i class="${i < a.level ? 'on' : ''}"></i>`).join('');
      row.innerHTML = `
        <div class="coin-big medal-wrap">${medal(icon, tone)}</div>
        <div class="coin-row-text">
          <b>${a.complete ? t('ach.complete') : escapeHtml(this.achText(a))}</b>
          <span class="stars">${stars}</span>
          ${a.complete ? '' : `<div class="mini-bar"><i style="width:${Math.min(1, shown / goal) * 100}%"></i><span>${formatNumber(shown)}/${formatNumber(goal)}</span></div>`}
          ${a.complete ? '' : `<span class="chips">${rewardLines(a.reward).map((l) => `<span class="chip">${lineHtml(l)}</span>`).join('')}</span>`}
        </div>`;
      const btn = document.createElement('button');
      btn.className = a.claimable ? 'btn c-green small' : 'btn secondary small';
      btn.disabled = !a.claimable;
      btn.innerHTML = a.complete ? '<svg class="ic btn-glyph"><use href="#i-check"/></svg>' : t('reward.claim');
      btn.addEventListener('click', async () => {
        Audio.click();
        const lines = p.claimAchievement(a.id);
        if (lines) {
          Haptics.notification('success');
          await this.reveal(lines, { title: t('ach.title') });
        }
      });
      row.appendChild(btn);
      list.appendChild(row);
    }
    body.appendChild(list);
  }

  renderPass(body) {
    const { p } = this;
    const st = p.pass();
    const head = document.createElement('div');
    head.className = 'live-card-head pass-head';
    const claimAll = st.tiers.some((x) => x.free.claimable || x.premium.claimable);
    head.innerHTML = `
      <div class="live-head-row"><b>${t('pass.season', { n: st.season.number })}</b><span class="season-left">${ico('clock', 'grey')}<b data-timer="season">${duration(st.season.left)}</b></span></div>
      <div class="pass-level"><span class="tier-badge">${st.level}</span><div class="mini-bar big"><i style="width:${(st.inTier / st.per) * 100}%"></i><span>${st.level >= LIVE.pass.tiers ? t('pass.max') : `${st.inTier}/${st.per} ${t('live.xp')}`}</span></div></div>
      <p class="live-sub">${t('pass.howXp')}</p>
      <div class="pass-actions"></div>`;
    const actions = head.querySelector('.pass-actions');
    if (claimAll) {
      const b = document.createElement('button');
      b.className = 'btn c-green';
      b.textContent = t('pass.claimAll');
      b.addEventListener('click', async () => {
        Audio.click();
        const lines = p.claimAllPass();
        if (lines.length) await this.reveal(lines, { title: t('pass.title') });
      });
      actions.appendChild(b);
    }
    if (this.videos && p.capLeft('xp') > 0 && st.level < LIVE.pass.tiers) {
      const b = document.createElement('button');
      b.className = 'btn reward';
      b.innerHTML = `<span class="btn-icon"><svg class="ic"><use href="#i-video"/></svg></span><span>${t('pass.adXp', { n: LIVE.pass.xp.video })}</span>`;
      b.addEventListener('click', async () => {
        Audio.click();
        if (await this.watch('xp', 'pass:xp')) {
          p.addXp(LIVE.pass.xp.video);
          p.changed();
          toast(t('pass.xpAdded', { n: LIVE.pass.xp.video }), { icon: ico('star', 'purple') });
        }
      });
      actions.appendChild(b);
    }
    if (!actions.children.length) actions.remove();
    body.appendChild(head);
    // the web build has the free track only (the premium one was sold in the app)
    const prem = st.premium;
    const cols = document.createElement('div');
    cols.className = `pass-cols${prem ? '' : ' free-only'}`;
    cols.innerHTML = `<span>${t('pass.free')}</span><span></span><span class="prem">${ico('crown', 'gold')}${t('pass.premium')}</span>`;
    body.appendChild(cols);
    const list = document.createElement('div');
    list.className = `pass-list${prem ? '' : ' free-only'}`;
    for (const tier of st.tiers) {
      const row = document.createElement('div');
      row.className = `pass-row${tier.reached ? ' reached' : ''}`;
      const cell = (track, c) => {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = `pass-cell ${track}${c.claimed ? ' claimed' : c.claimable ? ' ready' : ''}${track === 'premium' && !st.premium ? ' locked' : ''}`;
        el.innerHTML = `<span class="rw-row">${rewardLines(c.reward).map((l) => lineHtml(l)).join('')}</span>${c.claimed ? `<span class="cell-check">${ico('check', 'green')}</span>` : ''}${track === 'premium' && !st.premium ? `<span class="cell-lock"><svg class="ic"><use href="#i-lock"/></svg></span>` : ''}`;
        el.addEventListener('click', async () => {
          Audio.click();
          if (c.claimable) {
            const lines = p.claimPass(track, tier.tier);
            if (lines) await this.reveal(lines, { title: t('pass.title') });
          } else if (!tier.reached) toast(t('pass.reachTier', { n: tier.tier }), { icon: ico('star', 'purple') });
        });
        return el;
      };
      row.appendChild(cell('free', tier.free));
      row.insertAdjacentHTML('beforeend', `<span class="tier-num">${tier.tier}</span>`);
      if (prem) row.appendChild(cell('premium', tier.premium));
      list.appendChild(row);
    }
    body.appendChild(list);
    // bring the current tier into view
    requestAnimationFrame(() => {
      const cur = list.children[Math.max(0, st.level - 1)];
      if (cur && st.level > 6 && body.scrollTop === 0) body.scrollTop = cur.offsetTop - body.clientHeight / 2;
    });
  }

  renderChests(body) {
    const { p, app } = this;
    void app;
    const inv = p.items();
    body.insertAdjacentHTML(
      'beforeend',
      `<div class="live-card-head inv"><b>${t('chests.yourHelpers')}</b><span class="inv-row">${HELPERS.map((id) => lineHtml({ type: id, n: inv[id] || 0 })).join('')}</span><p class="live-sub">${t('chests.helpersNote')}</p></div>`
    );
    const grid = document.createElement('div');
    grid.className = 'chest-grid';
    const card = (kind, title, sub, btn) => {
      const el = document.createElement('div');
      el.className = `chest-card ${kind}`;
      el.innerHTML = `${chestHtml(kind)}<b>${title}</b><small>${sub}</small>`;
      el.appendChild(btn);
      grid.appendChild(el);
      return el;
    };
    // free wooden chest
    const left = p.freeChestLeft();
    const freeBtn = document.createElement('button');
    if (left <= 0) {
      freeBtn.className = 'btn c-green small';
      freeBtn.textContent = t('chests.open');
      freeBtn.addEventListener('click', async () => {
        Audio.click();
        const contents = p.openFreeChest();
        if (contents) await this.reveal([{ type: 'chest', kind: 'wood', contents }], { title: t('chest.wood') });
      });
    } else if (this.videos && p.capLeft('chestNow') > 0) {
      freeBtn.className = 'btn reward small';
      freeBtn.innerHTML = `<span class="btn-icon"><svg class="ic"><use href="#i-video"/></svg></span><span>${t('chests.openNow')}</span>`;
      freeBtn.addEventListener('click', async () => {
        Audio.click();
        if (await this.watch('chestNow', 'chest:now')) {
          p.readyFreeChest();
          const contents = p.openFreeChest();
          if (contents) await this.reveal([{ type: 'chest', kind: 'wood', contents }], { title: t('chest.wood') });
        }
      });
    } else {
      freeBtn.className = 'btn secondary small';
      freeBtn.disabled = true;
      freeBtn.innerHTML = `<span data-timer="chest">${duration(left)}</span>`;
    }
    card('wood', t('chest.wood'), left <= 0 ? t('chests.freeReady') : t('chests.freeEvery', { n: LIVE.chests.freeEveryHours }), freeBtn);
    // silver for coins
    const sBtn = document.createElement('button');
    sBtn.className = 'btn buy small';
    sBtn.innerHTML = `<i class="coin-icon small"></i><span>${formatNumber(LIVE.chests.silverPrice)}</span>`;
    sBtn.addEventListener('click', async () => {
      Audio.click();
      if (!app.economy.canAfford(LIVE.chests.silverPrice)) {
        toast(t('chests.needCoins', { n: LIVE.chests.silverPrice - app.economy.coins }), { icon: ico('coin') });
        return;
      }
      const contents = p.buySilverChest();
      if (contents) await this.reveal([{ type: 'chest', kind: 'silver', contents }], { title: t('chest.silver') });
    });
    card('silver', t('chest.silver'), t('chests.forCoins'), sBtn);
    if (this.videos) {
      // silver for a video
      const vBtn = document.createElement('button');
      const vl = p.capLeft('chest');
      vBtn.className = vl > 0 ? 'btn reward small' : 'btn secondary small';
      vBtn.disabled = vl <= 0;
      vBtn.innerHTML = vl > 0 ? `<span class="btn-icon"><svg class="ic"><use href="#i-video"/></svg></span><span>${t('shop.watch')}</span>` : t('chests.tomorrow');
      vBtn.addEventListener('click', async () => {
        Audio.click();
        if (await this.watch('chest', 'chest:video')) {
          const contents = p.rollChest('silver', 'video');
          await this.reveal([{ type: 'chest', kind: 'silver', contents }], { title: t('chest.silver') });
        }
      });
      card('silver', t('chests.videoChest'), t('chests.leftToday', { n: vl }), vBtn);
    }
    // golden chests are earned: day 7 of the calendar, the pass and the goals
    card('gold', t('chest.gold'), t('chests.goldEarn'), Object.assign(document.createElement('button'), { className: 'btn secondary small', disabled: true, textContent: t('chests.earnIt') }));
    body.appendChild(grid);
    const odds = document.createElement('button');
    odds.type = 'button';
    odds.className = 'link-btn odds-link';
    odds.textContent = t('odds.link');
    odds.addEventListener('click', () => {
      Audio.click();
      this.showOdds('chests');
    });
    body.appendChild(odds);
  }
}
__exports.chestHtml = chestHtml;
__exports.duration = duration;
__exports.lineHtml = lineHtml;
__exports.rewardLines = rewardLines;
__exports.LiveUI = LiveUI;
});
// ---- main.js ----
__define("main.js", function (__exports) {
const { APP } = __import("config.js");
const { LANGS, STRINGS, setLanguage, translateDom } = __import("core/i18n.js");
const { Game } = __import("game/game.js");
const { Background, Renderer } = __import("render/renderer.js");
const { getSkin } = __import("render/tileSkins.js");
const { applyThemeCss, getTheme } = __import("render/themes.js");
const { AdsService } = __import("services/ads.js");
const { Analytics } = __import("services/analytics.js");
const { Audio } = __import("services/audio.js");
const { Economy } = __import("services/economy.js");
const { Haptics } = __import("services/haptics.js");
const { Progress } = __import("services/progress.js");
const { Storage } = __import("services/storage.js");
const { Web } = __import("services/web.js");
const { applyStage } = __import("ui/stage.js");
const { $, fitAll, hide } = __import("ui/dom.js");
const { HUD } = __import("ui/hud.js");
const { Screens, SettingsScreen } = __import("ui/screens.js");
const { Shop } = __import("ui/shop.js");
const { LiveUI } = __import("ui/live.js");

/**
 * The language a new player starts in: their first choice (the portal's locale on CrazyGames, else
 * the browser's), when the game speaks it; English otherwise.
 */
function webLanguage() {
  const code = String(Web.locale() || '').slice(0, 2).toLowerCase();
  return STRINGS[code] ? code : 'en';
}

/** Application shell: wires services, screens, input and the render loop together. */
class App {
  constructor() {
    this.storage = new Storage();
    this.economy = new Economy(this.storage);
    this.ads = new AdsService(this.storage);
    this.progress = new Progress(this.storage, this.economy, { videos: () => this.ads.rewardedOffered() });
    this.background = new Background($('#bg-canvas'));
    this.renderer = new Renderer($('#game-canvas'));
    this.game = new Game({ renderer: this.renderer, storage: this.storage, economy: this.economy });
    this.hud = new HUD(this);
    this.screens = new Screens(this);
    this.settings = new SettingsScreen(this);
    this.shop = new Shop(this);
    this.live = new LiveUI(this);
    this.mode = 'menu'; // menu | game
    this.lastFrame = 0;
    this.lastIdleDraw = 0;
  }

  async init() {
    this.started = true;
    await this.storage.init();
    this.progress.init();
    const s = this.storage.data.settings;
    this.useLanguage(s.lang || webLanguage());
    Audio.init(!!s.sound, s.music !== false);
    Haptics.init(!!s.haptics);
    this.renderer.hints = s.hints !== false;
    this.applyLook();
    applyStage();
    this.resize();
    window.addEventListener('resize', () => {
      this.resize();
      clearTimeout(this.fitTimer);
      this.fitTimer = setTimeout(() => {
        fitAll(document);
        if (this.hud.visible) this.hud.fitScore(true);
      }, 120);
    });
    window.addEventListener('orientationchange', () => setTimeout(() => {
      this.resize();
      fitAll(document);
    }, 150));
    if (window.ResizeObserver) new ResizeObserver(() => this.resize()).observe($('#game-area'));

    this.hud.init();
    this.screens.init();
    this.settings.init();
    this.shop.init();
    this.live.init();
    this.bindInput();
    this.bindLifecycle();
    this.bindProgress();
    this.game.on('gameover', (summary) => this.onGameOver(summary));

    // a power-up's first use each game is a rewarded video; without videos it costs coins
    this.game.adUses = () => this.ads.rewardedOffered();
    // the portal mutes every AudioContext during an ad; the game's own fade keeps it smooth
    Web.on('adstart', () => Audio.setDucked(true));
    Web.on('adend', () => Audio.setDucked(false));
    // CrazyGames turns rewarded videos on by itself once the portal enables ads: the offers appear
    Web.on('rewardedchange', () => this.onVideosChanged());

    this.screens.showMenu();
    requestAnimationFrame((t) => this.loop(t));
    // the first screen is up and answers input
    Web.loadingDone();
    Analytics.track('app_open', { platform: 'web' });
  }

  /** The portal started (or stopped) offering rewarded videos: every video offer on screen follows. */
  onVideosChanged() {
    this.live.refreshMenu();
    if (this.hud.visible) this.hud.updatePowerups();
    if (!$('#screen-shop').classList.contains('hidden')) this.shop.render();
  }

  /** Feeds the game's events to the missions, achievements and pass. */
  bindProgress() {
    const { game, progress } = this;
    game.on('turn', () => progress.onTurn());
    game.on('merge', (m) => progress.onMerge(m));
    game.on('score', (score) => progress.onScore(score));
    game.on('poweruses', () => progress.onHelperUsed());
    game.on('token', (id) => progress.take(id));
    this.economy.on('coins', (_balance, delta, reason) => progress.onCoins(delta, reason));
    this.ads.on('rewarded', () => progress.onVideo());
    // a rare big moment for the portal: the first 2s / 4s / 8s leave the game for good
    game.on('retire', () => Web.happytime());
  }

  applyLook() {
    const skin = getSkin(this.storage.data.skin);
    const theme = getTheme(this.storage.data.theme);
    this.renderer.setSkin(skin);
    this.renderer.setTheme(theme);
    this.background.setTheme(theme);
    applyThemeCss(theme);
    if (this.hud.visible) this.hud.updateNext();
  }

  /** Switch every word on screen to another language, right now, without a reload. */
  setLanguage(id) {
    this.storage.data.settings.lang = id;
    this.storage.save();
    this.useLanguage(id);
    this.screens.refreshMenu();
    this.screens.refreshPause();
    this.settings.refresh();
    if (this.hud.visible) this.hud.refresh();
    if (!$('#screen-shop').classList.contains('hidden')) this.shop.render();
    if (!$('#screen-live').classList.contains('hidden')) this.live.render(true);
    this.live.refreshMenu();
    fitAll(document);
  }

  useLanguage(id) {
    const lang = setLanguage(id);
    translateDom(document);
    const meta = LANGS.find((l) => l.id === lang);
    const label = $('#set-language-value');
    if (label && meta) label.textContent = meta.name;
    fitAll(document);
    // the canvas can only draw a font the page has already loaded
    if (lang === 'ru' && document.fonts && document.fonts.load) {
      document.fonts.load("700 32px 'Fredoka Variable'", 'КОМБО').catch(() => {});
    }
  }

  resize() {
    applyStage();
    this.background.resize();
    this.renderer.resize();
    this.hud.updateNext();
  }

  loop(t) {
    requestAnimationFrame((n) => this.loop(n));
    const real = this.lastFrame ? (t - this.lastFrame) / 1000 : 0.016;
    const dt = Math.min(0.05, real);
    this.lastFrame = t;
    // time on screen (the day / week turnover is checked from here too)
    if (!document.hidden) this.progress.tick(Math.min(1, real));
    this.game.update(t, dt);
    this.background.draw(t);
    if (this.mode !== 'game' && !this.game.busy) {
      if (t - this.lastIdleDraw < 100) return;
      this.lastIdleDraw = t;
    }
    this.renderer.draw(this.game, t);
  }

  // ---------------------------------------------------------------------------
  bindInput() {
    const canvas = $('#game-canvas');
    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    let active = null;
    canvas.addEventListener('pointerdown', (e) => {
      if (this.mode !== 'game' || active !== null) return;
      e.preventDefault();
      this.playerInput();
      const p = pos(e);
      if (this.game.hammerMode) {
        const cell = this.renderer.cellAt(p.x, p.y);
        if (cell) this.game.hammerAt(cell.c, cell.r);
        return;
      }
      active = e.pointerId;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      this.game.pointerDown(p.x);
    });
    canvas.addEventListener('pointermove', (e) => {
      // desktop: the hovering block follows the mouse to the column under it; a click drops it there
      if (active === null && e.pointerType === 'mouse') {
        const g = this.game;
        if (this.mode === 'game' && !g.dragging && !g.hammerMode && g.canInteract()) g.hoverTarget = this.renderer.colAt(pos(e).x);
        return;
      }
      if (e.pointerId !== active) return;
      this.game.pointerMove(pos(e).x);
    });
    canvas.addEventListener('pointerup', (e) => {
      if (e.pointerId !== active) return;
      active = null;
      this.game.pointerUp(pos(e).x);
    });
    canvas.addEventListener('pointercancel', (e) => {
      if (e.pointerId !== active) return;
      active = null;
      this.game.pointerCancel();
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    // a mouse click leaves its button focused, and Space / Enter would then click it again:
    // the keyboard drives the board, so buttons give their focus back once clicked
    document.addEventListener('click', (e) => {
      const b = e.target && e.target.closest && e.target.closest('button');
      if (b && document.activeElement === b) b.blur();
    });

    window.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const dialogOpen = !$('#dialog').classList.contains('hidden') || !$('#live-modal').classList.contains('hidden') || !$('#screen-live').classList.contains('hidden');
      const shopOpen = !$('#screen-shop').classList.contains('hidden');
      const settingsOpen = !$('#screen-settings').classList.contains('hidden');
      if (e.key === 'Escape') {
        if (dialogOpen) return;
        this.onBack();
        return;
      }
      const go = e.key === 'Enter' || e.key === ' ';
      // the title screen: Enter / Space plays (Continue when a game is saved)
      if (go && this.mode === 'menu' && !dialogOpen && !shopOpen && !settingsOpen && !e.repeat) {
        e.preventDefault();
        const cont = $('#btn-continue');
        (cont && !cont.classList.contains('hidden') ? cont : $('#btn-play')).click();
        return;
      }
      // the results: Enter plays again, P / Escape-free resume from the pause card
      if (this.mode === 'game' && !dialogOpen && !shopOpen && !settingsOpen && !e.repeat) {
        if (e.key === 'Enter' && !$('#screen-gameover').classList.contains('hidden')) {
          e.preventDefault();
          $('#go-restart').click();
          return;
        }
        if ((go || e.key === 'p') && this.game.paused && !$('#screen-pause').classList.contains('hidden')) {
          e.preventDefault();
          Audio.click();
          this.resume();
          return;
        }
      }
      if (this.mode !== 'game' || dialogOpen || shopOpen || settingsOpen || this.game.paused) return;
      if (this.game.state !== 'gameover' && /^(Arrow(Left|Right|Down)|[ adsjhuADSJHU1-5]|Enter)$/.test(e.key)) this.playerInput();
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
          this.game.moveHover(-1);
          break;
        case 'ArrowRight':
        case 'd':
          this.game.moveHover(1);
          break;
        case 'ArrowDown':
        case ' ':
        case 'Enter':
        case 's':
          e.preventDefault();
          this.game.dropHere();
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
          this.game.hoverTarget = Number(e.key) - 1;
          this.game.drop(Number(e.key) - 1);
          break;
        case 'p':
          this.pause();
          break;
        case 'h':
          this.hud.onPowerup('hammer');
          break;
        case 'j':
          this.hud.onPowerup('joker');
          break;
        case 'u':
          this.hud.onPowerup('undo');
          break;
        default:
          break;
      }
    });
  }

  /**
   * Leaving the tab saves the game (with the running board). The game is turn-based - nothing
   * moves while the player is away - so it is not paused: the portal handles tab switches itself.
   */
  bindLifecycle() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.mode === 'game') this.game.autosave(true);
        this.storage.save(true);
      }
    });
    window.addEventListener('pagehide', () => {
      if (this.mode === 'game') this.game.autosave(true);
      this.storage.save(true);
    });
  }

  /** A real input on the board (drop, aim, power-up): the portal's gameplay starts with it. */
  playerInput() {
    if (this.mode !== 'game' || this.game.paused || this.game.state === 'gameover' || this.game.state === 'menu') return;
    if (!$('#screen-gameover').classList.contains('hidden') || !$('#screen-pause').classList.contains('hidden')) return;
    Web.gameplayStart();
  }

  onBack() {
    if (!$('#live-modal').classList.contains('hidden')) return undefined;
    if (!$('#screen-live').classList.contains('hidden')) return this.live.close();
    if (!$('#screen-shop').classList.contains('hidden')) return this.closeShop();
    if (!$('#screen-settings').classList.contains('hidden')) return this.closeSettings();
    if (this.mode === 'game') {
      if (!$('#screen-pause').classList.contains('hidden')) return this.resume();
      if ($('#screen-gameover').classList.contains('hidden')) return this.pause();
    }
    return undefined;
  }

  // ---------------------------------------------------------------------------
  /** Play / Continue from the title screen: a natural break comes first (the portal decides). */
  async playFromMenu(resume) {
    if (this.leaving) return;
    this.leaving = true;
    try {
      await this.ads.breakBetweenGames(resume ? 'continue' : 'play');
      this.startGame(resume);
    } finally {
      this.leaving = false;
    }
  }

  /** Starts (or resumes) a game. The portal's gameplay starts with the player's first input. */
  startGame(resume) {
    this.screens.hideMenu();
    this.screens.hideGameOver();
    this.screens.hidePause();
    this.shop.close();
    this.settings.hide();
    hide('#screen-live');
    this.mode = 'game';
    const resumed = resume && this.game.resumeSavedGame();
    if (!resumed) this.game.newGame();
    this.hud.show();
    Analytics.track('game_start', { resumed: !!resumed });
  }

  /**
   * THE HAND-OVER BETWEEN GAMES: a natural break, so the portal is asked for an ad here.
   * `to` is 'new' (Play again / Restart / New game) or 'home' (Home from the results).
   */
  async leaveGame(to) {
    if (this.leaving) return;
    this.leaving = true;
    Web.gameplayStop();
    try {
      await this.ads.breakBetweenGames(to === 'home' ? 'home' : 'new-game');
      if (to === 'home') this.goHome();
      else this.startGame(false);
    } finally {
      this.leaving = false;
    }
  }

  goHome() {
    Web.gameplayStop();
    this.game.leaveToMenu();
    this.hud.hide();
    this.mode = 'menu';
    this.screens.showMenu();
  }

  pause() {
    if (this.mode !== 'game' || this.game.state === 'gameover' || this.game.state === 'menu') return;
    Web.gameplayStop();
    this.game.pause();
    this.screens.showPause();
  }

  /** Resume is the player's own input: gameplay goes on at once. */
  resume() {
    this.screens.hidePause();
    this.game.unpause();
    this.playerInput();
  }

  openShop(tab) {
    if (this.mode === 'game' && $('#screen-pause').classList.contains('hidden') && $('#screen-gameover').classList.contains('hidden')) this.pause();
    this.shop.open(tab);
  }

  closeShop() {
    this.shop.close();
    this.screens.refreshMenu();
    if (this.hud.visible) this.hud.refresh();
  }

  openSettings() {
    if (this.mode === 'game' && $('#screen-pause').classList.contains('hidden') && $('#screen-gameover').classList.contains('hidden')) this.pause();
    this.settings.show();
  }

  closeSettings() {
    this.settings.hide();
    this.screens.refreshMenu();
    this.screens.refreshPause();
  }

  setSetting(key, value) {
    this.storage.data.settings[key] = value;
    this.storage.save();
    if (key === 'sound') Audio.setEnabled(value);
    if (key === 'music') Audio.setMusic(value);
    if (key === 'haptics') Haptics.enabled = value;
    if (key === 'hints') this.renderer.hints = value;
  }

  async onGameOver(summary) {
    Web.gameplayStop();
    Analytics.track('game_over', { score: summary.score, best: summary.isNewBest });
    // a new record beats an earlier one (the very first game's score is not a moment)
    if (summary.isNewBest && summary.prevBest > 0) Web.happytime();
    this.progress.onGameOver(summary, this.game.gameId);
    // the break between games is asked for when the player leaves the results (Play again /
    // Home), so it never covers the Continue / Double coins offers or a revived game
    this.screens.showGameOver(summary);
  }

  async resetAll() {
    await this.storage.reset();
    window.location.reload();
  }
}

const app = new App();
window.Tumblio = { app, version: APP.version };
// the layout is set at once (the title screen shows while the portal SDK starts); the saves are read
// only after it: on CrazyGames localStorage becomes the cloud-synced Data module then
applyStage();
Web.whenReady()
  .then(() => app.init())
  .catch((err) => {
    console.error('Tumblio failed to start', err);
    const el = document.createElement('pre');
    el.style.cssText = 'position:fixed;inset:0;z-index:99;background:#fff;color:#c00;padding:20px;white-space:pre-wrap;font:14px monospace';
    el.textContent = `Tumblio failed to start:\n${err && err.stack ? err.stack : err}`;
    document.body.appendChild(el);
  });
// until init has its own handler, a resize keeps the title screen's layout right
window.addEventListener('resize', () => {
  if (!app.started) applyStage();
});
});
})();