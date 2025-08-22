// src/main.js — robuster Bootstrap mit Diagnose, wenn Preflight nicht lädt

const ctx = {
  root: document.getElementById('app'),
  ui: {
    hud: document.getElementById('hud'),
    fps: document.getElementById('hud-fps'),
    mem: document.getElementById('hud-mem'),
  },
  env: {
    isProd: location.hostname !== 'localhost',
    cdn: {
      three: 'https://unpkg.com/three@0.164.1/build/three.module.js'
    }
  },
  caps: {},
  modules: {},
  state: {}
};

// Preflight-Panel-Refs
const $sum   = document.getElementById('pf-summary');
const $det   = document.getElementById('pf-details');
const $start = document.getElementById('pf-start');
const $retry = document.getElementById('pf-retry');

function pfRow(label, status = 'fail', detail = '') {
  const icon = status === 'ok' ? '✓' : status === 'warn' ? '⚠' : '✖';
  return `<div class="pf__row">
    <div class="pf__label">${label}</div>
    <div class="pf__status ${status}">${icon} ${status.toUpperCase()}</div>
    <div style="text-align:right;color:#8ea1b2">${detail}</div>
  </div>`;
}
function pfDetail(title, text) {
  return `<div class="pf__detailBlock"><h3>${title}</h3><pre>${text}</pre></div>`;
}
function showFatal(title, err) {
  $sum.innerHTML = pfRow(title, 'fail', 'Siehe Details unten');
  $det.innerHTML = pfDetail('Diagnose', (err && (err.stack || err.message || String(err))) || 'Unbekannter Fehler');
  $start.disabled = true;
  $retry.style.display = '';
}

async function loadPreflightSafe() {
  const path = './core/Preflight.js';
  // 1) Existenz/Erreichbarkeit prüfen (Case-Sensitivity auf GH Pages!)
  try {
    const r = await fetch(path + '?v=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status} – ${r.statusText}`);
  } catch (e) {
    throw new Error(`Preflight-Datei nicht erreichbar (${path}).\n${e?.message || e}`);
  }
  // 2) Modul dynamisch importieren (mit Cache-Bust)
  try {
    const mod = await import(path + '?v=' + Date.now());
    if (!mod || typeof mod.runPreflight !== 'function') {
      throw new Error('runPreflight() nicht exportiert.');
    }
    return mod.runPreflight;
  } catch (e) {
    throw new Error(`Preflight-Import fehlgeschlagen (${path}).\n${e?.message || e}`);
  }
}

(async () => {
  try {
    // Hinweis in die Box, damit sichtbar ist, dass etwas passiert
    $sum.innerHTML = pfRow('Bootstrap', 'ok', 'Lade Preflight…');

    const runPreflight = await loadPreflightSafe();

    // Preflight ausführen
    await runPreflight(ctx);

    // Start/Retry binden (erst nach erfolgreichem Preflight sinnvoll)
    $start.addEventListener('click', async () => {
      try {
        await ctx.modules.State.init(ctx);
        await ctx.modules.Graphics.init(ctx);
        await ctx.modules.Input.init(ctx);
        await ctx.modules.UI.init(ctx);

        document.getElementById('preflight').style.display = 'none';
        ctx.ui.hud.hidden = false;

        ctx.modules.Graphics.start();
      } catch (err) {
        showFatal('Engine-Start fehlgeschlagen', err);
      }
    });

    $retry.addEventListener('click', () => location.reload());

  } catch (err) {
    showFatal('Preflight konnte nicht geladen werden', err);
  }
})();