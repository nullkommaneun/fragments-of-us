let data = [];
let ctxRef;

export async function init(ctx) {
  ctxRef = ctx;
  await loadMemories();
  // später: hier könnten wir Trefferzonen in der 3D-Welt anlegen, die beim „Einsammeln“ Text einblenden
}

async function loadMemories() {
  const r = await fetch('./public/data/memories.json', { cache: 'no-store' });
  data = await r.json();
  if (Array.isArray(data)) {
    if (ctxRef?.ui?.mem) ctxRef.ui.mem.textContent = String(data.length);
  }
}

export function getMemories() { return data.slice(); }