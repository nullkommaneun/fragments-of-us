// src/main.js — robuster Bootstrap mit klarer Diagnose, wenn Preflight nicht lädt

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
function showFatal(title, diagnosticText) {
  $sum.innerHTML = pfRow(title, 'fail', 'Siehe Details unten');
  $det.innerHTML = pfDetail('Diagnose', diagnosticText);
  $start.disabled = true;
  $retry.style.display = '';
}

// erzeugt robuste Kandidaten-URLs für Preflight relativ zu main.js & Seite
function getPreflightCandidates() {
  const relFromMain = new URL('./core/Preflight.js', import.meta.url).href;
  const relFromPage = new URL('src/core/Preflight.js', location.href).href;
  const relAltCase  = new URL('src/core/preflight.js', location.href).href; // falls Dateiname versehentlich klein geschrieben wurde
  return [relFromMain, relFromPage, relAltCase];
}

async function tryFetch(url) {
  try {
    const r = await fetch(url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now(), { cache: 'no-store' });
    return { ok: r.ok, status: r.status, statusText: r.statusText, url };
  } catch (e) {
    return { ok: false, status: 0, statusText: String(e), url };
  }
}

async function loadPreflightSafe() {
  const candidates = getPreflightCandidates();
  const log = [];

  // 1) Erreichbarkeit testen
  for (const url of candidates) {
    const res = await tryFetch(url);
    log.push(`HEAD ${res.ok ? 'OK' : 'FAIL'} ${res.status} ${res.statusText} — ${res.url}`);
    if (!res.ok) continue;

    // 2) dynamisch importieren (mit Cache-Bust)
    const bust = (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
    try {
      const mod = await import(url + bust);
      if (mod && typeof mod.runPreflight === 'function') {
        return { run: mod.runPreflight, picked: url, log };
      } else {
        log.push(`Import OK, aber runPreflight() nicht gefunden — ${url}`);
      }
    } catch (e) {
      log.push(`Import-Fehler — ${url}\n${e?.stack || e?.message || String(e)}`);
    }
  }

  throw new Error(log.join('\n'));
}

(async () => {
  try {
    $sum.innerHTML = pfRow('Bootstrap', 'ok', 'Lade Preflight…');

    const { run, picked, log } = await loadPreflightSafe();
    $det.innerHTML = pfDetail('Import-Pfad gewählt', picked) + (log.length ? pfDetail('Protokoll', log.join('\n')) : '');

    // Preflight ausführen
    await run(ctx);

    // Start/Retry binden
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
        showFatal('Engine-Start fehlgeschlagen', err?.stack || err?.message || String(err));
      }
    });

    $retry.addEventListener('click', () => location.reload());

  } catch (err) {
    showFatal('Preflight konnte nicht geladen werden',
      (err && (err.stack || err.message)) ? (err.stack || err.message) : String(err));
  }
})();