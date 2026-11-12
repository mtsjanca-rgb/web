// F-16C receiver model. Local frame: metres, nose → −z, +y up, right wing = +x. RECEPT = receptacle point in fighter-local coords.
// Built from dense custom lofts (vertex-colour two-tone paint with panel/wear variation), not primitives.
import * as THREE from "../lib/three.module.js";
import { plan, side, mesh, LM, cl } from "./helpers.js";

export function buildFighter(scene){
const fighter = new THREE.Group(); if (scene) scene.add(fighter);
const VC = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.66, metalness:0 });
const VC2 = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.66, metalness:0, side:THREE.DoubleSide });
const recDoor = new THREE.Group();
const fTanks = [];             // nádrže pro rentgen
const fDecals = [];            // obtisky (v rentgenu skryté)
const fLights = [];            // formační pásky + poziční světla
const V3 = (x,y,z)=>new THREE.Vector3(x,y,z), V2 = (x,y)=>new THREE.Vector2(x,y);
const sm = (a,b,x)=>{ const t = cl((x-a)/(b-a)); return t*t*(3-2*t); };
const hash = (a,b,c)=>{ const s = Math.sin(a*127.1+b*311.7+c*74.7)*43758.5453; return s-Math.floor(s); };
const sp = (v,e)=>Math.sign(v)*Math.pow(Math.abs(v),e);

// ---- barvy (USAF two-tone: FS36270 nahoře / FS36375 dole) ----
const TOP = 0x78818b, BOT = 0xadb3b9, RADOME = 0x5b636c, DIEL = 0x4c535b;

// ---------------- geometrické pomůcky ----------------
function curve(rows){ // [z, v1, v2…] → f(z) → [v…], Hermite (Catmull-Rom, nerovnoměrné kroky)
  return z => { let i = 0; while (i < rows.length-2 && z > rows[i+1][0]) i++;
    const p1 = rows[i], p2 = rows[i+1], p0 = rows[Math.max(0,i-1)], p3 = rows[Math.min(rows.length-1,i+2)];
    const h = p2[0]-p1[0], t = cl((z-p1[0])/h), t2 = t*t, t3 = t2*t, out = [];
    for (let k=1;k<p1.length;k++){
      const m1 = (p2[k]-p0[k])/((p2[0]-p0[0])||1)*h, m2 = (p3[k]-p1[k])/((p3[0]-p1[0])||1)*h;
      out.push((2*t3-3*t2+1)*p1[k] + (t3-2*t2+t)*m1 + (-2*t3+3*t2)*p2[k] + (t3-t2)*m2);
    } return out; };
}
// rings: pole prstenců [[x,y,z]…] seřazené podél osy w (0=x,1=y,2=z); normály ven; caps [start,end]; closed = uzavřený prstenec
function tube(rings, w=2, caps=[false,false], closed=true){
  const u = (w+1)%3, v = (w+2)%3, n = rings[0].length, r0 = rings[rings.length>>1];
  let A = 0; for (let i=0;i<n-(closed?0:1);i++){ const p = r0[i], q = r0[(i+1)%n]; A += p[u]*q[v]-q[u]*p[v]; }
  if (A < 0) rings = rings.map(r=>r.slice().reverse());
  const pos = [], idx = [];
  rings.forEach(r=>r.forEach(p=>pos.push(p[0],p[1],p[2])));
  for (let s=0;s<rings.length-1;s++) for (let i=0;i<(closed?n:n-1);i++){ const a = s*n+i, b = s*n+(i+1)%n, c = a+n, d = b+n; idx.push(a,b,c, b,d,c); }
  caps.forEach((on,e)=>{ if (!on) return; const r = e ? rings[rings.length-1] : rings[0], base = pos.length/3;
    const cen = [0,0,0]; r.forEach(p=>{ cen[0]+=p[0]/n; cen[1]+=p[1]/n; cen[2]+=p[2]/n; });
    pos.push(...cen); r.forEach(p=>pos.push(p[0],p[1],p[2]));
    for (let i=0;i<n;i++){ const a = base+1+i, b = base+1+(i+1)%n; if (e) idx.push(base,a,b); else idx.push(base,b,a); } });
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos,3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function mirrorX(g){ g = g.clone(); g.scale(-1,1,1); const I = g.index.array; for (let i=0;i<I.length;i+=3){ const t = I[i+1]; I[i+1] = I[i+2]; I[i+2] = t; } g.computeVertexNormals(); return g; }
// dvoubarevný nátěr + panely (ne čáry) + opotřebení; o.k(x,y,z,ny) → 1 = horní barva; o.fn(c,x,y,z,ny) úpravy
function paint(g, top=TOP, bot=BOT, o={}){
  g.computeVertexNormals();
  const P = g.attributes.position, N = g.attributes.normal, ct = new THREE.Color(top), cb = new THREE.Color(bot), c = new THREE.Color(), col = [];
  const pa = o.panel ?? .08, wa = o.wear ?? .07;
  for (let i=0;i<P.count;i++){
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i), ny = N.getY(i), ax = Math.abs(x);
    const k = o.k ? o.k(x,y,z,ny) : sm(-.3,.25,ny);
    c.copy(cb).lerp(ct,k);
    const px = Math.floor(ax/.62), pz = Math.floor(z/.8 + (px%2)*.5), pv = (hash(pz, px, y>0?1:0)-.5)*pa;
    const n = Math.sin(x*1.7+z*.93+y*.4)*Math.sin(z*.57-x*.8+y*2.1) + .5*Math.sin(z*2.3+x*3.1) + .25*Math.sin(z*7.1-x*5.3);
    c.multiplyScalar(1 + pv - wa*(n*.4+.5));
    if (o.fn) o.fn(c,x,y,z,ny);
    col.push(c.r,c.g,c.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(col,3)); return g;
}
const geoM = (g, m, parent=fighter, x=0,y=0,z=0) => mesh(g, m, parent, x,y,z);
function rod(a, b, r, mat, parent=fighter, r2){ const A = V3(...a), d = V3(...b).sub(A), L = d.length();
  const m = mesh(new THREE.CylinderGeometry(r2??r, r, L, 10), mat, parent); m.position.copy(A).addScaledVector(d,.5); m.quaternion.setFromUnitVectors(V3(0,1,0), d.normalize()); return m; }
function tex(w, h, draw){ if (typeof document === "undefined") return null; const cv = document.createElement("canvas"); cv.width = w; cv.height = h; draw(cv.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function quad(a, b, c, d, uv=[[0,0],[1,0],[1,1],[0,1]]){ // a→b dolní hrana (u), d nad a (v)
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute([...a,...b,...c,...d],3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv.flat(),2)); g.setIndex([0,1,2, 0,2,3]); g.computeVertexNormals(); return g; }
function decalMat(map){ return new THREE.MeshStandardMaterial({ map, transparent:true, alphaTest:.4, roughness:.7, side:THREE.DoubleSide, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2 }); }
// profil křídla: P = { le(s), te(s), t(s), n:[normála tloušťky] }; kusy po tětivě [c0,c1] a rozpětí [s0,s1]
function aero(P, c0, c1, s0, s1, o={}){
  const nc = o.nc||10, ns = o.ns||6, rings = [];
  for (let j=0;j<=ns;j++){
    const s = s0+(s1-s0)*j/ns, L = P.le(s), T = P.te(s), ch = Math.hypot(T[0]-L[0],T[1]-L[1],T[2]-L[2]), tr = P.t(s), r = [];
    const cs = []; for (let i=0;i<=nc;i++) cs.push(c0+(c1-c0)*(1-Math.cos(i/nc*Math.PI))/2);
    const pt = (c, sg) => { const th = Math.max(.004, 5*tr*ch*(.2969*Math.sqrt(c)-.126*c-.3516*c*c+.2843*c*c*c-.1036*c*c*c*c));
      const dr = o.droop ? -(c-c0)*ch*o.droop : 0, off = sg*th + dr;
      return [L[0]+(T[0]-L[0])*c + P.n[0]*off, L[1]+(T[1]-L[1])*c + P.n[1]*off, L[2]+(T[2]-L[2])*c + P.n[2]*off]; };
    for (let i=nc;i>=0;i--) r.push(pt(cs[i], 1));
    for (let i=(c0===0?1:0); i<=(c1>=1?nc-1:nc); i++) r.push(pt(cs[i], -1));
    rings.push(r);
  }
  return tube(rings, P.w, o.caps||[false,true]);
}

// ================= TRUP =================
const BODY = curve([ // z, W (pološířka), T (vrch), B (spodek), F (LERX / blend), yc (výška hrany)
  [-7.62,.00,.05, .03,.00,.04],[-7.45,.16,.21,-.13,0,.04],[-7.2,.27,.32,-.24,0,.04],[-6.9,.36,.42,-.32,0,.05],[-6.5,.44,.51,-.40,0,.05],
  [-6.0,.50,.58,-.46,0,.06],[-5.3,.57,.65,-.52,0,.07],[-4.5,.63,.71,-.55,.07,.08],[-3.6,.69,.75,-.56,.17,.08],[-2.6,.75,.77,-.58,.29,.07],
  [-1.6,.81,.79,-.60,.44,.05],[-.73,.86,.80,-.62,.66,.03],[.3,.90,.80,-.62,.56,.02],[1.5,.92,.79,-.62,.45,.01],[2.7,.90,.76,-.60,.36,0],
  [3.8,.85,.72,-.58,.32,0],[4.8,.78,.67,-.56,.27,0],[5.7,.70,.62,-.55,.19,0],[6.4,.64,.58,-.55,.11,0],[6.95,.60,.55,-.55,.06,0]]);
const inCockpit = (x,z) => ((z+3.18)/1.12)**2 + (x/.40)**2 < 1;
function bodyRing(z, seg=72){ const [W0,T,B,F,yc] = BODY(z), W = Math.max(0,W0), r = [];
  for (let i=0;i<seg;i++){ const a = i/seg*Math.PI*2, c = Math.cos(a), s = Math.sin(a), e = 2/(s>0?2.5:2.3);
    const g = Math.pow(Math.max(0, 1-(s/.2)**2), 2);
    let x = Math.sign(c)*(W*Math.pow(Math.abs(c),e) + F*g), y = yc + (s>0 ? T-yc : yc-B)*sp(s,e);
    if (y > .5 && inCockpit(x,z)) y = .52;                       // kokpitová vana
    r.push([x,y,z]); } return r; }
function bodyX(z, y){ const r = bodyRing(z, 360); let best = r[0], bd = 9; r.forEach(p=>{ if (p[0]>0 && Math.abs(p[1]-y)<bd){ bd = Math.abs(p[1]-y); best = p; } }); return best[0]; }
{
  const zs = []; for (let z=-7.62; z<6.95; z += (z<-6.8 ? .04 : .075)) zs.push(z); zs.push(6.95);
  const g = tube(zs.map(z=>bodyRing(z)), 2, [false,false]);
  paint(g, TOP, BOT, { k:(x,y,z,ny)=> sm(-.3,.25,ny) * (y>.05 ? 1 : sm(-.6,.05,y)),
    fn:(c,x,y,z)=>{
      if (z < -5.98) c.lerp(new THREE.Color(RADOME), sm(-5.92,-6.04,z)*.95);       // tmavší radom
      if (y < .53 && y > .5 && inCockpit(x,z)) c.setHex(0x23272d);                  // vana kokpitu
      if (z > 6.0) c.multiplyScalar(1 - sm(6.0,6.95,z)*.28);                         // saze u trysky
    } });
  geoM(g, VC);
  // zadní přepážka (zakrývá konec trupu za tryskou)
  const cap = geoM(new THREE.CircleGeometry(1,28), LM(0x3b3d40), fighter, 0,0,6.94); cap.scale.set(.7,.56,1);
}
// ---- hřbet (dorsal spine) s prohlubní zásuvky ----
const SPINE = curve([[-2.34,.95,.06],[-2.22,1.28,.42],[-1.95,1.32,.46],[-1.5,1.2,.46],[-1.0,1.06,.45],[-.6,1.01,.45],[-.2,.99,.46],[.8,.97,.5],
                     [2.0,.94,.52],[3.0,.90,.50],[4.0,.84,.45],[5.0,.78,.38],[6.0,.72,.30],[6.8,.66,.22]]);
const inRec = (x,z) => Math.abs(x) < .235 && z > -.9 && z < -.3;
const spineY = (x,z) => { const [top,w] = SPINE(z); return .45 + (top-.45)*Math.pow(Math.max(0,1-Math.pow(Math.abs(x)/w,4)),.25); };
{
  const ring = z => { const [top,w] = SPINE(z), r = [];
    for (let i=0;i<56;i++){ const a = i/56*Math.PI*2, c = Math.cos(a), s = Math.sin(a);
      const x = w*sp(c,.5), y = s>0 ? .45 + (top-.45)*sp(s,.5) : .45 + .12*s;
      r.push([x, (y>.9 && inRec(x,z)) ? .86 : y, z]); } return r; };
  const zs = []; for (let z=-2.34; z<6.8; z += (z>-1.1 && z<-.1 ? .03 : .07)) zs.push(z); zs.push(6.8);
  const g = tube(zs.map(ring), 2, [true,false]);
  paint(g, TOP, BOT, { k:()=>1, fn:(c,x,y,z)=>{ if (y < .87 && y > .85 && inRec(x,z)) c.setHex(0x1c2024); } });
  geoM(g, VC);
}
// ---- sání pod trupem: kapota, břit, splitter, tmavý kanál ----
const TRUNK = curve([[-3.3,-1.02,.60,.36],[-2.8,-1.0,.63,.39],[-2.0,-.96,.66,.42],[-.8,-.92,.67,.42],[.8,-.86,.65,.38],[2.2,-.78,.60,.32],[3.4,-.70,.52,.24],[4.4,-.62,.42,.14],[5.1,-.58,.30,.05]]);
const MOUTH = TRUNK(-3.3);
const trunkRing = (z, sc=1, rake=0, dz=0) => { const [cy,w,h] = TRUNK(z), r = [];
  for (let i=0;i<48;i++){ const a = i/48*Math.PI*2, c = Math.cos(a), s = Math.sin(a), yy = h*sc*sp(s,2/3);
    r.push([w*sc*sp(c,2/3), cy+yy, z + dz - rake*yy/h]); } return r; };
{
  const zs = [-3.3]; for (let z=-3.2; z<5.1; z += .1) zs.push(z); zs.push(5.1);
  const g = tube(zs.map(z=>trunkRing(z,1, z<-3.25 ? .1 : 0)), 2, [false,true]);
  paint(g, TOP, BOT, { k:(x,y,z,ny)=>sm(-.2,.5,ny)*.55 });
  geoM(g, VC);
  // břit: vnější → přední → vnitřní (světlý, oblý)
  const lip = tube([trunkRing(-3.3,1.0,.1,0), trunkRing(-3.3,.95,.1,-.06), trunkRing(-3.3,.86,.1,.05)].map(r=>r.map(p=>[p[0],p[1],p[2]])), 2, [false,false]);
  // tube řadí podél +z: kroužky nejsou monotónní, pro břit stačí oboustranný materiál
  geoM(lip, LM(0xc9ced3, { side:THREE.DoubleSide }));
  // kanál dovnitř (vidíme vnitřní stěny), světlejší u břitu, černý vzadu
  const duct = tube([[-3.25,.86],[-2.9,.82],[-2.4,.76],[-1.8,.68]].map(([z,s])=>trunkRing(-3.3,s,.1*(1-(z+3.25)*1.4),z+3.3)), 2, [false,false]);
  { const P = duct.attributes.position, col = []; for (let i=0;i<P.count;i++){ const k = sm(-3.3,-1.9,P.getZ(i)), v = .26*(1-k)+.03; col.push(v,v*1.05,v*1.12); }
    duct.setAttribute("color", new THREE.Float32BufferAttribute(col,3)); }
  geoM(duct, new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.9, side:THREE.BackSide }));
  const end = geoM(new THREE.CircleGeometry(1,24), new THREE.MeshBasicMaterial({ color:0x050608 }), fighter, 0, MOUTH[0], -1.82);
  end.scale.set(MOUTH[1]*.7, MOUTH[2]*.7, 1); end.rotation.y = Math.PI;
  // splitter (horní břit vystupující vpřed) + diverter
  geoM(new THREE.BoxGeometry(.86,.028,.62), LM(0xb8bec5), fighter, 0,-.64,-3.28);
  for (const sx of [-1,1]) geoM(new THREE.BoxGeometry(.03,.1,.55), LM(0x8d959e), fighter, sx*.28,-.6,-3.05);
  // dvířka podvozku (zavřená, jemně jiný tón)
  const door = LM(0x9ba2aa, { polygonOffset:true, polygonOffsetFactor:-1, polygonOffsetUnits:-1 });
  const nb = TRUNK(-2.0); geoM(new THREE.BoxGeometry(.36,.01,.95), door, fighter, 0, nb[0]-nb[2]-.002, -2.0);
  for (const sx of [-1,1]){ const mb = TRUNK(1.5); geoM(new THREE.BoxGeometry(.4,.01,1.4), door, fighter, sx*.3, mb[0]-mb[2]-.002, 1.5); }
}
// ================= KABINA =================
const CAN = curve([[-5.35,.57,.18,.03],[-5.0,.56,.36,.26],[-4.5,.55,.46,.51],[-3.9,.55,.52,.70],[-3.2,.56,.54,.83],[-2.6,.57,.54,.87],[-2.2,.57,.52,.83],[-1.95,.58,.49,.78]]);
const canRing = (z, grow=0, a0=-.08, a1=Math.PI+.08, n=30) => { const [b,w,h] = CAN(z), r = [];
  for (let i=0;i<=n;i++){ const a = a0+(a1-a0)*i/n, c = Math.cos(a), s = Math.sin(a); r.push([(w+grow)*sp(c,.87), b + (h+grow)*sp(s,.87), z]); } return r; };
let canopy;
{
  const zs = []; for (let z=-5.35; z<-1.95; z += .1) zs.push(z); zs.push(-1.95);
  const canopyM = new THREE.MeshStandardMaterial({ color:0xf0d896, transparent:true, opacity:.13, roughness:.12, metalness:0, depthWrite:false, emissive:0x0c0902 });
  canopy = geoM(tube(zs.map(z=>canRing(z)), 2, [false,false], false), canopyM); canopy.renderOrder = 4; canopy.castShadow = false;
  // zadní rám kabiny + parapety (šedé, ne černé)
  const frameM = LM(0x656b73);
  geoM(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(canRing(-1.98,.02,-.05,Math.PI+.05,16).map(p=>V3(...p))), 24, .033, 6), frameM);
  for (const sx of [-1,1]){ const pts = []; for (let z=-4.95; z<=-1.97; z+=.25){ const [b,w] = CAN(z); pts.push(V3(sx*(w+.012), b-.005, z)); }
    geoM(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, .022, 5), LM(0x6c737b)); }
  // přístrojová deska + štít, MFD, HUD
  const dark = LM(0x23272d);
  geoM(new THREE.BoxGeometry(.66,.2,.42), dark, fighter, 0,.62,-4.2);
  const gl = geoM(new THREE.BoxGeometry(.6,.05,.36), LM(0x2c3036), fighter, 0,.74,-4.22); gl.rotation.x = -.12;
  const mfd = new THREE.MeshBasicMaterial({ color:0x2a5244 });
  for (const sx of [-1,1]) geoM(new THREE.PlaneGeometry(.14,.12), mfd, fighter, sx*.17,.62,-3.985);
  for (const sx of [-1,1]) geoM(new THREE.BoxGeometry(.018,.2,.018), LM(0x30343a), fighter, sx*.1,.85,-4.24);
  geoM(new THREE.BoxGeometry(.22,.02,.03), LM(0x30343a), fighter, 0,.95,-4.24);
  const comb = geoM(new THREE.PlaneGeometry(.19,.15), new THREE.MeshBasicMaterial({ color:0x9dffc0, transparent:true, opacity:.28, depthWrite:false, side:THREE.DoubleSide }), fighter, 0,.86,-4.2);
  comb.rotation.x = -.35; comb.renderOrder = 3; comb.castShadow = false;
  // boční konzole, páka, plyn
  for (const sx of [-1,1]) geoM(new THREE.BoxGeometry(.13,.07,1.0), LM(0x2b3037), fighter, sx*.31,.56,-3.15);
  rod([.3,.59,-3.15],[.3,.68,-3.17],.018, dark); rod([-.3,.59,-3.05],[-.3,.68,-3.02],.022, dark);
}
// ---- vystřelovací sedadlo ACES II + pilot ----
const pilot = new THREE.Group();
{
  const seat = new THREE.Group(); seat.position.set(0,.42,-2.6); seat.rotation.x = .3; fighter.add(seat);
  const sM = LM(0x2e3236), sD = LM(0x1d2023);
  geoM(new THREE.BoxGeometry(.42,.62,.12), sM, seat, 0,.31,.09);              // opěradlo
  geoM(new THREE.BoxGeometry(.4,.26,.2), LM(0x26292c), seat, 0,.76,.1);       // opěrka hlavy / padák (tmavá → helma vynikne)
  for (const sx of [-1,1]) geoM(new THREE.BoxGeometry(.04,.9,.09), sD, seat, sx*.23,.42,.13);
  geoM(new THREE.BoxGeometry(.44,.1,.46), sM, seat, 0,-.03,-.2);
  const yel = geoM(new THREE.TorusGeometry(.05,.014,5,10), LM(0xe8c21c), seat, 0,.05,-.44); yel.rotation.x = Math.PI/2;
  for (const sx of [-1,1]){ const h = geoM(new THREE.TorusGeometry(.04,.012,5,8,Math.PI), LM(0xe8c21c), seat, sx*.24,.0,-.36); h.rotation.y = Math.PI/2; }
  seat.add(pilot);
  // CWU-27/P (světlejší šalvějová), G-oblek (tmavší khaki), vesta (tmavá), postroj (světlý popruh – kontrast)
  const suit = LM(0x7f8a68), gsuit = LM(0x5e5a44), vest = LM(0x32372c), strap = LM(0xd2cba8), buckle = LM(0x9ea3a6), glove = LM(0x2a2724);
  // trup (zužující se), vesta, popruhy
  const torso = new THREE.LatheGeometry([[0,0],[.15,0],[.165,.08],[.15,.2],[.165,.34],[.19,.46],[.175,.53],[.12,.585],[.05,.6],[0,.6]].map(p=>V2(...p)), 16);
  geoM(torso, suit, pilot, 0,.03,-.11).scale.set(1.32,1,.8);
  const vg = new THREE.LatheGeometry([[.172,.16],[.185,.3],[.2,.44],[.185,.52],[.1,.56]].map(p=>V2(...p)), 16);
  geoM(vg, vest, pilot, 0,.03,-.11).scale.set(1.32,1,.84);
  // ramenní popruhy přes ramena + pásy přes boky, přezky na hrudi
  for (const sx of [-1,1]){
    geoM(new THREE.BoxGeometry(.065,.36,.03), strap, pilot, sx*.09,.38,-.268).rotation.z = sx*.1;
    geoM(new THREE.BoxGeometry(.055,.03,.2), strap, pilot, sx*.11,.575,-.17).rotation.x = -.3;
    geoM(new THREE.BoxGeometry(.05,.03,.03), buckle, pilot, sx*.08,.3,-.285);
  }
  geoM(new THREE.BoxGeometry(.34,.05,.03), strap, pilot, 0,.13,-.255);
  geoM(new THREE.BoxGeometry(.08,.07,.025), buckle, pilot, 0,.13,-.275);
  // ramena (výrazná), krk
  for (const sx of [-1,1]) geoM(new THREE.SphereGeometry(.085,12,10), suit, pilot, sx*.21,.53,-.11);
  geoM(new THREE.CylinderGeometry(.055,.06,.1,10), LM(0x5d614e), pilot, 0,.64,-.1);
  // helma HGU-55 (bílá, větší) + černé hledí + šedý kryt hledí + kyslíková maska MBU-20 s hadicí
  const head = new THREE.Group(); head.position.set(0,.79,-.1); pilot.add(head);
  geoM(new THREE.SphereGeometry(.158,20,16), LM(0xf6f7f4, { roughness:.4 }), head).scale.set(.94,1.0,1.08);
  const visor = geoM(new THREE.SphereGeometry(.166,20,10, Math.PI*1.5-1.45, 2.9, .7, .95),
                     new THREE.MeshStandardMaterial({ color:0x07090c, roughness:.18, metalness:0 }), head); visor.scale.set(.94,1.0,1.08);
  const vh = geoM(new THREE.SphereGeometry(.172,18,6, Math.PI*1.5-1.1, 2.2, .4, .34), LM(0x8d9398), head); vh.scale.set(.94,1.0,1.08);
  const mask = geoM(new THREE.SphereGeometry(.075,12,10), LM(0x434a44), head, 0,-.1,-.13); mask.scale.set(.9,1.0,1.15);
  rod([0,-.11,-.2],[0,-.14,-.26],.035, LM(0x3b3f43), head, .028);                          // ventil masky
  rod([0,-.15,-.25],[.05,-.32,-.2],.022, LM(0x1c1e20), head);                               // hadice
  rod([.05,-.32,-.2],[.08,-.46,-.14],.022, LM(0x1c1e20), head);
  for (const sx of [-1,1]) geoM(new THREE.BoxGeometry(.012,.07,.03), LM(0x2a2c2e), head, sx*.115,-.06,-.07); // přezky masky
  // paže (dvoudílné) → páka vpravo, plyn vlevo; stehna v G-obleku
  for (const sx of [-1,1]){
    const sh = [sx*.22,.5,-.11], el = [sx*.26,.24,-.27], ha = [sx*.28,.06,-.53];
    rod(sh, el, .062, suit, pilot, .054); rod(el, ha, .052, suit, pilot, .044);
    geoM(new THREE.SphereGeometry(.05,10,8), glove, pilot, ...ha);
    geoM(new THREE.SphereGeometry(.062,10,8), suit, pilot, ...el);
    rod([sx*.1,.06,-.15],[sx*.12,.1,-.6],.092, gsuit, pilot, .076);
    rod([sx*.12,.1,-.6],[sx*.13,-.25,-.82],.066, gsuit, pilot, .052);
    geoM(new THREE.BoxGeometry(.05,.06,.18), LM(0x47442f), pilot, sx*.2,.1,-.4);             // kapsy G-obleku
  }
}
// ================= ZÁSUVKA (hřbet za kabinou) =================
const RECEPT = new THREE.Vector3(0,1.02,-.6); // místní poloha zásuvky
{
  const cup = geoM(new THREE.CylinderGeometry(.17,.055,.11,20,1,true), LM(0xb4b9bf, { side:THREE.DoubleSide }), fighter, 0,.93,-.6);
  geoM(new THREE.CylinderGeometry(.056,.056,.06,14), LM(0x15181b), fighter, 0,.86,-.6);
  const glow = geoM(new THREE.TorusGeometry(.172,.013,5,24), new THREE.MeshBasicMaterial({ color:0xfff0c4 }), fighter, 0,.985,-.6); glow.rotation.x = Math.PI/2;
  recDoor.position.set(0,1.02,-.91); fighter.add(recDoor);
  const dg = paint(new THREE.BoxGeometry(.47,.04,.6,4,1,4).translate(0,-.005,.305), TOP, TOP, { k:()=>1 });
  mesh(dg, VC, recDoor);
  for (const sx of [-1,1]) mesh(new THREE.BoxGeometry(.03,.07,.12), LM(0x5d636b), recDoor, sx*.18,-.05,.06);
  // světlý obrys dvířek + vodicí čáry na hřbetu (typické značení „slipway“)
  const wm = LM(0xe7e9e3, { polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2 });
  for (const z of [-.97,-.23]) geoM(new THREE.BoxGeometry(.6,.012,.035), wm, fighter, 0, spineY(0,z)+.003, z);
  for (const sx of [-1,1]){ const s = geoM(new THREE.BoxGeometry(.035,.012,.74), wm, fighter, sx*.283, spineY(.283,-.6)+.004, -.6);
    s.rotation.x = Math.atan2(spineY(.283,-.97)-spineY(.283,-.23), .74); }
  for (const sx of [-1,1]){ // čáry vpřed ke kabině, sledují hřbet
    const pts = []; for (let z=-1.0; z>=-1.9; z-=.06) pts.push(V3(sx*.12, spineY(.12,z)+.006, z));
    for (let i=0;i<pts.length-1;i++){ const a = pts[i], b = pts[i+1], m = geoM(new THREE.BoxGeometry(.03,.01,a.distanceTo(b)+.01), wm, fighter);
      m.position.copy(a).add(b).multiplyScalar(.5); m.rotation.x = Math.atan2(b.y-a.y, a.z-b.z); } }
}
// ================= KŘÍDLA, LERX, OCASNÍ PLOCHY =================
const WING = { w:0, n:[0,1,0], le:s=>[.7+3.85*s, -.02*s, -1.35+3.3*s], te:s=>[.7+3.85*s, -.02*s, 3.0], t:s=>.045-.012*s };
const STAB = { w:0, n:[0,1,0], le:s=>[.75+2.1*s, -.02-.37*s, 4.3+1.65*s], te:s=>[.75+2.1*s, -.02-.37*s, 6.75+.1*s], t:()=>.05 };
const FIN  = { w:1, n:[1,0,0], le:s=>[0, .7+3.05*s, 2.55+2.6*s], te:s=>[0, .7+3.05*s, 6.45-.2*s], t:s=>.05-.008*s };
const finPt = (s,c,x=0) => { const L = FIN.le(s), T = FIN.te(s); return [x, L[1]+(T[1]-L[1])*c, L[2]+(T[2]-L[2])*c]; };
{
  const wingKW = { panel:.05, fn:(c,x,y,z)=>{ if (z < -1.35+3.3*((Math.abs(x)-.7)/3.85)+.32) c.multiplyScalar(1.03); } };   // náběžné klapky o tón světlejší
  const pieces = [
    paint(aero(WING, 0, .78, 0, 1, { ns:10 }), TOP, BOT, wingKW),
    paint(aero(WING, .795, 1, .14, .68, { droop:.05, caps:[true,true] }), TOP, BOT, { fn:c=>c.multiplyScalar(.97) }),   // flaperon
    paint(aero(WING, .795, 1, .695, 1), TOP, BOT),
    paint(aero(WING, .795, 1, 0, .125, { caps:[false,true] }), TOP, BOT),
    paint(aero(STAB, 0, 1, 0, 1, { ns:6 }), TOP, BOT),                                                                  // celopohyblivé VOP (anhedrála 10°)
  ];
  for (const g of pieces){ geoM(g, VC); geoM(mirrorX(g), VC); }
  // SOP: hlavní část, kormidlo (jemná spára + tón), anténní špička (tmavá), hřbetní náběh
  const finK = { k:()=>1 };
  geoM(paint(aero(FIN, 0, .7, 0, .93, { ns:8 }), TOP, TOP, finK), VC);
  geoM(paint(aero(FIN, .715, 1, .12, .86, { caps:[true,true] }), TOP, TOP, { k:()=>1, fn:c=>c.multiplyScalar(.95) }), VC);
  geoM(paint(aero(FIN, .715, 1, 0, .105), TOP, TOP, finK), VC);
  geoM(paint(aero(FIN, .715, 1, .875, .93, { caps:[true,true] }), TOP, TOP, finK), VC);
  geoM(aero(FIN, 0, 1, .935, 1, { caps:[true,true] }), LM(DIEL));
  geoM(paint(side([[1.7,.86],[2.4,.9],[2.85,1.04],[3.1,1.25],[3.25,1.25],[3.25,.86]], .07), TOP, TOP, finK), VC);
  // kontejner brzdícího padáku / ECM na patě SOP
  const R = curve([[5.6,.02],[5.85,.1],[6.2,.15],[7.3,.15],[7.52,.13],[7.66,.06],[7.7,0]]);
  const ring = z => { const [r] = R(z), o = []; for (let i=0;i<24;i++){ const a = i/24*Math.PI*2; o.push([Math.cos(a)*r*.9, .74+Math.sin(a)*r, z]); } return o; };
  const zs = []; for (let z=5.6; z<7.7; z+=.06) zs.push(z); zs.push(7.7);
  geoM(paint(tube(zs.map(ring), 2), TOP, TOP, { k:()=>1, fn:(c,x,y,z)=>{ if (z > 7.4) c.setHex(DIEL); } }), VC);
  // aerodynamické brzdy po stranách trysky
  for (const sx of [-1,1]) geoM(paint(new THREE.BoxGeometry(.15,.34,1.15,1,2,4), TOP, BOT, { fn:(c,x,y,z)=>c.multiplyScalar(1-sm(6.2,7.2,z)*.25) }), VC, fighter, sx*.74,0,6.55);
  // břišní ploutvičky
  for (const sx of [-1,1]){ const vf = geoM(paint(side([[4.0,0],[5.3,0],[5.15,-.55],[4.5,-.55]], .045), BOT, BOT), VC, fighter, sx*.5,-.56,0); vf.rotation.z = sx*.32; }
}
// ================= TRYSKA F100 =================
const NOZZLE = new THREE.Vector3(0,0,7.55);
{
  const metal = LM(0x6a665f), petA = LM(0x5a554e), petB = LM(0x4b4741);
  geoM(new THREE.CylinderGeometry(.585,.61,.25,28,1,true).rotateX(Math.PI/2), metal, fighter, 0,0,6.98);
  for (let k=0;k<16;k++){ const a = k/16*Math.PI*2, g = new THREE.Group(); g.rotation.z = a; g.position.z = 7.29; fighter.add(g);
    const p = geoM(new THREE.BoxGeometry(.205,.035,.54), k%2 ? petA : petB, g, 0,.5,0); p.rotation.x = .16; }
  geoM(new THREE.CylinderGeometry(.445,.53,.55,24,1,true).rotateX(Math.PI/2), LM(0x2c2a27, { side:THREE.DoubleSide }), fighter, 0,0,7.28);
  geoM(new THREE.CircleGeometry(.53,24).rotateY(Math.PI), LM(0x121213), fighter, 0,0,7.0).rotation.y = Math.PI;
  const fh = geoM(new THREE.TorusGeometry(.3,.025,5,24), LM(0x3a3936), fighter, 0,0,7.02);
  const fh2 = geoM(new THREE.TorusGeometry(.15,.02,5,18), LM(0x3a3936), fighter, 0,0,7.03);
  geoM(new THREE.ConeGeometry(.09,.2,12).rotateX(Math.PI/2), LM(0x2a2928), fighter, 0,0,7.08);
}
// ================= ZBRANĚ A NÁDRŽE =================
const white = LM(0xe4e5e1), dkGl = new THREE.MeshStandardMaterial({ color:0x1d232b, roughness:.15 });
function missile(kind){
  const g = new THREE.Group(), L = kind===9 ? 2.87 : 3.65, R = kind===9 ? .068 : .09, nl = kind===9 ? .1 : .6, pts = [];
  pts.push(V2(0,-L/2), V2(R*.8,-L/2), V2(R,-L/2+.03), V2(R, L/2-nl));
  for (let i=1;i<=8;i++){ const u = i/8; pts.push(V2(kind===9 ? R*Math.sqrt(1-u*u*.55) : R*Math.pow(1-Math.pow(u,1.8),.75), L/2-nl+u*nl)); }
  if (kind !== 9) pts.push(V2(0, L/2));
  geoM(new THREE.LatheGeometry(pts, 14).rotateX(-Math.PI/2), white, g);
  if (kind===9) geoM(new THREE.SphereGeometry(R*.75,12,8), dkGl, g, 0,0,-L/2+.02);
  geoM(new THREE.CylinderGeometry(R*1.01,R*1.01,.05,14).rotateX(Math.PI/2), LM(0xc9a227), g, 0,0,-L/2+(kind===9?.62:.9));
  geoM(new THREE.CylinderGeometry(R*1.01,R*1.01,.04,14).rotateX(Math.PI/2), LM(0x7a5a33), g, 0,0,-L/2+(kind===9?1.05:1.4));
  const fins = (z, rs, span, cr, ct, thick=.012) => { for (let k=0;k<4;k++){ const f = new THREE.Group(); f.rotation.z = Math.PI/4+k*Math.PI/2; f.position.z = z; g.add(f);
      geoM(plan([[rs,-cr/2],[rs+span,ct-cr/2],[rs+span,cr/2],[rs,cr/2]], thick), white, f); } };
  if (kind===9){ fins(-L/2+.45, R, .1, .22, .12); fins(L/2-.25, R, .2, .38, .22); }
  else { fins(-L/2+1.2, R, .12, .36, .22); fins(L/2-.2, R, .16, .3, .18); }
  return g;
}
for (const sx of [-1,1]){
  // AIM-9 na koncových lištách
  geoM(new THREE.BoxGeometry(.09,.11,2.0), LM(0x8e969f), fighter, sx*4.6,-.03,2.35);
  const m9 = missile(9); m9.position.set(sx*4.7,-.1,2.3); m9.rotation.z = sx*.2; fighter.add(m9);
  // AIM-120 na vnějším pylonu
  geoM(paint(side([[1.6,0],[2.75,0],[2.6,-.2],[1.75,-.2]], .07), BOT, BOT), VC, fighter, sx*3.65,-.04,0);
  geoM(new THREE.BoxGeometry(.07,.06,1.9), LM(0x8e969f), fighter, sx*3.65,-.27,2.1);
  const m120 = missile(120); m120.position.set(sx*3.65,-.39,2.05); fighter.add(m120);
  // 370gal přídavná nádrž na vnitřním pylonu
  geoM(paint(side([[.1,0],[1.9,0],[1.75,-.38],[.4,-.38],[-.1,-.18]], .085), BOT, BOT), VC, fighter, sx*2.15,-.05,0);
  const tp = [V2(0,-2.3),V2(.07,-2.28),V2(.18,-2.08),V2(.28,-1.7),V2(.33,-1.2),V2(.34,-.6),V2(.34,.6)];
  for (let i=1;i<=9;i++){ const u = i/9; tp.push(V2(.34*Math.pow(1-u*u,.62), .6+u*1.7)); }
  const tk = new THREE.LatheGeometry(tp, 22).rotateX(-Math.PI/2); paint(tk, 0x9fa7af, 0xb2b8be, { panel:.03 });
  geoM(tk, VC, fighter, sx*2.15,-.78,1.15);
}
// ================= DROBNOSTI =================
{
  rod([0,.04,-7.6],[0,.04,-8.1],.03, LM(0x8b8f93), fighter, .014);                       // pitot
  for (const sx of [-1,1]) rod([sx*.4,.1,-6.3],[sx*.5,.1,-6.45],.012, LM(0x8b8f93));       // AOA sondy
  for (const z of [-5.75,-5.6]) geoM(new THREE.BoxGeometry(.012,.07,.09), LM(0x5b6169), fighter, 0,.66,z); // IFF „bird slicers“
  geoM(new THREE.BoxGeometry(.012,.12,.22), LM(0x5b6169), fighter, 0,1.05,1.4);             // anténa na hřbetu
  geoM(new THREE.BoxGeometry(.012,.1,.18), LM(0x5b6169), fighter, 0,-1.22,.2);              // spodní anténa
  // kanón M61 vlevo nad LERX
  const gp = geoM(new THREE.CircleGeometry(.075,12), LM(0x40454c, { polygonOffset:true, polygonOffsetFactor:-2 }), fighter, -(bodyX(-3.3,.36)+.006),.36,-3.3); gp.rotation.y = -Math.PI/2+.35; gp.castShadow = false;
  for (let i=0;i<3;i++){ const z = -3.05+i*.08, v = geoM(new THREE.BoxGeometry(.012,.05,.035), LM(0x4a5058), fighter, -(bodyX(z,.4)+.002),.4,z); v.rotation.z = -.5; }
}
// ---- světla: formační pásky (světle zelené) + poziční ----
{
  const fm = new THREE.MeshBasicMaterial({ color:0xb6ffc4 });
  const strip = (x,y,z,w,h,l,ry=0) => { const m = geoM(new THREE.BoxGeometry(w,h,l), fm, fighter, x,y,z); m.rotation.y = ry; m.castShadow = false; fLights.push(m); return m; };
  for (const sx of [-1,1]){
    strip(sx*(bodyX(-4.2,.28)+.012),.28,-4.2,.02,.05,.55);
    strip(sx*(bodyX(5.0,.3)+.012),.3,5.0,.02,.05,.55);
    const a = finPt(.3,.28,sx*.06), b = finPt(.3,.62,sx*.06); strip(sx*.062,(a[1]+b[1])/2,(a[2]+b[2])/2,.015,.05,b[2]-a[2]);
    const tw = TRUNK(-2.75); const nav = geoM(new THREE.SphereGeometry(.045,8,6), new THREE.MeshBasicMaterial({ color: sx>0 ? 0x5dff8a : 0xff4433 }), fighter, sx*(tw[1]+.01), tw[0]+.05, -2.75);
    fLights.push(nav);
  }
  const wl = new THREE.MeshBasicMaterial({ color:0xfffbe8 });
  fLights.push(geoM(new THREE.SphereGeometry(.05,8,6), wl, fighter, 0,3.62,6.28), geoM(new THREE.SphereGeometry(.028,8,6), wl, fighter, 0,.74,7.7));
}
// ---- obtisky: znak USAF (low-vis), pruh s kódem na SOP ----
{
  const ins = tex(256,128,(x,w,h)=>{ x.fillStyle = "#59616a"; x.fillRect(20,42,216,44); x.beginPath(); x.arc(128,64,52,0,Math.PI*2); x.fill();
    x.fillStyle = "#9aa2aa"; x.fillRect(24,46,208,36); x.fillStyle = "#59616a"; x.fillRect(24,58,208,12); x.beginPath(); x.arc(128,64,46,0,Math.PI*2); x.fill();
    x.fillStyle = "#a7afb7"; x.beginPath(); for (let i=0;i<10;i++){ const r = i%2 ? 18 : 44, a = -Math.PI/2+i*Math.PI/5; x.lineTo(128+Math.cos(a)*r, 64+Math.sin(a)*r); } x.fill(); });
  const band = tex(256,96,(x,w,h)=>{ x.fillStyle = "#4b525b"; x.fillRect(0,0,w,h); x.fillStyle = "#c1c7cd"; x.font = "bold 66px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("AV", w*.5, h*.54); });
  const serial = tex(256,64,(x,w,h)=>{ x.fillStyle = "#4b525b"; x.font = "bold 40px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("AF 89 031", w/2, h/2); });
  if (ins){
    const im = decalMat(ins), bm = decalMat(band), sm2 = decalMat(serial);
    for (const sx of [-1,1]){
      // bok sání (u: k nosu na pravé straně, k ocasu na levé, aby text nebyl zrcadlený)
      const t0 = TRUNK(-.2), x = sx*(t0[1]+.012), y0 = t0[0]-.2, y1 = t0[0]+.2, za = sx>0 ? .3 : -.5, zb = sx>0 ? -.5 : .3;
      fDecals.push(geoM(quad([x,y0,za],[x,y0,zb],[x,y1,zb],[x,y1,za]), im));
      // SOP: tmavý pruh s kódem + sériové číslo
      const bx = sx*.052, c0 = .06, c1 = .66, s0 = .55, s1 = .7, A = (s,c)=>finPt(s,c,bx);
      fDecals.push(geoM(sx>0 ? quad(A(s0,c1),A(s0,c0),A(s1,c0),A(s1,c1)) : quad(A(s0,c0),A(s0,c1),A(s1,c1),A(s1,c0)), bm));
      const C = (s,c)=>finPt(s,c,sx*.058);
      fDecals.push(geoM(sx>0 ? quad(C(.28,.62),C(.28,.18),C(.36,.18),C(.36,.62)) : quad(C(.28,.18),C(.28,.62),C(.36,.62),C(.36,.18)), sm2));
    }
    // křídla: horní levé, spodní pravé
    fDecals.push(geoM(quad([-2.6,.058,2.3],[-3.5,.058,2.3],[-3.5,.058,1.85],[-2.6,.058,1.85]), im));
    fDecals.push(geoM(quad([2.6,-.08,2.3],[3.5,-.08,2.3],[3.5,-.08,1.85],[2.6,-.08,1.85]), im));
    fDecals.forEach(d=>d.castShadow = false);
  }
}
// ================= NÁDRŽE (rentgen, viditelné jen v S8): skutečná místa palivových nádrží F-16 =================
// F-1/F-2 přední trupová (za kabinou nad sáním), A-1 zadní trupová (nad motorem), 2 křídelní (vnitřní část křídla),
// 2 přídavné 370gal. Každá: tmavý vnitřek (BackSide) + kapalina (hladina = rovina kolmá na LEVEL_AX, discard nad ní;
// zadní stěny pod hladinou = povrch hladiny) + světlý obrys (inverted hull). Hladina čte fl.scale.z (vfx.fuelFlow) nebo setFuel(p).
const LEVEL_AX = new THREE.Vector3(0, 1, -.85).normalize();   // stoupá zdola a od ocasu (palivo se při náklonu nosem vzhůru hromadí vzadu)
let fuelSet = 0;
function setFuel(p){ fuelSet = cl(p); fTanks.forEach(K => K.sh.visible = true); }   // volá vfx.fuelFlow každý snímek S8 (fuelOff je skryje)
const OUTV = `uniform float wpx; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vec3 n = normalize(normalMatrix*normal);
  mv.xyz += n*wpx*max(.5,-mv.z); gl_Position = projectionMatrix*mv; }`;
const outlineMat = (hex, w=.0024) => new THREE.ShaderMaterial({ side:THREE.BackSide, uniforms:{ c:{ value:new THREE.Color(hex) }, wpx:{ value:w } }, vertexShader:OUTV,
  fragmentShader:`uniform vec3 c; void main(){ gl_FragColor = vec4(c,1.);
#include <colorspace_fragment>
}` });
{
  const shellM = new THREE.ShaderMaterial({ side:THREE.BackSide,
    vertexShader:`varying vec3 vN; void main(){ vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`varying vec3 vN; void main(){ float k = .55+.45*abs(vN.z); gl_FragColor = vec4(vec3(.035,.07,.15)*k*1.6,1.);
#include <colorspace_fragment>
}` });
  const tOut = outlineMat(0xffd27a, .0021);
  const ring = (z, cx, cy, hw, hh, e=3.2, n=32) => { const r = []; for (let i=0;i<n;i++){ const a = i/n*Math.PI*2, c = Math.cos(a), s = Math.sin(a);
    r.push([cx + hw*sp(c,2/e), cy + hh*sp(s,2/e), z]); } return r; };
  const loftT = (rows) => { const f = curve(rows), zs = []; for (let z=rows[0][0]; z<rows[rows.length-1][0]; z+=.08) zs.push(z); zs.push(rows[rows.length-1][0]);
    return tube(zs.map(z=>{ const [cy,hw,hh] = f(z); return ring(z, 0, cy, Math.max(.02,hw), Math.max(.02,hh)); }), 2, [true,true]); };
  const geos = [];
  // přední trupová F-1/F-2: z −2.15…−0.15 (nad sáním, pod hřbetem a zásuvkou)
  geos.push(loftT([[-2.15,.14,.05,.05],[-2.0,.14,.42,.3],[-1.6,.13,.56,.4],[-.8,.12,.62,.44],[-.35,.12,.62,.44],[-.15,.12,.3,.25]]));
  // zadní trupová A-1: z 0.15…2.7 (nad motorem)
  geos.push(loftT([[.15,.3,.05,.05],[.3,.3,.5,.36],[.9,.28,.7,.42],[1.9,.26,.7,.42],[2.5,.26,.55,.34],[2.7,.26,.06,.06]]));
  // křídelní integrální nádrže (klín uvnitř křídla, mezi nosníky)
  const WT = { ...WING, t:s=>(.045-.012*s)*.82 };
  const wg = aero(WT, .1, .68, .04, .45, { caps:[true,true], nc:8, ns:6 }); wg.translate(0,.004,0);
  geos.push(mirrorX(wg), wg);
  // 370gal přídavné nádrže (stejný tvar jako lathe pláště, menší)
  const tp = [V2(0,-2.12),V2(.15,-1.98),V2(.25,-1.62),V2(.3,-1.15),V2(.31,-.6),V2(.31,.6)];
  for (let i=1;i<=8;i++){ const u = i/8; tp.push(V2(.31*Math.pow(1-u*u,.62)+.001, .6+u*1.55)); }
  for (const sx of [-1,1]) geos.push(new THREE.LatheGeometry(tp, 20).rotateX(-Math.PI/2).translate(sx*2.15,-.78,1.15));
  geos.forEach(g => {
    g.computeVertexNormals(); g.computeBoundingBox();
    // rozsah po ose hladiny
    const P = g.attributes.position; let mn = 1e9, mx = -1e9; for (let i=0;i<P.count;i++){ const d = P.getX(i)*LEVEL_AX.x + P.getY(i)*LEVEL_AX.y + P.getZ(i)*LEVEL_AX.z; mn = Math.min(mn,d); mx = Math.max(mx,d); }
    const U = { lv:{ value:mn }, ax:{ value:LEVEL_AX }, ph:{ value:0 } };
    const fillM = new THREE.ShaderMaterial({ side:THREE.DoubleSide, uniforms:U,
      vertexShader:`varying vec3 vL; varying vec3 vN; void main(){ vL = position; vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader:`uniform float lv, ph; uniform vec3 ax; varying vec3 vL; varying vec3 vN;
        void main(){ float d = dot(vL, ax); float w = .018*sin(vL.x*7.+vL.z*3.+ph) + .012*sin(vL.z*9.-ph*1.7);
          float h = lv + w - d; if (h < 0.) discard;
          vec3 c;
          if (gl_FrontFacing){ float k = .72 + .38*abs(vN.z); c = vec3(1.,.55,.12)*k; c = mix(c, vec3(1.,.86,.45), smoothstep(.06,0.,h)); }
          else { c = vec3(1.,.8,.36); }                        // hladina (vidíme zadní stěny pod ní)
          gl_FragColor = vec4(c,1.);
#include <colorspace_fragment>
        }` });
    const sh = new THREE.Group(); fighter.add(sh); sh.visible = false;
    const shell = new THREE.Mesh(g, shellM), fillMesh = new THREE.Mesh(g, fillM), ol = new THREE.Mesh(g, tOut);
    [shell, fillMesh, ol].forEach(m => { m.renderOrder = 1; m.castShadow = m.receiveShadow = false; sh.add(m); });
    const fl = new THREE.Object3D(); fl.scale.z = 0; fl.visible = false; fighter.add(fl);   // proxy: vfx.fuelFlow píše scale.z = podíl
    fillMesh.onBeforeRender = () => { const f = Math.max(fuelSet, cl(fl.scale.z)); U.lv.value = mn + (mx-mn)*(.03 + .97*f) + (f >= .999 ? .2 : 0); U.ph.value = f*40; };
    const bb = g.boundingBox; fTanks.push({ sh, fl, z0: 0, l: 1, center: bb.getCenter(new THREE.Vector3()) });
  });
}
// palivo uvnitř stíhačky: zásuvka → nádrže (4 cesty: přední trupová, zadní trupová, levé a pravé křídlo)
const fDots = []; const FPATHS = [[[0,1.0,-.6],[0,.75,-.75],[0,.35,-1.2]],[[0,1.0,-.6],[0,.75,-.2],[0,.45,.4],[0,.35,1.4]],
  [[0,1.0,-.6],[0,.6,-.1],[-.6,.2,.6],[-1.6,.0,.9]],[[0,1.0,-.6],[0,.6,-.1],[.6,.2,.6],[1.6,.0,.9]]].map(p => p.map(a => new THREE.Vector3(...a)));
for (let i=0;i<28;i++){ const d = new THREE.Mesh(new THREE.BoxGeometry(.14,.14,.14), new THREE.MeshBasicMaterial({ color:0xffe08a, transparent:true, depthWrite:false, depthTest:false })); d.renderOrder = 11; d.visible = false; fighter.add(d); fDots.push(d); }
const fSkin = []; fighter.traverse(o => { if (o.isMesh && !fTanks.some(T => T.sh===o.parent) && !fDots.includes(o)) fSkin.push([o, o.material]); });
// rentgen pláště: průsvitné plochy (dva tóny: horní světlejší) + fresnelový lem + neprůhledný obrys siluety (depth prepass + inverted hull)
const fXray = new THREE.ShaderMaterial({ transparent:true, depthWrite:false,
  uniforms:{ cA:{ value:new THREE.Color(0x10264a) }, cU:{ value:new THREE.Color(0x2c5590) }, cB:{ value:new THREE.Color(0xbfe6ff) } },
  vertexShader:`varying vec3 vN, vV; varying float vUp; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vV = -mv.xyz; vN = normalMatrix*normal;
    vUp = normalize((modelMatrix*vec4(normal,0.)).xyz).y; gl_Position = projectionMatrix*mv; }`,
  fragmentShader:`uniform vec3 cA, cU, cB; varying vec3 vN, vV; varying float vUp;
    void main(){ float f = 1. - abs(dot(normalize(vN), normalize(vV))); f = pow(f, 2.2);
      vec3 c = mix(mix(cA, cU, smoothstep(-.2,.7,vUp)), cB, f); gl_FragColor = vec4(c, mix(.5, .94, f));
#include <colorspace_fragment>
    }` });
const xPre = new THREE.MeshBasicMaterial({ colorWrite:false }), xOut = outlineMat(0xd8f0ff, .0026);
const fXlines = [];
{
  const pilotSet = new Set(); pilot.traverse(o => pilotSet.add(o));
  fSkin.forEach(([o]) => {
    if (fLights.includes(o) || fDecals.includes(o) || pilotSet.has(o)) return;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    const r = o.geometry.boundingSphere.radius * Math.max(o.scale.x, o.scale.y, o.scale.z); if (r < .3) return;
    for (const [m, ro] of [[xPre, 2], [xOut, 3]]){ const c = new THREE.Mesh(o.geometry, m); c.position.copy(o.position); c.quaternion.copy(o.quaternion); c.scale.copy(o.scale);
      c.renderOrder = ro; c.visible = false; c.castShadow = c.receiveShadow = false; o.parent.add(c); fXlines.push(c); }
  });
}
function fighterXray(on){ fSkin.forEach(([o,m]) => { o.material = on ? fXray : m; o.castShadow = !on && !fDecals.includes(o) && o !== canopy && !fLights.includes(o); }); fDecals.forEach(d => d.visible = !on); fXlines.forEach(c => c.visible = on); }
function pathPt(path, u){ const n = path.length-1, f = u*n, i = Math.min(n-1, Math.floor(f)); return path[i].clone().lerp(path[i+1], f-i); }

return { fighter, recDoor, RECEPT, fTanks, fDots, FPATHS, pathPt, fSkin, fXray, fighterXray, setFuel, fXlines, VC, canopy, pilot, NOZZLE, fLights, fDecals };
}
