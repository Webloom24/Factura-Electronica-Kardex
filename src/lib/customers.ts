import { createCustomer, getCustomers, type Customer } from "./storage";

export interface QuickCustomerInput {
  company_name: string;
  nit: string;
  phone: string;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function createQuickCustomer(
  input: QuickCustomerInput,
): { ok: true; customer: Customer } | { ok: false; error: string } {
  const companyName = input.company_name.trim();
  const nit = input.nit.trim();
  const phone = input.phone.trim();

  if (!companyName) {
    return { ok: false, error: "El nombre del cliente es obligatorio" };
  }

  const customers = getCustomers();
  const duplicate = customers.find((customer) => {
    if (nit) {
      return normalize(customer.nit) === normalize(nit);
    }
    return normalize(customer.company_name) === normalize(companyName);
  });

  if (duplicate) {
    return {
      ok: false,
      error: "Ya existe un cliente con esa informacion. Seleccionalo del listado.",
    };
  }

  const customer = createCustomer({
    company_name: companyName,
    nit,
    email: "",
    phone,
    address: "",
    website: undefined,
    legal_representative: undefined,
    economic_activity: undefined,
  });

  return { ok: true, customer };
}
