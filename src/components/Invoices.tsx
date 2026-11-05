import { useEffect, useMemo, useState } from "react";
import { invoicesApi, mechanicsApi } from "../lib/api";
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
  Eye,
  FileText,
  Package,
  Printer,
  Search,
  RotateCcw,
  Share2,
  Trash2,
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

  const currencyCode = docSettings?.currency || "USD";
  const money = (value: number) => `${currencyCode} ${(Number(value) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const [availableMechanics, setAvailableMechanics] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("garage_crm_mechanics_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m: any) => m.name || m.fullName).filter(Boolean);
        }
      }
    } catch (_) {}
    return [];
  });

  useEffect(() => {
    const loadMechanics = () => {
      try {
        const saved = localStorage.getItem("garage_crm_mechanics_v1");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAvailableMechanics(parsed.map((m: any) => m.name || m.fullName).filter(Boolean));
            return;
          }
        }
      } catch (_) {}
      mechanicsApi
        .getAll({ limit: 100 })
        .then((res) => {
          if (res.data && Array.isArray(res.data) && res.data.length > 0) {
            setAvailableMechanics(res.data.map((m: any) => m.name || m.fullName).filter(Boolean));
          } else {
            setAvailableMechanics([]);
          }
        })
        .catch(() => setAvailableMechanics([]));
    };
    loadMechanics();
    window.addEventListener("garage_mechanics_updated", loadMechanics);
    window.addEventListener("storage", loadMechanics);
    window.addEventListener("focus", loadMechanics);
    return () => {
      window.removeEventListener("garage_mechanics_updated", loadMechanics);
      window.removeEventListener("storage", loadMechanics);
      window.removeEventListener("focus", loadMechanics);
    };
  }, []);

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
            const combined = [...convertedLocal, ...backendList];
            const seenInv = new Set<string>();
            const dedupedInv = combined.filter((item: any) => {
              const key = item.workOrder && item.workOrder !== 'POS'
                ? `${item.customer}_${item.workOrder}`.toLowerCase()
                : item.id || item.invoiceId;
              if (seenInv.has(key)) return false;
              seenInv.add(key);
              return true;
            });
            setInvoices(dedupedInv);
            return;
          }
        } catch {}
        const seenInv = new Set<string>();
        const dedupedBackend = backendList.filter((item: any) => {
          const key = item.workOrder && item.workOrder !== 'POS'
            ? `${item.customer}_${item.workOrder}`.toLowerCase()
            : item.id || item.invoiceId;
          if (seenInv.has(key)) return false;
          seenInv.add(key);
          return true;
        });
        setInvoices(dedupedBackend);
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
              options={["All Service Advisors", ...availableMechanics]}
            />
          </div>
          <div className="invoice-table-scroll">
            <table className="invoice-management-table">
              <thead><tr><th>#</th><th>Invoice No.</th><th>Customer</th><th>Vehicle</th><th>Related To / Service Type</th><th>Status</th><th>Created Date</th><th>Total ({currencyCode})</th><th>Actions</th></tr></thead>
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
          <aside className="intake-preview-card invoice-paper-preview-aside" style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "14px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            {/* Top Preview Status Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "10px",
                padding: "8px 12px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "7px", color: "#ff631c", fontWeight: 700, fontSize: "12px" }}>
                <FileText size={15} />
                <span>Invoice Document Preview</span>
              </div>
              <span className={`invoice-status-badge ${statusClass[selectedInvoice.status]}`} style={{ margin: 0 }}>
                {selectedInvoice.status}
              </span>
            </div>

            {/* Paper Document matching Quotations & New Intake */}
            <article className="intake-preview-paper" style={{ borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.03)", padding: "14px" }}>
              <header className="intake-paper-header" style={{ alignItems: "flex-start", paddingTop: "0px", paddingBottom: "12px", borderBottom: "2px solid #0f172a" }}>
                <div className="intake-paper-brand" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {docSettings?.showLogoOnPrint !== false && docSettings?.logoUrl ? (
                    <img
                      src={
                        docSettings.logoUrl.startsWith("data:")
                          ? docSettings.logoUrl
                          : `${import.meta.env.BASE_URL}${docSettings.logoUrl}`
                      }
                      alt="Company Logo"
                      style={{ height: "46px", width: "auto", objectFit: "contain", display: "block" }}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "8px",
                      background: "linear-gradient(135deg, #0f172a, #1e293b)",
                      color: "#f97316",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      fontSize: "16px",
                      border: "1px solid #334155"
                    }}>
                      {((docSettings?.garageName || "GC").substring(0, 2)).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <strong style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a", display: "block", lineHeight: 1.2 }}>
                      {(docSettings?.garageName || "GARAGE WORKSHOP").toUpperCase()}
                    </strong>
                    <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 500, display: "block", marginTop: "2px" }}>
                      {docSettings?.facilitySubtitle || docSettings?.address || "Automotive Care & Diagnostics Center"}
                    </span>
                    {(docSettings?.phone || docSettings?.email || docSettings?.crNumber) && (
                      <small style={{ fontSize: "9px", color: "#94a3b8", display: "block", marginTop: "2px" }}>
                        {[
                          docSettings?.phone ? `Tel: ${docSettings.phone}` : null,
                          docSettings?.email ? `Email: ${docSettings.email}` : null,
                          docSettings?.crNumber ? `C.R: ${docSettings.crNumber}` : null,
                          docSettings?.taxNumber ? `Tax/TIN: ${docSettings.taxNumber}` : null,
                        ].filter(Boolean).join(" · ")}
                      </small>
                    )}
                  </div>
                </div>
                <div>
                  <strong style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>TAX INVOICE</strong>
                  <b style={{ fontSize: "12px", color: "#1e293b" }}>{selectedInvoice.id}</b>
                  <span className={`intake-paper-status ${selectedInvoice.status === "Paid" ? "approved" : "pending"}`}>
                    {selectedInvoice.status}
                  </span>
                  <small style={{ fontSize: "9.5px", color: "#64748b" }}>Date: {selectedInvoice.date}</small>
                  {selectedInvoice.workOrder && (
                    <small style={{ fontSize: "9.5px", color: "#64748b" }}>Work Order: #{selectedInvoice.workOrder}</small>
                  )}
                </div>
              </header>

              <div className="intake-paper-details" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", padding: "10px 0", borderBottom: "1px solid #e7ebf1" }}>
                <section style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "10px" }}>
                  <h3 style={{ margin: "0 0 4px", fontSize: "10px", fontWeight: 700, color: "#475569" }}>Billed To Customer</h3>
                  <strong style={{ fontSize: "11px", color: "#0f172a" }}>{selectedInvoice.customer || "Walk-in Customer"}</strong>
                  <span style={{ color: "#64748b" }}>{selectedInvoice.phone || "No Mobile"}</span>
                  {selectedInvoice.email && <span style={{ color: "#64748b" }}>{selectedInvoice.email}</span>}
                </section>
                <section style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "10px" }}>
                  <h3 style={{ margin: "0 0 4px", fontSize: "10px", fontWeight: 700, color: "#475569" }}>Vehicle Details</h3>
                  <strong style={{ fontSize: "11px", color: "#0f172a" }}>{selectedInvoice.vehicle || "Vehicle"}</strong>
                  <span style={{ color: "#64748b" }}>Year: {selectedInvoice.year || "—"}</span>
                  <span style={{ color: "#64748b" }}>Plate No: {selectedInvoice.plate || "—"}</span>
                  {selectedInvoice.advisor && <span style={{ color: "#64748b" }}>Advisor: {selectedInvoice.advisor}</span>}
                </section>
              </div>

              <section className="intake-paper-complaint" style={{ padding: "9px 0", borderBottom: "1px solid #e7ebf1" }}>
                <h3 style={{ margin: "0 0 4px", fontSize: "10px", fontWeight: 700, color: "#475569" }}>Service Scope / Description</h3>
                <p style={{ margin: 0, color: "#1e293b", fontSize: "10px", lineHeight: 1.4 }}>
                  {selectedInvoice.service} {selectedInvoice.detail ? `· ${selectedInvoice.detail}` : ''}
                </p>
              </section>

              <div className="intake-paper-table-wrap" style={{ marginTop: "8px" }}>
                <table className="intake-paper-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "9.5px" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th style={{ padding: "6px 4px", borderBottom: "1px solid #e2e8f0" }}>#</th>
                      <th style={{ padding: "6px 4px", borderBottom: "1px solid #e2e8f0" }}>Description</th>
                      <th style={{ padding: "6px 4px", textAlign: "center", borderBottom: "1px solid #e2e8f0" }}>Qty</th>
                      <th style={{ padding: "6px 4px", textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>Unit Price ({currencyCode})</th>
                      <th style={{ padding: "6px 4px", textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>Total ({currencyCode})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                      selectedInvoice.items.map((item, index) => (
                        <tr key={`${selectedInvoice.id}-${item.name}-${index}`}>
                          <td style={{ padding: "5px 4px", borderBottom: "1px solid #f1f5f9" }}>{index + 1}</td>
                          <td style={{ padding: "5px 4px", borderBottom: "1px solid #f1f5f9", fontWeight: 600, color: "#1e293b" }}>{item.name}</td>
                          <td style={{ padding: "5px 4px", textAlign: "center", borderBottom: "1px solid #f1f5f9" }}>{item.quantity}</td>
                          <td style={{ padding: "5px 4px", textAlign: "right", borderBottom: "1px solid #f1f5f9" }}>{money(item.unitPrice).replace(/^[A-Za-z]+\s*/, '')}</td>
                          <td style={{ padding: "5px 4px", textAlign: "right", borderBottom: "1px solid #f1f5f9", fontWeight: 600 }}>{money(item.quantity * item.unitPrice).replace(/^[A-Za-z]+\s*/, '')}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ padding: "8px 4px", textAlign: "center", color: "#64748b" }}>
                          No specific line items entered.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Highlighted Total Amount Banner */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#fff0eb",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  margin: "12px 0 10px",
                  border: "1px solid #ffd8c4",
                }}
              >
                <strong style={{ color: "#ea580c", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                  Total Invoiced ({currencyCode})
                </strong>
                <strong style={{ color: "#ea580c", fontSize: "16px", fontWeight: 800 }}>
                  {money(selectedInvoice.amount)}
                </strong>
              </div>

              {/* Notes */}
              <section className="intake-paper-notes" style={{ padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
                <h3 style={{ margin: "0 0 4px", fontSize: "9.5px", fontWeight: 700, color: "#475569" }}>Invoice Notes</h3>
                <p style={{ margin: 0, fontSize: "9px", color: "#64748b", lineHeight: 1.4 }}>• Payment status: {selectedInvoice.status}. Payment terms: Due in 7 days.</p>
                <p style={{ margin: "2px 0 0", fontSize: "9px", color: "#64748b", lineHeight: 1.4 }}>• Warranty valid for 30 days or 1,000 km from service date.</p>
                {selectedInvoice.advisor && <p style={{ margin: "2px 0 0", fontSize: "9px", color: "#64748b", lineHeight: 1.4 }}>• Service Advisor: {selectedInvoice.advisor}</p>}
              </section>

              {/* Signature Line */}
              {docSettings?.showSignatureLine !== false && (
                <div className="intake-paper-signature" style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "end", gap: "6px 10px", marginTop: "10px", fontSize: "9.5px" }}>
                  <strong style={{ color: "#475569" }}>Authorized Signature:</strong>
                  <span style={{ gridColumn: "1 / -1", height: "32px", border: "1px dashed #cbd5e1", borderRadius: "4px" }} />
                  <small style={{ gridColumn: "2", color: "#94a3b8" }}>Date: __________________</small>
                </div>
              )}
            </article>

            {/* Action buttons matching professional UI */}
            <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {selectedInvoice.status !== "Paid" && selectedInvoice.status !== "Returned" && (
                <button
                  className="mark-paid"
                  onClick={() => markPaid()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "9px 12px",
                    background: "#08a85d",
                    color: "#ffffff",
                    borderRadius: "8px",
                    border: 0,
                    fontWeight: 700,
                    fontSize: "12px",
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(8, 168, 93, 0.25)"
                  }}
                >
                  <Check size={15} />
                  <span>Mark Paid</span>
                </button>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <button
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "9px 12px",
                    background: "#ff631c",
                    color: "#ffffff",
                    borderRadius: "8px",
                    border: 0,
                    fontWeight: 700,
                    fontSize: "12px",
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(255, 99, 28, 0.25)"
                  }}
                  onClick={() => window.print()}
                  title="Reprint Invoice"
                >
                  <Printer size={15} />
                  <span>Print Invoice</span>
                </button>

                <button
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "9px 12px",
                    background: "#f1f5f9",
                    color: "#334155",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontWeight: 600,
                    fontSize: "12px",
                    cursor: "pointer"
                  }}
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(`${window.location.origin}/#invoice-${selectedInvoice.id}`);
                    }
                    notify(`Invoice link for ${selectedInvoice.id} copied.`);
                  }}
                  title="Share Invoice"
                >
                  <Share2 size={14} />
                  <span>Share Link</span>
                </button>
              </div>

              <button
                type="button"
                className="crm-view-info-card-btn"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "8px 12px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "11px",
                  color: "#475569",
                  cursor: "pointer"
                }}
                onClick={() => setViewInfoTarget({ type: "invoice", data: selectedInvoice })}
              >
                <Eye size={14} />
                <span>View Full Info &amp; History</span>
              </button>

              {(selectedInvoice.type === 'Parts' || selectedInvoice.service?.toLowerCase().includes('part') || selectedInvoice.workOrder === 'POS') && (
                <button
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "8px 12px",
                    borderColor: "#fed7aa",
                    background: "#fff7ed",
                    color: "#c2410c",
                    fontWeight: 600,
                    fontSize: "11px",
                    borderRadius: "8px",
                    border: "1px solid #fed7aa",
                    cursor: "pointer"
                  }}
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
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "8px 12px",
                  borderColor: "#fecaca",
                  background: "#fff1f2",
                  color: "#e11d48",
                  borderRadius: "8px",
                  border: "1px solid #fecaca",
                  fontWeight: 600,
                  fontSize: "11px",
                  cursor: "pointer"
                }}
                onClick={() => setDeleteModalInvoice(selectedInvoice)}
                title="Delete Invoice"
              >
                <Trash2 size={13} />
                <span>Delete Invoice</span>
              </button>
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
                {docSettings?.showLogoOnPrint !== false && docSettings?.logoUrl ? (
                  <img
                    src={
                      docSettings.logoUrl.startsWith("data:")
                        ? docSettings.logoUrl
                        : `${import.meta.env.BASE_URL}${docSettings.logoUrl}`
                    }
                    alt="Company Logo"
                    style={{ height: "46px", width: "auto", objectFit: "contain" }}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #0f172a, #1e293b)",
                    color: "#f97316",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    fontSize: "18px",
                    border: "1px solid #334155"
                  }}>
                    {((docSettings?.garageName || "GC").substring(0, 2)).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2>{(docSettings?.garageName || "GARAGE WORKSHOP").toUpperCase()}</h2>
                  <p>{docSettings?.facilitySubtitle || docSettings?.address || "Automotive Care & Diagnostics Center"}</p>
                  {(docSettings?.phone || docSettings?.email || docSettings?.crNumber) && (
                    <p>
                      {[
                        docSettings?.phone ? `Phone: ${docSettings.phone}` : null,
                        docSettings?.email ? `Email: ${docSettings.email}` : null,
                        docSettings?.crNumber ? `C.R: ${docSettings.crNumber}` : null,
                        docSettings?.taxNumber ? `Tax/TIN: ${docSettings.taxNumber}` : null,
                      ].filter(Boolean).join(" · ")}
                    </p>
                  )}
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
                  Plate: {selectedInvoice.plate || "TBD"} · Advisor: {selectedInvoice.advisor || "Unassigned"}
                </div>
              </div>
            </div>

            {/* Service & Items Table */}
            <table className="tax-invoice-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left", width: "60%" }}>Description / Item</th>
                  <th style={{ textAlign: "center", width: "15%" }}>Qty</th>
                  <th style={{ textAlign: "right", width: "25%" }}>Amount ({currencyCode})</th>
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
