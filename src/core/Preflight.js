import { detectCaps } from './Caps.js';
import { loadModules } from './ModuleLoader.js';

const PF = {
  checks: [
    { id: 'esmodules', label: 'ES Modules', required: true,
      run: async () => { await import('data:text/javascript,export default 1'); return true; } },
    { id: 'webgl2', label: 'WebGL2', required: false, run: async (ctx) => ctx.caps.webgl2 },
    { id: 'webgl1', label: 'WebGL (Fallback)', required: true, run: async (ctx) => ctx.caps.webgl1 },
    { id: 'pointer', label: 'Pointer Events', required: true, run: async () => !!window.PointerEvent },
    { id: 'localstorage', label: 'LocalStorage', required: false,
      run: async () => { localStorage.setItem('__pf','1'); localStorage.removeItem('__pf'); return true; } },
    { id: 'audio', label: 'AudioContext', required: false,
      run: async () => { try { const C = window.AudioContext || window.webkitAudioContext; if (!C) return false; const ac = new C({latencyHint:'interactive'}); ac.close(); return true; } catch { return false; } } },
    // Scroll/Viewport-Guard (wichtig für Mobile)
    { id: 'scroll', label: 'Scroll-Lock/Viewport', required: true,
      run: async () => {
        const meta = document.querySelector('meta[name="viewport"]');
        const content = (meta && meta.getAttribute('content')) || '';
        const okMeta = /maximum-scale\s*=\s*1/i.test(content) && /user-scalable\s*=\s*no/i.test(content);

        const css = (el, prop) => getComputedStyle(el).getPropertyValue(prop);
        const overflowOk = ['hidden','clip'].includes(css(document.documentElement,'overflow').trim())
                        && ['hidden','clip'].includes(css(document.body,'overflow').trim());
        const obehOk = ['none','contain'].includes(css(document.documentElement,'overscroll-behavior').trim())
                    || ['none','contain'].includes(css(document.body,'overscroll-behavior').trim());
        return okMeta && overflowOk && obehOk;
      } },
    // Daten erreichbar?
    { id: 'memories', label: 'Daten: memories.json', required: true,
      run: async () => {
        const r = await fetch('./public/data/memories.json', { cache: 'no-store' });
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        const arr = await r.json();
        return Array.isArray(arr) && arr.length >= 1;
      } },
  ],
  modules: {
    State:    { path: '../game/State.js',    required: true },
    Graphics: { path: '../game/Graphics.js', required: true },
    Input:    { path: '../game/Input.js',    required: true },
    UI:       { path: '../game/UI.js',       required: true }
  }
};

function row(label, status, detail='') {
  return `<div class="pf__row">
    <div class="pf__label">${label}</div>
    <div class="pf__status ${status}">${status.toUpperCase()}</div>
    <div style="text-align:right;color:#8ea1b2">${detail}</div>
  </div>`;
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
    details.push(`<div class="pf__err">${e?.cause?.stack || e.stack || e}</div>`);
    $sum.innerHTML = summary.join('');
    $det.innerHTML = details.join('');
    $start.disabled = true; $retry.style.display = '';
    return { ok: false };
  }

  // 3) Checks
  let hardFail = false;
  for (const c of PF.checks) {
    try {
      const ok = await c.run(ctx);
      const status = ok ? 'ok' : (c.required ? 'fail' : 'warn');
      if (!ok && c.required) hardFail = true;
      summary.push(row(`Check: ${c.label}`, status));
    } catch (err) {
      const status = c.required ? 'fail' : 'warn';
      if (c.required) hardFail = true;
      summary.push(row(`Check: ${c.label}`, status));
      details.push(`<div class="pf__err">[${c.label}] ${String(err?.message || err)}\n${String(err?.stack || '')}</div>`);
    }
  }

  // 4) Fallback-Hinweis
  if (!ctx.caps.webgl2) {
    details.push(`<div class="pf__row"><div class="pf__label">Fallback</div>
      <div class="pf__status warn">WARN</div>
      <div>Nutze WebGL1, Antialias OFF, Qualitätsstufe: ${ctx.caps.quality}</div></div>`);
  }

  $sum.innerHTML = summary.join('');
  $det.innerHTML = details.join('');

  if (!hardFail) { $start.disabled = false; }
  else { $retry.style.display = ''; }

  return { ok: !hardFail };
}