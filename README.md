# Vytrvej — prodejní stránka online fitness coachingu

Statická jednostránková prodejní stránka (landing page) pro značku **Vytrvej** — online fitness
coaching a tréninkové plány na míru, které vede **Jan Kodad**. Bez build kroku, bez závislostí —
stačí otevřít `index.html`.

## Struktura

```
index.html               hlavní prodejní stránka
obchodni-podminky.html   obchodní podmínky (odkaz z patičky)
assets/css/styles.css    styly
assets/js/main.js        interakce (menu, ceník, formulář, animace)
assets/img/logo.svg      logo v celku (značka + nápis)
assets/img/logo-mark.svg samotná značka (fajfka)
assets/img/jan-kodad.jpg fotka trenéra do sekce „O mně"
```

## Značka

Název **Vytrvej** stojí na jediné myšlence: vydržet dost dlouho, aby se výsledky stihly dostavit.

Logo je minimalistická **fajfka** — odškrtnuto, splněno. Jeden tah, kde pravé rameno vystoupá výš
než levé, takže se čte zároveň jako značka „hotovo" i jako stoupající křivka. V hlavičce je vsazená
do modré dlaždice se zaoblenými rohy, samostatně se používá jako modrá linka na tmavém podkladu.

Wordmark je vždy **malými písmeny** (`vytrvej`), řez 800, mírně stažené prostrkání.

V hlavičce a patičce je značka vložená přímo do HTML jako inline SVG (dědí barvu z CSS přes
`currentColor`), takže soubory v `assets/img/` slouží pro použití mimo web — sociální sítě,
dokumenty, tisk. Text v `logo.svg` je vysázený fontem; pro tisk ho převeď na křivky.

### Barvy

| Proměnná | Hodnota | Použití |
|---|---|---|
| `--accent` | `#4da6ff` | značka, tlačítka, ikony, zvýraznění |
| `--accent-dk` | `#2b8cf0` | hover stav tlačítek |
| `--accent-ink` | `#06121f` | text na modrém podkladu |
| `--bg` / `--bg-alt` | `#080b11` / `#0c111a` | pozadí stránky a střídavých sekcí |
| `--surface` / `--surface-2` | `#111825` / `#161f2f` | karty a vnořené bloky |
| `--text` / `--muted` | `#e6ecf5` / `#93a1b8` | základní a doplňkový text |

Celá paleta je v `:root` v `assets/css/styles.css` — změnou `--accent` se překlopí celý web.
Kontrast všech textových dvojic je nad 4,5 : 1 (WCAG AA).

## Spuštění lokálně

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

Nasazení: nahrát obsah složky na jakýkoli statický hosting (Netlify, Vercel, GitHub Pages, FTP).

## Obsah stránky

1. **Hero** — hlavní sdělení + dvě CTA
2. **Statistiky** — čísla s dopočítáváním při scrollu
3. **Dřeš, ale výsledky nikde** — pojmenování problémů klienta
4. **Komu to sedne** — směnný provoz, ženy na mateřské, časté cesty, začátečníci
5. **Služby** — co je součástí coachingu
6. **Ukázka** — úvodní video a náhledy plánu, jídelníčku a kuchařky
7. **Ceník** — 3 balíčky + přepínač měsíčně / 3 měsíce (−15 %) + doplňkové služby + garance
8. **Kuchařka** — recepty k jídelníčku, bezlepkové a bezlaktózové varianty
9. **Jak to funguje** — 4 kroky spolupráce
10. **O mně** — představení trenéra
11. **Reference** — souhrn hodnocení a citace klientů
12. **FAQ** — 10 nejčastějších dotazů
13. **Kontaktní formulář** — poptávka s předvyplněným balíčkem

Přes celou stránku pak běží **lepivá lišta s CTA**, která naskočí po opuštění hera
a schová se u kontaktního formuláře.

## Nabídka (aktuálně nastavené ceny)

| Balíček | Cena | Obsah |
|---|---|---|
| Tréninkový plán | 1 990 Kč jednorázově | plán na 8–12 týdnů, videoukázky, progrese, 1 revize |
| Coaching Standard | 2 990 Kč / měsíc | plán + kalorie a makra + **jídelníček na míru** + **kuchařka (60 receptů)** + týdenní check-in + rozbor techniky 2× měsíčně |
| Coaching Premium | 4 990 Kč / měsíc | vše ze Standardu + jídelníček měněný po 2 týdnech + **kuchařka ve verzi 120 receptů** + videohovor 1× týdně + neomezený rozbor techniky |

Jídelníček a kuchařka patří k balíčkům **od Coaching Standard výš** — samotný tréninkový plán je
neobsahuje. U každého receptu je bezlepková a bezlaktózová varianta; sekce `#kucharka` to popisuje
včetně upozornění, že nejde o léčebnou výživu a u diagnostikované celiakie nebo alergie rozhoduje
lékař či nutriční terapeut.

Doplňkově: konzultace 60 min (890 Kč), rozbor techniky (490 Kč), plán pro páry (2 990 Kč).

Ceny se mění na jednom místě v `index.html` v sekci `#cenik` — u měsíčních balíčků
uprav atributy `data-price-1` (měsíčně) a `data-price-3` (při 3měsíčním závazku).

## Co je potřeba doplnit před spuštěním

Následující místa obsahují zástupný obsah:

- **Reference** (`#reference` v `index.html`) — texty jsou **ukázkové** a je nutné je nahradit
  skutečnými referencemi reálných klientů, ideálně se souhlasem se zveřejněním jména.
- **Kontakty** — `info@vytrvej.cz` a `+420 777 123 456` v `index.html`, `obchodni-podminky.html`
  a v konstantě `CONTACT_EMAIL` v `assets/js/main.js`.
- **IČO a sídlo** — patička a body 1 obchodních podmínek.
- **Doména** — `https://www.vytrvej.cz/` v `<link rel="canonical">`, OG tazích a JSON-LD.
- **Údaje v sekci O mně a statistiky** (počet klientů, roky praxe, certifikace) — ověřit, ať sedí.
- **Úvodní video** — doplnit ID do `data-yt` u `#videoBlock`, jinak se blok nezobrazí.
- **Náhledy produktu** — `assets/img/ukazka-plan.jpg`, `ukazka-jidelnicek.jpg`,
  `ukazka-kucharka.jpg` a `video-poster.jpg`; do té doby se ukazují zástupné rámečky.
- **Obchodní podmínky** jsou obecná šablona; před zveřejněním je vhodné je nechat zkontrolovat právníkem.

## Fotka trenéra

Sekce „O mně" používá `assets/img/jan-kodad.jpg`. Rámeček má poměr **3 : 4** a fotku ořezává
přes `object-fit: cover`, takže široký snímek se nedeformuje. Výřez se ladí jedinou hodnotou:

```css
.photo-frame img { object-position: 38% 50%; }  /* nižší číslo = víc z levé strany */
```

Výchozích 38 % drží postavu mírně vlevo od středu. Pokud fotka v repu chybí, `onerror` obrázek
odstraní a zobrazí se zástupná silueta se štítkem jména — nikdy se neukáže rozbitý obrázek.
Když fotka je, štítek se skrývá přes `:has(img)`, protože jméno už nese samotný snímek.

Snímek je uložený ve **1920 × 1080 při kvalitě 82** (~270 kB). Originál ve 2560 × 1440 měl 1,1 MB,
což je na úvodní načtení zbytečná zátěž — zůstává dohledatelný v historii commitů.

## Prodejní prvky

**Lepivá lišta s CTA** (`#stickyCta`) se řídí dvěma pozorovateli: naskočí, jakmile hero
zmizí z obrazovky, a schová se u sekce `#kontakt`, kde by jen překrývala formulář.
Na mobilu se zúží na jediné tlačítko přes celou šířku — s cenou vedle něj by narostla
přes 90 px a ukrojila čtvrtinu obrazovky.

**Úvodní video** (`#videoBlock`) se načítá až po kliknutí, takže stránka kvůli němu
netahá skripty YouTube předem. ID videa se vkládá do atributu:

```html
<div class="video-block" id="videoBlock" data-yt="dQw4w9WgXcQ">
```

Dokud je `data-yt` prázdné, JS blok odstraní — nezobrazí se nic rozbitého. Přehrávač
běží přes `youtube-nocookie.com`.

**Náhledy produktu** čekají na tři snímky obrazovky: `assets/img/ukazka-plan.jpg`,
`ukazka-jidelnicek.jpg` a `ukazka-kucharka.jpg` (plus volitelně `video-poster.jpg`).
Chybějící soubor `onerror` odstraní a zůstane popisný zástupný rámeček — stejný postup
jako u fotky trenéra.

**Souhrn hodnocení** nad referencemi se **počítá z atributů `data-rating`** u jednotlivých
referencí, takže vždy odpovídá tomu, co je na stránce doopravdy vidět. Nezadávej ho ručně;
když přidáš referenci, souhrn se posune sám. Bez referencí zůstane skrytý.

**Garance** pod ceníkem vychází z toho, co skutečně stojí v obchodních podmínkách —
měsíční období bez automatického prodlužování a zákonných 14 dní na odstoupení. Není to
marketingový slib navíc; když podmínky změníš, uprav i tenhle blok.

## Odesílání formuláře

Bez backendu formulář otevře e-mailového klienta s předvyplněnou poptávkou.
Pro skutečné odesílání stačí v `assets/js/main.js` nastavit:

```js
var FORM_ENDPOINT = "https://formspree.io/f/xxxxxxx";
```

Odešle se POST s JSON tělem; při chybě se použije mailto jako záloha.

## Poznámky

- Responzivní od 320 px výš, dark téma. Navigace se sbaluje do hamburgeru pod 1060 px.
- Čísla ve statistikách se dopočítávají z atributu `data-count`; volitelnou příponu přidá
  `data-suffix` (např. `data-count="99" data-suffix="+"` vypíše `99+`). Údaj bez `data-count`
  zůstane statický, jako `24/7` nebo `100 %`.
- Respektuje `prefers-reduced-motion` (vypne animace i dopočítávání čísel).
- Přístupnost: skip link, `aria` atributy u menu a ceníku, viditelný focus.
- SEO: meta description, Open Graph, JSON-LD `ProfessionalService` s katalogem nabídky.
