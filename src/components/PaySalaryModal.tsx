import React, { useState, useEffect } from "react";
import {
  X,
  Coins,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export interface SalaryPaymentData {
  id?: string;
  slipNo?: string;
  mechanicId: string;
  mechanicName: string;
  role: string;
  month: string;
  baseSalary: number;
  bonus: number;
  deductions: number;
  netSalary: number;
  paymentDate: string;
  paymentMethod: "Bank Transfer" | "Cash" | "Cheque";
  status: "Paid" | "Pending";
  reference?: string;
  notes?: string;
}

interface PaySalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (paymentData: SalaryPaymentData) => Promise<void> | void;
  mechanics: any[];
  preSelectedMechanicId?: string;
  notify?: (message: string) => void;
}

const MONTH_OPTIONS = [
  "October 2026",
  "November 2026",
  "December 2026",
  "September 2026",
  "August 2026",
  "July 2026",
];

export const PaySalaryModal: React.FC<PaySalaryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  mechanics,
  preSelectedMechanicId,
}) => {
  const [selectedMechanicId, setSelectedMechanicId] = useState("");
  const [month, setMonth] = useState("October 2026");
  const [baseSalary, setBaseSalary] = useState<number>(4500);
  const [bonus, setBonus] = useState<number>(0);
  const [deductions, setDeductions] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<"Bank Transfer" | "Cash" | "Cheque">("Bank Transfer");
  const [reference, setReference] = useState("");
  const [status, setStatus] = useState<"Paid" | "Pending">("Paid");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-populate when mechanic selected
  useEffect(() => {
    const targetId = preSelectedMechanicId || (mechanics.length > 0 ? (mechanics[0].id || mechanics[0].mechanicId) : "");
    setSelectedMechanicId(targetId);

    const m = mechanics.find((item) => (item.id || item.mechanicId) === targetId);
    if (m) {
      setBaseSalary(Number(m.baseSalary || 4500));
    }
  }, [preSelectedMechanicId, mechanics, isOpen]);

  const handleMechanicChange = (mId: string) => {
    setSelectedMechanicId(mId);
    const m = mechanics.find((item) => (item.id || item.mechanicId) === mId);
    if (m) {
      setBaseSalary(Number(m.baseSalary || 4500));
    }
  };

  if (!isOpen) return null;

  const currentMechanic = mechanics.find(
    (item) => (item.id || item.mechanicId) === selectedMechanicId
  );

  const netSalary = Math.max(0, Number(baseSalary || 0) + Number(bonus || 0) - Number(deductions || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMechanicId) {
      setError("Please select a technician.");
      return;
    }
    if (baseSalary < 0) {
      setError("Base salary cannot be negative.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payment: SalaryPaymentData = {
        mechanicId: selectedMechanicId,
        mechanicName: currentMechanic?.name || "Technician",
        role: currentMechanic?.role || "Specialist",
        month,
        baseSalary: Number(baseSalary || 0),
        bonus: Number(bonus || 0),
        deductions: Number(deductions || 0),
        netSalary,
        paymentDate,
        paymentMethod,
        status,
        reference: reference.trim(),
        notes: notes.trim(),
      };

      await onSave(payment);
      onClose();
    } catch (err: any) {
      console.error("Failed to record salary:", err);
      setError(err.message || "Failed to record salary disbursement.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
        className="pay-salary-dialog"
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
        {/* Header */}
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
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #ff631c, #ea580c)",
                display: "grid",
                placeItems: "center",
                color: "#ffffff",
                boxShadow: "0 4px 10px rgba(234, 88, 12, 0.25)",
              }}
            >
              <Coins size={20} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#172640",
                }}
              >
                Disburse &amp; Record Mechanic Salary
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                Process monthly payroll slip, bonuses, deductions, and payment reference
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
            }}
          >
            <X size={18} />
          </button>
        </header>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              margin: "12px 22px 0",
              padding: "10px 14px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              fontSize: "12.5px",
              color: "#dc2626",
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body Scrollable */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              padding: "18px 22px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {/* Row 1: Technician & Month */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1fr",
                gap: "12px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#52647f",
                    marginBottom: "4px",
                  }}
                >
                  Select Technician *
                </label>
                <select
                  required
                  value={selectedMechanicId}
                  onChange={(e) => handleMechanicChange(e.target.value)}
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    color: "#1e293b",
                    background: "#ffffff",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                >
                  {mechanics.map((m) => (
                    <option key={m.id || m.mechanicId} value={m.id || m.mechanicId}>
                      {m.name} ({m.role}) — Base: QAR {Number(m.baseSalary || 4500).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#52647f",
                    marginBottom: "4px",
                  }}
                >
                  Salary Month *
                </label>
                <select
                  required
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    color: "#1e293b",
                    background: "#ffffff",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Earnings & Deductions Breakdown */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "12px",
                background: "#f8fafc",
                padding: "14px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#52647f",
                    marginBottom: "4px",
                  }}
                >
                  Base Salary (QAR) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  required
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(Number(e.target.value))}
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: "#1e293b",
                    background: "#ffffff",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#16a34a",
                    marginBottom: "4px",
                  }}
                >
                  + Bonus / Overtime (QAR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={bonus}
                  onChange={(e) => setBonus(Number(e.target.value))}
                  placeholder="0.00"
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: "#16a34a",
                    background: "#ffffff",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#dc2626",
                    marginBottom: "4px",
                  }}
                >
                  - Deductions / Advance (QAR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={deductions}
                  onChange={(e) => setDeductions(Number(e.target.value))}
                  placeholder="0.00"
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: "#dc2626",
                    background: "#ffffff",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Live Calculation Banner */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 18px",
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                borderRadius: "8px",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#c2410c",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Net Payable Salary
                </span>
                <div style={{ fontSize: "11.5px", color: "#9a3412", marginTop: "2px" }}>
                  Base: QAR {baseSalary.toFixed(2)} + Bonus: QAR {bonus.toFixed(2)} - Deductions: QAR{" "}
                  {deductions.toFixed(2)}
                </div>
              </div>
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 800,
                  color: "#ea580c",
                }}
              >
                QAR {netSalary.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* Row 3: Payment Details */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#52647f",
                    marginBottom: "4px",
                  }}
                >
                  Payment Date *
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    color: "#1e293b",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#52647f",
                    marginBottom: "4px",
                  }}
                >
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    color: "#1e293b",
                    background: "#ffffff",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="Bank Transfer">Bank Transfer (WPS)</option>
                  <option value="Cash">Cash Disbursement</option>
                  <option value="Cheque">Company Cheque</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#52647f",
                    marginBottom: "4px",
                  }}
                >
                  Payment Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    color: "#1e293b",
                    background: "#ffffff",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="Paid">Paid / Disbursed</option>
                  <option value="Pending">Pending Approval</option>
                </select>
              </div>
            </div>

            {/* Row 4: Reference & Notes */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.2fr",
                gap: "12px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#52647f",
                    marginBottom: "4px",
                  }}
                >
                  Transaction / Cheque Ref #
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. QNB-TXN-884920"
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    color: "#1e293b",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#52647f",
                    marginBottom: "4px",
                  }}
                >
                  Remarks / Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Monthly salary with Eid bonus incentive"
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    color: "#1e293b",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <footer
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "10px",
              padding: "14px 22px",
              borderTop: "1px solid #e2e8f0",
              background: "#f8fafc",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "1px solid #dfe5ee",
                background: "#ffffff",
                color: "#475569",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 20px",
                borderRadius: "6px",
                border: 0,
                background: "linear-gradient(110deg, #ff631c, #ea580c)",
                color: "#ffffff",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(234, 88, 12, 0.25)",
              }}
            >
              <CheckCircle2 size={15} />
              <span>{isSubmitting ? "Processing..." : "Confirm & Record Salary"}</span>
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
