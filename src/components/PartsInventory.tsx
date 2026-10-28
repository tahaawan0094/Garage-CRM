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
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import AddPartModal from "./AddPartModal";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

type PartStatus = "In Stock" | "Low Stock" | "Out of Stock";
type PartActivity = { date: string; type: string; quantity: number; reference: string; notes: string };
type Part = {
  id: string;
  partId?: string;
  name: string;
  category: string;
  brand: string;
  compatibility?: string;
  partNumber?: string;
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

  // Row 3-dots action menu & modals
  const [activeMenuPartId, setActiveMenuPartId] = useState<string | null>(null);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [deletingPart, setDeletingPart] = useState<Part | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    partsApi.getAll({ limit: 100 })
      .then((res) => {
        setParts(res.data || []);
      })
      .catch((err) => {
        console.warn("Could not fetch parts from backend:", err);
      });
  }, [refreshTrigger]);

  // Close 3-dots dropdown on clicking outside
  useEffect(() => {
    if (!activeMenuPartId) return;
    const handleOutsideClick = () => setActiveMenuPartId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [activeMenuPartId]);

  const filteredParts = useMemo(() => parts.filter((part) => {
    const matchesSearch = `${part.id || ''} ${part.partId || ''} ${part.name || ''} ${part.category || ''} ${part.brand || ''} ${part.compatibility || ''} ${part.partNumber || ''}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesCategory = categoryFilter === "All Categories" || part.category === categoryFilter;
    const matchesStock = stockFilter === "All Stock Status" || partStatus(part) === stockFilter;
    const matchesBrand = brandFilter === "All Brands" || part.brand === brandFilter;
    return matchesSearch && matchesCategory && matchesStock && matchesBrand;
  }), [parts, search, categoryFilter, stockFilter, brandFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredParts.length / 10));
  const currentPage = Math.min(page, pageCount);
  const pageParts = filteredParts.slice((currentPage - 1) * 10, currentPage * 10);
  const selectedPart = filteredParts.find((part) => part.id === selectedId) ?? filteredParts[0] ?? parts.find((part) => part.id === selectedId);

  const viewHistory = () => selectedPart && notify(`Showing the latest ${selectedPart.activity.length} inventory movements for ${selectedPart.name}.`);

  // Handle Edit Part Save
  const handleSaveEditPart = async (partData: any) => {
    if (!editingPart) return;
    try {
      const targetId = editingPart.id || editingPart.partId || "";
      const res = await partsApi.update(targetId, partData);
      const updated = res.data || { ...editingPart, ...partData };
      setParts((prev) => prev.map((p) => (p.id === editingPart.id ? { ...p, ...updated } : p)));
      notify(`${partData.name || editingPart.name} updated successfully.`);
      setEditingPart(null);
    } catch (err: any) {
      console.error("Failed to update part:", err);
      notify(err.message || "Failed to update part details.");
    }
  };

  // Handle Delete Part Confirm
  const handleConfirmDelete = async () => {
    if (!deletingPart) return;
    setIsDeleting(true);
    try {
      const targetId = deletingPart.id || deletingPart.partId || "";
      await partsApi.delete(targetId);
      setParts((prev) => prev.filter((p) => p.id !== deletingPart.id));
      if (selectedId === deletingPart.id) {
        setSelectedId("");
      }
      notify(`${deletingPart.name} removed from inventory.`);
      setDeletingPart(null);
    } catch (err: any) {
      console.error("Failed to delete part:", err);
      notify(err.message || "Failed to delete part.");
    } finally {
      setIsDeleting(false);
    }
  };

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
            <label className="parts-search"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search by part name, part ID, category, brand, compatibility..." aria-label="Search parts inventory" /></label>
            <select value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setPage(1); }} aria-label="Filter by part category">{["All Categories", "Engine Oil", "Brakes", "Filters", "Ignition", "Electrical", "Suspension", "Cooling", "Engine", "Transmission", "Body", "Fluids", "Other"].map((category) => <option key={category}>{category}</option>)}</select>
            <select value={stockFilter} onChange={(event) => { setStockFilter(event.target.value); setPage(1); }} aria-label="Filter by stock status">{["All Stock Status", "In Stock", "Low Stock", "Out of Stock"].map((status) => <option key={status}>{status}</option>)}</select>
            <select value={brandFilter} onChange={(event) => { setBrandFilter(event.target.value); setPage(1); }} aria-label="Filter by brand">{["All Brands", "Toyota Genuine", "Mobil 1", "Castrol", "Bosch", "Brembo", "Mann-Filter", "NGK", "Denso", "Gates", "Varta", "KYB", "SKF", "555 Japan", "Liqui Moly", "Motul", "OEM Genuine", "Aftermarket"].map((brand) => <option key={brand}>{brand}</option>)}</select>
            <label className="parts-date-filter"><CalendarDays size={15} /><span>Last Updated (All Dates)</span></label>
          </div>
          <div className="parts-table-scroll">
            <table className="parts-management-table">
              <thead><tr><th>#</th><th>Part ID</th><th>Part Name</th><th>Category</th><th>Brand</th><th>Stock Qty</th><th>Unit Cost</th><th>Selling Price</th><th>Commission</th><th>Last Updated</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {pageParts.map((part, index) => (
                  <tr key={part.id || part.partId} className={selectedPart?.id === part.id ? "selected" : ""} onClick={() => setSelectedId(part.id || part.partId || '')}>
                    <td>{(currentPage - 1) * 10 + index + 1}</td>
                    <td><button className="parts-id-link" onClick={(event) => { event.stopPropagation(); setSelectedId(part.id || part.partId || ''); }}>{part.partId || part.id}</button></td>
                    <td><span className={`parts-product-cell ${stockIconClass(part.category)}`}><Package size={27} /><span>{part.name}</span></span></td>
                    <td>{part.category}</td><td>{part.brand}</td><td className={part.quantity <= part.lowStockAt ? "parts-low-quantity" : ""}>{part.quantity}</td>
                    <td>{money(part.unitCost)}</td><td>{money(part.sellingPrice)}</td><td className="parts-commission">{money(part.commission)}</td><td>{part.lastUpdated}</td>
                    <td><span className={`parts-status-badge ${statusClass[partStatus(part)]}`}>{partStatus(part)}</span></td>
                    <td>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <button
                          type="button"
                          className="parts-row-action"
                          aria-label={`View ${part.id || part.partId}`}
                          title="View Details"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedId(part.id || part.partId || '');
                          }}
                        >
                          <Eye size={15} />
                        </button>
                        <div style={{ position: "relative", display: "inline-block" }}>
                          <button
                            type="button"
                            className={`parts-row-action ${activeMenuPartId === part.id ? "active" : ""}`}
                            aria-label={`Actions for ${part.name}`}
                            title="More Actions"
                            onClick={(event) => {
                              event.stopPropagation();
                              setActiveMenuPartId(activeMenuPartId === part.id ? null : part.id);
                            }}
                          >
                            <MoreVertical size={15} />
                          </button>
                          {activeMenuPartId === part.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: "absolute",
                                right: 0,
                                top: "calc(100% + 4px)",
                                zIndex: 999,
                                minWidth: "135px",
                                background: "#ffffff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                                boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.18), 0 4px 6px -2px rgba(15, 23, 42, 0.06)",
                                padding: "4px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "2px",
                              }}
                            >
                              <button
                                type="button"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  width: "100%",
                                  padding: "7px 10px",
                                  border: 0,
                                  background: "transparent",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  color: "#1e293b",
                                  cursor: "pointer",
                                  textAlign: "left",
                                  transition: "background 0.15s ease",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                onClick={() => {
                                  setActiveMenuPartId(null);
                                  setEditingPart(part);
                                }}
                              >
                                <Pencil size={13} style={{ color: "#0284c7" }} />
                                <span>Edit Part</span>
                              </button>
                              <button
                                type="button"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  width: "100%",
                                  padding: "7px 10px",
                                  border: 0,
                                  background: "transparent",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  color: "#e11d48",
                                  cursor: "pointer",
                                  textAlign: "left",
                                  transition: "background 0.15s ease",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#fff1f2")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                onClick={() => {
                                  setActiveMenuPartId(null);
                                  setDeletingPart(part);
                                }}
                              >
                                <Trash2 size={13} style={{ color: "#e11d48" }} />
                                <span>Delete Part</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredParts.length === 0 && <tr><td colSpan={12} className="parts-empty">No parts match the selected filters.</td></tr>}
              </tbody>
            </table>
          </div>
          <footer className="parts-table-footer"><span>Showing {filteredParts.length ? (currentPage - 1) * 10 + 1 : 0} to {Math.min(currentPage * 10, filteredParts.length)} of {filteredParts.length} parts</span><div><button aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => pageNumber <= 5 || pageNumber === pageCount || Math.abs(pageNumber - currentPage) <= 1 ? <button key={pageNumber} className={currentPage === pageNumber ? "active" : ""} aria-label={`Page ${pageNumber}`} aria-current={currentPage === pageNumber ? "page" : undefined} onClick={() => setPage(pageNumber)}>{pageNumber}</button> : pageNumber === 6 || pageNumber === pageCount - 1 ? <span key={pageNumber}>…</span> : null)}<button aria-label="Next page" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></button></div></footer>
        </section>
        {selectedPart && (
          <aside className="parts-detail-card" aria-label={`Part details for ${selectedPart.id || selectedPart.partId}`}>
            <header>
              <div><FileText size={16} /><strong>Part Details</strong></div>
              <button
                type="button"
                onClick={() => setEditingPart(selectedPart)}
                style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                <Pencil size={11} />
                <span>Edit</span>
              </button>
            </header>
            <div className="parts-detail-heading"><strong>{selectedPart.name}</strong><span className={`parts-status-badge ${statusClass[partStatus(selectedPart)]}`}>{partStatus(selectedPart)}</span></div>
            <div className="parts-detail-overview">
              <span className={`parts-large-product ${stockIconClass(selectedPart.category)}`}><Package size={72} strokeWidth={1.5} /></span>
              <div>
                <span>Part ID:<strong>{selectedPart.partId || selectedPart.id}</strong></span>
                {selectedPart.partNumber && <span>OEM / Part #:<strong>{selectedPart.partNumber}</strong></span>}
                <span>Category:<strong>{selectedPart.category}</strong></span>
                <span>Brand:<strong>{selectedPart.brand}</strong></span>
                {selectedPart.compatibility && <span>Compatibility:<strong>{selectedPart.compatibility}</strong></span>}
                <span>Stock Qty:<strong>{selectedPart.quantity}</strong></span>
                <span>Low Stock Alert:<strong>{selectedPart.lowStockAt}</strong></span>
                <span>Unit Cost:<strong>{money(selectedPart.unitCost)}</strong></span>
                <span>Selling Price:<strong>{money(selectedPart.sellingPrice)}</strong></span>
                <span>Commission Eligible:<strong>{selectedPart.commission > 0 ? "Yes" : "No"}</strong></span>
                <span>Commission Amount:<strong>{money(selectedPart.commission)}</strong></span>
                <span>Supplier:<strong>{selectedPart.supplier}</strong></span>
                <span>Last Restocked:<strong>{selectedPart.lastRestocked}</strong></span>
              </div>
            </div>
            <div className="parts-policy-detail"><Info size={17} /><span><strong>Regular parts sales are excluded from revenue.</strong><br />Only commission earned on eligible parts is included.</span></div>
            <section className="parts-activity">
              <h3><Clock3 size={15} />Recent Activity<button onClick={viewHistory}>View All</button></h3>
              <div className="parts-activity-scroll"><table><thead><tr><th>Date</th><th>Type</th><th>Qty</th><th>Reference</th><th>Notes</th></tr></thead><tbody>{selectedPart.activity.map((record, index) => <tr key={`${selectedPart.id}-${record.date}-${index}`}><td>{record.date}</td><td>{record.type}</td><td>{record.quantity}</td><td>{record.reference}</td><td>{record.notes}</td></tr>)}</tbody></table></div>
            </section>
            <div className="parts-detail-actions" style={{ gridTemplateColumns: "1fr 1fr 1fr", marginTop: "10px" }}>
              <button type="button" onClick={viewHistory} title="View movement log"><Clock3 size={13} />History</button>
              <button
                type="button"
                onClick={() => setEditingPart(selectedPart)}
                title="Edit this part"
                style={{ color: "#0284c7" }}
              >
                <Pencil size={13} />Edit Part
              </button>
              <button
                type="button"
                onClick={() => setDeletingPart(selectedPart)}
                title="Delete this part"
                style={{ borderColor: "#fecaca", background: "#fff1f2", color: "#e11d48", fontWeight: 600 }}
              >
                <Trash2 size={13} />Delete
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Edit Part Modal */}
      {editingPart && (
        <AddPartModal
          isOpen={Boolean(editingPart)}
          onClose={() => setEditingPart(null)}
          onSave={handleSaveEditPart}
          notify={notify}
          initialData={editingPart}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deletingPart)}
        itemId={deletingPart?.partId || deletingPart?.id || ""}
        itemType="Part"
        title={`Delete ${deletingPart?.name}?`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingPart(null)}
        isDeleting={isDeleting}
      />
    </main>
  );
}

export default PartsInventory;

