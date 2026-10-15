import * as store from './store.js';
import { openModal, closeModal, showToast, createIcon } from './ui.js';
import { getCurrentUser } from './auth.js';
import { uploadImage } from './cloudinary.js';

// ========== DASHBOARD ==========
export function renderDashboard() {
  const kpis = store.getKpis();
  const grid = document.getElementById('kpiGrid');
  if (!grid) return;

  grid.innerHTML = `
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__title">Ventas totales</div>
          <div class="card__value">${store.formatCurrency(kpis.totalSales)}</div>
        </div>
        <div class="card__icon card__icon--primary">${createIcon('sale', 20)}</div>
      </div>
      <div class="card__footer">Cobrado: ${store.formatCurrency(kpis.totalPaid)}</div>
    </div>
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__title">Por cobrar</div>
          <div class="card__value">${store.formatCurrency(kpis.pending)}</div>
        </div>
        <div class="card__icon card__icon--warning">${createIcon('payment', 20)}</div>
      </div>
      <div class="card__footer">${kpis.clientsCount} clientes</div>
    </div>
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__title">Productos</div>
          <div class="card__value">${kpis.totalProducts}</div>
        </div>
        <div class="card__icon card__icon--info">${createIcon('product', 20)}</div>
      </div>
      <div class="card__footer">Stock total: ${kpis.totalStock} uds</div>
    </div>
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__title">Stock bajo</div>
          <div class="card__value">${kpis.lowStock}</div>
        </div>
        <div class="card__icon card__icon--danger">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
      </div>
      <div class="card__footer">Valor inv: ${store.formatCurrency(kpis.inventoryValue)}</div>
    </div>
  `;

  // Activity
  const activityList = document.getElementById('activityList');
  const activities = store.getRecentActivity();
  if (activities.length === 0) {
    activityList.innerHTML = `<div class="empty-state"><p class="empty-state__text">Sin movimientos aún. ¡Registra tu primera venta!</p></div>`;
  } else {
    activityList.innerHTML = activities.map(a => `
      <div class="activity-item">
        <div class="activity-item__icon card__icon--${a.type === 'sale' ? 'primary' : 'success'}">
          ${createIcon(a.icon, 16)}
        </div>
        <div class="activity-item__content">
          <div class="activity-item__title">${a.title}</div>
          <div class="activity-item__meta">${a.meta}</div>
        </div>
      </div>
    `).join('');
  }

  // Low stock table
  const lowStock = store.getLowStockProducts(5);
  const tbody = document.querySelector('#lowStockTable tbody');
  if (lowStock.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Todo el inventario tiene stock suficiente</td></tr>`;
  } else {
    tbody.innerHTML = lowStock.map(p => `
      <tr>
        <td>${p.name}</td>
        <td>${store.getCategoryName(p.categoryId)}</td>
        <td class="${p.stock <= 2 ? 'stock-low' : 'text-warning'}">
          ${p.stock}${p.unitsPerPackage > 1 ? ` paq · ${p.stock * p.unitsPerPackage} uds` : ''}
        </td>
        <td>${store.formatCurrency(p.salePrice)}</td>
      </tr>
    `).join('');
  }
}

// ========== PRODUCTS ==========
export function renderProducts() {
  const search = document.getElementById('productSearch')?.value?.toLowerCase() || '';
  const catFilter = document.getElementById('productCategoryFilter')?.value || '';
  const supplierFilter = document.getElementById('productSupplierFilter')?.value || '';
  const tagsFilter = document.getElementById('productTagsFilter')?.value || '';

  let products = store.getProducts();
  if (search) {
    products = products.filter(p =>
      p.name.toLowerCase().includes(search) ||
      (p.brand || '').toLowerCase().includes(search) ||
      (p.model || '').toLowerCase().includes(search) ||
      (p.supplier || '').toLowerCase().includes(search)
    );
  }
  if (catFilter) {
    products = products.filter(p => p.categoryId === catFilter);
  }
  if (supplierFilter) {
    products = products.filter(p => (p.supplier || '') === supplierFilter);
  }
  if (tagsFilter) {
    products = products.filter(p => (p.tags || '') === tagsFilter);
  }

  // Fill category filter
  const catSelect = document.getElementById('productCategoryFilter');
  if (catSelect && catSelect.options.length <= 1) {
    store.getCategories().forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      catSelect.appendChild(opt);
    });
  }

  // Fill supplier filter dynamically
  const supplierSelect = document.getElementById('productSupplierFilter');
  if (supplierSelect) {
    const current = supplierSelect.value;
    const suppliers = [...new Set(store.getProducts().map(p => p.supplier).filter(Boolean))].sort();
    supplierSelect.innerHTML = '<option value="">Todos los proveedores</option>' +
      suppliers.map(s => `<option value="${s}" ${s === current ? 'selected' : ''}>${s}</option>`).join('');
  }

  const grid = document.getElementById('productGrid');
  if (products.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
        <div class="empty-state__title">Sin productos</div>
        <div class="empty-state__text">Agrega tu primer producto para empezar</div>
      </div>`;
    return;
  }

  grid.innerHTML = products.map(p => `
    <div class="product-card" data-id="${p.id}">
      <div class="product-card__img">
        ${p.imageUrl
          ? `<img src="${p.imageUrl}" alt="${p.name}" loading="lazy">`
          : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`
        }
      </div>
      <div class="product-card__body">
        <div class="product-card__name" title="${p.name}">${p.name}</div>
        <div class="product-card__meta">${store.getCategoryName(p.categoryId)}${p.tags ? ' · ' + p.tags : ''}${p.brand ? ' · ' + p.brand : ''}${p.model ? ' · ' + p.model : ''}</div>
        ${p.supplier ? `<div class="product-card__meta" style="font-size:0.75rem;">Proveedor: ${p.supplier}</div>` : ''}
        ${p.purchaseDate ? `<div class="product-card__meta" style="font-size:0.75rem;">Compra: ${store.formatDate(p.purchaseDate)}</div>` : ''}
        ${p.unitsPerPackage > 1 ? `<div class="product-card__meta" style="font-size:0.75rem;">${p.unitsPerPackage} uds por paquete</div>` : ''}
        <div class="product-card__prices">
          <span class="product-card__price">${store.formatCurrency(p.salePrice)}</span>
          <span class="product-card__stock ${p.stock <= 5 ? 'stock-low' : 'stock-ok'}">
            ${p.stock} ${p.unitsPerPackage > 1 ? 'paq' : 'uds'}${p.unitsPerPackage > 1 ? ` · ${p.stock * p.unitsPerPackage} uds` : ''}
          </span>
        </div>
        <div class="table__actions" style="margin-top: 0.5rem;">
          <button type="button" class="btn btn--ghost btn--sm btn-edit-product" data-id="${p.id}" title="Editar">${createIcon('edit', 16)}</button>
          <button type="button" class="btn btn--ghost btn--sm btn-delete-product" data-id="${p.id}" title="Eliminar">${createIcon('trash', 16)}</button>
        </div>
      </div>
    </div>
  `).join('');

  // Bind actions
  grid.querySelectorAll('.btn-edit-product').forEach(btn => {
    btn.addEventListener('click', () => openProductForm(btn.dataset.id));
  });
  grid.querySelectorAll('.btn-delete-product').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('¿Eliminar este producto?')) {
        store.deleteProduct(btn.dataset.id);
        showToast('Producto eliminado', 'success');
        renderProducts();
      }
    });
  });
}

export function openProductForm(editId = null) {
  const product = editId ? store.getProduct(editId) : null;
  const categories = store.getCategories();
  const catOptions = categories.map(c =>
    `<option value="${c.id}" ${product?.categoryId === c.id ? 'selected' : ''}>${c.name}</option>`
  ).join('');

  const today = new Date().toISOString().slice(0, 10);
  const body = `
    <form class="form" id="productForm">
      <div class="form__group">
        <label class="form__label">Categoría <span class="required">*</span></label>
        <select class="form__select" name="categoryId" required>${catOptions}</select>
      </div>
      <div class="form__group">
        <label class="form__label">Etiqueta / Tipo general</label>
        <select class="form__select" name="tags">
          <option value="">— Ninguna —</option>
          <option value="Electrónica" ${product?.tags === 'Electrónica' ? 'selected' : ''}>Electrónica</option>
          <option value="Hogar" ${product?.tags === 'Hogar' ? 'selected' : ''}>Hogar</option>
          <option value="Ropa" ${product?.tags === 'Ropa' ? 'selected' : ''}>Ropa</option>
          <option value="Herramientas" ${product?.tags === 'Herramientas' ? 'selected' : ''}>Herramientas</option>
          <option value="Navideño" ${product?.tags === 'Navideño' ? 'selected' : ''}>Navideño</option>
          <option value="Cocina" ${product?.tags === 'Cocina' ? 'selected' : ''}>Cocina</option>
          <option value="Tecnología" ${product?.tags === 'Tecnología' ? 'selected' : ''}>Tecnología</option>
          <option value="Otros" ${product?.tags === 'Otros' ? 'selected' : ''}>Otros</option>
        </select>
        <p class="form__hint">Agrupación general para reportes (además de la categoría específica)</p>
      </div>
      <div class="form__group">
        <label class="form__label">Nombre / Descripción <span class="required">*</span></label>
        <input type="text" class="form__input" name="name" required value="${product?.name || ''}" placeholder="Ej. Lámpara LED Bicicleta">
      </div>
      <div class="form__row">
        <div class="form__group">
          <label class="form__label">Marca</label>
          <input type="text" class="form__input" name="brand" value="${product?.brand || ''}" placeholder="Büytiti">
        </div>
        <div class="form__group">
          <label class="form__label">Modelo</label>
          <input type="text" class="form__input" name="model" value="${product?.model || ''}" placeholder="LED-733">
        </div>
      </div>
      <div class="form__group">
        <label class="form__label">Descripción adicional</label>
        <textarea class="form__textarea" name="description" placeholder="Especificaciones...">${product?.description || ''}</textarea>
      </div>
      <div class="form__group">
        <label class="form__label">Proveedor / Local de compra</label>
        <input type="text" class="form__input" name="supplier" value="${product?.supplier || ''}" placeholder="Ej. China Shop, Fixez Accesorio">
        <p class="form__hint">Negocio o local donde compraste el producto</p>
      </div>
      <div class="form__row">
        <div class="form__group">
          <label class="form__label">Fecha de compra</label>
          <input type="date" class="form__input" name="purchaseDate" value="${product?.purchaseDate || today}">
          <p class="form__hint">Por defecto hoy. Puedes cambiarla</p>
        </div>
        <div class="form__group">
          <label class="form__label">Stock inicial <span class="required">*</span></label>
          <input type="number" class="form__input" name="stock" min="0" required value="${product?.stock ?? 0}">
          <p class="form__hint">Cantidad de paquetes/unidades que vendes</p>
        </div>
      </div>
      <div class="form__row">
        <div class="form__group">
          <label class="form__label">Unidades por paquete</label>
          <input type="number" class="form__input" name="unitsPerPackage" min="1" step="1" value="${product?.unitsPerPackage ?? 1}">
          <p class="form__hint">Ej. 4 si vendes paquetes de 4 pilas. Déjalo en 1 si vendes suelto.</p>
        </div>
        <div class="form__group">
          <label class="form__label">Precio compra <span class="required">*</span></label>
          <input type="number" class="form__input" name="purchasePrice" min="0" step="0.01" required value="${product?.purchasePrice ?? ''}">
          <p class="form__hint">Precio por paquete/unidad que vendes</p>
        </div>
      </div>
      <div class="form__group">
        <label class="form__label">Precio venta <span class="required">*</span></label>
        <input type="number" class="form__input" name="salePrice" min="0" step="0.01" required value="${product?.salePrice ?? ''}">
        <p class="form__hint">Precio al público por paquete/unidad. Editable después.</p>
      </div>
      <div class="form__group">
        <label class="form__label">Imagen del producto</label>
        <div class="image-upload" id="imageUploadZone">
          <img class="image-upload__preview ${product?.imageUrl ? 'is-visible' : ''}" id="imagePreview" src="${product?.imageUrl || ''}" alt="Vista previa">
          <p class="image-upload__text" id="imageUploadText">${product?.imageUrl ? 'Toca para cambiar imagen' : 'Toca o arrastra una imagen aquí'}</p>
          <input type="file" id="imageFileInput" accept="image/*" style="display:none">
        </div>
        <input type="hidden" name="imageUrl" id="productImageUrl" value="${product?.imageUrl || ''}">
        <p class="form__hint">Subida directa a Cloudinary (configura el Upload Preset unsigned en Configuración).</p>
        <p class="form__error" id="imageUploadError" style="display:none;"></p>
      </div>
    </form>
  `;

  const footer = `
    <button type="button" class="btn btn--secondary" id="modalCancel">Cancelar</button>
    <button type="button" class="btn btn--primary" id="modalSaveProduct">${editId ? 'Guardar' : 'Agregar'}</button>
  `;

  openModal(editId ? 'Editar producto' : 'Agregar producto', body, footer);

  // Image upload UI
  const zone = document.getElementById('imageUploadZone');
  const fileInput = document.getElementById('imageFileInput');
  const preview = document.getElementById('imagePreview');
  const uploadText = document.getElementById('imageUploadText');
  const imageUrlInput = document.getElementById('productImageUrl');
  const imageError = document.getElementById('imageUploadError');
  let pendingFile = null;

  zone?.addEventListener('click', () => fileInput?.click());
  zone?.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('is-dragover'); });
  zone?.addEventListener('dragleave', () => zone.classList.remove('is-dragover'));
  zone?.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('is-dragover');
    const file = e.dataTransfer?.files?.[0];
    if (file) handleImageFile(file);
  });
  fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) handleImageFile(file);
  });

  function handleImageFile(file) {
    pendingFile = file;
    imageError.style.display = 'none';
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      preview.classList.add('is-visible');
      uploadText.textContent = 'Imagen lista · se subirá al guardar';
    };
    reader.readAsDataURL(file);
  }

  document.getElementById('modalCancel')?.addEventListener('click', closeModal);
  document.getElementById('modalSaveProduct')?.addEventListener('click', async () => {
    const form = document.getElementById('productForm');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const saveBtn = document.getElementById('modalSaveProduct');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando…';

    let imageUrl = imageUrlInput.value.trim();

    try {
      if (pendingFile) {
        saveBtn.textContent = 'Subiendo imagen…';
        imageUrl = await uploadImage(pendingFile);
      }

      const fd = new FormData(form);
      const payload = {
        categoryId: fd.get('categoryId'),
        name: fd.get('name').trim(),
        brand: fd.get('brand').trim(),
        model: fd.get('model').trim(),
        description: fd.get('description').trim(),
        supplier: fd.get('supplier').trim(),
        purchaseDate: fd.get('purchaseDate') || today,
        tags: fd.get('tags') || '',
        stock: Number(fd.get('stock')),
        unitsPerPackage: Number(fd.get('unitsPerPackage')) || 1,
        purchasePrice: Number(fd.get('purchasePrice')),
        salePrice: Number(fd.get('salePrice')),
        imageUrl
      };

      if (editId) {
        store.updateProduct(editId, payload);
        showToast('Producto actualizado', 'success');
      } else {
        store.addProduct(payload);
        showToast('Producto agregado', 'success');
      }
      closeModal();
      renderProducts();
    } catch (err) {
      imageError.textContent = err.message || 'Error al subir imagen';
      imageError.style.display = 'block';
      showToast(err.message || 'Error al guardar', 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = editId ? 'Guardar' : 'Agregar';
    }
  });
}

export function openRestockForm() {
  const products = store.getProducts();
  if (products.length === 0) {
    showToast('No hay productos para resurtir', 'info');
    return;
  }

  const options = products.map(p =>
    `<option value="${p.id}">${p.name} (stock: ${p.stock})</option>`
  ).join('');

  const body = `
    <form class="form" id="restockForm">
      <div class="form__group">
        <label class="form__label">Producto <span class="required">*</span></label>
        <select class="form__select" name="productId" required>${options}</select>
      </div>
      <div class="form__group">
        <label class="form__label">Cantidad a agregar <span class="required">*</span></label>
        <input type="number" class="form__input" name="quantity" min="1" required value="1">
      </div>
    </form>
  `;

  const footer = `
    <button type="button" class="btn btn--secondary" id="modalCancel">Cancelar</button>
    <button type="button" class="btn btn--primary" id="modalSaveRestock">Resurtir</button>
  `;

  openModal('Resurtir producto', body, footer);

  document.getElementById('modalCancel')?.addEventListener('click', closeModal);
  document.getElementById('modalSaveRestock')?.addEventListener('click', () => {
    const form = document.getElementById('restockForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const fd = new FormData(form);
    store.restockProduct(fd.get('productId'), Number(fd.get('quantity')));
    showToast('Stock actualizado', 'success');
    closeModal();
    renderProducts();
  });
}

// ========== CLIENTS ==========
export function renderClients() {
  const search = document.getElementById('clientSearch')?.value?.toLowerCase() || '';
  let clients = store.getClients();
  if (search) {
    clients = clients.filter(c =>
      c.name.toLowerCase().includes(search) ||
      (c.area || '').toLowerCase().includes(search) ||
      (c.whatsapp || '').includes(search)
    );
  }

  const tbody = document.querySelector('#clientsTable tbody');
  if (clients.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Sin clientes registrados</td></tr>`;
    return;
  }

  tbody.innerHTML = clients.map(c => `
    <tr>
      <td class="font-semibold">${c.name}</td>
      <td>${c.area || '—'}</td>
      <td>
        ${c.whatsapp
          ? `<a href="https://wa.me/52${c.whatsapp.replace(/\D/g, '')}" target="_blank" rel="noopener" class="text-primary" style="display:inline-flex;align-items:center;gap:0.25rem;">
              ${createIcon('whatsapp', 16)} ${c.whatsapp}
            </a>`
          : '—'}
      </td>
      <td>${c.sellerName || '—'}</td>
      <td>
        <div class="table__actions">
          <button type="button" class="btn btn--ghost btn--sm btn-edit-client" data-id="${c.id}" title="Editar">${createIcon('edit', 16)}</button>
          <button type="button" class="btn btn--ghost btn--sm btn-delete-client" data-id="${c.id}" title="Eliminar">${createIcon('trash', 16)}</button>
        </div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.btn-edit-client').forEach(btn => {
    btn.addEventListener('click', () => openClientForm(btn.dataset.id));
  });
  tbody.querySelectorAll('.btn-delete-client').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('¿Eliminar este cliente?')) {
        store.deleteClient(btn.dataset.id);
        showToast('Cliente eliminado', 'success');
        renderClients();
      }
    });
  });
}

export function openClientForm(editId = null) {
  const client = editId ? store.getClient(editId) : null;
  const user = getCurrentUser();

  const body = `
    <form class="form" id="clientForm">
      <div class="form__group">
        <label class="form__label">Nombre <span class="required">*</span></label>
        <input type="text" class="form__input" name="name" required value="${client?.name || ''}" placeholder="Nombre completo">
      </div>
      <div class="form__group">
        <label class="form__label">Área/Parentesco/Colonia</label>
        <input type="text" class="form__input" name="area" value="${client?.area || ''}" placeholder="Ej. Centro, Hermano, Hijo, GAM">
      </div>
      <div class="form__group">
        <label class="form__label">WhatsApp</label>
        <input type="tel" class="form__input" name="whatsapp" value="${client?.whatsapp || ''}" placeholder="5512345678">
        <p class="form__hint">Solo números, sin +52</p>
      </div>
      <div class="form__group">
        <label class="form__label">Notas</label>
        <textarea class="form__textarea" name="notes">${client?.notes || ''}</textarea>
      </div>
      ${!editId ? `
      <div class="form__group">
        <label class="form__label">Registrado por</label>
        <input type="text" class="form__input" value="${user?.name || '—'}" readonly style="opacity:0.8;background:var(--color-bg-elevated);">
        <p class="form__hint">Se guarda automáticamente el usuario que está logueado</p>
      </div>
      ` : (client?.sellerName ? `
      <div class="form__group">
        <label class="form__label">Registrado por</label>
        <input type="text" class="form__input" value="${client.sellerName}" readonly style="opacity:0.8;background:var(--color-bg-elevated);">
      </div>
      ` : '')}
    </form>
  `;

  const footer = `
    <button type="button" class="btn btn--secondary" id="modalCancel">Cancelar</button>
    <button type="button" class="btn btn--primary" id="modalSaveClient">${editId ? 'Guardar' : 'Agregar'}</button>
  `;

  openModal(editId ? 'Editar cliente' : 'Agregar cliente', body, footer);

  document.getElementById('modalCancel')?.addEventListener('click', closeModal);
  document.getElementById('modalSaveClient')?.addEventListener('click', () => {
    const form = document.getElementById('clientForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const fd = new FormData(form);
    const payload = {
      name: fd.get('name').trim(),
      area: fd.get('area').trim(),
      whatsapp: fd.get('whatsapp').trim(),
      notes: fd.get('notes').trim()
    };
    if (editId) {
      store.updateClient(editId, payload);
      showToast('Cliente actualizado', 'success');
    } else {
      payload.sellerId = user?.id || null;
      payload.sellerName = user?.name || '—';
      store.addClient(payload);
      showToast('Cliente agregado', 'success');
    }
    closeModal();
    renderClients();
  });
}

// ========== SALES ==========
export function renderSales() {
  const search = document.getElementById('saleSearch')?.value?.toLowerCase() || '';
  const statusFilter = document.getElementById('saleStatusFilter')?.value || '';

  let sales = store.getSales();
  if (search) {
    sales = sales.filter(s => {
      const client = store.getClient(s.clientId);
      return (client?.name || '').toLowerCase().includes(search);
    });
  }
  if (statusFilter) {
    sales = sales.filter(s => s.status === statusFilter);
  }

  const tbody = document.querySelector('#salesTable tbody');
  if (sales.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Sin ventas registradas</td></tr>`;
    return;
  }

  const statusBadge = {
    paid: '<span class="badge badge--success">Pagada</span>',
    partial: '<span class="badge badge--warning">Parcial</span>',
    delivered: '<span class="badge badge--info">Entregada</span>',
    confirmed: '<span class="badge badge--secondary">Confirmada</span>',
    pending: '<span class="badge badge--danger">Pendiente</span>'
  };

  tbody.innerHTML = sales.map(s => {
    const client = store.getClient(s.clientId);
    const pct = s.total > 0 ? Math.round((s.paid / s.total) * 100) : 0;
    return `
      <tr>
        <td>${store.formatDate(s.createdAt)}</td>
        <td class="font-semibold">${client?.name || '—'}</td>
        <td>${s.sellerName || '—'}</td>
        <td>${store.formatCurrency(s.total)}</td>
        <td>
          <div>${store.formatCurrency(s.paid)}</div>
          <div class="progress-bar" style="margin-top:0.25rem;width:5rem;">
            <div class="progress-bar__fill ${pct < 50 ? 'progress-bar__fill--danger' : pct < 100 ? 'progress-bar__fill--warning' : ''}" style="width:${pct}%"></div>
          </div>
        </td>
        <td>${statusBadge[s.status] || s.status}</td>
        <td>
          <div class="table__actions">
            <button type="button" class="btn btn--ghost btn--sm btn-view-sale" data-id="${s.id}" title="Ver / Pagar">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button type="button" class="btn btn--ghost btn--sm btn-edit-sale" data-id="${s.id}" title="Editar venta">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button type="button" class="btn btn--ghost btn--sm btn-ticket-sale" data-id="${s.id}" title="Descargar ticket">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.btn-view-sale').forEach(btn => {
    btn.addEventListener('click', () => openSaleDetail(btn.dataset.id));
  });
  tbody.querySelectorAll('.btn-edit-sale').forEach(btn => {
    btn.addEventListener('click', () => openEditSale(btn.dataset.id));
  });
  tbody.querySelectorAll('.btn-ticket-sale').forEach(btn => {
    btn.addEventListener('click', () => downloadSaleTicket(btn.dataset.id));
  });
}

export function openSaleForm() {
  const clients = store.getClients();
  const products = store.getProducts().filter(p => p.stock > 0);

  if (clients.length === 0) {
    showToast('Agrega un cliente primero', 'info');
    return;
  }
  if (products.length === 0) {
    showToast('No hay productos con stock', 'info');
    return;
  }

  const user = getCurrentUser();
  const clientOpts = clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  const productOpts = products.map(p =>
    `<option value="${p.id}" data-price="${p.salePrice}" data-stock="${p.stock}">${p.name} — ${store.formatCurrency(p.salePrice)} (stock: ${p.stock})</option>`
  ).join('');

  const body = `
    <form class="form" id="saleForm">
      <div class="form__group">
        <label class="form__label">Vendedor</label>
        <input type="text" class="form__input" value="${user?.name || '—'}" disabled style="opacity:0.85;">
        <p class="form__hint">Se registra automáticamente el usuario activo</p>
      </div>
      <div class="form__group">
        <label class="form__label">Cliente <span class="required">*</span></label>
        <div class="search-select" id="clientSearchSelect">
          <input type="text" class="form__input" id="clientSearchInput" placeholder="Buscar cliente por nombre..." autocomplete="off">
          <input type="hidden" name="clientId" id="clientIdHidden" required>
          <div class="search-select__list" id="clientSearchList" hidden></div>
        </div>
      </div>
      <div class="form__group">
        <label class="form__label">Producto <span class="required">*</span></label>
        <div class="search-select" id="productSearchSelect">
          <input type="text" class="form__input" id="productSearchInput" placeholder="Buscar producto por nombre..." autocomplete="off">
          <input type="hidden" id="productIdHidden">
          <div class="search-select__list" id="productSearchList" hidden></div>
        </div>
      </div>
      <div class="form__row">
        <div class="form__group">
          <label class="form__label">Cantidad</label>
          <input type="number" class="form__input" id="saleQty" min="1" value="1">
        </div>
        <div class="form__group">
          <label class="form__label">&nbsp;</label>
          <button type="button" class="btn btn--secondary w-full" id="btnAddItem">Agregar al carrito</button>
        </div>
      </div>
      <div class="form__group">
        <label class="form__label">Carrito</label>
        <div id="saleCart" class="card" style="padding:0.75rem;min-height:3rem;">
          <p class="text-muted text-center" style="font-size:var(--text-sm);">Vacío</p>
        </div>
      </div>
      <div class="form__group">
        <label class="form__label">Pago inicial (50% recomendado)</label>
        <input type="number" class="form__input" name="initialPayment" id="saleInitialPayment" min="0" step="0.01" placeholder="Se calcula al 50%">
        <p class="form__hint">Deja vacío para 50% automático. Puedes registrar el resto después.</p>
      </div>
      <div class="form__group">
        <label class="form__label">Método de pago</label>
        <select class="form__select" name="paymentMethod">
          <option value="efectivo">Efectivo</option>
          <option value="transferencia">Transferencia</option>
          <option value="tarjeta">Tarjeta</option>
        </select>
      </div>
      <div class="form__group">
        <label class="form__label">Notas</label>
        <textarea class="form__textarea" name="notes"></textarea>
      </div>
    </form>
  `;

  const footer = `
    <button type="button" class="btn btn--secondary" id="modalCancel">Cancelar</button>
    <button type="button" class="btn btn--primary" id="modalSaveSale">Registrar venta</button>
  `;

  openModal('Nueva venta', body, footer);

  // Searchable selects
  function setupSearchSelect(inputId, listId, hiddenId, items, renderItem, onSelect) {
    const input = document.getElementById(inputId);
    const list = document.getElementById(listId);
    const hidden = document.getElementById(hiddenId);
    let selected = null;

    function showList(filter = '') {
      const q = filter.toLowerCase();
      const filtered = items.filter(item => renderItem(item).text.toLowerCase().includes(q));
      if (filtered.length === 0) {
        list.innerHTML = `<div class="search-select__item search-select__item--empty">Sin resultados</div>`;
      } else {
        list.innerHTML = filtered.map(item => {
          const r = renderItem(item);
          return `<div class="search-select__item" data-id="${r.id}">${r.html}</div>`;
        }).join('');
      }
      list.hidden = false;
      list.querySelectorAll('.search-select__item[data-id]').forEach(el => {
        el.addEventListener('click', () => {
          const id = el.dataset.id;
          selected = items.find(i => i.id === id);
          if (selected) {
            const r = renderItem(selected);
            input.value = r.text;
            hidden.value = id;
            list.hidden = true;
            if (onSelect) onSelect(selected);
          }
        });
      });
    }

    input.addEventListener('input', () => showList(input.value));
    input.addEventListener('focus', () => showList(input.value));
    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !list.contains(e.target)) list.hidden = true;
    });

    return {
      getSelected: () => selected,
      clear: () => {
        selected = null;
        input.value = '';
        hidden.value = '';
      }
    };
  }

  const clientSelect = setupSearchSelect(
    'clientSearchInput',
    'clientSearchList',
    'clientIdHidden',
    clients,
    (c) => ({ id: c.id, text: c.name, html: `<strong>${c.name}</strong>${c.area ? `<br><small style="color:var(--color-text-muted)">${c.area}</small>` : ''}` }),
    null
  );

  let selectedProduct = null;
  const productSelect = setupSearchSelect(
    'productSearchInput',
    'productSearchList',
    'productIdHidden',
    products,
    (p) => ({
      id: p.id,
      text: p.name,
      html: `<strong>${p.name}</strong><br><small style="color:var(--color-text-muted)">${store.formatCurrency(p.salePrice)} · stock: ${p.stock}${p.unitsPerPackage > 1 ? ` (${p.unitsPerPackage} uds/paq)` : ''}</small>`
    }),
    (p) => { selectedProduct = p; }
  );

  let cart = [];

  function updateCartUI() {
    const el = document.getElementById('saleCart');
    if (cart.length === 0) {
      el.innerHTML = `<p class="text-muted text-center" style="font-size:var(--text-sm);">Vacío</p>`;
      return;
    }
    const total = cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    el.innerHTML = cart.map((item, idx) => `
      <div class="flex justify-between items-center" style="padding:0.25rem 0;border-bottom:1px solid var(--color-border);">
        <span style="font-size:var(--text-sm);">${item.name} × ${item.quantity}</span>
        <span class="flex items-center gap-2">
          <span style="font-size:var(--text-sm);font-weight:600;">${store.formatCurrency(item.quantity * item.unitPrice)}</span>
          <button type="button" class="btn btn--ghost btn--sm btn-remove-item" data-idx="${idx}">×</button>
        </span>
      </div>
    `).join('') + `<div class="font-bold" style="margin-top:0.5rem;text-align:right;">Total: ${store.formatCurrency(total)}</div>`;

    document.getElementById('saleInitialPayment').placeholder = store.formatCurrency(total * 0.5);

    el.querySelectorAll('.btn-remove-item').forEach(btn => {
      btn.addEventListener('click', () => {
        cart.splice(Number(btn.dataset.idx), 1);
        updateCartUI();
      });
    });
  }

  document.getElementById('btnAddItem')?.addEventListener('click', () => {
    const qty = Number(document.getElementById('saleQty').value) || 1;
    const prod = productSelect.getSelected();
    if (!prod) {
      showToast('Selecciona un producto', 'error');
      return;
    }
    if (qty > prod.stock) {
      showToast(`Stock insuficiente (máx ${prod.stock})`, 'error');
      return;
    }
    const existing = cart.find(i => i.productId === prod.id);
    if (existing) {
      if (existing.quantity + qty > prod.stock) {
        showToast('Stock insuficiente', 'error');
        return;
      }
      existing.quantity += qty;
    } else {
      cart.push({
        productId: prod.id,
        name: prod.name,
        quantity: qty,
        unitPrice: prod.salePrice
      });
    }
    updateCartUI();
    productSelect.clear();
  });

  document.getElementById('modalCancel')?.addEventListener('click', closeModal);
  document.getElementById('modalSaveSale')?.addEventListener('click', () => {
    if (cart.length === 0) {
      showToast('Agrega al menos un producto', 'error');
      return;
    }
    const form = document.getElementById('saleForm');
    const fd = new FormData(form);
    const total = cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    let initial = fd.get('initialPayment');
    initial = initial === '' || initial === null ? Math.round(total * 0.5 * 100) / 100 : Number(initial);

    const user = getCurrentUser();
    store.addSale({
      clientId: fd.get('clientId'),
      items: cart,
      initialPayment: initial,
      paymentMethod: fd.get('paymentMethod'),
      notes: fd.get('notes'),
      sellerId: user?.id || null,
      sellerName: user?.name || '—'
    });
    showToast('Venta registrada', 'success');
    closeModal();
    renderSales();
  });
}

export function openEditSale(saleId) {
  const sale = store.getSale(saleId);
  if (!sale) return;

  const body = `
    <form class="form" id="editSaleForm">
      <div class="form__group">
        <label class="form__label">Estado</label>
        <select class="form__select" name="status">
          <option value="confirmed" ${sale.status === 'confirmed' ? 'selected' : ''}>Confirmada</option>
          <option value="delivered" ${sale.status === 'delivered' ? 'selected' : ''}>Entregada</option>
          <option value="partial" ${sale.status === 'partial' ? 'selected' : ''}>Parcial</option>
          <option value="paid" ${sale.status === 'paid' ? 'selected' : ''}>Pagada</option>
          <option value="pending" ${sale.status === 'pending' ? 'selected' : ''}>Pendiente</option>
        </select>
      </div>
      <div class="form__group">
        <label class="form__label">Total pagado (corregir si hubo error)</label>
        <input type="number" class="form__input" name="paid" min="0" step="0.01" value="${sale.paid}">
        <p class="form__hint">Total de la venta: ${store.formatCurrency(sale.total)}</p>
      </div>
      <div class="form__group">
        <label class="form__label">Notas</label>
        <textarea class="form__textarea" name="notes">${sale.notes || ''}</textarea>
      </div>
    </form>
  `;

  const footer = `
    <button type="button" class="btn btn--secondary" id="modalCancel">Cancelar</button>
    <button type="button" class="btn btn--primary" id="modalSaveEdit">Guardar cambios</button>
  `;

  openModal('Editar venta', body, footer);

  document.getElementById('modalCancel')?.addEventListener('click', closeModal);
  document.getElementById('modalSaveEdit')?.addEventListener('click', () => {
    const form = document.getElementById('editSaleForm');
    const fd = new FormData(form);
    const paid = Number(fd.get('paid'));
    const status = fd.get('status');
    store.updateSale(saleId, {
      paid,
      status,
      notes: fd.get('notes').trim()
    });
    showToast('Venta actualizada', 'success');
    closeModal();
    renderSales();
  });
}

export function downloadSaleTicket(saleId) {
  const sale = store.getSale(saleId);
  if (!sale) return;
  const client = store.getClient(sale.clientId);
  const payments = store.getPayments(saleId);
  const remaining = Math.max(0, sale.total - sale.paid);

  const statusLabel = {
    paid: 'PAGADA',
    partial: 'PAGO PARCIAL',
    delivered: 'ENTREGADA (pendiente de pago)',
    confirmed: 'CONFIRMADA',
    pending: 'PENDIENTE'
  }[sale.status] || sale.status.toUpperCase();

  const items = sale.items.map(item => {
    const p = store.getProduct(item.productId);
    return `${p?.name || 'Producto'} x${item.quantity}  ${store.formatCurrency(item.subtotal)}`;
  }).join('\n');

  const payLines = payments.map(p =>
    `${store.formatDate(p.paymentDate)}  ${store.formatCurrency(p.amount)}  (${p.method || '—'})`
  ).join('\n') || 'Sin pagos registrados';

  const ticket = `
NOVEDADES N&L
========================
Fecha: ${store.formatDate(sale.createdAt)}
Cliente: ${client?.name || '—'}
Área: ${client?.area || '—'}
Vendedor: ${sale.sellerName || '—'}

PRODUCTOS
${items}

------------------------
Total:     ${store.formatCurrency(sale.total)}
Pagado:    ${store.formatCurrency(sale.paid)}
Pendiente: ${store.formatCurrency(remaining)}

ESTADO: ${statusLabel}

PAGOS
${payLines}

${sale.notes ? 'Notas: ' + sale.notes + '\n' : ''}
Gracias por tu compra
Novedades N&L
`.trim();

  const blob = new Blob([ticket], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ticket-${sale.id.slice(-8)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Ticket descargado', 'success');
}

export function openSaleDetail(saleId) {
  const sale = store.getSale(saleId);
  if (!sale) return;
  const client = store.getClient(sale.clientId);
  const payments = store.getPayments(saleId);
  const remaining = sale.total - sale.paid;

  const itemsHtml = sale.items.map(item => {
    const p = store.getProduct(item.productId);
    return `<div class="flex justify-between" style="font-size:var(--text-sm);padding:0.25rem 0;">
      <span>${p?.name || 'Producto'} × ${item.quantity}</span>
      <span>${store.formatCurrency(item.subtotal)}</span>
    </div>`;
  }).join('');

  const paymentsHtml = payments.length
    ? payments.map(p => `<div class="flex justify-between" style="font-size:var(--text-sm);padding:0.25rem 0;">
        <span>${store.formatDateTime(p.paymentDate)} · ${p.method}</span>
        <span class="text-success">${store.formatCurrency(p.amount)}</span>
      </div>`).join('')
    : '<p class="text-muted" style="font-size:var(--text-sm);">Sin pagos registrados</p>';

  const body = `
    <div style="margin-bottom:1rem;">
      <div class="text-muted" style="font-size:var(--text-xs);">Cliente</div>
      <div class="font-semibold">${client?.name || '—'}</div>
      ${client?.whatsapp ? `<a href="https://wa.me/52${client.whatsapp.replace(/\D/g, '')}" target="_blank" class="text-primary" style="font-size:var(--text-sm);">${client.whatsapp}</a>` : ''}
      <div class="text-muted" style="font-size:var(--text-xs);margin-top:0.5rem;">Vendedor: <strong style="color:var(--color-text)">${sale.sellerName || '—'}</strong></div>
    </div>
    <div class="card" style="margin-bottom:1rem;padding:0.75rem;">
      <div class="font-semibold" style="margin-bottom:0.5rem;">Productos</div>
      ${itemsHtml}
      <div class="flex justify-between font-bold" style="margin-top:0.5rem;border-top:1px solid var(--color-border);padding-top:0.5rem;">
        <span>Total</span><span>${store.formatCurrency(sale.total)}</span>
      </div>
      <div class="flex justify-between" style="font-size:var(--text-sm);">
        <span>Pagado</span><span class="text-success">${store.formatCurrency(sale.paid)}</span>
      </div>
      ${remaining > 0 ? `<div class="flex justify-between" style="font-size:var(--text-sm);"><span>Pendiente</span><span class="text-danger">${store.formatCurrency(remaining)}</span></div>` : ''}
    </div>
    <div class="card" style="margin-bottom:1rem;padding:0.75rem;">
      <div class="font-semibold" style="margin-bottom:0.5rem;">Pagos</div>
      ${paymentsHtml}
    </div>
    ${remaining > 0 ? `
      <form class="form" id="paymentForm">
        <div class="form__group">
          <label class="form__label">Registrar pago</label>
          <input type="number" class="form__input" name="amount" min="0.01" max="${remaining}" step="0.01" required value="${remaining}" placeholder="Monto">
        </div>
        <div class="form__group">
          <label class="form__label">Método</label>
          <select class="form__select" name="method">
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="tarjeta">Tarjeta</option>
          </select>
        </div>
      </form>
    ` : '<p class="text-success font-semibold">✓ Venta completamente pagada</p>'}
  `;

  const footer = remaining > 0
    ? `<button type="button" class="btn btn--secondary" id="modalCancel">Cerrar</button>
       <button type="button" class="btn btn--primary" id="modalAddPayment">Registrar pago</button>`
    : `<button type="button" class="btn btn--secondary" id="modalCancel">Cerrar</button>`;

  openModal('Detalle de venta', body, footer);

  document.getElementById('modalCancel')?.addEventListener('click', closeModal);
  document.getElementById('modalAddPayment')?.addEventListener('click', () => {
    const form = document.getElementById('paymentForm');
    if (!form?.checkValidity()) { form?.reportValidity(); return; }
    const fd = new FormData(form);
    store.addPayment(saleId, Number(fd.get('amount')), fd.get('method'));
    showToast('Pago registrado', 'success');
    closeModal();
    renderSales();
  });
}

// ========== REPORTS ==========
export function renderReports() {
  const select = document.getElementById('reportMonth');
  if (select && select.options.length === 0) {
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = label.charAt(0).toUpperCase() + label.slice(1);
      select.appendChild(opt);
    }
  }

  const yearMonth = select?.value || (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  const report = store.getMonthlyReport(yearMonth);

  const kpiEl = document.getElementById('reportKpis');
  kpiEl.innerHTML = `
    <div class="card">
      <div class="card__title">Ventas del mes</div>
      <div class="card__value">${store.formatCurrency(report.totalSales)}</div>
    </div>
    <div class="card">
      <div class="card__title">Cobrado</div>
      <div class="card__value">${store.formatCurrency(report.totalPaid)}</div>
    </div>
    <div class="card">
      <div class="card__title">Nº de ventas</div>
      <div class="card__value">${report.count}</div>
    </div>
    <div class="card">
      <div class="card__title">Por cobrar</div>
      <div class="card__value">${store.formatCurrency(report.totalSales - report.totalPaid)}</div>
    </div>
  `;

  // Chart
  const maxVal = Math.max(...report.byDay.map(d => d.total), 1);
  const chart = document.getElementById('salesChart');
  // Show only days with activity or every few days for readability
  const daysToShow = report.byDay.filter(d => d.total > 0);
  if (daysToShow.length === 0) {
    chart.innerHTML = `<p class="text-muted text-center" style="width:100%;">Sin ventas este mes</p>`;
  } else {
    chart.innerHTML = daysToShow.map(d => `
      <div class="chart-bar">
        <div class="chart-bar__value">${d.total > 0 ? store.formatCurrency(d.total).replace('MX$', '') : ''}</div>
        <div class="chart-bar__fill" style="height: ${(d.total / maxVal) * 100}%"></div>
        <div class="chart-bar__label">${d.day}</div>
      </div>
    `).join('');
  }

  // Top products
  const tbody = document.querySelector('#topProductsTable tbody');
  if (report.topProducts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">Sin datos</td></tr>`;
  } else {
    tbody.innerHTML = report.topProducts.map(p => `
      <tr>
        <td>${p.name}</td>
        <td>${p.quantity}</td>
        <td>${store.formatCurrency(p.revenue)}</td>
      </tr>
    `).join('');
  }

  // Supplier purchases report
  const supplierBody = document.querySelector('#supplierReportTable tbody');
  if (supplierBody) {
    const products = store.getProducts();
    const bySupplier = {};
    products.forEach(p => {
      const sup = p.supplier || 'Sin proveedor';
      if (!bySupplier[sup]) {
        bySupplier[sup] = { count: 0, units: 0, investment: 0 };
      }
      bySupplier[sup].count += 1;
      bySupplier[sup].units += p.stock || 0;
      bySupplier[sup].investment += (p.stock || 0) * (p.purchasePrice || 0);
    });

    const rows = Object.entries(bySupplier)
      .sort((a, b) => b[1].investment - a[1].investment);

    if (rows.length === 0) {
      supplierBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Sin productos registrados</td></tr>`;
    } else {
      supplierBody.innerHTML = rows.map(([name, stats]) => `
        <tr>
          <td class="font-semibold">${name}</td>
          <td>${stats.count}</td>
          <td>${stats.units}</td>
          <td>${store.formatCurrency(stats.investment)}</td>
        </tr>
      `).join('');
    }
  }
}

// ========== CONFIG ==========
export function renderConfig() {
  const config = store.getConfig();
  document.getElementById('supabaseUrl').value = config.supabaseUrl || '';
  document.getElementById('supabaseKey').value = config.supabaseKey || '';
  document.getElementById('cloudName').value = config.cloudName || '';
  document.getElementById('cloudPreset').value = config.cloudPreset || '';

  const banner = document.getElementById('configBanner');
  if (config.supabaseUrl && config.supabaseKey) {
    banner.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <div><strong>Supabase configurado</strong><br>URL: ${config.supabaseUrl}<br>Para producción completa, implementa las llamadas REST en store.js</div>
    `;
  }
}
