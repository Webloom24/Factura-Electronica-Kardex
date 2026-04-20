import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  DEFAULT_VAT_RATE,
  PRODUCTS_UPDATED_EVENT,
  calcInvoiceTotals,
  calcLineTotals,
  createInvoice,
  formatInvoiceNumber,
  generateCUFE,
  generateId,
  getCustomers,
  getEmisor,
  getInvoices,
  getNextCounter,
  getProducts,
  getProductVatRate,
  getStores,
  updateInvoice,
  type Customer,
  type Invoice,
  type InvoiceItem,
  type Product,
  type StoreConfig,
} from "../lib/storage";

interface ItemRow {
  rowId: string;
  product_id: string;
  product_name: string;
  sku?: string;
  unit: string;
  quantity: string;
  unit_price: string;
  vat_rate: number;
}

type EditableCustomer = {
  company_name: string;
  nit: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  legal_representative: string;
  economic_activity: string;
};

type EditableEmitter = {
  label: string;
  nit: string;
  address: string;
  phone: string;
  email: string;
};

const EMPTY_EDIT_CUSTOMER: EditableCustomer = {
  company_name: "",
  nit: "",
  email: "",
  phone: "",
  address: "",
  website: "",
  legal_representative: "",
  economic_activity: "",
};

const EMPTY_EDIT_EMITTER: EditableEmitter = {
  label: "",
  nit: "",
  address: "",
  phone: "",
  email: "",
};

function emptyRow(): ItemRow {
  return {
    rowId: generateId(),
    product_id: "",
    product_name: "",
    sku: "",
    unit: "UND",
    quantity: "1",
    unit_price: "",
    vat_rate: DEFAULT_VAT_RATE,
  };
}

function toEditableCustomer(
  source?: Partial<Customer> | Partial<Invoice["customer_snapshot"]>,
): EditableCustomer {
  return {
    company_name: source?.company_name ?? "",
    nit: source?.nit ?? "",
    email: source?.email ?? "",
    phone: source?.phone ?? "",
    address: source?.address ?? "",
    website: source?.website ?? "",
    legal_representative: source?.legal_representative ?? "",
    economic_activity: source?.economic_activity ?? "",
  };
}

function toEditableEmitter(source?: Partial<EditableEmitter>): EditableEmitter {
  return {
    label: source?.label ?? "",
    nit: source?.nit ?? "",
    address: source?.address ?? "",
    phone: source?.phone ?? "",
    email: source?.email ?? "",
  };
}

function SupplierBadge({
  storeId,
  stores,
}: {
  storeId?: string;
  stores: StoreConfig[];
}) {
  if (!storeId) return null;
  const store = stores.find((item) => item.id === storeId);
  if (!store) return <span className="badge badge-amber">{storeId}</span>;

  return (
    <span className="badge" style={{ background: store.bg, color: "#fff" }}>
      {store.label}
    </span>
  );
}

export default function Invoices() {
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<StoreConfig[]>(getStores);
  const [customerId, setCustomerId] = useState("");
  const [rows, setRows] = useState<ItemRow[]>([emptyRow()]);
  const [editCustomer, setEditCustomer] =
    useState<EditableCustomer>(EMPTY_EDIT_CUSTOMER);
  const [editEmitter, setEditEmitter] =
    useState<EditableEmitter>(EMPTY_EDIT_EMITTER);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setInvoices(getInvoices().slice().reverse());
    setCustomers(getCustomers());
    setProducts(getProducts());
    setStores(getStores());
  }, []);

  useEffect(() => {
    const refreshCatalogs = () => {
      setCustomers(getCustomers());
      setProducts(getProducts());
      setStores(getStores());
    };

    window.addEventListener(PRODUCTS_UPDATED_EVENT, refreshCatalogs);
    window.addEventListener("storage", refreshCatalogs);

    return () => {
      window.removeEventListener(PRODUCTS_UPDATED_EVENT, refreshCatalogs);
      window.removeEventListener("storage", refreshCatalogs);
    };
  }, []);

  useEffect(() => {
    if (!activeStoreId || editingInvoiceId) return;

    const baseEmisor = getEmisor();
    const activeStore = stores.find((store) => store.id === activeStoreId);

    setEditEmitter(
      toEditableEmitter({
        label: activeStore?.label || baseEmisor.name,
        nit: baseEmisor.nit,
        address: baseEmisor.address,
        phone: baseEmisor.phone,
        email: baseEmisor.email,
      }),
    );
  }, [activeStoreId, editingInvoiceId, stores]);

  function refreshInvoices() {
    setInvoices(getInvoices().slice().reverse());
  }

  function goBack() {
    setActiveStoreId(null);
    setEditingInvoiceId(null);
    setCustomerId("");
    setRows([emptyRow()]);
    setEditCustomer(EMPTY_EDIT_CUSTOMER);
    setEditEmitter(EMPTY_EDIT_EMITTER);
    setFormError("");
  }

  function startEdit(invoice: Invoice) {
    setEditingInvoiceId(invoice.id);
    setActiveStoreId(invoice.supplier || "ruby_rose");
    setCustomerId(invoice.customer_id);
    setEditEmitter(
      toEditableEmitter({
        label: invoice.supplier_label,
        nit: invoice.supplier_nit,
        address: invoice.supplier_address,
        phone: invoice.supplier_phone,
        email: invoice.supplier_email,
      }),
    );
    setEditCustomer(toEditableCustomer(invoice.customer_snapshot));
    setRows(
      invoice.items.map((item) => ({
        rowId: generateId(),
        product_id: item.product_id,
        product_name: item.product_name,
        sku: item.sku ?? "",
        unit: item.unit,
        quantity: String(item.quantity),
        unit_price: String(item.unit_price),
        vat_rate:
          typeof item.vat_rate === "number" ? item.vat_rate : DEFAULT_VAT_RATE,
      })),
    );
    setFormError("");
    window.scrollTo(0, 0);
  }

  const activeStore = activeStoreId
    ? stores.find((store) => store.id === activeStoreId) ?? null
    : null;

  const supplierProducts = useMemo(() => {
    if (!activeStore) return products;
    return products.filter((product) =>
      product.sku?.startsWith(activeStore.skuPrefix),
    );
  }, [activeStore, products]);

  const computedRows = useMemo(
    () =>
      rows.map((row) => {
        const quantity = parseFloat(row.quantity) || 0;
        const unitPrice = parseFloat(row.unit_price) || 0;
        return {
          ...row,
          ...calcLineTotals(quantity, unitPrice, row.vat_rate),
        };
      }),
    [rows],
  );

  const totals = useMemo(() => calcInvoiceTotals(computedRows), [computedRows]);

  function setRowField(rowId: string, field: keyof ItemRow, value: string) {
    setRows((prev) =>
      prev.map((row) => (row.rowId === rowId ? { ...row, [field]: value } : row)),
    );
  }

  function handleCustomerChange(nextCustomerId: string) {
    setCustomerId(nextCustomerId);
    if (!nextCustomerId) return;

    const selectedCustomer = customers.find(
      (customer) => customer.id === nextCustomerId,
    );
    if (!selectedCustomer) return;

    setEditCustomer(toEditableCustomer(selectedCustomer));
  }

  function selectProduct(rowId: string, productId: string) {
    const normalizedProductId = String(productId);
    const product = supplierProducts.find(
      (item) => String(item.id) === normalizedProductId,
    );

    if (!product) {
      setRows((prev) =>
        prev.map((row) =>
          row.rowId === rowId
            ? {
                ...row,
                product_id: "",
                product_name: "",
                sku: "",
                unit: "UND",
                unit_price: "",
                vat_rate: DEFAULT_VAT_RATE,
              }
            : row,
        ),
      );
      return;
    }

    setRows((prev) =>
      prev.map((row) =>
        row.rowId === rowId
          ? {
              ...row,
              product_id: String(product.id),
              product_name: product.name,
              sku: product.sku ?? "",
              unit: product.unit,
              unit_price: String(product.price_sale),
              vat_rate: getProductVatRate(product),
            }
          : row,
      ),
    );
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(rowId: string) {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((row) => row.rowId !== rowId));
  }

  async function handleSave() {
    setFormError("");

    if (!customerId && !editCustomer.company_name.trim()) {
      setFormError("Selecciona un cliente o ingresa su Razón Social");
      return;
    }

    const validRows = computedRows.filter(
      (row) => row.product_id && parseFloat(row.quantity) > 0,
    );
    if (validRows.length === 0) {
      setFormError("Agrega al menos un producto con cantidad > 0");
      return;
    }

    setSaving(true);

    try {
      const now = new Date().toISOString();

      const items: InvoiceItem[] = validRows.map((row) => ({
        id: generateId(),
        product_id: row.product_id,
        product_name: row.product_name,
        sku: row.sku?.trim() || undefined,
        unit: row.unit.trim() || "UND",
        quantity: parseFloat(row.quantity),
        unit_price: parseFloat(row.unit_price),
        vat_rate: row.vat_rate,
        line_subtotal: row.line_subtotal,
        line_vat: row.line_vat,
        line_total: row.line_total,
      }));

      const customerSnapshot = {
        company_name: editCustomer.company_name.trim(),
        nit: editCustomer.nit.trim(),
        email: editCustomer.email.trim(),
        phone: editCustomer.phone.trim(),
        address: editCustomer.address.trim(),
        website: editCustomer.website.trim(),
        legal_representative: editCustomer.legal_representative.trim(),
        economic_activity: editCustomer.economic_activity.trim(),
      };

      const invoiceData = {
        supplier: activeStoreId ?? undefined,
        supplier_label: editEmitter.label.trim(),
        supplier_nit: editEmitter.nit.trim(),
        supplier_address: editEmitter.address.trim(),
        supplier_phone: editEmitter.phone.trim(),
        supplier_email: editEmitter.email.trim(),
        customer_id: customerId,
        customer_snapshot: customerSnapshot,
        items,
        subtotal: totals.subtotal,
        vat_total: totals.vat_total,
        total: totals.total,
      };

      if (editingInvoiceId) {
        updateInvoice(editingInvoiceId, invoiceData);
      } else {
        const number = getNextCounter();
        const invoiceNumber = formatInvoiceNumber(number);
        const cufe = await generateCUFE(
          invoiceNumber,
          customerSnapshot.nit || "222222222222",
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
      refreshInvoices();
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

  if (activeStoreId === null) {
    const noData = customers.length === 0 || products.length === 0;

    return (
      <div>
        <div className="page-header">
          <h1>Facturas</h1>
          {noData ? (
            <span className="badge badge-amber">
              Necesitas clientes y productos primero
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
                    <th className="td-right">IVA</th>
                    <th className="td-right">Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>
                        <span className="badge badge-blue">
                          {invoice.invoice_number}
                        </span>
                      </td>
                      <td>
                        <SupplierBadge
                          storeId={invoice.supplier}
                          stores={stores}
                        />
                      </td>
                      <td>
                        {new Date(invoice.created_at).toLocaleDateString("es-CO")}
                      </td>
                      <td>{invoice.customer_snapshot.company_name}</td>
                      <td className="td-right">${fmt(invoice.subtotal)}</td>
                      <td className="td-right">${fmt(invoice.vat_total)}</td>
                      <td className="td-right">
                        <strong>${fmt(invoice.total)}</strong>
                      </td>
                      <td className="td-actions">
                        <div className="table-actions">
                          <Link
                            to={`/invoices/${invoice.id}`}
                            className="btn btn-ghost btn-sm"
                          >
                            Ver / PDF
                          </Link>
                          <button
                            onClick={() => startEdit(invoice)}
                            className="btn btn-ghost btn-sm"
                            style={{ color: "#7c3aed" }}
                          >
                            Editar
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
          Volver
        </button>
      </div>

      {formError && <div className="alert alert-error">{formError}</div>}

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
              value={editEmitter.email}
              onChange={(e) =>
                setEditEmitter({ ...editEmitter, email: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>Teléfono</label>
            <input
              type="text"
              value={editEmitter.phone}
              onChange={(e) =>
                setEditEmitter({ ...editEmitter, phone: e.target.value })
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

      <div className="card">
        <div className="card-title">2. Datos del Cliente</div>
        <div className="form-grid">
          <div className="form-group full-width">
            <label>Cliente guardado</label>
            <select
              value={customerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
            >
              <option value="">- Factura manual / editar snapshot -</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.company_name} - {customer.nit}
                </option>
              ))}
            </select>
          </div>
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
            <label>Teléfono</label>
            <input
              type="text"
              value={editCustomer.phone}
              onChange={(e) =>
                setEditCustomer({ ...editCustomer, phone: e.target.value })
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
          <div className="form-group full-width">
            <label>Dirección</label>
            <input
              type="text"
              value={editCustomer.address}
              onChange={(e) =>
                setEditCustomer({ ...editCustomer, address: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>Representante Legal</label>
            <input
              type="text"
              value={editCustomer.legal_representative}
              onChange={(e) =>
                setEditCustomer({
                  ...editCustomer,
                  legal_representative: e.target.value,
                })
              }
            />
          </div>
          <div className="form-group">
            <label>Actividad Económica</label>
            <input
              type="text"
              value={editCustomer.economic_activity}
              onChange={(e) =>
                setEditCustomer({
                  ...editCustomer,
                  economic_activity: e.target.value,
                })
              }
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="items-header">
          <span>3. Productos / Ítems</span>
          <button className="btn btn-ghost btn-sm" onClick={addRow}>
            + Agregar ítem
          </button>
        </div>

        {supplierProducts.length === 0 && (
          <div className="alert alert-info" style={{ marginBottom: 12 }}>
            No hay productos registrados para esta tienda. Ve a{" "}
            <strong>Productos</strong> y agrega productos con SKU{" "}
            <strong>{activeStore?.skuPrefix}...</strong>
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
                <th className="td-right">IVA</th>
                <th className="td-right">Total línea</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {computedRows.map((row) => (
                <tr key={row.rowId}>
                  <td style={{ minWidth: 250 }}>
                    <select
                      value={row.product_id}
                      onChange={(e) => selectProduct(row.rowId, e.target.value)}
                    >
                      <option value="">- Seleccionar Producto -</option>
                      {supplierProducts.map((product) => (
                        <option key={product.id} value={String(product.id)}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      className="mt-1 invoice-inline-input"
                      value={row.product_name}
                      onChange={(e) =>
                        setRowField(row.rowId, "product_name", e.target.value)
                      }
                      placeholder="Nombre visible..."
                    />
                    <input
                      type="text"
                      className="mt-1 invoice-inline-input"
                      value={row.sku ?? ""}
                      onChange={(e) => setRowField(row.rowId, "sku", e.target.value)}
                      placeholder="SKU visible..."
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="compact-input"
                      value={row.unit}
                      onChange={(e) => setRowField(row.rowId, "unit", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="td-right compact-input compact-input-qty"
                      value={row.quantity}
                      onChange={(e) =>
                        setRowField(row.rowId, "quantity", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="td-right compact-input compact-input-price"
                      value={row.unit_price}
                      onChange={(e) =>
                        setRowField(row.rowId, "unit_price", e.target.value)
                      }
                    />
                  </td>
                  <td className="td-right">
                    <div>{(row.vat_rate * 100).toFixed(0)}%</div>
                    <div className="text-muted">${fmt(row.line_vat)}</div>
                  </td>
                  <td className="td-right">
                    <strong>${fmt(row.line_total)}</strong>
                  </td>
                  <td className="td-actions">
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => removeRow(row.rowId)}
                      disabled={rows.length === 1}
                    >
                      X
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-title">4. Resumen</div>
        <div className="totals-wrap">
          <div className="totals-box">
            <div className="row">
              <span>Subtotal:</span>
              <span>${fmt(totals.subtotal)}</span>
            </div>
            <div className="row">
              <span>IVA:</span>
              <span>${fmt(totals.vat_total)}</span>
            </div>
            <div className="row grand">
              <span>TOTAL:</span>
              <span>${fmt(totals.total)}</span>
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
                <span className="spinner" /> Guardando...
              </>
            ) : editingInvoiceId ? (
              "Guardar cambios"
            ) : (
              "Guardar factura"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
