// src/game/PostFX.js
// Effektkette: RenderPass + FXAA; optional Bloom bei hoher Qualität

export async function initPostFX(ctx, THREE, renderer, scene, camera) {
  const [
    { EffectComposer },
    { RenderPass },
    { ShaderPass },
    { FXAAShader },
    { UnrealBloomPass }
  ] = await Promise.all([
    import('https://unpkg.com/three@0.164.1/examples/jsm/postprocessing/EffectComposer.js'),
    import('https://unpkg.com/three@0.164.1/examples/jsm/postprocessing/RenderPass.js'),
    import('https://unpkg.com/three@0.164.1/examples/jsm/postprocessing/ShaderPass.js'),
    import('https://unpkg.com/three@0.164.1/examples/jsm/shaders/FXAAShader.js'),
    import('https://unpkg.com/three@0.164.1/examples/jsm/postprocessing/UnrealBloomPass.js')
  ]);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const fxaa = new ShaderPass(FXAAShader);
  function setFXAARes() {
    const pr = renderer.getPixelRatio();
    fxaa.material.uniforms.resolution.value.set(1/(window.innerWidth*pr), 1/(window.innerHeight*pr));
  }
  setFXAARes(); composer.addPass(fxaa);

  let bloom = null;
  if (ctx.caps.quality === 'high') {
    bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.25, 0.85, 0.95);
    composer.addPass(bloom);
  }

  function onResize(){
    composer.setSize(window.innerWidth, window.innerHeight);
    setFXAARes();
    if (bloom) bloom.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onResize, { passive:true });

  return { render: () => composer.render(), dispose: () => composer.dispose() };
}