/**
 * Data store - localStorage cache + Supabase REST sync
 * Project: Novedades N&L (wehscgjwcarditwoymut)
 */

const STORAGE_KEY = 'novedades-nl-data';

const DEFAULT_CATEGORIES = [
  { id: 'cat-1', name: 'Bocinas' },
  { id: 'cat-2', name: 'Audífonos Bluetooth' },
  { id: 'cat-3', name: 'Audífonos con cable' },
  { id: 'cat-4', name: 'Termos' },
  { id: 'cat-5', name: 'Termos con bocina Bluetooth' },
  { id: 'cat-6', name: 'Cámaras de seguridad (foco)' },
  { id: 'cat-7', name: 'Cámaras de seguridad 360' },
  { id: 'cat-8', name: 'Cámaras de seguridad (otras)' },
  { id: 'cat-9', name: 'Lámparas de bicicleta' },
  { id: 'cat-10', name: 'Focos ahorradores' },
  { id: 'cat-11', name: 'Focos inteligentes' },
  { id: 'cat-12', name: 'Soportes para celular' },
  { id: 'cat-13', name: 'Memorias USB' },
  { id: 'cat-14', name: 'Memorias USB con contenido' },
  { id: 'cat-15', name: 'Pilas AA / AAA' },
  { id: 'cat-16', name: 'Pilas (otras)' },
  { id: 'cat-17', name: 'Hogar' },
  { id: 'cat-18', name: 'Herramientas' },
  { id: 'cat-19', name: 'Cargadores (caja)' },
  { id: 'cat-20', name: 'Cargadores (cable)' },
  { id: 'cat-21', name: 'Cables y adaptadores' },
  { id: 'cat-22', name: 'Power banks' },
  { id: 'cat-23', name: 'Luces LED / decorativas' },
  { id: 'cat-24', name: 'Otros' }
];

function generateId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error loading data', e);
  }
  return {
    products: [],
    clients: [],
    sales: [],
    payments: [],
    categories: DEFAULT_CATEGORIES,
    config: {
      supabaseUrl: 'https://wehscgjwcarditwoymut.supabase.co',
      supabaseKey: 'sb_publishable_Q_PziYnFZcUOio-YUCNzPA_257vcb1N',
      cloudName: 'dzh0gjzet',
      cloudPreset: 'novedades_unsigned'
    }
  };
}

function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let data = load();

// ========== SUPABASE HELPERS ==========

function getSupabaseHeaders() {
  const key = data.config.supabaseKey;
  return {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
}

function sbUrl(path) {
  const base = (data.config.supabaseUrl || '').replace(/\/$/, '');
  return `${base}/rest/v1/${path}`;
}

function isSupabaseConfigured() {
  return !!(data.config.supabaseUrl && data.config.supabaseKey);
}

async function sbFetch(path, options = {}) {
  if (!isSupabaseConfigured()) return null;
  const res = await fetch(sbUrl(path), {
    ...options,
    headers: {
      ...getSupabaseHeaders(),
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Supabase ${res.status}: ${text || res.statusText}`);
  }
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return null;
}

/** Map camelCase product <-> snake_case DB */
function productToDb(p) {
  return {
    id: p.id,
    category_id: p.categoryId,
    name: p.name,
    brand: p.brand || null,
    model: p.model || null,
    description: p.description || null,
    stock: p.stock,
    purchase_price: p.purchasePrice,
    sale_price: p.salePrice,
    image_url: p.imageUrl || null,
    purchase_date: p.purchaseDate || null,
    supplier: p.supplier || null,
    tags: p.tags || null,
    units_per_package: p.unitsPerPackage || 1,
    created_at: p.createdAt || new Date().toISOString()
  };
}

function productFromDb(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    brand: row.brand || '',
    model: row.model || '',
    description: row.description || '',
    stock: Number(row.stock) || 0,
    purchasePrice: Number(row.purchase_price) || 0,
    salePrice: Number(row.sale_price) || 0,
    imageUrl: row.image_url || '',
    purchaseDate: row.purchase_date || '',
    supplier: row.supplier || '',
    tags: row.tags || '',
    unitsPerPackage: Number(row.units_per_package) || 1,
    createdAt: row.created_at
  };
}

function clientToDb(c) {
  return {
    id: c.id,
    name: c.name,
    area: c.area || null,
    whatsapp: c.whatsapp || null,
    notes: c.notes || null,
    seller_id: c.sellerId || null,
    seller_name: c.sellerName || null,
    created_at: c.createdAt || new Date().toISOString()
  };
}

function clientFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    area: row.area || '',
    whatsapp: row.whatsapp || '',
    notes: row.notes || '',
    sellerId: row.seller_id || null,
    sellerName: row.seller_name || '',
    createdAt: row.created_at
  };
}

function saleToDb(s) {
  return {
    id: s.id,
    client_id: s.clientId,
    total: s.total,
    paid: s.paid,
    status: s.status,
    notes: s.notes || null,
    seller_id: s.sellerId || null,
    seller_name: s.sellerName || null,
    created_at: s.createdAt || new Date().toISOString()
  };
}

function saleFromDb(row, items = []) {
  return {
    id: row.id,
    clientId: row.client_id,
    items: items.map(i => ({
      productId: i.product_id,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unit_price),
      subtotal: Number(i.subtotal)
    })),
    total: Number(row.total),
    paid: Number(row.paid),
    status: row.status,
    notes: row.notes || '',
    sellerId: row.seller_id || null,
    sellerName: row.seller_name || '—',
    createdAt: row.created_at
  };
}

function paymentToDb(p) {
  return {
    id: p.id,
    sale_id: p.saleId,
    amount: p.amount,
    payment_date: p.paymentDate || new Date().toISOString(),
    method: p.method || null,
    notes: p.notes || null
  };
}

function paymentFromDb(row) {
  return {
    id: row.id,
    saleId: row.sale_id,
    amount: Number(row.amount),
    paymentDate: row.payment_date,
    method: row.method || '',
    notes: row.notes || ''
  };
}

/**
 * Pull all data from Supabase into local cache
 */
export async function syncFromSupabase() {
  if (!isSupabaseConfigured()) return false;

  try {
    const [cats, prods, clients, sales, items, pays] = await Promise.all([
      sbFetch('categories?select=*&order=id'),
      sbFetch('products?select=*&order=created_at.desc'),
      sbFetch('clients?select=*&order=name'),
      sbFetch('sales?select=*&order=created_at.desc'),
      sbFetch('sale_items?select=*'),
      sbFetch('payments?select=*&order=payment_date.desc')
    ]);

    if (cats && cats.length) {
      data.categories = cats.map(c => ({ id: c.id, name: c.name }));
    } else {
      data.categories = DEFAULT_CATEGORIES;
    }

    data.products = (prods || []).map(productFromDb);
    data.clients = (clients || []).map(clientFromDb);

    const itemsBySale = {};
    (items || []).forEach(i => {
      if (!itemsBySale[i.sale_id]) itemsBySale[i.sale_id] = [];
      itemsBySale[i.sale_id].push(i);
    });

    data.sales = (sales || []).map(s => saleFromDb(s, itemsBySale[s.id] || []));
    data.payments = (pays || []).map(paymentFromDb);

    save(data);
    return true;
  } catch (err) {
    console.error('syncFromSupabase', err);
    throw err;
  }
}

// ========== CONFIG ==========

export function getConfig() {
  return { ...data.config };
}

export function setConfig(partial) {
  data.config = { ...data.config, ...partial };
  save(data);
}

// ========== CATEGORIES ==========

export function getCategories() {
  return [...data.categories];
}

export function getCategoryName(id) {
  return data.categories.find(c => c.id === id)?.name || 'Sin categoría';
}

// ========== PRODUCTS ==========

export function getProducts() {
  return [...data.products];
}

export function getProduct(id) {
  return data.products.find(p => p.id === id) || null;
}

export function addProduct(product) {
  const today = new Date().toISOString().slice(0, 10);
  const newProduct = {
    id: generateId('prod'),
    createdAt: new Date().toISOString(),
    purchaseDate: product.purchaseDate || today,
    supplier: product.supplier || '',
    tags: product.tags || '',
    ...product,
    stock: Number(product.stock) || 0,
    purchasePrice: Number(product.purchasePrice) || 0,
    salePrice: Number(product.salePrice) || 0
  };
  data.products.push(newProduct);
  save(data);

  if (isSupabaseConfigured()) {
    sbFetch('products', {
      method: 'POST',
      body: JSON.stringify(productToDb(newProduct))
    }).catch(err => console.error('Supabase addProduct', err));
  }
  return newProduct;
}

export function updateProduct(id, updates) {
  const idx = data.products.findIndex(p => p.id === id);
  if (idx === -1) return null;
  data.products[idx] = { ...data.products[idx], ...updates };
  if (updates.stock !== undefined) data.products[idx].stock = Number(updates.stock);
  if (updates.purchasePrice !== undefined) data.products[idx].purchasePrice = Number(updates.purchasePrice);
  if (updates.salePrice !== undefined) data.products[idx].salePrice = Number(updates.salePrice);
  if (updates.unitsPerPackage !== undefined) data.products[idx].unitsPerPackage = Number(updates.unitsPerPackage) || 1;
  save(data);

  if (isSupabaseConfigured()) {
    sbFetch(`products?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(productToDb(data.products[idx]))
    }).catch(err => console.error('Supabase updateProduct', err));
  }
  return data.products[idx];
}

export function deleteProduct(id) {
  data.products = data.products.filter(p => p.id !== id);
  save(data);
  if (isSupabaseConfigured()) {
    sbFetch(`products?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' })
      .catch(err => console.error('Supabase deleteProduct', err));
  }
}

export function restockProduct(id, quantity) {
  const product = getProduct(id);
  if (!product) return null;
  return updateProduct(id, { stock: product.stock + Number(quantity) });
}

// ========== CLIENTS ==========

export function getClients() {
  return [...data.clients];
}

export function getClient(id) {
  return data.clients.find(c => c.id === id) || null;
}

export function addClient(client) {
  const newClient = {
    id: generateId('cli'),
    createdAt: new Date().toISOString(),
    ...client
  };
  data.clients.push(newClient);
  save(data);

  if (isSupabaseConfigured()) {
    sbFetch('clients', {
      method: 'POST',
      body: JSON.stringify(clientToDb(newClient))
    }).catch(err => console.error('Supabase addClient', err));
  }
  return newClient;
}

export function updateClient(id, updates) {
  const idx = data.clients.findIndex(c => c.id === id);
  if (idx === -1) return null;
  data.clients[idx] = { ...data.clients[idx], ...updates };
  save(data);

  if (isSupabaseConfigured()) {
    sbFetch(`clients?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(clientToDb(data.clients[idx]))
    }).catch(err => console.error('Supabase updateClient', err));
  }
  return data.clients[idx];
}

export function deleteClient(id) {
  data.clients = data.clients.filter(c => c.id !== id);
  save(data);
  if (isSupabaseConfigured()) {
    sbFetch(`clients?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' })
      .catch(err => console.error('Supabase deleteClient', err));
  }
}

// ========== SALES ==========

export function getSales() {
  return [...data.sales].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getSale(id) {
  return data.sales.find(s => s.id === id) || null;
}

export function addSale(sale) {
  const items = (sale.items || []).map(item => ({
    productId: item.productId,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    subtotal: Number(item.quantity) * Number(item.unitPrice)
  }));

  const total = items.reduce((sum, i) => sum + i.subtotal, 0);
  const initialPayment = sale.initialPayment !== undefined
    ? Number(sale.initialPayment)
    : Math.round(total * 0.5 * 100) / 100;

  for (const item of items) {
    const product = getProduct(item.productId);
    if (product) {
      updateProduct(item.productId, { stock: Math.max(0, product.stock - item.quantity) });
    }
  }

  const newSale = {
    id: generateId('sale'),
    clientId: sale.clientId,
    items,
    total,
    paid: initialPayment,
    status: initialPayment >= total ? 'paid' : (initialPayment > 0 ? 'partial' : 'pending'),
    notes: sale.notes || '',
    sellerId: sale.sellerId || null,
    sellerName: sale.sellerName || '—',
    createdAt: new Date().toISOString()
  };

  data.sales.push(newSale);

  let payment = null;
  if (initialPayment > 0) {
    payment = {
      id: generateId('pay'),
      saleId: newSale.id,
      amount: initialPayment,
      paymentDate: new Date().toISOString(),
      method: sale.paymentMethod || 'efectivo',
      notes: 'Pago inicial'
    };
    data.payments.push(payment);
  }

  save(data);

  if (isSupabaseConfigured()) {
    (async () => {
      try {
        await sbFetch('sales', {
          method: 'POST',
          body: JSON.stringify(saleToDb(newSale))
        });
        for (const item of items) {
          await sbFetch('sale_items', {
            method: 'POST',
            body: JSON.stringify({
              sale_id: newSale.id,
              product_id: item.productId,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              subtotal: item.subtotal
            })
          });
        }
        if (payment) {
          await sbFetch('payments', {
            method: 'POST',
            body: JSON.stringify(paymentToDb(payment))
          });
        }
      } catch (err) {
        console.error('Supabase addSale', err);
      }
    })();
  }

  return newSale;
}

export function addPayment(saleId, amount, method = 'efectivo', notes = '') {
  const sale = getSale(saleId);
  if (!sale) return null;

  const payAmount = Number(amount);
  const newPaid = Math.min(sale.total, sale.paid + payAmount);
  const status = newPaid >= sale.total ? 'paid' : (newPaid > 0 ? 'partial' : 'pending');

  const idx = data.sales.findIndex(s => s.id === saleId);
  data.sales[idx] = { ...sale, paid: newPaid, status };

  const payment = {
    id: generateId('pay'),
    saleId,
    amount: payAmount,
    paymentDate: new Date().toISOString(),
    method,
    notes
  };
  data.payments.push(payment);
  save(data);

  if (isSupabaseConfigured()) {
    (async () => {
      try {
        await sbFetch(`sales?id=eq.${encodeURIComponent(saleId)}`, {
          method: 'PATCH',
          body: JSON.stringify({ paid: newPaid, status })
        });
        await sbFetch('payments', {
          method: 'POST',
          body: JSON.stringify(paymentToDb(payment))
        });
      } catch (err) {
        console.error('Supabase addPayment', err);
      }
    })();
  }

  return data.sales[idx];
}

export function getPayments(saleId) {
  return data.payments.filter(p => p.saleId === saleId);
}

// ========== KPIs / REPORTS ==========

export function getLowStockProducts(threshold = 5) {
  return data.products.filter(p => p.stock <= threshold).sort((a, b) => a.stock - b.stock);
}

export function getKpis() {
  const products = data.products;
  const sales = data.sales;
  const totalStock = products.reduce((s, p) => s + p.stock, 0);
  const inventoryValue = products.reduce((s, p) => s + p.stock * p.purchasePrice, 0);
  const totalSales = sales.reduce((s, sale) => s + sale.total, 0);
  const totalPaid = sales.reduce((s, sale) => s + sale.paid, 0);
  const pending = totalSales - totalPaid;
  const lowStock = products.filter(p => p.stock <= 5).length;

  return {
    totalProducts: products.length,
    totalStock,
    inventoryValue,
    totalSales,
    totalPaid,
    pending,
    lowStock,
    clientsCount: data.clients.length
  };
}

export function getRecentActivity(limit = 8) {
  const activities = [];

  data.sales.slice(0, 10).forEach(sale => {
    const client = getClient(sale.clientId);
    activities.push({
      type: 'sale',
      title: `Venta a ${client?.name || 'Cliente'}`,
      meta: formatCurrency(sale.total) + ' · ' + formatDate(sale.createdAt),
      date: sale.createdAt,
      icon: 'sale'
    });
  });

  data.payments.slice(-5).forEach(pay => {
    activities.push({
      type: 'payment',
      title: `Pago recibido`,
      meta: formatCurrency(pay.amount) + ' · ' + formatDate(pay.paymentDate),
      date: pay.paymentDate,
      icon: 'payment'
    });
  });

  return activities
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
}

export function getMonthlyReport(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  const sales = data.sales.filter(s => {
    const d = new Date(s.createdAt);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });

  const totalSales = sales.reduce((s, sale) => s + sale.total, 0);
  const totalPaid = sales.reduce((s, sale) => s + sale.paid, 0);
  const count = sales.length;

  const daysInMonth = new Date(year, month, 0).getDate();
  const byDay = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, total: 0 }));
  sales.forEach(s => {
    const day = new Date(s.createdAt).getDate();
    byDay[day - 1].total += s.total;
  });

  const productMap = {};
  sales.forEach(s => {
    s.items.forEach(item => {
      if (!productMap[item.productId]) {
        productMap[item.productId] = { quantity: 0, revenue: 0 };
      }
      productMap[item.productId].quantity += item.quantity;
      productMap[item.productId].revenue += item.subtotal;
    });
  });

  const topProducts = Object.entries(productMap)
    .map(([productId, stats]) => {
      const product = getProduct(productId);
      return {
        name: product?.name || 'Producto eliminado',
        quantity: stats.quantity,
        revenue: stats.revenue
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return { totalSales, totalPaid, count, byDay, topProducts };
}

export function loadDemoData() {
  data.categories = DEFAULT_CATEGORIES;
  data.products = [
    {
      id: 'prod-demo-1', categoryId: 'cat-9', name: 'Lámpara LED Bicicleta',
      brand: 'Büytiti', model: 'LED-733', description: 'Luz LED recargable USB, 5W',
      stock: 15, purchasePrice: 45, salePrice: 89, imageUrl: '', createdAt: new Date().toISOString()
    },
    {
      id: 'prod-demo-2', categoryId: 'cat-11', name: 'Foco Inteligente WiFi RGB',
      brand: 'Büytiti', model: 'EM30', description: '110-130V, Google Assistant y Alexa',
      stock: 8, purchasePrice: 120, salePrice: 199, imageUrl: '', createdAt: new Date().toISOString()
    },
    {
      id: 'prod-demo-3', categoryId: 'cat-6', name: 'Cámara Inteligente WiFi Foco',
      brand: 'MOREKA', model: 'JK-005', description: 'IP44, 355° horizontal, visión nocturna',
      stock: 4, purchasePrice: 280, salePrice: 449, imageUrl: '', createdAt: new Date().toISOString()
    },
    {
      id: 'prod-demo-4', categoryId: 'cat-3', name: 'Audífonos Stereo con Mic',
      brand: 'Vmex', model: 'M-203', description: 'Alámbricos, llamada y música',
      stock: 25, purchasePrice: 25, salePrice: 49, imageUrl: '', createdAt: new Date().toISOString()
    },
    {
      id: 'prod-demo-5', categoryId: 'cat-14', name: 'Memoria USB 32GB',
      brand: '', model: '', description: 'Con música, películas y series',
      stock: 12, purchasePrice: 35, salePrice: 79, imageUrl: '', createdAt: new Date().toISOString()
    },
    {
      id: 'prod-demo-6', categoryId: 'cat-15', name: 'Pilas AA (pack 4)',
      brand: '', model: '', description: 'Alcalinas',
      stock: 3, purchasePrice: 18, salePrice: 35, imageUrl: '', createdAt: new Date().toISOString()
    }
  ];

  data.clients = [
    { id: 'cli-1', name: 'Juan Pérez', area: 'Centro', whatsapp: '5512345678', notes: '', createdAt: new Date().toISOString() },
    { id: 'cli-2', name: 'María López', area: 'Gustavo A. Madero', whatsapp: '5587654321', notes: 'Cliente frecuente', createdAt: new Date().toISOString() },
    { id: 'cli-3', name: 'Carlos Ruiz', area: 'Iztapalapa', whatsapp: '5511223344', notes: '', createdAt: new Date().toISOString() }
  ];

  data.sales = [];
  data.payments = [];
  save(data);

  addSale({
    clientId: 'cli-1',
    items: [
      { productId: 'prod-demo-1', quantity: 2, unitPrice: 89 },
      { productId: 'prod-demo-4', quantity: 1, unitPrice: 49 }
    ],
    initialPayment: 113.5,
    paymentMethod: 'efectivo',
    sellerName: 'Demo'
  });

  addSale({
    clientId: 'cli-2',
    items: [{ productId: 'prod-demo-2', quantity: 1, unitPrice: 199 }],
    initialPayment: 100,
    paymentMethod: 'transferencia',
    sellerName: 'Demo'
  });

  addSale({
    clientId: 'cli-3',
    items: [{ productId: 'prod-demo-3', quantity: 1, unitPrice: 449 }],
    initialPayment: 449,
    paymentMethod: 'efectivo',
    sellerName: 'Demo'
  });

  return true;
}

export function clearAllData() {
  data = {
    products: [],
    clients: [],
    sales: [],
    payments: [],
    categories: DEFAULT_CATEGORIES,
    config: data.config
  };
  save(data);
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
