// Effects. UI layer: contactBurst (S7 glint flare), flash (#flash). Fuel x-ray: fuelOff / fuelFlow (S8).
// 3D VFX (vfxInit / vfxTick): engine heat haze (4× CFM56 + F-16), contrails (S9/S10), contact burst at the receptacle
// (spark core, sparks, fuel-mist puff, shock ring; 20.62), disconnect fuel spray (25.2), sun glints on canopy + boom nozzle.
// Auto-wired: fuelOff(T,F) (called by timeline.scenePose every frame) lazily runs vfxInit(T,F); env.update() calls vfxTick().
import * as THREE from "../lib/three.module.js";
import { cl, oc } from "./helpers.js";
import { SUN_DIR } from "./env.js";

export const CONTACT_T = 20.62;      // okamžik spojení (synchronizováno se zvukem)
export const DISCONNECT_T = 25.2;    // odpojení
// síla efektů podle záběru (kameraman může přepsat: VFX.contrail[10] = .5 …)
export const VFX = {
  contrail: { 1:0, 2:0, 3:.35, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:1 },
  fContrail: { 9:.55, 10:0 },
  haze: 1, glint: { 5:0, 8:0 },
};

// ======================= UI vrstva =======================
// krátký pixelový záblesk (4cípá hvězda) + tenký tečkovaný prstenec na promítnutém bodě R=[x,y], 20.62–21.1
export function contactBurst(cx, t, R){
  const p = (t - CONTACT_T)/.48; if (p < 0 || p > 1) return;
  const [x0, y0] = R; cx.save();
  const sq = (x,y,s,c) => { cx.fillStyle = c; cx.fillRect(Math.round(x/3)*3 - s/2, Math.round(y/3)*3 - s/2, s, s); };
  if (p < .3){ const k = 1 - p/.3, L = 12 + 48*k;
    cx.globalAlpha = .9*k;
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) for (let d=6; d<L; d+=6) sq(x0+dx*d, y0+dy*d, d < L*.5 ? 6 : 3, "#ffffff");
    for (const [dx,dy] of [[1,1],[-1,1],[1,-1],[-1,-1]]) for (let d=6; d<L*.35; d+=6) sq(x0+dx*d*.7, y0+dy*d*.7, 3, "#fff6dc");
  }
  const r = 24 + 120*oc(p), n = Math.max(20, Math.round(r*2*Math.PI/12));
  cx.globalAlpha = .55*(1-p)*(1-p);
  for (let i=0;i<n;i++){ const a = i/n*Math.PI*2; sq(x0+Math.cos(a)*r, y0+Math.sin(a)*r*.8, 3, "#eef6ff"); }
  cx.restore();
}
// záblesk při spojení (jemný)
export function flash(t){
  document.getElementById("flash").style.opacity = (t >= CONTACT_T && t < CONTACT_T+.08) ? (1 - (t-CONTACT_T)/.08)*.16 : 0;
}

// skryje všechny palivové efekty (výchozí stav každého snímku) + líná inicializace 3D VFX
export function fuelOff(T, F){
  if (!V) vfxInit(T, F);
  V.fuelOn = false;
  T.fuelDots.forEach(d=>d.visible=false); F.fDots.forEach(d=>d.visible=false); F.fTanks.forEach(K=>{ if (K.sh) K.sh.visible = false; if (K.fl) K.fl.visible = false; });
}
// stejná křivka jako štítek FUEL % v timeline (15 → 100 % během S8)
export const fuelFill = t => .15 + .85*cl((t-22)/2.8);
// S8: plnění nádrží (F.setFuel(p) pokud existuje, jinak škálování fTanks) + svítící proud paliva
// tyč → tryska → zásuvka → po FPATHS do nádrží (počítá se ve vfxTick, až jsou transformace hotové)
export function fuelFlow(t, T, F){
  const fill = fuelFill(t);
  if (typeof F.setFuel === "function"){ F.setFuel(fill); }
  else F.fTanks.forEach(K => { if (!K.sh || !K.fl) return; K.sh.visible = K.fl.visible = true; K.fl.scale.z = Math.max(.02, K.l*fill); K.fl.position.z = K.z0 + .04 + K.l*fill/2; });
  if (V) { V.fuelOn = true; V.fuelT = t; }
}

// ======================= 3D VFX =======================
let V = null;
const hash = i => { const x = Math.sin(i*127.1 + 311.7)*43758.5453; return x - Math.floor(x); };

// pás natočený ke kameře podél osy +z – výfukový žár (mode 0) / kondenzační stopa (mode 1); funguje i při pohledu zezadu
// L = délka v m (pro šum v metrech), wob = zvlnění stopy (m), shim = světlé tetelení žáru
function plumeMat(col, mode, r0, r1){
  return new THREE.ShaderMaterial({
    transparent:true, depthWrite:false, fog:false, side:THREE.DoubleSide,
    uniforms:{ col:{ value:new THREE.Color(col) }, amp:{ value:0 }, scroll:{ value:0 }, mode:{ value:mode }, r0:{ value:r0 }, r1:{ value:r1 },
      L:{ value:1 }, wob:{ value:0 }, seed:{ value:0 }, time:{ value:0 }, shim:{ value:0 } },
    vertexShader:`attribute float aSide; uniform float r0, r1, mode, L, wob, seed, time; varying vec2 vA; varying float vD;
      void main(){ float u = uv.y; vA = vec2(aSide, u);
        vec3 ax = normalize((modelMatrix*vec4(0.,0.,1.,0.)).xyz);
        float m = u*L;
        // zvlnění stopy (víry za křídlem): roste se vzdáleností
        vec3 off = vec3(sin(m/41. + seed + time*.35)*.7 + sin(m/17. + seed*2.3)*.3, sin(m/57. + seed*1.7)*.6 + sin(m/23. + seed*3.1 + time*.5)*.25, 0.)*wob*smoothstep(0.,.6,u);
        vec4 wp = modelMatrix*vec4(off.x, off.y, position.z, 1.);
        vec3 tc = normalize(cameraPosition - wp.xyz);
        vec3 sd = cross(ax, tc); sd = length(sd) > 1e-4 ? normalize(sd) : vec3(1.,0.,0.);
        float w = mode < .5 ? mix(r0, r1, pow(u,.9)) : mix(r0, r1, pow(u,.62));
        wp.xyz += sd*aSide*w;
        vD = length(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix*viewMatrix*wp; }`,
    fragmentShader:`uniform vec3 col; uniform float amp, scroll, mode, L, shim, seed; varying vec2 vA; varying float vD;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      void main(){
        float x = vA.x, u = vA.y, a; vec3 c = col;
        if (mode < .5){   // žár: tetelivý opar, krátký; shim>0 = světlé chvějivé pruhy
          float w = n(vec2(x*2.5, u*9. - scroll*3.)) * n(vec2(x*1.5+3., u*5. - scroll*2.2));
          a = (1.-x*x) * smoothstep(0.,.06,u) * (1.-smoothstep(.3,1.,u)) * (.3 + w*1.2);
          float sh = n(vec2(x*5. + sin(u*14. - scroll*5.)*1.2, u*26. - scroll*6.));
          a *= mix(1., .45 + sh*1.1, shim);
          c = mix(col, vec3(.86,.88,.92), shim*smoothstep(.45,.85,sh)*.7);
        } else {          // kondenzační stopa: tvoří se ~12 m za motorem, rozšiřuje se, chuchvalcovitě se rozpadá a mizí
          float m = u*L - scroll;      // metry ve vzduchu (stopa stojí ve vzduchu, letadlo ujíždí)
          float n1 = n(vec2(x*2.2 + seed, m/9.)), n2 = n(vec2(x*4.5 + seed*3., m/3.2)), n3 = n(vec2(x*1.3, m/30. + seed));
          float prof = 1. - x*x;
          float core = pow(prof, mix(2.2, .9, smoothstep(0.,.5,u)));
          float puff = n1*.55 + n2*.3 + n3*.35;
          float breakup = smoothstep(.15 + .45*u, .55 + .4*u, puff*(.55 + .6*prof));
          a = core * mix(.35 + .65*breakup, breakup, smoothstep(.02,.25,u)) * smoothstep(0.,.045,u) * (1. - smoothstep(.12,1.,u)) * (.75 + .25*n2);
          a *= mix(1., .55, smoothstep(.1,.8,u)) * smoothstep(12., 75., vD);   // těsně u kamery se rozplývá (žádný 'paprsek')
          c = mix(col, col*vec3(.86,.9,.97), (1.-prof)*.6 + smoothstep(.2,.9,u)*.25);
        }
        gl_FragColor = vec4(c, clamp(a*amp,0.,1.));
      }`
  });
}
function tube(r0, r1, len, mat){
  const N = 120, pos = [], uv = [], sd = [], idx = [];
  for (let i=0;i<=N;i++){ const u = Math.pow(i/N, 1.6); for (const s of [-1,1]){ pos.push(0,0,u*len); uv.push((s+1)/2, u); sd.push(s); } }
  for (let i=0;i<N;i++){ const a = i*2; idx.push(a,a+1,a+2, a+1,a+3,a+2); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos,3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv,2));
  g.setAttribute("aSide", new THREE.Float32BufferAttribute(sd,1)); g.setIndex(idx);
  mat.uniforms.r0.value = r0; mat.uniforms.r1.value = r1; mat.uniforms.L.value = len;
  const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = false; m.renderOrder = 6; m.frustumCulled = false; return m;
}
// body (částice) ve světových souřadnicích
function points(N, col, blending){
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(N*3), 3));
  g.setAttribute("aS", new THREE.Float32BufferAttribute(new Float32Array(N), 1));
  g.setAttribute("aA", new THREE.Float32BufferAttribute(new Float32Array(N), 1));
  const m = new THREE.ShaderMaterial({ transparent:true, depthWrite:false, blending, fog:false,
    uniforms:{ col:{ value:new THREE.Color(col) }, uScale:{ value:1000 }, soft:{ value:.5 } },
    vertexShader:`attribute float aS, aA; uniform float uScale; varying float vA;
      void main(){ vA = aA; vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = max(aS*uScale/-mv.z, 1.5); gl_Position = projectionMatrix*mv; }`,
    fragmentShader:`uniform vec3 col; uniform float soft; varying float vA;
      void main(){ float d = length(gl_PointCoord-.5); float a = vA*(1.-smoothstep(.5-soft*.5, .5, d)); if (a < .01) discard; gl_FragColor = vec4(col, a); }` });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = 7; return p;
}
function glowTex(){
  const c = document.createElement("canvas"); c.width = c.height = 32; const g = c.getContext("2d");
  const gr = g.createRadialGradient(16,16,0,16,16,16); gr.addColorStop(0,"#fff"); gr.addColorStop(.25,"#fff"); gr.addColorStop(.5,"rgba(255,240,200,.45)"); gr.addColorStop(1,"rgba(255,230,180,0)");
  g.fillStyle = gr; g.fillRect(0,0,32,32); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function starTex(){
  const c = document.createElement("canvas"); c.width = c.height = 32; const g = c.getContext("2d");
  const gr = g.createRadialGradient(16,16,0,16,16,6); gr.addColorStop(0,"#fff"); gr.addColorStop(1,"rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0,0,32,32); g.fillStyle = "#fff";
  g.fillStyle = "rgba(255,255,255,.85)"; g.fillRect(15,5,2,22); g.fillRect(5,15,22,2); g.fillStyle = "#fff"; g.fillRect(14,11,4,10); g.fillRect(11,14,10,4);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// najde výstupy motorů tankeru (T.exhausts, jinak podle geometrie výstupního kužele, jinak analyticky)
function tankerExhausts(T){
  if (T.exhausts && T.exhausts.length) return T.exhausts.map(o => ({ parent:o, pos:new THREE.Vector3() }));
  const out = [];
  T.tanker.traverse(o => { const p = o.geometry && o.geometry.parameters;
    if (o.isMesh && o.geometry.type === "CylinderGeometry" && p.radiusTop === .42 && p.radiusBottom === .32) out.push({ parent:o.parent, pos:o.position.clone().add(new THREE.Vector3(0,0,.32)) }); });
  if (out.length === 4) return out;
  const o2 = [];
  for (const sx of [-1,1]) for (const k of [5.7, 11.4]){
    const w = new THREE.Object3D(); w.position.set(sx*1.6, -1.05, 0); w.rotation.z = sx*.11; T.tanker.add(w);
    o2.push({ parent:w, pos:new THREE.Vector3(sx*k, -1.3, -5.2 + k*(12.8/18.8) - 1.9 + 3.42) });
  }
  return o2;
}

const NSPR = 140, NDRP = 70, NB = 70, NP = 18, NFU = NB + 4*NP + 8;
export function vfxInit(T, F){
  if (V) return V;
  const scene = T.tanker.parent;
  V = { T, F, scene };
  // --- žár + kondenzační stopy ---
  V.haze = []; V.trails = [];
  const ex = tankerExhausts(T);
  ex.forEach(({ parent, pos }, i) => {
    const hm = plumeMat(0x3a3c42, 0, 0, 0), h = tube(.36, 1.5, 16, hm); h.position.copy(pos); parent.add(h); V.haze.push(h);
    // kondenzace vzniká až ~12 m za tryskou (ochlazení a promíchání výfuku), pak se rozšiřuje a rozpadá
    const cm = plumeMat(0xf4f6fa, 1, 0, 0), c = tube(.3, 4.2, 460, cm); cm.uniforms.seed.value = i*2.7 + 1.3; cm.uniforms.wob.value = 4;
    c.position.copy(pos).add(new THREE.Vector3(0,0,12)); parent.add(c); V.trails.push(c);
  });
  const fN = F.nozzleExit ? F.nozzleExit.clone() : F.NOZZLE ? F.NOZZLE.clone() : new THREE.Vector3(0,-.05,8.0);
  { // F-16: žár o průměru ≥ 1.2× trysky (Ø ~1.1 m), světlejší a tetelivý, aby se četl proti tankeru i obloze
    const hm = plumeMat(0x6a6e78, 0, 0, 0), h = tube(.68, 1.9, 13, hm); hm.uniforms.shim.value = 1; h.position.copy(fN).add(new THREE.Vector3(0,0,.05)); F.fighter.add(h); V.fHaze = h;
    const cm = plumeMat(0xf4f6fa, 1, 0, 0), c = tube(.25, 5, 360, cm); cm.uniforms.seed.value = 9.1; cm.uniforms.wob.value = 1.5;
    c.position.copy(fN).add(new THREE.Vector3(0,0,10)); F.fighter.add(c); V.fTrail = c; }
  // --- kontakt: jádro, jiskry, mlha, prstenec ---
  V.star = starTex();
  V.glow = glowTex();
  const add = new THREE.SpriteMaterial({ map:V.star, color:0xffffff, blending:THREE.AdditiveBlending, depthWrite:false, depthTest:false, transparent:true, fog:false });
  V.core = new THREE.Sprite(add.clone()); V.core.material.map = V.glow; V.core.renderOrder = 9; scene.add(V.core);
  V.ring = new THREE.Mesh(new THREE.RingGeometry(.88, 1, 48), new THREE.MeshBasicMaterial({ color:0xe8f2ff, transparent:true, depthWrite:false, side:THREE.DoubleSide, fog:false }));
  V.ring.renderOrder = 8; scene.add(V.ring);
  V.sparks = points(18, 0xfff1c8, THREE.AdditiveBlending); V.sparks.material.uniforms.soft.value = .1; scene.add(V.sparks);
  V.mist = points(26, 0xd4d6d4, THREE.NormalBlending); V.mist.material.uniforms.soft.value = .9; scene.add(V.mist);
  // odpojení: mlha zbytkového paliva (modrobílá) + jednotlivé nažloutlé kapky
  V.spray = points(NSPR, 0xe6eef6, THREE.NormalBlending); V.spray.material.uniforms.soft.value = .75; scene.add(V.spray);
  V.drops = points(NDRP, 0xeadc9a, THREE.NormalBlending); V.drops.material.uniforms.soft.value = .2; scene.add(V.drops);
  // S8: svítící proud paliva (jádro + jantarová záře), přes rentgen vždy viditelný
  V.fuel = points(NFU, 0xffd27a, THREE.AdditiveBlending); V.fuel.material.uniforms.soft.value = .25;
  V.fuelGlow = points(NFU, 0xff8a1c, THREE.AdditiveBlending); V.fuelGlow.material.uniforms.soft.value = 1;
  for (const P of [V.fuel, V.fuelGlow]){ P.material.depthTest = false; P.renderOrder = 12; P.visible = false; scene.add(P); }
  // --- odlesky ---
  V.gCan = new THREE.Sprite(add.clone()); V.gNoz = new THREE.Sprite(add.clone()); V.gCan.renderOrder = V.gNoz.renderOrder = 9;
  V.gCan.material.depthTest = V.gNoz.material.depthTest = true;
  scene.add(V.gCan); scene.add(V.gNoz);
  return V;
}

const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _h = new THREE.Vector3(), _ax = new THREE.Vector3(), _q = new THREE.Quaternion();
function setPt(P, i, pos, size, alpha){ const g = P.geometry; g.attributes.position.setXYZ(i, pos.x, pos.y, pos.z); g.attributes.aS.setX(i, size); g.attributes.aA.setX(i, alpha); }
function flushPts(P){ const g = P.geometry; g.attributes.position.needsUpdate = g.attributes.aS.needsUpdate = g.attributes.aA.needsUpdate = true; }

// voláno každý snímek (z env.update): t sekundy, cam, shot = číslo záběru
export function vfxTick(t, cam, shot){
  if (!V) return;
  const { T, F } = V;
  T.tanker.updateMatrixWorld(true); F.fighter.updateMatrixWorld(true);
  const uScale = 1280/(2*Math.tan(cam.fov*Math.PI/360));
  [V.sparks, V.mist, V.spray, V.drops, V.fuel, V.fuelGlow].forEach(P => P.material.uniforms.uScale.value = uScale);

  // žár + stopy
  const ct = VFX.contrail[shot] ?? 0, fct = VFX.fContrail[shot] ?? 0;
  V.haze.forEach((h,i) => { h.material.uniforms.amp.value = .55*VFX.haze; h.material.uniforms.scroll.value = t*6 + i*1.7; h.visible = shot !== 5 && shot !== 8; });
  V.fHaze.material.uniforms.amp.value = .9*VFX.haze; V.fHaze.material.uniforms.scroll.value = t*7; V.fHaze.visible = F.fighter.visible && shot !== 8;
  V.trails.forEach((c,i) => { const u = c.material.uniforms; c.visible = ct > 0; u.amp.value = .95*ct; u.scroll.value = t*150; u.time.value = t; });
  { const u = V.fTrail.material.uniforms; V.fTrail.visible = fct > 0; u.amp.value = .9*fct; u.scroll.value = t*150; u.time.value = t; }

  // kontakt 20.62: jiskra, prstenec, jiskry, mlha (unášená proudem vzduchu +z)
  const R = F.RECEPT ? F.fighter.localToWorld(F.RECEPT.clone()) : F.fighter.getWorldPosition(new THREE.Vector3());
  const dc = t - CONTACT_T, onC = shot === 7 && dc >= 0 && dc < 1.2;
  V.core.visible = onC && dc < .16;
  if (V.core.visible){ const k = 1 - dc/.16; V.core.position.copy(R); V.core.scale.setScalar(.35 + .9*k); V.core.material.opacity = k; V.core.material.rotation = .3; }
  V.ring.visible = onC && dc < .4;
  if (V.ring.visible){ const k = dc/.4; V.ring.position.copy(R); V.ring.quaternion.copy(cam.quaternion); V.ring.scale.setScalar(.12 + 1.1*oc(k)); V.ring.material.opacity = .7*(1-k)*(1-k); }
  V.sparks.visible = onC && dc < .45;
  if (V.sparks.visible){ for (let i=0;i<18;i++){ const a = hash(i)*6.283, e = hash(i+40)*1.2 - .2, s = 3 + hash(i+80)*5, life = .18 + hash(i+9)*.25;
      const k = dc/life; _v.set(Math.cos(a)*Math.cos(e), Math.sin(e), Math.sin(a)*Math.cos(e)).multiplyScalar(s*dc).add(R); _v.z += 9*dc*dc; _v.y -= 3*dc*dc;
      setPt(V.sparks, i, _v, .05, k < 1 ? (1-k) : 0); } flushPts(V.sparks); }
  V.mist.visible = onC;
  if (onC){ for (let i=0;i<26;i++){ const d0 = hash(i+3)*.08, a = dc - d0, a6 = hash(i+5)*6.283;
      _v.set(Math.cos(a6)*(.25+hash(i+7)*.5), .1 + hash(i+11)*.35, Math.sin(a6)*.3).multiplyScalar(Math.min(Math.max(a,0),.6)*2.2).add(R); _v.z += 2.6*Math.max(a,0);
      setPt(V.mist, i, _v, .25 + 1.1*Math.max(a,0), a > 0 ? .5*Math.pow(1 - Math.min(a/1.1,1), 1.6) : 0); } flushPts(V.mist); }

  // odpojení 25.2: krátký výron zbytkového paliva z trysky (~.35 s), proud vzduchu ho strhává dozadu (+z), do ~1 s se odpaří
  const dd = t - DISCONNECT_T, onD = (shot === 9) && dd >= 0 && dd < 1.25;
  V.spray.visible = V.drops.visible = onD;
  if (onD){
    T.nozzleTip.getWorldPosition(_w); T.boom.getWorldQuaternion(_q); _ax.set(0,0,1).applyQuaternion(_q);
    for (let i=0;i<NSPR;i++){ const ts = Math.pow(i/NSPR, 1.4)*.38, a = dd - ts, life = .55 + hash(i+17)*.4;
      if (a < 0 || a > life){ setPt(V.spray, i, _w, 0, 0); continue; }
      const a6 = hash(i+21)*6.283, r = .6 + hash(i+33)*1.4, k = a/life;
      // výstřik ven z trysky ve směru tyče, kužel se rozevírá, odpor vzduchu → zrychlení dozadu
      _v.copy(_ax).multiplyScalar(2.2*a*(1-k*.6)).add(_w);
      _v.x += Math.cos(a6)*r*(.25 + a*1.6); _v.y += Math.sin(a6)*r*(.2 + a*1.1) - 1.6*a*a; _v.z += 3.5*a + 9*a*a;
      setPt(V.spray, i, _v, .3 + 2.4*a + hash(i+5)*.3, .85*(1 - ts/.38*.45)*Math.pow(1 - k, 1.6)*cl(a/.04)); }
    flushPts(V.spray);
    for (let i=0;i<NDRP;i++){ const ts = hash(i+50)*.32, a = dd - ts, life = .45 + hash(i+52)*.35;
      if (a < 0 || a > life){ setPt(V.drops, i, _w, 0, 0); continue; }
      const a6 = hash(i+61)*6.283, r = 1 + hash(i+71)*3;
      _v.copy(_ax).multiplyScalar(1.5*a).add(_w); _v.x += Math.cos(a6)*r*a; _v.y += Math.sin(a6)*r*a*.7 - 4.9*a*a; _v.z += 6*a + 14*a*a;
      setPt(V.drops, i, _v, .07 + hash(i+3)*.07, 1 - a/life); }
    flushPts(V.drops);
  }

  // S8 proud paliva: tyč (boom-local z .6 → špička) → zásuvka → FPATHS do nádrží
  const onF = shot === 8 && V.fuelOn;
  V.fuel.visible = V.fuelGlow.visible = onF;
  if (onF){
    const ft = V.fuelT, fill = fuelFill(ft);
    T.nozzleTip.getWorldPosition(_h);
    const b0 = T.boom.localToWorld(_ax.set(0,0,.6)).clone();
    const Rw = F.RECEPT ? F.fighter.localToWorld(F.RECEPT.clone()) : _h.clone();
    let j = 0;
    const put = (p, s, al, g) => { setPt(V.fuel, j, p, s, al); setPt(V.fuelGlow, j, p, s*g, al*.32); j++; };
    // tyč: hustý pulzující proud + tryska → zásuvka
    for (let i=0;i<NB;i++){ const u = ((i/NB) + ft*.9) % 1;
      if (u < .93) _v.copy(b0).lerp(_h, u/.93); else _v.copy(_h).lerp(Rw, (u-.93)/.07);
      const pulse = .75 + .25*Math.sin(u*40 - ft*20);
      put(_v, .2*pulse, .95, 4.5); }
    // stíhačka: zásuvka → nádrže (na konci se proud "vlévá" – zmenšuje)
    const paths = F.FPATHS || [];
    for (let pth=0; pth<4; pth++) for (let i=0;i<NP;i++){
      if (!paths[pth % Math.max(paths.length,1)]){ put(Rw, 0, 0, 1); continue; }
      const u = ((i/NP) + ft*1.3 + pth*.13) % 1;
      _v.copy(F.pathPt(paths[pth % paths.length], u)); F.fighter.localToWorld(_v);
      put(_v, .17*(1 - .35*u), .95*(1 - .5*Math.pow(u,3)), 4.5); }
    // záře v zásuvce + "hladina" u ústí cest do nádrží
    put(Rw, .5 + .1*Math.sin(ft*17), .9, 3.2);
    for (let pth=0; pth<Math.min(paths.length,4); pth++){ _v.copy(F.pathPt(paths[pth], 1)); F.fighter.localToWorld(_v); put(_v, .3 + .25*fill, .7, 3.5); }
    while (j < NFU) put(Rw, 0, 0, 1);
    flushPts(V.fuel); flushPts(V.fuelGlow);
  }

  // odlesky slunce: kabina (elipsoid) a tryska (válec) – jen když poloviční vektor míří správně
  const gk = VFX.glint[shot] ?? 1;
  const camDir = (p) => _v.copy(cam.position).sub(p).normalize();
  { // kabina
    const C = F.fighter.localToWorld(new THREE.Vector3(0,.86,-3.3)); camDir(C); _h.copy(SUN_DIR).add(_v).normalize();
    F.fighter.getWorldQuaternion(_q); _ax.set(0,1,0).applyQuaternion(_q);
    const k = cl((_h.dot(_ax) - .55)/.4) * gk;
    const n = _h.clone().applyQuaternion(_q.clone().invert()); n.y = Math.max(n.y, .25); n.normalize();
    const P = F.fighter.localToWorld(new THREE.Vector3(n.x*.52, .86 + n.y*.56, -3.3 + n.z*1.79*.55));
    V.gCan.visible = F.fighter.visible && k > .02; V.gCan.position.copy(P);
    const dist = cam.position.distanceTo(P), tw = .8 + .2*Math.sin(t*9.3);
    V.gCan.scale.setScalar(dist*.03*(.6 + .8*k)*tw); V.gCan.material.opacity = k; V.gCan.material.rotation = .15;
  }
  { // tryska tyče
    T.nozzle.getWorldPosition(_w); camDir(_w); _h.copy(SUN_DIR).add(_v).normalize(); T.boom.getWorldQuaternion(_q); _ax.set(0,0,1).applyQuaternion(_q);
    const k = cl((1 - Math.abs(_h.dot(_ax)) - .8)/.18) * gk * (shot === 6 || shot === 7 || shot === 9 ? 1 : .6);
    V.gNoz.visible = k > .02; _w.addScaledVector(_h, .22); V.gNoz.position.copy(_w);
    const dist = cam.position.distanceTo(_w); V.gNoz.scale.setScalar(dist*.025*(.6 + .7*k)); V.gNoz.material.opacity = k*.9;
  }
}
