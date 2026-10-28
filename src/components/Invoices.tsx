import { useEffect, useMemo, useState } from "react";
import { invoicesApi } from "../lib/api";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import {
  AlertCircle,
  Activity,
  CalendarDays,
  CarFront,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock3,
  CreditCard,
  Eye,
  FileText,
  Pencil,
  Printer,
  Search,
  Share2,
  Trash2,
  UserRound,
  Wrench,
} from "lucide-react";

type InvoiceStatus = "Pending" | "Paid" | "Overdue" | "Partial";
type InvoiceItem = { name: string; quantity: number; unitPrice: number };
type Invoice = {
  id: string;
  customer: string;
  phone: string;
  email: string;
  vehicle: string;
  year: string;
  plate: string;
  workOrder: string;
  service: string;
  detail: string;
  status: InvoiceStatus;
  date: string;
  dueDate: string;
  amount: number;
  discount: number;
  advisor: string;
  items: InvoiceItem[];
};

const initialInvoices: Invoice[] = [];

const statusClass: Record<InvoiceStatus, string> = {
  Pending: "pending",
  Paid: "paid",
  Overdue: "overdue",
  Partial: "partial",
};
const money = (value: number) => `QAR ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Invoices(props: { notify: (message: string) => void; onCreate?: () => void; refreshTrigger?: number }) {
  const { notify, refreshTrigger } = props;
  const [invoices, setInvoices] = useState(initialInvoices);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [advisorFilter, setAdvisorFilter] = useState("All Service Advisors");
  const [page, setPage] = useState(1);
  const [deleteModalInvoice, setDeleteModalInvoice] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    invoicesApi.getAll({ limit: 50 })
      .then((res) => {
        setInvoices(res.data || []);
      })
      .catch((err) => {
        console.warn("Could not fetch invoices from backend:", err);
      });
  }, [refreshTrigger]);

  const filteredInvoices = useMemo(() => invoices.filter((invoice) => {
    const matchesSearch = `${invoice.id} ${invoice.customer} ${invoice.vehicle} ${invoice.service} ${invoice.detail} ${invoice.workOrder}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesStatus = statusFilter === "All Status" || invoice.status === statusFilter;
    const matchesAdvisor = advisorFilter === "All Service Advisors" || invoice.advisor === advisorFilter;
    return matchesSearch && matchesStatus && matchesAdvisor;
  }), [advisorFilter, invoices, search, statusFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredInvoices.length / 10));
  const currentPage = Math.min(page, pageCount);
  const pageInvoices = filteredInvoices.slice((currentPage - 1) * 10, currentPage * 10);
  const selectedInvoice = filteredInvoices.find((invoice) => invoice.id === selectedId) ?? filteredInvoices[0] ?? invoices.find((invoice) => invoice.id === selectedId);
  const counts = {
    total: invoices.length,
    paid: invoices.filter((inv) => inv.status === "Paid").length,
    pending: invoices.filter((inv) => inv.status === "Pending" || inv.status === "Partial").length,
    overdue: invoices.filter((inv) => inv.status === "Overdue").length,
  };

  const markPaid = (targetInvoiceId?: string) => {
    const targetId = targetInvoiceId || selectedInvoice?.id;
    if (!targetId) return;
    const target = invoices.find((inv) => inv.id === targetId);
    if (!target || target.status === "Paid") return;

    setInvoices((current) => current.map((invoice) => invoice.id === targetId ? { ...invoice, status: "Paid" } : invoice));

    // Sync markPaid to MongoDB Atlas
    invoicesApi.markPaid(targetId).catch((err) => console.warn("MarkPaid sync error:", err));

    notify(`${targetId} marked paid.`);
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalInvoice) return;
    setIsDeleting(true);
    try {
      await invoicesApi.delete(deleteModalInvoice.id);
      setInvoices((current) => current.filter((inv) => inv.id !== deleteModalInvoice.id));
      if (selectedId === deleteModalInvoice.id) setSelectedId("");
      notify(`Invoice ${deleteModalInvoice.id} deleted successfully.`);
      setDeleteModalInvoice(null);
    } catch (err: any) {
      notify(`Failed to delete invoice: ${err.message || "Unknown error"}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className="invoice-management">
      <header className="invoice-page-heading">
        <div className="invoice-page-title">
          <span><FileText size={25} /></span>
          <div><h1>Invoices</h1><p>Manage customer invoices, payments, and billing records.</p></div>
        </div>
      </header>
      <section className="invoice-metrics" aria-label="Invoice summary">
        <article><span className="invoice-metric-icon blue"><FileText size={20} /></span><div><strong>{counts.total}</strong><small>Total Invoices</small></div><Activity size={23} className="invoice-spark blue-text" /></article>
        <article><span className="invoice-metric-icon green"><CircleCheck size={20} /></span><div><strong>{counts.paid}</strong><small>Paid</small></div><Activity size={23} className="invoice-spark green-text" /></article>
        <article><span className="invoice-metric-icon orange"><Clock3 size={20} /></span><div><strong>{counts.pending}</strong><small>Pending</small></div><Activity size={23} className="invoice-spark orange-text" /></article>
        <article><span className="invoice-metric-icon red"><AlertCircle size={20} /></span><div><strong>{counts.overdue}</strong><small>Overdue</small></div><Activity size={23} className="invoice-spark red-text" /></article>
      </section>
      <div className="invoice-management-layout">
        <section className="invoice-list-card">
          <div className="invoice-filters">
            <label className="invoice-search"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search by invoice number, customer name, vehicle..." aria-label="Search invoices" /></label>
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} aria-label="Filter by invoice status">
              {["All Status", "Paid", "Pending", "Partial", "Overdue"].map((status) => <option key={status}>{status}</option>)}
            </select>
            <label className="invoice-date-filter"><CalendarDays size={15} /><span>14 Apr 2025 - 14 May 2025</span></label>
            <select value={advisorFilter} onChange={(event) => { setAdvisorFilter(event.target.value); setPage(1); }} aria-label="Filter by service advisor">
              {["All Service Advisors", "Ali Hassan", "M. Khan"].map((advisor) => <option key={advisor}>{advisor}</option>)}
            </select>
          </div>
          <div className="invoice-table-scroll">
            <table className="invoice-management-table">
              <thead><tr><th>#</th><th>Invoice No.</th><th>Customer</th><th>Vehicle</th><th>Related To / Service Type</th><th>Status</th><th>Created Date</th><th>Total (QAR)</th><th>Actions</th></tr></thead>
              <tbody>
                {pageInvoices.map((invoice, index) => (
                  <tr key={invoice.id} className={selectedInvoice?.id === invoice.id ? "selected" : ""} onClick={() => setSelectedId(invoice.id)}>
                    <td>{(currentPage - 1) * 10 + index + 1}</td>
                    <td><button className="invoice-id-link" onClick={(event) => { event.stopPropagation(); setSelectedId(invoice.id); }}>{invoice.id}</button></td>
                    <td>{invoice.customer}</td>
                    <td><span className="invoice-vehicle-cell"><CarFront size={25} /><span>{invoice.vehicle}<small>{invoice.year} · {invoice.plate}</small></span></span></td>
                    <td>{invoice.service}<small className="invoice-muted-line">Work Order #{invoice.workOrder}</small></td>
                    <td><span className={`invoice-status-badge ${statusClass[invoice.status]}`}>{invoice.status}</span></td>
                    <td>{invoice.date}</td><td className="invoice-amount">{money(invoice.amount)}</td>
                    <td>
                      <button className="invoice-row-action" aria-label={`View ${invoice.id}`} onClick={(event) => { event.stopPropagation(); setSelectedId(invoice.id); }}>
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredInvoices.length === 0 && <tr><td colSpan={9} className="invoice-empty">No invoices match the selected filters.</td></tr>}
              </tbody>
            </table>
          </div>
          <footer className="invoice-table-footer"><span>Showing {filteredInvoices.length ? (currentPage - 1) * 10 + 1 : 0} to {Math.min(currentPage * 10, filteredInvoices.length)} of {filteredInvoices.length} invoices</span><div><button aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => <button key={pageNumber} className={currentPage === pageNumber ? "active" : ""} aria-label={`Page ${pageNumber}`} aria-current={currentPage === pageNumber ? "page" : undefined} onClick={() => setPage(pageNumber)}>{pageNumber}</button>)}<button aria-label="Next page" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></button></div></footer>
        </section>
        {selectedInvoice && (
          <aside className="invoice-detail-card" aria-label={`Invoice details for ${selectedInvoice.id}`}>
            <header><div><FileText size={16} /><strong>Invoice Details</strong></div><button onClick={() => notify("Invoice editing is not available in this frontend preview.")}><Pencil size={13} />Edit</button></header>
            <div className="invoice-detail-number"><strong>{selectedInvoice.id}</strong><span className={`invoice-status-badge ${statusClass[selectedInvoice.status]}`}>{selectedInvoice.status}</span></div>
            <small className="invoice-created-at">Created: {selectedInvoice.date}, 10:30 AM</small>
            <section className="invoice-detail-block">
              <h3><UserRound size={15} />Customer <button onClick={() => notify("Customer records are not available in this frontend preview.")}>View Customer</button></h3>
              <div className="invoice-customer-line"><span className="invoice-customer-avatar">{selectedInvoice.customer.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><strong>{selectedInvoice.customer}</strong><span>{selectedInvoice.phone}</span><span>{selectedInvoice.email}</span></div></div>
            </section>
            <section className="invoice-detail-block">
              <h3><CarFront size={16} />Vehicle</h3><div className="invoice-vehicle-detail"><CarFront size={47} /><div><strong>{selectedInvoice.vehicle} - {selectedInvoice.year}</strong><span>Plate: {selectedInvoice.plate} · VIN: N/A</span></div></div>
            </section>
            <section className="invoice-detail-block invoice-service-info">
              <h3><Wrench size={15} />Service Information</h3>
              <div><span>Related To</span><strong>Work Order #{selectedInvoice.workOrder}</strong><span>Service Type</span><strong>{selectedInvoice.service}</strong><span>Description</span><strong>{selectedInvoice.detail}</strong><span>Service Advisor</span><strong>{selectedInvoice.advisor}</strong></div>
              <div><span>Invoice Date</span><strong>{selectedInvoice.date}</strong><span>Payment Terms</span><strong>Due in 7 days</strong><span>Due Date</span><strong>{selectedInvoice.dueDate}</strong></div>
            </section>
            <section className="invoice-detail-items">
              <h3><CreditCard size={15} />Invoice Items ({selectedInvoice.items.length} items)</h3>
              <div className="invoice-detail-table-scroll"><table><thead><tr><th>#</th><th>Item / Service</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>
                {selectedInvoice.items.map((item, index) => <tr key={`${selectedInvoice.id}-${item.name}`}><td>{index + 1}</td><td>{item.name}</td><td>{item.quantity}</td><td>{money(item.unitPrice)}</td><td>{money(item.quantity * item.unitPrice)}</td></tr>)}
              </tbody></table></div>
              <div className="invoice-detail-totals"><div><span>Subtotal</span><strong>{money(selectedInvoice.amount)}</strong></div><div><span>VAT (5%)</span><strong>{money(selectedInvoice.amount * 0.05)}</strong></div><div><span>Discount (-)</span><strong className="negative">{money(selectedInvoice.discount)}</strong></div><div className="grand"><strong>Grand Total</strong><strong>{money(selectedInvoice.amount)}</strong></div></div>
            </section>
            <div className="invoice-detail-actions">
              <button onClick={() => window.print()}><Printer size={14} />Reprint Invoice</button>
              <button onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(`${window.location.origin}/#invoice-${selectedInvoice.id}`);
                }
                notify(`Invoice link for ${selectedInvoice.id} copied.`);
              }}><Share2 size={14} />Share</button>
              <button
                style={{ borderColor: "#fecaca", background: "#fff1f2", color: "#e11d48", fontWeight: 600 }}
                onClick={() => setDeleteModalInvoice(selectedInvoice)}
              >
                <Trash2 size={14} />Delete Invoice
              </button>
              {selectedInvoice.status !== "Paid" && (
                <button className="mark-paid" onClick={() => markPaid()}><Check size={14} />Mark Paid</button>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Off-screen / Print-only Single-Page Tax Invoice */}
      {selectedInvoice && (
        <div className="printable-tax-invoice-wrapper" id="printable-tax-invoice">
          <div className="printable-tax-invoice">
            {/* Tax Invoice Document Header */}
            <div className="tax-invoice-header">
              <div className="tax-invoice-brand">
                <h2>GARAGE WORKSPACE</h2>
                <p>Auto Care &amp; Service Center · Doha, Qatar</p>
                <p>Phone: +974 5555 1234 · C.R: 84920/1</p>
              </div>
              <div className="tax-invoice-meta">
                <span className="tax-invoice-badge">TAX INVOICE / فاتورة ضريبية</span>
                <h3>{selectedInvoice.id}</h3>
                <p>Date: {selectedInvoice.date || new Date().toLocaleDateString("en-GB")}</p>
                <p>Work Order: #{selectedInvoice.workOrder || "N/A"}</p>
              </div>
            </div>

            {/* Customer & Vehicle Grid */}
            <div className="tax-invoice-grid">
              <div>
                <strong>Billed To Customer</strong>
                <div className="party-name">{selectedInvoice.customer}</div>
                <div className="party-detail">Phone: {selectedInvoice.phone || "N/A"}</div>
              </div>
              <div>
                <strong>Vehicle Details</strong>
                <div className="party-name">{selectedInvoice.vehicle}</div>
                <div className="party-detail">
                  Plate: {selectedInvoice.plate || "TBD"} · Advisor: {selectedInvoice.advisor || "Ali Hassan"}
                </div>
              </div>
            </div>

            {/* Service & Items Table */}
            <table className="tax-invoice-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Description / Item</th>
                  <th style={{ textAlign: "center", width: "55px" }}>Qty</th>
                  <th style={{ textAlign: "right", width: "115px" }}>Amount (QAR)</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                  selectedInvoice.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <div className="item-title">{item.name}</div>
                      </td>
                      <td style={{ textAlign: "center" }}>{item.quantity}</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>{money(item.quantity * item.unitPrice)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td>
                      <div className="item-title">{selectedInvoice.service || "Automotive Service & Repair"}</div>
                    </td>
                    <td style={{ textAlign: "center" }}>1</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{money(selectedInvoice.amount)}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Totals Section */}
            <div className="tax-invoice-totals-wrap">
              <div className="tax-invoice-totals">
                <div>
                  <span>Subtotal</span>
                  <strong>{money(selectedInvoice.amount)}</strong>
                </div>
                <div>
                  <span>VAT (5%)</span>
                  <strong>{money(0)}</strong>
                </div>
                {selectedInvoice.discount > 0 && (
                  <div>
                    <span>Discount</span>
                    <strong style={{ color: "#dc2626" }}>-{money(selectedInvoice.discount)}</strong>
                  </div>
                )}
                <div className="grand-total-row">
                  <span>Grand Total</span>
                  <span>{money(selectedInvoice.amount)}</span>
                </div>
              </div>
            </div>

            {/* Footer Notes & Signature */}
            <div className="tax-invoice-footer">
              <div>
                <p className="thank-you">Thank you for your business!</p>
                <p className="warranty">Warranty valid for 30 days or 1,000 km from service date.</p>
              </div>
              <div className="signature-box">
                <div className="signature-line" />
                <span>Authorized Signature</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={!!deleteModalInvoice}
        itemType="Invoice"
        itemId={deleteModalInvoice?.id || ""}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModalInvoice(null)}
        isDeleting={isDeleting}
      />
    </main>
  );
}

export default Invoices;
