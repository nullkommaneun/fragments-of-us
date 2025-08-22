let THREE, renderer, scene, camera, rafId, lastT = 0, groupHearts, groupSparks;
let ctxRef;

function makeGradientBackground(container) {
  // Canvas transparent, Gradient per CSS:
  container.style.background = `linear-gradient(180deg,#0e1220 0%, #101528 40%, #0b0f1a 100%)`;
}

function makeLights() {
  const amb = new THREE.AmbientLight(0xffffff, 0.55);
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(4, 8, 2);
  dir.castShadow = false;
  scene.add(amb, dir);
}

function makeGround() {
  const geo = new THREE.PlaneGeometry(200, 200, 1, 1);
  const mat = new THREE.MeshStandardMaterial({ color: 0x131a2a, metalness: 0.1, roughness: 0.9 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.5;
  mesh.receiveShadow = false;
  scene.add(mesh);

  // zartes Gitter
  const grid = new THREE.GridHelper(200, 200, 0x274060, 0x1b2945);
  grid.material.opacity = 0.22;
  grid.material.transparent = true;
  scene.add(grid);
}

function heartShape() {
  const s = new THREE.Shape();
  // klassisches Herz (2D) – dann extrudieren
  const x = 0, y = 0;
  s.moveTo(x, y);
  s.bezierCurveTo(x, y - 0.5, x - 1.4, y - 0.5, x - 1.4, y + 0.3);
  s.bezierCurveTo(x - 1.4, y + 0.9, x - 0.6, y + 1.45, x, y + 1.9);
  s.bezierCurveTo(x + 0.6, y + 1.45, x + 1.4, y + 0.9, x + 1.4, y + 0.3);
  s.bezierCurveTo(x + 1.4, y - 0.5, x, y - 0.5, x, y);
  return s;
}

function makeHearts() {
  const extrude = new THREE.ExtrudeGeometry(heartShape(), { depth: 0.18, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.04, bevelSegments: 2 });
  extrude.center();

  const mat = new THREE.MeshStandardMaterial({
    color: 0xff6fa9,
    metalness: 0.4,
    roughness: 0.25,
    emissive: 0x3a0c2a,
    emissiveIntensity: 0.45
  });

  groupHearts = new THREE.Group();
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(extrude, mat);
    m.position.set((Math.random() - .5) * 20, 0.8 + Math.random() * 0.6, (Math.random() - .5) * 20);
    m.rotation.y = Math.random() * Math.PI;
    const s = 0.6 + Math.random() * 0.5;
    m.scale.setScalar(s);
    groupHearts.add(m);
  }
  scene.add(groupHearts);
}

function makeSparks() {
  const count = 600;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i*3+0] = (Math.random() - .5) * 40;
    pos[i*3+1] = Math.random() * 6 + 0.3;
    pos[i*3+2] = (Math.random() - .5) * 40;
    col[i*3+0] = 0.6 + Math.random() * 0.4;
    col[i*3+1] = 0.7 + Math.random() * 0.3;
    col[i*3+2] = 1.0;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
  groupSparks = new THREE.Points(geo, mat);
  scene.add(groupSparks);
}

function update(t) {
  const dt = (t - lastT) / 1000 || 0;
  lastT = t;

  // leichte Bewegung/„Puls“ der Herzen
  if (groupHearts) {
    groupHearts.children.forEach((m, idx) => {
      m.rotation.y += 0.45 * dt;
      const base = 0.6 + (idx % 5) * 0.05;
      const s = base + Math.sin(t * 0.001 + idx) * 0.03;
      m.scale.setScalar(s);
    });
  }

  // Schimmern der Partikel
  if (groupSparks) {
    groupSparks.rotation.y += 0.05 * dt;
  }

  // einfache „Trägheit“ vom Input nutzen
  if (ctxRef?.input) {
    ctxRef.input.tick(dt, camera);
  }

  renderer.render(scene, camera);
  rafId = renderer.setAnimationLoop(update);
}

export async function init(ctx) {
  ctxRef = ctx;
  THREE = await import(ctx.env.cdn.three);

  renderer = new THREE.WebGLRenderer({ antialias: ctx.caps.antialias, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(ctx.caps.pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  ctx.root.appendChild(renderer.domElement);
  makeGradientBackground(ctx.root);

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0e1220, 0.032);

  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(70, aspect, 0.1, 1000);
  camera.position.set(0, 1.8, 6);

  makeLights();
  makeGround();
  makeHearts();
  makeSparks();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, { passive: true });
}

export function start() { lastT = 0; update(0); }
export function stop()  { if (rafId) { renderer.setAnimationLoop(null); cancelAnimationFrame(rafId); } }