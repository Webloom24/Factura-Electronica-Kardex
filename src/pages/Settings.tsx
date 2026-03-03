import { useState } from 'react'
import { exportData, importData, SEED_PRODUCTS, VELVETGLOW_SEED,
         getProducts, saveProducts, getCustomers, createCustomer,
         generateId, getEmisor, saveEmisor, getStores, saveStores,
         type Emisor, type Stores } from '../lib/storage'

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
  const [stores, setStores] = useState<Stores>(getStores)
  const [storesSaved, setStoresSaved] = useState(false)

  function handleSaveStores(e: React.FormEvent) {
    e.preventDefault()
    saveStores(stores)
    setStoresSaved(true)
    setTimeout(() => setStoresSaved(false), 2500)
  }

  function setStore(key: keyof Stores, field: string) {
    return (ev: React.ChangeEvent<HTMLInputElement>) =>
      setStores(prev => ({ ...prev, [key]: { ...prev[key], [field]: ev.target.value } }))
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
        <div className="card-title">🏪 Configuración de tiendas</div>
        <p style={{ marginBottom: 14, color: '#64748b', fontSize: '0.9rem' }}>
          Personaliza el nombre, prefijo de SKU y color de cada tienda. Estos datos se usan en facturas y PDF.
        </p>
        {storesSaved && <div className="alert alert-success">Tiendas guardadas correctamente.</div>}
        <form onSubmit={handleSaveStores}>
          {(['ruby_rose', 'trendy'] as const).map(key => (
            <div key={key} style={{ marginBottom: 20 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
              }}>
                <span style={{
                  background: stores[key].bg, color: '#fff',
                  borderRadius: 6, padding: '2px 12px', fontWeight: 600, fontSize: '0.9rem',
                }}>
                  {stores[key].label || (key === 'ruby_rose' ? 'Tienda 1' : 'Tienda 2')}
                </span>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                  ({key === 'ruby_rose' ? 'Tienda 1' : 'Tienda 2'})
                </span>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre</label>
                  <input
                    value={stores[key].label}
                    onChange={setStore(key, 'label')}
                    placeholder={key === 'ruby_rose' ? 'Ruby Rose' : 'Trendy'}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Prefijo SKU</label>
                  <input
                    value={stores[key].skuPrefix}
                    onChange={setStore(key, 'skuPrefix')}
                    placeholder={key === 'ruby_rose' ? 'MEL-' : 'CAM-'}
                  />
                </div>
                <div className="form-group">
                  <label>Color del badge</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={stores[key].bg}
                      onChange={setStore(key, 'bg')}
                      style={{ width: 44, height: 36, padding: 2, cursor: 'pointer', border: '1px solid #e2e8f0', borderRadius: 6 }}
                    />
                    <input
                      value={stores[key].bg}
                      onChange={setStore(key, 'bg')}
                      placeholder="#db2777"
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div className="form-actions">
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
          Descarga todos tus productos, clientes y facturas como archivo JSON. Guárdalo como respaldo.
        </p>
        <button className="btn btn-primary" onClick={handleExport}>
          Descargar backup JSON
        </button>
      </div>

      {/* ── IMPORT ────────────────────────────────────────── */}
      <div className="card">
        <div className="card-title">📥 Importar datos</div>
        <p style={{ marginBottom: 14, color: '#64748b', fontSize: '0.9rem' }}>
          Restaura desde un archivo JSON exportado anteriormente.
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
