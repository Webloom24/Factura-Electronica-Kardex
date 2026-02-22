# 🧾 Factura Simulada

> **⚠ SIMULACIÓN ACADÉMICA** — Este sistema NO tiene validez fiscal.
> No está conectado a la DIAN ni genera documentos tributarios reales.
> Uso exclusivamente educativo.

Aplicación web 100% frontend que simula la generación de facturas electrónicas colombianas.
Todos los datos se guardan en el **navegador** (`localStorage`). No requiere servidor ni base de datos.

---

## ✨ Funcionalidades

| Módulo | Descripción |
|--------|-------------|
| **Productos** | CRUD con nombre, SKU, unidad, precio de venta, IVA fijo 19% |
| **Clientes** | CRUD + botón de carga rápida "VelvetGlow" |
| **Facturas** | Crear, listar y ver detalle; numeración consecutiva local |
| **PDF** | Generar PDF con diseño de factura real (marcado como SIMULADO) |
| **CUFE** | Hash SHA-256 simulado (96 chars, marcado como SIMULADO) |
| **Export/Import** | Backup y restore en JSON |

---

## 🚀 Cómo ejecutar localmente

### Prerrequisitos
- **Node.js 18+** — [descargar](https://nodejs.org)
- **npm** (viene con Node)

### Pasos

```bash
# 1. Clonar el repo
git clone https://github.com/TU-USUARIO/TU-REPO.git
cd TU-REPO

# 2. Instalar dependencias
npm install

# 3. Correr en desarrollo
npm run dev
```

Abre `http://localhost:5173` en el navegador.

### Build de producción (local)

```bash
npm run build
npm run preview   # sirve el build localmente
```

---

## 🌐 Deploy en GitHub Pages

### Paso 1 — Crear el repositorio en GitHub

1. Ve a [github.com/new](https://github.com/new)
2. Dale un nombre, por ejemplo `factura-simulada`
3. Déjalo público (GitHub Pages gratis requiere repo público)
4. Haz push de este código:

```bash
git init
git add .
git commit -m "feat: proyecto inicial factura simulada"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git push -u origin main
```

### Paso 2 — Activar GitHub Pages

1. Ve a tu repositorio → **Settings** → **Pages**
2. En **Source**, selecciona **GitHub Actions**
3. Guarda.

### Paso 3 — El workflow hace todo

El archivo `.github/workflows/deploy.yml` se ejecuta automáticamente en cada push a `main`.
Usa `github.event.repository.name` para configurar el `base path` automáticamente.

> **¿Base path incorrecto?** Si la app carga pero los assets dan 404, revisa que
> `VITE_BASE_PATH` en el workflow coincida con el nombre exacto del repo.

### Paso 4 — Acceder a la app

Después de que el workflow termine (~2 min):

```
https://TU-USUARIO.github.io/TU-REPO/
```

---

## 📁 Estructura del proyecto

```
factura-simulada/
├── .github/
│   └── workflows/
│       └── deploy.yml          ← GitHub Actions
├── src/
│   ├── lib/
│   │   ├── storage.ts          ← Tipos + localStorage helpers
│   │   └── pdf.ts              ← Generación de PDF (html2pdf.js)
│   ├── pages/
│   │   ├── Products.tsx        ← CRUD productos
│   │   ├── Customers.tsx       ← CRUD clientes + VelvetGlow
│   │   ├── Invoices.tsx        ← Lista + crear factura
│   │   ├── InvoiceDetail.tsx   ← Detalle + botón PDF
│   │   └── Settings.tsx        ← Export / Import JSON
│   ├── App.tsx                 ← Router + Nav
│   ├── main.tsx                ← Entry point
│   └── styles.css              ← Estilos globales
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts              ← base path configurable
```

---

## 📦 Dependencias

| Paquete | Uso |
|---------|-----|
| `react` + `react-dom` | Framework UI |
| `react-router-dom` | Navegación SPA (HashRouter para gh-pages) |
| `html2pdf.js` | Generar PDF desde HTML en el navegador |
| `vite` + `@vitejs/plugin-react` | Build tool |
| `typescript` | Tipado estático |

---

## 🎮 Guía de uso rápido

1. **Crear productos**: Ve a **Productos** → "+ Nuevo producto"
   - Rellena nombre, SKU (opcional), precio. IVA siempre 19%.

2. **Crear cliente VelvetGlow**: Ve a **Clientes** → "⭐ Cargar VelvetGlow"
   - O crea un cliente manualmente.

3. **Crear factura**: Ve a **Facturas** → "+ Nueva factura"
   - Selecciona cliente → agrega ítems → "💾 Guardar factura"

4. **Generar PDF**: Desde el detalle de factura → "📄 Generar PDF"
   - Se descarga automáticamente como `Factura-000001.pdf`

5. **Hacer backup**: Ve a **⚙ Config** → "Descargar backup JSON"

6. **Restaurar backup**: Ve a **⚙ Config** → "Seleccionar archivo JSON"

---

## 🔧 Troubleshooting

### La app carga pero los estilos/JS dan 404

**Causa**: El `base path` de Vite no coincide con el nombre del repo.

**Solución**: El workflow usa `/${{ github.event.repository.name }}/` automáticamente.
Si cambiaste el nombre del repo, vuelve a hacer push para reejecutar el workflow.

### Los cambios no se ven en GitHub Pages

- Espera 2-3 minutos después del push.
- Ve a la pestaña **Actions** y verifica que el workflow haya pasado (✅).
- Limpia caché del navegador (`Ctrl+Shift+R`).

### El PDF no se genera

- Verifica que no haya bloqueador de popups activo.
- Prueba en Chrome/Edge; Safari puede tener limitaciones con `html2canvas`.
- Abre la consola del navegador (F12) para ver el error exacto.

### Los datos desaparecieron

- Los datos están en `localStorage` del navegador. Si limpias caché o datos del sitio, se borran.
- **Solución preventiva**: usa Export JSON regularmente como respaldo.

### HashRouter vs BrowserRouter

La app usa `HashRouter` (URLs con `#`), lo que garantiza que funcione en GitHub Pages
sin configuración extra. Las URLs se ven así: `https://usuario.github.io/repo/#/invoices`

---

## ⚠ Aviso legal

Este software es una **simulación educativa**. No genera documentos con validez tributaria.
El "CUFE simulado" es un hash SHA-256 local y no corresponde al formato real de la DIAN.
No usar para emitir facturas reales. El autor no se hace responsable del uso indebido.
