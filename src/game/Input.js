let dragging = false, lastX = 0, lastY = 0, yaw = 0, pitch = -0.06, vFwd = 0, vStrafe = 0, fovTarget = 70;
let pinchD = 0;
let ctxRef;

export async function init(ctx) {
  ctxRef = ctx;
  ctx.input = { tick, yaw, pitch };

  const el = ctx.root; // Canvas-Container
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  el.addEventListener('dblclick', onDbl);
  el.addEventListener('touchstart', onTouch, { passive: false });
  el.addEventListener('touchmove', onTouchMove, { passive: false });
  el.addEventListener('touchend', onTouchEnd, { passive: false });
}

function onDown(e) { dragging = true; lastX = e.clientX; lastY = e.clientY; }
function onUp() { dragging = false; vFwd = 0; vStrafe = 0; }
function onMove(e) {
  if (!dragging) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
  yaw   -= dx * 0.0026;
  pitch -= dy * 0.0020;
  pitch = Math.max(-1.1, Math.min(0.6, pitch));

  // vor/zurück
  vFwd = (-dy) * 0.003;
  vStrafe = (dx) * 0.0015;
}

let lastTap = 0;
function onDbl() {
  const t = performance.now();
  if (t - lastTap < 450) vFwd += 0.8; // kleiner Dash nach vorn
  lastTap = t;
}

function onTouch(e) {
  if (e.touches.length === 2) {
    const a = e.touches[0], b = e.touches[1];
    pinchD = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }
}
function onTouchMove(e) {
  if (e.touches.length === 2) {
    const a = e.touches[0], b = e.touches[1];
    const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const delta = (d - pinchD);
    pinchD = d;
    fovTarget = Math.max(55, Math.min(90, fovTarget - delta * 0.06));
    e.preventDefault();
  }
}
function onTouchEnd() { pinchD = 0; }

export function tick(dt, camera) {
  // Blickwinkel anwenden
  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  // simple Bewegung in Blickrichtung
  const fw = Math.min(6, Math.max(-3, vFwd));
  const st = Math.min(6, Math.max(-6, vStrafe));
  vFwd *= 0.92; vStrafe *= 0.92;

  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  camera.position.x += (fw * sin + st * cos) * dt;
  camera.position.z += (fw * cos - st * sin) * dt;

  // FOV weich an Ziel
  camera.fov += (fovTarget - camera.fov) * (1 - Math.pow(0.0001, dt)); // weiches easing
  camera.updateProjectionMatrix();
}