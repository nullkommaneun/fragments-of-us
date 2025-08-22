// src/game/World.js
// Begehbares Diorama: kleine Ramen-/Sushi-Bar mit traditioneller Optik.
// Keine externen Assets – Texturen per Canvas. Export: init(ctx, THREE, scene) -> { update(dt) }

let THREERef;
let worldGroup, steamPts, steamVel;
let lanternMats = [];

function makeCanvasTexture(draw, w = 512, h = 512) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const tex = new (THREERef.CanvasTexture || THREERef.Texture)(c);
  tex.anisotropy = 2; tex.wrapS = tex.wrapT = THREERef.RepeatWrapping;
  return tex;
}

function texShoji() {
  return makeCanvasTexture((ctx,w,h)=>{
    ctx.fillStyle = '#f3f6ff'; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle = 'rgba(30,30,40,.6)'; ctx.lineWidth = 6;
    ctx.strokeRect(6,6,w-12,h-12);
    for (let x=1;x<=4;x++){ const X = 6 + x*(w-12)/5; ctx.beginPath(); ctx.moveTo(X,8); ctx.lineTo(X,h-8); ctx.stroke(); }
    for (let y=1;y<=3;y++){ const Y = 6 + y*(h-12)/4; ctx.beginPath(); ctx.moveTo(8,Y); ctx.lineTo(w-8,Y); ctx.stroke(); }
    const grd = ctx.createRadialGradient(w*.5,h*.5,30,w*.5,h*.5,w*.6);
    grd.addColorStop(0,'rgba(255,210,140,.45)'); grd.addColorStop(1,'rgba(255,190,120,.08)');
    ctx.fillStyle = grd; ctx.fillRect(0,0,w,h);
  });
}
function texWood() {
  return makeCanvasTexture((ctx,w,h)=>{
    ctx.fillStyle='#3b2a22'; ctx.fillRect(0,0,w,h);
    for (let i=0;i<60;i++){ const y = Math.random()*h;
      ctx.strokeStyle = `rgba(255,215,180,${0.03+Math.random()*0.05})`; ctx.lineWidth = 2+Math.random()*2;
      ctx.beginPath();
      for (let x=0;x<w;x+=8){ const yy = y + Math.sin((x+i*7)*0.02)*3; (x===0?ctx.moveTo(x,yy):ctx.lineTo(x,yy)); }
      ctx.stroke();
    }
    ctx.fillStyle='rgba(255,255,255,.04)'; for (let i=0;i<6;i++) ctx.fillRect(0,(i+1)*h/7,w,1);
  });
}
function texRoofTiles() {
  return makeCanvasTexture((ctx,w,h)=>{
    ctx.fillStyle='#1b2231'; ctx.fillRect(0,0,w,h);
    ctx.fillStyle='rgba(255,255,255,.05)';
    for (let y=8;y<h;y+=18) ctx.fillRect(0,y,w,2);       // horizontale Reihen
    ctx.fillStyle='rgba(255,255,255,.035)';
    for (let x=0;x<w;x+=28) ctx.fillRect(x,0,2,h);       // vertikale Fugen
  });
}
function texStone() {
  return makeCanvasTexture((ctx,w,h)=>{
    ctx.fillStyle='#202733'; ctx.fillRect(0,0,w,h);
    for (let i=0;i<380;i++){ const x=Math.random()*w,y=Math.random()*h,r=1+Math.random()*2;
      ctx.fillStyle=`rgba(255,255,255,${0.03+Math.random()*0.05})`; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    }
  });
}
function texNoren(text='ラーメン') {
  return makeCanvasTexture((ctx,w,h)=>{
    ctx.fillStyle='#6b0f1a'; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='rgba(255,255,255,.18)'; ctx.lineWidth=4; ctx.strokeRect(4,4,w-8,h-8);
    ctx.fillStyle='#f6e7d7'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font='bold 220px system-ui,"Hiragino Kaku Gothic Pro","Yu Gothic",sans-serif';
    ctx.save(); ctx.translate(w/2,h/2); ctx.rotate(-Math.PI/2); ctx.fillText(text,0,0); ctx.restore();
  },512,768);
}
function texSign(text='鮨 らーめん') {
  return makeCanvasTexture((ctx,w,h)=>{
    ctx.fillStyle='#121722'; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='rgba(255,255,255,.18)'; ctx.strokeRect(6,6,w-12,h-12);
    ctx.fillStyle='#f8d38a'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font='bold 84px system-ui,"Hiragino Kaku Gothic Pro","Yu Gothic",sans-serif';
    ctx.fillText(text,w/2,h/2);
  },1024,256);
}

function makeLantern(THREE, color=0xffe0a0) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,1.7,12),
    new THREE.MeshStandardMaterial({color:0x2b2b2b, roughness:0.8}));
  pole.position.y=0.85; g.add(pole);

  const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.17,0.36,24,1,true),
    new THREE.MeshStandardMaterial({color:0xffffff, emissive:color, emissiveIntensity:0.55, roughness:0.3}));
  paper.position.y=1.30; g.add(paper);

  const ringGeo = new THREE.TorusGeometry(0.18,0.015,12,24);
  const ringMat = new THREE.MeshStandardMaterial({color:0x3a3a3a});
  const r1 = new THREE.Mesh(ringGeo, ringMat); r1.position.y=1.48; r1.rotation.x=Math.PI/2; g.add(r1);
  const r2 = r1.clone(); r2.position.y=1.12; g.add(r2);

  const light = new THREE.PointLight(color, 0.8, 7, 2); light.position.set(0,1.3,0); g.add(light);

  lanternMats.push(paper.material);
  return g;
}

function buildDioramaBase(THREE) {
  const grp = new THREE.Group();
  // Sockel
  const baseMat = new THREE.MeshStandardMaterial({ color:0x0e141d, roughness:0.95 });
  const base    = new THREE.Mesh(new THREE.BoxGeometry(18,0.5,14), baseMat);
  base.position.y = 0.25; grp.add(base);

  // „Wasser“/Straße dünn darüber
  const top = new THREE.Mesh(new THREE.PlaneGeometry(17.2,13.2), new THREE.MeshStandardMaterial({ color:0x0f161f, roughness:0.98 }));
  top.rotation.x = -Math.PI/2; top.position.y = 0.5 + 0.005; grp.add(top);

  // Pflasterfläche vor dem Laden
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(10,6), new THREE.MeshStandardMaterial({ map: texStone(), roughness:0.96 }));
  plaza.rotation.x = -Math.PI/2; plaza.position.set(0, 0.501, 1.5); grp.add(plaza);

  return grp;
}

function buildGabledRoof(THREE, {w=6.5, d=4.2, over=0.45, pitchDeg=28} = {}) {
  const grp = new THREE.Group();
  const roofTex = texRoofTiles();
  const roofMat = new THREE.MeshStandardMaterial({ map: roofTex, roughness:0.55, metalness:0.08, emissive:0x0, side: THREE.DoubleSide });

  // Geometrie: zwei Dachflächen als dünne Boxen (für sichtbare Kante) + Firstkappe
  const pitch = pitchDeg * Math.PI/180;
  const rise  = Math.tan(pitch) * (w/2); // Höhe am First
  const thick = 0.08;

  const plateW = Math.hypot(rise, w/2) + over; // Sichtkante tatsächlich etwas länger
  const plateH = d + over*2;

  const makePlate = (sign=1) => {
    const g = new THREE.BoxGeometry(plateW, thick, plateH);
    const m = new THREE.Mesh(g, roofMat);
    // Drehung um Z, damit es wie ein geneigtes Dach wirkt
    m.rotation.z = sign * pitch;
    m.position.set(0, 0.4 + 2.7 + rise/2, 0); // Basis auf Wandhöhe + halbe Firsthöhe
    // Verschieben entlang der Neigung, damit die Kante übersteht
    m.position.y += (sign>0 ? 0.02 : 0.02);
    // leichte Verschiebung seitlich, damit die Platten sich treffen
    m.position.x += sign * 0.02;
    return m;
  };

  const left = makePlate(+1); left.position.x = -0.02;
  const right = makePlate(-1); right.position.x = +0.02;
  grp.add(left, right);

  // Firstkappe (Ridge)
  const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07, d + over*2, 16),
    new THREE.MeshStandardMaterial({ color:0x101825, roughness:0.6, metalness:0.15 }));
  ridge.rotation.x = Math.PI/2; ridge.position.set(0, 0.4 + 2.7 + rise + 0.05, 0);
  grp.add(ridge);

  // Ortbretter (Giebelkanten)
  const boardMat = new THREE.MeshStandardMaterial({ color:0x2c2f3b, roughness:0.7 });
  const edgeGeo  = new THREE.BoxGeometry(thick*1.6, rise+0.2, thick*1.6);
  const eL = new THREE.Mesh(edgeGeo, boardMat); eL.position.set(-w/2 - over + 0.05, 0.4 + 2.7 + (rise/2), (d/2)+over - 0.05); grp.add(eL);
  const eL2 = eL.clone(); eL2.position.z = -(d/2) - over + 0.05; grp.add(eL2);
  const eR = eL.clone();  eR.position.x =  w/2 + over - 0.05; grp.add(eR);
  const eR2 = eL2.clone(); eR2.position.x =  w/2 + over - 0.05; grp.add(eR2);

  // sichtbare Sparrenunterseite (Eaves/Unterzüge)
  const soffitMat = new THREE.MeshStandardMaterial({ map: texWood(), roughness:0.85 });
  const soffit = new THREE.Mesh(new THREE.BoxGeometry(w+over*2+0.1, 0.06, d+over*2+0.1), soffitMat);
  soffit.position.set(0, 0.4 + 2.7 + 0.18, 0);
  grp.add(soffit);

  grp.userData = { type:'roof', params:{w,d,over,pitchDeg,rise} };
  return grp;
}

function buildRamenBar(THREE, {w=6.5, d=4.2, h=2.7} = {}) {
  const grp = new THREE.Group();
  const wood = texWood();
  const stone = texStone();
  const shoji = texShoji();

  const matWall  = new THREE.MeshStandardMaterial({ map: wood, roughness:0.8, metalness:0.1 });
  const matStone = new THREE.MeshStandardMaterial({ map: stone, roughness:0.95 });
  const matShoji = new THREE.MeshStandardMaterial({ map: shoji, roughness:0.4, metalness:0, emissive:0xffc070, emissiveIntensity:0.12 });

  // Fundament / Stufe
  const base = new THREE.Mesh(new THREE.BoxGeometry(w+0.3, 0.35, d+0.3), matStone);
  base.position.y = 0.175 + 0.5; // auf Diorama-Top
  grp.add(base);

  // Wände als Korpus
  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matWall);
  walls.position.y = 0.5 + 0.35 + h/2; grp.add(walls);

  // Offene Front: Rahmen + Noren
  const frameMat = new THREE.MeshStandardMaterial({ map: wood, roughness:0.8 });
  const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.12, h, 0.2), frameMat);
  const frameR = frameL.clone();
  frameL.position.set(-w/2+0.06, 0.5 + 0.35 + h/2, d/2+0.01);
  frameR.position.set( w/2-0.06, 0.5 + 0.35 + h/2, d/2+0.01);
  grp.add(frameL, frameR);

  const norenTex = texNoren('ラーメン');
  const norenMat = new THREE.MeshStandardMaterial({ map: norenTex, transparent:true, roughness:0.85, metalness:0 });
  const paneW = (w-0.6)/3, paneH = 1.05;
  for (let i=0;i<3;i++){
    const p = new THREE.Mesh(new THREE.PlaneGeometry(paneW, paneH), norenMat);
    p.position.set(-w/2 + 0.3 + i*(paneW+0.15), 0.5 + 1.6, d/2+0.06);
    p.rotation.y = (i-1)*0.06;
    grp.add(p);
  }

  // Seitenfenster (Shoji)
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(d*0.75, h*0.58), matShoji);
  sh.position.set(-w/2-0.01, 0.5 + 0.35 + h*0.56, 0); sh.rotation.y = Math.PI/2;
  const sh2 = sh.clone(); sh2.position.x = w/2+0.01; sh2.rotation.y = -Math.PI/2;
  grp.add(sh, sh2);

  // Dach
  const roof = buildGabledRoof(THREE, { w, d, over:0.55, pitchDeg:30 }); grp.add(roof);

  // Innenraum: Tresen & Hocker
  const woodMat = new THREE.MeshStandardMaterial({ map: wood, roughness:0.7 });
  const counter = new THREE.Mesh(new THREE.BoxGeometry(w*0.82, 0.9, 0.42), woodMat);
  counter.position.set(0, 0.5 + 0.35 + 0.9/2, d/2 - 0.65); grp.add(counter);

  for (let i=0;i<4;i++){
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.18,0.46,12), woodMat);
    stool.position.set(-w*0.34 + i*(w*0.23), 0.5 + 0.35 + 0.23, d/2 - 1.15);
    grp.add(stool);
  }

  // Schilder/Licht innen
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(w*0.82, 0.5),
    new THREE.MeshStandardMaterial({ map: texSign(), emissive:0xf2c078, emissiveIntensity:0.35 }));
  sign.position.set(0, 0.5 + 0.35 + h + 0.32, d/2+0.08); grp.add(sign);

  const warm = new THREE.PointLight(0xffc27a, 1.15, 9, 2);
  warm.position.set(0, 0.5 + 0.35 + h - 0.15, d/2 - 0.6);
  grp.add(warm);

  // Vor dem Laden: Laternen
  for (let i=0;i<4;i++){
    const L = makeLantern(THREE);
    L.position.set(-w*0.45 + i*(w*0.3), 0.5, 0.6);
    grp.add(L);
  }

  return grp;
}

function buildSteam(THREE) {
  // Aufsteigender Dampf (Punkte), Ursprung nahe Tresen
  const n = 220;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n*3);
  const vel = new Float32Array(n*3);
  for (let i=0;i<n;i++){
    pos[i*3+0] = (Math.random()-0.5)*0.7;
    pos[i*3+1] = 0.8 + Math.random()*0.3;
    pos[i*3+2] = 1.1 + Math.random()*0.3;
    vel[i*3+0] = (Math.random()-0.5)*0.06;
    vel[i*3+1] = 0.25 + Math.random()*0.35;
    vel[i*3+2] = (Math.random()-0.5)*0.06;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  geo.setAttribute('velocity', new THREE.BufferAttribute(vel,3));
  const mat = new THREE.PointsMaterial({ size: 0.05, color: 0xf5efe6, transparent:true, opacity:0.85, depthWrite:false });
  steamPts = new THREE.Points(geo, mat);
  steamVel = vel;
  steamPts.position.set(0, 0.5, -0.2); // ungefähr Tresenmitte
  return steamPts;
}

export async function init(ctx, THREE, scene) {
  THREERef = THREE;
  worldGroup = new THREE.Group(); scene.add(worldGroup);

  // Abendliche Grundbeleuchtung
  scene.add(new THREE.HemisphereLight(0x88b0ff, 0x0b0f16, 0.45));
  const moon = new THREE.DirectionalLight(0xcfe3ff, 0.35); moon.position.set(8,12,-6);
  scene.add(moon);

  // Diorama-Basis
  const base = buildDioramaBase(THREE); worldGroup.add(base);

  // Ramen-Bar zentral
  const bar = buildRamenBar(THREE, { w:6.5, d:4.2, h:2.7 });
  bar.position.set(0,0,-1.2);
  worldGroup.add(bar);

  // Steam/Atmosphäre
  const steam = buildSteam(THREE);
  steam.position.add(new THREE.Vector3(0,0, -0.2));
  worldGroup.add(steam);

  return {
    update(dt){
      // Dampf animieren
      if (steamPts) {
        const a = steamPts.geometry.attributes;
        const pos = a.position.array;
        for (let i=0;i<steamVel.length;i+=3){
          pos[i]   += steamVel[i]   * dt;
          pos[i+1] += steamVel[i+1] * dt;
          pos[i+2] += steamVel[i+2] * dt;
          if (pos[i+1] > 3.2) { // reset
            pos[i]   = (Math.random()-0.5)*0.7;
            pos[i+1] = 0.8;
            pos[i+2] = 1.1 + Math.random()*0.3;
          }
        }
        a.position.needsUpdate = true;
      }
      // Laternen sanft flackern
      const t = performance.now()*0.001;
      for (const m of lanternMats) m.emissiveIntensity = 0.5 + Math.sin(t*3.3 + m.id*0.31)*0.07;
    }
  };
}