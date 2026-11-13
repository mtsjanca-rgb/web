# Kritika PRE-RENDER round 3 – tanker v3 (fresh gatekeeper)
Stills: all SHOTLIST times + 7.65, 19.0, 25.6 (render.js crit3), extra 1.0/26.3/26.85/27.4/27.95 for S9. References: 7c3d5329 (+ round-2 notes). Full-res crops checked: S1 hook, S5 operator/window, S7 19.0/20.62, S9 disconnect, S3/S4 composition.

<!-- TABULKA -->
| ID | MUST/SHOULD/NICE | time | problem | concrete fix | file |
|---|---|---|---|---|---|
| M1 | MUST | S9 26.8–28.0 | On the payoff word "*Full*", the F-16 nozzle and right stabilizer run into the right edge. The nozzle is at x ≈ 1060–1080, y ≈ 1080–1180, so it is cut and inside the UI strip (x>950, y 820–1490). At 27.8 the nozzle is clearly cut. The jet drifts right because `off = V3(drop*1, …)` and the camera follows only 30 %. | Make the lateral drift `V3(-drop*0.5, -drop*7.5, drop*1.5)`, or move the S9 aim px from 540 to ≈ 460. Probe 26.0–28.0 every 0.1 s: the whole jet, nozzle included, stays at x ≤ 930. FUEL FULL plate (760,280) stays clear. | js/timeline.js |
| S1 | SHOULD | S1 2.6–3.25 | A distant cumulus tower rises directly under the F-16 nozzle/intake at (≈700,1000–1120). With FUEL LOW on screen it reads as a smoke plume from the jet (damage), not as cloud. | Move or drop that far tower in the S1 layout, or shift it ≥ 250 px sideways from the jet silhouette. | js/env.js |
| S2 | SHOULD | S3 5.45–9.3 | The near towers now fit the camera and aren't cut under captions (round-2 M4 mostly fixed). But they are stacked round "cotton-ball" lobes (Michelin look) and fill ≈ 40 % of the frame at 5.6/7.65. They are the most toy-like surface in the film. | Flatten the lobe shading (less rim highlight per lobe), merge the lobes (scale y ×1.3 or fewer, larger lobes), add a softer dither-haze base so they sink into the deck. | js/env.js |
| S3 | SHOULD | S7 20.62 | At the contact burst the canopy and pilot are cut by the left edge (only the back of the pilot is visible). Missiles and wing sit in the caption band (y 1300–1500). The beat itself (nozzle + flash in the receptacle, RECEPTACLE leader on the flash) reads well. | Ease the push-in so the aim settles ≈ 80 px further right (receptacle at px 720), so the canopy stays in frame. Or stop the push at 85 %. | js/timeline.js |
| S4 | SHOULD | S4 9.3–9.6 | The F-16 right wingtip missile still touches x ≈ 985 at y ≈ 1160 (UI strip) at 9.4. The nozzle is OK (x ≈ 880). | Move from.x a further 0.5 m left, or aim −30 px for the first 0.5 s. | js/timeline.js |
| S5 | SHOULD | S5 12.6–15.4 | The operator is good: face, headset, helmet, glove on the stick, lying prone. But the hull edge still crosses his forearm and hand. The WINDOW leader ends on the outer lower skin (blue glass with stripes). It reads as glass only on second look. | End the leader at the inner window frame visible at upper right (≈ 900,620 at 15.4), or give the lower pane a visible frame and a darker sky reflection. | js/timeline.js / js/tanker.js |
| N1 | NICE | S8 21.7–24.95 | The background behind the x-ray is still a blotchy blue-white camouflage pattern. | Desaturate/darken the background 20 % in S8. | js/vfx.js |
| N2 | NICE | S10 28–31.6 | The top 35–40 % is plain sky with faint cirrus. The ending works (4 contrails, tanker ≈ 60 % width). | Slight tilt down at the end or one more cirrus band. | js/timeline.js |

**Round-2 MUSTs verified:**
- **M1 white exhaust flakes:** FIXED. There are no white fragments at 0.1/1.5/3.1/3.35/9.4/12.3; the nozzle reads as a dark metal can.
- **M2 S6 nozzle:** FIXED. The tip is at ≈(820,1140) at 16.2 and ≈(800,1060–1080) at 17.45/18.1, out of the UI strip and the caption.
- **M3 S7 19.0:** FIXED. Boom with nozzle top-left, open hatch with frame, whole canopy and pilot in frame while "The nozzle locks" is spoken.
- **M4 S3 towers:** FIXED for placement (uncut, bottom third, not under the text at 5.6/7.65/9.1); the look is SHOULD S2.
- **M5 S4 entry:** FIXED for the nozzle (x ≈ 880); a 35 px wingtip touch remains (S4).

**Round-2 SHOULDs:**
- Disconnect spray is now a thin streaked vapor trail off the nozzle along the airflow at 25.6. It reads as fuel mist: OK.
- Pod rim is now dark and thinner: OK. The window is improved but still weak (S5).
- Hook upper sky is now filled with streaked cirrus: OK.
- FLYING BOOM leader runs through sky to the shaft: OK.

**Counters/captions:**
- SPEED 537 KM/H at 7.65 ✓.
- FUEL 97 % + ~2.7 T/MIN at 24.7 ✓.
- FUEL FULL appears on "Full." (26.85) ✓.
- Yellow only on starred words ("boom,", "Full.") ✓.

## Score: 8.0 / 10
All five round-2 MUSTs are visibly fixed, and the film now reads as a coherent premium dither explainer:
- The hook has a clean, well-lit F-16 with a visible pilot over a cirrus sky and a cloud deck, with no glitch effects.
- The S2 "gas station with you" reveal and the S3 planform read instantly.
- The S5 operator is a real person, not a mannequin.
- The S6 boom with its yellow-tipped ruddevators is the strongest shot.
- S7 now shows nozzle, hatch and pilot exactly when "locks" is spoken, and the contact flash lands in the receptacle.
- The x-ray fuel beat and the 4-contrail ending both land.
- Plates, leaders and counters are correct.

What keeps it from higher than 8:
- the cotton-ball S3 towers;
- a cut canopy at contact;
- the window is only so-so;
- one real composition error: the F-16 nozzle drifts out of frame into the UI strip on the payoff "Full."

M1 is a one-line change (lateral drift sign or aim px) with no knock-on effects. Apply it and probe S9 before the full render; no re-review is needed if the probe shows x ≤ 930.

## MUST (ranked by visual impact)

**1. S9 F-16 drifts out the right edge on "Full." (js/timeline.js).**
- At 26.8–28.0 the nozzle is at x ≈ 1060–1080 (cut, in the UI strip).
- Change the S9 `off` x from `drop*1` to `-drop*0.5`, or aim px 540 → 460.
- Probe 26.0–28.0 every 0.1 s: whole jet x ≤ 930, out of y 1300–1500 text.

GATE: PASS (conditional on M1, a single-parameter fix verified by a probe)
