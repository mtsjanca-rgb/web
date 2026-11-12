// Effects: S7 contact burst (UI layer), white flash (#flash), S8 fuel flow (boom dots, fighter dots, tank fill).
import { cl, oc } from "./helpers.js";

export const CONTACT_T = 20.62;   // okamžik spojení (synchronizováno se zvukem)

// pixelový burst na promítnutém bodě R=[x,y] v UI canvasu cx, 20.62–21.22
export function contactBurst(cx, t, R){
  const p = (t - 20.62)/.6; if (p < 0 || p > 1) return;
  const [x0, y0] = R; cx.save();
  const sq = (x,y,s,c) => { cx.fillStyle = c; cx.fillRect(Math.round(x/6)*6 - s/2, Math.round(y/6)*6 - s/2, s, s); };
  // bílý střed
  if (p < .35){ const r = 70*(1-p/.35)+20; for (let a=0;a<Math.PI*2;a+=Math.PI/10) for (let d=0; d<r; d+=12) sq(x0+Math.cos(a)*d, y0+Math.sin(a)*d, 12, "#ffffff"); }
  // dva rozpínající se kroužky
  for (const [del, col] of [[0,"#f4c34f"],[.18,"#ffffff"]]){
    const q = (p - del)/(1 - del); if (q < 0) continue;
    const r = 40 + 300*oc(q), n = Math.max(16, Math.round(r*2*Math.PI/18));
    cx.globalAlpha = 1 - q;
    for (let i=0;i<n;i++){ const a = i/n*Math.PI*2; sq(x0+Math.cos(a)*r, y0+Math.sin(a)*r, 12, col); }
  }
  // paprsky
  cx.globalAlpha = 1 - p;
  for (let k=0;k<8;k++){ const a = k*Math.PI/4 + .2; for (let d = 60 + 200*p; d < 130 + 260*p; d += 14) sq(x0+Math.cos(a)*d, y0+Math.sin(a)*d, 10, "#fff3c4"); }
  cx.restore();
}

// záblesk při spojení
export function flash(t){
  document.getElementById("flash").style.opacity = (t >= 20.62 && t < 20.72) ? (1 - (t-20.62)/.1)*.3 : 0;
}

// skryje všechny palivové efekty (výchozí stav každého snímku)
export function fuelOff(T, F){
  T.fuelDots.forEach(d=>d.visible=false); F.fDots.forEach(d=>d.visible=false); F.fTanks.forEach(K=>{ K.sh.visible = K.fl.visible = false; });
}
// S8: plnění nádrží + tečky v tyči (boom-local z .6→15.8) a ve stíhačce (zásuvka → nádrže po FPATHS)
export function fuelFlow(t, T, F){
  const fill = .15 + .85*cl((t-22)/2.8);
  F.fTanks.forEach(K => { K.sh.visible = K.fl.visible = true; K.fl.scale.z = Math.max(.02, K.l*fill); K.fl.position.z = K.z0 + .04 + K.l*fill/2; });
  T.fuelDots.forEach((d,i) => { d.visible = true; const u = ((i/T.fuelDots.length) + t*1.6) % 1; d.position.set(Math.sin(i*2.1)*.08, Math.cos(i*1.7)*.08, .6 + u*15.2); });
  F.fDots.forEach((d,i) => { d.visible = true; const path = F.FPATHS[i%4], u = ((Math.floor(i/4)/7) + t*1.1) % 1; d.position.copy(F.pathPt(path, u)); });
}
