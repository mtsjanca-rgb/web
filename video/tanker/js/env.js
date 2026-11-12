// Environment: lights, sky (gradient + sun + cirrus), cumulus cloud deck (height-field ray-march, 2 layers),
// cumulus puffs + distant towering cumulus (painted sprites). Owns its own seeded RNG (seed 7).
import * as THREE from "../lib/three.module.js";
import { vfxTick } from "./vfx.js";

export const SUN_DIR = new THREE.Vector3(-.52, .58, -.63).normalize();   // směr KE slunci (světlo + obloha)
const HAZE = new THREE.Color(0xc4d8f0);                                    // barva oparu u obzoru (sRGB)

// hladký dlaždicový value-noise 256² (R,G,B,A = 4 nezávislé kanály), deterministický hash
function noiseTex(){
  const S = 256, data = new Uint8Array(S*S*4);
  const hash = (x, y, c) => { let h = (x*374761393 + y*668265263 + c*2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967295; };
  const sm = f => f*f*(3-2*f);
  const G = [32, 32, 16, 64];
  for (let c=0;c<4;c++){ const g = G[c], cs = S/g;
    for (let y=0;y<S;y++) for (let x=0;x<S;x++){
      const fx = x/cs, fy = y/cs, ix = Math.floor(fx), iy = Math.floor(fy), ux = sm(fx-ix), uy = sm(fy-iy);
      const v = (a,b) => hash(((ix+a)%g+g)%g, ((iy+b)%g+g)%g, c+1);
      const val = (v(0,0)*(1-ux) + v(1,0)*ux)*(1-uy) + (v(0,1)*(1-ux) + v(1,1)*ux)*uy;
      data[(y*S+x)*4+c] = Math.round(val*255);
    } }
  const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
}

// S3 near towers, laid out in SCREEN space for the current S3 camera (replica of timeline.js S3 path, see s3Cam):
// [tRef, px (crown centre x, UI px), pyTop (crown, UI px), D (horizontal distance from camera, m), aspect (width / visible height), tex]
// Grounded on the deck (base hidden under it); they stream +z at SPEED away from this front-left camera → shrink + drift (depth/speed).
const NEAR_LAYOUT = [
  [5.6, 200, 1170, 2900, .95, 0], [5.6, 870, 1235, 2300, .85, 1], [5.6, 520, 1610, 1500, 1.15, 2],
  [7.65, 130, 1590, 1450, 1.05, 1], [7.65, 975, 1660, 1350, .95, 0],
  [9.1, 640, 1640, 1300, 1.1, 2], [9.1, 330, 1200, 3300, .9, 1],
];
const S3P = [18,26,95,91,-27,-23,468,760];   // = S3 in timeline.js (az0, az1, r0, r1, y0, y1, px0, py)
const NEAR_SHOTS = { 3:1 };
export function buildEnv(scene){
const hemi = new THREE.HemisphereLight(0xb4d0ff, 0xf0ece4, 1.45); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d8, 3.4); sun.position.copy(SUN_DIR).multiplyScalar(110);
sun.castShadow = true; sun.shadow.mapSize.set(2048,2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
Object.assign(sun.shadow.camera, { left:-40, right:40, top:40, bottom:-40, near:1, far:300 });
scene.add(sun); scene.add(sun.target);
scene.fog = new THREE.Fog(HAZE.getHex(), 2500, 21000);   // jen sprity mraků (letadla jsou < 150 m od kamery)

let seed = 7; const rnd = () => (seed = (seed*16807)%2147483647)/2147483647;
const NZ = noiseTex();
const hz = `vec3(${HAZE.r.toFixed(3)},${HAZE.g.toFixed(3)},${HAZE.b.toFixed(3)})`;

// ---------- obloha: gradient, slunce s halo, vysoké cirry ----------
const sky = new THREE.Mesh(new THREE.SphereGeometry(20000, 32, 16), new THREE.ShaderMaterial({
  side:THREE.BackSide, depthWrite:false, fog:false,
  uniforms:{ sunDir:{ value:SUN_DIR }, nz:{ value:NZ }, drift:{ value:0 } },
  vertexShader:`varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader:`uniform vec3 sunDir; uniform sampler2D nz; uniform float drift; varying vec3 vP;
    void main(){ vec3 d=normalize(vP); float h=d.y;
      vec3 top=vec3(.20,.33,.55), mid=vec3(.37,.54,.79), hor=${hz};
      vec3 c = mix(hor, mix(mid, top, smoothstep(.12,.7,h)), smoothstep(-.01,.16,h));
      float s = max(dot(d,sunDir),0.);
      // teplé halo kolem slunce (široké) + jasné jádro
      c = mix(c, vec3(1.,.93,.80), pow(s,7.)*.32 + pow(s,60.)*.35);
      // cirry: protažené pruhy vysoko na obloze
      if (h > .02){
        vec2 cp = d.xz/(h+.12); cp = mat2(.82,-.57,.57,.82)*cp + vec2(drift,0.);
        float n = texture2D(nz, vec2(cp.x*.07, cp.y*.38)).r*.62 + texture2D(nz, vec2(cp.x*.2+.3, cp.y*1.1+.1)).g*.38;
        float m = smoothstep(.6,.82,n) * smoothstep(.03,.14,h) * (1.-smoothstep(.22,.5,h));
        c = mix(c, vec3(.95,.97,1.), m*.32);
      }
      c += vec3(1.,.96,.88)*(smoothstep(.99965,.99985,s)*3. + pow(s,1400.)*1.2);
      gl_FragColor=vec4(pow(c,vec3(2.2)),1.); }`
}));
scene.add(sky);

// ---------- moře kupovitých mraků: výšková mapa, ray-march, mezery ukazují spodní vrstvu ----------
const TOP = -520, BASE = -720, LOW = -1700;
const cloudMat = new THREE.ShaderMaterial({
  uniforms:{ off:{value:0}, camPos:{value:new THREE.Vector3()}, sunDir:{value:SUN_DIR}, nz:{value:NZ}, cov:{value:.47} },
  vertexShader:`varying vec3 wP; void main(){ vec4 w=modelMatrix*vec4(position,1.); wP=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader:`uniform float off, cov; uniform vec3 camPos, sunDir; uniform sampler2D nz; varying vec3 wP;
    const float TOP=${TOP}., BASE=${BASE}., LOW=${LOW}.;
    float dens(vec2 q){ vec2 p = q/17000.;
      return texture2D(nz,p).r*.56 + texture2D(nz,p*2.13+.31).g*.29 + texture2D(nz,p*4.71+.67).a*.15; }
    float hgt(vec2 q){ float d = dens(q) - cov; if (d < 0.) return BASE + d*1600.;
      float dome = sqrt(clamp(d*3.6,0.,1.)); float b = texture2D(nz, q/1500.+.13).r*.65 + texture2D(nz, q/640.+.71).g*.35;
      return BASE + dome*(.8 + (b-.45)*.32)*(TOP-BASE); }
    void main(){
      vec3 rd = normalize(wP - camPos);
      vec2 so = vec2(0., -off);
      float hd = length(wP.xz - camPos.xz);
      vec3 col; float dist;
      if (hd < 16000.){
        float len = min((TOP-BASE)/max(-rd.y,.02), 5200.);
        float st = len/16.; float jit = fract(52.98*fract(dot(gl_FragCoord.xy, vec2(.0671,.00583)))); float a = 0., b = 0.; bool hit = false;
        for (int i=1;i<=16;i++){ b = st*(float(i)-jit); vec3 p = wP + rd*b; if (p.y < hgt(p.xz+so)){ hit = true; break; } a = b; }
        if (hit){
          for (int j=0;j<4;j++){ float m=(a+b)*.5; vec3 p = wP + rd*m; if (p.y < hgt(p.xz+so)) b=m; else a=m; }
          vec3 p = wP + rd*b; vec2 q = p.xz+so;
          float e = 55., h0 = hgt(q), hx = hgt(q+vec2(e,0.)) - h0, hz = hgt(q+vec2(0.,e)) - h0;
          vec3 n = normalize(vec3(-hx, e*.9, -hz));
          float hn = clamp((h0-BASE)/(TOP-BASE), 0., 1.);
          float dif = clamp(dot(n, sunDir)*.8 + .32, 0., 1.);
          vec3 lit = vec3(.95,.93,.885), shd = vec3(.56,.65,.82), deep = vec3(.38,.49,.70);
          col = mix(shd, lit, dif);
          col = mix(deep, col, smoothstep(.0,.55,hn)*.75 + .25);          // dolní partie a rokle do modrošeda
          col += vec3(.05,.045,.03)*smoothstep(.8,1.,hn)*dif*dif;               // teplé vršky
          dist = length(p - camPos);
        } else {
          float tl = (LOW - camPos.y)/min(rd.y,-.01); vec3 p = camPos + rd*tl; vec2 q = (p.xz + so*.98)/9000.;
          float d2 = texture2D(nz,q+.5).b*.6 + texture2D(nz,q*3.1).g*.4;
          col = mix(vec3(.28,.40,.62), vec3(.60,.69,.84), smoothstep(.42,.62,d2));
          dist = min(tl, 30000.);
        }
      } else {
        float d = dens(wP.xz+so); col = mix(vec3(.62,.70,.85), vec3(.93,.94,.96), smoothstep(cov-.05,cov+.12,d)); dist = length(wP-camPos);
      }
      float f = 1. - exp(-pow(dist/8000., 1.3));
      col = mix(col, ${hz}, f);
      gl_FragColor = vec4(pow(col,vec3(2.2)),1.);
    }`
});
const cloudSea = new THREE.Mesh(new THREE.PlaneGeometry(40000,40000,1,1), cloudMat);
cloudSea.rotation.x = -Math.PI/2; cloudSea.position.y = TOP; scene.add(cloudSea);

// ---------- malované kupy (sprity s tvrdým okrajem): světlé vršky, modrošedé spodky, plochá základna ----------
function paintCloud(W, H, tower){
  const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
  const blobs = [];
  if (tower){
    let y = H*.86, r = W*.2;
    for (let k=0; y > H*.12; k++){ const n = 2 + (k%2); for (let i=0;i<n;i++) blobs.push([W*.5 + (rnd()-.5)*W*.42*(r/(W*.2)), y - rnd()*r*.3, r*(.7+rnd()*.45)]); y -= r*.62; r *= .9; }
    for (let i=0;i<6;i++) blobs.push([W*(.12+rnd()*.76), H*.88 - rnd()*H*.06, W*(.08+rnd()*.07)]);
  } else {
    const n = 9 + Math.floor(rnd()*5);
    for (let i=0;i<n;i++){ const u = rnd(), x = W*(.12 + u*.76), env = 1 - Math.abs(u-.5)*1.5; const r = H*(.13 + rnd()*.2)*env + H*.07; blobs.push([x, H*.78 - r*.55 - rnd()*H*.1*env, r]); }
  }
  const base = tower ? H*.9 : H*.8;
  // silueta (stín) – oříznutá plochou základnou
  g.save(); g.beginPath(); g.rect(0,0,W,base); g.clip();
  g.fillStyle = "#93a8c8"; blobs.forEach(([x,y,r]) => { g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.fill(); });
  g.restore();
  // světlé čepice každého chuchvalce (posunuté nahoru-doleva ke slunci) – jen uvnitř siluety
  g.globalCompositeOperation = "source-atop";
  blobs.sort((a,b) => b[1]-a[1]).forEach(([x,y,r]) => {
    const gr = g.createRadialGradient(x - r*.3, y - r*.42, r*.1, x - r*.12, y - r*.2, r*1.05);
    gr.addColorStop(0, "#fffdf6"); gr.addColorStop(.45, "#f6f4ef"); gr.addColorStop(.75, "#d9e1ee"); gr.addColorStop(1, "rgba(160,180,210,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(x - r*.1, y - r*.16, r*.98, 0, Math.PI*2); g.fill();
  });
  // modrošedé zastínění spodku
  const lg = g.createLinearGradient(0, base - H*(tower?.35:.42), 0, base);
  lg.addColorStop(0, "rgba(120,145,190,0)"); lg.addColorStop(1, "rgba(112,136,180,.75)");
  g.fillStyle = lg; g.fillRect(0, 0, W, base);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; return t;
}
// věžovitá kupa (cumulus congestus) pro blízký plán: nepravidelný sloupec z mnoha chuchvalců různé velikosti,
// osvětlené vršky (slunce vlevo nahoře), modrošedé spodky a rokle mezi chuchvalci, mírný náklon; korunka v userData.top (podíl výšky)
function paintTower(R, v){
  const W = 320, H = 448, c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
  const lean = (R()-.5)*.5, B = [];
  const cx = y => W*.5 + lean*W*.22*(1 - y/H) + Math.sin(y*.031 + v*2)*W*.03;
  const hw = y => { const u = 1 - y/H; return W*(.44 - .2*u + .04*Math.sin(u*9 + v*1.7)); };
  let y = H*.97;
  while (y > H*.22){ const w = hw(y), n = 2 + Math.floor(R()*3);
    for (let i=0;i<n;i++){ const side = n === 1 ? 0 : (i/(n-1))*2 - 1, r = w*(.32 + R()*.34)*(1 - Math.abs(side)*.2);
      B.push([cx(y) + side*w*(.55 + R()*.3) + (R()-.5)*w*.2, y - R()*r*.4, r]); }
    if (R() < .6){ const sd = R() < .5 ? -1 : 1; B.push([cx(y) + sd*w*(.95 + R()*.15), y - R()*10, w*(.12 + R()*.12)]); }  // výrůstky na okraji
    y -= hw(y)*(.22 + R()*.22);
  }
  // korunka: kupole z 6–8 chuchvalců
  const ct = H*.22, cw = hw(ct)*1.05;
  for (let i=0;i<7;i++){ const a = Math.PI*(.12 + .76*i/6) + (R()-.5)*.25, r = cw*(.32 + R()*.22);
    B.push([cx(ct) - Math.cos(a)*cw*.62, ct + 18 - Math.sin(a)*cw*.55, r]); }
  B.push([cx(ct) + (R()-.5)*cw*.3, ct - cw*.3, cw*.5]);
  let top = H; B.forEach(([x,y,r]) => top = Math.min(top, y - r));
  // silueta – stínová modrošedá
  g.fillStyle = "#8a9fc2"; B.forEach(([x,y,r]) => { g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.fill(); });
  g.globalCompositeOperation = "source-atop";
  // osvětlení chuchvalců zdola nahoru (vyšší překrývají nižší) – níže položené jsou tmavší (spodky ve stínu)
  B.slice().sort((a,b) => b[1]-a[1]).forEach(([x,y,r]) => {
    const hh = 1 - (y - top)/(H - top);                // 1 = vršek, 0 = spodek
    const gr = g.createRadialGradient(x - r*.38, y - r*.45, r*.05, x - r*.15, y - r*.18, r*1.02);
    const L = Math.round(196 + 59*Math.min(1, hh*1.4)), L2 = Math.round(176 + 66*Math.min(1, hh*1.3));
    gr.addColorStop(0, `rgb(${L},${L},${Math.min(255,L-4+8)})`); gr.addColorStop(.42, `rgb(${L2},${L2+2},${L2+6})`);
    gr.addColorStop(.72, "rgba(178,193,218,.9)"); gr.addColorStop(1, "rgba(138,159,194,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI*2); g.fill();
  });
  // spodní třetina do modrošeda + strana od slunce (vpravo) mírně ve stínu
  const lg = g.createLinearGradient(0, top + (H-top)*.45, 0, H); lg.addColorStop(0, "rgba(110,135,180,0)"); lg.addColorStop(1, "rgba(104,128,174,.8)");
  g.fillStyle = lg; g.fillRect(0, 0, W, H);
  const sg = g.createLinearGradient(W*.35, 0, W, 0); sg.addColorStop(0, "rgba(120,140,185,0)"); sg.addColorStop(1, "rgba(120,140,185,.32)");
  g.fillStyle = sg; g.fillRect(0, 0, W, H);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  t.userData.top = 1 - top/H; return t;
}
const CT = [paintCloud(256,128,false), paintCloud(256,128,false), paintCloud(256,128,false), paintCloud(256,128,false)];
const TT = [paintCloud(256,320,true), paintCloud(256,320,true), paintCloud(256,320,true)];

const puffs = new THREE.Group(); scene.add(puffs);
const PUFFS = [];
for (let i=0;i<0;i++){
  const m = new THREE.SpriteMaterial({ map:CT[i%4], alphaTest:.5, depthWrite:true, fog:true });
  const s = new THREE.Sprite(m); s.center.set(.5,.2); const sc = 70 + rnd()*120; s.scale.set(sc*2, sc, 1);
  let x = (rnd()-.5)*5000; x += Math.sign(x)*500; const z = (rnd()-.5)*8000, y = TOP - 30 + rnd()*40;
  s.position.set(x,y,z); puffs.add(s); PUFFS.push({ g:s, z0:z });
}
// vzdálené věžovité kupy (cumulus congestus) – také ubíhají, mlžné
const towers = new THREE.Group(); scene.add(towers); const TOW = [];
for (let i=0;i<9;i++){
  const m = new THREE.SpriteMaterial({ map:TT[i%3], alphaTest:.5, depthWrite:true, fog:true });
  const s = new THREE.Sprite(m); s.center.set(.5,.08); const w = 1100 + rnd()*900; s.scale.set(w, w*1.25*(.8+rnd()*.5), 1);
  const a = rnd()*Math.PI*2, R = 14000 + rnd()*4000; const z = Math.sin(a)*R;
  s.position.set(Math.cos(a)*R, TOP - 200, z); towers.add(s); TOW.push({ g:s, z0:z });
}

// blízké věžovité kupy (S3): vlastní malované textury (seed 13 – hlavní RNG seed 7 zůstává beze změny),
// umístěné v obrazových souřadnicích kamery S3 → ubíhají +z plnou rychlostí, stoupají k obzoru a zmenšují se (paralaxa)
const nearTowers = new THREE.Group(); scene.add(nearTowers); const NEAR = [];
{ let s3 = 13; const r3 = () => (s3 = (s3*16807)%2147483647)/2147483647;
  const NT = [0,1,2].map(i => paintTower(r3, i));
  const cam = new THREE.PerspectiveCamera(40, 720/1280, .3, 30000), ray = new THREE.Vector3();
  const io = p => p<.5 ? 2*p*p : 1-Math.pow(-2*p+2,2)/2;
  const s3Cam = t => { const ks = io(Math.min(Math.max((t-5.45)/3.85,0),1)), az = (S3P[0] + (S3P[1]-S3P[0])*ks)*Math.PI/180, r = S3P[2] - (S3P[2]-S3P[3])*ks;
    cam.position.set(-Math.sin(az)*r, S3P[4] + (S3P[5]-S3P[4])*ks, -Math.cos(az)*r); cam.updateProjectionMatrix(); cam.lookAt(0,-1,1);
    const tv = Math.tan(cam.fov*Math.PI/360), px = S3P[6] - 50*ks, py = S3P[7];
    cam.rotateY(Math.atan((px/540-1)*tv*cam.aspect)); cam.rotateX(-Math.atan((1-py/960)*tv)); cam.updateMatrixWorld(true); };
  const BASE_Y = TOP - 70;
  const DBG = true;
  NEAR_LAYOUT.forEach(([tr, px, py, D, asp, ti], i) => {
    s3Cam(tr);
    ray.set(px/540-1, 1-py/960, .5).unproject(cam).sub(cam.position).normalize();
    const k = D/Math.hypot(ray.x, ray.z), P0 = cam.position.clone().addScaledVector(ray, k);
    const tex = NT[ti], tf = tex.userData.top, by = BASE_Y, h = (P0.y - by)/tf, wm = (P0.y - by)*asp;
    // vzdušná perspektiva: vzdálenější kupy světlejší/modravější
    const m = new THREE.SpriteMaterial({ map:tex, alphaTest:.5, depthWrite:true, fog:true, color:new THREE.Color(0xffffff).lerp(new THREE.Color(0xc4d6ee), Math.min(D/5000,.4)) });
    const sp = new THREE.Sprite(m); sp.center.set(.5, 0); sp.scale.set(wm, h, 1);
    const z0 = P0.z - tr*150; sp.position.set(P0.x, by, P0.z); nearTowers.add(sp); NEAR.push({ g:sp, z0 });
    if (DBG) for (const tt of [5.6,7.65,9.1]){ s3Cam(tt); const q = new THREE.Vector3(P0.x, P0.y, z0 + tt*150).project(cam), q2 = new THREE.Vector3(P0.x + wm/2, P0.y, z0 + tt*150).project(cam);
      console.log("near", i, tt, Math.round((q.x+1)*540), Math.round((1-q.y)*960), "halfW", Math.round((q2.x-q.x)*540), "wm", Math.round(wm), "h", Math.round(P0.y-by)); }
  });
}
nearTowers.visible = false;

const tgt = new THREE.Vector3(0,-6,22);
  function update(t, cam, SPEED, shot){
    // svět ubíhá dozadu (+z)
    cloudMat.uniforms.off.value = t * SPEED;
    cloudMat.uniforms.camPos.value.copy(cam.position);
    sky.material.uniforms.drift.value = t*.004;
    PUFFS.forEach(p => { let z = p.z0 + t*SPEED; z = ((z + 4000) % 8000 + 8000) % 8000 - 4000; p.g.position.z = z; });
    TOW.forEach(p => { let z = p.z0 + t*SPEED*.98; z = ((z + 18000) % 36000 + 36000) % 36000 - 18000; p.g.position.z = z; });
    nearTowers.visible = !!NEAR_SHOTS[shot];
    if (nearTowers.visible) NEAR.forEach(p => { p.g.position.z = p.z0 + t*SPEED; });
    sun.target.position.copy(tgt); sun.position.copy(SUN_DIR).multiplyScalar(110).add(tgt);
    if (shot === 10){ sun.shadow.camera.left = sun.shadow.camera.bottom = -40; }
    vfxTick(t, cam, shot);   // 3D VFX (vfx.js), inicializováno líně z fuelOff()
  }
  return { hemi, sun, sky, cloudMat, cloudSea, puffs, PUFFS, towers, nearTowers, update };
}
