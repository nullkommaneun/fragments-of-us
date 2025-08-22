// Baut die Spielwelt: kleines japanisches Dorf mit Sushi/Ramen-Bar.
// Keine externen Assets: Texturen werden per Canvas erzeugt.
// Export: init(ctx, THREE, scene) -> { update(dt) }

let THREERef;
let worldGroup, petals, petalVel;
let lanternEmissive = [];

function makeCanvasTexture(draw, w = 512, h = 512) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const tex = new (THREERef.CanvasTexture || THREERef.Texture)(c);
  tex.anisotropy = 2;
  tex.wrapS = tex.wrapT = THREERef.RepeatWrapping;
  return tex;
}

function texShoji() {
  return makeCanvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#f0f4ff'; ctx.fillRect(0,0,w,h);
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(40,40,50,0.6)'; ctx.lineWidth = 6;
    // Rahmen
    ctx.strokeRect(6,6, w-12, h-12);
    // Sprossen
    for (let x=0; x<=4; x++){
      const X = 6 + x*(w-12)/4; ctx.beginPath(); ctx.moveTo(X,8); ctx.lineTo(X,h-8); ctx.stroke();
    }
    for (let y=0; y<=3; y++){
      const Y = 6 + y*(h-12)/3; ctx.beginPath(); ctx.moveTo(8,Y); ctx.lineTo(w-8,Y); ctx.stroke();
    }
    // warmes Licht
    const grd = ctx.createRadialGradient(w*0.5, h*0.5, 20, w*0.5, h*0.5, w*0.6);
    grd.addColorStop(0,'rgba(255,210,140,0.45)');
    grd.addColorStop(1,'rgba(255,190,120,0.1)');
    ctx.fillStyle = grd; ctx.fillRect(0,0,w,h);
  });
}

function texWood() {
  return makeCanvasTexture((ctx,w,h)=>{
    // Grund
    ctx.fillStyle='#3b2a22'; ctx.fillRect(0,0,w,h);
    // Maserung
    for (let i=0;i<60;i++){
      const y = Math.random()*h;
      ctx.strokeStyle = `rgba(255,215,180,${0.03+Math.random()*0.05})`;
      ctx.lineWidth = 2+Math.random()*2;
      ctx.beginPath();
      for (let x=0;x<w;x+=8){
        const yy = y + Math.sin((x+i*7)*0.02)*3;
        if (x===0) ctx.moveTo(x,yy); else ctx.lineTo(x,yy);
      }
      ctx.stroke();
    }
    // Streifen (Bretter)
    ctx.fillStyle='rgba(255,255,255,0.04)';
    for (let i=0;i<6;i++){ ctx.fillRect(0,(i+1)*h/7, w, 1); }
  });
}

function texRoof() {
  return makeCanvasTexture((ctx,w,h)=>{
    ctx.fillStyle='#1e2331'; ctx.fillRect(0,0,w,h);
    ctx.fillStyle='rgba(255,255,255,.07)';
    for (let y=10; y<h; y+=18) ctx.fillRect(0,y,w,2);     // Ziegelreihen
    ctx.fillStyle='rgba(255,255,255,.05)';
    for (let x=0; x<w; x+=28) ctx.fillRect(x,0,2,h);
  });
}

function texNoren(text='ラーメン') {
  return makeCanvasTexture((ctx,w,h)=>{
    ctx.fillStyle='#6b0f1a'; ctx.fillRect(0,0,w,h);
    // Stoffkanten
    ctx.strokeStyle='rgba(255,255,255,.15)'; ctx.lineWidth=4; ctx.strokeRect(4,4,w-8,h-8);
    // Text
    ctx.fillStyle='#f6e7d7';
    ctx.font = 'bold 220px system-ui, "Hiragino Kaku Gothic Pro", "Yu Gothic", sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.save();
    ctx.translate(w/2, h/2);
    ctx.rotate(-Math.PI/2);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }, 512, 768);
}

function texSign(text='鮨 らーめん') {
  return makeCanvasTexture((ctx,w,h)=>{
    ctx.fillStyle='#1b1f2a'; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='rgba(255,255,255,.2)'; ctx.strokeRect(6,6,w-12,h-12);
    ctx.fillStyle='#f8d38a';
    ctx.font='bold 80px system-ui, "Hiragino Kaku Gothic Pro", "Yu Gothic", sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(text, w/2, h/2);
  }, 1024, 256);
}

function texStone() {
  return makeCanvasTexture((ctx,w,h)=>{
    ctx.fillStyle='#2a2f3a'; ctx.fillRect(0,0,w,h);
    for (let i=0;i<400;i++){
      const x=Math.random()*w,y=Math.random()*h, r=1+Math.random()*2;
      ctx.fillStyle=`rgba(255,255,255,${0.04+Math.random()*0.04})`;
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    }
  });
}

function makeLantern(THREE, color=0xffe0a0) {
  const g = new THREE.Group();
  const pole = new THREE.CylinderGeometry(0.03,0.03,1.8,12);
  const poleMesh = new THREE.Mesh(pole, new THREE.MeshStandardMaterial({color:0x2b2b2b, roughness:0.8}));
  poleMesh.position.y = 0.9; g.add(poleMesh);

  const cyl = new THREE.CylinderGeometry(0.17,0.17,0.38,24,1,true);
  const mat = new THREE.MeshStandardMaterial({color:0xffffff, emissive: color, emissiveIntensity: 0.55, metalness:0, roughness:0.3});
  const paper = new THREE.Mesh(cyl, mat);
  paper.position.y = 1.35; g.add(paper);

  const ringGeo = new THREE.TorusGeometry(0.18, 0.015, 12, 24);
  const ringMat = new THREE.MeshStandardMaterial({color:0x3a3a3a});
  const r1 = new THREE.Mesh(ringGeo, ringMat); r1.position.y = 1.54; r1.rotation.x = Math.PI/2; g.add(r1);
  const r2 = r1.clone(); r2.position.y = 1.16; g.add(r2);

  const light = new THREE.PointLight(color, 0.75, 8, 2);
  light.position.set(0,1.35,0);
  g.add(light);

  lanternEmissive.push(mat);
  return g;
}

function buildTorii(THREE) {
  const grp = new THREE.Group();
  const colMat = new THREE.MeshStandardMaterial({color:0xc0382b, roughness:0.5, metalness:0.1});
  const beamMat = new THREE.MeshStandardMaterial({color:0x932a22, roughness:0.4});

  const colGeo = new THREE.CylinderGeometry(0.18,0.18,3.2,16);
  const c1 = new THREE.Mesh(colGeo, colMat); c1.position.set(-1.8,1.6,0); grp.add(c1);
  const c2 = c1.clone(); c2.position.x = 1.8; grp.add(c2);

  const beam = new THREE.BoxGeometry(4.6,0.25,0.6);
  const b1 = new THREE.Mesh(beam, beamMat); b1.position.set(0,3.1,0); grp.add(b1);

  const cap = new THREE.BoxGeometry(5.2,0.2,1.0);
  const b2 = new THREE.Mesh(cap, beamMat); b2.position.set(0,3.35,0); grp.add(b2);

  return grp;
}

function buildHouse(THREE, {w=6, d=4, h=2.6, withShoji=true, openFront=false} = {}) {
  const grp = new THREE.Group();
  const wood = texWood();
  const roof = texRoof();
  const stone = texStone();

  const matWall = new THREE.MeshStandardMaterial({map: wood, roughness:0.8, metalness:0.1});
  const matStone = new THREE.MeshStandardMaterial({map: stone, roughness:0.95});
  const matRoof = new THREE.MeshStandardMaterial({map: roof, roughness:0.6, metalness:0.1});
  const matShoji = new THREE.MeshStandardMaterial({map: texShoji(), roughness:0.4, metalness:0, emissive:0xffc070, emissiveIntensity:0.15});

  // Fundament
  const base = new THREE.Mesh(new THREE.BoxGeometry(w+0.4,0.4,d+0.4), matStone);
  base.position.y = 0.2; grp.add(base);

  // Wände (Kiste, optional offene Front)
  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matWall);
  walls.position.y = 0.4 + h/2;
  grp.add(walls);

  if (openFront) {
    // Frontöffnung: wir faken eine Öffnung mit schmalen Rahmen + Noren
    const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.1, h, 0.2), matWall);
    const frameR = frameL.clone();
    frameL.position.set(-w/2+0.05, 0.4+h/2, d/2+0.01);
    frameR.position.set( w/2-0.05, 0.4+h/2, d/2+0.01);
    grp.add(frameL, frameR);

    // Noren (3 Bahnen)
    const norenTex = texNoren('ラーメン');
    const norenMat = new THREE.MeshStandardMaterial({map:norenTex, transparent:true, roughness:0.8, metalness:0});
    const paneW = (w-0.5)/3, paneH = 1.0;
    for (let i=0;i<3;i++){
      const p = new THREE.Mesh(new THREE.PlaneGeometry(paneW, paneH), norenMat);
      p.position.set(-w/2 + 0.25 + i*(paneW+0.1), 1.6, d/2+0.06);
      p.rotation.y = Math.random()*0.1 - 0.05;
      grp.add(p);
    }
  }

  // Seitenfenster (Shoji)
  if (withShoji) {
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(d*0.8, h*0.6), matShoji);
    sh.position.set(-w/2-0.01, 0.4+h*0.55, 0);
    sh.rotation.y = Math.PI/2;
    const sh2 = sh.clone(); sh2.position.x = w/2+0.01; sh2.rotation.y = -Math.PI/2;
    grp.add(sh, sh2);
  }

  // Dach (Satteldach)
  const slope = new THREE.Mesh(new THREE.BoxGeometry(w+0.3,0.25,d+0.6), matRoof);
  slope.position.y = 0.4 + h + 0.5;
  slope.rotation.z = 0.38;
  const slope2 = slope.clone(); slope2.rotation.z = -0.38;
  grp.add(slope, slope2);

  // Schild
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(w*0.8, 0.5), new THREE.MeshStandardMaterial({map: texSign(), emissive:0xf2c078, emissiveIntensity:0.35}));
  sign.position.set(0, 0.4 + h + 0.35, d/2+0.08);
  grp.add(sign);

  // Innen: Tresen + Hocker (low-poly)
  const counter = new THREE.Mesh(new THREE.BoxGeometry(w*0.8, 0.9, 0.4), new THREE.MeshStandardMaterial({map: wood, roughness:0.7}));
  counter.position.set(0, 0.9/2 + 0.4, d/2 - 0.6);
  grp.add(counter);

  for (let i=0;i<4;i++){
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.17,0.45,12),
      new THREE.MeshStandardMaterial({map: wood, roughness:0.8}));
    stool.position.set(-w*0.35 + i*(w*0.23), 0.45/2 + 0.4, d/2 - 1.15);
    grp.add(stool);
  }

  // Warmes Innenlicht
  const warm = new THREE.PointLight(0xffc27a, 1.1, 9, 2);
  warm.position.set(0, 0.4+h-0.2, d/2-0.6);
  grp.add(warm);

  return grp;
}

function buildGround(THREE) {
  const grp = new THREE.Group();
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x0f161f, roughness:0.98 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120,120), groundMat);
  ground.rotation.x = -Math.PI/2; grp.add(ground);

  // Straße
  const road = new THREE.Mesh(new THREE.PlaneGeometry(60, 8), new THREE.MeshStandardMaterial({ color:0x121821, roughness:0.95 }));
  road.rotation.x = -Math.PI/2; road.position.z = 2;
  grp.add(road);

  // Plätze aus Steinfliesen
  const plazaMat = new THREE.MeshStandardMaterial({ map: texStone(), roughness:0.95 });
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(30, 18), plazaMat);
  plaza.rotation.x = -Math.PI/2; plaza.position.set(0,0.01,-4);
  grp.add(plaza);

  return grp;
}

function buildPetals(THREE) {
  const count = 500;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count*3);
  const vel = new Float32Array(count*3);
  for (let i=0;i<count;i++){
    pos[i*3+0] = (Math.random()-0.5)*40;
    pos[i*3+1] = Math.random()*8 + 1.5;
    pos[i*3+2] = -10 + Math.random()*20;
    vel[i*3+0] = (Math.random()-0.5)*0.2;
    vel[i*3+1] = - (0.2 + Math.random()*0.4);
    vel[i*3+2] = 0.1 + Math.random()*0.25;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  geo.setAttribute('velocity', new THREE.BufferAttribute(vel,3));
  const mat = new THREE.PointsMaterial({ size: 0.05, color: 0xffc0d4, transparent:true, opacity:0.9, depthWrite:false });
  petals = new THREE.Points(geo, mat);
  petalVel = vel;
  return petals;
}

function buildCherryTree(THREE) {
  const grp = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.35,3.2,8),
    new THREE.MeshStandardMaterial({ color:0x5a3b2f, roughness:0.9 }));
  trunk.position.y = 1.6; grp.add(trunk);

  const blossomMat = new THREE.MeshStandardMaterial({ color:0xffc6dc, roughness:0.7 });
  for (let i=0;i<14;i++){
    const s = 1.1 + Math.random()*0.6;
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9,1), blossomMat);
    b.position.set((Math.random()-0.5)*1.6, 2.2 + Math.random()*0.8, (Math.random()-0.5)*1.6);
    b.scale.setScalar(s);
    grp.add(b);
  }
  return grp;
}

export async function init(ctx, THREE, scene) {
  THREERef = THREE;
  worldGroup = new THREE.Group(); scene.add(worldGroup);

  // Lichtstimmung (Abend)
  scene.add(new THREE.HemisphereLight(0x88b0ff, 0x0b0f16, 0.5));
  const moon = new THREE.DirectionalLight(0xcfe3ff, 0.35); moon.position.set(8,12,-4);
  scene.add(moon);

  // Boden & Umgebung
  const ground = buildGround(THREE); worldGroup.add(ground);

  // Torii am Dorfeingang
  const torii = buildTorii(THREE); torii.position.set(0,0,-12);
  worldGroup.add(torii);

  // Ramen-/Sushi-Bar
  const bar = buildHouse(THREE, { w:6.5, d:4.2, h:2.7, openFront:true, withShoji:true });
  bar.position.set(0,0,-3.5); worldGroup.add(bar);

  // Nebengebäude minimal
  const houseL = buildHouse(THREE, { w:5, d:3.6, h:2.6, openFront:false });
  houseL.position.set(-8,0,-5);
  const houseR = buildHouse(THREE, { w:5.5, d:3.8, h:2.6, openFront:false });
  houseR.position.set(8,0,-4.5);
  worldGroup.add(houseL, houseR);

  // Laternen entlang der Straße
  for (let i=0;i<6;i++){
    const L = makeLantern(THREE);
    L.position.set(-9 + i*3.6, 0, 0.4);
    worldGroup.add(L);
  }

  // Kirschbaum
  const sakura = buildCherryTree(THREE); sakura.position.set(-5.5,0,-2.5);
  worldGroup.add(sakura);

  // Kirschblüten-Partikel
  const p = buildPetals(THREE); worldGroup.add(p);

  return {
    update(dt){
      // Petals update
      if (petals) {
        const pos = petals.geometry.attributes.position.array;
        for (let i=0;i<petalVel.length; i+=3){
          pos[i]   += petalVel[i]   * dt;
          pos[i+1] += petalVel[i+1] * dt;
          pos[i+2] += petalVel[i+2] * dt;
          if (pos[i+1] < 0.1 || pos[i+2] > 12) {
            pos[i]   = (Math.random()-0.5)*40;
            pos[i+1] = Math.random()*8 + 1.5;
            pos[i+2] = -10 + Math.random()*2;
          }
        }
        petals.geometry.attributes.position.needsUpdate = true;
      }
      // Laternen sanft flackern
      const t = performance.now()*0.001;
      for (const m of lanternEmissive) {
        m.emissiveIntensity = 0.5 + Math.sin(t*3.3 + m.id*0.31)*0.07;
      }
    }
  };
}