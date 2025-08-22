import { detectCaps } from './Caps.js';
import { loadModules } from './ModuleLoader.js';

const PF = {
  checks: [
    {
      id: 'esmodules', label: 'ES Modules', required: true,
      run: async () => { await import('data:text/javascript,export default 1'); return { ok:true, detail:'dynamic import ok' }; }
    },
    { id: 'webgl2', label: 'WebGL2', required: false, run: async (ctx) => ({ ok: !!ctx.caps.webgl2, detail: ctx.caps.webgl2 ? 'supported' : 'not supported' }) },
    { id: 'webgl1', label: 'WebGL (Fallback)', required: true, run: async (ctx) => ({ ok: !!ctx.caps.webgl1, detail: ctx.caps.webgl1 ? 'supported' : 'no webgl context' }) },
    { id: 'pointer', label: 'Pointer Events', required: true, run: async () => ({ ok: !!window.PointerEvent, detail: 'window.PointerEvent ' + (!!window.PointerEvent) }) },
    { id: 'localstorage', label: 'LocalStorage', required: false,
      run: async () => { localStorage.setItem('__pf','1'); localStorage.removeItem('__pf'); return { ok:true, detail:'rw ok' }; } },
    { id: 'audio', label: 'AudioContext', required: false,
      run: async () => {
        try { const C = window.AudioContext || window.webkitAudioContext; if (!C) return { ok:false, detail:'no AudioContext' };
          const ac = new C({ latencyHint:'interactive' }); await ac.close(); return { ok:true, detail:'supported' }; }
        catch (e) { return { ok:false, detail:String(e) }; }
      } },

    // Scroll/Viewport-Guard – robuste Diagnose + Safari-Fallback
    { id: 'scroll', label: 'Scroll-Lock/Viewport', required: true,
      run: async () => {
        const meta = document.querySelector('meta[name="viewport"]');
        const content = (meta && meta.getAttribute('content')) || '';
        const hasMax1 = /maximum-scale\s*=\s*1/i.test(content);
        const hasNoScale = /user-scalable\s*=\s*no/i.test(content);
        const okMeta = hasMax1 && hasNoScale;

        const css = (el, prop) => getComputedStyle(el).getPropertyValue(prop);
        const overflowRoot = css(document.documentElement,'overflow').trim();
        const overflowBody = css(document.body,'overflow').trim();
        const overflowOk = ['hidden','clip'].includes(overflowRoot) && ['hidden','clip'].includes(overflowBody);

        const supportsOB = !!(CSS && CSS.supports && CSS.supports('overscroll-behavior: none'));
        const obRoot = css(document.documentElement,'overscroll-behavior').trim();
        const obBody = css(document.body,'overscroll-behavior').trim();
        const obehOk = supportsOB ? (['none','contain'].includes(obRoot) || ['none','contain'].includes(obBody)) : true;

        const taRoot = css(document.documentElement,'touch-action').trim();
        const taBody = css(document.body,'touch-action').trim();
        const taApp  = document.getElementById('app') ? css(document.getElementById('app'),'touch-action').trim() : '';
        const taOk = [taRoot, taBody, taApp].some(v => (v||'').includes('none'));

        const ok = okMeta && overflowOk && taOk && obehOk;
        const warn = ok && !supportsOB; // Safari/iOS: kein overscroll-behavior → OK, aber Hinweis

        const diag = {
          metaViewport: content,
          okMeta, overflowRoot, overflowBody, overflowOk,
          supportsOverscrollBehavior: supportsOB, obRoot, obBody, obehOk,
          touchAction: { root: taRoot, body: taBody, app: taApp }, taOk
        };
        return { ok, warn, detail: JSON.stringify(diag, null, 2) };
      }
    },

    // Daten erreichbar?
    { id: 'memories', label: 'Daten: memories.json', required: true,
      run: async () => {
        const r = await fetch('./public/data/memories.json', { cache: 'no-store' });
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        const arr = await r.json();
        return { ok: Array.isArray(arr) && arr.length >= 1, detail:`${Array.isArray(arr)?arr.length:0} items` };
      } },
  ],
  modules: {
    State:    { path: '../game/State.js',    required: true },
    Graphics: { path: '../game/Graphics.js', required: true },
    Input:    { path: '../game/Input.js',    required: true },
    UI:       { path: '../game/UI.js',       required: true }
  }
};

function icon(status){
  return status==='ok' ? '✓' : status==='warn' ? '⚠' : '✖';
}
function row(label, status, detail = '') {
  return `<div class="pf__row">
    <div class="pf__label">${label}</div>
    <div class="pf__status ${status}">${icon(status)} ${status.toUpperCase()}</div>
    <div style="text-align:right;color:#8ea1b2">${detail}</div>
  </div>`;
}
function detailBlock(title, text){
  return `<div class="pf__detailBlock"><h3>${title}</h3><pre>${text}</pre></div>`;
}

export async function runPreflight(ctx) {
  const $sum = document.getElementById('pf-summary');
  const $det = document.getElementById('pf-details');
  const $start = document.getElementById('pf-start');
  const $retry = document.getElementById('pf-retry');

  const summary = [];
  const details = [];

  // 1) Capabilities
  ctx.caps = detectCaps();
  summary.push(row('Geräteprofil', 'ok',
    `${ctx.caps.webgl2?'WebGL2':'WebGL1'} · ${ctx.caps.deviceMemory}GB · PR ${ctx.caps.pixelRatio.toFixed(2)} · ${ctx.caps.quality}`));

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

  // 3) Checks
  let hardFail = false;
  for (const c of PF.checks) {
    try {
      const res = await c.run(ctx); // kann boolean oder {ok, warn, detail} sein
      const ok = typeof res === 'boolean' ? res : !!res.ok;
      let status = ok ? 'ok' : (c.required ? 'fail' : 'warn');
      if (typeof res === 'object' && res.warn && status === 'ok') status = 'warn';

      summary.push(row(`Check: ${c.label}`, status, (typeof res === 'object' && res.detail && status!=='ok') ? 'Details unten' : ''));
      if (status !== 'ok' && typeof res === 'object' && res.detail) {
        details.push(detailBlock(`Diagnose – ${c.label}`, res.detail));
      }

      if (!ok && c.required) hardFail = true;
    } catch (err) {
      const status = c.required ? 'fail' : 'warn';
      summary.push(row(`Check: ${c.label}`, status, 'Exception'));
      details.push(detailBlock(`Fehler – ${c.label}`, String(err?.message || err) + '\n' + String(err?.stack || '')));
      if (c.required) hardFail = true;
    }
  }

  // 4) Fallback-Hinweis
  if (!ctx.caps.webgl2) {
    details.push(detailBlock('Hinweis', `WebGL2 nicht verfügbar → Fallback: WebGL1, Antialias OFF, Qualität: ${ctx.caps.quality}`));
  }

  $sum.innerHTML = summary.join('');
  $det.innerHTML = details.join('');

  if (!hardFail) { $start.disabled = false; }
  else { $retry.style.display = ''; }

  return { ok: !hardFail };
}