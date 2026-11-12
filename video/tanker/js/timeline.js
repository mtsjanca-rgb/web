// Timeline: camera + object poses per shot (scenePose) and per-shot UI plates (drawUI).
// Shot table (seconds): S1 0–3.25 hook · S2 –5.45 tanker reveal · S3 –9.3 KC-135/speed · S4 –12.45 approach
// · S5 –15.55 operator (pod cut) · S6 –18.7 flying boom · S7 –21.7 contact (20.62) · S8 –24.95 fuel x-ray
// · S9 –28.0 disconnect (25.2) · S10 –31.6 tanker flies on.
import * as THREE from "../lib/three.module.js";
import { cl, P, io, oc, W } from "./helpers.js";
import { contactBurst, fuelOff, fuelFlow } from "./vfx.js";

export const SPEED = 150; // m/s ≈ 540 km/h

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
  if (t < 3.25){                              // S1 hook: stíhačka sama
    shot = 1; const k = t/3.25;
    fighter.position.set(-6, -16, 70).add(bob); fighter.rotation.z = Math.sin(t*.8)*.04;
    const F = fighter.position;
    cam.fov = 38;
    cam.position.set(F.x - 22 + k*3, F.y + 6.5 - k*1.2, F.z - 24 + k*3.5); aim(new THREE.Vector3(F.x, F.y, F.z + .5), 540, 880);
  } else if (t < 5.45){                       // S2 odhalení tankeru nad stíhačkou
    shot = 2; const k = (t-3.25)/2.2;
    fighter.position.set(-6, -16, 70).add(bob);
    cam.position.set(-14 + k*2, -22 + k*1.5, 96 - k*6); cam.lookAt(-2, -4 + k*2, 20 - k*4);
    cam.fov = 44;
  } else if (t < 9.3){                        // S3 tanker, rychlost
    shot = 3; const k = (t-5.45)/3.85;
    fighter.position.set(-6, -16, 72).add(bob);
    cam.position.set(-50 + k*8, -14 + k*3, -50 + k*10); cam.lookAt(1, -1, 2 + k*2);
    cam.fov = 44;
  } else if (t < 12.45){                      // S4 stíhačka se přisune pod ocas
    shot = 4; const k = io(P(t, 9.3, 3.0)), kc = (t-9.3)/3.15;
    const from = new THREE.Vector3(-3, -19, 56), to = CONTACT_POS.clone().add(new THREE.Vector3(0,-.9,3.0));
    fighter.position.copy(from).lerp(to, k).add(bob.multiplyScalar(.6));
    bAng = .2 + .25*io(P(t, 9.5, 1.7));
    cam.position.set(-12 + kc*3.5, -26 + kc*5, 84 - kc*12); cam.lookAt(-1 + kc, -8 + kc*1.5, 30 - kc*2);
    cam.fov = 42;
  } else if (t < 15.55){                      // S5 operátor v okně (boční řez)
    shot = 5; const k = (t-12.45)/3.1;
    fighter.position.copy(CONTACT_POS).add(new THREE.Vector3(0,-.9,3.0)).add(bob.multiplyScalar(.4));
    bAng = .45;
    podHull.visible = false; podCut.visible = true;
    cam.fov = 46;
    cam.position.set(-6.4 + k*.8, -.3 - k*.1, 17.4 - k*.3);
    aim(W(pod, new THREE.Vector3(0,-.3,.2)), 560, 900);
  } else if (t < 18.7){                       // S6 tyč s křidélky
    shot = 6; const k = (t-15.55)/3.15;
    fighter.position.copy(CONTACT_POS).add(new THREE.Vector3(0,-.6,2.0)).add(bob.multiplyScalar(.4));
    bAng = .45 + Math.sin(k*Math.PI*1.5)*.05 + k*.04; bYaw = Math.sin(k*Math.PI*2)*.06;
    rudds.forEach((r,i)=> r.rotation.x = Math.sin(t*3.2 + i)*.35);
    cam.position.set(-8.5 + k*1.5, -3.2 - k*.6, 22.5 + k*1.2); cam.lookAt(0, -4.4, 26.5);
    cam.fov = 44;
  } else if (t < 21.7){                       // S7 zasunutí do zásuvky
    shot = 7; const k = (t-18.7)/3.0;
    const approach = io(P(t, 18.7, 1.2));
    fighter.position.copy(CONTACT_POS).add(new THREE.Vector3(0,-.6*(1-approach),2.0*(1-approach))).add(bob.multiplyScalar(.15));
    recDoor.rotation.x = oc(P(t,18.9,.6)) * 1.9;
    bAng = .52; bExt = 3.0 * io(P(t, 19.7, .9));
    rudds.forEach((r,i)=> r.rotation.x = Math.sin(t*2.6 + i)*.15);
    fighter.updateMatrixWorld(true);
    const R = W(fighter, RECEPT);
    cam.fov = 44;
    cam.position.set(R.x - 8.0 + k*1.2, R.y + 2.8 - k*.3, R.z + 3.6 - k*.6);
    aim(R, 600, 800);
  } else if (t < 24.95){                      // S8 palivo (rentgen): zezadu-shora, tyč → zásuvka → nádrže
    shot = 8; const k = (t-21.7)/3.25;
    fighter.position.copy(CONTACT_POS).add(bob.multiplyScalar(.12));
    recDoor.rotation.x = 1.9; bAng = .52; bExt = 3.0;
    boomOuter.material = boomX; fighterXray(true);
    fuelFlow(t, T, F);
    fighter.updateMatrixWorld(true);
    const R = W(fighter, RECEPT);
    cam.fov = 46;
    cam.position.set(R.x - 8.5 + k*1.0, R.y + 10 - k*.6, R.z + 14.5 - k*1.2);
    aim(W(fighter, new THREE.Vector3(0,0,.4)), 540, 960);
  } else if (t < 28.0){                       // S9 odpojení a odpad, kamera jede za stíhačkou
    shot = 9; const k = (t-24.95)/3.05;
    const drop = io(P(t, 25.5, 2.3));
    recDoor.rotation.x = 1.9 * (1 - P(t,26.4,.5));
    bExt = 3.0 * (1 - io(P(t, 25.2, .5))); bAng = .52 - P(t,25.5,1.5)*.3;
    const off = new THREE.Vector3(-drop*9, -drop*6, drop*5);
    fighter.position.copy(CONTACT_POS).add(off).add(bob.multiplyScalar(.2));
    fighter.rotation.z = drop*.4; fighter.rotation.y = drop*.1;
    cam.fov = 44;
    cam.position.copy(CONTACT_POS).add(new THREE.Vector3(-27 + k*2, 7, 19 - k*2)).addScaledVector(off, .8);
    fighter.updateMatrixWorld(true);
    aim(fighter.position.clone().add(new THREE.Vector3(0,.4,1.0)), 540 - 50*drop, 980 - 100*drop);
  } else {                                    // S10 tanker letí dál
    shot = 10; const k = (t-28.0)/3.6;
    fighter.position.set(-60, -40, 60);
    bAng = .22;
    cam.fov = 42;
    cam.position.set(-13 - k*3, 4 + k*3, 33 + k*30); aim(new THREE.Vector3(0, -.5, -3), 540, 820);
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
                   plate(["SPEED", Math.round(500 + 37*oc(P(t,6.6,1.6))) + " KM/H"], 330, 1150, fa(6.5)); }
  if (shot === 4){ plate(["F-16","RECEIVER"], 300, 280, fa(9.7), pr(W(fighter, new THREE.Vector3(0,.8,-2.5)))); }
  if (shot === 5){ plate(["BOOM","OPERATOR"], 300, 260, fa(12.9), pr(W(op, new THREE.Vector3(0,.12,.5))));
                   plate(["WINDOW"], 780, 1140, fa(14.2), pr(W(podWin, new THREE.Vector3(0,-.15,0)))); }
  if (shot === 6){ plate(["FLYING","BOOM"], 290, 280, fa(16.0), pr(W(rudds[0], new THREE.Vector3(-1.4,0,0)))); }
  if (shot === 7){ const R = pr(W(fighter, RECEPT)); plate(["RECEPTACLE"], 720, 280, fa(19.1), R); contactBurst(U.cx, t, R); }
  if (shot === 8){ plate(["FUEL FLOW","~2.7 T/MIN"], 300, 250, fa(22.2), pr(W(boom, new THREE.Vector3(0,0,13.2))));
                   plate(["FUEL", Math.round(15 + 85*cl((t-22)/2.8)) + " %"], 810, 470, fa(22.4), pr(W(fighter, new THREE.Vector3(2.4,0,1.6)))); }
  if (shot === 9){ plate(["FUEL","FULL"], 760, 280, fa(26.4), pr(W(fighter, new THREE.Vector3(0,1.25,-3.1)))); }
}
return { pose, scenePose, drawUI, aim, CONTACT_POS };
}
