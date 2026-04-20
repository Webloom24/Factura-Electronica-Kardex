import { useEffect, useMemo, useState } from "react";
import QuickCustomerModal from "../components/QuickCustomerModal";
import { downloadCheckPDF } from "../lib/checkPdf";
import { amountToWordsEs, formatCheckCurrency } from "../lib/checks";
import {
  createCheck,
  getChecks,
  getCustomers,
  getSuggestedCheckNumber,
  updateCheck,
  type Check,
  type Customer,
} from "../lib/storage";

const CREATE_CUSTOMER_OPTION = "__create_customer__";

interface CheckFormState {
  customer_id: string;
  check_number: string;
  beneficiary: string;
  amount: string;
  amount_text: string;
  date: string;
  city: string;
  bank: string;
  account: string;
  concept: string;
  signature: string;
}

function createEmptyForm(): CheckFormState {
  return {
    customer_id: "",
    check_number: getSuggestedCheckNumber(),
    beneficiary: "",
    amount: "",
    amount_text: "",
    date: new Date().toISOString().slice(0, 10),
    city: "",
    bank: "",
    account: "",
    concept: "",
    signature: "",
  };
}

function formFromCheck(check: Check): CheckFormState {
  return {
    customer_id: check.customer_id ?? "",
    check_number: check.check_number,
    beneficiary: check.beneficiary,
    amount: String(check.amount),
    amount_text: check.amount_text ?? "",
    date: check.date,
    city: check.city ?? "",
    bank: check.bank ?? "",
    account: check.account ?? "",
    concept: check.concept ?? "",
    signature: check.signature ?? "",
  };
}

export default function Checks() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CheckFormState>(createEmptyForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    setChecks(getChecks().slice().reverse());
    setCustomers(getCustomers());
  }

  function openCreate() {
    setEditingId(null);
    setForm(createEmptyForm());
    setShowEditor(true);
    setError("");
    setSuccess("");
  }

  function openEdit(check: Check) {
    setEditingId(check.id);
    setForm(formFromCheck(check));
    setShowEditor(true);
    setError("");
    setSuccess("");
    window.scrollTo(0, 0);
  }

  function closeEditor() {
    setEditingId(null);
    setForm(createEmptyForm());
    setShowEditor(false);
    setError("");
  }

  function setField<K extends keyof CheckFormState>(
    key: K,
    value: CheckFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCustomerChange(customerId: string) {
    if (customerId === CREATE_CUSTOMER_OPTION) {
      setShowQuickCustomerModal(true);
      return;
    }

    setField("customer_id", customerId);
    if (!customerId) return;

    const customer = customers.find((item) => item.id === customerId);
    if (!customer) return;

    setForm((prev) => ({
      ...prev,
      customer_id: customerId,
      beneficiary: customer.company_name,
    }));
  }

  function handleQuickCustomerCreated(customer: Customer) {
    refresh();
    setShowQuickCustomerModal(false);
    setForm((prev) => ({
      ...prev,
      customer_id: customer.id,
      beneficiary: customer.company_name,
    }));
  }

  const selectedCustomer = customers.find(
    (customer) => customer.id === form.customer_id,
  );

  const previewCheck = useMemo<Check>(() => {
    const parsedAmount = Number.parseFloat(form.amount);
    const safeAmount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0;
    const amountText = form.amount_text.trim() || amountToWordsEs(safeAmount);

    return {
      id: editingId ?? "preview",
      check_number: form.check_number.trim() || "000000",
      beneficiary:
        selectedCustomer?.company_name || form.beneficiary.trim() || "Beneficiario",
      amount: safeAmount,
      amount_text: amountText,
      date: form.date || new Date().toISOString().slice(0, 10),
      city: form.city.trim() || undefined,
      bank: form.bank.trim() || undefined,
      account: form.account.trim() || undefined,
      concept: form.concept.trim() || undefined,
      signature: form.signature.trim() || undefined,
      customer_id: form.customer_id || undefined,
      created_at: new Date().toISOString(),
    };
  }, [editingId, form]);

  function validateForm(): { ok: boolean; amount: number } {
    const amount = Number.parseFloat(form.amount);
    if (!form.check_number.trim()) {
      setError("El numero de cheque es obligatorio");
      return { ok: false, amount: 0 };
    }
    if (!form.customer_id && !editingId) {
      setError("Selecciona un cliente existente o crea uno nuevo");
      return { ok: false, amount: 0 };
    }
    if (!form.date) {
      setError("La fecha es obligatoria");
      return { ok: false, amount: 0 };
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("El monto debe ser mayor a 0");
      return { ok: false, amount: 0 };
    }
    return { ok: true, amount };
  }

  function handleGeneratePdf() {
    setError("");
    const validation = validateForm();
    if (!validation.ok) return;
    downloadCheckPDF({
      ...previewCheck,
      amount: validation.amount,
      amount_text: form.amount_text.trim() || amountToWordsEs(validation.amount),
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const validation = validateForm();
    if (!validation.ok) return;

    const data = {
      check_number: form.check_number.trim(),
      beneficiary:
        selectedCustomer?.company_name || form.beneficiary.trim(),
      amount: validation.amount,
      amount_text: form.amount_text.trim() || undefined,
      date: form.date,
      city: form.city.trim() || undefined,
      bank: form.bank.trim() || undefined,
      account: form.account.trim() || undefined,
      concept: form.concept.trim() || undefined,
      signature: form.signature.trim() || undefined,
      customer_id: form.customer_id || undefined,
    };

    if (editingId) {
      updateCheck(editingId, data);
      setSuccess("Cheque actualizado correctamente.");
    } else {
      createCheck(data);
      setSuccess("Cheque creado correctamente.");
    }

    refresh();
    closeEditor();
  }

  return (
    <div>
      <div className="page-header">
        <h1>Cheques</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={openCreate}>
            + Nuevo cheque
          </button>
        </div>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {showQuickCustomerModal && (
        <QuickCustomerModal
          onClose={() => setShowQuickCustomerModal(false)}
          onCreated={handleQuickCustomerCreated}
        />
      )}

      <div className="checks-layout">
        <div className="checks-list-column">
          <div className="card">
            <div className="card-title">Listado de cheques</div>
            {checks.length === 0 ? (
              <div className="empty-state">
                <p>No hay cheques registrados.</p>
                <button className="btn btn-primary" onClick={openCreate}>
                  Crear primer cheque
                </button>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Fecha</th>
                      <th>Beneficiario</th>
                      <th className="td-right">Monto</th>
                      <th>Banco</th>
                      <th className="td-actions">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checks.map((check) => (
                      <tr key={check.id}>
                        <td>{check.check_number}</td>
                        <td>{check.date}</td>
                        <td>{check.beneficiary}</td>
                        <td className="td-right">${formatCheckCurrency(check.amount)}</td>
                        <td>{check.bank ?? <span className="text-muted">-</span>}</td>
                        <td className="td-actions">
                          <div className="table-actions">
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => openEdit(check)}
                            >
                              Editar
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => downloadCheckPDF(check)}
                            >
                              PDF
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

        <div className="checks-editor-column">
          {showEditor ? (
            <>
              <div className="card">
                <div className="card-title">
                  {editingId ? "Editar cheque" : "Nuevo cheque"}
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label>Cliente guardado (opcional)</label>
                      <select
                        value={form.customer_id}
                        onChange={(e) => handleCustomerChange(e.target.value)}
                      >
                        <option value="">- Seleccionar cliente -</option>
                        <option value={CREATE_CUSTOMER_OPTION}>
                          + Crear nuevo cliente
                        </option>
                        {customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.company_name} - {customer.nit}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Numero de cheque *</label>
                      <input
                        value={form.check_number}
                        onChange={(e) => setField("check_number", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Fecha *</label>
                      <input
                        type="date"
                        value={form.date}
                        onChange={(e) => setField("date", e.target.value)}
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>Beneficiario *</label>
                      <input
                        value={form.beneficiary}
                        readOnly
                        placeholder="Selecciona un cliente"
                      />
                    </div>
                    <div className="form-group">
                      <label>Monto *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.amount}
                        onChange={(e) => setField("amount", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Ciudad</label>
                      <input
                        value={form.city}
                        onChange={(e) => setField("city", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Banco</label>
                      <input
                        value={form.bank}
                        onChange={(e) => setField("bank", e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Cuenta</label>
                      <input
                        value={form.account}
                        onChange={(e) => setField("account", e.target.value)}
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>Monto en texto (opcional)</label>
                      <textarea
                        value={form.amount_text}
                        onChange={(e) => setField("amount_text", e.target.value)}
                        placeholder={amountToWordsEs(
                          Number.parseFloat(form.amount) > 0
                            ? Number.parseFloat(form.amount)
                            : 0,
                        )}
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>Concepto</label>
                      <textarea
                        value={form.concept}
                        onChange={(e) => setField("concept", e.target.value)}
                        placeholder="Pago, anticipo, honorarios, etc."
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>Firma</label>
                      <input
                        value={form.signature}
                        onChange={(e) => setField("signature", e.target.value)}
                        placeholder="Nombre o referencia de firma"
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={closeEditor}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={handleGeneratePdf}
                    >
                      Generar PDF
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {editingId ? "Guardar cambios" : "Guardar cheque"}
                    </button>
                  </div>
                </form>
              </div>

              <div className="card">
                <div className="card-title">Vista previa</div>
                <div className="check-preview">
                  <div className="check-preview-top">
                    <div>
                      <div className="check-bank">
                        {previewCheck.bank || "Banco / Entidad"}
                      </div>
                      {previewCheck.account && (
                        <div className="check-meta">
                          Cuenta: {previewCheck.account}
                        </div>
                      )}
                    </div>
                    <div className="check-preview-top-right">
                      {previewCheck.city && (
                        <div className="check-meta">{previewCheck.city}</div>
                      )}
                      <div className="check-meta">Fecha: {previewCheck.date}</div>
                      <div className="check-number">
                        Cheque No. {previewCheck.check_number}
                      </div>
                    </div>
                  </div>

                  <div className="check-line">
                    <span className="check-label">Paguese a</span>
                    <span className="check-value">{previewCheck.beneficiary}</span>
                    <span className="check-amount">
                      $ {formatCheckCurrency(previewCheck.amount)}
                    </span>
                  </div>

                  <div className="check-line">
                    <span className="check-label">La suma de</span>
                    <span className="check-value check-value-multiline">
                      {previewCheck.amount_text || amountToWordsEs(previewCheck.amount)}
                    </span>
                  </div>

                  <div className="check-line">
                    <span className="check-label">Concepto</span>
                    <span className="check-value check-value-multiline">
                      {previewCheck.concept || "Sin concepto registrado"}
                    </span>
                  </div>

                  <div className="check-preview-bottom">
                    <div className="check-footnote">
                      Documento generado desde el modulo de cheques
                    </div>
                    <div className="check-signature-block">
                      <div className="check-signature-line" />
                      <div className="check-signature-text">
                        {previewCheck.signature || "Firma autorizada"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="card">
              <div className="empty-state">
                <p>Selecciona un cheque para editarlo o crea uno nuevo.</p>
                <button className="btn btn-primary" onClick={openCreate}>
                  Nuevo cheque
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
