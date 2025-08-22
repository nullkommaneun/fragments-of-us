let fpsAcc = 0, fpsCount = 0, last = performance.now();

export async function init(ctx) {
  // kleines FPS-Update, ohne Lib
  function loop() {
    const now = performance.now();
    const dt = now - last; last = now;
    const fps = 1000 / dt;
    fpsAcc += fps; fpsCount++;
    if (fpsCount >= 10) {
      const avg = (fpsAcc / fpsCount);
      if (ctx.ui?.fps) ctx.ui.fps.textContent = Math.round(avg);
      fpsAcc = 0; fpsCount = 0;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}