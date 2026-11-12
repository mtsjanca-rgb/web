# tanker – module map
`scene.html` = CSS/DOM, renderer + dither post shader, wiring. Everything else in `js/` (ES modules, `THREE` from `../lib/three.module.js`).
Render: `node render.js <outdir> [t1,t2,…]` → `window.render(t)` per frame, `window.ready` after fonts + captions.

## Conventions
- Units metres, +y up. Both aircraft: **nose → −z**, tail → +z. Flight direction is −z; the world (clouds) scrolls +z at `SPEED` = 150 m/s.
- Tanker group sits at world origin (only a small bob/roll in `pose`). Fighter is positioned in tanker/world space by the timeline.
- Boom pivot: tanker-local `(0, −.45, 17.6)`; boom points along its local +z, `boom.rotation = (ang, yaw, 0)` (ang ≈ .2 stowed, .52 contact).
- Nozzle tip: boom-local z = 12.9 + ext (ext 0…3). `RECEPT` = fighter-local `(0, 1.02, −.6)` (receptacle on spine).
- `CONTACT_POS` = fighter position where RECEPT == nozzle tip at ang .52, ext 3 (computed once in timeline).
- **Determinism / ids:** build order in scene.html is env → tanker → fighter → ui → timeline. Object/material ids (opaque sort
  tiebreak) follow creation order; keep it, and keep the env RNG (`seed = 7`, Park–Miller) private to env.js.
  When rebuilding a model, any new material changes ids only inside that model – fine for new visuals, but not "identical".

## js/helpers.js
`cl, P(t,s,d), io, oc` easing · `LM(color, opts)` matte MeshStandardMaterial · `loft(secs,seg)` secs `[z,cy,rx,ry,cx?]`
· `plan(pts[x,z], thick)` horizontal plate · `side(pts[z,y], thick)` vertical plate · `mesh(geo,mat,parent,x,y,z)` (casts/receives shadow)
· `beam(mesh,a,b)` stretch Y-capsule between points · `toned(geo, topHex, botHex, wear)` vertex-colour two-tone · `W(obj, localVec)` → world.

## js/env.js – `buildEnv(scene)` →
`hemi, sun` (sun casts shadow, dir = exported `SUN_DIR`, follows target (0,−6,22)), `sky` (gradient + sun halo + cirrus; uniform `drift`),
`cloudMat`/`cloudSea` (cumulus deck: height-field ray-march, top y = −520, base −720, gaps show lower layer at −1700; uniforms `off`, `camPos`, `cov` coverage),
`puffs` group (now empty, kept for API) + `PUFFS[]`, `towers` (distant towering cumulus sprites), `nearTowers` (S3 only: mid/foreground cumulus towers below the tanker streaming +z at SPEED; layout `NEAR_LAYOUT` in env.js, laid out for the S3 camera at t 7.4), `update(t, cam, SPEED, shot)` (cloud offset, wrap, sun follow, **calls `vfxTick`**).
`scene.fog` (haze, 2.5–21 km) affects only cloud sprites. Post shader (scene.html): luma Bayer `L`=10 + chroma `CQ`=28, `SAT` 1.16, S-curve, warm highlights / cool shadows.

## js/tanker.js – `buildTanker(scene)` → (adds `tanker` to scene)
`tanker` group · `boom` group (pivot above) · `boomOuter` (mat swapped `boomMat`↔`boomX` x-ray in S8) · `boomInner`, `nozzle`, `nozzleTip` (Object3D)
· `rudds[2]` ruddevator groups at boom z 9.6 (rotation.x animated) · `fuelDots[34]` boom children (S8)
· `pod` (tanker-local (0,−1.15,15)) with `podHull` (mat reset to `tGrey`), `podCav`, `podWin` (window group), `podCut` (S5 cutaway, hidden by default)
· `op` operator group (+ `opParts`) · `NAV` blinking lights · materials `tGrey, tGreyD, tDark, glass, TVC, boomMat, boomX, fuelMat`
· `setBoom(ang, ext, yaw)`, `boomTipWorld(ang, ext)` → Vector3, `updateNav(t)`.
  v3 notes: static airframe is baked (merged per material) into a few meshes under an internal group; `boomOuter` geometry is in boom-local
  coords (mesh at boom origin, no rotation), `boomMat` uses vertex colours (stripes) – `boomX` swap still works; `boomInner`/`nozzle` geometry
  runs along +z (no mesh rotation), positions still set only by `setBoom` (tip = boom z 12.9 + ext, unchanged). `podHull` children = side windows
  (hidden with it in S5). `podCut` = far half of pod shell (double-sided, with window openings) + cut rim + consoles. `op` children live under
  `op` and a `head` sub-group; all op meshes have receiveShadow = false (lit inside the cutaway). No new handles.
  v3.1 (modeler fix): ruddevators rebuilt (dark 0x3a3f48, yellow tip band, light LE, hinge gap, root fairing + hinge cover); span .3→2.1 m,
  chord 1.15→.74. Centre of area of a ruddevator ≈ rudds[i]-local `V3(∓1.15, 0, .17)` (rudds[0] is the −x one → `V3(-1.15,0,.17)`).
  Pod window is now a hull-conforming patch (z 1.0–1.5, −90°±34°, flush): `podWin` keeps its old transform (leader anchor unchanged),
  `podCav` = dark window frame (Mesh + child strips, identity transform). Cutaway rim = thin aluminium cut face + dark inner line + ribs.

## js/fighter.js – `buildFighter(scene)` → (adds `fighter` to scene)
`fighter` group · `recDoor` (hinge at (0,1.02,−.91), rotation.x 0→1.9 open) · `RECEPT` · `fTanks[{sh,fl,z0,l}]` x-ray tanks
· `fDots[28]` + `FPATHS[4]` (fighter-local paths RECEPT → tanks) + `pathPt(path,u)` · `fSkin`, `fXray`, `fighterXray(on)`.
`fSkin` is collected at build time (all meshes except tanks/dots) – add new skin meshes before that traverse.
v3.1 x-ray: `fTanks[i] = { sh, fl, z0, l, center }` – `sh` is a Group (dark interior + liquid + bright outline) at the real F-16 tank places
(F-1/F-2 forward fuselage, A-1 aft fuselage, 2 wing integral tanks, 2 × 370-gal). **`setFuel(p)`** (0..1) sets the level and shows the tanks
(vfx.fuelFlow calls it; fuelOff hides them each frame). The level plane rises from aft-bottom (axis (0,1,−.85)), wobbles slightly; legacy
`fl.scale.z` (= fill) still works. `fXray` = fresnel ghost (2 tones); `fXlines[]` = depth-prepass + opaque outline clones toggled by `fighterXray`.
`fDots` now have depthTest off. `FPATHS` end inside the tanks (wing paths end at (±1.6,0,.9)).
New (v3 model): `canopy` (gold glass mesh) · `pilot` group (child of the ejection-seat group, reclined) · `NOZZLE` = fighter-local nozzle exit
`(0, 0, 7.55)` (use for heat haze / exhaust VFX) · `fLights[]` formation strips + nav lights (MeshBasic) · `fDecals[]` insignia / tail band
(hidden by `fighterXray(true)`). Geometry: nose tip z −7.62 (pitot to −8.1), wingtip AIM-9 at x ±4.7, 370-gal tanks at x ±2.15, AIM-120 at x ±3.65.

## js/vfx.js
UI: `contactBurst(cx, t, R)` small pixel flare + thin ring at R (20.62–21.1) · `flash(t)` subtle #flash · `fuelOff(T,F)` / `fuelFlow(t,T,F)` S8.
Constants `CONTACT_T = 20.62`, `DISCONNECT_T = 25.2`.
3D: `vfxInit(T, F)` builds engine heat haze (4 tanker engines + F-16 nozzle), contrails, contact core/ring/sparks/fuel mist, disconnect spray + droplets,
sun glints (canopy, boom nozzle). `vfxTick(t, cam, shot)` animates them. **Already auto-wired**: `fuelOff` lazily calls `vfxInit`, `env.update` calls `vfxTick` –
the timeline needs no change. Per-shot strengths in exported `VFX` (`VFX.contrail[shot]` tanker contrails: S3 .35, S10 1; `VFX.fContrail[shot]` F-16 S9 .55;
`VFX.haze`; `VFX.glint[shot]` 0 in S5/S8). Contact effects only render in shot 7, disconnect only in shot 9.
v3 fix: contrails start 12 m behind each of the 4 CFM56 exits (analytic positions; `T.exhausts` used if present), widen 0.3→4.2 m, wobble, break up and fade (also fade within ~75 m of the camera). F-16 haze amp .9, light shimmer 0x6a6e78, Ø ≥ 1.2× nozzle (`F.NOZZLE`). S8: `fuelFill(t)` (= FUEL % plate curve) → `F.setFuel(p)` if present, else fTanks scaling; glowing amber stream (additive points, no depth test) boom → nozzle → RECEPT → `FPATHS` (computed in vfxTick). Disconnect: ~0.35 s fuel-mist burst + drops from the nozzle, swept back, gone by ~1.2 s.
Optional handles used if present: `T.exhausts` (Object3D[] at engine exits, else found by exhaust-cone geometry / analytic fallback), `F.nozzleExit` (Vector3, fighter-local; default (0,−.05,8)).

### TODO for cameraman
- Nothing mandatory. To tune: `import { VFX } from "./vfx.js"` and set e.g. `VFX.contrail[9] = .5` (tanker trails pass over the S9 camera, so 0 now).
- S10: contrails read best when the camera stays behind/above the engines (current path is fine).

## js/ui.js – `buildUI(cam)` →
`cx` (2D ctx of #ui 1080×1920) · `plate(lines, x, y, alpha, anchor[x,y]|null, {size, blinkIdx, blinkOff, allYellow})`
· `proj(worldVec)` → [x,y] UI px · `clear()` · `loadLines()` (lines.json) · `setCaption(t)` · `W`.

## js/timeline.js – `createTimeline(cam, T, F, U)` → `{ pose(t)→shot, scenePose, drawUI(t, shot), aim, CONTACT_POS }`; also `SPEED`.
`aim(target, px, py)` puts a world point at UI pixel (px,py). Handles used by name: see destructuring at top of file.

| shot | time (s) | content | plate(s) |
|---|---|---|---|
| S1 | 0 – 3.25 | F-16 alone (hook) | FUEL LOW (0.5) |
| S2 | 3.25 – 5.45 | tanker revealed above | TANKER (3.6) |
| S3 | 5.45 – 9.3 | KC-135, speed | KC-135 (5.9), SPEED (6.5) |
| S4 | 9.3 – 12.45 | F-16 moves under tail, boom lowers | F-16 RECEIVER (9.7) |
| S5 | 12.45 – 15.55 | operator in pod (cutaway) | BOOM OPERATOR (12.9), WINDOW (14.2) |
| S6 | 15.55 – 18.7 | boom + ruddevators | FLYING BOOM (16.0) |
| S7 | 18.7 – 21.7 | door opens 18.9, boom extends 19.7, contact 20.62 | RECEPTACLE (19.1) + burst |
| S8 | 21.7 – 24.95 | fuel x-ray | FUEL FLOW (22.2), FUEL % (22.4) |
| S9 | 24.95 – 28.0 | disconnect 25.2, drop 25.5, door closes 26.4 | FUEL FULL (26.4) |
| S10 | 28.0 – 31.6 | tanker flies on | – |
