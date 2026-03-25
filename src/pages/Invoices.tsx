import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  getInvoices,
  getCustomers,
  getProducts,
  getStores,
  createInvoice,
  updateInvoice,
  getNextCounter,
  formatInvoiceNumber,
  generateCUFE,
  calcLineTotals,
  calcInvoiceTotals,
  generateId,
  type Invoice,
  type Customer,
  type Product,
  type InvoiceItem,
  type StoreConfig,
} from "../lib/storage";

// ── Fila editable de item ──────────────────────────────────────────────────
interface ItemRow {
  rowId: string;
  product_id: string;
  product_name: string;
  sku?: string;
  unit: string;
  quantity: string;
  unit_price: string;
}

function emptyRow(): ItemRow {
  return {
    rowId: generateId(),
    product_id: "",
    product_name: "",
    unit: "UND",
    quantity: "1",
    unit_price: "",
  };
}

// ── Badge de tienda ────────────────────────────────────────────────────────
function SupplierBadge({
  storeId,
  stores,
}: {
  storeId?: string;
  stores: StoreConfig[];
}) {
  if (!storeId) return null;
  const s = stores.find((s) => s.id === storeId);
  if (!s) return <span className="badge badge-amber">{storeId}</span>;
  return (
    <span className="badge" style={{ background: s.bg, color: "#fff" }}>
      {s.label}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────────
export default function Invoices() {
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<StoreConfig[]>(getStores);

  // Form state
  const [customerId, setCustomerId] = useState("");
  const [rows, setRows] = useState<ItemRow[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  // Nuevo estado para editar los datos de Ruby Rose / Trendy libremente
  const [editCustomer, setEditCustomer] = useState({
    company_name: "",
    nit: "",
    address: "",
    phone: "",
    email: "",
    website: "",
  });

  const [editEmitter, setEditEmitter] = useState({
    label: "",
    nit: "",
    address: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    setInvoices(getInvoices().slice().reverse());
    setCustomers(getCustomers());
    setProducts(getProducts());
    setStores(getStores());
  }, []);

  function refresh() {
    setInvoices(getInvoices().slice().reverse());
  }

  function goBack() {
    setActiveStoreId(null);
    setFormError("");
    setCustomerId("");
    setRows([emptyRow()]);
    setEditingInvoiceId(null);
  }
  function startEdit(inv: any) {
    setEditingInvoiceId(inv.id);
    setActiveStoreId(inv.supplier || "ruby_rose");
    setCustomerId(inv.customer_id);

    // CARGAR EMISOR: Priorizamos lo que ya tiene la factura guardado
    setEditEmitter({
      label: inv.supplier_label || "",
      nit: inv.supplier_nit || "",
      address: inv.supplier_address || "",
      phone: inv.supplier_phone || "",
      email: inv.supplier_email || "",
    });

    // CARGAR CLIENTE: Traemos todo el snapshot
    setEditCustomer({
      company_name: inv.customer_snapshot.company_name,
      nit: inv.customer_snapshot.nit,
      address: inv.customer_snapshot.address,
      phone: inv.customer_snapshot.phone,
      email: inv.customer_snapshot.email || "",
      website: inv.customer_snapshot.website || "",
    });

    // CARGAR ITEMS
    const editRows = inv.items.map((item: any) => ({
      rowId: generateId(),
      product_id: item.product_id,
      product_name: item.product_name,
      sku: item.sku,
      unit: item.unit,
      quantity: String(item.quantity),
      unit_price: String(item.unit_price),
    }));

    setRows(editRows);
    window.scrollTo(0, 0);
  }
  // ── Tienda activa y productos filtrados ────────────────────────────────
  const activeStore = activeStoreId
    ? (stores.find((s) => s.id === activeStoreId) ?? null)
    : null;

  const supplierProducts = useMemo(() => {
    if (!activeStore) return products;
    return products.filter((p) => p.sku?.startsWith(activeStore.skuPrefix));
  }, [products, activeStore]);

  // ── Cálculos en tiempo real ─────────────────────────────────────────────
  const computedRows = useMemo(
    () =>
      rows.map((row) => {
        const qty = parseFloat(row.quantity) || 0;
        const price = parseFloat(row.unit_price) || 0;
        return { ...row, ...calcLineTotals(qty, price, 0.19) };
      }),
    [rows],
  );

  const totals = useMemo(() => calcInvoiceTotals(computedRows), [computedRows]);

  // ── Handlers de rows ───────────────────────────────────────────────────
  function setRowField(rowId: string, field: keyof ItemRow, value: string) {
    setRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, [field]: value } : r)),
    );
  }

  function selectProduct(rowId: string, productId: string) {
    const p = supplierProducts.find((p) => p.id === productId);
    if (!p) {
      setRowField(rowId, "product_id", "");
      return;
    }
    setRows((prev) =>
      prev.map((r) =>
        r.rowId === rowId
          ? {
              ...r,
              product_id: p.id,
              product_name: p.name,
              sku: p.sku,
              unit: p.unit,
              unit_price: String(p.price_sale),
            }
          : r,
      ),
    );
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }
  function removeRow(rowId: string) {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));
  }
  const handleProductChange = (rowId: string, productId: string) => {
    selectProduct(rowId, productId);
  };
  // ── Guardar factura ─────────────────────────────────────────────────────
  async function handleSave() {
    setFormError("");
    // VALIDACIÓN: O se elige un cliente o se escribe el nombre de la empresa
    if (!customerId && !editCustomer.company_name.trim()) {
      setFormError("Selecciona un cliente o ingresa su Razón Social");
      return;
    }

    // VALIDACIÓN: Debe haber al menos un producto en la lista
    const validRows = computedRows.filter(
      (r) => r.product_id && parseFloat(r.quantity) > 0,
    );
    if (validRows.length === 0) {
      setFormError("Agrega al menos un producto con cantidad > 0");
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();

      // 1. Preparamos los items (común para ambos casos)
      const items: InvoiceItem[] = validRows.map((r) => ({
        id: generateId(),
        product_id: r.product_id,
        product_name: r.product_name,
        sku: r.sku,
        unit: r.unit,
        quantity: parseFloat(r.quantity),
        unit_price: parseFloat(r.unit_price),
        vat_rate: 0.19,
        line_subtotal: r.line_subtotal,
        line_vat: r.line_vat,
        line_total: r.line_total,
      }));

      // 2. Preparamos el SNAPSHOT del cliente.
      // Inicia con datos de un cliente existente si se seleccionó uno.
      const baseCustomer = customerId
        ? customers.find((c) => c.id === customerId)
        : undefined;

      const customerSnapshot = {
        ...(baseCustomer || {}), // Base de datos si existe, si no, objeto vacío
        // Sobrescribe o llena con los datos de edición libre.
        company_name: editCustomer.company_name,
        nit: editCustomer.nit,
        address: editCustomer.address,
        phone: editCustomer.phone,
        email: editCustomer.email,
        website: editCustomer.website,
      };

      // 3. Preparamos la base de la factura
      const invoiceData = {
        supplier: activeStoreId ?? undefined,

        // DATOS DEL EMISOR (Editables)
        supplier_label: editEmitter.label,
        supplier_nit: editEmitter.nit,
        supplier_address: editEmitter.address,
        supplier_phone: editEmitter.phone,
        supplier_email: editEmitter.email,

        // DATOS DEL CLIENTE
        customer_id: customerId, // Puede ser "" si es manual
        customer_snapshot: customerSnapshot,

        items,
        subtotal: totals.subtotal,
        vat_total: totals.vat_total,
        total: totals.total,
      };

      // 4. Decidimos si actualizamos o creamos
      if (editingInvoiceId) {
        // MODO EDICIÓN: Simplemente actualiza con los nuevos datos
        updateInvoice(editingInvoiceId, invoiceData);
      } else {
        // MODO CREACIÓN: Genera número, CUFE, etc.
        const number = getNextCounter();
        const invoiceNumber = formatInvoiceNumber(number);
        const cufe = await generateCUFE(
          invoiceNumber,
          customerSnapshot.nit || "222222222222", // NIT de consumidor final si está vacío
          String(totals.total),
          now,
        );

        createInvoice({
          ...invoiceData,
          invoice_number: invoiceNumber,
          cufe,
        });
      }

      goBack();
      refresh();
    } finally {
      setSaving(false);
    }
  }

  function fmt(n: number) {
    return n.toLocaleString("es-CO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // LISTA
  // ──────────────────────────────────────────────────────────────────────────
  if (activeStoreId === null) {
    const noData = customers.length === 0 || products.length === 0;
    return (
      <div>
        <div className="page-header">
          <h1>Facturas</h1>
          {noData ? (
            <span className="badge badge-amber">
              ⚠ Necesitas clientes y productos primero
            </span>
          ) : (
            <div className="page-header-actions">
              {stores.map((store) => (
                <button
                  key={store.id}
                  className="btn"
                  style={{ background: store.bg, color: "#fff" }}
                  onClick={() => setActiveStoreId(store.id)}
                >
                  + {store.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          {invoices.length === 0 ? (
            <div className="empty-state">
              <p>No hay facturas. Crea la primera.</p>
              {noData && (
                <p style={{ marginTop: 12, color: "#d97706" }}>
                  Primero ve a <strong>Clientes</strong> y{" "}
                  <strong>Productos</strong> para agregar datos.
                </p>
              )}
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>N° Factura</th>
                    <th>Tienda</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th className="td-right">Subtotal</th>
                    <th className="td-right">IVA 19%</th>
                    <th className="td-right">Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td>
                        <span className="badge badge-blue">
                          {inv.invoice_number}
                        </span>
                      </td>
                      <td>
                        <SupplierBadge storeId={inv.supplier} stores={stores} />
                      </td>
                      <td>
                        {new Date(inv.created_at).toLocaleDateString("es-CO")}
                      </td>
                      <td>{inv.customer_snapshot.company_name}</td>
                      <td className="td-right">${fmt(inv.subtotal)}</td>
                      <td className="td-right">${fmt(inv.vat_total)}</td>
                      <td className="td-right">
                        <strong>${fmt(inv.total)}</strong>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <Link
                            to={`/invoices/${inv.id}`}
                            className="btn btn-ghost btn-sm"
                          >
                            Ver / PDF
                          </Link>
                          <button
                            onClick={() => startEdit(inv)}
                            className="btn btn-ghost btn-sm"
                            style={{ color: "#7c3aed" }}
                          >
                            ✏️ Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CREAR
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="page-header">
        <h1>
          {editingInvoiceId ? "Editando Factura" : "Nueva Factura"}
          {activeStore && (
            <span
              className="badge"
              style={{
                background: activeStore.bg,
                color: "#fff",
                marginLeft: 10,
                fontSize: "0.75rem",
              }}
            >
              {activeStore.label}
            </span>
          )}
        </h1>
        <button className="btn btn-ghost" onClick={goBack}>
          ← Volver
        </button>
      </div>

      {formError && <div className="alert alert-error">{formError}</div>}
      {/* 1. Empresa Emisora (Edición Libre) */}
      <div className="card">
        <div className="card-title">1. Datos de la Empresa Emisora</div>
        <div className="form-grid">
          <div className="form-group">
            <label>Nombre de la Empresa</label>
            <input
              type="text"
              value={editEmitter.label}
              onChange={(e) =>
                setEditEmitter({ ...editEmitter, label: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>Correo Electrónico</label>
            <input
              type="email"
              value={editEmitter.email} // <--- CAMBIADO
              onChange={
                (e) => setEditEmitter({ ...editEmitter, email: e.target.value }) // <--- CAMBIADO
              }
            />
          </div>
          <div className="form-group">
            <label>Teléfono</label>
            <input
              type="text"
              value={editEmitter.phone} // <--- CAMBIADO
              onChange={
                (e) => setEditEmitter({ ...editEmitter, phone: e.target.value }) // <--- CAMBIADO
              }
            />
          </div>
          <div className="form-group">
            <label>NIT</label>
            <input
              type="text"
              value={editEmitter.nit}
              onChange={(e) =>
                setEditEmitter({ ...editEmitter, nit: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>Dirección</label>
            <input
              type="text"
              value={editEmitter.address}
              onChange={(e) =>
                setEditEmitter({ ...editEmitter, address: e.target.value })
              }
            />
          </div>
        </div>
      </div>
      {/* Cliente */}
      <div className="card">
        <div className="card-title">2. Datos del Cliente (Edición Libre)</div>
        <div className="form-grid">
          <div className="form-group">
            <label>Razón Social</label>
            <input
              type="text"
              value={editCustomer.company_name}
              onChange={(e) =>
                setEditCustomer({
                  ...editCustomer,
                  company_name: e.target.value,
                })
              }
            />
          </div>
          <div className="form-group">
            <label>NIT / CC</label>
            <input
              type="text"
              value={editCustomer.nit}
              onChange={(e) =>
                setEditCustomer({ ...editCustomer, nit: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>Correo Electrónico</label>
            <input
              type="email"
              value={editCustomer.email}
              onChange={(e) =>
                setEditCustomer({ ...editCustomer, email: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>Sitio Web</label>
            <input
              type="text"
              value={editCustomer.website}
              onChange={(e) =>
                setEditCustomer({ ...editCustomer, website: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>Dirección</label>
            <input
              type="text"
              value={editCustomer.address}
              onChange={(e) =>
                setEditCustomer({ ...editCustomer, address: e.target.value })
              }
            />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="card">
        <div className="items-header">
          <span>2. Productos / Ítems</span>
          <button className="btn btn-ghost btn-sm" onClick={addRow}>
            + Agregar ítem
          </button>
        </div>

        {supplierProducts.length === 0 && (
          <div className="alert alert-info" style={{ marginBottom: 12 }}>
            No hay productos registrados para esta tienda. Ve a{" "}
            <strong>Productos</strong> y agrega productos con SKU{" "}
            <strong>{activeStore?.skuPrefix}…</strong>
          </div>
        )}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Unidad</th>
                <th className="td-right">Cant.</th>
                <th className="td-right">Precio unit. (COP)</th>
                <th className="td-right">IVA 19%</th>
                <th className="td-right">Total línea</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {computedRows.map((row) => (
                <tr key={row.rowId}>
                  {/* COLUMNA 1: PRODUCTO (Selector + Nombre editable) */}
                  <td style={{ minWidth: 250 }}>
                    <select
                      className="form-control"
                      value={row.product_id || ""}
                      onChange={(e) =>
                        handleProductChange(row.rowId, e.target.value)
                      }
                    >
                      <option value="">— Seleccionar Producto —</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    {/* Este input permite cambiar el nombre sin afectar el inventario */}
                    <input
                      type="text"
                      className="mt-1"
                      style={{
                        fontSize: "12px",
                        width: "100%",
                        border: "none",
                        background: "transparent",
                        color: "#666",
                      }}
                      value={row.product_name}
                      onChange={(e) =>
                        setRowField(row.rowId, "product_name", e.target.value)
                      }
                      placeholder="Nombre visible..."
                    />
                  </td>

                  {/* COLUMNA 2: UNIDAD (Solo texto) */}
                  <td>{row.unit}</td>

                  {/* COLUMNA 3: CANTIDAD (Su propia celda) */}
                  <td>
                    <input
                      type="number"
                      className="form-control td-right"
                      value={row.quantity}
                      onChange={(e) =>
                        setRowField(row.rowId, "quantity", e.target.value)
                      }
                      style={{ width: 80 }}
                    />
                  </td>

                  {/* COLUMNA 4: PRECIO UNITARIO */}
                  <td>
                    <input
                      type="number"
                      className="form-control td-right"
                      value={row.unit_price}
                      onChange={(e) =>
                        setRowField(row.rowId, "unit_price", e.target.value)
                      }
                      style={{ width: 120 }}
                    />
                  </td>

                  {/* COLUMNA 5 Y 6: TOTALES (Automáticos) */}
                  <td className="td-right">${fmt(row.line_vat)}</td>
                  <td className="td-right">
                    <strong>${fmt(row.line_total)}</strong>
                  </td>

                  {/* COLUMNA 7: BOTÓN ELIMINAR */}
                  <td>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => removeRow(row.rowId)}
                      disabled={rows.length === 1}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totales */}
      <div className="card">
        <div className="card-title">3. Resumen</div>
        <div className="totals-wrap">
          <div className="totals-box">
            <div className="row">
              <span>Subtotal:</span> <span>${fmt(totals.subtotal)}</span>
            </div>
            <div className="row">
              <span>IVA 19%:</span> <span>${fmt(totals.vat_total)}</span>
            </div>
            <div className="row grand">
              <span>TOTAL:</span> <span>${fmt(totals.total)}</span>
            </div>
          </div>
        </div>

        <div className="form-actions" style={{ marginTop: 16 }}>
          <button className="btn btn-ghost" onClick={goBack}>
            Cancelar
          </button>
          <button
            className="btn btn-success"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="spinner" /> Guardando…
              </>
            ) : (
              "💾 Guardar factura"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
