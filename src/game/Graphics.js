// src/game/Graphics.js
let THREE, renderer, scene, camera, rafId, lastT = 0;
let ctxRef, worldApi;

function setBackground(container) {
  container.style.background = `linear-gradient(180deg,#0e1220 0%, #101528 45%, #0b0f1a 100%)`;
}

export async function init(ctx) {
  ctxRef = ctx;
  THREE = await import(ctx.env.cdn.three);

  renderer = new THREE.WebGLRenderer({ antialias: ctx.caps.antialias, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(ctx.caps.pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  ctx.root.appendChild(renderer.domElement);
  setBackground(ctx.root);

  scene = new THREE.Scene();
  // etwas weniger Dunst, damit Details am Dach sichtbar bleiben
  scene.fog = new THREE.FogExp2(0x0e1220, 0.022);

  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(70, aspect, 0.1, 1000);
  // Start leicht rechts vorn, Blick Richtung Laden
  camera.position.set(3.8, 1.8, 6.5);

  // Welt (nur Diorama + Ramen-Bar)
  worldApi = await ctx.modules.World.init(ctx, THREE, scene);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, { passive: true });
}

function update(t) {
  const dt = (t - lastT) / 1000 || 0; lastT = t;

  if (ctxRef?.input) ctxRef.input.tick(dt, camera);
  if (worldApi?.update) worldApi.update(dt);

  // Bereich klein halten (Diorama-Radius ~ 12 m um Zentrum)
  const r = Math.hypot(camera.position.x, camera.position.z + 1.2);
  if (r > 11.8) {
    const ang = Math.atan2(camera.position.z + 1.2, camera.position.x);
    camera.position.x = Math.cos(ang) * 11.8;
    camera.position.z = Math.sin(ang) * 11.8 - 1.2;
  }

  renderer.render(scene, camera);
  rafId = renderer.setAnimationLoop(update);
}

export function start() { lastT = 0; update(0); }
export function stop()  { if (rafId) { renderer.setAnimationLoop(null); cancelAnimationFrame(rafId); } }