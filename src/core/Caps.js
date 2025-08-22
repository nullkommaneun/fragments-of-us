export function detectCaps() {
  const caps = {
    isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    hasPointer: !!window.PointerEvent,
    deviceMemory: navigator.deviceMemory || 4,
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2.25),
    webgl2: false,
    webgl1: false,
    antialias: true,
    quality: 'high' // wird ggf. runtergestuft
  };

  const canvas = document.createElement('canvas');
  caps.webgl2 = !!canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
  caps.webgl1 = caps.webgl2 || !!canvas.getContext('webgl', { failIfMajorPerformanceCaveat: true });

  // einfache Heuristik für Qualität/Fallbacks
  if (!caps.webgl2 || caps.deviceMemory < 4) {
    caps.quality = 'mid';
    caps.antialias = false;
    caps.pixelRatio = Math.min(caps.pixelRatio, 1.75);
  }
  if (!caps.webgl1) {
    caps.quality = 'low';
    caps.antialias = false;
    caps.pixelRatio = 1;
  }
  return caps;
}