import { useEffect, useMemo, useState } from "react";
import { partsApi } from "../lib/api";
import {
  Activity,
  AlertTriangle,
  Box,
  CalendarDays,
  Clock3,
  ChevronLeft,
  ChevronRight,
  Coins,
  Eye,
  FileText,
  Info,
  MoreVertical,
  Package,
  Plus,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";

type PartStatus = "In Stock" | "Low Stock" | "Out of Stock";
type PartActivity = { date: string; type: string; quantity: number; reference: string; notes: string };
type Part = {
  id: string;
  name: string;
  category: string;
  brand: string;
  quantity: number;
  lowStockAt: number;
  unitCost: number;
  sellingPrice: number;
  commission: number;
  lastUpdated: string;
  supplier: string;
  lastRestocked: string;
  activity: PartActivity[];
};

const sampleParts: Part[] = [];

const initialParts = sampleParts;
const partStatus = (part: Part): PartStatus => part.quantity === 0 ? "Out of Stock" : part.quantity <= part.lowStockAt ? "Low Stock" : "In Stock";
const statusClass: Record<PartStatus, string> = { "In Stock": "in-stock", "Low Stock": "low-stock", "Out of Stock": "out-of-stock" };
const money = (value: number) => `QAR ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const stockIconClass = (category: string) => category.toLowerCase().replaceAll(" ", "-");

function PartsInventory({ notify, onAdd, refreshTrigger }: { notify: (message: string) => void; onAdd: () => void; refreshTrigger?: number }) {
  const [parts, setParts] = useState(initialParts);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [stockFilter, setStockFilter] = useState("All Stock Status");
  const [brandFilter, setBrandFilter] = useState("All Brands");
  const [page, setPage] = useState(1);
  const [adjustment, setAdjustment] = useState("1");

  useEffect(() => {
    partsApi.getAll({ limit: 100 })
      .then((res) => {
        setParts(res.data || []);
      })
      .catch((err) => {
        console.warn("Could not fetch parts from backend:", err);
      });
  }, [refreshTrigger]);

  const filteredParts = useMemo(() => parts.filter((part) => {
    const matchesSearch = `${part.id} ${part.name} ${part.category} ${part.brand}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesCategory = categoryFilter === "All Categories" || part.category === categoryFilter;
    const matchesStock = stockFilter === "All Stock Status" || partStatus(part) === stockFilter;
    const matchesBrand = brandFilter === "All Brands" || part.brand === brandFilter;
    return matchesSearch && matchesCategory && matchesStock && matchesBrand;
  }), [parts, search, categoryFilter, stockFilter, brandFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredParts.length / 10));
  const currentPage = Math.min(page, pageCount);
  const pageParts = filteredParts.slice((currentPage - 1) * 10, currentPage * 10);
  const selectedPart = filteredParts.find((part) => part.id === selectedId) ?? filteredParts[0] ?? parts.find((part) => part.id === selectedId);
  const updateStock = (direction: 1 | -1) => {
    if (!selectedPart) return;
    const amount = Number(adjustment);
    if (!Number.isInteger(amount) || amount < 1) {
      notify("Enter a whole-number stock adjustment greater than zero.");
      return;
    }
    if (direction < 0 && amount > selectedPart.quantity) {
      notify("Stock adjustment cannot reduce inventory below zero.");
      return;
    }
    setParts((current) => current.map((part) => part.id === selectedPart.id ? {
      ...part,
      quantity: part.quantity + direction * amount,
      lastUpdated: "14 Apr 2025",
      activity: [{ date: "14 Apr 2025", type: "Adjusted", quantity: direction * amount, reference: "ADJ-0016", notes: direction > 0 ? "Stock received" : "Stock adjustment" }, ...part.activity.slice(0, 4)],
    } : part));

    // Sync adjustment to MongoDB Atlas
    partsApi.adjustStock(selectedPart.id, {
      type: "Adjusted",
      quantity: direction * amount,
      reference: "ADJ-0016",
      notes: direction > 0 ? "Stock received" : "Stock adjustment",
    }).catch((err) => {
      console.warn("Stock sync error:", err);
    });

    notify(`${selectedPart.name} stock ${direction > 0 ? "increased" : "reduced"} by ${amount}.`);
  };
  const viewHistory = () => selectedPart && notify(`Showing the latest ${selectedPart.activity.length} inventory movements for ${selectedPart.name}.`);

  return (
    <main className="parts-management">
      <header className="parts-page-heading">
        <div className="parts-page-title"><span><Box size={27} /></span><div><h1>Parts Inventory</h1><p>Manage stock, track movement, and monitor parts commissions.</p></div></div>
        <button className="parts-create-button" onClick={onAdd}><Plus size={18} />Add Part</button>
      </header>
      <section className="parts-metrics" aria-label="Inventory summary">
        <article><span className="parts-metric-icon blue"><Box size={21} /></span><div><strong>{parts.length}</strong><small>Total Parts</small></div><Activity size={23} className="parts-spark blue-text" /></article>
        <article><span className="parts-metric-icon red"><AlertTriangle size={20} /></span><div><strong>{parts.filter((p) => partStatus(p) === "Low Stock").length}</strong><small>Low Stock Items</small></div><Activity size={23} className="parts-spark red-text" /></article>
        <article><span className="parts-metric-icon green"><ShoppingCart size={20} /></span><div><strong>0</strong><small>Parts Sold This Month</small></div><Activity size={23} className="parts-spark green-text" /></article>
        <article><span className="parts-metric-icon purple"><Coins size={20} /></span><div><strong>{money(0)}</strong><small>Commission Earned</small></div><Activity size={23} className="parts-spark purple-text" /></article>
      </section>
      <div className="parts-policy-note"><Info size={17} /><span>Parts sales at the same price are excluded from revenue; only commission earned on eligible parts is counted.</span></div>
      <div className="parts-management-layout">
        <section className="parts-list-card">
          <div className="parts-filters">
            <label className="parts-search"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search by part name, part ID, category, brand..." aria-label="Search parts inventory" /></label>
            <select value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setPage(1); }} aria-label="Filter by part category">{["All Categories", "Engine Oil", "Brakes", "Filters", "Ignition", "Electrical", "Body", "Engine", "Fluids"].map((category) => <option key={category}>{category}</option>)}</select>
            <select value={stockFilter} onChange={(event) => { setStockFilter(event.target.value); setPage(1); }} aria-label="Filter by stock status">{["All Stock Status", "In Stock", "Low Stock", "Out of Stock"].map((status) => <option key={status}>{status}</option>)}</select>
            <select value={brandFilter} onChange={(event) => { setBrandFilter(event.target.value); setPage(1); }} aria-label="Filter by brand">{["All Brands", "Mobil", "Toyota", "Mann", "NGK", "Varta", "Bosch", "Brembo", "Gates", "Castrol"].map((brand) => <option key={brand}>{brand}</option>)}</select>
            <label className="parts-date-filter"><CalendarDays size={15} /><span>Last Updated (All Dates)</span></label>
          </div>
          <div className="parts-table-scroll">
            <table className="parts-management-table">
              <thead><tr><th>#</th><th>Part ID</th><th>Part Name</th><th>Category</th><th>Brand</th><th>Stock Qty</th><th>Unit Cost</th><th>Selling Price</th><th>Commission</th><th>Last Updated</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {pageParts.map((part, index) => (
                  <tr key={part.id} className={selectedPart?.id === part.id ? "selected" : ""} onClick={() => setSelectedId(part.id)}>
                    <td>{(currentPage - 1) * 10 + index + 1}</td>
                    <td><button className="parts-id-link" onClick={(event) => { event.stopPropagation(); setSelectedId(part.id); }}>{part.id}</button></td>
                    <td><span className={`parts-product-cell ${stockIconClass(part.category)}`}><Package size={27} /><span>{part.name}</span></span></td>
                    <td>{part.category}</td><td>{part.brand}</td><td className={part.quantity <= part.lowStockAt ? "parts-low-quantity" : ""}>{part.quantity}</td>
                    <td>{money(part.unitCost)}</td><td>{money(part.sellingPrice)}</td><td className="parts-commission">{money(part.commission)}</td><td>{part.lastUpdated}</td>
                    <td><span className={`parts-status-badge ${statusClass[partStatus(part)]}`}>{partStatus(part)}</span></td>
                    <td><button className="parts-row-action" aria-label={`View ${part.id}`} onClick={(event) => { event.stopPropagation(); setSelectedId(part.id); }}><Eye size={15} /></button><button className="parts-row-action" aria-label={`More actions for ${part.id}`} onClick={(event) => { event.stopPropagation(); notify(`More actions for ${part.id} are not available in this frontend preview.`); }}><MoreVertical size={15} /></button></td>
                  </tr>
                ))}
                {filteredParts.length === 0 && <tr><td colSpan={12} className="parts-empty">No parts match the selected filters.</td></tr>}
              </tbody>
            </table>
          </div>
          <footer className="parts-table-footer"><span>Showing {filteredParts.length ? (currentPage - 1) * 10 + 1 : 0} to {Math.min(currentPage * 10, filteredParts.length)} of {filteredParts.length} parts</span><div><button aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => pageNumber <= 5 || pageNumber === pageCount || Math.abs(pageNumber - currentPage) <= 1 ? <button key={pageNumber} className={currentPage === pageNumber ? "active" : ""} aria-label={`Page ${pageNumber}`} aria-current={currentPage === pageNumber ? "page" : undefined} onClick={() => setPage(pageNumber)}>{pageNumber}</button> : pageNumber === 6 || pageNumber === pageCount - 1 ? <span key={pageNumber}>…</span> : null)}<button aria-label="Next page" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></button></div></footer>
        </section>
        {selectedPart && (
          <aside className="parts-detail-card" aria-label={`Part details for ${selectedPart.id}`}>
            <header><div><FileText size={16} /><strong>Part Details</strong></div><button onClick={() => notify("Part editing is not available in this frontend preview.")}>Edit</button></header>
            <div className="parts-detail-heading"><strong>{selectedPart.name}</strong><span className={`parts-status-badge ${statusClass[partStatus(selectedPart)]}`}>{partStatus(selectedPart)}</span></div>
            <div className="parts-detail-overview">
              <span className={`parts-large-product ${stockIconClass(selectedPart.category)}`}><Package size={72} strokeWidth={1.5} /></span>
              <div><span>Part ID:<strong>{selectedPart.id}</strong></span><span>Category:<strong>{selectedPart.category}</strong></span><span>Brand:<strong>{selectedPart.brand}</strong></span><span>Stock Qty:<strong>{selectedPart.quantity}</strong></span><span>Unit Cost:<strong>{money(selectedPart.unitCost)}</strong></span><span>Selling Price:<strong>{money(selectedPart.sellingPrice)}</strong></span><span>Commission Eligible:<strong>{selectedPart.commission > 0 ? "Yes" : "No"}</strong></span><span>Commission Amount:<strong>{money(selectedPart.commission)}</strong></span><span>Supplier:<strong>{selectedPart.supplier}</strong></span><span>Last Restocked:<strong>{selectedPart.lastRestocked}</strong></span></div>
            </div>
            <div className="parts-policy-detail"><Info size={17} /><span><strong>Regular parts sales are excluded from revenue.</strong><br />Only commission earned on eligible parts is included.</span></div>
            <section className="parts-activity">
              <h3><Clock3 size={15} />Recent Activity<button onClick={viewHistory}>View All</button></h3>
              <div className="parts-activity-scroll"><table><thead><tr><th>Date</th><th>Type</th><th>Qty</th><th>Reference</th><th>Notes</th></tr></thead><tbody>{selectedPart.activity.map((record, index) => <tr key={`${selectedPart.id}-${record.date}-${index}`}><td>{record.date}</td><td>{record.type}</td><td>{record.quantity}</td><td>{record.reference}</td><td>{record.notes}</td></tr>)}</tbody></table></div>
            </section>
            <div className="parts-stock-adjust">
              <label htmlFor="stock-adjustment">Adjustment Qty</label>
              <input id="stock-adjustment" aria-label="Stock adjustment quantity" type="number" min="1" step="1" value={adjustment} onChange={(event) => setAdjustment(event.target.value)} />
              <button aria-label="Reduce stock" onClick={() => updateStock(-1)} disabled={selectedPart.quantity === 0}><SlidersHorizontal size={14} />Reduce</button>
              <button className="add-stock" aria-label="Add stock" onClick={() => updateStock(1)}><Plus size={14} />Add</button>
            </div>
            <div className="parts-detail-actions"><button onClick={viewHistory}><Clock3 size={14} />View Stock History</button><button onClick={() => updateStock(1)}><Wrench size={14} />Adjust Stock</button></div>
          </aside>
        )}
      </div>
    </main>
  );
}

export default PartsInventory;
