let dragging = false, lastX = 0, lastY = 0;
let yaw = 0, pitch = -0.06;
let vFwd = 0, vStrafe = 0, fovTarget = 70;
let pinchD = 0;
let ctxRef;

// Gerätesensitivität / Tuning
const DPR = Math.min(window.devicePixelRatio || 1, 3);
const MOBILE = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// Feinabstimmung (bei Bedarf hier justieren)
const TUNE = {
  look:   (MOBILE ? 0.0070 : 0.0032) * DPR,  // Blickgeschwindigkeit
  move:   (MOBILE ? 0.0180 : 0.0085) * DPR,  // Vor/Zurück-„Schub“
  strafe: (MOBILE ? 0.0180 : 0.0080) * DPR,  // Seitwärts-„Schub“
  speed:  (MOBILE ? 5.0 : 3.8),              // Weltgeschwindigkeit
  friction: 7.5                               // Reibung (je höher, desto schneller fällt Bewegung ab)
};

let activeId = null;
let activeMode = null; // 'look' | 'move'
const LEFT_EDGE = () => window.innerWidth * 0.45; // links: Laufen, rechts: Blick

export async function init(ctx) {
  ctxRef = ctx;
  ctx.input = { tick, yaw, pitch };

  const el = ctx.root;

  // Einheitliche Pointer-Events
  el.addEventListener('pointerdown', onDown, { passive: false });
  el.addEventListener('pointermove', onMove, { passive: false });
  el.addEventListener('pointerup',   onUp,   { passive: false });
  el.addEventListener('pointercancel', onUp, { passive: false });
  el.addEventListener('dblclick', onDbl, { passive: false });

  // Pinch-FOV
  el.addEventListener('touchstart', onTouchStart, { passive: false });
  el.addEventListener('touchmove',  onTouchMove,  { passive: false });
  el.addEventListener('touchend',   onTouchEnd,   { passive: false });
}

function onDown(e){
  e.preventDefault();
  dragging = true; activeId = e.pointerId;
  lastX = e.clientX; lastY = e.clientY;
  activeMode = (e.clientX < LEFT_EDGE()) ? 'move' : 'look';
  try { e.currentTarget.setPointerCapture(activeId); } catch {}
}
function onUp(e){
  if (e && e.pointerId !== activeId) return;
  dragging = false; activeId = null; activeMode = null;
}
function onMove(e){
  if (!dragging || e.pointerId !== activeId) return;
  e.preventDefault();
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;

  if (activeMode === 'look'){
    yaw   -= dx * TUNE.look;
    pitch -= dy * TUNE.look;
    pitch = Math.max(-1.2, Math.min(0.7, pitch));
  } else {
    // Nach oben ziehen = vorwärts (vFwd > 0)
    vFwd    += (-dy) * TUNE.move;
    vStrafe += ( dx) * TUNE.strafe;
    vFwd    = Math.max(-10, Math.min(10, vFwd));
    vStrafe = Math.max(-10, Math.min(10, vStrafe));
  }
}

let lastTap = 0;
function onDbl(){
  const t = performance.now();
  if (t - lastTap < 450) vFwd += 3.0; // kräftiger Dash
  lastTap = t;
}

function onTouchStart(e){
  if (e.touches.length === 2){
    const a = e.touches[0], b = e.touches[1];
    pinchD = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    e.preventDefault();
  }
}
function onTouchMove(e){
  if (e.touches.length === 2){
    const a = e.touches[0], b = e.touches[1];
    const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const delta = d - pinchD; pinchD = d;
    fovTarget = Math.max(55, Math.min(90, fovTarget - delta * 0.06));
    e.preventDefault();
  }
}
function onTouchEnd(){ pinchD = 0; }

export function tick(dt, camera){
  // Blick anwenden
  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  // Reibung dt-basiert
  vFwd    -= vFwd    * TUNE.friction * dt;
  vStrafe -= vStrafe * TUNE.friction * dt;

  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  const speed = TUNE.speed;

  // FIX: Vorwärtsrichtung korrekt (vFwd > 0 => vorwärts in Blickrichtung)
  camera.position.x += (-vFwd * sin + vStrafe * cos) * dt * speed;
  camera.position.z += (-vFwd * cos - vStrafe * sin) * dt * speed;

  // FOV weich
  camera.fov += (fovTarget - camera.fov) * (1 - Math.pow(0.0001, dt));
  camera.updateProjectionMatrix();
}