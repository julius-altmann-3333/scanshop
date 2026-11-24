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
    setTheme(localStorage.getItem(THEME_KEY)||'black-gold-white');
    updateAccountStatus(); renderCart();
    const aiSaved=localStorage.getItem(AI_URL_KEY);if(aiSaved)$('aiEndpointInput').value=aiSaved;
    setTimeout(initAreaMap,250);

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

    let barcode='';
    try { barcode=await readBarcode(imgElement); } catch(e) {}
    let ocrText='';
    try {
      if(window.Tesseract && currentImageDataUrl){
        const ocr=await Tesseract.recognize(currentImageDataUrl,'eng+deu');
        ocrText=addOcrText(ocr.data.text);
      }
    } catch(e) { console.warn('OCR unavailable',e); }
    const enriched=await enrichProductFromImage(imgElement,barcode);
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

    if(enriched?.name)detectedName=enriched.name;
    if(enriched?.category && CATEGORIES.includes(enriched.category))detectedCategory=enriched.category;
    $('prodName').value = detectedName;
    $('prodCategory').value = detectedCategory;
    $('prodSku').value = enriched?.sku || (barcode ? 'EAN-'+barcode : 'SKU-' + Date.now().toString().slice(-6));
    if($('prodIsbn'))$('prodIsbn').value=enriched?.isbn || barcode || '';
    const sourceText=ocrText ? `Text detected on image: ${ocrText}` : 'No readable packaging text detected.';
    const identityText=enriched?.description || detailsText;
    $('prodDesc').value = [identityText,sourceText,enriched?.brand?`Brand: ${enriched.brand}`:'',enriched?.size?`Pack size: ${enriched.size}`:'',enriched?.priceSource?`Price source: ${enriched.priceSource}`:''].filter(Boolean).join('\n\n');
    if(enriched?.price && Number(enriched.price)>0)$('prodPrice').value=Number(enriched.price).toFixed(2);
    else if (!$('prodPrice').value) $('prodPrice').value = '';
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
      isbn: $('prodIsbn')?.value.trim() || '', seller: localStorage.getItem('scanshop_demo_session') || '', location: '', lat: null, lng: null,
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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    } catch (e) {
      alert('Lokaler Speicher voll! Bitte exportiere deinen Katalog als JSON.');
    }
    const cloudUrl = localStorage.getItem(CLOUD_URL_KEY);
    if (cloudUrl) {
      try {
        await fetch(cloudUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updatedAt: new Date().toISOString(), totalProducts: products.length, products })
        });
      } catch (err) {
        console.warn('Online-Sync nicht erreichbar (lokal gesichert).', err);
      }
    }
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
       (p.sku || '').toLowerCase().includes(searchTerm) || (p.isbn || '').toLowerCase().includes(searchTerm) || (p.seller || '').toLowerCase().includes(searchTerm)) && inGeofence(p));

    if (!filtered.length) {
      grid.innerHTML = '';
      $('emptyState').classList.remove('d-none');
      return;
    }
    $('emptyState').classList.add('d-none');

    grid.innerHTML = filtered.map(p => `
      <div class="col-12 col-sm-6 col-lg-4 col-xl-3">
        <div class="card product-card" data-open-product="${escapeHtml(p.id)}">
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
              <button type="button" class="btn btn-sm btn-primary-shop" data-action="cart" data-id="${escapeHtml(p.id)}" title="Add to cart"><i class="bi bi-cart-plus"></i></button>
              <button type="button" class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${escapeHtml(p.id)}" title="Löschen"><i class="bi bi-trash"></i></button>
            </div>
          </div>
        </div>
      </div>`).join('');
  }

  // Event delegation (avoids inline-onclick quoting issues)
  $('productGrid').addEventListener('click', e => {
    const card=e.target.closest('[data-open-product]');
    if(card && !e.target.closest('button')){openProductDetails(card.dataset.openProduct);return;}
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    if(btn.dataset.action==='cart'){addToCart(btn.dataset.id);return;}
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
    const aiUrl=$('aiEndpointInput')?.value.trim();if(aiUrl)localStorage.setItem(AI_URL_KEY,aiUrl);else localStorage.removeItem(AI_URL_KEY);
    const url = $('cloudEndpointInput').value.trim();
    if (url) {
      localStorage.setItem(CLOUD_URL_KEY, url);
      triggerAutosave();
      alert('Online-Endpoint gespeichert!');
    } else {
      localStorage.removeItem(CLOUD_URL_KEY);
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

  /* ---------- Themes ---------- */
  const THEME_KEY='scanshop_theme', AI_URL_KEY='scanshop_ai_endpoint';
  let areaMap=null, areaCircle=null, areaCenter=null, cart=[];
  function setTheme(theme){
    document.documentElement.dataset.theme=theme;
    localStorage.setItem(THEME_KEY,theme);
    document.querySelectorAll('.theme-option').forEach(b=>{
      const on=b.dataset.themeOption===theme;
      b.classList.toggle('active',on);
      b.setAttribute('aria-current',on?'true':'false');
    });
  }
  /* ---------- OCR, barcode and optional real-world enrichment ---------- */
  async function readBarcode(img){
    try{
      if(!('BarcodeDetector' in window))return '';
      const detector=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128','code_39','qr_code']});
      const codes=await detector.detect(img);return codes[0]?.rawValue||'';
    }catch(e){return '';}
  }
  async function enrichProductFromImage(img, barcode){
    const endpoint=localStorage.getItem(AI_URL_KEY);
    if(!endpoint)return null;
    try{
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:currentImageDataUrl,barcode,area:$('areaSearch')?.value||'',language:document.documentElement.lang})});
      if(!response.ok)throw new Error('Enrichment API returned '+response.status);
      return await response.json();
    }catch(e){console.warn('AI enrichment unavailable',e);return null;}
  }
  function addOcrText(text){
    const clean=(text||'').replace(/\s+/g,' ').trim();if(!clean)return '';
    return clean.slice(0,1200);
  }
  /* ---------- Geofencing map ---------- */
  function initAreaMap(){
    if(!window.L||areaMap)return;
    areaMap=L.map('areaMap').setView([51.0504,13.7373],11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(areaMap);
    areaMap.on('click',e=>setAreaCenter(e.latlng.lat,e.latlng.lng));
  }
  function setAreaCenter(lat,lng){
    areaCenter={lat,lng};const radius=(Number($('geoRadius').value)||15)*1000;
    if(areaCircle)areaMap.removeLayer(areaCircle);
    areaCircle=L.circle([lat,lng],{radius,color:'#c9a227',fillOpacity:.12}).addTo(areaMap);
    areaMap.setView([lat,lng],11);$('areaStatus').textContent=`Geofence center: ${lat.toFixed(4)}, ${lng.toFixed(4)} · ${radius/1000} km`;
    renderProducts();
  }
  function locateUser(){
    if(!navigator.geolocation){alert('Geolocation is not supported.');return;}
    navigator.geolocation.getCurrentPosition(pos=>{setAreaCenter(pos.coords.latitude,pos.coords.longitude);$('areaSearch').value='Current location';},()=>alert('Could not access location. Please allow location access or select an area on the map.'));
  }
  async function applyAreaSearch(){
    const query=$('areaSearch').value.trim();if(!query){alert('Enter an area or click the map to set a geofence.');return;}
    try{
      const r=await fetch('https://nominatim.openstreetmap.org/search?format=json&q='+encodeURIComponent(query));
      const data=await r.json();if(!data.length)throw new Error('No result');
      setAreaCenter(Number(data[0].lat),Number(data[0].lon));
    }catch(e){$('areaStatus').textContent='Area could not be resolved. Click the map or use your location.';}
  }
  function distanceKm(a,b,c,d){const rad=x=>x*Math.PI/180,R=6371;const x=rad(c-a),y=rad(d-b);const h=Math.sin(x/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(y/2)**2;return 2*R*Math.asin(Math.sqrt(h));}
  function inGeofence(p){if(!areaCenter||p.lat==null||p.lng==null)return true;return distanceKm(areaCenter.lat,areaCenter.lng,Number(p.lat),Number(p.lng))<=(Number($('geoRadius').value)||15);}
  /* ---------- Product detail, seller locations and cart ---------- */
  function openProductDetails(id){
    const p=products.find(x=>x.id===id);if(!p)return;
    $('detailTitle').textContent=p.name;
    $('detailBody').innerHTML=`<div class="row g-3"><div class="col-md-5"><img src="${escapeHtml(p.image||PLACEHOLDER_IMG)}" class="img-fluid rounded-3" alt="${escapeHtml(p.name)}"></div><div class="col-md-7"><div class="fs-4 fw-bold">${(Number(p.price)||0).toFixed(2)} €</div><p>${escapeHtml(p.description||'')}</p><p class="small text-muted">SKU: ${escapeHtml(p.sku||'—')} · ISBN/EAN: ${escapeHtml(p.isbn||'—')}</p><p class="small">Seller: ${escapeHtml(p.seller||'Independent seller')}<br>Location: ${escapeHtml(p.location||'Not provided')}</p><button class="btn btn-primary-shop" onclick="addToCart('${p.id}')"><i class="bi bi-cart-plus me-1"></i>Add to cart</button></div></div><div class="mt-3"><strong>Seller / product location</strong><div id="detailMap" class="mt-2"></div></div>`;
    bootstrap.Modal.getOrCreateInstance($('productDetailModal')).show();
    setTimeout(()=>{if(window.L){const m=L.map('detailMap').setView([p.lat??51.0504,p.lng??13.7373],p.lat?13:5);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap'}).addTo(m);if(p.lat&&p.lng)L.marker([p.lat,p.lng]).addTo(m).bindPopup(escapeHtml(p.seller||p.name)).openPopup();}},250);
  }
  function addToCart(id){const p=products.find(x=>x.id===id);if(!p)return;const item=cart.find(x=>x.id===id);if(item)item.qty++;else cart.push({id,qty:1});renderCart();bootstrap.Modal.getOrCreateInstance($('cartModal')).show();}
  function renderCart(){
    $('cartCount').textContent=cart.reduce((s,x)=>s+x.qty,0);
    $('cartItems').innerHTML=cart.length?cart.map(x=>{const p=products.find(y=>y.id===x.id);return p?`<div class="cart-line d-flex justify-content-between gap-2"><div><strong>${escapeHtml(p.name)}</strong><div class="small text-muted">${x.qty} × ${(Number(p.price)||0).toFixed(2)} €</div></div><div><button class="btn btn-sm btn-outline-secondary" onclick="changeCartQty('${x.id}',-1)">−</button> <button class="btn btn-sm btn-outline-secondary" onclick="changeCartQty('${x.id}',1)">+</button></div></div>`:''}).join(''):'<p class="text-muted">Your cart is empty.</p>';
    const total=cart.reduce((s,x)=>{const p=products.find(y=>y.id===x.id);return s+(p?(Number(p.price)||0)*x.qty:0);},0);$('cartTotal').textContent=total.toFixed(2)+' €';
  }
  function changeCartQty(id,d){const x=cart.find(y=>y.id===id);if(x){x.qty+=d;if(x.qty<=0)cart=cart.filter(y=>y.id!==id);}renderCart();}
  function checkoutDemo(){
    if(!cart.length){alert('Your cart is empty.');return;}
    const method=$('paymentMethod').value,fulfilment=$('fulfilment').value;
    if(fulfilment==='delivery'&&!$('checkoutAddress').value.trim()){alert('Please enter a delivery address.');return;}
    if(method==='stripe'||method==='paypal'){alert('A secure server-side Stripe/PayPal integration is required. No payment has been taken.');return;}
    const order={id:'demo_'+Date.now(),name:$('checkoutName').value,fulfilment,items:cart,createdAt:new Date().toISOString()};
    const orders=JSON.parse(localStorage.getItem('scanshop_demo_orders')||'[]');orders.push(order);localStorage.setItem('scanshop_demo_orders',JSON.stringify(orders));cart=[];renderCart();alert('Demo order saved locally. No payment was collected.');
  }
  /* ---------- Demo account and seller dashboard ---------- */
  function demoRegister(){const email=$('accountEmail').value.trim(),pw=$('accountPassword').value;if(!email||pw.length<8){alert('Enter an email and a password with at least 8 characters.');return;}const users=JSON.parse(localStorage.getItem('scanshop_demo_users')||'{}');if(users[email]){alert('Account already exists.');return;}users[email]={password:pw};localStorage.setItem('scanshop_demo_users',JSON.stringify(users));localStorage.setItem('scanshop_demo_session',email);updateAccountStatus();}
  function demoLogin(){const email=$('accountEmail').value.trim(),pw=$('accountPassword').value,users=JSON.parse(localStorage.getItem('scanshop_demo_users')||'{}');if(users[email]?.password===pw){localStorage.setItem('scanshop_demo_session',email);updateAccountStatus();}else alert('Invalid demo credentials.');}
  function demoLogout(){localStorage.removeItem('scanshop_demo_session');updateAccountStatus();}
  function updateAccountStatus(){const email=localStorage.getItem('scanshop_demo_session');$('accountStatus').textContent=email?'Signed in as '+email:'Not signed in';}
  function changeDemoPassword(){const email=localStorage.getItem('scanshop_demo_session'),pw=$('newPassword').value;if(!email){alert('Sign in first.');return;}if(pw.length<8){alert('Use at least 8 characters.');return;}const users=JSON.parse(localStorage.getItem('scanshop_demo_users')||'{}');users[email].password=pw;localStorage.setItem('scanshop_demo_users',JSON.stringify(users));$('newPassword').value='';alert('Demo password updated locally.');}
  function saveSellerProfile(){const email=localStorage.getItem('scanshop_demo_session');if(!email){alert('Sign in first.');return;}const profile={company:$('sellerCompany').value,location:$('sellerLocation').value,lat:$('sellerLat').value?Number($('sellerLat').value):null,lng:$('sellerLng').value?Number($('sellerLng').value):null};localStorage.setItem('scanshop_seller_'+email,JSON.stringify(profile));$('sellerStatus').textContent='Seller profile saved in this browser.';}
  /* ---------- Optional server-side product and local price matching ---------- */
  async function estimateLocalPrice(name,area){
    const endpoint=localStorage.getItem(AI_URL_KEY);if(!endpoint)return null;
    try{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'price-estimate',name,area:area||$('areaSearch').value, currency:'EUR'})});if(!r.ok)return null;return await r.json();}catch(e){return null;}
  }
  
