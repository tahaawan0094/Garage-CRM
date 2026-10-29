import React from "react";
import {
  X,
  Printer,
  Wrench,
} from "lucide-react";
import { SalaryPaymentData } from "./PaySalaryModal";

interface SalarySlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  slip: SalaryPaymentData | null;
}

export const SalarySlipModal: React.FC<SalarySlipModalProps> = ({
  isOpen,
  onClose,
  slip,
}) => {
  if (!isOpen || !slip) return null;

  const handlePrint = () => {
    window.print();
  };

  const money = (val: number) => `QAR ${Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
        className="salary-slip-dialog"
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "680px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Actions (Hidden in print) */}
        <header
          className="no-print"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 22px",
            borderBottom: "1px solid #e2e8f0",
            background: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              Salary Pay Slip Voucher
            </span>
            <span
              style={{
                padding: "2px 8px",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: 600,
                background: slip.status === "Paid" ? "#ecfdf5" : "#fff7ed",
                color: slip.status === "Paid" ? "#059669" : "#ea580c",
                border: `1px solid ${slip.status === "Paid" ? "#a7f3d0" : "#ffedd5"}`,
              }}
            >
              {slip.status}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "6px",
                border: "1px solid #dfe5ee",
                background: "#ffffff",
                color: "#1e293b",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Printer size={14} style={{ color: "#ea580c" }} />
              <span>Print Voucher</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              style={{
                background: "#f1f5f9",
                border: 0,
                width: "30px",
                height: "30px",
                borderRadius: "6px",
                display: "grid",
                placeItems: "center",
                color: "#64748b",
                cursor: "pointer",
              }}
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* Printable Voucher Content */}
        <div
          id="printable-salary-slip"
          style={{
            padding: "24px 28px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            background: "#ffffff",
          }}
        >
          {/* Workshop Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              borderBottom: "2px solid #0f172a",
              paddingBottom: "16px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    background: "#ea580c",
                    color: "#ffffff",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Wrench size={16} />
                </span>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "18px",
                    fontWeight: 800,
                    color: "#0f172a",
                    letterSpacing: "-0.3px",
                  }}
                >
                  Doha Central Workshop & Service Hub
                </h1>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#64748b" }}>
                Main Garage Facility • Bays 01–12, Street 24, Industrial Area, Doha, Qatar
              </p>
              <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#64748b" }}>
                Tel: +974 4455 6677 • CR No: 994821 • accounts@garageworkspace.com
              </p>
            </div>

            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 800,
                  color: "#ea580c",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                PAYROLL SLIP
              </div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#0f172a",
                  marginTop: "2px",
                }}
              >
                {slip.slipNo || `SLIP-${slip.month.replace(" ", "")}-01`}
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                Month: <strong>{slip.month}</strong>
              </div>
            </div>
          </div>

          {/* Employee & Payment Metadata Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "14px 16px",
              fontSize: "12px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Technician Name:</span>
                <strong style={{ color: "#0f172a" }}>{slip.mechanicName}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Specialty / Role:</span>
                <strong style={{ color: "#0f172a" }}>{slip.role}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Technician ID:</span>
                <strong style={{ color: "#0f172a" }}>{slip.mechanicId}</strong>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Payment Date:</span>
                <strong style={{ color: "#0f172a" }}>{slip.paymentDate}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Payment Mode:</span>
                <strong style={{ color: "#0f172a" }}>{slip.paymentMethod}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Transaction Ref:</span>
                <strong style={{ color: "#0f172a" }}>{slip.reference || "N/A (Cash/WPS)"}</strong>
              </div>
            </div>
          </div>

          {/* Detailed Itemized Earnings & Deductions */}
          <div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "12.5px",
                border: "1px solid #cbd5e1",
              }}
            >
              <thead>
                <tr style={{ background: "#0f172a", color: "#ffffff" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Description</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>Earnings (QAR)</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>Deductions (QAR)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "10px 12px", color: "#1e293b" }}>Basic Monthly Salary</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>
                    {money(slip.baseSalary)}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#94a3b8" }}>—</td>
                </tr>

                {slip.bonus > 0 && (
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "10px 12px", color: "#1e293b" }}>
                      Overtime & Performance Incentive
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#16a34a" }}>
                      + {money(slip.bonus)}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#94a3b8" }}>—</td>
                  </tr>
                )}

                {slip.deductions > 0 && (
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "10px 12px", color: "#1e293b" }}>
                      Absence / Advance Deductions
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#94a3b8" }}>—</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#dc2626" }}>
                      - {money(slip.deductions)}
                    </td>
                  </tr>
                )}

                {/* Subtotals & Net Pay */}
                <tr style={{ background: "#f8fafc", borderTop: "2px solid #cbd5e1" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 700, color: "#0f172a" }}>
                    Gross Total / Deductions
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                    {money(Number(slip.baseSalary) + Number(slip.bonus))}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#dc2626" }}>
                    {money(slip.deductions)}
                  </td>
                </tr>

                {/* Net Disbursed Highlight */}
                <tr style={{ background: "#fff7ed", borderTop: "1.5px solid #fdba74" }}>
                  <td
                    style={{
                      padding: "12px",
                      fontSize: "14px",
                      fontWeight: 800,
                      color: "#ea580c",
                    }}
                  >
                    NET SALARY DISBURSED
                  </td>
                  <td
                    colSpan={2}
                    style={{
                      padding: "12px",
                      textAlign: "right",
                      fontSize: "16px",
                      fontWeight: 800,
                      color: "#ea580c",
                    }}
                  >
                    {money(slip.netSalary)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Notes if any */}
          {slip.notes && (
            <div
              style={{
                fontSize: "11.5px",
                color: "#475569",
                background: "#f8fafc",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
              }}
            >
              <strong>Remarks:</strong> {slip.notes}
            </div>
          )}

          {/* Signatures Section */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "40px",
              marginTop: "20px",
              paddingTop: "20px",
              borderTop: "1px dashed #cbd5e1",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  height: "40px",
                  borderBottom: "1px solid #94a3b8",
                  marginBottom: "6px",
                }}
              />
              <span style={{ fontSize: "11.5px", color: "#475569", fontWeight: 600 }}>
                Technician / Employee Signature
              </span>
            </div>

            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  height: "40px",
                  borderBottom: "1px solid #94a3b8",
                  marginBottom: "6px",
                }}
              />
              <span style={{ fontSize: "11.5px", color: "#475569", fontWeight: 600 }}>
                Authorized Garage Manager Signature
              </span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Print Button (Hidden in print) */}
        <footer
          className="no-print"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "10px",
            padding: "12px 22px",
            borderTop: "1px solid #e2e8f0",
            background: "#f8fafc",
          }}
        >
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
            onClick={handlePrint}
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
            <Printer size={14} />
            <span>Print Pay Slip</span>
          </button>
        </footer>
      </div>
    </div>
  );
};
