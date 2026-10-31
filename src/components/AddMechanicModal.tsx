import React, { useState, useEffect } from "react";
import {
  X,
  HardHat,
  User,
  Coins,
  Briefcase,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { CustomDropdown } from "./CustomDropdown";

export interface MechanicFormData {
  id?: string;
  mechanicId?: string;
  name: string;
  role: string;
  phone: string;
  email?: string;
  nationalId?: string;
  baseSalary: number;
  commissionRate?: number;
  shift: string;
  experience: number;
  joiningDate?: string;
  status: string;
  emergencyContact?: string;
  notes?: string;
}

interface AddMechanicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (mechanicData: MechanicFormData) => Promise<void> | void;
  notify?: (message: string) => void;
  initialData?: MechanicFormData | null;
}

const ROLES = [
  "Engine Specialist",
  "Master Technician",
  "Brake Specialist",
  "AC Specialist",
  "Auto Electrician",
  "Transmission",
  "Suspension",
  "Diagnostics",
  "Tyres & Alignment",
  "Body & Paint",
  "General Repair",
];

const SHIFTS = [
  { value: "Morning", label: "Morning Shift (8:00 AM – 5:00 PM)" },
  { value: "Evening", label: "Evening Shift (2:00 PM – 11:00 PM)" },
  { value: "Night", label: "Night Shift (10:00 PM – 7:00 AM)" },
];

const STATUSES = [
  { value: "Available", label: "Available (Ready for assignment)" },
  { value: "On Job", label: "On Job (Currently working on a job)" },
  { value: "Busy", label: "Busy" },
  { value: "Off Duty", label: "Off Duty" },
  { value: "On Leave", label: "On Leave" },
];

export const AddMechanicModal: React.FC<AddMechanicModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const isEditing = Boolean(initialData?.id || initialData?.mechanicId);

  const [name, setName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [role, setRole] = useState(ROLES[0]);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [baseSalary, setBaseSalary] = useState<number>(() => {
    try {
      const s = JSON.parse(localStorage.getItem("garage_crm_settings_v1") || "{}");
      return Number(s.defaultBaseSalary || 4500);
    } catch (_) { return 4500; }
  });
  const [commissionRate, setCommissionRate] = useState<number>(() => {
    try {
      const s = JSON.parse(localStorage.getItem("garage_crm_settings_v1") || "{}");
      return typeof s.defaultCommissionRate === 'number' ? Number(s.defaultCommissionRate) : 5;
    } catch (_) { return 5; }
  });
  const [shift, setShift] = useState("Morning");
  const [experience, setExperience] = useState<number>(3);
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("Available");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setNationalId(initialData.nationalId || "");
      setRole(initialData.role || ROLES[0]);
      setPhone(initialData.phone || "");
      setEmail(initialData.email || "");
      setBaseSalary(Number(initialData.baseSalary || 4500));
      setCommissionRate(Number(initialData.commissionRate || 0));
      setShift(initialData.shift || "Morning");
      setExperience(Number(initialData.experience || 1));
      setJoiningDate(initialData.joiningDate || new Date().toISOString().split("T")[0]);
      setStatus(initialData.status || "Available");
      setEmergencyContact(initialData.emergencyContact || "");
      setNotes(initialData.notes || "");
    } else {
      // Reset defaults based on settings
      let defaultBase = 4500;
      let defaultComm = 5;
      try {
        const savedSettings = localStorage.getItem("garage_crm_settings_v1");
        if (savedSettings) {
          const s = JSON.parse(savedSettings);
          if (s.defaultBaseSalary) defaultBase = Number(s.defaultBaseSalary);
          if (typeof s.defaultCommissionRate === 'number') defaultComm = Number(s.defaultCommissionRate);
        }
      } catch (_) {}
      setName("");
      setNationalId("");
      setRole(ROLES[0]);
      setPhone("");
      setEmail("");
      setBaseSalary(defaultBase);
      setCommissionRate(defaultComm);
      setShift("Morning");
      setExperience(3);
      setJoiningDate(new Date().toISOString().split("T")[0]);
      setStatus("Available");
      setEmergencyContact("");
      setNotes("");
      setError(null);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter the mechanic's full name.");
      return;
    }
    if (!phone.trim()) {
      setError("Please provide a contact phone number.");
      return;
    }
    if (baseSalary < 0) {
      setError("Base salary cannot be negative.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const data: MechanicFormData = {
        name: name.trim(),
        nationalId: nationalId.trim(),
        role,
        phone: phone.trim(),
        email: email.trim(),
        baseSalary: Number(baseSalary || 0),
        commissionRate: Number(commissionRate || 0),
        shift,
        experience: Number(experience || 0),
        joiningDate,
        status,
        emergencyContact: emergencyContact.trim(),
        notes: notes.trim(),
      };

      if (isEditing && initialData) {
        data.id = initialData.id || initialData.mechanicId;
        data.mechanicId = initialData.mechanicId || initialData.id;
      }

      await onSave(data);
      onClose();
    } catch (err: any) {
      console.error("Error saving mechanic:", err);
      setError(err.message || "Failed to save technician information.");
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
        className="add-mechanic-dialog"
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "720px",
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
              <HardHat size={20} />
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
                {isEditing ? "Edit Technician Profile" : "Add New Technician / Mechanic"}
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                {isEditing
                  ? `Update personal details, salary, and shift for ${initialData?.name}`
                  : "Register garage technician, assign specialty, base salary, and working hours"}
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
              gap: "18px",
            }}
          >
            {/* Section 1: Basic & Contact */}
            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#172640",
                  marginBottom: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <User size={14} style={{ color: "#ea580c" }} />
                <span>Personal &amp; Contact Details</span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
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
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tariq Khan"
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
                    QID / National ID
                  </label>
                  <input
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="e.g. 29433400192"
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
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +974 5512 3456"
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
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tariq@garageworkspace.com"
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

            {/* Section 2: Role, Shift & Status */}
            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#172640",
                  marginBottom: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Briefcase size={14} style={{ color: "#ea580c" }} />
                <span>Role &amp; Workshop Assignment</span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
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
                    Specialty / Role *
                  </label>
                  <CustomDropdown
                    value={role}
                    onChange={(val) => setRole(val)}
                    placeholder="Select Role..."
                    options={ROLES.map((r) => ({
                      value: r,
                      label: r,
                    }))}
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
                    Shift
                  </label>
                  <CustomDropdown
                    value={shift}
                    onChange={(val) => setShift(val)}
                    placeholder="Select Shift..."
                    options={SHIFTS.map((s) => ({
                      value: s.value,
                      label: s.label,
                    }))}
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
                    Experience (Years)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={experience}
                    onChange={(e) => setExperience(Number(e.target.value))}
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
                    Current Status
                  </label>
                  <CustomDropdown
                    value={status}
                    onChange={(val) => setStatus(val)}
                    placeholder="Select Status..."
                    options={STATUSES.map((st) => ({
                      value: st.value,
                      label: st.label,
                      badge: st.value === "Available" ? "Free" : st.value === "On Job" ? "Busy" : st.value,
                      badgeColor: (st.value === "Available" ? "green" : st.value === "On Job" ? "orange" : "blue") as any,
                    }))}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Salary & Compensation */}
            <div
              style={{
                padding: "14px 16px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#172640",
                  marginBottom: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Coins size={14} style={{ color: "#ea580c" }} />
                <span>Monthly Salary &amp; Payroll Configuration</span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
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
                    Base Monthly Salary (QAR) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    required
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(Number(e.target.value))}
                    placeholder="e.g. 4500"
                    style={{
                      width: "100%",
                      height: "36px",
                      padding: "0 10px",
                      border: "1px solid #dfe5ee",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#1e293b",
                      background: "#ffffff",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  <span style={{ fontSize: "11px", color: "#64748b" }}>
                    Standard fixed monthly salary for payroll
                  </span>
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
                    Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(Number(e.target.value))}
                    placeholder="e.g. 5"
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
                  <span style={{ fontSize: "11px", color: "#64748b" }}>
                    Incentive bonus on completed jobs
                  </span>
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
                    Joining Date
                  </label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
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

            {/* Section 4: Emergency Contact & Notes */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
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
                  Emergency Contact
                </label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="e.g. Brother: +974 5599 8811"
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
                  Notes &amp; Certifications
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. ASE Certified, Expert in Japanese &amp; German engines"
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
              <span>{isSubmitting ? "Saving..." : isEditing ? "Update Technician" : "Save Technician"}</span>
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
