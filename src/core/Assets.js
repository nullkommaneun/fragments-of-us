// src/core/Assets.js
// Hilfsloader für HDR-Environment & KTX2 (BasisU) Texturen

export async function loadHDR(url, THREE, renderer) {
  const { RGBELoader } = await import('https://unpkg.com/three@0.164.1/examples/jsm/loaders/RGBELoader.js');
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const hdrTex = await new RGBELoader().loadAsync(url);
    const env = pmrem.fromEquirectangular(hdrTex).texture;
    hdrTex.dispose(); pmrem.dispose();
    return env;
  } catch (e) {
    console.warn('[Assets] HDR load failed:', e);
    return null;
  }
}

export async function makeKTX2Loader(THREE, renderer) {
  const { KTX2Loader } = await import('https://unpkg.com/three@0.164.1/examples/jsm/loaders/KTX2Loader.js');
  const loader = new KTX2Loader()
    .setTranscoderPath('https://unpkg.com/three@0.164.1/examples/jsm/libs/basis/')
    .detectSupport(renderer);
  return loader;
}