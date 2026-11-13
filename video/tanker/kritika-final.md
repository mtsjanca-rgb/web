# Final critique – tanker_v3.mp4 (rendered video, in motion)

Checked: 1080x1920, 30 fps, 31.6 s, h264 + aac. I viewed 11 contact sheets and crops that cover every cut and every event. I also ran frame-diff stats on every frame, scene detection and ebur128.

## Measurements
- **Scene changes (thr 0.12):** 3.27, 5.47, 9.30, 12.47, 15.57, 18.70, 21.70, 24.97, 28.00.
  - These are exactly the 9 cuts in SHOTLIST.md (±1 frame).
  - No other spikes, so no pops or glitches between the cuts.
- **Frame-diff, non-cut frames above 5:**
  - S6B orbit 17.3–18.4: mean diff ≈ 8. A smooth, deliberate push (rotation ≤ 22°/s).
  - S7 reframe 19.8–20.2: ≈ 7.
  - Contact burst at 20.63: 15.
  - All of these are intended motion or VFX. Strips at 30 fps show even steps.
  - No duplicate or frozen frames: no frame-diff below 0.3 anywhere.
- **Dither:** the sky/static-region diff is 0.5–2.4 / 255 between frames.
  - The 1:1 crop of the S10 tanker shows a screen-locked pattern.
  - No crawl and no shimmer on the thin wings or fin.
- **Audio:**
  - Integrated loudness −14.1 LUFS, true peak −1.4 dBFS, LRA 1.5 LU.
  - The video's audio track equals mix.wav: the residual is −55.8 dB mean.
  - voice.wav silences match lines.json to ±10 ms.
  - The mix is about 6–7 dB louder during speech than in the gaps (−16 vs −23 dB), so the narration is present and on top.
- **Captions:**
  - Each line appears at its lines.json start, within 1 frame.
  - Only starred words are yellow ("landing?", "with you.", "five hundred", "below its tail", "window.", "three tonnes", "Full.", "flying.").
  - All plates fade in on cue: FUEL LOW 0.5 (blinking), TANKER 3.95, KC-135/SPEED 5.8/6.0 counting 320→537, F-16 RECEIVER 9.7, BOOM OPERATOR 13.0, WINDOW 14.5, FLYING BOOM 16.2, LITTLE WINGS 17.45, RECEPTACLE 19.5, FUEL FLOW / FUEL % 22.2/22.4, FUEL FULL 26.85.
- **Pre-gate M1 (S9 jet out of frame):** fixed. The jet stays at x ≤ ~880 through 28.0.

<!-- TABULKA -->
| ID | Priority | Time | Problem | Fix | Owner file |
|---|---|---|---|---|---|
| S1 | SHOULD | 3.4–4.7 | In S2 the F-16 tail and nozzle sit at y ≈ 1200–1440, so the "You bring the gas station with you." captions are drawn across its belly and nozzle. The text is legible because of the dark nozzle and the shadow, but the hero is in the caption zone, against the shotlist rule. | Raise the S2 aim or crane so the F-16 nozzle is at y ≤ 1250 (for example, aim py −120 px, or more crane height). | js/timeline.js |
| S2 | SHOULD | 9.9–11.9 | The caption "just meters below its tail." wraps and leaves an orphan "tail." on line 2. This is the only two-line caption. | Balance the wrap, or allow a slightly wider max width so the line stays on one line. | js/ui.js (caption, not in the owner list; or line text in js/timeline.js) |
| S3 | SHOULD | 19.6–21.7 | S7 contact close-up: the canopy glass is missing, so the pilot sits in an open cockpit next to the boom. This carries over from the gate review and is clearer in motion over the 2 s close-up. | Add a transparent canopy shell (opacity 0.25–0.35 with a rim highlight). | js/fighter.js |
| N1 | NICE | 22.4 | The FUEL % plate fades in already showing 31 % (the counter starts at t = 22 with the plate at 22.4). The 15 % start is never readable. | Start the counter at the plate time: use `(t-22.4)/2.4`. | js/timeline.js |
| N2 | NICE | 17.9–18.65 | The FLYING BOOM leader crosses the yellow ruddevator tip during the S6B orbit, which clutters the "little wings" moment. | Move the leader anchor further up the shaft, or put the plate higher. | js/timeline.js |
| N3 | NICE | 29.95–31.6 | 1.6 s tail with no caption and a −24 dB bed: the ending idles a little. | Trim to ~31.0 s, or swell or button the music on the last beat. | sound.py / js/timeline.js |
| N4 | NICE | 1.7–3.25 | A single small cumulus tower slides in from the left under the F-16 in the hook. It is isolated and cotton-ball-like, and it competes with the jet. | Remove it or push it further back. | js/env.js |
| N5 | NICE | 5.6–9.3 | The S3 cumulus towers still look like soft cotton balls next to the crisp KC-135 (gate note, unchanged). | Add more noise displacement and flatter bases. | js/env.js |

## Score: 8.2 / 10
In motion the film is cleaner than the stills suggested:
- Every cut is exactly where the shotlist puts it.
- There is not a single unplanned pop, duplicate frame, plate flash or dither crawl.
- Camera moves are smooth, including the fastest S6B orbit.
- Captions, highlights and every plate land on the spoken word.
- The contact burst at 20.62 and FUEL FULL on "Full." are frame-accurate.
- The audio hits −14.1 LUFS with the narration clearly on top.

The cut rhythm (~3 s per shot) suits shorts. The S6 boom, the S8 x-ray fill and the 4-contrail pull-back carry well in motion.

It loses points for three things:
- the caption sitting on the F-16 throughout S2;
- the canopy-less contact close-up;
- one orphan caption wrap.

None of these breaks comprehension or reads as a glitch. That makes the film premium enough to post, but they are what keep it from 8.5+.

No MUST.

VERDICT: SHIP
