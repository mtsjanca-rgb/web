// KC-135R Stratotanker. Local frame: metres, nose → −z, tail → +z, +y up. Group placed at world origin by the timeline.
// Static airframe parts are built as ordinary meshes inside group `S` and baked (merged per material) at the end
// → few draw calls. Handles (boom, pod, op, NAV lights) stay separate objects.
import * as THREE from "../lib/three.module.js";
import { loft, side, beam, toned, mesh, LM, cl } from "./helpers.js";

const V = (x,y,z) => new THREE.Vector3(x,y,z);
const sm = (a,b,x) => { const t = cl((x-a)/(b-a)); return t*t*(3-2*t); };
const hash = (a,b) => { let h = (a*374761393 + b*668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0)/4294967295; };

// monotone cubic interpolation (no overshoot)
function pchip(xs, ys){
  const n = xs.length, h = [], d = [], m = new Array(n);
  for (let i=0;i<n-1;i++){ h[i] = xs[i+1]-xs[i]; d[i] = (ys[i+1]-ys[i])/h[i]; }
  m[0] = d[0]; m[n-1] = d[n-2];
  for (let i=1;i<n-1;i++){ if (d[i-1]*d[i] <= 0) m[i] = 0; else { const w1 = 2*h[i]+h[i-1], w2 = h[i]+2*h[i-1]; m[i] = (w1+w2)/(w1/d[i-1]+w2/d[i]); } }
  return x => { if (x <= xs[0]) return ys[0]; if (x >= xs[n-1]) return ys[n-1]; let i = 0; while (x > xs[i+1]) i++;
    const t = (x-xs[i])/h[i], t2 = t*t, t3 = t2*t;
    return (2*t3-3*t2+1)*ys[i] + (t3-2*t2+t)*h[i]*m[i] + (-2*t3+3*t2)*ys[i+1] + (t3-t2)*h[i]*m[i+1]; };
}
// vertex colours from a callback (x,y,z,nx,ny,nz,colour)
function colorize(g, fn){
  if (!g.attributes.normal) g.computeVertexNormals();
  const P = g.attributes.position, N = g.attributes.normal, c = new THREE.Color(), a = new Float32Array(P.count*3);
  for (let i=0;i<P.count;i++){ c.setRGB(1,1,1); fn(P.getX(i),P.getY(i),P.getZ(i),N.getX(i),N.getY(i),N.getZ(i),c); a[i*3]=c.r; a[i*3+1]=c.g; a[i*3+2]=c.b; }
  g.setAttribute("color", new THREE.BufferAttribute(a,3)); return g;
}
// lathe along +z: profile [[r,z],…]
const lathe = (prof, seg=24) => new THREE.LatheGeometry(prof.map(([r,z]) => new THREE.Vector2(Math.max(r,1e-4), z)), seg).rotateX(Math.PI/2);
// merge geometries (position, normal, optional colour) into one indexed geometry
function mergeGeos(list, withCol){
  let nv = 0, ni = 0; list.forEach(g => { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; });
  const pos = new Float32Array(nv*3), nor = new Float32Array(nv*3), col = withCol ? new Float32Array(nv*3) : null, idx = new Uint32Array(ni);
  let ov = 0, oi = 0;
  for (const g of list){
    const P = g.attributes.position, N = g.attributes.normal, Cc = g.attributes.color;
    for (let i=0;i<P.count;i++){
      pos[(ov+i)*3]=P.getX(i); pos[(ov+i)*3+1]=P.getY(i); pos[(ov+i)*3+2]=P.getZ(i);
      nor[(ov+i)*3]=N.getX(i); nor[(ov+i)*3+1]=N.getY(i); nor[(ov+i)*3+2]=N.getZ(i);
      if (col){ col[(ov+i)*3] = Cc ? Cc.getX(i) : 1; col[(ov+i)*3+1] = Cc ? Cc.getY(i) : 1; col[(ov+i)*3+2] = Cc ? Cc.getZ(i) : 1; }
    }
    if (g.index) for (let i=0;i<g.index.count;i++) idx[oi++] = ov + g.index.getX(i); else for (let i=0;i<P.count;i++) idx[oi++] = ov + i;
    ov += P.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos,3)); g.setAttribute("normal", new THREE.BufferAttribute(nor,3));
  if (col) g.setAttribute("color", new THREE.BufferAttribute(col,3));
  g.setIndex(new THREE.BufferAttribute(idx,1)); g.computeBoundingSphere(); return g;
}
// bake every mesh under root (except userData.keep) into one mesh per material
function bake(root){
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), bins = new Map(), dead = [];
  root.traverse(o => { if (!o.isMesh || o.userData.keep) return;
    const g = o.geometry.clone(); if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    if (!bins.has(o.material)) bins.set(o.material, []); bins.get(o.material).push(g); dead.push(o); });
  dead.forEach(o => o.parent.remove(o));
  for (const [m, list] of bins){ const o = new THREE.Mesh(mergeGeos(list, !!m.vertexColors), m); o.castShadow = o.receiveShadow = true; root.add(o); }
}

// airfoil half-thickness ≈1 at 30 % chord, 0 at LE/TE
const foil = f => f <= 0 ? 0 : Math.max(0, 10*(.2969*Math.sqrt(f) - .126*f - .3516*f*f + .2843*f*f*f - .1036*f*f*f*f));
const FS = [1,.93,.86,.8,.765,.735,.69,.65,.6,.5,.4,.3,.2,.12,.06,.025,.007,0];
// lofted lifting surface: st [{s, le, c, t}], map(s, z, v) → [x,y,z]; colFn(s, f, side(+1 up/−1 low), colour)
function surf(st, map, colFn){
  const ring = []; FS.forEach(f => ring.push([f,1])); for (let i=FS.length-2;i>=0;i--) ring.push([FS[i],-1]);
  const R = ring.length, pos = [], col = [], idx = [], c = new THREE.Color();
  st.forEach(S => ring.forEach(([f,sd]) => {
    const v = sd > 0 ? S.t*.55*foil(f) : -S.t*.45*foil(f);
    pos.push(...map(S.s, S.le + f*S.c, v));
    c.setRGB(1,1,1); if (colFn) colFn(S.s, f, sd, c); col.push(c.r,c.g,c.b); }));
  for (let j=0;j<st.length-1;j++) for (let i=0;i<R-1;i++){ const a = j*R+i, b = a+R; idx.push(a,b,a+1, a+1,b,b+1); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos,3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col,3));
  g.setIndex(idx); g.computeVertexNormals();
  // orientation check: upper-surface normal must point to +thickness
  const S1 = st[1], iu = R + FS.indexOf(.3), n = V(g.attributes.normal.getX(iu), g.attributes.normal.getY(iu), g.attributes.normal.getZ(iu));
  const p0 = V(...map(S1.s, S1.le+.3*S1.c, 0)), p1 = V(...map(S1.s, S1.le+.3*S1.c, 1));
  if (n.dot(p1.sub(p0)) < 0){ const I = g.index.array; for (let i=0;i<I.length;i+=3){ const t = I[i+1]; I[i+1] = I[i+2]; I[i+2] = t; } g.computeVertexNormals(); }
  return g;
}
// stations helper: regular s values + extra break rows, with planform functions
function stations(s0, s1, step, extra, le, c, t){
  const ss = []; for (let s=s0; s<s1-1e-6; s+=step) ss.push(s); ss.push(s1); extra.forEach(e => { if (e>s0 && e<s1) ss.push(e); });
  ss.sort((a,b)=>a-b); const out = []; ss.forEach(s => { if (!out.length || s - out[out.length-1].s > .004) out.push({ s, le:le(s), c:c(s), t:t(s) }); });
  return out;
}
// close a surface with a rounded tip: two extra stations beyond s1
function tipCap(st, ds){ const L = st[st.length-1]; st.push({ s:L.s+ds*.6, le:L.le+L.c*.06, c:L.c*.88, t:L.t*.6 }, { s:L.s+ds, le:L.le+L.c*.2, c:L.c*.6, t:L.t*.08 }); return st; }

// scene: tanker group is added to it immediately (keeps scene child order / object ids identical)
export function buildTanker(scene){
const tanker = new THREE.Group(); if (scene) scene.add(tanker);
const tGrey = LM(0xaab1b9), tGreyD = LM(0x7d8690), tDark = LM(0x2a3038), glass = LM(0x0d1520, { roughness:.7 });
glass.roughness = .22;                                                     // tmavé sklo s odleskem
const TVC = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.78, metalness:0 });
const NAV = [];
const S = new THREE.Group(); tanker.add(S);                                // statické díly → bake()
const keep = o => { o.userData.keep = true; return o; };
const Cl = h => new THREE.Color(h);
const TOP = Cl(0x87909b), BELLY = Cl(0xb2b9c1);

// ===================== trup =====================
const NOSE0 = -20.75, NOSE1 = -15.9;
const KZ = [-15.9, 8, 10, 13, 15.5, 17.8, 19.8, 21.0, 21.4];
const fT = pchip(KZ, [2.0, 2.0, 1.99, 1.97, 1.94, 1.9, 1.88, 1.8, 1.66]);
const fB = pchip(KZ, [-2.0,-2.0,-1.84,-1.3,-.55,.17,.86,1.38,1.56]);
const fW = pchip(KZ, [1.95, 1.95, 1.9, 1.66, 1.28, .92, .56, .22, .02]);
function fus(z){
  let yT, yB, hw;
  if (z < NOSE1){ const q = 1 - cl((z-NOSE0)/(NOSE1-NOSE0)), d = -.62*q*q;
    yT = d + (2.0+.62*q*q)*Math.pow(1-Math.pow(q,1.6),.62); yB = d - (2.0-.62*q*q)*Math.sqrt(1-Math.pow(q,2.6)); hw = 1.95*Math.sqrt(1-Math.pow(q,2.0)); }
  else { yT = fT(z); yB = fB(z); hw = fW(z); }
  return { cy:(yT+yB)/2, ry:(yT-yB)/2, rx:hw };
}
const fusS = (z,a) => { const f = fus(z); return V(f.rx*Math.cos(a), f.cy + f.ry*Math.sin(a), z); };
const SEAMS = [-19.5, -15.3, -12.7, -10.1, -7.5, -4.9, -2.3, .3, 2.9, 5.5, 8.1, 10.7, 13.3, 15.9, 18.5];
{
  const zs = []; for (let i=0;i<=26;i++) zs.push(NOSE0 + (NOSE1-NOSE0)*Math.pow(i/26,1.75));
  for (let z=NOSE1+.45; z<21.4; z+=.45) zs.push(z); zs.push(21.4); SEAMS.forEach(s => zs.push(s-.07, s+.07));
  zs.sort((a,b)=>a-b);
  const SEG = 60, pos = [], idx = [];
  zs.forEach(z => { for (let i=0;i<=SEG;i++){ const p = fusS(z, i/SEG*Math.PI*2 - Math.PI/2); pos.push(p.x,p.y,p.z); } });
  for (let s=0;s<zs.length-1;s++) for (let i=0;i<SEG;i++){ const a = s*(SEG+1)+i, b = a+SEG+1; idx.push(a,a+1,b, a+1,b+1,b); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos,3)); g.setIndex(idx); g.computeVertexNormals();
  colorize(g, (x,y,z,nx,ny,nz,c) => {
    c.copy(BELLY).lerp(TOP, sm(-.3,.55,ny));
    let m = 1; const a = Math.atan2(y - fus(z).cy, x);
    if (z < -19.5) m *= .93;                                                 // radom
    for (const s of SEAMS) if (Math.abs(z-s) < .09) m *= .93;                // příčné spáry panelů
    if (z > -17 && z < 19) m *= 1 + .05*(hash(Math.floor((z+40)/2.6), Math.floor((a+4)/(Math.PI/5))) - .5);
    // šmouhy na břiše za křídlem (odvzdušnění, olej)
    if (ny < -.2) m *= 1 - .13*sm(-3,3,z)*(1-sm(9,14,z))*Math.pow(.5+.5*Math.sin(a*41),3)*sm(-.2,-.8,ny);
    // mírná špína kolem ocasu
    m *= 1 - .05*sm(12,20,z)*(.5+.5*Math.sin(z*3.1+a*7));
    c.multiplyScalar(m);
  });
  mesh(g, TVC, S);
}
// záplata na povrchu trupu (okna, dveře): úhly a v radiánech, off = výška nad povrchem
function patch(surfFn, z0, z1, a0, a1, off, mat, parent, nz=4, na=4){
  const pos = [], idx = [];
  for (let j=0;j<=nz;j++) for (let i=0;i<=na;i++){
    const z = z0 + (z1-z0)*j/nz, a = a0 + (a1-a0)*i/na, p = surfFn(z,a);
    const t1 = surfFn(z, a+.01).sub(p), t2 = surfFn(z+.01, a).sub(p), n = new THREE.Vector3().crossVectors(t1, t2).normalize();
    if (n.x*Math.cos(a) + n.y*Math.sin(a) < 0) n.negate();
    p.addScaledVector(n, off); pos.push(p.x,p.y,p.z);
  }
  for (let j=0;j<nz;j++) for (let i=0;i<na;i++){ const a = j*(na+1)+i, b = a+na+1; idx.push(a,b,a+1, a+1,b,b+1); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos,3)); g.setIndex(idx); g.computeVertexNormals();
  const n0 = g.attributes.normal, mid = Math.floor(nz/2)*(na+1) + Math.floor(na/2), am = a0 + (a1-a0)*Math.floor(na/2)/na;
  if (n0.getX(mid)*Math.cos(am) + n0.getY(mid)*Math.sin(am) < 0){ const I = g.index.array; for (let i=0;i<I.length;i+=3){ const t = I[i+1]; I[i+1] = I[i+2]; I[i+2] = t; } g.computeVertexNormals(); }
  return mesh(g, mat, parent);
}
const D = Math.PI/180;
const frameM = LM(0xd3d8dd), seamM = LM(0x7a838d), lightGlass = LM(0x1b2a3c); lightGlass.roughness = .3;
// kokpit 707: čelní, 2 boční, „eyebrow“ okna – tmavé sklo, tenké světlé rámy
for (const [z0,z1,a0,a1] of [[-19.55,-19.0,47,85.8],[-18.94,-18.45,29,49],[-18.39,-17.88,24,42],[-18.94,-18.56,55,67],[-18.39,-18.0,48,58]]){
  for (const mir of [false,true]){
    const A0 = (mir ? 180-a1 : a0)*D, A1 = (mir ? 180-a0 : a1)*D, fr = .04, fa = 1.5*D;
    patch(fusS, z0-fr, z1+fr, A0-fa, A1+fa, .012, frameM, S);
    patch(fusS, z0, z1, A0, A1, .024, glass, S);
  }
}
// středový sloupek čelního skla už tvoří mezera 85.5–94.5°; malá okénka kabiny
for (const z of [-14.0, -9.6, -5.4, 6.6]) for (const a of [14, 166]){
  patch(fusS, z-.2, z+.2, (a-4.2)*D, (a+4.2)*D, .01, frameM, S, 2, 2);
  patch(fusS, z-.15, z+.15, (a-3.2)*D, (a+3.2)*D, .02, lightGlass, S, 2, 2);
}
// obrysy dveří (jemně tmavší pásky, ne černé čáry)
function outline(z0,z1,a0,a1,w=.045){
  const da = w/1.95;
  patch(fusS, z0, z1, a0, a0+da, .006, seamM, S, 3, 1); patch(fusS, z0, z1, a1-da, a1, .006, seamM, S, 3, 1);
  patch(fusS, z0, z0+w, a0, a1, .006, seamM, S, 1, 4); patch(fusS, z1-w, z1, a0, a1, .006, seamM, S, 1, 4);
}
outline(-14.9, -11.9, 158*D, 203*D);                 // nákladní dveře (levobok)
outline(-16.7, -15.7, 254*D, 286*D);                 // vstupní poklop (břicho)
for (const [a0,a1] of [[6,24],[156,174]]) outline(-1.7, -1.0, a0*D, a1*D, .035);   // nouzové východy nad křídlem
outline(-16.95, -16.15, 186*D, 214*D, .035);         // přední servisní dvířka
// břišní kapotáž centroplánu
mesh(toned(loft([[-8.4,-1.6,.8,.2],[-7.2,-1.72,1.42,.5],[-4.5,-1.8,1.62,.62],[2.2,-1.8,1.64,.63],[5.6,-1.72,1.42,.5],[7.8,-1.55,.7,.2]],40), 0xa5adb5, 0xb7bdc4, .05), TVC, S);
// pitot trubice
for (const sx of [-1,1]){ const p = fusS(-18.9, (sx>0 ? -12 : 192)*D); const tb = mesh(new THREE.CylinderGeometry(.018,.03,.42,6).rotateX(Math.PI/2), tGreyD, S, p.x*1.02, p.y, p.z - .1); }
// antény (šípové lopatky)
const blade = (z, y, h, flip) => { const g = side([[0,0],[.55,0],[.42,h],[.28,h]], .06); if (flip) g.scale(1,-1,1); mesh(g, tGreyD, S, 0, y, z); };
blade(-10.5, 1.98, .42); blade(-3.2, 1.98, .34); blade(3.6, 1.98, .5); blade(-12.2, -1.98, .38, true); blade(9.6, -1.82, .32, true);
// HF anténa/drát nahoře — krátká ploutvička u kořene SOP
blade(7.0, 1.98, .3);
// navigátorská okénka? (KC-135 má malé okénko sextantu nahoře)
patch(fusS, -15.2, -14.95, 86*D, 94*D, .012, lightGlass, S, 1, 2);
// světla navádění pilota (pilot director lights) na břiše vpředu – barevné pásky
for (const a of [236, 304]){ const cols = [0x3cff6a, 0x3cff6a, 0xffd23c, 0xff4a3a, 0xff4a3a]; cols.forEach((c,i) => patch(fusS, -9.6+i*.42, -9.6+i*.42+.32, (a-2.2)*D, (a+2.2)*D, .02, new THREE.MeshBasicMaterial({ color:c }), S, 1, 1)); }
// majáky (červené, blikají) nahoře a dole – kopulka + sklo
for (const [y,z] of [[2.0,-6],[-2.4,1.5]]){
  mesh(new THREE.CylinderGeometry(.13,.16,.06,12), tGreyD, S, 0, y + (y>0 ? .02 : -.02), z);
  const b = keep(mesh(new THREE.SphereGeometry(.13,10,6, 0, Math.PI*2, 0, Math.PI/2), new THREE.MeshBasicMaterial({ color:0xff3a2a }), S, 0, y + (y>0 ? .04 : -.04), z));
  if (y < 0) b.rotation.x = Math.PI; NAV.push({ o:b, blink:1.1, ph:z });
}
// zadní bílé světlo na konci trupu
{ const p = keep(mesh(new THREE.SphereGeometry(.09,8,6), new THREE.MeshBasicMaterial({ color:0xffffff }), S, 0, fus(21.3).cy, 21.42)); NAV.push({ o:p }); }

// ===================== křídla =====================
const WU = Cl(0x8f98a2), WL = Cl(0xadb4bc);
const LE = s => -5.2 + .681*s, TE = s => s <= 7 ? 3.6 + .8*s/7 : 4.4 + 5.2*(s-7)/11.8;
const ENG = [5.7, 11.4];
for (const sx of [-1,1]){
  const w = new THREE.Group(); w.position.set(sx*1.6, -1.05, 0); w.rotation.z = sx*.11; S.add(w);
  const st = tipCap(stations(-.6, 18.75, .4, [6.85,7.15,13.05,13.35,17.45,17.75,2.35,2.65,16.6,16.8,17.0], LE, s => TE(s)-LE(s), s => .64 - .43*s/18.75), .28);
  const g = surf(st, (s,z,v) => [sx*s, v, z], (s,f,sd,c) => {
    c.copy(sd > 0 ? WU : WL); let m = 1;
    if (f >= .73 && f <= .77 && s > 2.4 && s < 17.7) m *= .82;                                     // závěs klapek / křidélek
    else if (f > .77) m *= s > 13.2 ? .93 : .96;
    if (sd > 0 && f === .65 && s > 2.5 && s < 13) m *= .88;                                       // spoilery
    if (f > .76 && [2.5,7,13.2,17.6].some(b => Math.abs(s-b) < .2)) m *= .85;                    // dělení ploch
    if (f < .03) m *= 1.06;                                                                         // náběžná hrana
    for (const e of ENG){ const k = Math.exp(-Math.pow((s-e)/.85,2)); m *= sd < 0 ? 1 - .3*k*sm(.3,.95,f) : 1 - .1*k*sm(.6,1,f); }   // saze z výfuku
    if (sd > 0){ const k = Math.exp(-Math.pow((s-16.8)/.22,2)); m *= 1 - .16*k*sm(.35,.55,f); } // stopa od palivového odvzdušnění
    m *= 1 - .05*(.5+.5*Math.sin(s*2.3+f*7))*(.5+.5*Math.sin(s*.7-f*3));
    c.multiplyScalar(m);
  });
  mesh(g, TVC, w);
  // vodicí lišty klapek (kanoe pod odtokovou hranou)
  for (const s of [2.9, 8.6, 14.3]){
    const z0 = LE(s) + .5*(TE(s)-LE(s)), z1 = TE(s) + .95;
    mesh(toned(loft([[z0,-.12,.02,.02,sx*s],[z0+.45,-.2,.12,.17,sx*s],[(z0+z1)/2,-.24,.14,.25,sx*s],[z1-.45,-.24,.11,.2,sx*s],[z1,-.17,.02,.03,sx*s]],12), 0x9aa2ab, 0xaab1b9, .04), TVC, w);
  }
  // palivové odvzdušnění (NACA) pod křídlem + výpustná trubka paliva na konci
  mesh(new THREE.BoxGeometry(.32,.03,.5), tDark, w, sx*16.2, -.08, LE(16.2)+.9);
  mesh(new THREE.CylinderGeometry(.035,.035,.55,6).rotateX(Math.PI/2), tGreyD, w, sx*17.9, 0, TE(17.9)+.15);
  // statické výboje na konci
  for (const k of [0,1,2]) mesh(new THREE.CylinderGeometry(.008,.008,.3,4).rotateX(Math.PI/2), tDark, w, sx*(18.2+k*.25), .02, TE(18.2+k*.25)+.12);
  // světla na konci křídla: poziční (červ./zel.) a bílý stroboskop
  const nl = keep(mesh(new THREE.SphereGeometry(.14,8,6), new THREE.MeshBasicMaterial({ color: sx<0 ? 0xff2a1a : 0x2aff5a }), w, sx*19.0, 0, LE(19)+.35)); NAV.push({ o:nl });
  const stb = keep(mesh(new THREE.SphereGeometry(.1,8,6), new THREE.MeshBasicMaterial({ color:0xffffff }), w, sx*19.0, 0, LE(19)+1.3)); NAV.push({ o:stb, blink:.8, ph:sx });
  // ===== motory CFM56 (F108) =====
  for (const k of ENG){
    const eng = new THREE.Group(); eng.position.set(sx*k, -1.32, LE(k) - 1.9); w.add(eng);
    const prof = [[.84,-1.9],[.87,-2.3],[.9,-2.6],[.94,-2.72],[.99,-2.77],[1.05,-2.76],[1.09,-2.7],[1.12,-2.58],[1.14,-2.3],[1.15,-1.78],[1.15,-1.72],[1.15,-1.2],
                  [1.14,-.6],[1.13,-.28],[1.13,-.22],[1.1,.05],[1.06,.3],[1.0,.44],[.84,.46],[.8,.5],[.78,.7],[.72,1.2],[.64,1.7],[.56,2.05],[.5,2.2],[.44,2.22]];
    const nac = colorize(lathe(prof, 30), (x,y,z,nx,ny,nz,c) => {
      const r = Math.hypot(x,y), inward = (nx*x+ny*y)/r < -.2;
      if (inward && z < -1.85) { c.setHex(0x59606a); return; }                                   // vnitřek sání
      if (z < -2.55) { c.setHex(0xd9dde1); return; }                                              // leštěný náběžný prstenec
      if (z > .43){ c.setHex(0x8e8a84); c.multiplyScalar(1 - .45*sm(1.2,2.2,z)); return; }       // jádro – žár, saze
      c.setHex(0xb0b7bf); let m = 1;
      if (Math.abs(z+1.75) < .05 || Math.abs(z+.25) < .05) m *= .8;                               // švy kapot
      if (ny < -.3) m *= 1 - .07*sm(-1,.4,z);                                                     // špína dole
      c.multiplyScalar(m);
    });
    mesh(nac, TVC, eng);
    mesh(new THREE.CircleGeometry(.86,28).rotateY(Math.PI), LM(0x23282e), eng, 0,0,-1.86);                  // čelo ventilátoru
    mesh(new THREE.ConeGeometry(.3,.62,20).rotateX(-Math.PI/2), LM(0xd6dade, { roughness:.5 }), eng, 0,0,-2.2); // kužel (spinner)
    const fanM = LM(0x6a717b, { roughness:.45 });
    for (let i=0;i<22;i++){ const gr = new THREE.Group(); gr.rotation.z = i/22*Math.PI*2; eng.add(gr); const b = mesh(new THREE.BoxGeometry(.15,.52,.025), fanM, gr, 0,.58,-1.92); b.rotation.y = .55; }
    mesh(new THREE.RingGeometry(.8,1.0,28), LM(0x1d2126), eng, 0,0,.45);                                    // výstup obtokového proudu
    mesh(new THREE.CircleGeometry(.45,22), LM(0x1d2126), eng, 0,0,2.21);
    mesh(new THREE.ConeGeometry(.4,.85,20).rotateX(Math.PI/2), LM(0x5f5c58, { roughness:.6 }), eng, 0,0,2.62); // výstupní kužel
    // pylon
    mesh(side([[-1.5,.98],[1.4,.9],[2.6,.75],[3.6,1.0],[3.8,1.5],[1.0,1.6],[-.9,1.35]], .3), tGrey, eng);
  }
}
// ===================== ocasní plochy =====================
const FIN = Cl(0x8d96a0);
{
  const fLE = s => 12.6 + (s-1.2)*(6.7/7.6), fTE = s => 20.6 + (s-1.2)*(.6/7.6);
  const st = tipCap(stations(1.2, 8.7, .35, [1.85,1.95,6.08,6.12,7.08,7.12,7.18,7.22,7.36,7.4,8.4,8.5], fLE, s => fTE(s)-fLE(s), s => .58 - .36*(s-1.2)/7.5), .18);
  const g = surf(st, (s,z,v) => [v, s, z], (s,f,sd,c) => {
    c.copy(FIN); let m = 1;
    if (s > 1.9 && s < 8.45){ if (f >= .73 && f <= .77) m *= .82; else if (f > .77) m *= .95; }
    if (f > .76 && (Math.abs(s-1.9) < .07 || Math.abs(s-8.45) < .07)) m *= .85;
    if (s > 6.1 && s < 7.1) { c.setHex(0x2a55a3); m = f > .77 ? .93 : 1; }                    // pruh na SOP (tail flash)
    else if (s > 7.2 && s < 7.38) c.setHex(0xe2b63a);                                              // žlutá linka
    if (f < .03) m *= 1.05;
    c.multiplyScalar(m);
  });
  mesh(g, TVC, S);
  // hřbetní náběžník (dorsal fillet)
  mesh(side([[7.4,1.85],[10.4,2.06],[12.4,2.35],[13.8,2.9],[14.9,3.75],[15.8,3.75],[15.8,1.8]], .3), LM(0x8d96a0), S);
  // VF anténa na špici SOP (dopředu trčící sonda)
  mesh(new THREE.CylinderGeometry(.03,.1,2.0,8).rotateX(Math.PI/2), LM(0x6f7780), S, 0, 8.62, 18.6);
  mesh(new THREE.BoxGeometry(.12,.12,.5), LM(0x8d96a0), S, 0, 8.7, 19.6);
  // VOP s výškovkami
  const hLE = s => 15.2 + s*(4/6.6), hTE = s => 19.6 + s*(.8/6.6);
  for (const sx of [-1,1]){
    const st2 = tipCap(stations(0, 6.55, .35, [.75,.85,3.3,3.4], hLE, s => hTE(s)-hLE(s), s => .34 - .22*s/6.6), .15);
    const g2 = surf(st2, (s,z,v) => [sx*(s+.3), 1.2 + v + s*.12, z], (s,f,sd,c) => {
      c.copy(sd > 0 ? WU : WL); let m = 1;
      if (s > .8){ if (f >= .73 && f <= .77) m *= .82; else if (f > .77) m *= .95; }
      if (f > .76 && (Math.abs(s-.8) < .07 || Math.abs(s-3.35) < .07)) m *= .86;
      c.multiplyScalar(m);
    });
    mesh(g2, TVC, S);
  }
}
// kapotáž závěsu tyče pod ocasem
mesh(toned(loft([[15.6,-.05,.3,.25],[16.4,-.28,.6,.48],[17.5,-.36,.62,.5],[18.4,-.18,.45,.36],[19.1,.05,.18,.15],[19.3,.12,.02,.02]],24), 0xa2aab3, 0xb2b9c1, .05), TVC, S);
bake(S);

// ===================== tankovací tyč =====================
const boom = new THREE.Group(); boom.position.set(0,-.45,17.6); tanker.add(boom);
const boomMat = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.6, metalness:.05 }), boomX = new THREE.MeshBasicMaterial({ color:0xd6ecff, transparent:true, opacity:.35, depthWrite:false });
let boomOuter;
{
  const prof = [[.01,-.48],[.22,-.42],[.38,-.24],[.45,0],[.43,.3],[.37,.72],[.34,1.05],[.335,1.5],[.33,3.42],[.348,3.46],[.348,3.62],[.33,3.66],
                [.32,6.42],[.338,6.46],[.338,6.6],[.32,6.64],[.31,8.5],[.35,8.78],[.41,9.1],[.42,9.6],[.4,10.1],[.33,10.45],[.3,10.72]];
  const B0 = 11.0, BW = .17; for (let i=0;i<=5;i++){ prof.push([.3, B0+i*BW-.006], [.3, B0+i*BW+.006]); }
  prof.push([.3,11.86],[.338,11.9],[.338,12.08],[.26,12.13],[.19,12.12]);
  const tube = colorize(lathe(prof, 22), (x,y,z,nx,ny,nz,c) => {
    c.setHex(0xb9c0c8); let m = 1;
    if (z < 1.0) m *= .82;
    if (z > B0 && z < B0 + 5*BW) c.setHex(Math.floor((z-B0)/BW) % 2 ? 0xe6e4dc : 0x3c4047);  // výstražné pruhy
    if ((z > 3.44 && z < 3.64) || (z > 6.44 && z < 6.62) || z > 11.88) m *= .85;
    if (ny < -.2) m *= 1 - .08*sm(2,11,z);                                                      // stékající hydraulika / špína
    m *= 1 - .04*(.5+.5*Math.sin(z*2.7 + Math.atan2(y,x)*3));
    c.multiplyScalar(m);
  });
  // horní kapotáž lana/kladky (hoist fairing) + boční lišty
  const fair = colorize(loft([[.85,.26,.02,.02],[1.35,.33,.1,.1],[4.1,.33,.1,.1],[4.9,.29,.02,.02]],12), (x,y,z,nx,ny,nz,c) => c.setHex(0xa9b0b8));
  const rails = [];
  for (const sx of [-1,1]) rails.push(colorize(new THREE.BoxGeometry(.04,.06,7.4).translate(sx*.32,-.06,5.0), (x,y,z,nx,ny,nz,c) => c.setHex(0x99a0a8)));
  boomOuter = mesh(mergeGeos([tube, fair, ...rails], true), boomMat, boom);
}
const steel = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.28, metalness:.42 });
const boomInner = mesh(colorize(lathe([[.17,-3],[.17,-.36],[.17,-.34],[.17,-.2],[.17,-.18],[.17,.5],[.17,.52],[.17,.66],[.17,.68],[.17,1.5],[.17,1.52],[.17,1.6],[.17,1.62],[.17,3]], 18),
  (x,y,z,nx,ny,nz,c) => {
    c.setHex(0xe4e8ec);
    if (z > -.35 && z < -.19) c.setHex(0xc23a2e); else if (z > .51 && z < .67) c.setHex(0xe8c547); else if (z > 1.51 && z < 1.61) c.setHex(0x2e3136);
    c.multiplyScalar(1 - .06*(.5+.5*Math.sin(z*9 + Math.atan2(y,x)*2)));
  }), steel, boom);
const nozzle = mesh(colorize(lathe([[.02,-.34],[.18,-.34],[.21,-.31],[.21,-.18],[.17,-.14],[.19,-.08],[.205,-.02],[.2,.03],[.17,.08],[.12,.11],[.11,.13],[.11,.21],[.14,.23],[.14,.275],[.1,.3],[.02,.305]], 20),
  (x,y,z,nx,ny,nz,c) => { c.setHex(z < -.15 ? 0x50555d : z < .1 ? 0xd2d7dc : z < .225 ? 0x3d4148 : 0xe0e3e6); }), steel, boom);
const nozzleTip = new THREE.Object3D(); boom.add(nozzleTip);
// světlo na konci vnější trubky (boom nozzle light)
mesh(new THREE.BoxGeometry(.1,.05,.14), new THREE.MeshBasicMaterial({ color:0xfff4d8 }), boom, 0,-.33,11.95);
const rudds = [];
for (const sx of [-1,1]){
  const r = new THREE.Group(); r.position.set(0,0,9.6); boom.add(r);
  const st = tipCap(stations(.3, 1.92, .2, [1.7,1.74], s => -.42 + (s-.3)*.2, s => 1.0 - (s-.3)*.24, s => .11 - .05*(s-.3)/1.62), .07);
  mesh(surf(st, (s,z,v) => [sx*s, v, z], (s,f,sd,c) => {
    c.setHex(0xaeb5bd); let m = 1;
    if (f >= .73 && f <= .77) m *= .8; else if (f > .77) m *= .93;
    if (s > 1.72) c.setHex(0x3a3e45);
    if (f < .03) m *= 1.06;
    c.multiplyScalar(m);
  }), TVC, r);
  r.rotation.z = sx*.75; rudds.push(r);
}
// fuel "x-ray" částice
const fuelDots = []; const fuelMat = new THREE.MeshBasicMaterial({ color:0xffb347 });
for (let i=0;i<34;i++){ const d = new THREE.Mesh(new THREE.BoxGeometry(.18,.18,.38), fuelMat); d.visible=false; boom.add(d); fuelDots.push(d); }

// ===================== kabina operátora (pod pod ocasem) =====================
const pod = new THREE.Group(); pod.position.set(0,-1.15,15.0); tanker.add(pod);
const PS = [[-2.7,.5,.45,.25],[-2.2,.3,.8,.55],[-1.4,.12,.98,.74],[-.4,.04,1.03,.78],[.6,.02,1.0,.72],[1.0,.06,.92,.61],[1.3,.15,.8,.46],[1.6,.3,.64,.33],[2.0,.48,.44,.22],[2.35,.6,.2,.12]];
const podF = z => { let i = 0; while (i < PS.length-2 && z > PS[i+1][0]) i++; const A = PS[i], B = PS[i+1], t = cl((z-A[0])/(B[0]-A[0])), u = t*t*(3-2*t)*.35 + t*.65;
  return { cy:A[1]+(B[1]-A[1])*u, rx:A[2]+(B[2]-A[2])*u, ry:A[3]+(B[3]-A[3])*u }; };
const podS = (z,a) => { const f = podF(z); return V(f.rx*Math.cos(a), f.cy + f.ry*Math.sin(a), z); };
const podZs = []; for (let z=-2.7; z<2.35; z+=.1) podZs.push(z); podZs.push(2.35);
function podLoft(a0fn, a1fn, seg, skip){
  const pos = [], idx = [];
  podZs.forEach(z => { const a0 = a0fn(z), a1 = a1fn(z); for (let i=0;i<=seg;i++){ const p = podS(z, a0 + (a1-a0)*i/seg); pos.push(p.x,p.y,p.z); } });
  for (let s=0;s<podZs.length-1;s++) for (let i=0;i<seg;i++){ const a = s*(seg+1)+i, b = a+seg+1;
    if (skip){ const c = V((pos[a*3]+pos[(b+1)*3])/2, (pos[a*3+1]+pos[(b+1)*3+1])/2, (pos[a*3+2]+pos[(b+1)*3+2])/2); if (skip(c)) continue; }
    idx.push(a,a+1,b, a+1,b+1,b); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos,3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const podHull = mesh(podLoft(() => -Math.PI, () => Math.PI, 40), tGrey, pod);
// okno operátora: velké zadní (skloněné dozadu-dolů) + 2 boční
const WIN_P = V(0,-.35,1.26), WIN_R = .8;
const podCav = mesh((() => { const s = new THREE.Shape(); s.moveTo(-.6,-.4); s.lineTo(.6,-.4); s.lineTo(.6,.4); s.lineTo(-.6,.4); s.lineTo(-.6,-.4);
  const h = new THREE.Path(); h.moveTo(-.5,-.31); h.lineTo(-.5,.31); h.lineTo(.5,.31); h.lineTo(.5,-.31); h.lineTo(-.5,-.31); s.holes.push(h); return new THREE.ShapeGeometry(s); })(), tDark, pod);
podCav.position.copy(WIN_P); podCav.rotation.x = WIN_R; podCav.translateZ(.012);
const podWin = new THREE.Group(); podWin.position.copy(WIN_P); podWin.rotation.x = WIN_R; pod.add(podWin);
{
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.0,.62), new THREE.MeshBasicMaterial({ color:0x35506e, transparent:true, opacity:.55, depthWrite:false, side:THREE.DoubleSide }));
  gl.position.z = .03; gl.renderOrder = 6; podWin.add(gl);
  const glare = new THREE.Mesh(new THREE.PlaneGeometry(.09,.75), new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:.28, depthWrite:false }));
  glare.position.set(-.18,0,.04); glare.rotation.z = -.55; glare.renderOrder = 7; podWin.add(glare);
  const glare2 = glare.clone(); glare2.scale.x = .45; glare2.position.x = -.05; podWin.add(glare2);
  for (const [w,h,x,y] of [[1.1,.06,0,.34],[1.1,.06,0,-.34],[.06,.74,.53,0],[.06,.74,-.53,0]]) mesh(new THREE.BoxGeometry(w,h,.07), frameM, podWin, x,y,.03);
}
// boční okna – děti trupu podu (v řezu S5 se skryjí spolu s ním)
const SW = [[-.05,.62,-36*D,-10*D],[-.05,.62,190*D,216*D]];
for (const [z0,z1,a0,a1] of SW){
  patch(podS, z0-.05, z1+.05, a0-4*D, a1+4*D, .012, frameM, podHull, 3, 3);
  patch(podS, z0, z1, a0, a1, .022, lightGlass, podHull, 3, 3);
}
// řez podem (jen S5): vnitřní plášť (vzdálená polovina), světlý okraj řezu, podlaha, konzole
const podCut = new THREE.Group(); pod.add(podCut); podCut.visible = false;
const opParts = [];
{
  const XC = -.52, Aof = z => Math.acos(cl(XC/podF(z).rx, -1, 1));
  const inWin = c => (c.z > 1.0 && c.z < 1.52 && Math.abs(c.x) < .5 && c.y < -.05) || (c.z > -.05 && c.z < .62 && c.x > .3 && c.y < podF(c.z).cy - .05 && c.y > podF(c.z).cy - podF(c.z).ry*.62);
  const inner = podLoft(z => -Aof(z), z => Aof(z), 34, inWin);
  colorize(inner, (x,y,z,nx,ny,nz,c) => { c.setHex(0x3a4250); c.multiplyScalar(Math.floor((z+3)/.42) % 2 ? .86 : 1); });
  const inM = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.9, side:THREE.DoubleSide });
  const ih = mesh(inner, inM, podCut); ih.castShadow = false; ih.receiveShadow = false;
  const edge = LM(0xe6eaef);
  for (const sg of [1,-1]){
    const pts = podZs.map(z => podS(z, sg*Aof(z)));
    const tb = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, .03, 6), edge, podCut); tb.receiveShadow = false;
  }
  // rámy okna zevnitř (vzdálené boční okno)
  const w = mesh(new THREE.PlaneGeometry(.66,.36), new THREE.MeshBasicMaterial({ color:0x9fc8ee, transparent:true, opacity:.3, depthWrite:false, side:THREE.DoubleSide }), podCut);
  const wc = podS(.29, -23*D); w.position.copy(wc); w.lookAt(wc.clone().add(V(Math.cos(-23*D), Math.sin(-23*D)*1.3, 0))); w.renderOrder = 6;
  const cm = LM(0x262c36), cm2 = LM(0x3c4452), lit = c => new THREE.MeshBasicMaterial({ color:c });
  const P = (g,m,x,y,z) => { const o = mesh(g,m,podCut,x,y,z); o.receiveShadow = false; return o; };
  P(new THREE.BoxGeometry(1.08,.04,3.1), LM(0x2b313b), .02,-.6,-.75);                          // podlaha
  P(new THREE.BoxGeometry(1.12,1.0,.05), cm2, .03,-.12,-2.25);                                    // zadní přepážka
  // pult pod oknem s displeji
  const pan = P(new THREE.BoxGeometry(.62,.05,.34), cm, 0,-.48,.98); pan.rotation.x = -.55;
  for (const [x,c] of [[-.15,0x5dff9a],[.12,0xffb347]]){ const s = P(new THREE.BoxGeometry(.18,.02,.13), lit(c), x,-.45,.97); s.rotation.x = -.55; }
  for (let i=0;i<5;i++){ const s = P(new THREE.BoxGeometry(.025,.02,.025), lit(i%2 ? 0xff5040 : 0x9fe8ff), -.2+i*.1,-.405,1.08); s.rotation.x = -.55; }
  // boční konzole (levá: teleskop, pravá: řízení tyče)
  for (const sx of [-1,1]){
    const ch = sx < 0 ? .1 : .14;                                                              // bližší konzole nižší (nezakrývá ruku)
    P(new THREE.BoxGeometry(.2,ch,.62), cm, sx*.38,-.6+ch/2,.72);
    for (let i=0;i<3;i++) P(new THREE.BoxGeometry(.03,.012,.03), lit([0x5dff9a,0xffd23c,0x9fe8ff][i]), sx*.38 + (i-1)*.05,-.595+ch,.5);
  }
  // stropní světlo (teplé)
  P(new THREE.BoxGeometry(.3,.02,.08), lit(0xffe2a8), .25,.45,-.2);
  // potrubí / žebra na vzdálené stěně
  for (let z=-1.9; z<.8; z+=.42){ const p = podS(z, -5*D); P(new THREE.BoxGeometry(.03,.9,.04), cm2, p.x-.04, p.y+.05, z); }
}
// ===================== operátor: leží na břiše, hlava u okna (+z), ruce na ovladačích =====================
const op = new THREE.Group(); op.position.set(0,-.2,.15); pod.add(op);
{
  const suit = LM(0x6f7b55), suitD = LM(0x4d5639), vest = LM(0x3f4730), skin = LM(0xc89276), boot = LM(0x1e1e20), glove = LM(0xb09670),
        helmet = LM(0xd2d5cf), dark = LM(0x23262a), couch = LM(0x3b4150), metal = LM(0x5a616b), patchM = LM(0x2b55a0);
  const M = (g,m,x=0,y=0,z=0,par=op) => { const o = mesh(g,m,par,x,y,z); o.receiveShadow = false; opParts.push(o); return o; };
  const limb = (a, b, r1, r2, m, par=op) => { const o = M(new THREE.CylinderGeometry(r2, r1, 1, 12, 1), m, 0,0,0, par); beam(o, a, b); return o; };
  const ball = (p, r, m, par=op) => M(new THREE.SphereGeometry(r, 12, 8), m, p.x, p.y, p.z, par);
  // lehátko: polstr, rám, opěrka brady
  M(loft([[-1.98,-.21,.05,.02],[-1.94,-.21,.27,.055],[.08,-.21,.27,.055],[.12,-.21,.05,.02]],20), couch);
  M(new THREE.BoxGeometry(.42,.1,1.95), metal, 0,-.32,-.92);
  for (const z of [-1.75,-.15]) M(new THREE.BoxGeometry(.06,.12,.06), metal, 0,-.42,z);
  M(new THREE.CylinderGeometry(.025,.025,.36,6), metal, 0,-.24,.6);
  M(loft([[.52,-.07,.02,.02],[.54,-.06,.08,.035],[.67,-.06,.08,.035],[.69,-.07,.02,.02]],12), couch);           // opěrka brady
  for (const sx of [-1,1]) M(new THREE.BoxGeometry(.13,.05,.36), couch, sx*.3,-.2,.3);                           // opěrky loktů
  // trup (zužující se: boky → pas → hrudník → ramena), vesta, opasek, límec
  const TOR = [[-1.0,-.07,.05,.04],[-.95,-.06,.14,.1],[-.86,-.05,.18,.125],[-.72,-.055,.185,.12],[-.56,-.07,.155,.105],[-.4,-.06,.168,.112],
               [-.22,-.04,.195,.122],[-.05,-.02,.215,.123],[.06,.0,.222,.112],[.13,.02,.18,.09],[.18,.04,.075,.06]];
  M(loft(TOR, 24), suit);
  M(loft([[-.47,-.05,.02,.02],[-.44,-.055,.172,.12],[-.05,-.015,.225,.134],[.05,0,.23,.125],[.09,.005,.02,.02]],24), vest);
  M(loft([[-.62,-.065,.165,.112],[-.58,-.065,.17,.116],[-.54,-.068,.165,.112]],24), dark);                     // opasek
  M(loft([[.14,.025,.12,.085],[.19,.05,.09,.07],[.22,.06,.06,.05]],16), suitD);                                 // límec
  // nohy: stehna, kolena, holeně, boty (špičky dolů), kapsy
  for (const sx of [-1,1]){
    const Hh = V(sx*.1,-.06,-.86), K = V(sx*.13,-.09,-1.3), A = V(sx*.14,-.08,-1.74);
    limb(Hh, K, .095, .07, suit); ball(K, .07, suit); limb(K, A, .066, .046, suit); ball(A, .047, suitD);
    const b = M(new THREE.BoxGeometry(.1,.2,.11), boot, sx*.14,-.15,-1.8); b.rotation.x = .25;
    M(new THREE.BoxGeometry(.11,.05,.12), boot, sx*.14,-.25,-1.78);
    const pk = M(new THREE.BoxGeometry(.03,.11,.15), suitD, sx*.205,-.07,-1.07); pk.rotation.y = sx*-.06;
  }
  // paže: rameno → loket (na opěrce) → zápěstí → pěst sevřená na páce
  for (const sx of [-1,1]){
    const Sh = V(sx*.2,.03,.07), E = V(sx*.3,-.135,.31), Wr = V(sx*.295,-.1,.57), G = V(sx*.29,-.09,.63);
    ball(Sh, .07, suit); limb(Sh, E, .066, .054, suit); ball(E, .054, suit); limb(E, Wr, .052, .04, suit);
    limb(V(sx*.297,-.104,.53), Wr.clone().add(V(0,0,.015)), .046, .046, suitD);                            // manžeta
    // páka (vychází z konzole) + hlavice
    M(new THREE.CylinderGeometry(.04,.065,.07,10), dark, sx*.29,-.3,.63);                                  // gumová manžeta
    M(new THREE.CylinderGeometry(.018,.018,.16,8), dark, sx*.29,-.2,.63);
    M(new THREE.CylinderGeometry(.026,.03,.13,10), dark, sx*.29,-.105,.63);
    M(new THREE.SphereGeometry(.03,8,6), LM(0xb0302a), sx*.29,-.035,.635);                                  // spoušť/tlačítko
    // pěst: dlaň + prsty kolem rukojeti + palec nahoře
    const fist = M(new THREE.SphereGeometry(.05,12,8), glove, sx*.29,-.095,.615); fist.scale.set(.95,1.15,1.0);
    const kn = M(new THREE.CapsuleGeometry(.022,.07,4,8), glove, sx*.29,-.105,.66); kn.rotation.x = Math.PI/2*0; kn.scale.set(1.1,1,1);
    const th = M(new THREE.CapsuleGeometry(.014,.04,4,6), glove, sx*.285,-.04,.62); th.rotation.x = 1.1;
  }
  // nášivka na levém rameni
  { const pa = M(new THREE.BoxGeometry(.012,.06,.07), patchM, -.255,.0,.17); pa.rotation.z = -.5; }
  // krk + hlava
  limb(V(0,.04,.17), V(0,.075,.33), .055, .05, skin);
  const head = new THREE.Group(); head.position.set(0,.11,.43); head.rotation.x = .55; op.add(head);
  const hs = M(new THREE.SphereGeometry(.1,20,14), skin, 0,0,0, head); hs.scale.set(.86,1.04,1.06);                // lebka/obličej
  const jaw = M(new THREE.SphereGeometry(.065,14,10), skin, 0,-.06,.04, head); jaw.scale.set(1.0,.85,1.05);       // brada/čelist
  const nose = M(new THREE.ConeGeometry(.02,.05,8).rotateX(Math.PI/2), skin, 0,-.015,.112, head); nose.rotation.x = .35;
  const brow = M(new THREE.CapsuleGeometry(.016,.1,4,8), LM(0xb98468), 0,.032,.088, head); brow.rotation.z = Math.PI/2;
  for (const sx of [-1,1]){
    M(new THREE.SphereGeometry(.011,6,6), LM(0x1b1612), sx*.034,.012,.094, head);                                // oči
    M(new THREE.BoxGeometry(.04,.01,.012), LM(0x3a2a20), sx*.034,.04,.1, head);                                  // obočí
    const cup = M(new THREE.CylinderGeometry(.045,.045,.045,14).rotateZ(Math.PI/2), dark, sx*.105,-.005,.0, head); // sluchátka
    M(new THREE.CylinderGeometry(.03,.03,.02,10).rotateZ(Math.PI/2), LM(0x55595f), sx*.13,-.005,0, head);
  }
  M(new THREE.BoxGeometry(.04,.007,.008), LM(0x6e3f35), 0,-.052,.096, head);                                    // ústa
  // přilba (horní a zadní část) + kryt hledí
  const hel = M(new THREE.SphereGeometry(.124,22,14, 0, Math.PI*2, 0, 1.75), helmet, 0,.012,-.012, head); hel.rotation.x = -.55;
  const vis = M(new THREE.CylinderGeometry(.128,.128,.05,20,1,true, -1.1, 2.2), LM(0x2c3036), 0,.075,.02, head); vis.rotation.x = -.45;
  // mikrofon
  limb(V(-.12,-.02,.02), V(-.035,-.06,.105), .007, .007, dark, head); M(new THREE.SphereGeometry(.016,8,6), dark, -.03,-.062,.11, head);
}

function setBoom(ang, ext, yaw=0){
  boom.rotation.set(ang, yaw, 0);
  boomInner.position.z = 9.5 + ext; nozzle.position.z = 12.6 + ext; nozzleTip.position.z = 12.9 + ext;
}
function boomTipWorld(ang, ext){ setBoom(ang, ext); tanker.updateMatrixWorld(true); return nozzleTip.getWorldPosition(new THREE.Vector3()); }
function updateNav(t){ NAV.forEach(n => { n.o.visible = !n.blink || ((t + (n.ph||0)*.37) % n.blink) < .12; }); }

return { tanker, boom, boomOuter, boomInner, nozzle, nozzleTip, rudds, boomMat, boomX, fuelDots, fuelMat,
         pod, podHull, podCav, podWin, podCut, op, opParts, NAV, tGrey, tGreyD, tDark, glass, TVC,
         setBoom, boomTipWorld, updateNav };
}
