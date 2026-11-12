// F-16 receiver model. Local frame: metres, nose → −z, +y up. RECEPT = receptacle point in fighter-local coords.
import * as THREE from "../lib/three.module.js";
import { loft, plan, side, toned, mesh, LM } from "./helpers.js";

export function buildFighter(scene){
const fighter = new THREE.Group(); if (scene) scene.add(fighter);
const VC = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.85, metalness:0 });
const fGrey = LM(0xa3acb7), fGreyD = LM(0x8a94a0), fDark = LM(0x2b3038);
const recDoor = new THREE.Group();
const fTanks = [];             // nádrže pro rentgen
{
  const F = [[-7.6,.05,.04,.04],[-7.1,.02,.3,.3],[-6.3,0,.5,.52],[-5.2,.05,.62,.7],[-4.0,.1,.72,.82],[-2.6,.12,.82,.9],[-1.2,.08,.92,.9],[.5,.0,1.0,.86],
             [2.6,-.02,.98,.82],[4.6,-.04,.88,.76],[6.0,-.05,.7,.66],[6.9,-.05,.6,.58]];
  mesh(toned(loft(F,28), 0x7f8996, 0xb6bec8, .08), VC, fighter);
  mesh(new THREE.ConeGeometry(.3,1.1,16).rotateX(-Math.PI/2), LM(0x5d6570), fighter, 0,.03,-7.15);     // tmavší radom
  // chin intake: kapota pod trupem + tmavý otvor + světlý břit
  mesh(toned(loft([[-3.25,-1.0,.62,.48],[-2.6,-.98,.66,.52],[-1.0,-.86,.66,.52],[1.5,-.74,.62,.5],[3.0,-.6,.5,.42]],20), 0x8a94a0, 0xb6bec8, .05), VC, fighter);
  const mouth = mesh(new THREE.CircleGeometry(.5,20), new THREE.MeshBasicMaterial({ color:0x06080c, side:THREE.DoubleSide }), fighter, 0,-1.0,-3.27);
  mouth.scale.set(1.12,.86,1); mouth.rotation.y = Math.PI;
  const lip = mesh(new THREE.TorusGeometry(.58,.06,6,22), LM(0xd2d8de), fighter, 0,-1.0,-3.27); lip.scale.set(1.07,.87,1);
  // kokpit: tmavá vana, sedadlo, pilot (bílá helma), průhledný zlatavý překryt
  mesh(new THREE.BoxGeometry(.7,.25,2.2), LM(0x1d222a), fighter, 0,.82,-3.4);
  mesh(new THREE.BoxGeometry(.42,.7,.22), LM(0x3a3f46), fighter, 0,1.05,-2.75).rotation.x = -.25;  // opěradlo
  mesh(new THREE.SphereGeometry(.2,14,10), LM(0xf4f4ee), fighter, 0,1.2,-3.0);                     // helma
  mesh(new THREE.BoxGeometry(.3,.12,.12), LM(0x15181e), fighter, 0,1.18,-3.17);                         // hledí
  mesh(new THREE.BoxGeometry(.5,.18,.3), LM(0x2a2f37), fighter, 0,1.0,-4.1);                          // HUD
  const canopyM = new THREE.MeshStandardMaterial({ color:0xe0c27a, transparent:true, opacity:.26, roughness:.5, metalness:0, depthWrite:false, emissive:0x2a1e06 });
  const can = mesh(new THREE.SphereGeometry(.56,24,16), canopyM, fighter, 0,.86,-3.3); can.scale.set(.92,1.0,3.2); can.renderOrder = 4; can.castShadow = false;
  // páteř za kabinou + zásuvka
  mesh(toned(loft([[-2.0,.55,.42,.4],[1.5,.6,.45,.42],[4.2,.45,.35,.3]],14), 0x7f8996, 0x9aa3ad, .05), VC, fighter);
  mesh(new THREE.BoxGeometry(.5,.06,.62), fDark, fighter, 0,1.0,-.6);
  recDoor.position.set(0,1.02,-.91); fighter.add(recDoor);
  mesh(new THREE.BoxGeometry(.5,.05,.62), fGreyD, recDoor, 0,0,.31);
  // LERX + křídla + VOP
  for (const sx of [-1,1]){
    let g = plan([[.45,-5.6],[1.0,-3.6],[1.75,-1.2],[1.75,.4],[.45,.4]], .1); if (sx<0) g.scale(-1,1,1); mesh(toned(g,0x7f8996,0xb6bec8,.04), VC, fighter, 0,.12,0);
    g = plan([[.9,-1.4],[4.75,2.6],[4.75,3.7],[.9,4.3]], .2); if (sx<0) g.scale(-1,1,1); mesh(toned(g,0x7f8996,0xb6bec8,.06), VC, fighter, 0,-.05,0);
    g = plan([[.6,4.8],[2.9,6.4],[2.9,7.1],[.6,6.9]], .12); if (sx<0) g.scale(-1,1,1); mesh(toned(g,0x7f8996,0xb6bec8,.04), VC, fighter, 0,-.1,0);
    // AIM-9 na konci křídla
    const m = new THREE.Group(); m.position.set(sx*4.95,-.08,2.9); fighter.add(m);
    mesh(new THREE.CylinderGeometry(.11,.11,2.9,10).rotateX(Math.PI/2), LM(0xf2f2f0), m);
    mesh(new THREE.ConeGeometry(.11,.35,10).rotateX(-Math.PI/2), LM(0x4a4f57), m, 0,0,-1.62);
    mesh(new THREE.CylinderGeometry(.115,.115,.25,10).rotateX(Math.PI/2), LM(0xc9a227), m, 0,0,-1.1);
    for (let k=0;k<4;k++){ const a = k*Math.PI/2+Math.PI/4; const f = mesh(new THREE.BoxGeometry(.36,.025,.34), LM(0xd8d8d8), m, Math.cos(a)*.2, Math.sin(a)*.2, 1.25); f.rotation.z = a;
                           const f2 = mesh(new THREE.BoxGeometry(.22,.025,.2), LM(0xd8d8d8), m, Math.cos(a)*.15, Math.sin(a)*.15, -.9); f2.rotation.z = a; }
    mesh(new THREE.BoxGeometry(.08,.12,1.6), fDark, fighter, sx*4.82,-.02,2.9);
    // břišní ploutvičky
    const vf = mesh(side([[3.8,0],[5.0,0],[4.9,-.6],[4.2,-.6]], .05), fGreyD, fighter, sx*.55,-.65,0); vf.rotation.z = sx*.3;
  }
  mesh(toned(side([[3.3,.7],[5.4,3.85],[6.4,3.85],[6.8,.7]], .14),0x7f8996,0x9aa3ad,.05), VC, fighter, 0,0,0);
  mesh(new THREE.BoxGeometry(.18,.25,.5), fDark, fighter, 0,3.8,6.2);
  // tryska s lamelami
  mesh(new THREE.CylinderGeometry(.5,.56,1.1,18).rotateX(Math.PI/2), LM(0x50555c), fighter, 0,-.05,7.4);
  for (let k=0;k<12;k++){ const a = k/12*Math.PI*2; const l = mesh(new THREE.BoxGeometry(.05,.05,1.0), LM(0x34383e), fighter, Math.cos(a)*.55, -.05+Math.sin(a)*.55, 7.45); }
  mesh(new THREE.CylinderGeometry(.42,.42,.08,18).rotateX(Math.PI/2), LM(0x111111), fighter, 0,-.05,7.96);
  for (const sx of [-1,1]) mesh(new THREE.CylinderGeometry(.28,.28,.02,16).rotateZ(Math.PI/2), LM(0x6f7a88), fighter, sx*.97,.1,1.6);
  // NÁDRŽE (rentgen, viditelné jen v S8/S9): trup přední/zadní + 2 křídelní
  const shellM = new THREE.MeshBasicMaterial({ color:0x0b1830, side:THREE.BackSide }), fillM = new THREE.MeshBasicMaterial({ color:0xffb040, transparent:true, opacity:.95, depthWrite:false });
  for (const [x,y,z,w,h,l] of [[0,.25,-1.4,.9,.75,1.6],[0,.2,1.6,1.1,.75,3.0],[-2.4,-.05,1.6,1.7,.16,1.9],[2.4,-.05,1.6,1.7,.16,1.9]]){
    const sh = mesh(new THREE.BoxGeometry(w,h,l), shellM, fighter, x,y,z); sh.castShadow = false;
    const fl = mesh(new THREE.BoxGeometry(w*.86,h*.82,1), fillM, fighter, x,y,z); fl.castShadow = false; fl.renderOrder = 10;
    sh.visible = fl.visible = false; fTanks.push({ sh, fl, z0: z - l/2, l: l*.92 });
  }
}
const RECEPT = new THREE.Vector3(0,1.02,-.6); // místní poloha zásuvky
// palivo uvnitř stíhačky: zásuvka → nádrže
const fDots = []; const FPATHS = [[[0,1.0,-.6],[0,.5,-.8],[0,.3,-1.6]],[[0,1.0,-.6],[0,.4,0],[0,.3,1.8]],[[0,1.0,-.6],[0,.3,.4],[-1.0,.0,1.2],[-2.4,-.05,1.6]],[[0,1.0,-.6],[0,.3,.4],[1.0,.0,1.2],[2.4,-.05,1.6]]].map(p => p.map(a => new THREE.Vector3(...a)));
for (let i=0;i<28;i++){ const d = new THREE.Mesh(new THREE.BoxGeometry(.16,.16,.16), new THREE.MeshBasicMaterial({ color:0xffe08a, transparent:true, depthWrite:false })); d.renderOrder = 11; d.visible = false; fighter.add(d); fDots.push(d); }
const fSkin = []; fighter.traverse(o => { if (o.isMesh && !fTanks.some(T => T.sh===o || T.fl===o) && !fDots.includes(o)) fSkin.push([o, o.material]); });
const fXray = new THREE.MeshBasicMaterial({ color:0x1d4a86, transparent:true, opacity:.42, depthWrite:false });
function fighterXray(on){ fSkin.forEach(([o,m]) => { o.material = on ? fXray : m; o.castShadow = !on; }); }
function pathPt(path, u){ const n = path.length-1, f = u*n, i = Math.min(n-1, Math.floor(f)); return path[i].clone().lerp(path[i+1], f-i); }

return { fighter, recDoor, RECEPT, fTanks, fDots, FPATHS, pathPt, fSkin, fXray, fighterXray, VC };
}
