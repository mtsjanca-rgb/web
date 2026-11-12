// KC-135 tanker model. Local frame: metres, nose → −z, tail → +z, +y up. Group placed at world origin by the timeline.
import * as THREE from "../lib/three.module.js";
import { loft, plan, side, beam, toned, mesh, LM } from "./helpers.js";

// scene: tanker group is added to it immediately (keeps scene child order / object ids identical)
export function buildTanker(scene){
const tanker = new THREE.Group(); if (scene) scene.add(tanker);
const tGrey = LM(0x9aa3ad), tGreyD = LM(0x7f8893), tDark = LM(0x2a3038), glass = LM(0x141c2a);
const TVC = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.88, metalness:0 });
const NAV = [];
{
  const F = [[-20.6,-.2,.15,.15],[-20.2,-.15,.75,.7],[-19.6,-.05,1.2,1.15],[-18.6,0,1.6,1.62],[-17.2,0,1.85,1.9],[-15.5,0,1.92,1.98],
             [-6,0,1.95,2.0],[6,0,1.95,2.0],[10,.08,1.88,1.92],[13,.35,1.62,1.65],[15.5,.7,1.28,1.25],[17.8,1.05,.92,.88],[19.8,1.4,.55,.52],[21,1.65,.2,.2]];
  mesh(toned(loft(F,32), 0x8e98a3, 0xb3bbc4, .1), TVC, tanker);
  // spodní "břicho" (tmavší pás) a stěrky
  mesh(new THREE.BoxGeometry(.6,.25,22), tGreyD, tanker, 0,-1.98,-3);
  // okna kokpitu
  for (const [a,z,w,h] of [[90,-19.25,.62,.42],[68,-19.2,.62,.42],[112,-19.2,.62,.42],[47,-18.95,.55,.4],[133,-18.95,.55,.4],[30,-18.35,.45,.36],[150,-18.35,.45,.36]]){
    const zz = [[-19.6,1.18],[-18.6,1.61],[-17.2,1.87]]; let r = 1.2; for (let i=0;i<2;i++) if (z>=zz[i][0] && z<=zz[i+1][0]) r = zz[i][1] + (zz[i+1][1]-zz[i][1])*(z-zz[i][0])/(zz[i+1][0]-zz[i][0]);
    r += .03; const A = a*Math.PI/180;
    const wnd = mesh(new THREE.BoxGeometry(w,.05,h), glass, tanker, Math.cos(A)*r, Math.sin(A)*r, z);
    wnd.rotation.order = "YXZ"; wnd.rotation.z = A - Math.PI/2; wnd.rotation.x = -.45;
  }
  mesh(new THREE.BoxGeometry(2.2,.08,.5), LM(0x2f5aa8), tanker, 0,1.3,-17.6).visible = false;
  for (let z=-15; z<8; z+=1.6) for (const sx of [-1,1]) mesh(new THREE.BoxGeometry(.08,.26,.2), glass, tanker, sx*1.96, .55, z);
  // maják nahoře a dole (blikají)
  for (const [y,z] of [[2.02,-6],[-2.02,2]]){ const b = mesh(new THREE.SphereGeometry(.16,8,6), new THREE.MeshBasicMaterial({ color:0xff3a2a }), tanker, 0,y,z); NAV.push({ o:b, blink:1.1, ph: z }); }
  // křídla (šíp 35°, vzepětí)
  for (const sx of [-1,1]){
    const w = new THREE.Group(); w.position.set(sx*1.6, -1.05, 0); w.rotation.z = sx*.11; tanker.add(w);
    const g = plan([[0,-5.2],[18.8,7.6],[18.8,9.6],[0,3.6]], .38); if (sx<0) g.scale(-1,1,1);
    mesh(g, tGrey, w);
    // klapkové lišty
    for (const k of [3,6.5,10,13.5]) mesh(new THREE.BoxGeometry(.25,.3,2.2), tGreyD, w, sx*k, -.3, 3.2 + k*.62*.95);
    const nl = mesh(new THREE.SphereGeometry(.22,8,6), new THREE.MeshBasicMaterial({ color: sx<0 ? 0xff2a1a : 0x2aff5a }), w, sx*18.95, 0, 8.0); NAV.push({ o:nl });
    const st = mesh(new THREE.SphereGeometry(.15,8,6), new THREE.MeshBasicMaterial({ color:0xffffff }), w, sx*18.95, 0, 9.2); NAV.push({ o:st, blink:.8, ph:sx });
    // motory
    for (const k of [5.7, 11.4]){
      const le = -5.2 + k*(12.8/18.8);
      const eng = new THREE.Group(); eng.position.set(sx*k, -1.25, le - 1.9); w.add(eng);
      mesh(loft([[-2.6,0,.98,.98],[-2.3,0,1.08,1.08],[-.5,0,1.12,1.12],[1.2,0,.98,.98],[2.4,-.05,.62,.62],[2.9,-.05,.42,.42]],22), tGrey, eng);
      mesh(new THREE.CylinderGeometry(.9,.9,.12,22).rotateX(Math.PI/2), tDark, eng, 0,0,-2.45);
      mesh(new THREE.ConeGeometry(.32,.7,12).rotateX(-Math.PI/2), LM(0xc9cfd6), eng, 0,0,-2.6);
      mesh(new THREE.CylinderGeometry(1.0,1.0,.16,22).rotateX(Math.PI/2), LM(0xc5ccd4), eng, 0,0,-2.62);
      mesh(new THREE.BoxGeometry(.3,1.1,3.2), tGreyD, eng, 0,.95,.4);
      mesh(new THREE.CylinderGeometry(.42,.32,.6,14).rotateX(Math.PI/2), tDark, eng, 0,-.05,3.1);
    }
  }
  // VOP + SOP
  for (const sx of [-1,1]){ const g = plan([[0,15.2],[6.6,19.2],[6.6,20.4],[0,19.6]], .22); if (sx<0) g.scale(-1,1,1); mesh(g, tGrey, tanker, sx*.4, 1.2, 0); }
  mesh(side([[12.6,1.2],[19.3,8.8],[21.0,8.8],[20.6,1.6]], .34), tGrey, tanker, 0, .0, 0);
  mesh(new THREE.BoxGeometry(.4,.5,1.3), tGreyD, tanker, 0,8.6,20.2);
  // pruh na SOP a anténky
  mesh(side([[17.2,5.2],[18.3,6.4],[20.4,6.4],[20.25,5.2]], .38), LM(0x2f5aa8), tanker);
  for (const [z,h] of [[-10,.6],[2,.5],[-4,.45]]) mesh(new THREE.BoxGeometry(.08,h,.35), tDark, tanker, 0, 2.0+h/2, z);
  for (const z of [-12,6]) mesh(new THREE.BoxGeometry(.08,.5,.3), tDark, tanker, 0, -2.2, z);
}
// tankovací tyč + kabina operátora
const boom = new THREE.Group(); boom.position.set(0,-.45,17.6); tanker.add(boom);
const boomMat = LM(0xa9b1bb), boomX = new THREE.MeshBasicMaterial({ color:0xd6ecff, transparent:true, opacity:.35, depthWrite:false });
const boomOuter = mesh(new THREE.CylinderGeometry(.34,.3,12,14), boomMat, boom); boomOuter.rotation.x = Math.PI/2; boomOuter.position.z = 6;
mesh(new THREE.SphereGeometry(.55,14,10), tGreyD, boom);
const boomInner = mesh(new THREE.CylinderGeometry(.17,.17,6,12), LM(0xc4cad1), boom); boomInner.rotation.x = Math.PI/2;
const nozzle = mesh(new THREE.CylinderGeometry(.26,.15,.7,12), LM(0x3a3f47), boom); nozzle.rotation.x = Math.PI/2;
const nozzleTip = new THREE.Object3D(); boom.add(nozzleTip);
const rudds = [];
for (const sx of [-1,1]){
  const r = new THREE.Group(); r.position.set(0,0,9.6); boom.add(r);
  const wing = mesh(new THREE.BoxGeometry(1.7,.08,.7), LM(0x8a939e), r, sx*.95, 0, 0);
  r.rotation.z = sx*.75; rudds.push(r);
}
mesh(new THREE.CylinderGeometry(.5,.5,.3,12).rotateX(Math.PI/2), tDark, boom, 0,0,9.2);
// fuel "x-ray" částice
const fuelDots = []; const fuelMat = new THREE.MeshBasicMaterial({ color:0xffb347 });
for (let i=0;i<34;i++){ const d = new THREE.Mesh(new THREE.BoxGeometry(.18,.18,.38), fuelMat); d.visible=false; boom.add(d); fuelDots.push(d); }
// kabina (kryt podu pod ocasem)
const pod = new THREE.Group(); pod.position.set(0,-1.15,15.0); tanker.add(pod);
const podHull = mesh(loft([[-2.4,.05,.95,.6],[-.6,-.05,1.05,.68],[.9,-.1,.95,.64],[1.8,0,.6,.45],[2.15,.1,.2,.15]],22), tGrey, pod);
const podCav = mesh(new THREE.BoxGeometry(.95,.05,.6), tDark, pod, 0,-.66,1.05); podCav.rotation.x = .75;
// okno operátora (sklo + světlý rám), skloněné dozadu-dolů
const podWin = new THREE.Group(); podWin.position.set(0,-.43,1.12); podWin.rotation.x = .75; pod.add(podWin);
{
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(.9,.55), new THREE.MeshBasicMaterial({ color:0x9fd2ff, transparent:true, opacity:.35, depthWrite:false, side:THREE.DoubleSide }));
  gl.renderOrder = 6; podWin.add(gl);
  const fr = LM(0xe9edf2);
  for (const [w,h,x,y] of [[1.0,.07,0,.31],[1.0,.07,0,-.31],[.07,.66,.48,0],[.07,.66,-.48,0],[.04,.6,0,0]]) mesh(new THREE.BoxGeometry(w,h,.06), fr, podWin, x,y,0);
}
// řez podem (jen S5): tmavá zadní stěna + podlaha + světlý okraj řezu
const podCut = new THREE.Group(); pod.add(podCut); podCut.visible = false;
{
  const wall = LM(0x2a3242), edge = LM(0xe3e8ee);
  mesh(new THREE.BoxGeometry(.05,1.15,4.0), wall, podCut, .62,-.02,-.3);
  mesh(new THREE.BoxGeometry(1.2,.05,4.0), LM(0x3a4354), podCut, 0,-.6,-.3);
  mesh(new THREE.BoxGeometry(1.2,.05,4.0), wall, podCut, 0,.56,-.3);
  for (const y of [.58,-.62]) mesh(new THREE.BoxGeometry(.08,.08,4.0), edge, podCut, -.6,y,-.3);
  mesh(new THREE.BoxGeometry(.08,1.2,.08), edge, podCut, -.6,-.02,-2.3);
  mesh(new THREE.BoxGeometry(1.2,1.2,.05), wall, podCut, 0,-.02,-2.3);
}
// operátor: leží na břiše podél osy, hlava u okna (+z), ruce na ovladačích, nohy dozadu
const op = new THREE.Group(); op.position.set(0,-.2,-.15); pod.add(op);
const opParts = [];
{
  const suit = LM(0x8a9a5e), suitD = LM(0x5f6b3e), helmet = LM(0xf0f0ea), visor = LM(0x10141c), glove = LM(0x1d1d1f), couch = LM(0x2c3446);
  const M = (g,m,x,y,z) => { const o = mesh(g,m,op,x,y,z); opParts.push(o); return o; };
  M(new THREE.BoxGeometry(.78,.12,2.7), couch, 0,-.24,-.75);                               // lehátko
  M(new THREE.BoxGeometry(.5,.1,.3), couch, 0,-.12,.62);                                     // opěrka brady/hrudi
  const torso = M(new THREE.CapsuleGeometry(.2,.62,4,10), suit, 0,0,-.12); torso.rotation.x = Math.PI/2; torso.scale.set(1.25,1,.85);
  const hips = M(new THREE.CapsuleGeometry(.18,.2,4,10), suitD, 0,-.02,-.72); hips.rotation.z = Math.PI/2; hips.scale.set(1,1.1,1);
  for (const sx of [-1,1]){
    const th = M(new THREE.CapsuleGeometry(.09,.62,4,8), suit, 0,0,0); beam(th, new THREE.Vector3(sx*.12,-.03,-.8), new THREE.Vector3(sx*.15,-.06,-1.5));
    const sh = M(new THREE.CapsuleGeometry(.075,.6,4,8), suit, 0,0,0); beam(sh, new THREE.Vector3(sx*.15,-.06,-1.5), new THREE.Vector3(sx*.17,-.08,-2.15));
    M(new THREE.BoxGeometry(.13,.2,.12), glove, sx*.17,-.04,-2.25);                         // boty
    const ua = M(new THREE.CapsuleGeometry(.07,.32,4,8), suit, 0,0,0); beam(ua, new THREE.Vector3(sx*.28,.04,.22), new THREE.Vector3(sx*.33,-.1,.5));
    const fa = M(new THREE.CapsuleGeometry(.06,.3,4,8), suit, 0,0,0); beam(fa, new THREE.Vector3(sx*.33,-.1,.5), new THREE.Vector3(sx*.36,-.16,.84));
    M(new THREE.SphereGeometry(.07,8,6), glove, sx*.36,-.17,.88);
    M(new THREE.CylinderGeometry(.03,.03,.22,6), LM(0x111111), sx*.36,-.28,.9);            // páky
    M(new THREE.BoxGeometry(.16,.06,.16), LM(0x30343c), sx*.36,-.4,.9);
  }
  const head = new THREE.Group(); head.position.set(0,.06,.48); head.rotation.x = .45; op.add(head);
  opParts.push(mesh(new THREE.SphereGeometry(.16,16,12), helmet, head));
  opParts.push(mesh(new THREE.BoxGeometry(.26,.12,.08), visor, head, 0,-.05,.13));
  // přístrojový panel u okna
  const pan = M(new THREE.BoxGeometry(.7,.05,.25), LM(0x22262e), 0,-.33,1.1);
  for (const [x,c] of [[-.2,0x5dff9a],[0,0xffb347],[.2,0x5dd0ff]]) M(new THREE.BoxGeometry(.12,.06,.1), new THREE.MeshBasicMaterial({ color:c }), x,-.3,1.08);

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
