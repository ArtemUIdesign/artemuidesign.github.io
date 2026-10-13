/* KABLAST — boot. */
(function () {
  // the canvas draws popups in the display face; ask for it now so the first popup never falls back
  try { if (document.fonts && document.fonts.load) { document.fonts.load('20px "Lilita One"').catch(() => {}); } } catch (e) {}
  function start() { try { KABLAST.game.boot(); } catch (e) { console.error('[KABLAST] boot failed', e); } }
  // Web portals: the save is read only once the portal SDK is ready (on CrazyGames the adapter then maps localStorage
  // onto the cloud-synced Data module), so nothing touches storage before WebPlatform.whenReady resolves.
  function ready() { (window.WebPlatform ? window.WebPlatform.whenReady : Promise.resolve()).then(start, start); }
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(ready, 0);
  else window.addEventListener('DOMContentLoaded', ready);
})();
