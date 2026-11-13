// Shared geometry/material helpers + easing. Pure functions, no scene side effects.
import * as THREE from "../lib/three.module.js";

export const cl = (x,a=0,b=1)=>Math.min(b,Math.max(a,x));
export const P=(t,s,d)=>cl((t-s)/d), io=p=>p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2, oc=p=>1-Math.pow(1-p,3);

// matný standardní materiál (metalness ≤ .08, roughness ≥ .7)
export const LM = (c, o={}) => new THREE.MeshStandardMaterial({ color:c, roughness:.88, metalness:0, ...o, ...(o.metalness!==undefined ? { metalness:Math.min(o.metalness,.08), roughness:Math.max(o.roughness||.8,.7) } : {}) });

export function loft(secs, seg=24){
  // secs: [z, cy, rx, ry, cx?]
  const pos=[], idx=[];
  secs.forEach(([z,cy,rx,ry,cx=0]) => { for (let i=0;i<=seg;i++){ const a=i/seg*Math.PI*2; pos.push(cx+Math.cos(a)*rx, cy+Math.sin(a)*ry, z); } });
  for (let s=0;s<secs.length-1;s++) for (let i=0;i<seg;i++){ const a=s*(seg+1)+i, b=a+seg+1; idx.push(a,a+1,b, a+1,b+1,b); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos,3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
export function plan(pts, thick){ // tvar v rovině x–z (vodorovná plocha), tloušťka v y
  const s = new THREE.Shape(); s.moveTo(pts[0][0], -pts[0][1]); pts.slice(1).forEach(([x,z])=>s.lineTo(x,-z));
  const g = new THREE.ExtrudeGeometry(s, { depth:thick, bevelEnabled:true, bevelThickness:thick*.45, bevelSize:thick*.45, bevelSegments:2 });
  g.translate(0,0,-thick/2); g.rotateX(-Math.PI/2); return g;
}
export function side(pts, thick){ // tvar v rovině z–y (svislá plocha), tloušťka v x
  const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(([z,y])=>s.lineTo(z,y));
  const g = new THREE.ExtrudeGeometry(s, { depth:thick, bevelEnabled:true, bevelThickness:thick*.4, bevelSize:thick*.4, bevelSegments:2 });
  g.translate(0,0,-thick/2); g.rotateY(-Math.PI/2); return g; // shape x → world z, shape y → world y
}
export const mesh = (g, m, parent, x=0,y=0,z=0) => { const o = new THREE.Mesh(g, m); o.position.set(x,y,z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o; };
export function beam(m, a, b){ const d = new THREE.Vector3().subVectors(b,a); m.position.copy(a).addScaledVector(d,.5); m.scale.set(1,d.length(),1); m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), d.normalize()); }

// dvoubarevný nátěr (tmavší hřbet, světlejší břicho) + jemné opotřebení
export function toned(geo, top, bot, wear=.06){
  geo = geo.index ? geo : geo; if (!geo.attributes.normal) geo.computeVertexNormals();
  const P = geo.attributes.position, N = geo.attributes.normal, ct = new THREE.Color(top), cb = new THREE.Color(bot), col = [], c = new THREE.Color();
  for (let i=0;i<P.count;i++){
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i), k = cl((N.getY(i)+.15)/.55);
    const n = Math.sin(x*1.7+z*.93+y*.4)*Math.sin(z*.57-x*.8+y*2.1) + .5*Math.sin(z*2.3+x*3.1);
    c.copy(cb).lerp(ct, k).multiplyScalar(1 - wear*(n*.5+.5)); col.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); return geo;
}

// lokální bod objektu → svět
export const W = (obj, local) => obj.localToWorld(local.clone());
