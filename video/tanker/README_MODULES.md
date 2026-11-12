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
`hemi, sun` (sun casts shadow, follows target (0,−6,22)), `sky` (sphere shader), `cloudMat`/`cloudSea` (y = −650, uniforms `off`, `camPos`),
`puffs` group + `PUFFS[{g,z0}]`, `update(t, cam, SPEED, shot)` (cloud offset, puff wrap ±3000, sun follow).

## js/tanker.js – `buildTanker(scene)` → (adds `tanker` to scene)
`tanker` group · `boom` group (pivot above) · `boomOuter` (mat swapped `boomMat`↔`boomX` x-ray in S8) · `boomInner`, `nozzle`, `nozzleTip` (Object3D)
· `rudds[2]` ruddevator groups at boom z 9.6 (rotation.x animated) · `fuelDots[34]` boom children (S8)
· `pod` (tanker-local (0,−1.15,15)) with `podHull` (mat reset to `tGrey`), `podCav`, `podWin` (window group), `podCut` (S5 cutaway, hidden by default)
· `op` operator group (+ `opParts`) · `NAV` blinking lights · materials `tGrey, tGreyD, tDark, glass, TVC, boomMat, boomX, fuelMat`
· `setBoom(ang, ext, yaw)`, `boomTipWorld(ang, ext)` → Vector3, `updateNav(t)`.

## js/fighter.js – `buildFighter(scene)` → (adds `fighter` to scene)
`fighter` group · `recDoor` (hinge at (0,1.02,−.91), rotation.x 0→1.9 open) · `RECEPT` · `fTanks[{sh,fl,z0,l}]` x-ray tanks
· `fDots[28]` + `FPATHS[4]` (fighter-local paths RECEPT → tanks) + `pathPt(path,u)` · `fSkin`, `fXray`, `fighterXray(on)`.
`fSkin` is collected at build time (all meshes except tanks/dots) – add new skin meshes before that traverse.

## js/vfx.js
`contactBurst(cx, t, R)` UI-layer burst at screen point R (20.62–21.22) · `flash(t)` #flash 20.62–20.72
· `fuelOff(T, F)` / `fuelFlow(t, T, F)` S8 tank fill (15→100 %, 22.0–24.8) and dots · `CONTACT_T = 20.62`.

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
