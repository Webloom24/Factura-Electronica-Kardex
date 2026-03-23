import { useParams, Link } from "react-router-dom";
import { getInvoices, getEmisor, getStores } from "../lib/storage";
import { downloadInvoicePDF } from "../lib/pdf";
import { useState } from "react";

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const invoice = getInvoices().find((inv) => inv.id === id);
  const emisor = {
    name: invoice.supplier_label || "Empresa Emisora",
    nit: invoice.supplier_nit || "",
    address: invoice.supplier_address || "",
    phone: invoice.supplier_phone || "",
    email: invoice.supplier_email || "",
  };
  const [generating, setGenerating] = useState(false);
  const [pdfError, setPdfError] = useState("");

  if (!invoice) {
    return (
      <div className="card">
        <p>
          Factura no encontrada. <Link to="/invoices">← Volver</Link>
        </p>
      </div>
    );
  }

  const c = invoice.customer_snapshot;

  function fmt(n: number) {
    return n.toLocaleString("es-CO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function handlePDF() {
    setPdfError("");
    setGenerating(true);
    try {
      downloadInvoicePDF(invoice!);
    } catch (err) {
      setPdfError("Error al generar el PDF. Verifica la consola.");
      console.error(err);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>
            Factura{" "}
            <span className="badge badge-blue" style={{ fontSize: "1rem" }}>
              {invoice.invoice_number}
            </span>
          </h1>
          <p style={{ color: "#64748b", marginTop: 4, fontSize: "0.9rem" }}>
            {new Date(invoice.created_at).toLocaleDateString("es-CO", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="page-header-actions">
          <Link to="/invoices" className="btn btn-ghost">
            ← Volver
          </Link>
          <button
            className="btn btn-primary"
            onClick={handlePDF}
            disabled={generating}
          >
            {generating ? (
              <>
                <span className="spinner" /> Generando…
              </>
            ) : (
              "📄 Generar PDF"
            )}
          </button>
        </div>
      </div>

      {pdfError && <div className="alert alert-error">{pdfError}</div>}

      {/* EMISOR */}
      <div className="card">
        <div className="card-title">Empresa Emisora</div>
        <div style={{ lineHeight: 1.8, color: "#444" }}>
          <strong>{emisor.name}</strong>
          <br />
          NIT: {emisor.nit} · Responsable de IVA
          <br />
          {emisor.address}
          <br />
          {/* Esta línea solo muestra "Tel:" si realmente hay un teléfono guardado */}
          {emisor.phone && <span>Tel: {emisor.phone} </span>}
          {emisor.email && <span>· {emisor.email}</span>}
        </div>
      </div>

      {/* CLIENTE */}
      <div className="card">
        <div className="card-title">Cliente</div>
        <div className="form-grid">
          <div>
            <label>Razón Social</label>
            <p>
              <strong>{c.company_name}</strong>
            </p>
          </div>
          <div>
            <label>NIT</label>
            <p>{c.nit}</p>
          </div>
          <div>
            <label>Email</label>
            <p>{c.email}</p>
          </div>
          <div>
            <label>Teléfono</label>
            <p>{c.phone}</p>
          </div>
          <div className="form-group full-width">
            <label>Dirección</label>
            <p>{c.address}</p>
          </div>
          {c.website && (
            <div>
              <label>Sitio web</label>
              <p>{c.website}</p>
            </div>
          )}
          {c.legal_representative && (
            <div>
              <label>Rep. Legal</label>
              <p>{c.legal_representative}</p>
            </div>
          )}
          {c.economic_activity && (
            <div>
              <label>Act. Económica</label>
              <p>{c.economic_activity}</p>
            </div>
          )}
        </div>
      </div>

      {/* ITEMS */}
      <div className="card">
        <div className="card-title">Detalle de ítems</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Descripción</th>
                <th>SKU</th>
                <th className="td-center">Unidad</th>
                <th className="td-right">Cant.</th>
                <th className="td-right">Vr. Unit.</th>
                <th className="td-right">IVA %</th>
                <th className="td-right">IVA $</th>
                <th className="td-right">Total línea</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.product_name}</td>
                  <td>
                    {item.sku ?? <span style={{ color: "#aaa" }}>—</span>}
                  </td>
                  <td className="td-center">{item.unit}</td>
                  <td className="td-right">{item.quantity}</td>
                  <td className="td-right">${fmt(item.unit_price)}</td>
                  <td className="td-right">19%</td>
                  <td className="td-right">${fmt(item.line_vat)}</td>
                  <td className="td-right">
                    <strong>${fmt(item.line_total)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totales */}
        <div className="totals-wrap">
          <div className="totals-box">
            <div className="row">
              <span>Subtotal:</span>
              <span>${fmt(invoice.subtotal)}</span>
            </div>
            <div className="row">
              <span>IVA 19%:</span>
              <span>${fmt(invoice.vat_total)}</span>
            </div>
            <div className="row grand">
              <span>TOTAL:</span>
              <span>${fmt(invoice.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
