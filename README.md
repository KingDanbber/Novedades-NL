# Novedades N&L — Sistema de Administración

Aplicación web para administrar el emprendimiento **Novedades N&L**: inventario, clientes, ventas con pagos parciales y reportes.

## Características

- **Dashboard**: KPIs (ventas, por cobrar, stock, productos con stock bajo), últimos movimientos.
- **Productos**: Alta/edición, categorías (Bocinas, Audífonos, Termos, Cámaras, Lámparas, Focos, etc.), marca, modelo, stock, precios de compra/venta, resurtido.
- **Ventas**: Nueva venta con carrito, pago inicial (recomendado 50%), registro de pagos posteriores, estados (Pagado / Parcial / Pendiente).
- **Clientes**: Nombre, área/colonia, WhatsApp (enlace directo), notas.
- **Reportes**: Mensuales con gráfica de barras, top productos, totales.
- **Configuración**: Campos para Supabase y Cloudinary + datos demo.
- **Tema claro / oscuro** con preferencia guardada.
- **100% responsive** (mobile-first).

## Cómo abrir

1. Descomprime el ZIP.
2. Abre `index.html` en un navegador moderno (Chrome, Firefox, Edge, Safari).
3. Los datos se guardan en **localStorage** del navegador (modo demo).

No necesitas servidor para probar. Para producción con Supabase, despliega en cualquier hosting estático (Vercel, Netlify, GitHub Pages, etc.).

## Supabase (producción)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ejecuta el siguiente SQL en el SQL Editor:

```sql
-- Categorías
create table categories (
  id text primary key,
  name text not null
);

-- Productos
create table products (
  id text primary key,
  category_id text references categories(id),
  name text not null,
  brand text,
  model text,
  description text,
  stock integer default 0,
  purchase_price numeric(12,2) default 0,
  sale_price numeric(12,2) default 0,
  image_url text,
  created_at timestamptz default now()
);

-- Clientes
create table clients (
  id text primary key,
  name text not null,
  area text,
  whatsapp text,
  notes text,
  created_at timestamptz default now()
);

-- Ventas
create table sales (
  id text primary key,
  client_id text references clients(id),
  total numeric(12,2) not null,
  paid numeric(12,2) default 0,
  status text check (status in ('pending','partial','paid')),
  notes text,
  created_at timestamptz default now()
);

-- Ítems de venta
create table sale_items (
  id serial primary key,
  sale_id text references sales(id) on delete cascade,
  product_id text references products(id),
  quantity integer not null,
  unit_price numeric(12,2) not null,
  subtotal numeric(12,2) not null
);

-- Pagos
create table payments (
  id text primary key,
  sale_id text references sales(id) on delete cascade,
  amount numeric(12,2) not null,
  payment_date timestamptz default now(),
  method text,
  notes text
);

-- RLS básico (ajusta según tu auth)
alter table products enable row level security;
alter table clients enable row level security;
alter table sales enable row level security;
-- Políticas de ejemplo (acceso público lectura/escritura para demo):
create policy "public_all" on products for all using (true) with check (true);
create policy "public_all" on clients for all using (true) with check (true);
create policy "public_all" on sales for all using (true) with check (true);
create policy "public_all" on sale_items for all using (true) with check (true);
create policy "public_all" on payments for all using (true) with check (true);
create policy "public_all" on categories for all using (true) with check (true);
```

3. En la app → **Configuración**, pega la **URL** del proyecto y la **anon key**.
4. Para conectar de verdad, reemplaza las funciones de `js/modules/store.js` por llamadas `fetch` a la REST API de Supabase (`/rest/v1/...` con headers `apikey` y `Authorization`).

## Cloudinary (imágenes)

1. Crea cuenta en [cloudinary.com](https://cloudinary.com).
2. Settings → Upload → crea un **Upload preset** de tipo **Unsigned**.
3. En la app → Configuración, ingresa **Cloud Name** y el **Upload Preset**.
4. Para subida directa desde el formulario, puedes añadir un input `type="file"` y usar:

```js
const formData = new FormData();
formData.append('file', file);
formData.append('upload_preset', preset);
const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
  method: 'POST',
  body: formData
});
const data = await res.json();
// data.secure_url → guardar en image_url del producto
```

## Estructura del proyecto

```
novedades-nl/
├── index.html
├── css/
│   ├── main.css          # Variables, reset, tipografía
│   ├── layout.css        # Header, sidebar, bottom-nav
│   ├── components.css    # Cards, tablas, formularios, modales
│   └── utilities.css
├── js/
│   ├── main.js           # Entry point
│   └── modules/
│       ├── theme.js
│       ├── store.js      # Datos (localStorage) + helpers
│       ├── ui.js         # Toasts, modales, navegación
│       └── pages.js      # Render de cada sección
└── README.md
```

## Stack

- HTML5 semántico
- CSS modular (custom properties, mobile-first)
- JavaScript ES Modules (sin frameworks)
- Persistencia: localStorage (demo) → Supabase (producción)
- Imágenes: Cloudinary

## Licencia

Uso libre para el negocio Novedades N&L.
