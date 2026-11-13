# NOTES v2 – tanker
Výstup: tanker_v2.mp4 (39 MB, 31.6 s), náhled snimky/00-prehled.jpg. Pipeline beze změny (render.js → sound.py → ffmpeg); časy událostí 20.62 / 25.2 beze změny, sound.py jen znovu spuštěn.

Změny v2 (scene.html):
- Dither: řetězec 720×1280 → box 360×640 → Bayer 4×4 → ×3 zachován, kvantizace 18 → 6 úrovní/kanál (uniform `L`), +12 % saturace. Materiály bez metalness (LM clamp ≤0.08, roughness ≥0.7), tyč/pod matné. Mraky: plochý sprite s tvrdým okrajem (alphaTest), bílý vršek / modrošedý spodek, méně a širší.
- Helper `aim(target, px, py)` – kamera umístí bod na danou pixelovou pozici (S1, S5, S7–S10).
- S7: receptacle na y≈790, štítek vpravo nahoře, pixelový burst (2 kroužky + paprsky + bílý střed) v UI na promítnutém bodě 20.62–21.2.
- S8: pohled zezadu-shora, F-16 jako tmavomodrý rentgen, 4 nádrže (2 trup, 2 křídla) se plní zepředu dozadu synchronně s FUEL % (15→100), tečky tečou tyčí a dál ze zásuvky do nádrží. Štítek ~2.7 T/MIN, leader na trysku; FUEL % leader na pravou křídelní nádrž.
- S5: řez podem (tmavá stěna/podlaha, světlá hrana řezu), ležící postava (lehátko, trup, nohy, paže na pákách, bílá helma s hledím), okno se světlým rámem + štítek WINDOW (14.2).
- F-16: dvoubarevný nátěr + opotřebení (vertex colors), zlatavý průhledný překryt s vanou, sedadlem a helmou pilota, chin intake s tmavým otvorem a světlým břitem, širší LERX, AIM-9 (větší, žlutý pruh), tmavší radom, lamely trysky; švy-prstence odstraněny.
- KC-135: okna kokpitu na povrchu nosu, hustší řada oken, poziční světla (červ./zel.), blikající stroboskopy a majáky, vertex-color opotřebení.
- Titulky: žlutě jen *hvězdičkované* fráze (víceslovné správně), ostatní bílé.
- S9: menší pád, kamera jede za stíhačkou, FUEL FULL leader na kabinu. S10 tanker blíž. S4 kamera jede až do 12.45. Štítky 80 px, leader se nekreslí, když kotva leží mimo rám.

Slabá místa:
- Postava operátora je pořád z kapslí (čitelná silueta, ne detail); okno je vidět spíš z hrany.
- S7 začátek (18.7–19.6): tyč je částečně mimo rám vlevo nahoře, dokud se nesníží.
- S6 beze změny (detail tyče, opakuje se trochu pohled S8).
- Bez slunce/kondenzačních stop (SHOULD S6), bez stínu stíhačky na tankeru.
- Dither na hladkých šedých plochách letadel je jemnější než v referenci (6 úrovní); 5 úrovní by bylo hrubší, ale zhorší oblohu.
