// ============================================================
// TIPOS
// ============================================================

export interface Product {
  id: string;
  name: string;
  sku?: string;
  unit: string;        // default "UND"
  price_sale: number;
  vat_rate: number;    // siempre 0.19
  created_at: string;
}

export interface Customer {
  id: string;
  company_name: string;
  nit: string;
  email: string;
  phone: string;
  address: string;
  website?: string;
  legal_representative?: string;
  economic_activity?: string;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  product_id: string;
  product_name: string;
  sku?: string;
  unit: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  line_subtotal: number;
  line_vat: number;
  line_total: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;   // "000001"
  supplier?: 'ruby_rose' | 'trendy';
  customer_id: string;
  customer_snapshot: Pick<
    Customer,
    'company_name' | 'nit' | 'email' | 'phone' | 'address' | 'website' | 'legal_representative' | 'economic_activity'
  >;
  items: InvoiceItem[];
  subtotal: number;
  vat_total: number;
  total: number;
  cufe: string;             // hash simulado
  created_at: string;
}

export interface AppData {
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  counter: number;
}

// ============================================================
// EMISOR (empresa que emite las facturas)
// ============================================================
export interface Emisor {
  name: string;
  nit: string;
  address: string;
  phone: string;
  email: string;
  resolution: string;
}

export const DEFAULT_EMISOR: Emisor = {
  name:       'Ruby Rose & Trendy',
  nit:        '900.000.001-0',
  address:    'Oficina Principal',
  phone:      '300-000-0000',
  email:      'facturacion@rubyrosetrendy.com',
  resolution: 'Res. XXXXXX · Rango: 0001 – 1000 · Vigencia: 2024 – 2026',
};

// ============================================================
// CLAVES LOCALSTORAGE
// ============================================================
const KEYS = {
  products:  'fs_products',
  customers: 'fs_customers',
  invoices:  'fs_invoices',
  counter:   'fs_counter',
  emisor:    'fs_emisor',
} as const;

// ============================================================
// HELPERS GENÉRICOS
// ============================================================
function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function generateId(): string {
  return crypto.randomUUID();
}

// ============================================================
// PRODUCTOS
// ============================================================
// EMISOR CRUD
// ============================================================
export function getEmisor(): Emisor {
  return load<Emisor>(KEYS.emisor, DEFAULT_EMISOR);
}

export function saveEmisor(emisor: Emisor): void {
  save(KEYS.emisor, emisor);
}

// ============================================================
export function getProducts(): Product[] {
  return load<Product[]>(KEYS.products, []);
}

export function saveProducts(products: Product[]): void {
  save(KEYS.products, products);
}

export function createProduct(data: Omit<Product, 'id' | 'created_at'>): Product {
  const product: Product = {
    ...data,
    vat_rate: 0.19,
    id: generateId(),
    created_at: new Date().toISOString(),
  };
  const all = getProducts();
  all.push(product);
  saveProducts(all);
  return product;
}

export function updateProduct(id: string, data: Partial<Omit<Product, 'id' | 'created_at'>>): void {
  const all = getProducts().map(p => p.id === id ? { ...p, ...data, vat_rate: 0.19 } : p);
  saveProducts(all);
}

export function deleteProduct(id: string): void {
  saveProducts(getProducts().filter(p => p.id !== id));
}

// ============================================================
// CLIENTES
// ============================================================
export function getCustomers(): Customer[] {
  return load<Customer[]>(KEYS.customers, []);
}

export function saveCustomers(customers: Customer[]): void {
  save(KEYS.customers, customers);
}

export function createCustomer(data: Omit<Customer, 'id' | 'created_at'>): Customer {
  const customer: Customer = {
    ...data,
    id: generateId(),
    created_at: new Date().toISOString(),
  };
  const all = getCustomers();
  all.push(customer);
  saveCustomers(all);
  return customer;
}

export function updateCustomer(id: string, data: Partial<Omit<Customer, 'id' | 'created_at'>>): void {
  const all = getCustomers().map(c => c.id === id ? { ...c, ...data } : c);
  saveCustomers(all);
}

export function deleteCustomer(id: string): void {
  saveCustomers(getCustomers().filter(c => c.id !== id));
}

// ============================================================
// FACTURAS
// ============================================================
export function getInvoices(): Invoice[] {
  return load<Invoice[]>(KEYS.invoices, []);
}

export function saveInvoices(invoices: Invoice[]): void {
  save(KEYS.invoices, invoices);
}

export function getNextCounter(): number {
  const current = load<number>(KEYS.counter, 0);
  const next = current + 1;
  save(KEYS.counter, next);
  return next;
}

export function formatInvoiceNumber(n: number): string {
  return String(n).padStart(6, '0');
}

/** CUFE simulado: hash SHA-256 truncado a 96 chars (similar longitud al real) */
export async function generateCUFE(
  invoiceNumber: string,
  nit: string,
  total: string,
  date: string
): Promise<string> {
  const data = `${invoiceNumber}|${nit}|${total}|${date}|SIMULADO`;
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hex = Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  // SHA-256 = 64 chars; duplicamos para llegar a ~96 como el real SHA-384
  return (hex + hex).substring(0, 96);
}

export function createInvoice(inv: Omit<Invoice, 'id' | 'created_at'>): Invoice {
  const invoice: Invoice = {
    ...inv,
    id: generateId(),
    created_at: new Date().toISOString(),
  };
  const all = getInvoices();
  all.push(invoice);
  saveInvoices(all);
  return invoice;
}

// ============================================================
// TOTALES (cálculo consistente)
// ============================================================
export function calcLineTotals(quantity: number, unit_price: number, vat_rate = 0.19) {
  const line_subtotal = round2(quantity * unit_price);
  const line_vat = round2(line_subtotal * vat_rate);
  const line_total = round2(line_subtotal + line_vat);
  return { line_subtotal, line_vat, line_total };
}

export function calcInvoiceTotals(items: Pick<InvoiceItem, 'line_subtotal' | 'line_vat' | 'line_total'>[]) {
  const subtotal = round2(items.reduce((a, i) => a + i.line_subtotal, 0));
  const vat_total = round2(items.reduce((a, i) => a + i.line_vat, 0));
  const total = round2(subtotal + vat_total);
  return { subtotal, vat_total, total };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ============================================================
// EXPORT / IMPORT
// ============================================================
export function exportData(): AppData {
  return {
    products: getProducts(),
    customers: getCustomers(),
    invoices: getInvoices(),
    counter: load<number>(KEYS.counter, 0),
  };
}

export function importData(raw: unknown): { ok: boolean; error?: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'JSON inválido' };
  const d = raw as Record<string, unknown>;
  if (!Array.isArray(d.products)) return { ok: false, error: 'Falta "products"' };
  if (!Array.isArray(d.customers)) return { ok: false, error: 'Falta "customers"' };
  if (!Array.isArray(d.invoices)) return { ok: false, error: 'Falta "invoices"' };
  if (typeof d.counter !== 'number') return { ok: false, error: 'Falta "counter"' };
  saveProducts(d.products as Product[]);
  saveCustomers(d.customers as Customer[]);
  saveInvoices(d.invoices as Invoice[]);
  save(KEYS.counter, d.counter);
  return { ok: true };
}

// ============================================================
// SEED: cliente VelvetGlow
// ============================================================
export const VELVETGLOW_SEED: Omit<Customer, 'id' | 'created_at'> = {
  company_name: 'VelvetGlow',
  nit: '894577890-4',
  email: 'VelvetGlow@gmail.com',
  phone: '3155542255',
  address: 'Cra. 35 #52-116, Cabecera del llano',
  website: 'VelvetGlow',
  legal_representative: '',
  economic_activity: '',
};

// ============================================================
// SEED: 21 productos del Kardex (Ruby Rose & Trendy)
// Precios en COP (puntos = separador de miles en Colombia)
// ============================================================
type ProductSeed = Omit<Product, 'id' | 'created_at'>;

export const SEED_PRODUCTS: ProductSeed[] = [
  // ── RUBY ROSE ──────────────────────────────────────────────
  { name: 'POLVO SUELTO MELU',              sku: 'MEL-120', unit: 'UND', price_sale: 14000, vat_rate: 0.19 },
  { name: 'POLVO COMPACTO MELU',            sku: 'MEL-121', unit: 'UND', price_sale:  4900, vat_rate: 0.19 },
  { name: 'ILUMINADOR MARMOLADO MELU',      sku: 'MEL-122', unit: 'UND', price_sale: 14100, vat_rate: 0.19 },
  { name: 'BASE LIQUIDA MELU',              sku: 'MEL-123', unit: 'UND', price_sale: 13900, vat_rate: 0.19 },
  { name: 'BALSAMO LABIAL MELU',            sku: 'MEL-124', unit: 'UND', price_sale:  7000, vat_rate: 0.19 },
  { name: 'GEL DE LIMPIEZA FACIAL RUBY SKIN',  sku: 'MEL-125', unit: 'UND', price_sale: 15900, vat_rate: 0.19 },
  { name: 'CREMA HIDRATANTE FACIAL RUBY SKIN', sku: 'MEL-126', unit: 'UND', price_sale: 15000, vat_rate: 0.19 },
  // ── TRENDY ─────────────────────────────────────────────────
  { name: 'CREMA FACIAL REPARADORA NOCTURNA TRENDY', sku: 'CAM-2205', unit: 'UND', price_sale: 13000, vat_rate: 0.19 },
  { name: 'BASE TRULY MATE L.A COLORS',     sku: 'CAM-2206', unit: 'UND', price_sale: 15000, vat_rate: 0.19 },
  { name: 'BASE MOUSE TRENDY',              sku: 'CAM-2207', unit: 'UND', price_sale:  9000, vat_rate: 0.19 },
  { name: 'CORRECTOR REBEL GIRL TRENDY',    sku: 'CAM-2208', unit: 'UND', price_sale: 10000, vat_rate: 0.19 },
  { name: 'RUBOR EN CREMA STAR',            sku: 'CAM-2209', unit: 'UND', price_sale:  8600, vat_rate: 0.19 },
  { name: 'POLVO DE HADAS TRENDY',          sku: 'CAM-2210', unit: 'UND', price_sale:  9500, vat_rate: 0.19 },
  { name: 'RUBOR LIQUIDO DUO SAFARI',       sku: 'CAM-2211', unit: 'UND', price_sale: 20000, vat_rate: 0.19 },
  { name: 'CONTORNO EN CREMA STAR',         sku: 'CAM-2212', unit: 'UND', price_sale: 13000, vat_rate: 0.19 },
  { name: 'FIJADOR DREAMS 60ML',            sku: 'CAM-2213', unit: 'UND', price_sale: 14500, vat_rate: 0.19 },
  { name: 'LABIAL VELVET DUO',              sku: 'CAM-2214', unit: 'UND', price_sale: 16000, vat_rate: 0.19 },
  { name: 'KIT X5 GARDEN GLOSS',            sku: 'CAM-2215', unit: 'UND', price_sale: 19000, vat_rate: 0.19 },
  { name: 'KIT DE CEJAS BAKERY TRENDY',     sku: 'CAM-2216', unit: 'UND', price_sale: 15000, vat_rate: 0.19 },
  { name: 'DELINEADOR EN PLUMON TRENDY',    sku: 'CAM-2217', unit: 'UND', price_sale:  6000, vat_rate: 0.19 },
  { name: 'PESTAÑINA CAT TRENDY',           sku: 'CAM-2218', unit: 'UND', price_sale: 11000, vat_rate: 0.19 },
];

// ============================================================
// INIT: primera vez que se abre la app → carga productos + cliente
// ============================================================
const INIT_KEY = 'fs_initialized';

export function initSeedData(): void {
  // Migrar emisor si todavía tiene el valor genérico anterior
  const stored = load<Emisor>(KEYS.emisor, DEFAULT_EMISOR);
  if (stored.name === 'MI EMPRESA S.A.S.') {
    saveEmisor({ ...stored, name: 'Ruby Rose & Trendy', email: 'facturacion@rubyrosetrendy.com', address: 'Oficina Principal' });
  }

  if (localStorage.getItem(INIT_KEY)) return; // ya fue inicializado

  // Solo cargar si no hay productos
  if (getProducts().length === 0) {
    const now = new Date().toISOString();
    const products: Product[] = SEED_PRODUCTS.map(p => ({
      ...p,
      id: generateId(),
      created_at: now,
    }));
    saveProducts(products);
  }

  // Solo cargar VelvetGlow si no hay clientes
  if (getCustomers().length === 0) {
    createCustomer(VELVETGLOW_SEED);
  }

  localStorage.setItem(INIT_KEY, '1');
}
