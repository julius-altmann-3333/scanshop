
  const STORAGE_KEY = 'scanshop_ai_products_v1';
  const CLOUD_URL_KEY = 'scanshop_ai_cloud_url_v1';
  const CATEGORIES = ['Elektronik','Mode & Accessoires','Haushalt & Wohnen','Lebensmittel & Getränke','Sport & Freizeit','Beauty & Pflege','Büro & Schreibwaren','Sonstiges'];
  const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#e2e8f0"/><text x="50%" y="50%" fill="#94a3b8" font-family="sans-serif" font-size="20" text-anchor="middle" dy=".3em">Kein Bild</text></svg>');

  let products = [];
  let mobilenetModel = null;
  let videoStream = null;
  let useFrontCamera = false;
  let currentImageDataUrl = '';

  const $ = id => document.getElementById(id);

  document.addEventListener('DOMContentLoaded', async () => {
    // Fill category dropdowns
    const opts = CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
    $('prodCategory').innerHTML = opts;
    $('editCategory').innerHTML = opts;
    $('filterCategory').innerHTML = '<option value="ALL">Alle Kategorien</option>' + opts;

    loadFromLocalStorage();
    renderProducts();

    const savedUrl = localStorage.getItem(CLOUD_URL_KEY);
    if (savedUrl) $('cloudEndpointInput').value = savedUrl;

    const statusEl = $('aiModelStatus');
    try {
      mobilenetModel = await mobilenet.load({ version: 2, alpha: 1.0 });
      statusEl.className = 'badge bg-success-subtle text-success-emphasis';
      statusEl.innerHTML = '<i class="bi bi-cpu me-1"></i> KI-Scanner bereit';
    } catch (err) {
      statusEl.className = 'badge bg-secondary-subtle text-secondary-emphasis';
      statusEl.innerHTML = '<i class="bi bi-info-circle me-1"></i> Manueller Modus aktiv';
    }
  });

  window.addEventListener('pagehide', stopCamera);

  /* ---------- Camera ---------- */
  function setCameraUI(live) {
    $('startWrap').classList.toggle('d-none', live);
    $('captureWrap').classList.toggle('d-none', !live);
    $('switchWrap').classList.toggle('d-none', !live);
  }

  async function startCamera() {
    stopCamera();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Live-Kamera wird hier nicht unterstützt (HTTPS erforderlich). Nutze den "Foto"-Button.');
      return;
    }
    const video = $('cameraStream');
    try {
      videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: useFrontCamera ? 'user' : { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      video.srcObject = videoStream;
      await video.play().catch(() => {});
      $('cameraPlaceholder').classList.add('d-none');
      $('capturedPreview').classList.add('d-none');
      video.classList.remove('d-none');
      setCameraUI(true);
    } catch (err) {
      alert('Kamerazugriff nicht möglich. Bitte erlaube den Zugriff oder nutze den "Foto"-Button.');
    }
  }

  function stopCamera() {
    if (videoStream) { videoStream.getTracks().forEach(t => t.stop()); videoStream = null; }
  }

  function switchCamera() { useFrontCamera = !useFrontCamera; startCamera(); }

  async function captureAndAnalyze() {
    const video = $('cameraStream');
    if (!video.videoWidth) { alert('Kamera ist noch nicht bereit.'); return; }
    drawToCanvas(video, video.videoWidth, video.videoHeight);
    stopCamera();
    video.classList.add('d-none');
    showPreview();
    setCameraUI(false);
    $('btnStartCamera').innerHTML = '<i class="bi bi-camera-fill me-1"></i> Neu scannen';
    await analyzeImageElement($('capturedPreview'));
  }

  function drawToCanvas(source, w, h) {
    const canvas = $('captureCanvas');
    const maxWidth = 640;
    const scale = w > maxWidth ? maxWidth / w : 1;
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
    currentImageDataUrl = canvas.toDataURL('image/jpeg', 0.82);
  }

  function showPreview() {
    const preview = $('capturedPreview');
    preview.src = currentImageDataUrl;
    $('cameraPlaceholder').classList.add('d-none');
    preview.classList.remove('d-none');
  }

  function handleFileUpload(event) {
    const input = event.target;
    const file = input.files[0];
    if (!file) return;
    stopCamera();
    setCameraUI(false);
    $('cameraStream').classList.add('d-none');

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      drawToCanvas(img, img.naturalWidth, img.naturalHeight);
      URL.revokeObjectURL(url);
      showPreview();
      input.value = '';
      const preview = $('capturedPreview');
      if (!preview.complete) await new Promise(r => preview.onload = r);
      await analyzeImageElement(preview);
    };
    img.onerror = () => alert('Bild konnte nicht geladen werden.');
    img.src = url;
  }

  /* ---------- AI analysis ---------- */
  async function analyzeImageElement(imgElement) {
    const scanLine = $('scanLine');
    scanLine.style.display = 'block';
    await new Promise(r => setTimeout(r, 450));

    let detectedName = 'Gescanntes Einzelhandelsprodukt';
    let detectedCategory = 'Sonstiges';
    let confidencePct = '';
    let detailsText = 'Automatisch erfasstes Produkt.';

    if (mobilenetModel) {
      try {
        const predictions = await mobilenetModel.classify(imgElement);
        if (predictions && predictions.length) {
          const top = predictions[0];
          detectedName = capitalizeWords(top.className.split(',')[0].trim());
          confidencePct = Math.round(top.probability * 100) + '%';
          detectedCategory = mapKeywordToCategory(top.className.toLowerCase());
          const altTags = predictions.slice(0, 3)
            .map(p => `${p.className.split(',')[0].trim()} (${Math.round(p.probability * 100)}%)`).join(', ');
          detailsText = `KI-Erkennung: ${altTags}. Geeignet für den direkten Einzelhandelsverkauf.`;
        }
      } catch (err) { console.error('Analysefehler:', err); }
    }

    $('prodName').value = detectedName;
    $('prodCategory').value = detectedCategory;
    $('prodSku').value = 'SKU-' + Date.now().toString().slice(-6);
    $('prodDesc').value = detailsText;
    $('prodConfidence').value = confidencePct;
    if (!$('prodPrice').value) $('prodPrice').value = '19.99';

    scanLine.style.display = 'none';
    $('productForm').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function mapKeywordToCategory(k) {
    if (/phone|laptop|computer|keyboard|mouse|screen|monitor|headphone|speaker|camera|watch|television|ipod|cellular|remote/.test(k)) return 'Elektronik';
    if (/shirt|shoe|sneaker|boot|jean|coat|jacket|dress|bag|backpack|hat|sunglasses|sock|suit|tie|sandal/.test(k)) return 'Mode & Accessoires';
    if (/cup|mug|bottle|chair|table|lamp|pillow|sofa|vase|plate|bowl|pan|pot|clock|toaster|espresso/.test(k)) return 'Haushalt & Wohnen';
    if (/banana|apple|orange|pizza|burger|bread|wine|beer|coffee|tea|chocolate|fruit|vegetable|cake/.test(k)) return 'Lebensmittel & Getränke';
    if (/ball|racket|bicycle|helmet|ski|dumbbell|surfboard|skateboard/.test(k)) return 'Sport & Freizeit';
    if (/lotion|perfume|soap|brush|lipstick|cream|shampoo/.test(k)) return 'Beauty & Pflege';
    if (/book|pen|pencil|notebook|envelope|scissors|ruler/.test(k)) return 'Büro & Schreibwaren';
    return 'Sonstiges';
  }

  function capitalizeWords(str) { return str.replace(/\b\w/g, c => c.toUpperCase()); }

  /* ---------- Save / sync ---------- */
  function saveScannedProduct(event) {
    event.preventDefault();
    products.unshift({
      id: 'prod_' + Date.now(),
      name: $('prodName').value.trim(),
      price: parseFloat($('prodPrice').value) || 0,
      category: $('prodCategory').value,
      sku: $('prodSku').value.trim() || 'SKU-' + Date.now().toString().slice(-6),
      description: $('prodDesc').value.trim(),
      confidence: $('prodConfidence').value,
      image: currentImageDataUrl || PLACEHOLDER_IMG,
      createdAt: new Date().toISOString()
    });
    triggerAutosave();
    renderProducts();
    resetScannerForm();
    scrollToCatalog();
  }

  async function triggerAutosave() {
    updateSyncStatus('saving', 'Speichert...');
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    } catch (e) {
      alert('Lokaler Speicher voll! Bitte exportiere deinen Katalog als JSON.');
    }
    const cloudUrl = localStorage.getItem(CLOUD_URL_KEY);
    if (cloudUrl) {
      try {
        const res = await fetch(cloudUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updatedAt: new Date().toISOString(), totalProducts: products.length, products })
        });
        if (res.ok) { updateSyncStatus('online', 'Lokal & Online synchronisiert'); return; }
        updateSyncStatus('warning', 'Online-Sync fehlgeschlagen');
        return;
      } catch (err) {
        updateSyncStatus('warning', 'Lokal gesichert (Offline)');
        return;
      }
    }
    setTimeout(() => updateSyncStatus('local', 'Lokal automatisch gespeichert'), 300);
  }

  function updateSyncStatus(state, text) {
    $('syncText').textContent = text;
    const cls = { saving: 'bg-warning', online: 'bg-primary', warning: 'bg-danger' }[state] || 'bg-success';
    $('syncDot').className = 'status-dot ' + cls;
  }

  function loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      products = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(products)) products = [];
    } catch (e) { products = []; }
  }

  /* ---------- Listing ---------- */
  function renderProducts() {
    const grid = $('productGrid');
    const searchTerm = $('searchInput').value.toLowerCase();
    const cat = $('filterCategory').value;
    $('productCountBadge').textContent = products.length;

    const filtered = products.filter(p =>
      (cat === 'ALL' || p.category === cat) &&
      ((p.name || '').toLowerCase().includes(searchTerm) ||
       (p.description || '').toLowerCase().includes(searchTerm) ||
       (p.sku || '').toLowerCase().includes(searchTerm)));

    if (!filtered.length) {
      grid.innerHTML = '';
      $('emptyState').classList.remove('d-none');
      return;
    }
    $('emptyState').classList.add('d-none');

    grid.innerHTML = filtered.map(p => `
      <div class="col-12 col-sm-6 col-lg-4 col-xl-3">
        <div class="card product-card">
          <div class="product-img-wrapper">
            <span class="category-badge">${escapeHtml(p.category)}</span>
            ${p.confidence ? `<span class="ai-confidence-badge">KI ${escapeHtml(p.confidence)}</span>` : ''}
            <img src="${escapeHtml(p.image || PLACEHOLDER_IMG)}" alt="${escapeHtml(p.name)}" loading="lazy" />
          </div>
          <div class="card-body d-flex flex-column">
            <div class="d-flex justify-content-between align-items-start mb-1 gap-2">
              <small class="text-muted font-monospace text-truncate">${escapeHtml(p.sku)}</small>
              <span class="fw-bold fs-5 text-primary text-nowrap">${(Number(p.price) || 0).toFixed(2)} €</span>
            </div>
            <h5 class="card-title fw-bold mb-2 text-truncate" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</h5>
            <p class="card-text text-muted small flex-grow-1 desc-clamp">${escapeHtml(p.description || 'Keine weiteren Details vorhanden.')}</p>
            <div class="d-flex gap-2 mt-3 pt-2 border-top">
              <button type="button" class="btn btn-sm btn-outline-primary flex-grow-1" data-action="edit" data-id="${escapeHtml(p.id)}"><i class="bi bi-pencil-square me-1"></i> Bearbeiten</button>
              <button type="button" class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${escapeHtml(p.id)}" title="Löschen"><i class="bi bi-trash"></i></button>
            </div>
          </div>
        </div>
      </div>`).join('');
  }

  // Event delegation (avoids inline-onclick quoting issues)
  $('productGrid').addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'edit') openEditModal(btn.dataset.id);
    if (btn.dataset.action === 'delete') deleteProduct(btn.dataset.id);
  });

  function openEditModal(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    $('editId').value = p.id;
    $('editName').value = p.name;
    $('editPrice').value = p.price;
    $('editCategory').value = p.category;
    $('editDesc').value = p.description || '';
    bootstrap.Modal.getOrCreateInstance($('editProductModal')).show();
  }

  function updateProduct() {
    const p = products.find(x => x.id === $('editId').value);
    if (!p) return;
    p.name = $('editName').value.trim() || p.name;
    p.price = parseFloat($('editPrice').value) || 0;
    p.category = $('editCategory').value;
    p.description = $('editDesc').value.trim();
    triggerAutosave();
    renderProducts();
    bootstrap.Modal.getInstance($('editProductModal')).hide();
  }

  function deleteProduct(id) {
    if (!confirm('Dieses Produkt wirklich aus dem Shop entfernen?')) return;
    products = products.filter(p => p.id !== id);
    triggerAutosave();
    renderProducts();
  }

  function resetScannerForm() {
    $('productForm').reset();
    $('prodConfidence').value = '';
    currentImageDataUrl = '';
    stopCamera();
    setCameraUI(false);
    $('btnStartCamera').innerHTML = '<i class="bi bi-camera-fill me-1"></i> Kamera starten';
    $('capturedPreview').classList.add('d-none');
    $('cameraStream').classList.add('d-none');
    $('cameraPlaceholder').classList.remove('d-none');
  }

  /* ---------- Cloud / export ---------- */
  function saveCloudEndpoint() {
    const url = $('cloudEndpointInput').value.trim();
    if (url) {
      localStorage.setItem(CLOUD_URL_KEY, url);
      triggerAutosave();
      alert('Online-Endpoint gespeichert!');
    } else {
      localStorage.removeItem(CLOUD_URL_KEY);
      updateSyncStatus('local', 'Lokal automatisch gespeichert');
      alert('Online-Endpoint entfernt.');
    }
  }

  function exportCatalogJSON() {
    const blob = new Blob([JSON.stringify(products, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `scanshop-katalog-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function importCatalogJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const imported = JSON.parse(e.target.result);
        if (!Array.isArray(imported)) throw new Error('format');
        products = imported;
        triggerAutosave();
        renderProducts();
        alert(`${products.length} Produkte erfolgreich importiert!`);
      } catch (err) { alert('Ungültige JSON-Datei.'); }
      event.target.value = '';
    };
    reader.readAsText(file);
  }

  function clearAllProducts() {
    if (!confirm('Alle gespeicherten Produkte unwiderruflich löschen?')) return;
    products = [];
    triggerAutosave();
    renderProducts();
  }

  function scrollToCatalog() { $('catalogSection').scrollIntoView({ behavior: 'smooth' }); }

  function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }