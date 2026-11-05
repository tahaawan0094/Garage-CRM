import { useEffect, useMemo, useState } from "react";
import { quotationsApi, invoicesApi, workOrdersApi, mechanicsApi } from "../lib/api";
import { getNextInvoiceId, commitInvoiceId } from "../lib/sequence";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { CustomDropdown } from "./CustomDropdown";
import { DateRangeFilter, type DateFilterValue, matchesDateFilter } from "./DateRangeFilter";
import {
  Activity,
  CarFront,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock3,
  Eye,
  FileText,
  Pencil,
  Printer,
  Search,
  Share2,
  Trash2,
  X,
} from "lucide-react";

type QuoteStatus = "Awaiting Approval" | "Approved" | "Draft" | "Rejected" | "Expired" | "Pending";
type QuoteItem = { name: string; quantity: number; unitPrice: number };
type Quote = {
  id: string;
  customer: string;
  vehicle: string;
  year: string;
  plate: string;
  service: string;
  detail: string;
  status: QuoteStatus;
  date: string;
  amount: number;
  advisor: string;
  items: QuoteItem[];
};

const LOCAL_STORAGE_QUOTES_KEY = "garage_crm_quotations_v1";

const getTodayStr = () => new Date().toISOString().split("T")[0];
const statusClass: Record<QuoteStatus, string> = {
  "Awaiting Approval": "awaiting",
  Approved: "approved",
  Draft: "draft",
  Rejected: "rejected",
  Expired: "expired",
  Pending: "awaiting",
};

function Quotations({
  notify,
  refreshTrigger,
  onSynced,
}: {
  notify: (message: string) => void;
  refreshTrigger?: number;
  onSynced?: () => void;
}) {
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

  const [quotes, setQuotes] = useState<Quote[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_QUOTES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [selectedId, setSelectedId] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [advisorFilter, setAdvisorFilter] = useState("All Service Advisors");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ type: 'today' });
  const [deleteModalQuote, setDeleteModalQuote] = useState<Quote | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const fetchAndMergeQuotations = () => {
    let localQuotes: Quote[] = [];
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_QUOTES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) localQuotes = parsed;
      }
    } catch {}
    // Do not force dummy seed quotes on fresh registrations

    quotationsApi.getAll({ limit: 100 })
      .then((res) => {
        const apiList = res.data || [];
        const map = new Map<string, Quote>();
        localQuotes.forEach((q) => { if (q.id) map.set(q.id, q); });
        apiList.forEach((q: any) => {
          if (q.id) {
            map.set(q.id, {
              ...map.get(q.id),
              ...q,
              date: q.date || (map.get(q.id)?.date ?? getTodayStr()),
            });
          }
        });
        const merged = Array.from(map.values());
        setQuotes(merged);
        try {
          localStorage.setItem(LOCAL_STORAGE_QUOTES_KEY, JSON.stringify(merged));
        } catch {}
      })
      .catch((err) => {
        console.warn("Could not fetch quotations from backend, using local:", err);
        setQuotes(localQuotes);
      });
  };

  useEffect(() => {
    fetchAndMergeQuotations();
    const handleUpdated = () => fetchAndMergeQuotations();
    window.addEventListener("garage_quotations_updated", handleUpdated);
    return () => window.removeEventListener("garage_quotations_updated", handleUpdated);
  }, [refreshTrigger]);

  useEffect(() => {
    if (quotes.length > 0) {
      try {
        localStorage.setItem(LOCAL_STORAGE_QUOTES_KEY, JSON.stringify(quotes));
      } catch {}
    }
  }, [quotes]);

  const filteredQuotes = useMemo(() => quotes.filter((quote) => {
    const matchesSearch = `${quote.id} ${quote.customer} ${quote.vehicle} ${quote.service} ${quote.detail}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesStatus = statusFilter === "All Status" || quote.status === statusFilter;
    const matchesAdvisor = advisorFilter === "All Service Advisors" || quote.advisor === advisorFilter;
    const matchesDate = matchesDateFilter(quote.date || (quote as any).createdAt, dateFilter);
    return matchesSearch && matchesStatus && matchesAdvisor && matchesDate;
  }), [advisorFilter, quotes, search, statusFilter, dateFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredQuotes.length / 10));
  const currentPage = Math.min(page, pageCount);
  const pageQuotes = filteredQuotes.slice((currentPage - 1) * 10, currentPage * 10);
  const selectedQuote = filteredQuotes.find((quote) => quote.id === selectedId) ?? filteredQuotes[0] ?? quotes.find((quote) => quote.id === selectedId);
  const counts = {
    total: quotes.length,
    draft: quotes.filter((q) => q.status === "Draft").length,
    awaiting: quotes.filter((q) => q.status === "Awaiting Approval" || q.status === "Pending").length,
    approved: quotes.filter((q) => q.status === "Approved").length,
  };

  const decide = async (decision: "Approved" | "Rejected", targetQuoteId?: string) => {
    const targetId = targetQuoteId || selectedQuote?.id;
    if (!targetId) return;
    const target = quotes.find((q) => q.id === targetId);
    if (!target || (target.status !== "Awaiting Approval" && target.status !== "Pending")) return;

    setQuotes((current) => current.map((quote) => quote.id === targetId ? { ...quote, status: decision } : quote));
    try {
      const LOCAL_KEY = "garage_crm_quotations_v1";
      const existing = localStorage.getItem(LOCAL_KEY);
      if (existing) {
        const parsed = JSON.parse(existing);
        const updated = parsed.map((q: any) => q.id === targetId ? { ...q, status: decision } : q);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
      }
    } catch (_) {}

    // Sync approval/rejection to MongoDB Atlas
    if (decision === "Approved") {
      quotationsApi.approve(targetId).catch((err) => console.warn("Approve sync error:", err));

      const targetWoId = (target as any).workOrder || target.id;

      // Update existing work order rather than creating a duplicate
      if ((target as any).workOrder) {
        workOrdersApi.update((target as any).workOrder, { status: 'In Progress' }).catch(() => {});
      } else {
        workOrdersApi.update(target.id.replace('QT-', 'WO-'), { status: 'In Progress' }).catch(() => {});
      }

      // Check existing invoices to avoid duplicate invoice creation
      if (docSettings?.autoInvoiceOnApproval !== false) {
        invoicesApi.getAll({ limit: 100 }).then((res) => {
          const existing = res.data?.find(
            (inv: any) =>
              (targetWoId && inv.workOrder === targetWoId) ||
              inv.workOrder === target.id ||
              inv.id === target.id
          );
          if (!existing) {
            const newInvId = getNextInvoiceId();
            commitInvoiceId(newInvId);
            invoicesApi.create({
              invoiceId: newInvId,
              customer: target.customer,
              vehicle: target.vehicle,
              plate: target.plate || 'TBD',
              year: target.year || '2024',
              service: target.service,
              detail: target.detail || '',
              amount: target.amount,
              total: target.amount,
              status: 'Pending',
              advisor: target.advisor || '',
              date: new Date().toLocaleDateString('en-GB'),
              items: target.items || [],
              workOrder: targetWoId,
            }).then(() => {
              onSynced?.();
              notify(`Quotation ${targetId} approved! Invoice ${newInvId} created in Invoices.`);
            }).catch(err => console.warn("Invoice auto-creation sync error:", err));
          } else {
            notify(`Quotation ${targetId} approved! Linked to existing invoice ${existing.invoiceId || existing.id}.`);
          }
        }).catch(() => {
          notify(`Quotation ${targetId} approved!`);
        });
      } else {
        notify(`Quotation ${targetId} approved!`);
      }
      onSynced?.();
    } else {
      quotationsApi.reject(targetId).catch((err) => console.warn("Reject sync error:", err));
      notify(`${targetId} rejected.`);
      onSynced?.();
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalQuote) return;
    setIsDeleting(true);
    try {
      await quotationsApi.delete(deleteModalQuote.id);
      setQuotes((current) => current.filter((q) => q.id !== deleteModalQuote.id));
      if (selectedId === deleteModalQuote.id) setSelectedId("");
      notify(`Quotation ${deleteModalQuote.id} deleted successfully.`);
      setDeleteModalQuote(null);
    } catch (err: any) {
      notify(`Failed to delete quotation: ${err.message || "Unknown error"}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className="quote-management">
      <header className="quote-page-heading">
        <div className="quote-page-title">
          <span><FileText size={25} /></span>
          <div><h1>Quotations</h1><p>Create, review, and approve customer estimates.</p></div>
        </div>
      </header>

      <section className="quote-metrics" aria-label="Quotation summary">
        <article><span className="quote-metric-icon blue"><FileText size={20} /></span><div><strong>{counts.total}</strong><small>Total Quotations</small></div><Activity size={23} className="quote-spark blue-text" /></article>
        <article><span className="quote-metric-icon amber"><Pencil size={19} /></span><div><strong>{counts.draft}</strong><small>Draft</small></div><Activity size={23} className="quote-spark amber-text" /></article>
        <article><span className="quote-metric-icon orange"><Clock3 size={20} /></span><div><strong>{counts.awaiting}</strong><small>Awaiting Approval</small></div><Activity size={23} className="quote-spark orange-text" /></article>
        <article><span className="quote-metric-icon green"><CircleCheck size={20} /></span><div><strong>{counts.approved}</strong><small>Approved</small></div><Activity size={23} className="quote-spark green-text" /></article>
      </section>

      <div className="quote-management-layout">
        <section className="quote-list-card">
          <div className="quote-filters">
            <label className="quote-search"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search by customer name, quote no., or vehicle..." aria-label="Search quotations" /></label>
            <CustomDropdown
              value={statusFilter}
              onChange={(val) => { setStatusFilter(val); setPage(1); }}
              ariaLabel="Filter by quotation status"
              options={[
                { value: "All Status", label: "All Status" },
                { value: "Awaiting Approval", label: "Awaiting Approval", badge: "Pending", badgeColor: "orange" },
                { value: "Approved", label: "Approved", badge: "Accepted", badgeColor: "green" },
                { value: "Draft", label: "Draft", badge: "Working", badgeColor: "blue" },
                { value: "Rejected", label: "Rejected", badge: "Declined", badgeColor: "red" },
                { value: "Expired", label: "Expired", badge: "Past Date", badgeColor: "red" },
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
          <div className="quote-table-scroll">
            <table className="quote-management-table">
              <thead><tr><th>#</th><th>Quote No.</th><th>Customer</th><th>Vehicle</th><th>Service Type</th><th>Status</th><th>Created Date</th><th>Total ({currencyCode})</th><th>Actions</th></tr></thead>
              <tbody>
                {pageQuotes.map((quote, index) => (
                  <tr key={quote.id} className={selectedQuote?.id === quote.id ? "selected" : ""} onClick={() => setSelectedId(quote.id)}>
                    <td>{(currentPage - 1) * 10 + index + 1}</td>
                    <td><button className="quote-id-link" onClick={(event) => { event.stopPropagation(); setSelectedId(quote.id); }}>{quote.id}</button></td>
                    <td>{quote.customer}</td>
                    <td><span className="quote-vehicle-cell"><CarFront size={25} /><span>{quote.vehicle}<small>{quote.year} · {quote.plate}</small></span></span></td>
                    <td>{quote.service}<small className="quote-muted-line">{quote.detail}</small></td>
                    <td><span className={`quote-status-badge ${statusClass[quote.status]}`}>{quote.status}</span></td>
                    <td>{quote.date}</td><td className="quote-amount">{money(quote.amount)}</td>
                    <td>
                      <button className="quote-row-view" aria-label={`View ${quote.id}`} onClick={(event) => { event.stopPropagation(); setSelectedId(quote.id); }}>
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredQuotes.length === 0 && <tr><td colSpan={9} className="quote-empty">No quotations match the selected filters.</td></tr>}
              </tbody>
            </table>
          </div>
          <footer className="quote-table-footer"><span>Showing {filteredQuotes.length ? (currentPage - 1) * 10 + 1 : 0} to {Math.min(currentPage * 10, filteredQuotes.length)} of {filteredQuotes.length} quotations</span><div><button aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => <button key={pageNumber} className={currentPage === pageNumber ? "active" : ""} aria-label={`Page ${pageNumber}`} aria-current={currentPage === pageNumber ? "page" : undefined} onClick={() => setPage(pageNumber)}>{pageNumber}</button>)}<button aria-label="Next page" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></button></div></footer>
        </section>

        {selectedQuote && (
          <aside className="intake-preview-card quote-paper-preview-aside" style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "14px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
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
                <span>Quotation Document Preview</span>
              </div>
              <span className={`quote-status-badge ${statusClass[selectedQuote.status]}`} style={{ margin: 0 }}>
                {selectedQuote.status}
              </span>
            </div>

            {/* Paper Document matching New Intake */}
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
                  <strong style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>QUOTATION</strong>
                  <b style={{ fontSize: "12px", color: "#1e293b" }}>{selectedQuote.id}</b>
                  <span className={`intake-paper-status ${selectedQuote.status === "Approved" ? "approved" : selectedQuote.status === "Rejected" ? "rejected" : selectedQuote.status === "Draft" ? "" : "pending"}`}>
                    {selectedQuote.status}
                  </span>
                  <small style={{ fontSize: "9.5px", color: "#64748b" }}>Date: {selectedQuote.date}</small>
                  <small style={{ fontSize: "9.5px", color: "#64748b" }}>Valid Until: {selectedQuote.date} (+7 days)</small>
                </div>
              </header>

              <div className="intake-paper-details" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", padding: "10px 0", borderBottom: "1px solid #e7ebf1" }}>
                <section style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "10px" }}>
                  <h3 style={{ margin: "0 0 4px", fontSize: "10px", fontWeight: 700, color: "#475569" }}>Customer Details</h3>
                  <strong style={{ fontSize: "11px", color: "#0f172a" }}>{selectedQuote.customer || "Walk-in Customer"}</strong>
                  <span style={{ color: "#64748b" }}>{selectedQuote.plate || "No Mobile"}</span>
                  <span style={{ color: "#64748b" }}>{selectedQuote.customer.toLowerCase().replaceAll(" ", ".")}@email.com</span>
                </section>
                <section style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "10px" }}>
                  <h3 style={{ margin: "0 0 4px", fontSize: "10px", fontWeight: 700, color: "#475569" }}>Vehicle Details</h3>
                  <strong style={{ fontSize: "11px", color: "#0f172a" }}>{selectedQuote.vehicle || "Vehicle"}</strong>
                  <span style={{ color: "#64748b" }}>Year: {selectedQuote.year || "—"}</span>
                  <span style={{ color: "#64748b" }}>Plate No: {selectedQuote.plate || "—"}</span>
                  <span style={{ color: "#64748b" }}>Service Advisor: {selectedQuote.advisor || "Unassigned"}</span>
                </section>
              </div>

              <section className="intake-paper-complaint" style={{ padding: "9px 0", borderBottom: "1px solid #e7ebf1" }}>
                <h3 style={{ margin: "0 0 4px", fontSize: "10px", fontWeight: 700, color: "#475569" }}>Customer Complaint / Service Scope</h3>
                <p style={{ margin: 0, color: "#1e293b", fontSize: "10px", lineHeight: 1.4 }}>{selectedQuote.detail || selectedQuote.service || "General Automotive Inspection & Service"}</p>
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
                    {selectedQuote.items && selectedQuote.items.length > 0 ? (
                      selectedQuote.items.map((item, index) => (
                        <tr key={`${selectedQuote.id}-${item.name}-${index}`}>
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
                  Total Amount ({currencyCode})
                </strong>
                <strong style={{ color: "#ea580c", fontSize: "16px", fontWeight: 800 }}>
                  {money(selectedQuote.amount)}
                </strong>
              </div>

              {/* Notes */}
              <section className="intake-paper-notes" style={{ padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
                <h3 style={{ margin: "0 0 4px", fontSize: "9.5px", fontWeight: 700, color: "#475569" }}>Notes</h3>
                <p style={{ margin: 0, fontSize: "9px", color: "#64748b", lineHeight: 1.4 }}>• This is a quotation and not a tax invoice.</p>
                <p style={{ margin: "2px 0 0", fontSize: "9px", color: "#64748b", lineHeight: 1.4 }}>• Valid for 7 days from issue date.</p>
                <p style={{ margin: "2px 0 0", fontSize: "9px", color: "#64748b", lineHeight: 1.4 }}>• Service Advisor: {selectedQuote.advisor || "Unassigned"}</p>
              </section>

              {/* Signature Line */}
              {docSettings?.showSignatureLine !== false && (
                <div className="intake-paper-signature" style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "end", gap: "6px 10px", marginTop: "10px", fontSize: "9.5px" }}>
                  <strong style={{ color: "#475569" }}>Customer Signature:</strong>
                  <span style={{ gridColumn: "1 / -1", height: "32px", border: "1px dashed #cbd5e1", borderRadius: "4px" }} />
                  <small style={{ gridColumn: "2", color: "#94a3b8" }}>Date: __________________</small>
                </div>
              )}
            </article>

            {/* Action buttons matching professional UI */}
            <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
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
                >
                  <Printer size={15} />
                  Print Quotation
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
                      navigator.clipboard.writeText(`${window.location.origin}/#quote-${selectedQuote.id}`);
                    }
                    notify(`Quotation link for ${selectedQuote.id} copied.`);
                  }}
                >
                  <Share2 size={14} />
                  Share Link
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <button
                  className="approve"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "9px 12px",
                    fontSize: "12px",
                    fontWeight: 700,
                    borderRadius: "8px",
                    opacity: (selectedQuote.status !== "Awaiting Approval" && selectedQuote.status !== "Pending") ? 0.5 : 1,
                    cursor: (selectedQuote.status !== "Awaiting Approval" && selectedQuote.status !== "Pending") ? "not-allowed" : "pointer"
                  }}
                  disabled={selectedQuote.status !== "Awaiting Approval" && selectedQuote.status !== "Pending"}
                  onClick={() => decide("Approved")}
                >
                  <Check size={14} />
                  Approve
                </button>

                <button
                  className="reject"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "9px 12px",
                    fontSize: "12px",
                    fontWeight: 700,
                    borderRadius: "8px",
                    opacity: (selectedQuote.status !== "Awaiting Approval" && selectedQuote.status !== "Pending") ? 0.5 : 1,
                    cursor: (selectedQuote.status !== "Awaiting Approval" && selectedQuote.status !== "Pending") ? "not-allowed" : "pointer"
                  }}
                  disabled={selectedQuote.status !== "Awaiting Approval" && selectedQuote.status !== "Pending"}
                  onClick={() => decide("Rejected")}
                >
                  <X size={14} />
                  Reject
                </button>
              </div>

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
                onClick={() => setDeleteModalQuote(selectedQuote)}
              >
                <Trash2 size={13} />
                Delete Quote
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Off-screen / Print-only Single-Page Official Quotation */}
      {selectedQuote && (
        <div className="printable-tax-invoice-wrapper" id="printable-quotation">
          <div className="printable-tax-invoice">
            {/* Quotation Slip Header */}
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
                <span className="tax-invoice-badge" style={{ background: "#eff6ff", color: "#1d4ed8", borderColor: "#bfdbfe" }}>
                  PRICE QUOTATION / عرض أسعار
                </span>
                <h3>{selectedQuote.id}</h3>
                <p>Date: {selectedQuote.date || new Date().toLocaleDateString("en-GB")}</p>
                <p>Status: {selectedQuote.status}</p>
              </div>
            </div>

            {/* Customer & Vehicle Grid */}
            <div className="tax-invoice-grid">
              <div>
                <strong>Customer Details</strong>
                <div className="party-name">{selectedQuote.customer}</div>
                <div className="party-detail">Advisor: {selectedQuote.advisor || "Unassigned"}</div>
              </div>
              <div>
                <strong>Vehicle Details</strong>
                <div className="party-name">{selectedQuote.vehicle} {selectedQuote.year ? `(${selectedQuote.year})` : ""}</div>
                <div className="party-detail">
                  Plate: {selectedQuote.plate || "TBD"}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <table className="tax-invoice-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left", width: "60%" }}>Description / Item</th>
                  <th style={{ textAlign: "center", width: "15%" }}>Qty</th>
                  <th style={{ textAlign: "right", width: "25%" }}>Amount ({currencyCode})</th>
                </tr>
              </thead>
              <tbody>
                {selectedQuote.items && selectedQuote.items.length > 0 ? (
                  selectedQuote.items.map((item, idx) => (
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
                      <div className="item-title">{selectedQuote.service || selectedQuote.detail || "Automotive Quotation Item"}</div>
                    </td>
                    <td style={{ textAlign: "center" }}>1</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{money(selectedQuote.amount)}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Totals Section */}
            <div className="tax-invoice-totals-wrap">
              <div className="tax-invoice-totals">
                <div>
                  <span>Subtotal</span>
                  <strong>{money(selectedQuote.amount)}</strong>
                </div>
                <div>
                  <span>VAT ({typeof docSettings?.taxRate === 'number' ? docSettings.taxRate : 0}%)</span>
                  <strong>{money((selectedQuote.amount * (typeof docSettings?.taxRate === 'number' ? docSettings.taxRate : 0)) / 100)}</strong>
                </div>
                <div className="grand-total-row">
                  <span>Grand Total</span>
                  <span>{money(selectedQuote.amount + ((selectedQuote.amount * (typeof docSettings?.taxRate === 'number' ? docSettings.taxRate : 0)) / 100))}</span>
                </div>
              </div>
            </div>

            {/* Footer Notes & Signatures */}
            <div className="tax-invoice-footer">
              <div>
                <p className="thank-you">Thank you for considering {docSettings?.garageName || "Garage Workspace"}!</p>
                <p className="warranty">This quotation is valid for {docSettings?.quotationValidityDays || 15} days from date of issue.</p>
              </div>
              {docSettings?.showSignatureLine !== false && (
                <div className="tax-invoice-signatures">
                  <div className="sig-block">
                    <div className="sig-line"></div>
                    <span>Service Advisor</span>
                  </div>
                  <div className="sig-block">
                    <div className="sig-line"></div>
                    <span>Customer Approval</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={!!deleteModalQuote}
        itemType="Quotation"
        itemId={deleteModalQuote?.id || ""}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModalQuote(null)}
        isDeleting={isDeleting}
      />
    </main>
  );
}

export default Quotations;
