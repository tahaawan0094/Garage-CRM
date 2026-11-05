import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { partsApi } from "../lib/api";
import { CustomDropdown } from "./CustomDropdown";
import {
  Activity,
  AlertTriangle,
  Box,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Coins,
  Eye,
  Info,
  Layers,
  Minus,
  MoreVertical,
  Package,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import AddPartModal from "./AddPartModal";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { PartDetailsModal } from "./PartDetailsModal";

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

const LOCAL_STORAGE_PARTS_KEY = "garage_crm_parts_inventory_v1";

function PartsInventory({ notify, onAdd, refreshTrigger }: { notify: (message: string) => void; onAdd: () => void; refreshTrigger?: number }) {
  const [parts, setParts] = useState<Part[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_PARTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return initialParts;
  });
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [stockFilter, setStockFilter] = useState("All Stock Status");
  const [brandFilter, setBrandFilter] = useState("All Brands");
  const [page, setPage] = useState(1);

  // Sync parts to localStorage & notify other components
  useEffect(() => {
    if (parts.length > 0) {
      try {
        localStorage.setItem(LOCAL_STORAGE_PARTS_KEY, JSON.stringify(parts));
        window.dispatchEvent(new CustomEvent("garage_parts_updated"));
      } catch (e) {
        console.warn("Could not persist parts to localStorage:", e);
      }
    }
  }, [parts]);

  // Row 3-dots action menu & modals
  const [menuTarget, setMenuTarget] = useState<{ part: Part; top: number; left: number } | null>(null);
  const [viewingPart, setViewingPart] = useState<Part | null>(null);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [deletingPart, setDeletingPart] = useState<Part | null>(null);
  const [adjustingPart, setAdjustingPart] = useState<Part | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>("Stock arrival / manual count adjustment");
  const [isAdjusting, setIsAdjusting] = useState<boolean>(false);
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
      if (viewingPart?.id === deletingPart.id) {
        setViewingPart(null);
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

  // Handle Quick Stock Adjustment Save
  const handleSaveStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingPart) return;
    setIsAdjusting(true);
    try {
      const targetId = adjustingPart.id || adjustingPart.partId || "";
      const newQty = Math.max(0, Number(adjustmentQty) || 0);
      const diff = newQty - adjustingPart.quantity;
      const activityEntry: PartActivity = {
        date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        type: diff >= 0 ? "Stock Added" : "Stock Reduced",
        quantity: Math.abs(diff),
        reference: "Manual Adjustment",
        notes: adjustmentReason.trim() || "Stock count adjustment",
      };
      const updatedActivities = [activityEntry, ...(adjustingPart.activity || [])];
      const res = await partsApi.update(targetId, {
        quantity: newQty,
        activity: updatedActivities,
        lastUpdated: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      });
      const updated = res.data || { ...adjustingPart, quantity: newQty, activity: updatedActivities };
      setParts((prev) => prev.map((p) => (p.id === adjustingPart.id ? { ...p, ...updated } : p)));
      notify(`Stock for ${adjustingPart.name} adjusted to ${newQty} units.`);
      setAdjustingPart(null);
    } catch (err: any) {
      console.error("Failed to adjust stock:", err);
      notify(err.message || "Failed to adjust stock.");
    } finally {
      setIsAdjusting(false);
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
            <CustomDropdown
              value={categoryFilter}
              onChange={(val) => { setCategoryFilter(val); setPage(1); }}
              ariaLabel="Filter by part category"
              options={["All Categories", "Engine Oil", "Brakes", "Filters", "Ignition", "Electrical", "Suspension", "Cooling", "Engine", "Transmission", "Body", "Fluids", "Other"]}
            />
            <CustomDropdown
              value={stockFilter}
              onChange={(val) => { setStockFilter(val); setPage(1); }}
              ariaLabel="Filter by stock status"
              options={[
                { value: "All Stock Status", label: "All Stock Status" },
                { value: "In Stock", label: "In Stock", badge: "Available", badgeColor: "green" },
                { value: "Low Stock", label: "Low Stock", badge: "Low", badgeColor: "orange" },
                { value: "Out of Stock", label: "Out of Stock", badge: "Empty", badgeColor: "red" },
              ]}
            />
            <CustomDropdown
              value={brandFilter}
              onChange={(val) => { setBrandFilter(val); setPage(1); }}
              ariaLabel="Filter by brand"
              options={["All Brands", "Toyota Genuine", "Mobil 1", "Castrol", "Bosch", "Brembo", "Mann-Filter", "NGK", "Denso", "Gates", "Varta", "KYB", "SKF", "555 Japan", "Liqui Moly", "Motul", "OEM Genuine", "Aftermarket"]}
            />
            <label className="parts-date-filter"><CalendarDays size={15} /><span>Last Updated (All Dates)</span></label>
          </div>
          <div className="parts-table-scroll">
            <table className="parts-management-table">
              <thead><tr><th>#</th><th>Part ID</th><th>Part Name</th><th>Category</th><th>Brand</th><th>Stock Qty</th><th>Unit Cost</th><th>Selling Price</th><th>Commission</th><th>Last Updated</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {pageParts.map((part, index) => (
                  <tr key={part.id || part.partId} className={viewingPart?.id === part.id ? "selected" : ""} onClick={() => setViewingPart(part)} style={{ cursor: "pointer" }}>
                    <td>{(currentPage - 1) * 10 + index + 1}</td>
                    <td><button className="parts-id-link" onClick={(event) => { event.stopPropagation(); setViewingPart(part); }}>{part.partId || part.id}</button></td>
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
                            setViewingPart(part);
                          }}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          className={`parts-row-action ${menuTarget?.part.id === part.id ? "active" : ""}`}
                          aria-label={`Actions for ${part.name}`}
                          title="More Actions"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (menuTarget?.part.id === part.id) {
                              setMenuTarget(null);
                            } else {
                              const rect = event.currentTarget.getBoundingClientRect();
                              const menuHeight = 180;
                              const spaceBelow = window.innerHeight - rect.bottom;
                              const top = spaceBelow < menuHeight ? rect.top - menuHeight - 4 : rect.bottom + 4;
                              const left = Math.max(10, rect.right - 170);
                              setMenuTarget({ part, top, left });
                            }
                          }}
                        >
                          <MoreVertical size={15} />
                        </button>
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
      </div>

      {/* Part Details Modal */}
      <PartDetailsModal
        isOpen={Boolean(viewingPart)}
        part={viewingPart}
        onClose={() => setViewingPart(null)}
        onEdit={(partToEdit: any) => {
          setViewingPart(null);
          setEditingPart(partToEdit);
        }}
        onDelete={(partToDelete: any) => {
          setViewingPart(null);
          setDeletingPart(partToDelete);
        }}
      />

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

      {/* 3-Dots Floating Action Portal (Never Clipped by Table Scroll) */}
      {menuTarget &&
        createPortal(
          <>
            <div
              style={{ position: "fixed", inset: 0, zIndex: 99998, background: "transparent" }}
              onClick={() => setMenuTarget(null)}
            />
            <div
              style={{
                position: "fixed",
                top: `${menuTarget.top}px`,
                left: `${menuTarget.left}px`,
                zIndex: 99999,
                minWidth: "170px",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                boxShadow: "0 12px 30px -4px rgba(15, 23, 42, 0.22), 0 4px 8px -2px rgba(15, 23, 42, 0.08)",
                padding: "5px",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "8px 10px",
                  border: 0,
                  background: "transparent",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#ea580c",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#fff7ed")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                onClick={() => {
                  const p = menuTarget.part;
                  setMenuTarget(null);
                  setViewingPart(p);
                }}
              >
                <Eye size={14} style={{ color: "#ea580c" }} />
                <span>View Details</span>
              </button>

              <button
                type="button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "8px 10px",
                  border: 0,
                  background: "transparent",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#0284c7",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f9ff")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                onClick={() => {
                  const p = menuTarget.part;
                  setMenuTarget(null);
                  setEditingPart(p);
                }}
              >
                <Pencil size={14} style={{ color: "#0284c7" }} />
                <span>Edit Part</span>
              </button>

              <button
                type="button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "8px 10px",
                  border: 0,
                  background: "transparent",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#059669",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#ecfdf5")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                onClick={() => {
                  const p = menuTarget.part;
                  setMenuTarget(null);
                  setAdjustingPart(p);
                  setAdjustmentQty(p.quantity);
                  setAdjustmentReason("Stock arrival / manual count adjustment");
                }}
              >
                <Layers size={14} style={{ color: "#059669" }} />
                <span>Adjust Stock (+ / -)</span>
              </button>

              <div style={{ height: "1px", background: "#f1f5f9", margin: "2px 0" }} />

              <button
                type="button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "8px 10px",
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
                  const p = menuTarget.part;
                  setMenuTarget(null);
                  setDeletingPart(p);
                }}
              >
                <Trash2 size={14} style={{ color: "#e11d48" }} />
                <span>Delete Part</span>
              </button>
            </div>
          </>,
          document.body
        )}

      {/* Quick Stock Adjustment Modal */}
      {adjustingPart &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(15, 23, 42, 0.65)",
              backdropFilter: "blur(4px)",
              padding: "16px",
            }}
            onClick={() => setAdjustingPart(null)}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "460px",
                background: "#ffffff",
                borderRadius: "16px",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                overflow: "hidden",
                border: "1px solid #e2e8f0",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  padding: "16px 20px",
                  background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: "#ecfdf5",
                      color: "#059669",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid #a7f3d0",
                    }}
                  >
                    <Layers size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                      Adjust Stock Level
                    </h3>
                    <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>
                      {adjustingPart.name} ({adjustingPart.partId || adjustingPart.id})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAdjustingPart(null)}
                  style={{
                    background: "transparent",
                    border: 0,
                    cursor: "pointer",
                    color: "#94a3b8",
                    padding: "4px",
                    borderRadius: "6px",
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveStockAdjustment} style={{ padding: "20px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    background: "#f8fafc",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>
                      Current In-Stock Quantity
                    </span>
                    <strong style={{ fontSize: "16px", color: "#0f172a" }}>
                      {adjustingPart.quantity} units
                    </strong>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>
                      Low Stock Threshold
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#eab308" }}>
                      {adjustingPart.lowStockAt} units
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#334155",
                      marginBottom: "6px",
                    }}
                  >
                    New Stock Quantity *
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setAdjustmentQty((q) => Math.max(0, Number(q) - 1))}
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        background: "#f8fafc",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "#334155",
                      }}
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      min={0}
                      required
                      value={adjustmentQty}
                      onChange={(e) => setAdjustmentQty(Math.max(0, parseInt(e.target.value) || 0))}
                      style={{
                        flex: 1,
                        height: "42px",
                        textAlign: "center",
                        fontSize: "16px",
                        fontWeight: 700,
                        color: "#0f172a",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        outline: "none",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setAdjustmentQty((q) => Number(q) + 1)}
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        background: "#f8fafc",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "#334155",
                      }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Quick Increment Chips */}
                  <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                    {[+1, +5, +10, +25].map((delta) => (
                      <button
                        key={delta}
                        type="button"
                        onClick={() => setAdjustmentQty((q) => Number(q) + delta)}
                        style={{
                          flex: 1,
                          padding: "5px 0",
                          borderRadius: "6px",
                          border: "1px solid #e2e8f0",
                          background: "#ffffff",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "#0284c7",
                          cursor: "pointer",
                        }}
                      >
                        +{delta}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#334155",
                      marginBottom: "6px",
                    }}
                  >
                    Reason / Notes
                  </label>
                  <input
                    type="text"
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    placeholder="e.g. New stock delivery, audit discrepancy, damaged..."
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      height: "38px",
                      padding: "0 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12px",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => setAdjustingPart(null)}
                    style={{
                      padding: "9px 16px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#475569",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAdjusting}
                    style={{
                      padding: "9px 20px",
                      borderRadius: "8px",
                      border: 0,
                      background: "#059669",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#ffffff",
                      cursor: "pointer",
                      boxShadow: "0 4px 6px -1px rgba(5, 150, 105, 0.25)",
                    }}
                  >
                    {isAdjusting ? "Updating..." : "Confirm Stock Adjustment"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </main>
  );
}

export default PartsInventory;

