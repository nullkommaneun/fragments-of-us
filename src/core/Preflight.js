// src/core/Preflight.js
// Modul-Ladevorgang + Systemchecks + übersichtliches Preflight-Panel.
// Zeigt Status-Badges, ausführliche Diagnosen und setzt bei Bedarf Scroll-Lock-Fixes.

import { detectCaps } from './Caps.js';
import { loadModules } from './ModuleLoader.js';

function icon(status) {
  return status === 'ok' ? '✓' : status === 'warn' ? '⚠' : '✖';
}
function row(label, status, detail = '') {
  return `<div class="pf__row">
    <div class="pf__label">${label}</div>
    <div class="pf__status ${status}">${icon(status)} ${status.toUpperCase()}</div>
    <div style="text-align:right;color:#8ea1b2">${detail}</div>
  </div>`;
}
function detailBlock(title, text) {
  return `<div class="pf__detailBlock"><h3>${title}</h3><pre>${text}</pre></div>`;
}

// Laufzeit-Fix, wenn Scroll-/Viewport-Policies fehlen (z. B. iOS/Safari-Fälle)
function applyScrollLockRuntimeFix() {
  const html = document.documentElement;
  const body = document.body;
  const app  = document.getElementById('app');

  body.style.position = 'fixed';
  body.style.top = body.style.left = body.style.right = body.style.bottom = '0';
  body.style.width = '100%';
  body.style.overflow = 'hidden';
  body.style.touchAction = 'none';

  html.style.overflow = 'hidden';
  html.style.setProperty('overscroll-behavior', 'none');
  body.style.setProperty('overscroll-behavior', 'none');

  if (app) app.style.touchAction = 'none';
}

const PF = {
  checks: [
    // 0) Ist das Stylesheet geladen? (falls nicht: WARN; Critical-CSS springt ein)
    {
      id: 'css', label: 'Stylesheet (styles.css)', required: true,
      run: async () => {
        const link = document.querySelector('link[rel="stylesheet"][href$="styles.css"]');
        let ok = false, detail = '';
        try {
          ok = !!(link && link.sheet);
          detail = link ? (link.href + (window.__STYLE_FAIL ? ' · onerror' : '')) : 'link not found';
        } catch (e) {
          detail = 'cannot inspect stylesheet: ' + e;
        }
        return { ok, warn: !ok, detail };
      }
    },

    // 1) ES-Module
    {
      id: 'esmodules', label: 'ES Modules', required: true,
      run: async () => { await import('data:text/javascript,export default 1'); return { ok: true, detail: 'dynamic import ok' }; }
    },

    // 2) Rendering-Fähigkeiten
    { id: 'webgl2', label: 'WebGL2', required: false, run: async (ctx) => ({ ok: !!ctx.caps.webgl2, detail: ctx.caps.webgl2 ? 'supported' : 'not supported' }) },
    { id: 'webgl1', label: 'WebGL (Fallback)', required: true, run: async (ctx) => ({ ok: !!ctx.caps.webgl1, detail: ctx.caps.webgl1 ? 'supported' : 'no webgl context' }) },

    // 3) Browser-Basics
    { id: 'pointer', label: 'Pointer Events', required: true, run: async () => ({ ok: !!window.PointerEvent, detail: String(!!window.PointerEvent) }) },
    { id: 'localstorage', label: 'LocalStorage', required: false, run: async () => { localStorage.setItem('__pf','1'); localStorage.removeItem('__pf'); return { ok: true, detail: 'rw ok' }; } },
    { id: 'audio', label: 'AudioContext', required: false,
      run: async () => {
        try {
          const C = window.AudioContext || window.webkitAudioContext;
          if (!C) return { ok: false, detail: 'no AudioContext' };
          const ac = new C({ latencyHint: 'interactive' }); await ac.close();
          return { ok: true, detail: 'supported' };
        } catch (e) {
          return { ok: false, detail: String(e) };
        }
      }
    },

    // 4) Scroll-/Viewport-Guard inkl. Diagnose & Auto-Fix (relevant für Mobile)
    {
      id: 'scroll', label: 'Scroll-Lock/Viewport', required: true,
      run: async () => {
        const meta = document.querySelector('meta[name="viewport"]');
        const content = (meta && meta.getAttribute('content')) || '';
        const hasMax1   = /maximum-scale\s*=\s*1/i.test(content);
        const hasNoScale= /user-scalable\s*=\s*no/i.test(content);
        const okMeta = hasMax1 && hasNoScale;

        const css = (el, prop) => getComputedStyle(el).getPropertyValue(prop);
        const overflowRoot = css(document.documentElement, 'overflow').trim();
        const overflowBody = css(document.body, 'overflow').trim();
        const overflowOk = ['hidden', 'clip'].includes(overflowRoot) && ['hidden', 'clip'].includes(overflowBody);

        const supportsOB = (typeof CSS !== 'undefined') && CSS.supports && CSS.supports('overscroll-behavior: none');
        const obRoot = css(document.documentElement, 'overscroll-behavior').trim();
        const obBody = css(document.body, 'overscroll-behavior').trim();
        const obehOk = supportsOB ? (['none','contain'].includes(obRoot) || ['none','contain'].includes(obBody)) : true;

        const taRoot = css(document.documentElement, 'touch-action').trim();
        const taBody = css(document.body, 'touch-action').trim();
        const appEl  = document.getElementById('app');
        const taApp  = appEl ? css(appEl, 'touch-action').trim() : '';
        const taOk = [taRoot, taBody, taApp].some(v => (v || '').includes('none'));

        const okInitial = okMeta && overflowOk && taOk && obehOk;
        const diagBefore = {
          metaViewport: content, okMeta,
          overflowRoot, overflowBody, overflowOk,
          supportsOverscrollBehavior: !!supportsOB, obRoot, obBody, obehOk,
          touchAction: { root: taRoot, body: taBody, app: taApp }, taOk
        };

        if (okInitial) return { ok: true, detail: JSON.stringify(diagBefore, null, 2) };

        // Auto-Fix anwenden und erneut prüfen
        applyScrollLockRuntimeFix();

        const overflowRoot2 = css(document.documentElement, 'overflow').trim();
        const overflowBody2 = css(document.body, 'overflow').trim();
        const obRoot2 = css(document.documentElement, 'overscroll-behavior').trim();
        const obBody2 = css(document.body, 'overscroll-behavior').trim();
        const taRoot2 = css(document.documentElement, 'touch-action').trim();
        const taBody2 = css(document.body, 'touch-action').trim();
        const taApp2  = appEl ? css(appEl, 'touch-action').trim() : '';

        const overflowOk2 = ['hidden', 'clip'].includes(overflowRoot2) && ['hidden', 'clip'].includes(overflowBody2);
        const obehOk2 = supportsOB ? (['none','contain'].includes(obRoot2) || ['none','contain'].includes(obBody2)) : true;
        const taOk2 = [taRoot2, taBody2, taApp2].some(v => (v || '').includes('none'));

        const okAfter = okMeta && overflowOk2 && taOk2 && obehOk2;

        const diagAfter = {
          appliedFix: true,
          before: diagBefore,
          after: {
            overflowRoot: overflowRoot2, overflowBody: overflowBody2,
            obRoot: obRoot2, obBody: obBody2,
            touchAction: { root: taRoot2, body: taBody2, app: taApp2 }
          }
        };

        // Wenn Fix greift: WARN (zeigt Details unten), sonst FAIL.
        return { ok: okAfter, warn: okAfter, detail: JSON.stringify(diagAfter, null, 2) };
      }
    },

    // 5) Optional: HDR-Environment vorhanden? (für realistischere PBR-Reflexionen)
    {
      id: 'envHDR', label: 'HDR Env Map', required: false,
      run: async () => {
        try {
          const r = await fetch('./public/env/ramen_bar_night_1k.hdr', { cache:'no-store' });
          return { ok: r.ok, warn: !r.ok, detail: r.ok ? 'found' : 'missing (fallback: gradient)' };
        } catch (e) {
          return { ok:false, detail:String(e) };
        }
      }
    },

    // 6) Datenquelle erreichbar?
    {
      id: 'memories', label: 'Daten: memories.json', required: true,
      run: async () => {
        const r = await fetch('./public/data/memories.json', { cache: 'no-store' });
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        const arr = await r.json();
        return { ok: Array.isArray(arr) && arr.length >= 1, detail: `${Array.isArray(arr) ? arr.length : 0} items` };
      }
    }
  ],

  modules: {
    State:    { path: '../game/State.js',    required: true },
    Graphics: { path: '../game/Graphics.js', required: true },
    Input:    { path: '../game/Input.js',    required: true },
    UI:       { path: '../game/UI.js',       required: true },
    World:    { path: '../game/World.js',    required: true },
    Assets:   { path: '../core/Assets.js',   required: true },   // HDR/KTX2
    PostFX:   { path: '../game/PostFX.js',   required: false }   // FXAA/Bloom (optional)
  }
};

export async function runPreflight(ctx) {
  const $sum = document.getElementById('pf-summary');
  const $det = document.getElementById('pf-details');
  const $start = document.getElementById('pf-start');
  const $retry = document.getElementById('pf-retry');

  const summary = [];
  const details = [];

  // 1) Capabilities erfassen
  ctx.caps = detectCaps();
  summary.push(row(
    'Geräteprofil',
    'ok',
    `${ctx.caps.webgl2 ? 'WebGL2' : 'WebGL1'} · ${ctx.caps.deviceMemory}GB · PR ${ctx.caps.pixelRatio.toFixed(2)} · ${ctx.caps.quality}`
  ));

  // 2) Module laden
  try {
    const modRes = await loadModules(PF.modules, ctx);
    for (const r of modRes) summary.push(row(`Modul: ${r.name}`, r.status, r.detail));
  } catch (e) {
    summary.push(row('Modul-Ladefehler', 'fail', e.message));
    details.push(detailBlock('Stacktrace (ModuleLoader)', String(e?.cause?.stack || e.stack || e)));
    $sum.innerHTML = summary.join('');
    $det.innerHTML = details.join('');
    $start.disabled = true; $retry.style.display = '';
    return { ok: false };
  }

  // 3) Checks ausführen
  let hardFail = false;
  for (const c of PF.checks) {
    try {
      const res = await c.run(ctx); // bool oder {ok,warn,detail}
      const ok = typeof res === 'boolean' ? res : !!res.ok;
      let status = ok ? 'ok' : (c.required ? 'fail' : 'warn');
      if (typeof res === 'object' && res.warn && status === 'ok') status = 'warn';

      const showDetail = typeof res === 'object' && res.detail && (status !== 'ok');
      summary.push(row(`Check: ${c.label}`, status, showDetail ? 'Details unten' : ''));
      if (showDetail) details.push(detailBlock(`Diagnose – ${c.label}`, res.detail));

      if (!ok && c.required) hardFail = true;
    } catch (err) {
      const status = c.required ? 'fail' : 'warn';
      summary.push(row(`Check: ${c.label}`, status, 'Exception'));
      details.push(detailBlock(`Fehler – ${c.label}`, String(err?.message || err) + '\n' + String(err?.stack || '')));
      if (c.required) hardFail = true;
    }
  }

  // 4) Hinweise zu Fallbacks
  if (!ctx.caps.webgl2) {
    details.push(detailBlock('Hinweis', `WebGL2 nicht verfügbar → Fallback: WebGL1, Antialias OFF, Qualität: ${ctx.caps.quality}`));
  }

  $sum.innerHTML = summary.join('');
  $det.innerHTML = details.join('');

  if (!hardFail) {
    $start.disabled = false;
    // Start-Button in der scrollbaren Karte sicher sichtbar machen
    try { $start.scrollIntoView({ block: 'end', behavior: 'smooth' }); } catch {}
  } else {
    $retry.style.display = '';
  }

  return { ok: !hardFail };
}