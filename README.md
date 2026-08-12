# Jan Kodad — prodejní stránka online fitness coachingu

Statická jednostránková prodejní stránka (landing page) pro nabídku online fitness coachingu
a tréninkových plánů na míru. Bez build kroku, bez závislostí — stačí otevřít `index.html`.

## Struktura

```
index.html               hlavní prodejní stránka
obchodni-podminky.html   obchodní podmínky (odkaz z patičky)
assets/css/styles.css    styly
assets/js/main.js        interakce (menu, ceník, formulář, animace)
```

## Spuštění lokálně

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

Nasazení: nahrát obsah složky na jakýkoli statický hosting (Netlify, Vercel, GitHub Pages, FTP).

## Obsah stránky

1. **Hero** — hlavní sdělení + dvě CTA
2. **Statistiky** — čísla s dopočítáváním při scrollu
3. **Pro koho to je** — pojmenování problémů klienta
4. **Služby** — co je součástí coachingu
5. **Ceník** — 3 balíčky + přepínač měsíčně / 3 měsíce (−15 %) + doplňkové služby
6. **Jak to funguje** — 4 kroky spolupráce
7. **O mně** — představení trenéra
8. **Reference** — hodnocení klientů
9. **FAQ** — 7 nejčastějších dotazů
10. **Kontaktní formulář** — poptávka s předvyplněným balíčkem

## Nabídka (aktuálně nastavené ceny)

| Balíček | Cena | Obsah |
|---|---|---|
| Tréninkový plán | 1 990 Kč jednorázově | plán na 8–12 týdnů, videoukázky, progrese, 1 revize |
| Coaching Standard | 2 990 Kč / měsíc | plán + výživa + týdenní check-in + rozbor techniky 2× měsíčně |
| Coaching Premium | 4 990 Kč / měsíc | vše ze Standardu + videohovor 1× týdně + neomezený rozbor techniky |

Doplňkově: konzultace 60 min (890 Kč), rozbor techniky (490 Kč), plán pro páry (2 990 Kč).

Ceny se mění na jednom místě v `index.html` v sekci `#cenik` — u měsíčních balíčků
uprav atributy `data-price-1` (měsíčně) a `data-price-3` (při 3měsíčním závazku).

## Co je potřeba doplnit před spuštěním

Následující místa obsahují zástupný obsah:

- **Reference** (`#reference` v `index.html`) — texty jsou **ukázkové** a je nutné je nahradit
  skutečnými referencemi reálných klientů, ideálně se souhlasem se zveřejněním jména.
- **Fotka trenéra** (`#o-mne`) — místo SVG zástupce vlož `<img src="assets/img/jan-kodad.jpg" alt="Jan Kodad">`.
- **Kontakty** — `info@jankodad.cz` a `+420 777 123 456` v `index.html`, `obchodni-podminky.html`
  a v konstantě `CONTACT_EMAIL` v `assets/js/main.js`.
- **IČO a sídlo** — patička a body 1 obchodních podmínek.
- **Doména** — `https://www.jankodad.cz/` v `<link rel="canonical">`, OG tazích a JSON-LD.
- **Údaje v sekci O mně a statistiky** (počet klientů, roky praxe, certifikace) — ověřit, ať sedí.
- **Obchodní podmínky** jsou obecná šablona; před zveřejněním je vhodné je nechat zkontrolovat právníkem.

## Odesílání formuláře

Bez backendu formulář otevře e-mailového klienta s předvyplněnou poptávkou.
Pro skutečné odesílání stačí v `assets/js/main.js` nastavit:

```js
var FORM_ENDPOINT = "https://formspree.io/f/xxxxxxx";
```

Odešle se POST s JSON tělem; při chybě se použije mailto jako záloha.

## Poznámky

- Responzivní od 320 px výš, mobilní menu, dark téma.
- Respektuje `prefers-reduced-motion` (vypne animace i dopočítávání čísel).
- Přístupnost: skip link, `aria` atributy u menu a ceníku, viditelný focus.
- SEO: meta description, Open Graph, JSON-LD `ProfessionalService` s katalogem nabídky.
