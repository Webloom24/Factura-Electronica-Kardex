import { useState, useEffect } from 'react'
import {
  getProducts, createProduct, updateProduct, deleteProduct,
  type Product,
} from '../lib/storage'

interface FormState {
  name: string
  sku: string
  unit: string
  price_sale: string
}

const EMPTY_FORM: FormState = { name: '', sku: '', unit: 'UND', price_sale: '' }

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [error, setError] = useState('')

  useEffect(() => { setProducts(getProducts()) }, [])

  function refresh() { setProducts(getProducts()) }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowModal(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
    setForm({ name: p.name, sku: p.sku ?? '', unit: p.unit, price_sale: String(p.price_sale) })
    setError('')
    setShowModal(true)
  }

  function handleDelete(id: string) {
    if (!confirm('¿Eliminar este producto?')) return
    deleteProduct(id)
    refresh()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const name = form.name.trim()
    if (!name) { setError('El nombre es obligatorio'); return }
    const price = parseFloat(form.price_sale)
    if (isNaN(price) || price < 0) { setError('Precio de venta inválido'); return }

    const data = {
      name,
      sku: form.sku.trim() || undefined,
      unit: form.unit.trim() || 'UND',
      price_sale: price,
      vat_rate: 0.19,
    }

    if (editing) {
      updateProduct(editing.id, data)
    } else {
      createProduct(data)
    }
    setShowModal(false)
    refresh()
  }

  function fmt(n: number) {
    return n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div>
      <div className="page-header">
        <h1>Productos</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Nuevo producto</button>
      </div>

      <div className="card">
        {products.length === 0 ? (
          <div className="empty-state">
            <p>No hay productos. Crea el primero.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>SKU</th>
                  <th>Unidad</th>
                  <th className="td-right">Precio venta</th>
                  <th className="td-right">IVA</th>
                  <th className="td-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.sku ?? <span style={{ color: '#aaa' }}>—</span>}</td>
                    <td>{p.unit}</td>
                    <td className="td-right">${fmt(p.price_sale)}</td>
                    <td className="td-right">19%</td>
                    <td className="td-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>Editar</button>
                      {' '}
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{editing ? 'Editar producto' : 'Nuevo producto'}</div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Nombre *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej. Polvo suelto Melu" />
                </div>
                <div className="form-group">
                  <label>SKU (opcional)</label>
                  <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="Ej. MEL-120" />
                </div>
                <div className="form-group">
                  <label>Unidad</label>
                  <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="UND" />
                </div>
                <div className="form-group">
                  <label>Precio de venta (COP) *</label>
                  <input type="number" min="0" step="0.01" value={form.price_sale}
                    onChange={e => setForm(f => ({ ...f, price_sale: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label>IVA</label>
                  <input value="19% (fijo)" readOnly />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  {editing ? 'Guardar cambios' : 'Crear producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
