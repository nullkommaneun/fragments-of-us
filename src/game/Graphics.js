// src/game/Graphics.js
let THREE, renderer, scene, camera, rafId, lastT = 0;
let ctxRef, worldApi, post;

function setBackground(container) {
  container.style.background = `linear-gradient(180deg,#0e1220 0%, #101528 45%, #0b0f1a 100%)`;
}

export async function init(ctx) {
  ctxRef = ctx;
  THREE = await import(ctx.env.cdn.three);

  renderer = new THREE.WebGLRenderer({ antialias: ctx.caps.antialias, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(ctx.caps.pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  ctx.root.appendChild(renderer.domElement);
  setBackground(ctx.root);

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0e1220, 0.022);

  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(70, aspect, 0.1, 1000);
  camera.position.set(3.8, 1.8, 6.5);

  // Diorama + Ramen-Bar
  worldApi = await ctx.modules.World.init(ctx, THREE, scene);

  // === Environment Lighting (IBL) ===
  // 1) Versuche HDR aus public/env/
  let envTex = null;
  try {
    envTex = await ctx.modules.Assets.loadHDR('./public/env/ramen_bar_night_1k.hdr', THREE, renderer);
  } catch {}
  // 2) Fallback: RoomEnvironment (ohne externes Asset)
  if (!envTex) {
    const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
    const pmrem = new THREE.PMREMGenerator(renderer);
    envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  }
  scene.environment = envTex;

  // Schatten selektiv
  scene.traverse(o => {
    if (o.isDirectionalLight) {
      o.castShadow = true;
      o.shadow.mapSize.set(ctx.caps.quality==='high'?2048:1024, ctx.caps.quality==='high'?2048:1024);
      o.shadow.camera.near = 0.5; o.shadow.camera.far = 50;
      o.shadow.bias = -0.0005;
    }
    if (o.isMesh) {
      const em = o.material && o.material.emissiveIntensity > 0.4;
      o.castShadow = !em;
      o.receiveShadow = true;
    }
  });

  // PostFX: FXAA (+ Bloom bei high)
  if (ctx.modules.PostFX && ctx.caps.quality !== 'low') {
    post = await ctx.modules.PostFX.initPostFX(ctx, THREE, renderer, scene, camera);
  }

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

  // Diorama-Grenze
  const r = Math.hypot(camera.position.x, camera.position.z + 1.2);
  if (r > 11.8) {
    const ang = Math.atan2(camera.position.z + 1.2, camera.position.x);
    camera.position.x = Math.cos(ang) * 11.8;
    camera.position.z = Math.sin(ang) * 11.8 - 1.2;
  }

  if (post) post.render(); else renderer.render(scene, camera);
  rafId = renderer.setAnimationLoop(update);
}

export function start() { lastT = 0; update(0); }
export function stop()  { if (rafId) { renderer.setAnimationLoop(null); cancelAnimationFrame(rafId); } }