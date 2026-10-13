/* KABLAST — orb skins. `price` = shards. The few `premium` ones (paid items in the iOS build) cost more shards and
   never drop from chests. */
KABLAST.skins = (() => {
  const list = [
    { id: 'nova',   name: 'Nova',        core: '#ffffff', halo: '#3ef2ff', trail: '#3ef2ff', price: 0 },
    { id: 'ember',  name: 'Ember',       core: '#fff2c8', halo: '#ff7a1a', trail: '#ff3d00', price: 150 },
    { id: 'toxic',  name: 'Toxic',       core: '#eaffd0', halo: '#7cff3a', trail: '#2bff6a', price: 150 },
    { id: 'rose',   name: 'Rose',        core: '#fff0f6', halo: '#ff4fd8', trail: '#ff2a9d', price: 200 },
    { id: 'ultra',  name: 'Ultraviolet', core: '#f3e8ff', halo: '#a96bff', trail: '#6a2bff', price: 250 },
    { id: 'ice',    name: 'Glacier',     core: '#ffffff', halo: '#b9f6ff', trail: '#6fd8ff', price: 300 },
    { id: 'sunset', name: 'Sunset',      core: '#fff7e0', halo: '#ffb347', trail: '#ff5e8a', price: 400 },
    { id: 'plasma', name: 'Plasma',      core: '#ffffff', halo: '#ff2bd6', trail: '#2bd6ff', price: 600 },
    { id: 'gold',   name: 'Solar Gold',  core: '#fffbe6', halo: '#ffd23f', trail: '#ff9f1c', price: 1500, premium: true },
    { id: 'void',   name: 'Void',        core: '#0a0a12', halo: '#ffffff', trail: '#c0c0ff', price: 1400 },
    { id: 'mint',   name: 'Mint',        core: '#f0fff8', halo: '#5dffc3', trail: '#26d9a0', price: 200 },
    { id: 'cotton', name: 'Cotton Candy', core: '#ffffff', halo: '#ff9ad5', trail: '#9ad5ff', price: 300 },
    { id: 'magma',  name: 'Magma Heart', core: '#fff1d0', halo: '#ff5a1f', trail: '#ffb000', price: 350 },
    { id: 'star',   name: 'Starlight',   core: '#ffffff', halo: '#fff5b0', trail: '#ffffff', price: 450 },
    { id: 'aurora', name: 'Aurora',      core: '#ffffff', halo: '#00ffb3', trail: '#7a5cff', price: 1800, premium: true, cycle: true },
    // --- added in 1.1 ---
    { id: 'ember2', name: 'Blood Orange', core: '#fff0e0', halo: '#ff5722', trail: '#ff1744', price: 350 },
    { id: 'deep',   name: 'Deep Sea',    core: '#e8fbff', halo: '#0091ea', trail: '#00bfa5', price: 400 },
    { id: 'bone',   name: 'Bone',        core: '#fffdf2', halo: '#e8e0c8', trail: '#b8ad8f', price: 500 },
    { id: 'venom',  name: 'Venom',       core: '#f2ffe8', halo: '#aeea00', trail: '#64dd17', price: 550 },
    { id: 'eclipse', name: 'Eclipse',    core: '#1a0a2e', halo: '#ffd23f', trail: '#ff6d00', price: 1800, premium: true },
  ];
  const byId = Object.fromEntries(list.map(s => [s.id, s]));
  function current() { return byId[KABLAST.save.data.skin] || list[0]; }
  function owned(id) { return KABLAST.save.data.owned.indexOf(id) >= 0; }
  function select(id) { if (owned(id)) { KABLAST.save.data.skin = id; KABLAST.save.write(); return true; } return false; }
  function grant(id) { if (!owned(id)) { KABLAST.save.data.owned.push(id); KABLAST.save.write(); } }
  // Aurora cycles its hue over time; other skins are static. The hue moves in 10° steps and comes back as hex:
  // every glow and orb sprite is cached by its colour, so a continuous hsl() string here would mint new sprites
  // every frame (and hsl() cannot be mixed or given an alpha). 36 steps is smooth to the eye and a bounded cache.
  const STEP = 10, cyc = new Map();
  function liveColors(skin, t) {
    if (!skin.cycle) return skin;
    const h = Math.round(((t * 40) % 360) / STEP) * STEP % 360;
    let c = cyc.get(h);
    if (!c) { c = { core: skin.core, halo: KABLAST.U.hslHex(h, 100, 65), trail: KABLAST.U.hslHex(h + 60, 100, 60) }; cyc.set(h, c); }
    return c;
  }
  return { list, byId, current, owned, select, grant, liveColors };
})();
