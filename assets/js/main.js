/* =====================================================================
   Vytrvej — online fitness coaching s Janem Kodadem
   Interakce prodejní stránky
   ===================================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Mobilní menu ---------- */
  var toggle = document.getElementById("navToggle");
  var nav = document.getElementById("nav");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Zavřít menu" : "Otevřít menu");
    });

    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  /* ---------- Stín hlavičky při scrollu ---------- */
  var header = document.querySelector(".site-header");
  var onScroll = function () {
    header.classList.toggle("is-scrolled", window.scrollY > 10);
  };
  if (header) {
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Odhalování sekcí při scrollu ---------- */
  var revealables = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window) || reduceMotion) {
    revealables.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        // lehké schodovité nabíhání karet ve stejné mřížce
        var siblings = Array.prototype.indexOf.call(el.parentNode.children, el);
        el.style.transitionDelay = Math.min(siblings, 3) * 80 + "ms";
        el.classList.add("is-visible");
        observer.unobserve(el);
      });
    }, { rootMargin: "0px 0px -60px 0px", threshold: 0.12 });

    revealables.forEach(function (el) { observer.observe(el); });
  }

  /* ---------- Počítadla ve statistikách ---------- */
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length && "IntersectionObserver" in window && !reduceMotion) {
    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var target = parseInt(el.dataset.count, 10);
        // volitelná přípona, např. „+" u čísla 99
        var suffix = el.dataset.suffix || "";
        var start = performance.now();
        var duration = 1100;

        var tick = function (now) {
          var p = Math.min((now - start) / duration, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased) + (p === 1 ? suffix : "");
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        countObserver.unobserve(el);
      });
    }, { threshold: 0.5 });

    counters.forEach(function (el) { countObserver.observe(el); });
  }

  /* ---------- Přepínač délky spolupráce v ceníku ---------- */
  var toggleButtons = document.querySelectorAll(".billing-toggle button");
  toggleButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var period = btn.dataset.period;

      toggleButtons.forEach(function (b) {
        var active = b === btn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-pressed", String(active));
      });

      document.querySelectorAll("[data-price-1]").forEach(function (el) {
        el.textContent = el.getAttribute("data-price-" + period);
      });
      document.querySelectorAll("[data-sub-1]").forEach(function (el) {
        el.textContent = el.getAttribute("data-sub-" + period);
      });
    });
  });

  /* ---------- Předvyplnění balíčku z tlačítek v ceníku ---------- */
  var select = document.getElementById("balicekSelect");
  document.querySelectorAll("[data-plan]").forEach(function (link) {
    link.addEventListener("click", function () {
      if (!select) return;
      var plan = link.dataset.plan;
      Array.prototype.forEach.call(select.options, function (opt) {
        if (opt.value === plan || opt.text === plan) select.value = opt.value || opt.text;
      });
    });
  });

  /* ---------- Kontaktní formulář ---------- */
  /*
     Statická stránka nemá backend, proto se poptávka odesílá jako
     předvyplněný e-mail. Pro plnohodnotné odesílání nastav `FORM_ENDPOINT`
     na URL služby (Formspree, Formcarry, vlastní API) — pak se odešle
     přes fetch a mailto se použije jen jako záloha.
  */
  var FORM_ENDPOINT = "";
  var CONTACT_EMAIL = "info@vytrvej.cz";

  var form = document.getElementById("kontaktForm");
  var note = document.getElementById("formNote");

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var invalid = null;
      form.querySelectorAll("[required]").forEach(function (field) {
        var ok = field.type === "checkbox" ? field.checked : field.checkValidity() && field.value.trim() !== "";
        field.classList.toggle("is-invalid", !ok);
        if (!ok && !invalid) invalid = field;
      });

      if (invalid) {
        setNote("Zkontroluj prosím povinná pole označená hvězdičkou.", "err");
        invalid.focus();
        return;
      }

      var data = Object.fromEntries(new FormData(form).entries());

      if (FORM_ENDPOINT) {
        setNote("Odesílám…", "");
        fetch(FORM_ENDPOINT, {
          method: "POST",
          headers: { "Accept": "application/json", "Content-Type": "application/json" },
          body: JSON.stringify(data)
        })
          .then(function (res) {
            if (!res.ok) throw new Error("Request failed");
            form.reset();
            setNote("Díky! Poptávka dorazila, ozvu se do 24 hodin.", "ok");
          })
          .catch(function () { openMailClient(data); });
      } else {
        openMailClient(data);
      }
    });

    form.addEventListener("input", function (e) {
      if (e.target.classList.contains("is-invalid")) e.target.classList.remove("is-invalid");
    });
  }

  function openMailClient(data) {
    var subject = "Poptávka coachingu — " + (data.balicek || "dotaz");
    var body = [
      "Jméno: " + (data.jmeno || ""),
      "E-mail: " + (data.email || ""),
      "Telefon: " + (data.telefon || "neuvedeno"),
      "Balíček: " + (data.balicek || ""),
      "",
      "Zpráva:",
      data.zprava || "(bez zprávy)"
    ].join("\n");

    window.location.href =
      "mailto:" + CONTACT_EMAIL +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);

    setNote("Otevřel se ti e-mailový klient s předvyplněnou poptávkou — stačí odeslat.", "ok");
  }

  function setNote(text, type) {
    if (!note) return;
    note.textContent = text;
    note.className = "form-note" + (type ? " " + type : "");
  }

  /* ---------- Lepivá lišta s CTA ---------- */
  /*
     Naskočí, jakmile návštěvník opustí hero, a zase zmizí u kontaktního
     formuláře — tam už má tlačítko přímo před sebou a lišta by překážela.
  */
  var stickyCta = document.getElementById("stickyCta");
  if (stickyCta && "IntersectionObserver" in window) {
    var hero = document.querySelector(".hero");
    var kontakt = document.getElementById("kontakt");
    var mimoHero = false;
    var uKontaktu = false;

    var prekresli = function () {
      var ukaz = mimoHero && !uKontaktu;
      stickyCta.hidden = !ukaz;
      // hidden se musí zrušit dřív, než začne přejezd, jinak není co animovat
      requestAnimationFrame(function () { stickyCta.classList.toggle("is-visible", ukaz); });
    };

    if (hero) {
      new IntersectionObserver(function (e) {
        mimoHero = !e[0].isIntersecting;
        prekresli();
      }, { threshold: 0 }).observe(hero);
    }
    if (kontakt) {
      new IntersectionObserver(function (e) {
        uKontaktu = e[0].isIntersecting;
        prekresli();
      }, { threshold: 0 }).observe(kontakt);
    }
  }

  /* ---------- Úvodní video ---------- */
  /*
     Přehrávač se vkládá až po kliknutí — stránka tak nenačítá skripty
     YouTube zbytečně. Bez vyplněného data-yt se blok odstraní.
  */
  var videoBlock = document.getElementById("videoBlock");
  if (videoBlock) {
    var ytId = (videoBlock.dataset.yt || "").trim();
    if (!ytId) {
      videoBlock.remove();
    } else {
      videoBlock.querySelector(".video-poster").addEventListener("click", function () {
        var frame = document.createElement("iframe");
        frame.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(ytId) + "?autoplay=1&rel=0";
        frame.title = "Úvodní video";
        frame.allow = "accelerometer; autoplay; encrypted-media; picture-in-picture";
        frame.allowFullscreen = true;
        videoBlock.replaceChildren(frame);
      });
    }
  }

  /* ---------- Souhrn hodnocení ---------- */
  /*
     Průměr i počet se počítají z referencí na stránce, takže souhrn vždy
     odpovídá tomu, co je pod ním vidět. Bez referencí zůstane skrytý.
  */
  var summary = document.getElementById("ratingSummary");
  if (summary) {
    var hodnoceni = [].map.call(
      document.querySelectorAll(".testimonial [data-rating]"),
      function (el) { return parseFloat(el.dataset.rating); }
    ).filter(function (n) { return !isNaN(n); });

    if (hodnoceni.length) {
      var prumer = hodnoceni.reduce(function (a, b) { return a + b; }, 0) / hodnoceni.length;
      var zaokrouhleny = Math.round(prumer * 10) / 10;
      var pocet = hodnoceni.length;

      document.getElementById("ratingScore").textContent =
        zaokrouhleny.toFixed(1).replace(".", ",");
      document.getElementById("ratingStars").textContent =
        "★★★★★".slice(0, Math.round(prumer));
      document.getElementById("ratingCount").textContent = "z 5 · " + pocet + " hodnocení";
      summary.hidden = false;
    }
  }

  /* ---------- Rok v patičce ---------- */
  var rok = document.getElementById("rok");
  if (rok) rok.textContent = new Date().getFullYear();
})();
