# Kritika PRE-RENDER round 2 – tanker v3 (fresh gatekeeper)
Stills: the 20 SHOTLIST times + 7.65 and 17.45 (render.js crit2). References compared: 7c3d5329, 3e057703 (+ round-1 notes).

<!-- TABULKA -->
| ID | MUST/SHOULD/NICE | time | problem | concrete fix | file |
|---|---|---|---|---|---|
| M1 | MUST | S1 0.1–3.1, S2 3.35–5.35, S4 9.4–12.45 | The F-16 exhaust/contrail ribbon (`cm` tube, 0xf4f6fa, wob 1.5) renders as torn white paper flakes and snow chunks around and in front of the nozzle. At 3.35 it covers the nozzle itself and sprays to the left edge. It is the cheapest-looking thing in the hook and the S2 reveal: it reads as a glitch, not heat or condensation. | Hide the F-16 contrail tube in shots 1, 2 and 4 (an F-16 at this altitude/power doesn't need one), or start it ≥ 6 m behind the nozzle with wob ≤ .3 and alpha fading in over the first 3 m. Keep only `fHaze` (dark 0x6a6e78 shimmer) at the nozzle. Check 0.1, 3.35, 12.3 again: no white fragments within 2 nozzle diameters. | js/vfx.js |
| M2 | MUST | S6 16.2–18.7 | The boom nozzle (the hero end) sits in the right UI strip and caption zone. At 16.2 the tip is at ≈(960,1280). At 18.1 it is at ≈(1025,1400), cut by the right edge and touching "own little wings." | Shift the aim so the nozzle tip ends at x ≤ 880, y ≤ 1230 for the whole shot (probe every 0.1 s). For example, aim the screen point for RD 120 px left / 150 px up in both phase A and phase B, or r +1.5. | js/timeline.js |
| M3 | MUST | S7 18.73–19.6 | "The nozzle locks into a hatch…" is spoken while there is NO boom/nozzle in frame at 19.0. The frame is ≈55 % flat grey F-16 skin. The pilot and canopy are cut by the left edge (round-1 S2 not done). The beat is shown only after the words. | Pull back (r +25 %) and aim at the midpoint of the receptacle and the boom nozzle, so the descending boom is visible from 18.73. Receptacle at ≈(600,820), canopy fully in frame (aim x 580→640 as asked in round 1). | js/timeline.js |
| M4 | MUST | S3 5.45–9.3 | Known risk confirmed: NEAR_LAYOUT towers don't fit the new S3 camera. 5.6: no near tower, so y 1000–1920 (≈ 45 %) is a flat cloud deck. 7.65: a tower is a cut white blob at the left edge, under the caption. 9.1: a "stacked pancake" sprite tower (visible ellipse layers) at bottom left, toy-like. | Recompute NEAR_LAYOUT for the current S3 path (az 18→26°, r 95→91, y −27→−23). Place 2 towers in the bottom third at x 150–900, never under y 1300–1500 text and never cut. Use the softer tower texture (no visible stacked lobes) or scale y ×1.4 so the lobes merge. Probe 5.6/7.1/9.1. | js/env.js |
| M5 | MUST | S4 9.4–10.2 | The F-16 enters with its nozzle in the right UI strip (x ≈ 1000–1080, y ≈ 900–1200), cut by the edge (round-1 N2 not done). At 12.3 the haze/flakes still run into the edge. | Start `from.x` 1.5–2 m further left, or aim the shot 80 px to the left, so the whole jet incl. nozzle is inside x ≤ 930 from 9.4. The "slides in" travel stays ≥ 8 % (it is now ≈ 22 %). | js/timeline.js |
| S1 | SHOULD | S9 25.2–25.8 | The disconnect spray is a round white smoke ball at the receptacle (round-1 S5 not done). It doesn't read as fuel. | Bluish-white + a few yellowish drops, 2× count, a cone ~1.5 m down the airflow (+z), streaked particles, fade 0.8 s. | js/vfx.js |
| S2 | SHOULD | S5 12.45–15.55 | The operator is good (face, headset, gloves on the sticks). But the cutaway rim is still a thick white "plasticine" tube. At 15.4 the push-in lets the hull edge cut across the operator's face. The WINDOW leader ends on the outer skin stripes, not on a recognisable glass pane. | Rim thinner, hull colour + dark inner edge. End the push-in so the head stays clear of the rim. Make the window a dark-blue glass pane with a frame and sky reflection, leader end inside it. | js/tanker.js, js/timeline.js |
| S3 | SHOULD | S1 0.1–1.5 | Hook: the top 35 % is empty sky (round-1 S3 not done). | Distant tanker silhouette + 4 thin contrails high in the upper third, or sun with pixel rays. | js/env.js, js/timeline.js |
| S4 | SHOULD | S6 18.1 | The FLYING BOOM leader crosses the yellow tip of the vertical ruddevator before it ends on the shaft (it passes over a hero part). | Anchor further up the shaft (`V3(0,0,3.5)`), or plate at (790,250), so the line runs through sky only. | js/timeline.js |
| N1 | NICE | S8 21.7–24.95 | The background behind the x-ray is a blurry blue-white blob pattern (reads as camouflage). The x-ray itself is now good. | Darken/desaturate the background 20 % in S8 (focus on the hologram) or use a uniform cloud deck. | js/vfx.js / js/env.js |
| N2 | NICE | S10 31.0 | The ending is fine (4 equal trails from the nacelles, tanker ≈ 60 % width). The top 40 % is empty sky. | Slight tilt down at the end, or high cirrus. | js/timeline.js |

**Round-1 MUSTs verified:** M1 S6 whole boom: OK, hinge→nozzle diagonal at 16.2 (but see M2 framing). M2 ruddevators: OK, dark + yellow tips, LITTLE WINGS leader ends inside the vertical ruddevator. M3 x-ray: OK, vertical F-16, outlined, 3D orange tanks, dots boom→receptacle→tanks, FUEL 97 % at 24.7. M4 S3: OK, whole KC-135 at 7.65/9.1 (≈ 95 % width), but towers (M4 new). M5 S2 tangency: mostly OK, fin now left of the tanker fuselage; the heat haze is spoiled by the white flakes (M1 new). M6 S10: OK, trails from all 4 nacelles, tanker ≈ 60 % width at y≈860. Counters: SPEED 537 at 7.65, FUEL 97 % at 24.7, ~2.7 T/MIN ✓. Captions: yellow only on starred words ("boom," checked), nothing else yellow.

## Score: 7.5 / 10
A clear step up from 6.5. All six round-1 MUSTs are visibly addressed. The boom/ruddevator shot, the x-ray and the contact now tell their beats, the operator is a real person, and the palette and dither sit well next to the references. It still misses 8 for concrete, fixable reasons. The very first seconds (hook, S2 reveal) carry a glitchy white-confetti exhaust effect that looks cheap on a phone. "The nozzle locks" is spoken over a frame with no nozzle. The hero nozzle in S6 and the F-16 entry in S4 sit in the right UI strip. The S3 near towers were placed for the old camera, so 5.6 is empty and 9.1 shows a toy "pancake" cloud. None of this needs a redesign. M1–M5 are 1–3-parameter changes, and with them done this should pass.

## MUST (ranked by visual impact)

**1. White-flake F-16 exhaust (js/vfx.js).** Hook + S2 + S4. Hide the F-16 contrail tube in shots 1/2/4, or start it ≥ 6 m back with wob ≤ .3 and an alpha fade-in. Keep only the dark fHaze shimmer.

**2. S6 nozzle out of the UI strip/caption zone (js/timeline.js).** Nozzle tip ≤ x 880, ≤ y 1230 at every 0.1 s of 15.55–18.7.

**3. S7 show the nozzle when "locks" is said (js/timeline.js).** Pull back ~25 %, aim at the receptacle↔nozzle midpoint, boom visible from 18.73. Canopy/pilot not cut (aim x 640).

**4. S3 near towers for the current camera (js/env.js).** New NEAR_LAYOUT: 2 uncut towers in the bottom third, not under the caption, no stacked-ellipse look. Probe 5.6/7.1/9.1.

**5. S4 F-16 entry fully in frame, out of the UI strip (js/timeline.js).** from.x −1.5–2 m or aim −80 px, whole jet x ≤ 930 at 9.4.

GATE: FAIL
