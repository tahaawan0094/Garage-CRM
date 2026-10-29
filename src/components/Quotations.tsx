import { useEffect, useMemo, useState } from "react";
import { quotationsApi, invoicesApi, workOrdersApi } from "../lib/api";
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
  UserRound,
  Wrench,
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
const getYesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
};

const defaultSeedQuotes: Quote[] = [
  {
    id: "QT-00018",
    customer: "Vertexia Agency",
    vehicle: "BMV Series 5",
    year: "2023",
    plate: "1217",
    service: "Oil & Brake Service",
    detail: "Full synthetic oil change and front ceramic brake pads",
    status: "Pending",
    date: getTodayStr(),
    amount: 550,
    advisor: "Ali Hassan",
    items: [
      { name: "Engine Oil 5W-40 (4L)", quantity: 1, unitPrice: 155 },
      { name: "Oil Filter Bosch", quantity: 1, unitPrice: 55 },
      { name: "Front Brake Pads", quantity: 1, unitPrice: 240 },
      { name: "Labour - Oil & Brake Service", quantity: 1, unitPrice: 100 },
    ],
  },
  {
    id: "QT-00017",
    customer: "Sheikh Ahmed",
    vehicle: "Toyota Land Cruiser",
    year: "2024",
    plate: "8821",
    service: "Comprehensive Service",
    detail: "Periodic major service and multi-point safety check",
    status: "Approved",
    date: getYesterdayStr(),
    amount: 1250,
    advisor: "Ali Hassan",
    items: [
      { name: "Engine Oil 0W-20 (8L)", quantity: 2, unitPrice: 170 },
      { name: "Transmission Fluid", quantity: 1, unitPrice: 195 },
      { name: "Air & Cabin Filters", quantity: 2, unitPrice: 85 },
      { name: "Labour - Full Service", quantity: 1, unitPrice: 545 },
    ],
  },
  {
    id: "QT-00016",
    customer: "Hamad Al-Thani",
    vehicle: "Porsche Cayenne",
    year: "2022",
    plate: "3390",
    service: "AC System Overhaul",
    detail: "AC compressor replacement & system gas charging",
    status: "Awaiting Approval",
    date: getYesterdayStr(),
    amount: 2400,
    advisor: "M. Khan",
    items: [
      { name: "AC Compressor OEM", quantity: 1, unitPrice: 1800 },
      { name: "R134a Gas Refill", quantity: 1, unitPrice: 200 },
      { name: "Labour Charges", quantity: 1, unitPrice: 400 },
    ],
  },
];

const statusClass: Record<QuoteStatus, string> = {
  "Awaiting Approval": "awaiting",
  Approved: "approved",
  Draft: "draft",
  Rejected: "rejected",
  Expired: "expired",
  Pending: "awaiting",
};
const money = (value: number) => `QAR ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Quotations({
  notify,
  refreshTrigger,
  onSynced,
}: {
  notify: (message: string) => void;
  refreshTrigger?: number;
  onSynced?: () => void;
}) {
  const [quotes, setQuotes] = useState<Quote[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_QUOTES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return defaultSeedQuotes;
  });
  const [selectedId, setSelectedId] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [advisorFilter, setAdvisorFilter] = useState("All Service Advisors");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ type: 'all' });
  const [deleteModalQuote, setDeleteModalQuote] = useState<Quote | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAndMergeQuotations = () => {
    let localQuotes: Quote[] = [];
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_QUOTES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) localQuotes = parsed;
      }
    } catch {}
    if (localQuotes.length === 0) localQuotes = defaultSeedQuotes;

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

    // Sync approval/rejection to MongoDB Atlas
    if (decision === "Approved") {
      quotationsApi.approve(targetId).catch((err) => console.warn("Approve sync error:", err));

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
        advisor: target.advisor || 'Ali Hassan',
        date: new Date().toLocaleDateString('en-GB'),
        items: target.items || [],
        workOrder: target.id,
      }).then(() => {
        onSynced?.();
      }).catch(err => console.warn("Invoice auto-creation sync error:", err));

      workOrdersApi.update(target.id.replace('QT-', 'WO-'), { status: 'In Progress' }).catch(() => {
        workOrdersApi.create({
          workOrderId: target.id.replace('QT-', 'WO-'),
          customer: target.customer,
          vehicle: target.vehicle,
          plate: target.plate || 'TBD',
          year: target.year || '2024',
          service: target.service,
          detail: target.detail || '',
          mechanic: target.advisor || 'Ali Hassan',
          status: 'In Progress',
          total: target.amount || 0,
        }).catch(() => {});
      });

      notify(`Quotation ${targetId} approved! Invoice ${newInvId} created in Invoices.`);
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
              options={["All Service Advisors", "Ali Hassan", "M. Khan"]}
            />
          </div>
          <div className="quote-table-scroll">
            <table className="quote-management-table">
              <thead><tr><th>#</th><th>Quote No.</th><th>Customer</th><th>Vehicle</th><th>Service Type</th><th>Status</th><th>Created Date</th><th>Total (QAR)</th><th>Actions</th></tr></thead>
              <tbody>
                {pageQuotes.map((quote, index) => (
                  <tr key={quote.id} className={selectedQuote?.id === quote.id ? "selected" : ""} onClick={() => setSelectedId(quote.id)}>
                    <td>{(currentPage - 1) * 10 + index + 1}</td>
                    <td><button className="quote-id-link" onClick={(event) => { event.stopPropagation(); setSelectedId(quote.id); }}>{quote.id}</button></td>
                    <td>{quote.customer}</td>
                    <td><span className="quote-vehicle-cell"><CarFront size={25} /><span>{quote.vehicle}<small>{quote.year} · {quote.plate}</small></span></span></td>
                    <td>{quote.service}<small className="quote-muted-line">{quote.detail}</small></td>
                    <td><span className={`quote-status-badge ${statusClass[quote.status]}`}>{quote.status}</span></td>
                    <td>{quote.date}</td><td className="quote-amount">{money(quote.amount)}</td>                    <td>
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
          <aside className="quote-detail-card" aria-label={`Quotation details for ${selectedQuote.id}`}>
            <header><div><FileText size={16} /><strong>Quotation Details</strong></div><button onClick={() => notify("Quotation editing is not available in this frontend preview.")}><Pencil size={13} />Edit</button></header>
            <div className="quote-detail-number"><strong>{selectedQuote.id}</strong><span className={`quote-status-badge ${statusClass[selectedQuote.status]}`}>{selectedQuote.status}</span></div>
            <small className="quote-created-at">Created: {selectedQuote.date}, 10:30 AM</small>
            <section className="quote-detail-block">
              <h3><UserRound size={15} />Customer <button onClick={() => notify("Customer records are not available in this frontend preview.")}>View Customer</button></h3>
              <strong>{selectedQuote.customer}</strong><span>{selectedQuote.plate}</span><span>{selectedQuote.customer.toLowerCase().replaceAll(" ", ".")}@email.com</span>
            </section>
            <section className="quote-detail-block">
              <h3><CarFront size={16} />Vehicle</h3><strong>{selectedQuote.vehicle} - {selectedQuote.year}</strong><span>Plate: {selectedQuote.plate} · VIN: N/A</span>
            </section>
            <section className="quote-detail-block quote-service-info">
              <h3><Wrench size={15} />Service Information</h3><div><span>Service Type</span><strong>{selectedQuote.service}</strong><span>Description</span><strong>{selectedQuote.detail}</strong></div><div><span>Service Advisor</span><strong>{selectedQuote.advisor}</strong><span>Expected Delivery</span><strong>16 Apr 2025</strong></div>
            </section>
            <section className="quote-detail-items">
              <h3><FileText size={15} />Quotation Items ({selectedQuote.items.length} items)</h3>
              <div className="quote-detail-table-scroll"><table><thead><tr><th>#</th><th>Item / Service</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>
                {selectedQuote.items.map((item, index) => <tr key={`${selectedQuote.id}-${item.name}`}><td>{index + 1}</td><td>{item.name}</td><td>{item.quantity}</td><td>{money(item.unitPrice)}</td><td>{money(item.quantity * item.unitPrice)}</td></tr>)}
              </tbody></table></div>
              <div className="quote-detail-totals"><div><span>Subtotal</span><strong>{money(selectedQuote.amount)}</strong></div><div><span>VAT (5%)</span><strong>{money(0)}</strong></div><div><span>Discount (-)</span><strong className="negative">{money(0)}</strong></div><div className="grand"><strong>Grand Total</strong><strong>{money(selectedQuote.amount)}</strong></div></div>
            </section>
            <div className="quote-detail-actions">
              <button onClick={() => window.print()}><Printer size={14} />Reprint Quote</button>
              <button onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(`${window.location.origin}/#quote-${selectedQuote.id}`);
                }
                notify(`Quotation link for ${selectedQuote.id} copied.`);
              }}><Share2 size={14} />Share</button>
              <button
                style={{ borderColor: "#fecaca", background: "#fff1f2", color: "#e11d48", fontWeight: 600 }}
                onClick={() => setDeleteModalQuote(selectedQuote)}
              >
                <Trash2 size={13} />Delete Quote
              </button>
            </div>
            <div className="quote-decision-actions">
              <button className="approve" disabled={selectedQuote.status !== "Awaiting Approval" && selectedQuote.status !== "Pending"} onClick={() => decide("Approved")}><Check size={14} />Approve</button>
              <button className="reject" disabled={selectedQuote.status !== "Awaiting Approval" && selectedQuote.status !== "Pending"} onClick={() => decide("Rejected")}><X size={14} />Reject</button>
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
                <img
                  src={`${import.meta.env.BASE_URL}Garage-crm-logo-light.png`}
                  alt="Company Logo"
                  style={{ height: "46px", width: "auto", objectFit: "contain" }}
                />
                <div>
                  <h2>DOHA CENTRAL WORKSHOP</h2>
                  <p>Auto Care &amp; Service Hub · Bays 01–12 · Doha, Qatar</p>
                  <p>Phone: +974 5555 1234 · C.R: 84920/1</p>
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
                <div className="party-detail">Advisor: {selectedQuote.advisor || "Ali Hassan"}</div>
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
                  <th style={{ textAlign: "right", width: "25%" }}>Amount (QAR)</th>
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
                  <span>VAT (5%)</span>
                  <strong>{money(0)}</strong>
                </div>
                <div className="grand-total-row">
                  <span>Grand Total</span>
                  <span>{money(selectedQuote.amount)}</span>
                </div>
              </div>
            </div>

            {/* Footer Notes & Signatures */}
            <div className="tax-invoice-footer">
              <div>
                <p className="thank-you">Thank you for considering Garage Workspace!</p>
                <p className="warranty">This quotation is valid for 15 days from date of issue.</p>
              </div>
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
