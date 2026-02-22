// ============================================================
// GENERACIÓN PDF — jsPDF + autoTable
// Dibuja el PDF directamente (sin html2canvas, sin DOM screenshots).
// 100% confiable en todos los navegadores.
// ============================================================
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Invoice } from './storage'
import { getEmisor } from './storage'

function fmt(n: number): string {
  return n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function downloadInvoicePDF(invoice: Invoice): void {
  const base = getEmisor()
  const EMISOR = {
    ...base,
    name: invoice.supplier === 'ruby_rose' ? 'Ruby Rose'
        : invoice.supplier === 'trendy'    ? 'Trendy'
        : base.name,
  }
  const doc    = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const PW     = 210
  const M      = 15
  const RX     = PW - M
  const CW     = PW - 2 * M
  let   y      = 18

  const c = invoice.customer_snapshot

  // ── helpers ─────────────────────────────────────────────────
  const bold   = (sz: number) => { doc.setFont('helvetica', 'bold');   doc.setFontSize(sz) }
  const normal = (sz: number) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(sz) }

  function solidLine(thick = false) {
    doc.setLineWidth(thick ? 0.5 : 0.2)
    doc.setDrawColor(0, 0, 0)
    doc.setLineDashPattern([], 0)
    doc.line(M, y, RX, y)
    y += 3.5
  }

  function dashedLine() {
    doc.setLineWidth(0.2)
    doc.setDrawColor(150, 150, 150)
    doc.setLineDashPattern([1.5, 1.5], 0)
    doc.line(M, y, RX, y)
    doc.setLineDashPattern([], 0)
    doc.setDrawColor(0)
    y += 3.5
  }

  function kv(label: string, value: string | undefined, labelW = 45) {
    if (!value) return
    bold(9);   doc.text(label, M, y)
    normal(9)
    const lines = doc.splitTextToSize(value, CW - labelW - 2)
    doc.text(lines, M + labelW, y)
    y += lines.length * 4.5
  }

  // ════════════════════════════════════════════════════════════
  // ENCABEZADO
  // ════════════════════════════════════════════════════════════
  bold(14)
  doc.text(EMISOR.name, PW / 2, y, { align: 'center' })
  y += 5.5

  normal(8.5)
  doc.text(`NIT: ${EMISOR.nit}  ·  Responsable de IVA`, PW / 2, y, { align: 'center' })
  y += 4
  doc.text(EMISOR.address, PW / 2, y, { align: 'center' })
  y += 4
  doc.text(`Tel: ${EMISOR.phone}  ·  ${EMISOR.email}`, PW / 2, y, { align: 'center' })
  y += 5

  solidLine(true)

  // ════════════════════════════════════════════════════════════
  // TÍTULO FACTURA
  // ════════════════════════════════════════════════════════════
  bold(12)
  doc.text('FACTURA ELECTRÓNICA DE VENTA:', PW / 2, y, { align: 'center' })
  y += 6

  bold(22)
  doc.text(invoice.invoice_number, PW / 2, y, { align: 'center' })
  y += 8

  dashedLine()

  // ════════════════════════════════════════════════════════════
  // META
  // ════════════════════════════════════════════════════════════
  const fecha = new Date(invoice.created_at)
  const fechaStr =
    fecha.toLocaleDateString('es-CO') +
    '   Hora: ' +
    fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  kv('Fecha:', fechaStr)
  kv('Condición de Pago:', 'CONTADO')
  kv('Moneda:', 'COP (Pesos Colombianos)')
  y += 1

  dashedLine()

  // ════════════════════════════════════════════════════════════
  // CLIENTE
  // ════════════════════════════════════════════════════════════
  kv('Cliente:',         c.company_name)
  kv('NIT / CC:',        c.nit)
  kv('Dirección:',       c.address)
  kv('Teléfono:',        c.phone)
  kv('Email:',           c.email)
  if (c.website)              kv('Sitio web:',      c.website)
  if (c.legal_representative) kv('Rep. Legal:',     c.legal_representative)
  if (c.economic_activity)    kv('Act. Económica:', c.economic_activity)
  y += 1

  solidLine(true)

  // ════════════════════════════════════════════════════════════
  // TABLA DE ÍTEMS
  // ════════════════════════════════════════════════════════════
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['Descripción', 'Cant', 'V/r Unitario', 'Total (sin IVA)']],
    body: invoice.items.map(item => [
      item.sku ? `${item.product_name}\n(${item.sku})` : item.product_name,
      String(item.quantity),
      `$${fmt(item.unit_price)}`,
      `$${fmt(item.line_subtotal)}`,
    ]),
    headStyles: {
      fillColor: [17, 17, 17],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    bodyStyles:         { fontSize: 9, cellPadding: 2.8 },
    alternateRowStyles: { fillColor: [248, 250, 255] },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 16 },
      2: { halign: 'right',  cellWidth: 38 },
      3: { halign: 'right',  cellWidth: 42 },
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 2

  normal(8)
  doc.setTextColor(100)
  doc.text(`TOTAL ÍTEMS: ${invoice.items.length}`, RX, y, { align: 'right' })
  doc.setTextColor(0)
  y += 5

  solidLine(true)

  // ════════════════════════════════════════════════════════════
  // DETALLE DE VALORES
  // ════════════════════════════════════════════════════════════
  bold(9)
  doc.text('--- [ DETALLE DE VALORES ] ---', PW / 2, y, { align: 'center' })
  y += 5.5

  const valRows: [string, string][] = [
    ['Vr. Exento (4%):', '$0,00'],
    ['Base Gravable (sin IVA):', `$${fmt(invoice.subtotal)}`],
    ['IVA (19%):', `$${fmt(invoice.vat_total)}`],
  ]
  valRows.forEach(([lbl, val]) => {
    normal(9);  doc.text(lbl, M + 30, y)
    bold(9);    doc.text(val, RX, y, { align: 'right' })
    y += 4.5
  })

  y += 1
  doc.setLineWidth(0.5)
  doc.setDrawColor(0)
  doc.line(M + 20, y - 1, RX, y - 1)

  bold(14)
  doc.text('TOTAL ........ .......', M + 20, y + 5)
  doc.text(`$${fmt(invoice.total)}`, RX, y + 5, { align: 'right' })
  y += 10

  solidLine(true)

  // ════════════════════════════════════════════════════════════
  // INFORMACIÓN TRIBUTARIA
  // ════════════════════════════════════════════════════════════
  bold(9)
  doc.text('--- [ INFORMACIÓN TRIBUTARIA ] ---', PW / 2, y, { align: 'center' })
  y += 3

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['Descripción', '%', 'Vr. Base', 'Vr. Impto.']],
    body: [
      ['IVA BIENES', '19.00', `$${fmt(invoice.subtotal)}`, `$${fmt(invoice.vat_total)}`],
    ],
    headStyles: {
      fillColor: [230, 230, 230] as [number, number, number],
      textColor: [0, 0, 0] as [number, number, number],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    bodyStyles:   { fontSize: 9, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'right', cellWidth: 20 },
      2: { halign: 'right', cellWidth: 48 },
      3: { halign: 'right', cellWidth: 48 },
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 4

  dashedLine()

  // ════════════════════════════════════════════════════════════
  // RESOLUCIÓN
  // ════════════════════════════════════════════════════════════
  normal(7.5)
  doc.setTextColor(110)
  doc.text(EMISOR.resolution, PW / 2, y, { align: 'center' })
  y += 5
  doc.setTextColor(0)

  dashedLine()

  // ════════════════════════════════════════════════════════════
  // PIE DE PÁGINA
  // ════════════════════════════════════════════════════════════
  normal(7.5)
  doc.setTextColor(140)
  doc.text(`Factura Electrónica (Simulada): ${invoice.invoice_number}`, PW / 2, y, { align: 'center' })
  y += 3.5
  doc.text('Generado por Factura Simulada  ·  Uso exclusivamente académico', PW / 2, y, { align: 'center' })
  y += 3.5
  doc.text(new Date().toLocaleString('es-CO'), PW / 2, y, { align: 'center' })
  doc.setTextColor(0)

  // ════════════════════════════════════════════════════════════
  // GUARDAR
  // ════════════════════════════════════════════════════════════
  doc.save(`Factura-${invoice.invoice_number}.pdf`)
}
