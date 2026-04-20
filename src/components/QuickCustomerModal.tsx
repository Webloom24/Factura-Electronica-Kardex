import { useState } from "react";
import { createQuickCustomer } from "../lib/customers";
import type { Customer } from "../lib/storage";

interface QuickCustomerModalProps {
  onClose: () => void;
  onCreated: (customer: Customer) => void;
}

export default function QuickCustomerModal({
  onClose,
  onCreated,
}: QuickCustomerModalProps) {
  const [form, setForm] = useState({
    company_name: "",
    nit: "",
    phone: "",
  });
  const [error, setError] = useState("");

  function setField(
    key: "company_name" | "nit" | "phone",
    value: string,
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const result = createQuickCustomer(form);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    onCreated(result.customer);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Crear nuevo cliente</div>
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Nombre *</label>
              <input
                value={form.company_name}
                onChange={(e) => setField("company_name", e.target.value)}
                placeholder="Nombre del cliente"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Identificacion</label>
              <input
                value={form.nit}
                onChange={(e) => setField("nit", e.target.value)}
                placeholder="NIT / CC"
              />
            </div>
            <div className="form-group">
              <label>Telefono</label>
              <input
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="Telefono"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Crear cliente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
