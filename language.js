/* ===============================================================
   LANGUAGE SWITCH (same engine as the real estate / sample page)
   The page mixes German and English texts, so there are two
   dictionaries:
     DE = English text in the HTML  ->  German
     EN = German text in the HTML   ->  English
   Key   = exact text as it appears in the page
   Value = text shown in the chosen language
   Texts that are not listed stay unchanged (e.g. product names).
=============================================================== */
(function () {
  "use strict";

  /* ---------------- ENGLISH -> GERMAN ---------------- */
  const DE = {
    // Header
    "Theme": "Design",
    "Colour framework": "Farbschema",
    "Black · Gold · White": "Schwarz · Gold · Weiß",
    "Ocean": "Ozean",
    "Forest": "Wald",
    "Berry": "Beere",
    "Slate": "Schiefer",
    "Account": "Konto",
    "Cart": "Warenkorb",

    // Local area
    "Local product area": "Lokales Produktgebiet",
    "Set a search area and radius to filter nearby listings.": "Suchgebiet und Radius festlegen, um Angebote in der Nähe zu filtern.",
    "Use my location": "Meinen Standort nutzen",
    "Search area": "Suchgebiet",
    "e.g. Dresden, Germany": "z. B. Dresden, Deutschland",
    "Apply area": "Gebiet anwenden",
    "Location is optional. Products without coordinates remain visible.": "Der Standort ist optional. Produkte ohne Koordinaten bleiben sichtbar.",
    "Area could not be resolved. Click the map or use your location.": "Gebiet konnte nicht gefunden werden. Klicke auf die Karte oder nutze deinen Standort.",
    "Zoom in": "Vergrößern",
    "Zoom out": "Verkleinern",

    // Product details
    "Product": "Produkt",
    "Add to cart": "In den Warenkorb",
    "Seller / product location": "Standort von Verkäufer / Produkt",

    // Cart
    "Total": "Gesamt",
    "Fulfilment": "Abholung / Lieferung",
    "Local pickup": "Abholung vor Ort",
    "Delivery": "Lieferung",
    "Delivery address (if needed)": "Lieferadresse (falls erforderlich)",
    "Payment gateway": "Zahlungsart",
    "Cash / pay at pickup": "Barzahlung / Zahlung bei Abholung",
    "Demo checkout (no charge)": "Demo-Checkout (keine Kosten)",
    "Stripe (requires server integration)": "Stripe (erfordert Server-Integration)",
    "PayPal (requires server integration)": "PayPal (erfordert Server-Integration)",
    "This is a demo cart. No payment is collected. Real payments require a secure backend and provider checkout.": "Dies ist ein Demo-Warenkorb. Es wird keine Zahlung eingezogen. Echte Zahlungen erfordern ein sicheres Backend und den Checkout des Zahlungsanbieters.",
    "Place demo order": "Testbestellung aufgeben",
    "Your cart is empty.": "Dein Warenkorb ist leer.",

    // Account / seller dashboard
    "/ Seller dashboard": "/ Verkäufer-Dashboard",
    "Prototype account area: authentication is local-only and not secure for production.": "Prototyp-Kontobereich: Die Anmeldung funktioniert nur lokal und ist für den Produktivbetrieb nicht sicher.",
    "Email": "E-Mail",
    "Password": "Passwort",
    "Sign in": "Anmelden",
    "Create demo account": "Demo-Konto erstellen",
    "Sign out": "Abmelden",
    "Change demo password": "Demo-Passwort ändern",
    "New password": "Neues Passwort",
    "Update": "Aktualisieren",
    "Not signed in": "Nicht angemeldet",
    "Seller dashboard · Upload a product": "Verkäufer-Dashboard · Produkt hochladen",
    "Sign in to use this local prototype dashboard. Uploaded listings are stored in this browser.": "Melde dich an, um dieses lokale Prototyp-Dashboard zu nutzen. Hochgeladene Angebote werden in diesem Browser gespeichert.",
    "Company / seller name": "Firma / Verkäufername",
    "Store location / address": "Standort / Adresse des Geschäfts",
    "Latitude (optional)": "Breitengrad (optional)",
    "Longitude (optional)": "Längengrad (optional)",
    "Save seller profile": "Verkäuferprofil speichern",
    "Seller profile saved in this browser.": "Verkäuferprofil in diesem Browser gespeichert.",

    // Sync modal
    "AI product lookup / OCR API endpoint (optional)": "KI-Produktsuche / OCR-API-Endpunkt (optional)",
    "https://your-server.example/api/product-enrichment": "https://dein-server.example/api/product-enrichment",
    "Your backend can resolve OCR/barcodes against product catalogues and local price sources. Do not put private API keys in this page.": "Dein Backend kann OCR-Texte und Barcodes mit Produktkatalogen und lokalen Preisquellen abgleichen. Trage keine privaten API-Schlüssel in diese Seite ein."
  };

  /* ---------------- GERMAN -> ENGLISH ---------------- */
  const EN = {
    // Page title
    "ScanShop AI – Intelligenter Produkt-Scanner & Online-Shop": "ScanShop AI – Intelligent Product Scanner & Online Shop",

    // Header
    "Shop-Katalog": "Shop catalogue",
    "Online-Sync & Export": "Online sync & export",

    // Scanner
    "Produkt-Scanner": "Product scanner",
    "KI-Modell lädt...": "AI model loading...",
    "KI-Scanner bereit": "AI scanner ready",
    "Manueller Modus aktiv": "Manual mode active",
    "Bereit zum Scannen": "Ready to scan",
    "Starte die Live-Kamera oder wähle ein Produktfoto aus.": "Start the live camera or choose a product photo.",
    "Produktvorschau": "Product preview",
    "Kamera starten": "Start camera",
    "Neu scannen": "Scan again",
    "Aufnehmen & analysieren": "Capture & analyse",
    "Kamera wechseln": "Switch camera",
    "Foto": "Photo",
    "Galerie": "Gallery",

    // Form
    "Produkt-Analyse & Details": "Product analysis & details",
    "Die KI erkennt Produkttyp und Kategorie automatisch. Alle Änderungen werden sofort gespeichert.": "The AI detects product type and category automatically. All changes are saved immediately.",
    "Produktname *": "Product name *",
    "z. B. Kabellose Kopfhörer": "e.g. Wireless headphones",
    "Preis (€) *": "Price (€) *",
    "Preis eingeben / API-Schätzung": "Enter price / API estimate",
    "Kategorie / Typ": "Category / type",
    "SKU / Artikelnummer": "SKU / item number",
    "Beschreibung": "Description",
    "Zum Shop hinzufügen": "Add to shop",
    "Zurücksetzen": "Reset",

    // Catalogue
    "Nach Produktname, Marke, SKU oder ISBN suchen...": "Search by product name, brand, SKU or ISBN...",
    "Produktname suchen": "Search product name",
    "Alle Kategorien": "All categories",
    "Elektronik": "Electronics",
    "Mode & Accessoires": "Fashion & accessories",
    "Haushalt & Wohnen": "Home & living",
    "Lebensmittel & Getränke": "Food & beverages",
    "Sport & Freizeit": "Sports & leisure",
    "Beauty & Pflege": "Beauty & care",
    "Büro & Schreibwaren": "Office & stationery",
    "Sonstiges": "Other",
    "Noch keine Produkte": "No products yet",
    "Scanne oder lade ein Foto hoch, um dein erstes Produkt hinzuzufügen.": "Scan or upload a photo to add your first product.",
    "Keine weiteren Details vorhanden.": "No further details available.",
    "Bearbeiten": "Edit",
    "Löschen": "Delete",

    // Edit modal
    "Produkt bearbeiten": "Edit product",
    "Schließen": "Close",
    "Produktname": "Product name",
    "Preis (€)": "Price (€)",
    "Kategorie": "Category",
    "Abbrechen": "Cancel",
    "Änderungen speichern": "Save changes",

    // Sync modal
    "Autosave & Online-Sync": "Autosave & online sync",
    "Produkte werden automatisch im Browser (": "Products are saved automatically in the browser (",
    ") gespeichert. Optional kannst du eine REST-API / Webhook-URL hinterlegen.": "). Optionally, you can enter a REST API / webhook URL.",
    "https://deine-api.de/products": "https://your-api.com/products",
    "Endpoint speichern & testen": "Save & test endpoint",
    "Backup & Datenaustausch": "Backup & data exchange",
    "JSON exportieren": "Export JSON",
    "JSON importieren": "Import JSON",
    "Alle lokalen Daten löschen": "Delete all local data"
  };

  /* ---------------- ENGINE (no need to edit) ---------------- */
  const ATTRIBUTES = ["placeholder", "alt", "title", "aria-label"];
  const SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1 };
  // The language button itself and the map tiles/markers are never translated
  const IGNORE_SELECTOR = "#languageToggle, .leaflet-pane";

  const button = document.querySelector("#languageToggle");
  const textRecords = new WeakMap();
  const attrRecords = new WeakMap();
  let titleRecord = null;

  // The page starts in German. Change to "EN" for an English start.
  let language = "DE";
  try {
    const saved = localStorage.getItem("scanshop_language");
    if (saved === "EN" || saved === "DE") language = saved;
  } catch (e) {}

  function normalize(s) { return s.replace(/\s+/g, " ").trim(); }

  function translateValue(original) {
    const key = normalize(original);
    if (!key) return undefined;
    const translated = (language === "DE" ? DE : EN)[key];
    if (translated === undefined) return undefined;
    const lead = original.match(/^\s*/)[0];
    const trail = original.match(/\s*$/)[0];
    return lead + translated + trail;
  }

  // Keeps the original text and notices if another script changed the value
  function syncRecord(rec, currentValue) {
    if (rec.out !== null && currentValue !== rec.out) {
      rec.orig = currentValue;
      rec.out = null;
    } else if (rec.out === null && currentValue !== rec.orig) {
      rec.orig = currentValue;
    }
  }

  function processText(node) {
    if (!node.nodeValue || !node.nodeValue.trim()) return;
    let rec = textRecords.get(node);
    if (!rec) { rec = { orig: node.nodeValue, out: null }; textRecords.set(node, rec); }
    else syncRecord(rec, node.nodeValue);

    const out = translateValue(rec.orig);
    if (out !== undefined) {
      if (node.nodeValue !== out) node.nodeValue = out;
      rec.out = out;
    } else {
      if (rec.out !== null) node.nodeValue = rec.orig;
      rec.out = null;
    }
  }

  function processAttributes(el) {
    ATTRIBUTES.forEach(function (attr) {
      if (!el.hasAttribute(attr)) return;
      let recs = attrRecords.get(el);
      if (!recs) { recs = {}; attrRecords.set(el, recs); }
      const current = el.getAttribute(attr);
      let rec = recs[attr];
      if (!rec) rec = recs[attr] = { orig: current, out: null };
      else syncRecord(rec, current);

      const out = translateValue(rec.orig);
      if (out !== undefined) {
        if (current !== out) el.setAttribute(attr, out);
        rec.out = out;
      } else {
        if (rec.out !== null) el.setAttribute(attr, rec.orig);
        rec.out = null;
      }
    });
  }

  function processTree(root) {
    if (root.nodeType === Node.TEXT_NODE) {
      if (root.parentElement && !root.parentElement.closest(IGNORE_SELECTOR)) processText(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    if (SKIP_TAGS[root.tagName] || root.closest(IGNORE_SELECTOR)) return;

    processAttributes(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (n.nodeType === Node.ELEMENT_NODE) {
          if (SKIP_TAGS[n.tagName]) return NodeFilter.FILTER_REJECT;
          if (n.matches(IGNORE_SELECTOR)) return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n;
    while ((n = walker.nextNode())) {
      if (n.nodeType === Node.TEXT_NODE) processText(n);
      else processAttributes(n);
    }
  }

  function processHead() {
    const current = document.title;
    if (!titleRecord) titleRecord = { orig: current, out: null };
    else syncRecord(titleRecord, current);
    const out = translateValue(titleRecord.orig);
    if (out !== undefined) { document.title = out; titleRecord.out = out; }
    else {
      if (titleRecord.out !== null) document.title = titleRecord.orig;
      titleRecord.out = null;
    }
  }

  // Translates content that the page adds later (product cards, modals, status texts ...)
  const observer = new MutationObserver(function (mutations) {
    observer.disconnect();
    mutations.forEach(function (m) {
      m.addedNodes.forEach(function (node) { processTree(node); });
    });
    startObserver();
  });
  function startObserver() { observer.observe(document.body, { childList: true, subtree: true }); }

  function applyLanguage() {
    observer.disconnect();
    processTree(document.body);
    processHead();
    startObserver();

    // The button shows the language you can switch TO
    if (button) button.textContent = language === "DE" ? "EN" : "DE";
    document.documentElement.lang = language.toLowerCase();
    try { localStorage.setItem("scanshop_language", language); } catch (e) {}
  }

  function switchLanguage() {
    language = language === "DE" ? "EN" : "DE";
    applyLanguage();
  }

  // Helper for other scripts: window.translateText("Some text")
  window.translateText = function (text) {
    const out = translateValue(text);
    return out !== undefined ? out : text;
  };

  if (button) button.addEventListener("click", switchLanguage);

  applyLanguage();
})();