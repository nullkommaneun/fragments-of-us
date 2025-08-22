let dragging = false, lastX = 0, lastY = 0;
let yaw = 0, pitch = -0.06;
let vFwd = 0, vStrafe = 0, fovTarget = 70;
let pinchD = 0;
let ctxRef;

// dynamische Sensitivität
const DPR = Math.min(window.devicePixelRatio || 1, 3);
const MOBILE = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const S = {
  look:   (MOBILE ? 0.0055 : 0.0028) * DPR,  // Kamera-Drehung
  move:   (MOBILE ? 0.0100 : 0.0045) * DPR,  // Vor/Zurück
  strafe: (MOBILE ? 0.0100 : 0.0040) * DPR   // Seitwärts
};

let activeId = null;
let activeMode = null; // 'look' | 'move'
const LEFT_EDGE = () => window.innerWidth * 0.45; // links laufen, rechts schauen

export async function init(ctx) {
  ctxRef = ctx;
  ctx.input = { tick, yaw, pitch };

  const el = ctx.root;

  // Pointer (einheitlich für Maus/Touch)
  el.addEventListener('pointerdown', onDown, { passive: false });
  el.addEventListener('pointermove', onMove, { passive: false });
  el.addEventListener('pointerup',   onUp,   { passive: false });
  el.addEventListener('pointercancel', onUp, { passive: false });
  el.addEventListener('dblclick', onDbl, { passive: false });

  // Pinch-Zoom: nur FOV, kein Browser-Scale
  el.addEventListener('touchstart', onTouchStart, { passive: false });
  el.addEventListener('touchmove',  onTouchMove,  { passive: false });
  el.addEventListener('touchend',   onTouchEnd,   { passive: false });
}

function onDown(e) {
  e.preventDefault();
  dragging = true;
  activeId = e.pointerId;
  lastX = e.clientX; lastY = e.clientY;

  // Modus anhand Startposition
  activeMode = (e.clientX < LEFT_EDGE()) ? 'move' : 'look';
  try { e.currentTarget.setPointerCapture(activeId); } catch {}
}

function onUp(e) {
  if (e && activeId !== null && e.pointerId !== activeId) return;
  dragging = false;
  activeId = null;
  activeMode = null;
  // Geschwindigkeit wird in tick() weich abgebaut
}

function onMove(e) {
  if (!dragging || e.pointerId !== activeId) return;
  e.preventDefault();
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;

  if (activeMode === 'look') {
    yaw   -= dx * S.look;
    pitch -= dy * S.look;
    pitch = Math.max(-1.1, Math.min(0.6, pitch));
  } else {
    vFwd    += (-dy) * S.move;
    vStrafe += ( dx) * S.strafe;
    vFwd    = Math.max(-6, Math.min(6, vFwd));
    vStrafe = Math.max(-6, Math.min(6, vStrafe));
  }
}

let lastTap = 0;
function onDbl() {
  const t = performance.now();
  if (t - lastTap < 450) vFwd += 1.2; // kleiner Dash
  lastTap = t;
}

function onTouchStart(e) {
  if (e.touches.length === 2) {
    const a = e.touches[0], b = e.touches[1];
    pinchD = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    e.preventDefault();
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
  // Blick anwenden
  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  // Bewegung glätten
  const maxV  = 6.0;
  vFwd    = Math.max(-maxV, Math.min(maxV, vFwd));
  vStrafe = Math.max(-maxV, Math.min(maxV, vStrafe));
  vFwd    *= (1 - Math.pow(0.08, dt * 60));
  vStrafe *= (1 - Math.pow(0.08, dt * 60));

  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  camera.position.x += (vFwd * sin + vStrafe * cos) * dt;
  camera.position.z += (vFwd * cos - vStrafe * sin) * dt;

  // FOV weich → Ziel
  camera.fov += (fovTarget - camera.fov) * (1 - Math.pow(0.0001, dt));
  camera.updateProjectionMatrix();
}