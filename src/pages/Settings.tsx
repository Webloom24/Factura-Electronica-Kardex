import { useState } from 'react'
import { exportData, importData, SEED_PRODUCTS, VELVETGLOW_SEED,
         getProducts, saveProducts, getCustomers, createCustomer,
         generateId, getEmisor, saveEmisor, getStores, saveStores,
         type Emisor, type StoreConfig } from '../lib/storage'

export default function Settings() {
  const [importStatus, setImportStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const [importing, setImporting] = useState(false)

  // ── Emisor ──────────────────────────────────────────────────
  const [emisor, setEmisor] = useState<Emisor>(getEmisor)
  const [emisorSaved, setEmisorSaved] = useState(false)

  function handleSaveEmisor(e: React.FormEvent) {
    e.preventDefault()
    saveEmisor(emisor)
    setEmisorSaved(true)
    setTimeout(() => setEmisorSaved(false), 2500)
  }

  const setE = (k: keyof Emisor) => (ev: React.ChangeEvent<HTMLInputElement>) =>
    setEmisor(prev => ({ ...prev, [k]: ev.target.value }))

  // ── Tiendas ──────────────────────────────────────────────────
  const [stores, setStores] = useState<StoreConfig[]>(getStores)
  const [storesSaved, setStoresSaved] = useState(false)

  function handleSaveStores(e: React.FormEvent) {
    e.preventDefault()
    saveStores(stores)
    setStoresSaved(true)
    setTimeout(() => setStoresSaved(false), 2500)
  }

  function updateStore(id: string, field: keyof StoreConfig, value: string) {
    setStores(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  function addStore() {
    const newStore: StoreConfig = { id: generateId(), label: '', skuPrefix: '', bg: '#6366f1' }
    setStores(prev => [...prev, newStore])
  }

  function removeStore(id: string) {
    setStores(prev => prev.filter(s => s.id !== id))
  }

  // ── Export ───────────────────────────────────────────────────
  function handleExport() {
    const data = exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `factura-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Import ───────────────────────────────────────────────────
  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportStatus(null)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result as string)
        const result = importData(raw)
        if (result.ok) {
          setImportStatus({ ok: true, msg: 'Datos importados. Recarga la app para ver los cambios.' })
        } else {
          setImportStatus({ ok: false, msg: result.error ?? 'Error desconocido' })
        }
      } catch {
        setImportStatus({ ok: false, msg: 'El archivo no es JSON válido.' })
      } finally {
        setImporting(false)
        e.target.value = ''
      }
    }
    reader.onerror = () => {
      setImportStatus({ ok: false, msg: 'No se pudo leer el archivo.' })
      setImporting(false)
    }
    reader.readAsText(file)
  }

  // ── Seed ─────────────────────────────────────────────────────
  function handleLoadSample() {
    if (!confirm('¿Cargar los 21 productos de muestra y el cliente VelvetGlow?\nEsto agregará los datos sin borrar lo que ya tienes.')) return
    const now = new Date().toISOString()
    const existing = getProducts()
    const existingSkus = new Set(existing.map(p => p.sku))
    const toAdd = SEED_PRODUCTS
      .filter(p => !p.sku || !existingSkus.has(p.sku))
      .map(p => ({ ...p, id: generateId(), created_at: now }))
    saveProducts([...existing, ...toAdd])
    const customers = getCustomers()
    if (!customers.find(c => c.nit === VELVETGLOW_SEED.nit)) {
      createCustomer(VELVETGLOW_SEED)
    }
    alert(`✅ Se cargaron ${toAdd.length} productos nuevos.`)
    window.location.reload()
  }

  // ── Reset ─────────────────────────────────────────────────────
  function handleReset() {
    if (!confirm('¿Borrar TODOS los datos? Esta acción no se puede deshacer.')) return
    localStorage.clear()
    window.location.reload()
  }

  return (
    <div>
      <div className="page-header">
        <h1>Configuración</h1>
      </div>

      {/* ── EMISOR ─────────────────────────────────────────── */}
      <div className="card">
        <div className="card-title">🏢 Datos de tu empresa (aparecen en el PDF)</div>
        {emisorSaved && <div className="alert alert-success">Datos guardados correctamente.</div>}
        <form onSubmit={handleSaveEmisor}>
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Nombre / Razón Social *</label>
              <input value={emisor.name} onChange={setE('name')} placeholder="Mi Empresa S.A.S." required />
            </div>
            <div className="form-group">
              <label>NIT *</label>
              <input value={emisor.nit} onChange={setE('nit')} placeholder="900.000.001-0" required />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input value={emisor.phone} onChange={setE('phone')} placeholder="300-000-0000" />
            </div>
            <div className="form-group full-width">
              <label>Dirección</label>
              <input value={emisor.address} onChange={setE('address')} placeholder="Calle 1 # 1-1, Ciudad" />
            </div>
            <div className="form-group full-width">
              <label>Email</label>
              <input type="email" value={emisor.email} onChange={setE('email')} placeholder="facturacion@miempresa.com" />
            </div>
            <div className="form-group full-width">
              <label>Resolución (texto que aparece al pie del PDF)</label>
              <input value={emisor.resolution} onChange={setE('resolution')} placeholder="Res. XXXXX · Rango: 0001 – 1000" />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">💾 Guardar datos de empresa</button>
          </div>
        </form>
      </div>

      {/* ── TIENDAS ────────────────────────────────────────── */}
      <div className="card">
        <div className="card-title">🏪 Tiendas</div>
        <p style={{ marginBottom: 14, color: '#64748b', fontSize: '0.9rem' }}>
          Agrega, edita o elimina tiendas. Cada una tiene su nombre, prefijo de SKU y color.
        </p>
        {storesSaved && <div className="alert alert-success">Tiendas guardadas correctamente.</div>}
        <form onSubmit={handleSaveStores}>
          {stores.map((store, idx) => (
            <div key={store.id} className="settings-store-row" style={{
              display: 'flex', gap: 10, alignItems: 'flex-end',
              padding: '12px 0', borderBottom: idx < stores.length - 1 ? '1px solid #f1f5f9' : 'none',
            }}>
              {/* Preview badge */}
              <div style={{ flexShrink: 0, paddingBottom: 6 }}>
                <span style={{
                  background: store.bg || '#94a3b8', color: '#fff',
                  borderRadius: 6, padding: '4px 14px', fontWeight: 600, fontSize: '0.85rem',
                  whiteSpace: 'nowrap',
                }}>
                  {store.label || 'Nueva tienda'}
                </span>
              </div>

              {/* Nombre */}
              <div className="form-group" style={{ flex: 2, margin: 0 }}>
                <label style={{ fontSize: '0.78rem' }}>Nombre</label>
                <input
                  value={store.label}
                  onChange={e => updateStore(store.id, 'label', e.target.value)}
                  placeholder="Ej: Mi Tienda"
                  required
                />
              </div>

              {/* Prefijo SKU */}
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <label style={{ fontSize: '0.78rem' }}>Prefijo SKU</label>
                <input
                  value={store.skuPrefix}
                  onChange={e => updateStore(store.id, 'skuPrefix', e.target.value)}
                  placeholder="Ej: TDA-"
                />
              </div>

              {/* Color */}
              <div className="form-group" style={{ flexShrink: 0, margin: 0 }}>
                <label style={{ fontSize: '0.78rem' }}>Color</label>
                <div className="settings-store-color" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="color"
                    value={store.bg || '#6366f1'}
                    onChange={e => updateStore(store.id, 'bg', e.target.value)}
                    style={{ width: 40, height: 36, padding: 2, cursor: 'pointer', border: '1px solid #e2e8f0', borderRadius: 6 }}
                  />
                  <input
                    value={store.bg}
                    onChange={e => updateStore(store.id, 'bg', e.target.value)}
                    placeholder="#6366f1"
                    style={{ width: 90 }}
                  />
                </div>
              </div>

              {/* Borrar */}
              <div style={{ flexShrink: 0, paddingBottom: 2 }}>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => removeStore(store.id)}
                  disabled={stores.length <= 1}
                  title="Eliminar tienda"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}

          <div className="settings-store-actions" style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" className="btn btn-ghost" onClick={addStore}>
              + Agregar tienda
            </button>
            <button type="submit" className="btn btn-primary">💾 Guardar tiendas</button>
          </div>
        </form>
      </div>

      {/* ── SEED ──────────────────────────────────────────── */}
      <div className="card" style={{ borderColor: '#86efac' }}>
        <div className="card-title" style={{ color: '#16a34a' }}>🌱 Cargar datos de muestra</div>
        <p style={{ marginBottom: 14, color: '#64748b', fontSize: '0.9rem' }}>
          Carga los <strong>21 productos del Kardex</strong> (Ruby Rose &amp; Trendy) y el cliente <strong>VelvetGlow</strong>.
          No borra nada que ya exista.
        </p>
        <button className="btn btn-success" onClick={handleLoadSample}>
          ⭐ Cargar productos y cliente de muestra
        </button>
      </div>

      {/* ── EXPORT ────────────────────────────────────────── */}
      <div className="card">
        <div className="card-title">📤 Exportar datos</div>
        <p style={{ marginBottom: 14, color: '#64748b', fontSize: '0.9rem' }}>
          Descarga todos tus productos, clientes, facturas y cheques como archivo JSON. Guárdalo como respaldo.
        </p>
        <button className="btn btn-primary" onClick={handleExport}>
          Descargar backup JSON
        </button>
      </div>

      {/* ── IMPORT ────────────────────────────────────────── */}
      <div className="card">
        <div className="card-title">📥 Importar datos</div>
        <p style={{ marginBottom: 14, color: '#64748b', fontSize: '0.9rem' }}>
          Restaura desde un archivo JSON exportado anteriormente, incluyendo cheques si existen en el respaldo.
          <strong style={{ color: '#dc2626' }}> Los datos actuales serán reemplazados.</strong>
        </p>
        {importStatus && (
          <div className={`alert ${importStatus.ok ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 14 }}>
            {importStatus.msg}
          </div>
        )}
        <label className="btn btn-warning" style={{ cursor: 'pointer' }}>
          {importing ? <><span className="spinner" /> Importando…</> : '📂 Seleccionar archivo JSON'}
          <input type="file" accept=".json,application/json"
            onChange={handleImportFile} style={{ display: 'none' }} disabled={importing} />
        </label>
      </div>

      {/* ── RESET ─────────────────────────────────────────── */}
      <div className="card" style={{ borderColor: '#fca5a5' }}>
        <div className="card-title" style={{ color: '#dc2626' }}>⚠ Zona de peligro</div>
        <p style={{ marginBottom: 14, color: '#64748b', fontSize: '0.9rem' }}>
          Elimina absolutamente todos los datos almacenados en este navegador.
        </p>
        <button className="btn btn-danger" onClick={handleReset}>
          Borrar todos los datos
        </button>
      </div>
    </div>
  )
}
