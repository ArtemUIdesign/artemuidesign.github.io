/* KABLAST — the level system. The well is a stack of 1 000 m levels; each has a look, a mechanic and a pacing
   wave (RELIEF → NORMAL → GATE). Everything else asks this module two questions:
     KABLAST.levels.at(m)    → which level / phase / mechanics are active at height m
     KABLAST.levels.dEff(m)  → the effective difficulty there (long ramp × pacing wave) */
KABLAST.levels = (() => {
  const ROMAN = ['', '', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const C = () => KABLAST.CFG.levels;

  // level definition for a 0-based level index; after the first pass, levels cycle with two mechanics at once
  function defAt(index) {
    const L = C(), order = L.order;
    if (index < order.length) { const def = L.defs[order[index]]; return { def, key: order[index], mech: def.mech.slice(), suffix: '' }; }
    const cycle = order.length - 1, k = index - order.length;             // skip 'well' when cycling
    const ka = order[1 + (k % cycle)], a = L.defs[ka], b = L.defs[order[1 + ((k + 4) % cycle)]];
    const mech = [...new Set([...a.mech, ...b.mech])];
    const round = Math.floor(k / cycle) + 2;
    return { def: a, key: ka, mech, suffix: ' ' + (ROMAN[Math.min(round, ROMAN.length - 1)] || round) };
  }

  const cache = { m: -1, lv: null };
  function at(m) {
    if (cache.lv && Math.abs(cache.m - m) < 0.001) return cache.lv;
    const L = C(), len = L.lengthM;
    const index = Math.max(0, Math.floor(m / len));
    const startM = index * len, endM = startM + len, t = Math.max(0, Math.min(1, (m - startM) / len));
    const { def, key, mech, suffix } = defAt(index);
    const bonus = index > 0 && index % L.bonusEvery === 0 && (m - startM) < L.bonusLenM;
    const noGate = index < (L.noGateLevels || 1);                           // level 1 is the tutorial: no gate
    const phase = bonus ? 'bonus' : t < L.reliefFrac ? 'relief' : (t < L.gateFrac || noGate) ? 'normal' : 'gate';
    const hasBonus = index > 0 && index % L.bonusEvery === 0;
    const lv = { index, num: index + 1, def, key, suffix, name: def.name + suffix, hint: def.hint, mech: bonus ? [] : mech, allMech: mech,
                 startM, endM, t, phase, bonus, hasBonus, palette: bonus ? L.bonus.bg : def.bg,
                 boundaryM: (hasBonus && !bonus) ? startM + L.bonusLenM : startM };   // where the current look began
    cache.m = m; cache.lv = lv;
    return lv;
  }
  const has = (lv, k) => lv.mech.indexOf(k) >= 0;

  // effective difficulty: the long ramp KABLAST.difficulty(m) shaped by the level's pacing wave
  function dEff(m, reliefUntilM) {
    const L = C(), U = KABLAST.U, base = KABLAST.difficulty(m), lv = at(m);
    if (reliefUntilM !== undefined && m < reliefUntilM) return base * L.reliefMul;
    if (lv.phase === 'bonus') return 0;
    if (lv.phase === 'relief') return base * L.reliefMul;
    if (lv.phase === 'gate') return Math.min(1, base + U.lerp(L.gateBoost0, L.gateBoost1, base));
    const k = Math.min(1, (lv.t - L.reliefFrac) / (L.gateFrac - L.reliefFrac) * 1.6);   // climb back to base over the middle
    return base * U.lerp(L.reliefMul, 1, k);
  }
  // Dark speed multiplier for the phase at m
  function darkMul(m, reliefUntilM) {
    const L = C(), lv = at(m);
    if (reliefUntilM !== undefined && m < reliefUntilM) return L.reliefDarkMul;
    return lv.phase === 'bonus' ? L.bonusDarkMul : lv.phase === 'relief' ? L.reliefDarkMul : lv.phase === 'gate' ? L.gateDarkMul : 1;
  }
  return { at, dEff, darkMul, has, defAt };
})();
