import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  getInvoices, getCustomers, getProducts,
  createInvoice, getNextCounter, formatInvoiceNumber,
  generateCUFE, calcLineTotals, calcInvoiceTotals, generateId,
  type Invoice, type Customer, type Product, type InvoiceItem,
} from '../lib/storage'

// ── Fila editable de item ──────────────────────────────────────────────────
interface ItemRow {
  rowId: string
  product_id: string
  product_name: string
  sku?: string
  unit: string
  quantity: string       // string para el input
  unit_price: string     // string para el input (editable)
}

function emptyRow(): ItemRow {
  return { rowId: generateId(), product_id: '', product_name: '', unit: 'UND', quantity: '1', unit_price: '' }
}

// ── Modo: list | create ───────────────────────────────────────────────────
type Mode = 'list' | 'create'

export default function Invoices() {
  const [mode, setMode] = useState<Mode>('list')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])

  // Form state
  const [customerId, setCustomerId] = useState('')
  const [rows, setRows] = useState<ItemRow[]>([emptyRow()])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    setInvoices(getInvoices().slice().reverse())
    setCustomers(getCustomers())
    setProducts(getProducts())
  }, [])

  function refresh() {
    setInvoices(getInvoices().slice().reverse())
  }

  // ── Cálculos en tiempo real ─────────────────────────────────────────────
  const computedRows = useMemo(() =>
    rows.map(row => {
      const qty = parseFloat(row.quantity) || 0
      const price = parseFloat(row.unit_price) || 0
      return { ...row, ...calcLineTotals(qty, price, 0.19) }
    }), [rows])

  const totals = useMemo(() =>
    calcInvoiceTotals(computedRows), [computedRows])

  // ── Handlers de rows ───────────────────────────────────────────────────
  function setRowField(rowId: string, field: keyof ItemRow, value: string) {
    setRows(prev => prev.map(r => r.rowId === rowId ? { ...r, [field]: value } : r))
  }

  function selectProduct(rowId: string, productId: string) {
    const p = products.find(p => p.id === productId)
    if (!p) { setRowField(rowId, 'product_id', ''); return }
    setRows(prev => prev.map(r => r.rowId === rowId
      ? { ...r, product_id: p.id, product_name: p.name, sku: p.sku, unit: p.unit, unit_price: String(p.price_sale) }
      : r
    ))
  }

  function addRow() { setRows(prev => [...prev, emptyRow()]) }
  function removeRow(rowId: string) {
    if (rows.length === 1) return
    setRows(prev => prev.filter(r => r.rowId !== rowId))
  }

  // ── Guardar factura ─────────────────────────────────────────────────────
  async function handleSave() {
    setFormError('')
    if (!customerId) { setFormError('Selecciona un cliente'); return }
    const validRows = computedRows.filter(r => r.product_id && parseFloat(r.quantity) > 0)
    if (validRows.length === 0) { setFormError('Agrega al menos un producto con cantidad > 0'); return }

    setSaving(true)
    try {
      const customer = customers.find(c => c.id === customerId)!
      const number = getNextCounter()
      const invoiceNumber = formatInvoiceNumber(number)
      const now = new Date().toISOString()

      const cufe = await generateCUFE(invoiceNumber, customer.nit, String(totals.total), now)

      const items: InvoiceItem[] = validRows.map(r => ({
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
      }))

      createInvoice({
        invoice_number: invoiceNumber,
        customer_id: customer.id,
        customer_snapshot: {
          company_name: customer.company_name,
          nit: customer.nit,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          website: customer.website,
          legal_representative: customer.legal_representative,
          economic_activity: customer.economic_activity,
        },
        items,
        subtotal: totals.subtotal,
        vat_total: totals.vat_total,
        total: totals.total,
        cufe,
      })

      // Reset
      setCustomerId('')
      setRows([emptyRow()])
      refresh()
      setMode('list')
    } finally {
      setSaving(false)
    }
  }

  function fmt(n: number) {
    return n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // ──────────────────────────────────────────────────────────────────────────
  // LISTA
  // ──────────────────────────────────────────────────────────────────────────
  if (mode === 'list') {
    return (
      <div>
        <div className="page-header">
          <h1>Facturas</h1>
          {customers.length === 0 || products.length === 0
            ? <span className="badge badge-amber">⚠ Necesitas clientes y productos primero</span>
            : <button className="btn btn-primary" onClick={() => setMode('create')}>+ Nueva factura</button>
          }
        </div>

        <div className="card">
          {invoices.length === 0 ? (
            <div className="empty-state">
              <p>No hay facturas. Crea la primera.</p>
              {(customers.length === 0 || products.length === 0) && (
                <p style={{ marginTop: 12, color: '#d97706' }}>
                  Primero ve a <strong>Clientes</strong> y <strong>Productos</strong> para agregar datos.
                </p>
              )}
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>N° Factura</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th className="td-right">Subtotal</th>
                    <th className="td-right">IVA 19%</th>
                    <th className="td-right">Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id}>
                      <td><span className="badge badge-blue">{inv.invoice_number}</span></td>
                      <td>{new Date(inv.created_at).toLocaleDateString('es-CO')}</td>
                      <td>{inv.customer_snapshot.company_name}</td>
                      <td className="td-right">${fmt(inv.subtotal)}</td>
                      <td className="td-right">${fmt(inv.vat_total)}</td>
                      <td className="td-right"><strong>${fmt(inv.total)}</strong></td>
                      <td>
                        <Link to={`/invoices/${inv.id}`} className="btn btn-ghost btn-sm">Ver / PDF</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CREAR
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="page-header">
        <h1>Nueva Factura</h1>
        <button className="btn btn-ghost" onClick={() => { setMode('list'); setFormError('') }}>← Volver</button>
      </div>

      {formError && <div className="alert alert-error">{formError}</div>}

      {/* Cliente */}
      <div className="card">
        <div className="card-title">1. Seleccionar cliente</div>
        <div className="form-grid cols-1">
          <div className="form-group">
            <label>Cliente *</label>
            <select value={customerId} onChange={e => setCustomerId(e.target.value)}>
              <option value="">— Selecciona un cliente —</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.company_name} — NIT: {c.nit}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="card">
        <div className="items-header">
          <span>2. Productos / Ítems</span>
          <button className="btn btn-ghost btn-sm" onClick={addRow}>+ Agregar ítem</button>
        </div>

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
                  <td style={{ minWidth: 180 }}>
                    <select
                      value={row.product_id}
                      onChange={e => selectProduct(row.rowId, e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="">— Producto —</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ''}</option>
                      ))}
                    </select>
                  </td>
                  <td>{row.unit}</td>
                  <td>
                    <input
                      type="number" min="1" step="1"
                      value={row.quantity}
                      onChange={e => setRowField(row.rowId, 'quantity', e.target.value)}
                      style={{ width: 70, textAlign: 'right' }}
                    />
                  </td>
                  <td>
                    <input
                      type="number" min="0" step="0.01"
                      value={row.unit_price}
                      onChange={e => setRowField(row.rowId, 'unit_price', e.target.value)}
                      style={{ width: 110, textAlign: 'right' }}
                    />
                  </td>
                  <td className="td-right">${fmt(row.line_vat)}</td>
                  <td className="td-right"><strong>${fmt(row.line_total)}</strong></td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => removeRow(row.rowId)}
                      disabled={rows.length === 1}>✕</button>
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
            <div className="row"><span>Subtotal:</span> <span>${fmt(totals.subtotal)}</span></div>
            <div className="row"><span>IVA 19%:</span> <span>${fmt(totals.vat_total)}</span></div>
            <div className="row grand"><span>TOTAL:</span> <span>${fmt(totals.total)}</span></div>
          </div>
        </div>

        <div className="form-actions" style={{ marginTop: 16 }}>
          <button className="btn btn-ghost" onClick={() => { setMode('list'); setFormError('') }}>Cancelar</button>
          <button className="btn btn-success" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="spinner" /> Guardando…</> : '💾 Guardar factura'}
          </button>
        </div>
      </div>
    </div>
  )
}
