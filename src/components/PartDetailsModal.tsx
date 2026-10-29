import React from "react";
import {
  X,
  Package,
  Pencil,
  Trash2,
  Clock3,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Tag,
  Building,
  Layers,
  Percent,
} from "lucide-react";

export interface PartActivity {
  date: string;
  type: string;
  quantity: number;
  reference: string;
  notes: string;
}

export interface PartDetailsData {
  id?: string;
  partId?: string;
  name: string;
  partNumber?: string;
  category: string;
  brand: string;
  compatibility?: string;
  quantity: number;
  lowStockAt: number;
  unitCost: number;
  sellingPrice: number;
  commission: number;
  supplier: string;
  lastRestocked: string;
  activity: PartActivity[];
}

interface PartDetailsModalProps {
  isOpen: boolean;
  part: PartDetailsData | null;
  onClose: () => void;
  onEdit: (part: PartDetailsData) => void;
  onDelete: (part: PartDetailsData) => void;
}

export const PartDetailsModal: React.FC<PartDetailsModalProps> = ({
  isOpen,
  part,
  onClose,
  onEdit,
  onDelete,
}) => {
  if (!isOpen || !part) return null;

  const money = (val: number) => `QAR ${Number(val || 0).toFixed(2)}`;

  const stockStatus =
    part.quantity <= 0
      ? "Out of Stock"
      : part.quantity <= part.lowStockAt
      ? "Low Stock"
      : "In Stock";

  const profitMargin =
    part.sellingPrice > 0
      ? (((part.sellingPrice - part.unitCost) / part.sellingPrice) * 100).toFixed(1)
      : "0.0";

  return (
    <div
      className="modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        className="part-details-dialog"
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "760px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 22px",
            borderBottom: "1px solid #e2e8f0",
            background: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #ff631c, #ea580c)",
                display: "grid",
                placeItems: "center",
                color: "#ffffff",
                boxShadow: "0 4px 10px rgba(234, 88, 12, 0.25)",
              }}
            >
              <Package size={22} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "17px",
                    fontWeight: 700,
                    color: "#0f172a",
                  }}
                >
                  {part.name}
                </h2>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    fontSize: "11px",
                    fontWeight: 600,
                    background:
                      stockStatus === "In Stock"
                        ? "#ecfdf5"
                        : stockStatus === "Low Stock"
                        ? "#fffbeb"
                        : "#fef2f2",
                    color:
                      stockStatus === "In Stock"
                        ? "#059669"
                        : stockStatus === "Low Stock"
                        ? "#d97706"
                        : "#dc2626",
                    border: `1px solid ${
                      stockStatus === "In Stock"
                        ? "#a7f3d0"
                        : stockStatus === "Low Stock"
                        ? "#fde68a"
                        : "#fecaca"
                    }`,
                  }}
                >
                  {stockStatus === "In Stock" ? (
                    <CheckCircle2 size={12} />
                  ) : stockStatus === "Low Stock" ? (
                    <AlertTriangle size={12} />
                  ) : (
                    <XCircle size={12} />
                  )}
                  {stockStatus}
                </span>
              </div>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "12px",
                  color: "#64748b",
                }}
              >
                Part ID: <strong style={{ color: "#0f172a" }}>{part.partId || part.id}</strong>
                {part.partNumber && (
                  <>
                    {" "}
                    • OEM / Part #:{" "}
                    <strong style={{ color: "#0f172a" }}>{part.partNumber}</strong>
                  </>
                )}
                {" "}
                • Category: <strong style={{ color: "#0f172a" }}>{part.category}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: "#f1f5f9",
              border: 0,
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              display: "grid",
              placeItems: "center",
              color: "#64748b",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#e2e8f0";
              e.currentTarget.style.color = "#0f172a";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#f1f5f9";
              e.currentTarget.style.color = "#64748b";
            }}
          >
            <X size={18} />
          </button>
        </header>

        {/* Modal Content Scrollable */}
        <div
          style={{
            padding: "20px 22px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          {/* Key Metrics Row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "12px",
            }}
          >
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#64748b",
                  fontSize: "11px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "4px",
                }}
              >
                <Layers size={13} style={{ color: "#3b82f6" }} />
                <span>Stock On Hand</span>
              </div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a" }}>
                {part.quantity}{" "}
                <span style={{ fontSize: "12px", fontWeight: 500, color: "#64748b" }}>units</span>
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                Alert threshold: {part.lowStockAt} units
              </div>
            </div>

            <div
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#64748b",
                  fontSize: "11px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "4px",
                }}
              >
                <Tag size={13} style={{ color: "#64748b" }} />
                <span>Cost vs Selling</span>
              </div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>
                {money(part.sellingPrice)}
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                Cost: {money(part.unitCost)} • {profitMargin}% margin
              </div>
            </div>

            <div
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#64748b",
                  fontSize: "11px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "4px",
                }}
              >
                <Percent size={13} style={{ color: "#10b981" }} />
                <span>Commission</span>
              </div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#10b981" }}>
                {part.commission > 0 ? money(part.commission) : "No Commission"}
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                {part.commission > 0 ? "Credited to technician" : "Excluded from commission"}
              </div>
            </div>

            <div
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#64748b",
                  fontSize: "11px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "4px",
                }}
              >
                <Building size={13} style={{ color: "#8b5cf6" }} />
                <span>Brand & Supplier</span>
              </div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                {part.brand}
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                Supplier: {part.supplier || "Standard Distributor"}
              </div>
            </div>
          </div>

          {/* Details Specifications */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "10px",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "14px 16px",
            }}
          >
            <div>
              <span style={{ fontSize: "11.5px", color: "#64748b" }}>Compatibility / Models:</span>
              <p style={{ margin: "2px 0 0", fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
                {part.compatibility || "Universal Fit / Multi-Vehicle"}
              </p>
            </div>
            <div>
              <span style={{ fontSize: "11.5px", color: "#64748b" }}>Last Restocked Date:</span>
              <p style={{ margin: "2px 0 0", fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
                {part.lastRestocked || "Not recorded"}
              </p>
            </div>
          </div>

          {/* Policy Note */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              padding: "10px 14px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#1d4ed8",
            }}
          >
            <Info size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <strong>Regular parts sales are excluded from workshop labour revenue.</strong>
              <div style={{ color: "#3b82f6", marginTop: "2px" }}>
                Only the commission earned on eligible parts is credited into technician sales calculations.
              </div>
            </div>
          </div>

          {/* Stock Movement / Activity Log */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#0f172a",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Clock3 size={15} style={{ color: "#ff631c" }} />
                <span>Recent Movement & Activity Log</span>
              </h3>
              <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                {part.activity?.length || 0} recorded movements
              </span>
            </div>

            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                overflow: "hidden",
                maxHeight: "170px",
                overflowY: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "12px",
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: "8px 12px", fontWeight: 600, color: "#64748b" }}>Date</th>
                    <th style={{ padding: "8px 12px", fontWeight: 600, color: "#64748b" }}>Type</th>
                    <th style={{ padding: "8px 12px", fontWeight: 600, color: "#64748b" }}>Qty</th>
                    <th style={{ padding: "8px 12px", fontWeight: 600, color: "#64748b" }}>Reference</th>
                    <th style={{ padding: "8px 12px", fontWeight: 600, color: "#64748b" }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {(part.activity || []).map((record, idx) => (
                    <tr
                      key={`${record.date}-${idx}`}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        background: idx % 2 === 0 ? "#ffffff" : "#fafafa",
                      }}
                    >
                      <td style={{ padding: "8px 12px", color: "#334155" }}>{record.date}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 600,
                            background:
                              record.type.toLowerCase().includes("restock") || record.type.toLowerCase().includes("in")
                                ? "#ecfdf5"
                                : record.type.toLowerCase().includes("sale") || record.type.toLowerCase().includes("out")
                                ? "#eff6ff"
                                : "#fff7ed",
                            color:
                              record.type.toLowerCase().includes("restock") || record.type.toLowerCase().includes("in")
                                ? "#059669"
                                : record.type.toLowerCase().includes("sale") || record.type.toLowerCase().includes("out")
                                ? "#2563eb"
                                : "#ea580c",
                          }}
                        >
                          {record.type}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px", fontWeight: 600, color: "#0f172a" }}>
                        {record.quantity}
                      </td>
                      <td style={{ padding: "8px 12px", color: "#64748b" }}>{record.reference || "—"}</td>
                      <td style={{ padding: "8px 12px", color: "#64748b" }}>{record.notes || "—"}</td>
                    </tr>
                  ))}
                  {(!part.activity || part.activity.length === 0) && (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          textAlign: "center",
                          padding: "16px",
                          color: "#94a3b8",
                        }}
                      >
                        No movement history logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <footer
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 22px",
            borderTop: "1px solid #e2e8f0",
            background: "#f8fafc",
          }}
        >
          <button
            type="button"
            onClick={() => onDelete(part)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "8px",
              border: "1px solid #fecaca",
              background: "#fff1f2",
              color: "#e11d48",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Trash2 size={14} />
            <span>Delete Part</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "7px 16px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#334155",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(part);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 18px",
                borderRadius: "8px",
                border: 0,
                background: "linear-gradient(110deg, #ff631c, #ea580c)",
                color: "#ffffff",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(234, 88, 12, 0.25)",
              }}
            >
              <Pencil size={14} />
              <span>Edit Part</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
