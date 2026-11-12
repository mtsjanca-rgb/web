// Environment: lights, sky, cloud sea, cloud puffs. Owns its own seeded RNG (seed 7).
import * as THREE from "../lib/three.module.js";

export function buildEnv(scene){
const hemi = new THREE.HemisphereLight(0xbfd8ff, 0xe8eef6, 1.6); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff3e2, 3.2); sun.position.set(-60, 90, -40);
sun.castShadow = true; sun.shadow.mapSize.set(2048,2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
Object.assign(sun.shadow.camera, { left:-40, right:40, top:40, bottom:-40, near:1, far:300 });
scene.add(sun); scene.add(sun.target);

let seed = 7; const rnd = () => (seed = (seed*16807)%2147483647)/2147483647;

// obloha
const sky = new THREE.Mesh(new THREE.SphereGeometry(20000, 32, 16), new THREE.ShaderMaterial({
  side:THREE.BackSide, depthWrite:false,
  uniforms:{ sunDir:{ value:new THREE.Vector3(-.55,.62,-.56).normalize() } },
  vertexShader:`varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader:`uniform vec3 sunDir; varying vec3 vP; void main(){ vec3 d=normalize(vP); float h=d.y;
    vec3 top=vec3(.07,.24,.62), mid=vec3(.28,.52,.88), hor=vec3(.80,.89,.98);
    vec3 c = mix(hor, mix(mid, top, smoothstep(.08,.55,h)), smoothstep(-.02,.1,h));
    float s = max(dot(d,sunDir),0.); c += vec3(1.,.95,.85)*(pow(s,900.)*2.5 + pow(s,40.)*.22);
    gl_FragColor=vec4(pow(c,vec3(2.2)),1.); }`
}));
scene.add(sky);

// moře mraků (posouvá se → rychlost)
const cloudMat = new THREE.ShaderMaterial({
  uniforms:{ off:{value:0}, camPos:{value:new THREE.Vector3()} },
  vertexShader:`varying vec3 wP; void main(){ vec4 w=modelMatrix*vec4(position,1.); wP=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader:`uniform float off; uniform vec3 camPos; varying vec3 wP;
    float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
    float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*n(p); p=p*2.03+vec2(17.,9.); a*=.5; } return s; }
    void main(){
      vec2 p = (wP.xz + vec2(0., -off)) * .0016;
      float d = fbm(p), d2 = fbm(p + vec2(.012,.018));
      float shade = clamp((d - d2)*9. + .55, 0., 1.);
      vec3 shadow=vec3(.55,.66,.84), lit=vec3(.97,.98,1.), gap=vec3(.32,.46,.70);
      vec3 c = mix(shadow, lit, shade);
      c = mix(gap, c, smoothstep(.36,.5,d));
      float dist = length(wP.xz - camPos.xz);
      c = mix(c, vec3(.80,.89,.98), smoothstep(2500.,14000.,dist));
      gl_FragColor = vec4(pow(c,vec3(2.2)),1.);
    }`
});
const cloudSea = new THREE.Mesh(new THREE.PlaneGeometry(40000,40000,1,1), cloudMat);
cloudSea.rotation.x = -Math.PI/2; cloudSea.position.y = -650; scene.add(cloudSea);

// kupovité mraky (bližší, pro paralaxu)
const puffs = new THREE.Group(); scene.add(puffs);
function cloudTex(){
  // plochý kupovitý mrak: tvrdý okraj (alphaTest), bílý vršek, modrošedá spodní část
  const c = document.createElement("canvas"); c.width = 256; c.height = 128; const g = c.getContext("2d");
  g.fillStyle = "#fff";
  for (let i=0;i<9;i++){ const x = 40 + rnd()*176, y = 64 + rnd()*26, R = 18 + rnd()*26 * (1 - Math.abs(x-128)/160); g.beginPath(); g.arc(x, y - R*.35, R, 0, Math.PI*2); g.fill(); }
  g.fillRect(34, 76, 188, 22);
  g.globalCompositeOperation = "source-atop";
  const gr = g.createLinearGradient(0, 20, 0, 100); gr.addColorStop(0, "#ffffff"); gr.addColorStop(.5, "#f2f6fb"); gr.addColorStop(.78, "#c9d6e8"); gr.addColorStop(1, "#9fb3cf");
  g.fillStyle = gr; g.fillRect(0,0,256,128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; return t;
}
const CT = [cloudTex(), cloudTex(), cloudTex(), cloudTex()];
const PUFFS = [];
function puff(size){
  const g = new THREE.Group(); const n = 1 + Math.floor(rnd()*2);
  for (let k=0;k<n;k++){
    const m = new THREE.SpriteMaterial({ map:CT[Math.floor(rnd()*4)], transparent:false, alphaTest:.5, depthWrite:true, fog:false });
    const s = new THREE.Sprite(m); const sc = size*(.8+rnd()*.5); s.scale.set(sc*2.4, sc*1.2, 1);
    s.position.set((rnd()-.5)*size*1.6, k*size*.25, (rnd()-.5)*size*1.2); g.add(s);
  }
  return g;
}
for (let i=0;i<46;i++){
  const g = puff(70+rnd()*110);
  const x = (rnd()-.5)*3400, z = (rnd()-.5)*6000, y = -600 + rnd()*60;
  g.position.set(x,y,z); puffs.add(g); PUFFS.push({ g, z0:z });
}
for (let i=0;i<14;i++){
  const g = new THREE.Group(), base = 420+rnd()*320;
  for (let k=0;k<3;k++){ const p = puff(base*(1-k*.18)); p.position.set((rnd()-.5)*base*.5, k*base*.3, 0); g.add(p); }
  const a = rnd()*Math.PI*2; g.position.set(Math.cos(a)*9000, -640, Math.sin(a)*9000); scene.add(g);
}

  function update(t, cam, SPEED, shot){
    // svět ubíhá dozadu
    cloudMat.uniforms.off.value = t * SPEED;
    PUFFS.forEach(p => { let z = p.z0 + t*SPEED; z = ((z + 3000) % 6000 + 6000) % 6000 - 3000; p.g.position.z = z; });
    cloudMat.uniforms.camPos.value.copy(cam.position);
    sun.target.position.set(0,-6,22); sun.position.set(-60, 90, -40).add(sun.target.position);
    if (shot === 10){ sun.shadow.camera.left = sun.shadow.camera.bottom = -40; }
  }
  return { hemi, sun, sky, cloudMat, cloudSea, puffs, PUFFS, update };
}
