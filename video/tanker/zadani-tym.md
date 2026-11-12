# Zadání týmu – tanker v3 (cíl ≥ 8/10)

Video: „How do you refuel a fighter jet without landing?“, 1080×1920, 30 fps, 31,6 s. Hlas, text (`narration.txt`) a časy (`lines.json`) jsou FINÁLNÍ – neměnit.
Styl: dither-pixel 3D jako reference `/root/.claude/uploads/f7107db8-dd15-5997-9308-320b08cacb0e/{7c3d5329,1613f1ae,d27f985f,282408e9,5f32b147,a0eb613d,3e057703}-image.png`
(pixelově ditherované nasvícené 3D scény, LED štítky se žlutými tečkovanými vodítky, titulky 1–3 slova, klíčová slova žlutě).
Pipeline (nemění se): render 720×1280 → box 360×640 → Bayer → ×3 NEAREST. Štítky a titulky na plném rozlišení.

## Laťka kvality (co kritici a majitel už dřív odmítli)
- **Hero objekty** musí být na mobilu čitelné na první pohled: správné proporce, skutečné materiály (ocel ≠ chrom ≠ sklo), opotřebení, drobné díly. Kapsle a low-poly hračky vždy neprošly.
- **Lidé**: žádné figuríny, roboti ani klony. Zužující se trup, krk, obličej (nos, obočí), dvoudílné paže a nohy s objemem, ruce sevřené na tom, co drží, vrstvy oblečení. Nic useknutého okrajem.
- **Plné záběry**: rekvizity, částice, opar, žádná prázdná plocha > 25 % snímku; žádný statický úsek > 2 s (pomalý najezd, oblet, paralaxa). Kamera ≤ 30°/s.
- **VFX fyzikálně**: kondenzační stopy, žár z trysek (tetelení/tmavší opar), palivové kapky/mlha při odpojení, kontaktní záblesk.
- **Štítky a vodítka**: štítky mimo hero objekt a mimo pravý UI pruh (x > 950, y 820–1490); vodítko KONČÍ na pojmenované věci; počítadla souhlasí s komentářem ve chvíli, kdy zazní.
- **Děj musí být vidět**: když komentář říká „slides in“, pohyb ≥ 8 % šířky snímku.
- **Hook a konec** jsou defaultně nejslabší – dostanou nejvíc detailu.

## Fakta (fakta.md)
Rychlost „over 500 km/h“ (≈ 290 kn ≈ 537 km/h); operátor KC-135 leží na břiše u okna; tyč má vlastní řídicí plochy (ruddevators) a teleskopickou trysku; zásuvka F-16 je na hřbetu za kabinou (dvířka se otevírají); průtok ~2,6–2,7 t/min (štítek „~2.7 T/MIN“).
KC-135: délka 41,5 m, rozpětí 39,9 m, 4 motory CFM56 (KC-135R) v gondolách pod křídly, šíp 35°, vysoká SOP. F-16: délka 15 m, rozpětí 9,5 m (s raketami), jeden motor, bublinový kryt kabiny, sání pod trupem, LERX, rakety AIM-9 na koncích křídel, jedna SOP.

## Pravidla týmu
- Každý pracuje JEN ve svých souborech (viz README_MODULES.md). Rozhraní (názvy handle objektů) neměnit bez dohody – když přidáš nový handle, zapiš ho do README_MODULES.md.
- Testovací snímky jen do vlastní složky `check_<role>/` (ne `check/`, ne `frames/`); po skončení smaž.
- Renderuj s `nice -n 10`. Na stroji běží víc agentů najednou.
- Necommituj do gitu.
