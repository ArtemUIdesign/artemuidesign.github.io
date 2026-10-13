/* KABLAST — haptics on the web: navigator.vibrate on touch devices that have it (Android browsers), nothing on desktop
   or iOS Safari. Called only after the player has touched the page (browsers refuse vibration before that). */
KABLAST.haptics = (() => {
  const touch = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  const can = () => touch && typeof navigator.vibrate === 'function' &&
    (!navigator.userActivation || navigator.userActivation.hasBeenActive);
  function ok() { return KABLAST.save.data.settings.haptics && can(); }
  function buzz(p) { try { navigator.vibrate(p); } catch (e) {} }
  let last = 0;
  function impact(style = 'medium') {
    if (!ok()) return;
    const now = performance.now(); if (now - last < 40) return; last = now; // don't spam the motor
    buzz(style === 'heavy' ? 28 : style === 'light' ? 6 : 14);
  }
  function notify(type = 'success') {
    if (!ok()) return;
    buzz(type === 'error' ? [30, 40, 60] : [10, 30, 10]);
  }
  function selection() {}
  // the Settings switch is shown only where vibration can work at all
  const supported = () => touch && typeof navigator.vibrate === 'function';
  return { impact, notify, selection, supported };
})();
