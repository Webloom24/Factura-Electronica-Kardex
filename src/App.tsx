import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import Checks from "./pages/Checks";
import Customers from "./pages/Customers";
import InvoiceDetail from "./pages/InvoiceDetail";
import Invoices from "./pages/Invoices";
import Products from "./pages/Products";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <div className="app-shell">
      <nav className="main-nav">
        <span className="brand">Factura Simulada</span>
        <span className="sim-badge">SIMULADO</span>
        <span className="nav-spacer" />
        <NavLink to="/invoices" className={({ isActive }) => (isActive ? "active" : "")}>
          Facturas
        </NavLink>
        <NavLink to="/checks" className={({ isActive }) => (isActive ? "active" : "")}>
          Cheques
        </NavLink>
        <NavLink to="/customers" className={({ isActive }) => (isActive ? "active" : "")}>
          Clientes
        </NavLink>
        <NavLink to="/products" className={({ isActive }) => (isActive ? "active" : "")}>
          Productos
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => (isActive ? "active" : "")}>
          Config
        </NavLink>
      </nav>

      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/invoices" replace />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/checks" element={<Checks />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/products" element={<Products />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
