export async function loadModules(plan, ctx) {
  const results = [];
  for (const [name, meta] of Object.entries(plan)) {
    try {
      const mod = await import(meta.path);
      ctx.modules[name] = mod;
      results.push({ name, status: 'ok', detail: `geladen: ${meta.path}` });
    } catch (err) {
      const status = meta.required ? 'fail' : 'warn';
      results.push({ name, status, detail: `${err?.message || err}`, stack: String(err?.stack || '') });
      if (meta.required) throw Object.assign(new Error(`[${name}] fehlgeschlagen`), { cause: err });
    }
  }
  return results;
}