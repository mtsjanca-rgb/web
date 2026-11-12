// Timeline: camera + object poses per shot (scenePose) and per-shot UI plates (drawUI).
// Shot table (seconds): S1 0–3.25 hook · S2 –5.45 tanker reveal · S3 –9.3 KC-135/speed · S4 –12.45 approach
// · S5 –15.55 operator (pod cut) · S6 –18.7 flying boom · S7 –21.7 contact (20.62) · S8 –24.95 fuel x-ray
// · S9 –28.0 disconnect (25.2) · S10 –31.6 tanker flies on.
import * as THREE from "../lib/three.module.js";
import { cl, P, io, oc, W } from "./helpers.js";
import { contactBurst, fuelOff, fuelFlow } from "./vfx.js";

export const SPEED = 150; // m/s ≈ 540 km/h
// camera parameters (cinematographer v3 fix round): S6 boom orbit, S10/S3/S8 framing, S6 fighter offset
const S8=[-6.5,25,23.5,-3,23,21,540,815,.4,22,13];
const S10=[-14,7,88,-8,13,140,860,900];
const S3=[18,26,95,91,-27,-23,468,760];
const FX=0, FY=-3, FZ=5;
const S1C=[-3.0,1.0,780,-6];   // S1: cam dy, rise, aim py, roll°
const S4C=[-3.5,-30,0];        // S4: fighter from.x, aim px shift, aim py shift
const S6C=[2.5,-40,-30,-170,-150];       // S6: extra r, dpx A, dpy A, dpx B, dpy B
const S7C=[1.3,.42,640,800,0];   // S7: pull-back scale, aim lerp R→tip, px, py, ...
let AZ0=-62, AZ1=-38, R0=15, R1=9, Y0=-3, Y1=-.5, PX1=540, PY1=820, RL0=28, RL1=16;

// cam: PerspectiveCamera; T = buildTanker() handles; F = buildFighter() handles; U = buildUI() handles
export function createTimeline(cam, T, F, U){
const { tanker, boom, boomOuter, rudds, boomMat, boomX, tGrey, pod, podHull, podCut, podCav, podWin, op, setBoom, boomTipWorld } = T;
const { fighter, recDoor, RECEPT, fighterXray } = F;
const { plate, proj } = U;

const CONTACT_POS = new THREE.Vector3(); let BOOM_ANG = .52;
// kontaktní poloha stíhačky (zásuvka = špička trysky při úhlu .52 a vysunutí 3)
{ const tip = boomTipWorld(.52, 3.0); CONTACT_POS.copy(tip).sub(RECEPT); }

function aim(target, px, py){
  cam.updateProjectionMatrix(); cam.lookAt(target);
  const tv = Math.tan(cam.fov*Math.PI/360);
  cam.rotateY(Math.atan((px/540-1)*tv*cam.aspect)); cam.rotateX(-Math.atan((1-py/960)*tv));
}
function scenePose(t){
  tanker.updateMatrixWorld(true);
  // výchozí
  fighter.visible = true; fighter.rotation.set(0,0,0); recDoor.rotation.x = 0;
  rudds.forEach((r,i)=> r.rotation.x = 0);
  let bAng = .2, bExt = 0, bYaw = 0;
  fuelOff(T, F);
  fighterXray(false);
  boomOuter.material = boomMat; podHull.material = tGrey; podHull.visible = true; podCut.visible = false; podCav.visible = true; podWin.visible = true;
  const bob = new THREE.Vector3(Math.sin(t*.9)*.12, Math.sin(t*1.3)*.18, Math.sin(t*.7)*.1);
  let shot;
  const V3 = (x,y,z) => new THREE.Vector3(x,y,z);
  if (t < 3.25){                              // S1 hook: nízký hrdinský záběr F-16 zepředu-zleva, pomalý oblet + najezd
    shot = 1; const k = t/3.25, ks = io(k);
    fighter.position.set(-6, -16, 70).add(bob); fighter.rotation.z = Math.sin(t*.8)*.04; fighter.rotation.x = .03;
    const F = fighter.position;
    const az = (14 + 14*ks)*Math.PI/180, r = 23 + 3.5*ks;
    cam.fov = 40;
    cam.position.set(F.x - Math.sin(az)*r, F.y + S1C[0] + ks*S1C[1], F.z - Math.cos(az)*r);
    aim(V3(F.x, F.y + .2, F.z + .2), 540, S1C[2]); cam.rotateZ(S1C[3]*Math.PI/180);
  } else if (t < 5.45){                       // S2 přes rameno stíhačky jeřábem nahoru → tanker před ní
    shot = 2; const k = (t-3.25)/2.2, ks = io(k);
    fighter.position.set(-6, -16, 70).add(bob);
    const F = fighter.position;
    cam.fov = 44;
    cam.position.set(F.x + 2.5 - ks*1.5, F.y + .4 + ks*2.2, F.z + 23 + ks*6);
    aim(F.clone().lerp(V3(-1, -2, 4), .25 + .3*ks), 660 - 110*ks, 960 - 30*ks);
  } else if (t < 9.3){                        // S3 tanker zepředu-zdola, pomalý oblet
    shot = 3; const k = (t-5.45)/3.85, ks = io(k);
    fighter.position.set(30, -20, 95).add(bob); fighter.visible = false;
    cam.fov = 40;
    const az = (S3[0] + (S3[1]-S3[0])*ks)*Math.PI/180, r = S3[2] - (S3[2]-S3[3])*ks;
    cam.position.set(-Math.sin(az)*r, S3[4] + (S3[5]-S3[4])*ks, -Math.cos(az)*r);
    aim(V3(0, -1, 1), S3[6] - 50*ks, S3[7]);
  } else if (t < 12.45){                      // S4 stíhačka se přisune zboku pod ocas
    shot = 4; const k = io(P(t, 9.3, 2.9)), kc = (t-9.3)/3.15;
    const from = V3(S4C[0], -14.5, 49), to = CONTACT_POS.clone().add(V3(0,-.9,3.0));
    fighter.position.copy(from).lerp(to, k).add(bob.multiplyScalar(.6));
    fighter.rotation.z = -Math.sin(k*Math.PI)*.12;
    bAng = .2 + .25*io(P(t, 10.2, 1.8));
    cam.fov = 44;
    cam.position.set(-20 + kc*4, -13 + kc*1.5, 80 - kc*10);
    aim(V3(2.5 - kc*2.5, -7.5, 31), 420 + 60*kc + S4C[1]*(1-kc), 790 + S4C[2]*(1-kc));
  } else if (t < 15.55){                      // S5 operátor v okně (boční řez)
    shot = 5; const k = (t-12.45)/3.1, ks = io(k);
    fighter.position.copy(CONTACT_POS).add(V3(0,-.9,3.0)).add(bob.multiplyScalar(.4));
    bAng = .45;
    podHull.visible = false; podCut.visible = true;
    cam.fov = 46;
    const c = W(pod, V3(0,-.1,.4));
    cam.fov = 50;
    { const az = (-46 + 12*ks)*Math.PI/180, r = 4.7 - .6*ks;
      cam.position.set(c.x + Math.sin(az)*r, c.y + 1.1 - ks*.25, c.z + Math.cos(az)*r); }
    aim(W(pod, V3(0,-.4,-.25)), 520 - 70*ks, 760);
  } else if (t < 18.7){                       // S6 tyč s křidélky – oblet kolem ruddevatorů
    shot = 6; const k = (t-15.55)/3.15, ks = io(k);
    fighter.position.copy(CONTACT_POS).add(V3(FX,FY,FZ)).add(bob.multiplyScalar(.4));
    bAng = .45 + Math.sin(k*Math.PI*1.5)*.05 + k*.04; bYaw = Math.sin(k*Math.PI*2)*.06;
    rudds.forEach((r,i)=> r.rotation.x = Math.sin(t*4 + i*1.3)*.35);
    setBoom(bAng, 0, bYaw); boom.updateMatrixWorld(true);
    const RD = W(boom, V3(0,0,9.6)), BM = W(boom, V3(0,0,7.2));
    // A (15.55–17.4) boční profil celé tyče (závěs → tryska) se stíhačkou pod ní; B (17.45–18.7) šikmo k ose tyče na křidélka
    const A = io(P(t, 15.55, 1.9)), B = io(P(t, 16.75, 1.9));
    const az = (AZ0 + 5*A + (AZ1-AZ0-5)*B)*Math.PI/180, r = R0 - 2*A - (R0-2-R1)*B + S6C[0];
    cam.fov = 44;
    cam.position.set(RD.x + Math.sin(az)*r, RD.y + Y0 + (Y1-Y0)*B, RD.z + Math.cos(az)*r);
    aim(BM.clone().lerp(RD, B), 310 + S6C[1] + (PX1-310+S6C[3]-S6C[1])*B, 690 + S6C[2] + (PY1-690+S6C[4]-S6C[2])*B);
    cam.rotateZ((RL0 + (RL1-RL0)*B)*Math.PI/180);
  } else if (t < 21.7){                       // S7 zasunutí do zásuvky
    shot = 7; const k = (t-18.7)/3.0, ks = io(k);
    const approach = io(P(t, 18.7, 1.2));
    fighter.position.copy(CONTACT_POS).add(V3(0,-.6*(1-approach),2.0*(1-approach))).add(bob.multiplyScalar(.15));
    recDoor.rotation.x = oc(P(t,18.9,.6)) * 1.9;
    bAng = .52; bExt = 3.0 * io(P(t, 19.7, .9));
    rudds.forEach((r,i)=> r.rotation.x = Math.sin(t*2.6 + i)*.15);
    fighter.updateMatrixWorld(true);
    const R = W(fighter, RECEPT);
    setBoom(bAng, bExt, bYaw); tanker.updateMatrixWorld(true);
    const TIP = boomTipWorld(bAng, bExt), wl = S7C[1]*(1 - io(P(t, 19.4, 1.2)));   // cíl mezi zásuvkou a tryskou → do kontaktu jen zásuvka
    const pb = 1 + (S7C[0]-1)*(1 - .5*ks);
    cam.fov = 44;
    cam.position.set(R.x + (-10.5 + ks*3.2)*pb, R.y + (4.2 - ks*1.4)*pb, R.z + (5.2 - ks*2.0)*pb);
    aim(R.clone().lerp(TIP, wl), S7C[2] + (580 - S7C[2])*io(P(t,20.2,1.3))*S7C[4], S7C[3]);
  } else if (t < 24.95){                      // S8 palivo (rentgen): shora-zboku, tyč → zásuvka → nádrže
    shot = 8; const k = (t-21.7)/3.25, ks = io(k);
    fighter.position.copy(CONTACT_POS).add(bob.multiplyScalar(.12));
    recDoor.rotation.x = 1.9; bAng = .52; bExt = 3.0;
    boomOuter.material = boomX; fighterXray(true);
    fuelFlow(t, T, F);
    fighter.updateMatrixWorld(true);
    const R = W(fighter, RECEPT);
    cam.fov = 44;
    cam.position.set(R.x + S8[0] + (S8[3]-S8[0])*ks, R.y + S8[1] + (S8[4]-S8[1])*ks, R.z + S8[2] + (S8[5]-S8[2])*ks);
    aim(W(fighter, V3(0,0,S8[8])), S8[6], S8[7]); cam.rotateZ((S8[9] + (S8[10]-S8[9])*ks)*Math.PI/180);
  } else if (t < 28.0){                       // S9 odpojení a odpad
    shot = 9; const k = (t-24.95)/3.05;
    const drop = io(P(t, 25.5, 2.3));
    recDoor.rotation.x = 1.9 * (1 - P(t,26.4,.5));
    bExt = 3.0 * (1 - io(P(t, 25.2, .5))); bAng = .52 - P(t,25.5,1.5)*.3;
    const off = V3(drop*1, -drop*7.5, drop*1.5);
    fighter.position.copy(CONTACT_POS).add(off).add(bob.multiplyScalar(.2));
    fighter.rotation.z = drop*.15; fighter.rotation.x = -drop*.06;
    cam.fov = 44;
    cam.position.copy(CONTACT_POS).add(V3(-22 + k*2, 4.5, 27 - k*3)).addScaledVector(off, .3);
    aim(CONTACT_POS.clone().add(V3(0,-.5,0)).addScaledVector(off, .5), 540, 800);
  } else {                                    // S10 tanker přelétne nad kamerou a odlétá s kondenzačními stopami
    shot = 10; const k = (t-28.0)/3.6;
    fighter.position.set(-60, -40, 60);
    bAng = .22;
    cam.fov = 50;
    const kz = io(k)*.75 + k*.25;
    cam.position.set(S10[0] + (S10[3]-S10[0])*k, S10[1] + (S10[4]-S10[1])*k, S10[2] + (S10[5]-S10[2])*kz);
    aim(V3(0, -1, 4), 540, S10[6] + (S10[7]-S10[6])*k);
  }
  setBoom(bAng, bExt, bYaw);
  cam.updateProjectionMatrix();
  return shot;
}

// pozice světa před scenePose (tanker se lehce houpe na počátku)
function pose(t){
  tanker.position.set(0, Math.sin(t*.6)*.15, 0); tanker.rotation.z = Math.sin(t*.4)*.006;
  const shot = scenePose(t);
  tanker.updateMatrixWorld(true); fighter.updateMatrixWorld(true);
  return shot;
}

function drawUI(t, shot){
  const fa = (s, d=.25) => cl((t-s)/d);
  const pr = v => proj(v);
  if (shot === 1){ plate(["FUEL","LOW"], 290, 300, fa(.5), pr(W(fighter, new THREE.Vector3(0,.9,-1.2))), { blinkIdx:1, blinkOff: Math.floor(t*3)%2===1 }); }
  if (shot === 2){ plate(["TANKER"], 300, 280, fa(3.6), pr(W(tanker, new THREE.Vector3(0,-1.5,-2)))); }
  if (shot === 3){ plate(["KC-135","STRATOTANKER"], 330, 280, fa(5.9), pr(W(tanker, new THREE.Vector3(0,.5,-6))));
                   plate(["SPEED", Math.round(320 + 217*oc(P(t,6.6,1.05))) + " KM/H"], 770, 300, fa(6.5)); }
  if (shot === 4){ plate(["F-16","RECEIVER"], 300, 280, fa(9.7), pr(W(fighter, new THREE.Vector3(0,.8,-2.5)))); }
  if (shot === 5){ plate(["BOOM","OPERATOR"], 300, 260, fa(13.2), pr(W(op, new THREE.Vector3(0,.12,.5))));
                   plate(["WINDOW"], 780, 1140, fa(14.5), pr(W(podWin, new THREE.Vector3(0,-.15,0)))); }
  if (shot === 6){ plate(["FLYING","BOOM"], 790, 400, fa(16.2), pr(W(boom, new THREE.Vector3(0,0,3.5))));
                   plate(["LITTLE","WINGS"], 290, 1000, fa(17.45), pr(W(rudds[0], new THREE.Vector3(-1.15,0,.17)))); }
  if (shot === 7){ const R = pr(W(fighter, RECEPT)); plate(["RECEPTACLE"], 720, 280, fa(19.5), R); contactBurst(U.cx, t, R); }
  if (shot === 8){ plate(["FUEL FLOW","~2.7 T/MIN"], 300, 250, fa(22.2), pr(W(boom, new THREE.Vector3(0,0,13.2))));
                   plate(["FUEL", Math.round(15 + 85*cl((t-22)/2.8)) + " %"], 810, 470, fa(22.4), pr(W(fighter, new THREE.Vector3(2.4,0,1.6)))); }
  if (shot === 9){ plate(["FUEL","FULL"], 760, 280, fa(26.85), pr(W(fighter, new THREE.Vector3(0,1.25,-3.1)))); }
}
return { pose, scenePose, drawUI, aim, CONTACT_POS };
}
