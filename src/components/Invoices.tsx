import { useEffect, useMemo, useState } from "react";
import { invoicesApi } from "../lib/api";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import ViewInfoModal, { type ViewInfoTarget } from "./ViewInfoModal";
import { CustomDropdown } from "./CustomDropdown";
import { DateRangeFilter, type DateFilterValue, matchesDateFilter } from "./DateRangeFilter";
import {
  AlertCircle,
  Activity,
  CarFront,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock3,
  CreditCard,
  Eye,
  FileText,
  Package,
  Printer,
  Search,
  RotateCcw,
  Share2,
  Trash2,
  UserRound,
  Wrench,
} from "lucide-react";

type InvoiceStatus = "Pending" | "Paid" | "Overdue" | "Partial" | "Returned" | "Partially Returned";
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
  type?: string;
};

const initialInvoices: Invoice[] = [];

const statusClass: Record<string, string> = {
  Pending: "pending",
  Paid: "paid",
  Overdue: "overdue",
  Partial: "partial",
  Returned: "pending",
  "Partially Returned": "pending",
};
const money = (value: number) => `QAR ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Invoices(props: { notify: (message: string) => void; onCreate?: (initialTab?: string, invoiceId?: string) => void; refreshTrigger?: number }) {
  const { notify, refreshTrigger, onCreate } = props;
  const [invoices, setInvoices] = useState(initialInvoices);
  const [invoiceTypeTab, setInvoiceTypeTab] = useState<'Service' | 'Parts'>('Service');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ type: 'today' });
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [advisorFilter, setAdvisorFilter] = useState("All Service Advisors");
  const [page, setPage] = useState(1);
  const [deleteModalInvoice, setDeleteModalInvoice] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewInfoTarget, setViewInfoTarget] = useState<ViewInfoTarget | null>(null);
  const [docSettings, setDocSettings] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('garage_crm_settings_v1');
      return saved ? JSON.parse(saved) : null;
    } catch (_) { return null; }
  });

  useEffect(() => {
    const onSettings = (e: any) => {
      if (e.detail) setDocSettings(e.detail);
      else {
        try {
          const saved = localStorage.getItem('garage_crm_settings_v1');
          if (saved) setDocSettings(JSON.parse(saved));
        } catch (_) {}
      }
    };
    window.addEventListener('garage-settings-updated', onSettings);
    return () => window.removeEventListener('garage-settings-updated', onSettings);
  }, []);

  useEffect(() => {
    invoicesApi.getAll({ limit: 100 })
      .then((res) => {
        const backendList: Invoice[] = res.data || [];
        // Merge with local POS invoices so POS counter sales always appear
        try {
          const localPos = JSON.parse(localStorage.getItem('garage-pos-invoices') || '[]');
          if (Array.isArray(localPos) && localPos.length > 0) {
            const existingIds = new Set(backendList.map(inv => inv.id));
            const convertedLocal: Invoice[] = localPos.filter(pos => !existingIds.has(pos.id)).map(pos => ({
              id: pos.id,
              customer: pos.customer?.name || 'Direct Customer',
              phone: pos.customer?.phone || '',
              email: '',
              vehicle: pos.customer?.vehicle || 'Over The Counter',
              year: '2024',
              plate: pos.customer?.plate || '-',
              workOrder: 'POS',
              service: 'Parts Sale (POS)',
              detail: `${pos.items?.length || 0} part(s) sold over-the-counter`,
              status: pos.status || 'Paid',
              date: pos.date || new Date().toLocaleDateString('en-GB'),
              dueDate: pos.date || new Date().toLocaleDateString('en-GB'),
              amount: pos.total || 0,
              discount: 0,
              advisor: 'Main Counter',
              items: (pos.items || []).map((it: any) => ({
                name: it.name || `Part #${it.productId}`,
                quantity: it.quantity || 1,
                unitPrice: it.price || 0,
              })),
              type: 'Parts',
            }));
            setInvoices([...convertedLocal, ...backendList]);
            return;
          }
        } catch {}
        setInvoices(backendList);
      })
      .catch((err) => {
        console.warn("Could not fetch invoices from backend:", err);
      });
  }, [refreshTrigger]);

  const filteredInvoices = useMemo(() => invoices.filter((invoice) => {
    const isParts = invoice.type === 'Parts' || invoice.service?.toLowerCase().includes('part') || invoice.workOrder === 'POS';
    const matchesType = invoiceTypeTab === 'Parts' ? isParts : !isParts;
    const matchesSearch = `${invoice.id} ${invoice.customer} ${invoice.vehicle} ${invoice.service} ${invoice.detail} ${invoice.workOrder}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesStatus = statusFilter === "All Status" || invoice.status === statusFilter;
    const matchesAdvisor = advisorFilter === "All Service Advisors" || invoice.advisor === advisorFilter;
    const matchesDate = matchesDateFilter(invoice.date || (invoice as any).created_at, dateFilter);
    return matchesType && matchesSearch && matchesStatus && matchesAdvisor && matchesDate;
  }), [advisorFilter, invoices, search, statusFilter, invoiceTypeTab, dateFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredInvoices.length / 10));
  const currentPage = Math.min(page, pageCount);
  const pageInvoices = filteredInvoices.slice((currentPage - 1) * 10, currentPage * 10);
  const selectedInvoice = filteredInvoices.find((invoice) => invoice.id === selectedId) ?? filteredInvoices[0] ?? invoices.find((invoice) => invoice.id === selectedId);
  const counts = {
    total: invoices.length,
    paid: invoices.filter((inv) => inv.status === "Paid").length,
    pending: invoices.filter((inv) => inv.status === "Pending" || inv.status === "Partial").length,
    overdue: invoices.filter((inv) => inv.status === "Overdue").length,
    parts: invoices.filter((inv) => inv.type === 'Parts' || inv.service?.toLowerCase().includes('part') || inv.workOrder === 'POS').length,
    service: invoices.filter((inv) => inv.type !== 'Parts' && !inv.service?.toLowerCase().includes('part') && inv.workOrder !== 'POS').length,
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
      <header className="invoice-page-heading no-print">
        <div className="invoice-page-title">
          <span><FileText size={25} /></span>
          <div><h1>Invoices</h1><p>Manage customer invoices, payments, and billing records.</p></div>
        </div>
      </header>
      <section className="invoice-metrics no-print" aria-label="Invoice summary">
        <article><span className="invoice-metric-icon blue"><FileText size={20} /></span><div><strong>{counts.total}</strong><small>Total Invoices</small></div><Activity size={23} className="invoice-spark blue-text" /></article>
        <article><span className="invoice-metric-icon green"><CircleCheck size={20} /></span><div><strong>{counts.paid}</strong><small>Paid</small></div><Activity size={23} className="invoice-spark green-text" /></article>
        <article><span className="invoice-metric-icon orange"><Clock3 size={20} /></span><div><strong>{counts.pending}</strong><small>Pending</small></div><Activity size={23} className="invoice-spark orange-text" /></article>
        <article><span className="invoice-metric-icon red"><AlertCircle size={20} /></span><div><strong>{counts.overdue}</strong><small>Overdue</small></div><Activity size={23} className="invoice-spark red-text" /></article>
      </section>

      {/* Invoice Type Tabs (Service, Parts) */}
      <div className="invoice-type-tabs no-print" role="tablist" aria-label="Filter invoice types">
        <button
          type="button"
          role="tab"
          aria-selected={invoiceTypeTab === 'Service'}
          className={`invoice-type-tab-btn ${invoiceTypeTab === 'Service' ? 'active' : ''}`}
          onClick={() => { setInvoiceTypeTab('Service'); setPage(1); }}
        >
          <Wrench size={16} />
          <span>Service Invoices</span>
          <span className="count-pill">{counts.service}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={invoiceTypeTab === 'Parts'}
          className={`invoice-type-tab-btn ${invoiceTypeTab === 'Parts' ? 'active' : ''}`}
          onClick={() => { setInvoiceTypeTab('Parts'); setPage(1); }}
        >
          <Package size={16} />
          <span>Parts Invoices (POS)</span>
          <span className="count-pill">{counts.parts}</span>
        </button>
      </div>

      <div className="invoice-management-layout no-print">
        <section className="invoice-list-card">
          <div className="invoice-filters">
            <label className="invoice-search"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search by invoice number, customer name, vehicle..." aria-label="Search invoices" /></label>
            <CustomDropdown
              value={statusFilter}
              onChange={(val) => { setStatusFilter(val); setPage(1); }}
              ariaLabel="Filter by invoice status"
              options={[
                { value: "All Status", label: "All Status" },
                { value: "Paid", label: "Paid", badge: "Completed", badgeColor: "green" },
                { value: "Pending", label: "Pending", badge: "Awaiting", badgeColor: "orange" },
                { value: "Partial", label: "Partial", badge: "Partially Paid", badgeColor: "blue" },
                { value: "Overdue", label: "Overdue", badge: "Action Required", badgeColor: "red" },
              ]}
            />
            <DateRangeFilter value={dateFilter} onChange={(df) => { setDateFilter(df); setPage(1); }} />
            <CustomDropdown
              value={advisorFilter}
              onChange={(val) => { setAdvisorFilter(val); setPage(1); }}
              ariaLabel="Filter by service advisor"
              options={["All Service Advisors", "Ali Hassan", "M. Khan"]}
            />
          </div>
          <div className="invoice-table-scroll">
            <table className="invoice-management-table">
              <thead><tr><th>#</th><th>Invoice No.</th><th>Customer</th><th>Vehicle</th><th>Related To / Service Type</th><th>Status</th><th>Created Date</th><th>Total (QAR)</th><th>Actions</th></tr></thead>
              <tbody>
                {pageInvoices.map((invoice, index) => {
                  const isParts = invoice.type === 'Parts' || invoice.service?.toLowerCase().includes('part') || invoice.workOrder === 'POS';
                  return (
                    <tr key={invoice.id} className={selectedInvoice?.id === invoice.id ? "selected" : ""} onClick={() => setSelectedId(invoice.id)}>
                      <td>{(currentPage - 1) * 10 + index + 1}</td>
                      <td><button className="invoice-id-link" onClick={(event) => { event.stopPropagation(); setSelectedId(invoice.id); }}>{invoice.id}</button></td>
                      <td>{invoice.customer}</td>
                      <td><span className="invoice-vehicle-cell"><CarFront size={25} /><span>{invoice.vehicle}<small>{invoice.year} · {invoice.plate}</small></span></span></td>
                      <td>{invoice.service}<small className="invoice-muted-line">{isParts ? 'Counter Parts Sale' : `Work Order #${invoice.workOrder}`}</small></td>
                      <td><span className={`invoice-status-badge ${statusClass[invoice.status] || 'pending'}`}>{invoice.status}</span></td>
                      <td>{invoice.date}</td>
                      <td className="invoice-amount">{money(invoice.amount)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                          <button
                            className="crm-table-view-btn"
                            aria-label={`View info for ${invoice.id}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedId(invoice.id);
                              setViewInfoTarget({ type: "invoice", data: invoice });
                            }}
                            title="View Info"
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>
                          <button
                            className="crm-table-view-btn"
                            style={{ background: '#f8fafc', borderColor: '#cbd5e1', color: '#334155' }}
                            aria-label={`Reprint invoice ${invoice.id}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedId(invoice.id);
                              setTimeout(() => window.print(), 100);
                            }}
                            title="Reprint Invoice"
                          >
                            <Printer size={13} />
                            <span>Print</span>
                          </button>
                          {isParts && (
                            <button
                              className="crm-table-view-btn"
                              style={{ background: '#fff7ed', borderColor: '#fed7aa', color: '#ea580c' }}
                              aria-label={`Return items from ${invoice.id}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                if (onCreate) {
                                  onCreate('returns', invoice.id);
                                } else {
                                  notify(`Switch to POS Returns to refund invoice ${invoice.id}`);
                                }
                              }}
                              title="Process Return"
                            >
                              <RotateCcw size={13} />
                              <span>Return</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredInvoices.length === 0 && <tr><td colSpan={9} className="invoice-empty">No invoices match the selected filters.</td></tr>}
              </tbody>
            </table>
          </div>
          <footer className="invoice-table-footer"><span>Showing {filteredInvoices.length ? (currentPage - 1) * 10 + 1 : 0} to {Math.min(currentPage * 10, filteredInvoices.length)} of {filteredInvoices.length} invoices</span><div><button aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => <button key={pageNumber} className={currentPage === pageNumber ? "active" : ""} aria-label={`Page ${pageNumber}`} aria-current={currentPage === pageNumber ? "page" : undefined} onClick={() => setPage(pageNumber)}>{pageNumber}</button>)}<button aria-label="Next page" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></button></div></footer>
        </section>
        {selectedInvoice && (
          <aside className="invoice-detail-card" aria-label={`Invoice details for ${selectedInvoice.id}`}>
            <header><div><FileText size={16} /><strong>Invoice Details</strong></div></header>
            <div className="invoice-detail-number"><strong>{selectedInvoice.id}</strong><span className={`invoice-status-badge ${statusClass[selectedInvoice.status]}`}>{selectedInvoice.status}</span></div>
            <small className="invoice-created-at">Created: {selectedInvoice.date}, 10:30 AM</small>
            <section className="invoice-detail-block">
              <h3><UserRound size={15} />Customer <button onClick={() => setViewInfoTarget({ type: "invoice", data: selectedInvoice })}>View Info</button></h3>
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
            <div className="invoice-detail-actions-wrap" style={{ marginTop: "8px" }}>
              <button
                type="button"
                className="crm-view-info-card-btn"
                style={{ width: "100%", marginBottom: "8px" }}
                onClick={() => setViewInfoTarget({ type: "invoice", data: selectedInvoice })}
              >
                <Eye size={14} />
                <span>View Full Info &amp; History</span>
              </button>
              <div className="invoice-detail-actions" style={{ marginTop: 0 }}>
                {selectedInvoice.status !== "Paid" && selectedInvoice.status !== "Returned" && (
                  <button className="mark-paid" onClick={() => markPaid()} style={{ gridColumn: "1 / -1" }}>
                    <Check size={14} />
                    <span>Mark Paid</span>
                  </button>
                )}
                <button onClick={() => window.print()} title="Reprint Invoice">
                  <Printer size={14} />
                  <span>Reprint</span>
                </button>
                <button onClick={() => {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(`${window.location.origin}/#invoice-${selectedInvoice.id}`);
                  }
                  notify(`Invoice link for ${selectedInvoice.id} copied.`);
                }} title="Share Invoice">
                  <Share2 size={14} />
                  <span>Share</span>
                </button>
                {(selectedInvoice.type === 'Parts' || selectedInvoice.service?.toLowerCase().includes('part') || selectedInvoice.workOrder === 'POS') && (
                  <button
                    style={{ borderColor: "#fed7aa", background: "#fff7ed", color: "#c2410c", fontWeight: 600, gridColumn: "1 / -1" }}
                    onClick={() => {
                      if (onCreate) {
                        onCreate('returns', selectedInvoice.id);
                      } else {
                        notify(`Switch to POS Returns to refund invoice ${selectedInvoice.id}`);
                      }
                    }}
                    title="Process Return & Refund"
                  >
                    <RotateCcw size={14} />
                    <span>Process Return / Refund</span>
                  </button>
                )}
                <button
                  style={{ borderColor: "#fecaca", background: "#fff1f2", color: "#e11d48", fontWeight: 600, gridColumn: "1 / -1" }}
                  onClick={() => setDeleteModalInvoice(selectedInvoice)}
                  title="Delete Invoice"
                >
                  <Trash2 size={14} />
                  <span>Delete Invoice</span>
                </button>
              </div>
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
              <div className="tax-invoice-brand" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {docSettings?.showLogoOnPrint !== false && (
                  <img
                    src={
                      docSettings?.logoUrl?.startsWith("data:")
                        ? docSettings.logoUrl
                        : `${import.meta.env.BASE_URL}${docSettings?.logoUrl || "Garage-crm-logo-light.png"}`
                    }
                    alt="Company Logo"
                    style={{ height: "46px", width: "auto", objectFit: "contain" }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `${import.meta.env.BASE_URL}Garage-crm-logo-light.png`;
                    }}
                  />
                )}
                <div>
                  <h2>{(docSettings?.garageName || "DOHA CENTRAL WORKSHOP").toUpperCase()}</h2>
                  <p>{docSettings?.facilitySubtitle || "Auto Care & Service Hub · Bays 01–12"} · {docSettings?.city || "Doha"}, {docSettings?.country || "Qatar"}</p>
                  <p>Phone: {docSettings?.phone || "+974 5555 1234"} · C.R: {docSettings?.crNumber || "84920/1"}</p>
                </div>
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
                  <th style={{ textAlign: "left", width: "60%" }}>Description / Item</th>
                  <th style={{ textAlign: "center", width: "15%" }}>Qty</th>
                  <th style={{ textAlign: "right", width: "25%" }}>Amount (QAR)</th>
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
                  <span>VAT ({typeof docSettings?.taxRate === 'number' ? docSettings.taxRate : 0}%)</span>
                  <strong>{money((selectedInvoice.amount * (typeof docSettings?.taxRate === 'number' ? docSettings.taxRate : 0)) / 100)}</strong>
                </div>
                {selectedInvoice.discount > 0 && (
                  <div>
                    <span>Discount</span>
                    <strong style={{ color: "#dc2626" }}>-{money(selectedInvoice.discount)}</strong>
                  </div>
                )}
                <div className="grand-total-row">
                  <span>Grand Total</span>
                  <span>{money(selectedInvoice.amount + ((selectedInvoice.amount * (typeof docSettings?.taxRate === 'number' ? docSettings.taxRate : 0)) / 100) - (selectedInvoice.discount || 0))}</span>
                </div>
              </div>
            </div>

            {/* Footer Notes & Signature */}
            <div className="tax-invoice-footer">
              <div>
                <p className="thank-you">Thank you for your business!</p>
                <p className="warranty">{docSettings?.invoiceFooterNotes || "Warranty valid for 30 days or 1,000 km from service date."}</p>
              </div>
              {docSettings?.showSignatureLine !== false && (
                <div className="signature-box">
                  <div className="signature-line" />
                  <span>Authorized Signature</span>
                </div>
              )}
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

      <ViewInfoModal
        isOpen={!!viewInfoTarget}
        onClose={() => setViewInfoTarget(null)}
        target={viewInfoTarget}
        notify={notify}
      />
    </main>
  );
}

export default Invoices;
