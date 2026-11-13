// 2D UI layer (#ui canvas 1080×1920): label plates with leader lines, 3D→screen projection, word captions (#cap).
import { W } from "./helpers.js";

export function buildUI(cam){
const ui = document.getElementById("ui"), cx = ui.getContext("2d");
function plate(lines, x, y, a=1, anchor=null, opt={}){
  if (a <= 0) return;
  cx.save(); cx.globalAlpha = a;
  cx.font = `${opt.size||80}px Jersey10`;
  const lh = (opt.size||80)*.92, padX = 30, padY = 16;
  const w = Math.max(...lines.map(l => cx.measureText(l).width)) + padX*2, h = lines.length*lh + padY*2;
  const X = Math.round(x - w/2), Y = Math.round(y);
  if (anchor && !(anchor[0] > 30 && anchor[0] < 1050 && anchor[1] > 150 && anchor[1] < 1750)) anchor = null;
  if (anchor){
    const [ax, ay] = anchor, sx0 = X + w/2, sy0 = (ay > Y + h/2) ? Y + h : Y;
    const n = Math.hypot(ax - sx0, ay - sy0), step = 12;
    cx.fillStyle = "#f4c34f";
    for (let d = 6; d < n - 4; d += step){ const k = d/n; cx.fillRect(Math.round((sx0 + (ax-sx0)*k)/3)*3-3, Math.round((sy0 + (ay-sy0)*k)/3)*3-3, 6, 6); }
    cx.fillRect(Math.round(ax/3)*3-6, Math.round(ay/3)*3-6, 12, 12);
  }
  cx.fillStyle = "#070b14"; cx.fillRect(X-6, Y-6, w+12, h+12);
  cx.fillStyle = "#33405c"; cx.fillRect(X-3, Y-3, w+6, h+6);
  cx.fillStyle = "#0e1526"; cx.fillRect(X, Y, w, h);
  cx.fillStyle = "rgba(255,255,255,.035)"; for (let yy=Y; yy<Y+h; yy+=6) cx.fillRect(X, yy, w, 3);
  cx.textBaseline = "top"; cx.textAlign = "center";
  lines.forEach((l,i) => { cx.fillStyle = (lines.length>1 && i===0) || opt.allYellow ? "#f4c34f" : "#eef2f8"; if (opt.blinkIdx===i && opt.blinkOff) cx.fillStyle="#5a4a20"; cx.fillText(l, X + w/2, Y + padY + i*lh + 2); });
  cx.restore();
}
function proj(v){ const p = v.clone().project(cam); return [ (p.x*.5+.5)*1080, (-p.y*.5+.5)*1920 ]; }
function clear(){ cx.clearRect(0,0,1080,1920); }

let LINES = [], CHUNKS = [];
async function loadLines(){
  LINES = await (await fetch("lines.json")).json();
  for (const L of LINES){
    const words = L.line.split(" "); const lens = words.map(w => w.replace(/\*/g,"").length + 1.5); const tot = lens.reduce((a,b)=>a+b,0);
    let inStar = false;
    const keyF = words.map(w => { const st = w.startsWith("*"); const en = /\*[.,?!]*$/.test(w) && w.replace(/^\*/,"").includes("*"); const k = inStar || st; if (st && !en) inStar = true; if (en) inStar = false; return k; });
    let t = L.start; const wt = words.map((w,i) => { const s = t; t += (L.end - L.start) * lens[i]/tot; return { w: w.replace(/\*/g,""), key: keyF[i], s, e: t }; });
    // chunky po 1–3 slovech, klíčové slovo končí chunk
    let cur = [];
    wt.forEach((x,i) => { cur.push(x); const endPunct = /[.,?!]$/.test(x.w); const keyEnd = x.key && !(wt[i+1] && wt[i+1].key); if ((cur.length>=3 && !(x.key && wt[i+1] && wt[i+1].key)) || endPunct || keyEnd || i===wt.length-1){ CHUNKS.push(cur); cur=[]; } });
  }
}
const capEl = document.getElementById("cap");
function setCaption(t){
  const c = CHUNKS.find((ch, i) => t >= ch[0].s - .02 && t < (CHUNKS[i+1] && CHUNKS[i+1][0].s - ch[ch.length-1].e < .5 ? CHUNKS[i+1][0].s - .02 : ch[ch.length-1].e + .35));
  if (!c){ capEl.innerHTML = ""; return; }
  capEl.innerHTML = c.map(x => `<span class="${x.key ? "hl" : ""}">${x.w}</span>`).join(" ");
}
return { cx, plate, proj, clear, loadLines, setCaption, W };
}
