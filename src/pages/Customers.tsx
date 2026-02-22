import { useState, useEffect } from 'react'
import {
  getCustomers, createCustomer, updateCustomer, deleteCustomer,
  VELVETGLOW_SEED, type Customer,
} from '../lib/storage'

interface FormState {
  company_name: string
  nit: string
  email: string
  phone: string
  address: string
  website: string
  legal_representative: string
  economic_activity: string
}

const EMPTY_FORM: FormState = {
  company_name: '', nit: '', email: '', phone: '',
  address: '', website: '', legal_representative: '', economic_activity: '',
}

function seedToForm(s: typeof VELVETGLOW_SEED): FormState {
  return {
    company_name: s.company_name,
    nit: s.nit,
    email: s.email,
    phone: s.phone,
    address: s.address,
    website: s.website ?? '',
    legal_representative: s.legal_representative ?? '',
    economic_activity: s.economic_activity ?? '',
  }
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { setCustomers(getCustomers()) }, [])

  function refresh() { setCustomers(getCustomers()) }

  function openCreate() {
    setEditing(null); setForm(EMPTY_FORM); setError(''); setShowModal(true)
  }

  function openEdit(c: Customer) {
    setEditing(c)
    setForm({
      company_name: c.company_name, nit: c.nit, email: c.email, phone: c.phone,
      address: c.address, website: c.website ?? '',
      legal_representative: c.legal_representative ?? '',
      economic_activity: c.economic_activity ?? '',
    })
    setError(''); setShowModal(true)
  }

  function handleDelete(id: string) {
    if (!confirm('¿Eliminar este cliente?')) return
    deleteCustomer(id); refresh()
  }

  function handleVelvetGlow() {
    // Verificar si ya existe
    const exists = getCustomers().find(c => c.nit === VELVETGLOW_SEED.nit)
    if (exists) {
      setSuccess('El cliente VelvetGlow ya existe.')
      setTimeout(() => setSuccess(''), 3000)
      return
    }
    createCustomer(VELVETGLOW_SEED)
    setSuccess('Cliente VelvetGlow creado correctamente.')
    setTimeout(() => setSuccess(''), 3000)
    refresh()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!form.company_name.trim()) { setError('La razón social es obligatoria'); return }
    if (!form.nit.trim()) { setError('El NIT es obligatorio'); return }
    if (!form.email.trim()) { setError('El email es obligatorio'); return }
    if (!form.phone.trim()) { setError('El teléfono es obligatorio'); return }
    if (!form.address.trim()) { setError('La dirección es obligatoria'); return }

    const data = {
      company_name: form.company_name.trim(),
      nit: form.nit.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      website: form.website.trim() || undefined,
      legal_representative: form.legal_representative.trim() || undefined,
      economic_activity: form.economic_activity.trim() || undefined,
    }
    if (editing) { updateCustomer(editing.id, data) }
    else { createCustomer(data) }
    setShowModal(false); refresh()
  }

  const setF = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  return (
    <div>
      <div className="page-header">
        <h1>Clientes</h1>
        <div className="page-header-actions">
          <button className="btn btn-warning" onClick={handleVelvetGlow}>
            ⭐ Cargar VelvetGlow
          </button>
          <button className="btn btn-primary" onClick={openCreate}>+ Nuevo cliente</button>
        </div>
      </div>

      {success && <div className="alert alert-success">{success}</div>}

      <div className="card">
        {customers.length === 0 ? (
          <div className="empty-state">
            <p>No hay clientes. Crea uno o carga VelvetGlow.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Razón Social</th>
                  <th>NIT</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>Dirección</th>
                  <th className="td-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.company_name}</strong></td>
                    <td>{c.nit}</td>
                    <td>{c.email}</td>
                    <td>{c.phone}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.address}</td>
                    <td className="td-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>Editar</button>
                      {' '}
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>Eliminar</button>
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
          <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">{editing ? 'Editar cliente' : 'Nuevo cliente'}</div>
            {error && <div className="alert alert-error">{error}</div>}

            {!editing && (
              <div className="alert alert-info" style={{ marginBottom: 14 }}>
                <button
                  type="button"
                  className="btn btn-warning btn-sm"
                  onClick={() => setForm(seedToForm(VELVETGLOW_SEED))}
                  style={{ marginRight: 10 }}
                >
                  Llenar con VelvetGlow
                </button>
                Rellena los datos del cliente demo.
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Razón Social *</label>
                  <input value={form.company_name} onChange={setF('company_name')} placeholder="VelvetGlow" />
                </div>
                <div className="form-group">
                  <label>NIT *</label>
                  <input value={form.nit} onChange={setF('nit')} placeholder="894577890-4" />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" value={form.email} onChange={setF('email')} placeholder="correo@empresa.com" />
                </div>
                <div className="form-group">
                  <label>Teléfono *</label>
                  <input value={form.phone} onChange={setF('phone')} placeholder="3155542255" />
                </div>
                <div className="form-group">
                  <label>Sitio web (opcional)</label>
                  <input value={form.website} onChange={setF('website')} placeholder="VelvetGlow" />
                </div>
                <div className="form-group full-width">
                  <label>Dirección *</label>
                  <input value={form.address} onChange={setF('address')} placeholder="Cra. 35 #52-116, Cabecera del llano" />
                </div>
                <div className="form-group">
                  <label>Representante Legal (opcional)</label>
                  <input value={form.legal_representative} onChange={setF('legal_representative')} />
                </div>
                <div className="form-group">
                  <label>Actividad Económica (opcional)</label>
                  <input value={form.economic_activity} onChange={setF('economic_activity')} />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  {editing ? 'Guardar cambios' : 'Crear cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
