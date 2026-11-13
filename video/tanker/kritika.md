# Kritika v1 – tanker_v1.mp4

<!-- TABULKA -->
| ID | Váha | čas / frame | problém | konkrétní oprava | kde |
|---|---|---|---|---|---|
| M1 | MUST | celé video | Dither téměř neviditelný: 18 úrovní/kanál → vypadá to jako hladký three.js render (šedé plochy, chromové odlesky na tyči/podu), ne pixel-dither jako reference | 4–6 úrovní/kanál (nebo paleta ~24 barev), interní box 270×480 ×4, ditherovat i osvětlené plochy, quantized lambert/toon ramp, shininess ≤10, zrušit blur na oblačné vrstvě | scene |
| M2 | MUST | S7 19.7–21.0 | Kontakt tryska→zásuvka (+flash 20.62) leží přesně pod titulkem y≈1390; flash není vidět | Přerámovat S7 tak, aby R byl v y≈750; flash sprite 3× větší + rozpínající se kroužek; v S7 titulky výš (y≈1500) jen pokud se rám nepovede | scene/post |
| M3 | MUST | S8 21.7–24.95 | „Rentgen“ neukazuje, že palivo teče DO stíhačky: tryska i zásuvka mimo záběr, tečky končí v prázdnu, leader FUEL FLOW utíká z obrazu doleva | Boční kamera na tyč+hřbet F-16, průhledná kůže F-16 + nádrže plněné oranžovou synchronně s FUEL %; anchor leaderu na viditelný bod tyče | scene |
| M4 | MUST | S5 12.45–15.55 | Operátor nečitelný: oranžová hlava, zelený blob, černá krabice; okno skryté (podWin.visible=false); nevidíme „ležet na břiše u okna“; 3 s stejný rám | Postavit ležící postavu + okno se sklem, boční cutaway, tyč viditelná za oknem, pomalý push | scene |
| M5 | MUST | S1, S4, S7–S9 | F-16 nečte jako F-16 (černý neprůhledný „lavor“ kokpit, žádný chin intake, LERX, AIM-9 na koncích křídel); černé „dráty“ = švy na trupu; KC-135 bez detailů | Viz MUST 5 níže | scene |
| M6 | MUST | celé video | Žlutý highlight je karaoke na aktuálním slově → zvýrazňuje „the“, „an“, „its“, „by“, „In“; reference zvýrazňuje klíčové slovo | Žlutě jen *hvězdičkovaná* fráze (landing, with you, five hundred, below its tail, window, boom, back, three tonnes, Full, flying), zbytek bílý | post |
| M7 | MUST | S9 25.6–28 | Stíhačka odpadá z obrazu vpravo dole, kamera ji nesleduje; leader FUEL FULL míří do prázdna/mimo obraz | Kamera trackuje stíhačku, menší drop, anchor clamp | scene |
| S1 | SHOULD | S10 28–31.6 | Tanker malý, ~60 % rámu prázdná obloha a rozmazaná oblaka; konec bez pointy | Kamera blíž a z boku-zezadu, tanker 70 % šířky, kondenzační stopy ze 4 motorů, odlétá ke slunci | scene |
| S2 | SHOULD | S6, S9, S10 | Mraky-sprity = naskládané koule, měkké a nedithrované | Méně, větší a plošší sprity (scale.y 0.5), tvrdý alfa práh, ať projdou ditherem | scene |
| S3 | SHOULD | S8 plate | „~2.9 T/MIN“ odporuje fakta.md (2,6–2,7 t/min) | „~2.7 T/MIN“ | scene |
| S4 | SHOULD | S7 20.4 | Štítek RECEPTACLE + leader leží přes tyč (hero) | Štítek x=120,y=300 (vlevo), leader mimo tyč | scene |
| S5 | SHOULD | S4 11.8–12.45 | Pohyb skoro stojí (rozdíl snímků 1.2); tyč se nespouští viditelně | Kamera dál push-in (k*4 → k*6, i po dosednutí), bAng 0.2→0.45 udělat dřív a viditelně | scene |
| S6 | SHOULD | S1, S2 | Horní třetina rámu prázdný gradient | Slunce s pixel paprsky vlevo nahoře (jako ref d27f985f), vysoké cirry, kondenzační stopa | scene |
| S7 | SHOULD | všechny štítky | Štítky malé (~160 px šířka, písmo ~36 px) vs reference ~300 px / 47 px | Měřítko plate ×1.35, padding větší, 1px světlý vnitřní rámeček jako LED panel | scene |
| S8 | SHOULD | S5 | Bílý specular pruh na podu přes půl rámu – nejlevnější vzhled ve videu | Matný materiál podu (roughness 0.8) | scene |
| N1 | NICE | S3 | Rychlost jen číslem; nic nevyjadřuje 537 km/h | Rychlejší parallax oblak pod letadly, jemné speed lines | scene |
| N2 | NICE | celé | Bez stínu/opotřebení | Stín stíhačky na tankeru v S4/S7, mírné tmavé skvrny u výfuků | scene |
| N3 | NICE | štítky | Font Jersey 10 je „bold pixel“, reference má tenký LED dot-matrix | LED font s jemnou mřížkou + glow | scene |

## Skóre: 4.5 / 10
Příběh je pochopitelný a střih sedí na řeč, ale na telefonu to vedle reference vypadá jako hladký WebGL prototyp: dither skoro není vidět, letadla jsou šedé generické tvary, a dva klíčové okamžiky (kontakt, tok paliva) nejsou čitelné.

## MUST (seřazeno podle vizuálního dopadu)

**1. Dither/pixel look chybí (celé video).**
Reference má na každé ploše viditelné hrubé pixely a vzor teček; tady jsou vidět jen v gradientu oblohy (crop 7.5 s).
- `OW/OH` 360×640 → 270×480, upscale ×4 (nearest).
- Bayer 18 úrovní → 5 úrovní na kanál (nebo nejbližší barva z palety ~24 barev: 6 modrých, 6 šedých letadel, bílé, žlutá, oranžová).
- Materiály letadel: MeshLambert/toon s 3stupňovým gradientMap; shininess/metalness pryč (chromový pruh na tyči S7, odlesk podu S5).
- Oblačnou vrstvu nerozmazávat (nebo blur až před ditherem, ne po).

**2. Kontakt v S7 je schovaný pod titulkem (19.7–21.0).**
Tryska dosedne na y≈1390 právě tam, kde je titulek „on the fighter's“; flash 20.62 není rozpoznatelný.
- `cam.lookAt(R.x, R.y + .9, R.z - .6)` → `cam.lookAt(R.x, R.y - 1.4, R.z - .6)`, aby se R promítl do y≈700–800; kamera víc z boku: `R.x - 3.6`, `R.y + 1.6`.
- Flash: sprite 3× větší + 0,3 s rozpínající se žlutý pixel-kroužek kolem R, 2 snímky bílého záblesku na trysce.
- Kontrola: projekce R musí mít y < 1150 po celé S7.

**3. S8 „palivo teče“ – palivo nikam neteče (21.7–24.95).**
Záběr ukazuje tyč přes rám a nos F-16; tryska ani zásuvka nejsou vidět, leader FUEL FLOW (anchor boom z=7) odchází z obrazu.
- Kamera: `cam.position.set(-9 + k*1.2, -4.0, CONTACT_POS.z - 1)`, `lookAt` na střed mezi ruddevators a RECEPT – v rámu musí být tyč, tryska, hřbet F-16.
- F-16 v S8 rentgenem: kůže `boomX`, uvnitř 3 boxy nádrží (trup + 2 křídla), jejich výplň roste podle `cl((t-22)/2.8)` stejně jako FUEL %.
- `fuelDots` prodloužit až do nádrží (po RECEPT dál do trupu).
- Anchor FUEL FLOW na `boom z=3` (viditelný), všechny anchory clampovat do 40..1040 × 200..1700, jinak štítek bez leaderu.

**4. S5 operátor nečitelný (12.45–15.55).**
Hlava s obličejem, zelený blob a černá krabice; okno vypnuté (`podWin.visible = false`), takže věta „face down at a window“ nemá obraz.
- Nechat `podWin.visible = true` jako sklo (opacity .35, světlý okraj).
- Postava: trup capsule ležící vodorovně podél z (délka ~1.7), hlava s helmou u okna, paže dopředu k ovladači, nohy dozadu; bez obličejového detailu.
- Kamera z boku na řez ocasem: `cam.position.set(-5.5, -1.6, 15.5 + k*.8)`, `lookAt(0, -1.7, 15.2)`, aby za oknem byla vidět tyč a dole stíhačka.
- Leader na helmu; specular pruh podu pryč.

**5. Hrdinové nejsou F-16 / KC-135, jen šedé tvary.**
- F-16: průhledný bubble canopy s nádechem do zlata (ne černá polokoule), chin intake pod kokpitem (tmavý otvor), LERX strakes do náběžné hrany, AIM-9 na koncích křídel, 2 ventrální kýlovky, tmavší radom, 2 tóny šedé (světlá spodní / tmavší horní), tryska s lamelami.
- Odstranit černé tenké prstence/křivky švů (S7/S8 vypadají jako dráty); panelové linky jen jako o 1 stupeň tmavší pruhy.
- KC-135: řada oken, čelní okna kokpitu, kryt boom podu pod ocasem, kolejnice klapek pod křídlem, poziční světla (červené/zelené na koncích křídel, blikající bílé).

**6. Zvýraznění v titulcích na špatných slovech.**
Karaoke žlutá přeskakuje po každém slově („the“, „an“, „its“, „by“, „In“). Reference zvýrazňuje jen klíčové slovo.
- V post: žlutě jen slova v `*...*` z lines.json, ostatní bílé; slova se mohou objevovat postupně, ale barva zůstává.

**7. S9: stíhačka zmizí a leader míří do prázdna (25.6–28).**
- Drop zmenšit: `(-drop*9, -drop*6, drop*5)`.
- `cam.lookAt` lerp mezi ocasem tankeru a `fighter.position` (k 0→0.6), aby F-16 zůstala vidět celá a zatahující se tyč nad ní.
- Štítek FUEL FULL: anchor na canopy, clamp do rámu; když je projekce mimo, štítek skrýt.
