import { runPreflight } from './core/Preflight.js';

const ctx = {
  root: document.getElementById('app'),
  ui: { hud: document.getElementById('hud'), fps: document.getElementById('hud-fps'), mem: document.getElementById('hud-mem') },
  env: {
    isProd: location.hostname !== 'localhost',
    cdn: {
      // Stabil & schnell; bei Bedarf Version anpassen:
      three: 'https://unpkg.com/three@0.164.1/build/three.module.js'
    }
  },
  caps: {},
  modules: {}, // wird vom Preflight befüllt
  state: {}
};

(async () => {
  const res = await runPreflight(ctx);
  // Start-Button steuert den Übergang ins Spiel
  document.getElementById('pf-start').addEventListener('click', async () => {
    // Module initialisieren (sicher nach Preflight)
    await ctx.modules.State.init(ctx);
    await ctx.modules.Graphics.init(ctx);
    await ctx.modules.Input.init(ctx);
    await ctx.modules.UI.init(ctx);

    // HUD zeigen, Preflight ausblenden
    document.getElementById('preflight').style.display = 'none';
    ctx.ui.hud.hidden = false;

    // Los geht's
    ctx.modules.Graphics.start();
  });

  // Falls hart fehlgeschlagen: Retry zulassen
  document.getElementById('pf-retry').addEventListener('click', async () => {
    location.reload();
  });
})();