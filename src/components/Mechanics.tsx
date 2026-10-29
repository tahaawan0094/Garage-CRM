import React, { useEffect, useMemo, useState } from "react";
import { mechanicsApi } from "../lib/api";
import { CustomDropdown } from "./CustomDropdown";
import {
  Activity,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  HardHat,
  Mail,
  Phone,
  Plus,
  Search,
  Star,
  UserRound,
  UsersRound,
  Wrench,
  Coins,
  Printer,
  Trash2,
  DollarSign,
  CheckCircle2,
  Calendar,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { AddMechanicModal, MechanicFormData } from "./AddMechanicModal";
import { PaySalaryModal, SalaryPaymentData } from "./PaySalaryModal";
import { SalarySlipModal } from "./SalarySlipModal";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

type MechanicStatus = "On Job" | "Available" | "Busy" | "Off Duty" | "On Leave" | "On Duty";
type AssignmentStatus = "In Progress" | "Pending" | "Completed";
type Assignment = { workOrder: string; vehicle: string; customer: string; service: string; status: AssignmentStatus };

export interface Mechanic {
  id: string;
  mechanicId?: string;
  name: string;
  initials: string;
  role: string;
  phone: string;
  email: string;
  nationalId?: string;
  baseSalary?: number;
  commissionRate?: number;
  status: MechanicStatus;
  shift: string;
  joiningDate?: string;
  emergencyContact?: string;
  assignedJobs: number;
  completedJobs: number;
  rating: number;
  experience: number;
  notes: string;
  assignments: Assignment[];
  salaryHistory?: any[];
}

const statusClass: Record<MechanicStatus, string> = {
  "On Job": "on-job",
  Available: "available",
  Busy: "busy",
  "Off Duty": "off-duty",
  "On Leave": "on-leave",
  "On Duty": "on-duty",
};

// Initial default mechanics if backend returns empty
const defaultMechanics: Mechanic[] = [
  {
    id: "MEC-1001",
    mechanicId: "MEC-1001",
    name: "Ali Hassan",
    initials: "AH",
    role: "Engine Specialist",
    phone: "+974 5512 3456",
    email: "ali.hassan@garageworkspace.com",
    nationalId: "29433400192",
    baseSalary: 6500,
    commissionRate: 5,
    status: "On Job",
    shift: "Morning",
    joiningDate: "2023-01-15",
    emergencyContact: "Brother: +974 5599 1122",
    assignedJobs: 3,
    completedJobs: 248,
    rating: 4.8,
    experience: 6,
    notes: "Expert in engine diagnostics, rebuilds, and European performance tuning.",
    assignments: [
      { workOrder: "WO-00012", vehicle: "Toyota Corolla", customer: "Sheikh Ahmed", service: "Engine Diagnostics", status: "In Progress" },
      { workOrder: "WO-00028", vehicle: "BMV", customer: "Vertexia Agency", service: "General Service", status: "In Progress" },
    ],
  },
  {
    id: "MEC-1002",
    mechanicId: "MEC-1002",
    name: "M. Khan",
    initials: "MK",
    role: "Brake Specialist",
    phone: "+974 5523 4567",
    email: "m.khan@garageworkspace.com",
    nationalId: "29133400811",
    baseSalary: 5200,
    commissionRate: 4,
    status: "Available",
    shift: "Morning",
    joiningDate: "2023-04-10",
    emergencyContact: "Spouse: +974 5588 2233",
    assignedJobs: 2,
    completedJobs: 194,
    rating: 4.5,
    experience: 5,
    notes: "Brembo certified. Suspension alignment & ABS braking specialist.",
    assignments: [
      { workOrder: "WO-00006", vehicle: "Renault Duster", customer: "Muhammad Muddasir", service: "Brake Service", status: "In Progress" },
    ],
  },
  {
    id: "MEC-1003",
    mechanicId: "MEC-1003",
    name: "Ahmed Raza",
    initials: "AR",
    role: "Auto Electrician",
    phone: "+974 5534 5678",
    email: "ahmed.raza@garageworkspace.com",
    nationalId: "29333400922",
    baseSalary: 5500,
    commissionRate: 5,
    status: "On Job",
    shift: "Evening",
    joiningDate: "2023-08-20",
    emergencyContact: "Father: +974 5577 3344",
    assignedJobs: 3,
    completedJobs: 171,
    rating: 4.7,
    experience: 4,
    notes: "Specializes in CAN-bus wiring, ECU programming, and hybrid battery checks.",
    assignments: [
      { workOrder: "WO-00008", vehicle: "Toyota Camry", customer: "Test User", service: "Brake Service", status: "In Progress" },
    ],
  },
  {
    id: "MEC-1004",
    mechanicId: "MEC-1004",
    name: "Bilal Khan",
    initials: "BK",
    role: "AC Specialist",
    phone: "+974 5545 6789",
    email: "bilal.khan@garageworkspace.com",
    nationalId: "29533400431",
    baseSalary: 4800,
    commissionRate: 4,
    status: "Available",
    shift: "Morning",
    joiningDate: "2024-02-01",
    emergencyContact: "Friend: +974 5566 4455",
    assignedJobs: 1,
    completedJobs: 156,
    rating: 4.3,
    experience: 4,
    notes: "R134a/R1234yf climate systems, compressor overhauls and leak testing.",
    assignments: [
      { workOrder: "WO-00007", vehicle: "2002", customer: "Hamad", service: "Wheel Alignment", status: "In Progress" },
    ],
  },
];

// Seed sample salary disbursements
const defaultSalaries: SalaryPaymentData[] = [
  {
    id: "SLIP-202610-01",
    slipNo: "SLIP-202610-01",
    mechanicId: "MEC-1001",
    mechanicName: "Ali Hassan",
    role: "Engine Specialist",
    month: "October 2026",
    baseSalary: 6500,
    bonus: 500,
    deductions: 0,
    netSalary: 7000,
    paymentDate: "2026-10-28",
    paymentMethod: "Bank Transfer",
    status: "Paid",
    reference: "WPS-QNB-992140",
    notes: "October salary with master technician performance bonus",
  },
  {
    id: "SLIP-202610-02",
    slipNo: "SLIP-202610-02",
    mechanicId: "MEC-1002",
    mechanicName: "M. Khan",
    role: "Brake Specialist",
    month: "October 2026",
    baseSalary: 5200,
    bonus: 300,
    deductions: 100,
    netSalary: 5400,
    paymentDate: "2026-10-28",
    paymentMethod: "Bank Transfer",
    status: "Paid",
    reference: "WPS-QNB-992141",
    notes: "Overtime bonus added; 1-day advance deduction",
  },
  {
    id: "SLIP-202610-03",
    slipNo: "SLIP-202610-03",
    mechanicId: "MEC-1003",
    mechanicName: "Ahmed Raza",
    role: "Auto Electrician",
    month: "October 2026",
    baseSalary: 5500,
    bonus: 400,
    deductions: 0,
    netSalary: 5900,
    paymentDate: "2026-10-27",
    paymentMethod: "Cash",
    status: "Paid",
    reference: "CASH-VOUCH-882",
    notes: "Cash disbursement signed by technician",
  },
  {
    id: "SLIP-202610-04",
    slipNo: "SLIP-202610-04",
    mechanicId: "MEC-1004",
    mechanicName: "Bilal Khan",
    role: "AC Specialist",
    month: "October 2026",
    baseSalary: 4800,
    bonus: 0,
    deductions: 200,
    netSalary: 4600,
    paymentDate: "2026-10-26",
    paymentMethod: "Bank Transfer",
    status: "Paid",
    reference: "WPS-QNB-992142",
    notes: "Monthly base salary after company advance deduction",
  },
  {
    id: "SLIP-202609-01",
    slipNo: "SLIP-202609-01",
    mechanicId: "MEC-1001",
    mechanicName: "Ali Hassan",
    role: "Engine Specialist",
    month: "September 2026",
    baseSalary: 6500,
    bonus: 450,
    deductions: 0,
    netSalary: 6950,
    paymentDate: "2026-09-28",
    paymentMethod: "Bank Transfer",
    status: "Paid",
    reference: "WPS-QNB-981204",
    notes: "September salary disbursement",
  },
  {
    id: "SLIP-202609-02",
    slipNo: "SLIP-202609-02",
    mechanicId: "MEC-1002",
    mechanicName: "M. Khan",
    role: "Brake Specialist",
    month: "September 2026",
    baseSalary: 5200,
    bonus: 250,
    deductions: 0,
    netSalary: 5450,
    paymentDate: "2026-09-28",
    paymentMethod: "Bank Transfer",
    status: "Paid",
    reference: "WPS-QNB-981205",
    notes: "September salary disbursement",
  },
];

const LOCAL_STORAGE_SALARIES_KEY = "garage_crm_mechanic_salaries_v1";
const LOCAL_STORAGE_MECHANICS_KEY = "garage_crm_mechanics_v1";

interface MechanicsProps {
  notify: (message: string) => void;
  onAdd: () => void;
  onAssign: () => void;
  refreshTrigger?: number;
}

export const Mechanics: React.FC<MechanicsProps> = ({
  notify,
  onAdd: _onAdd,
  onAssign,
  refreshTrigger,
}) => {
  // Navigation Tab: 'technicians' | 'salary'
  const [activeTab, setActiveTab] = useState<"technicians" | "salary">("technicians");

  // Mechanics state
  const [mechanics, setMechanics] = useState<Mechanic[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_MECHANICS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return defaultMechanics;
  });
  const [selectedId, setSelectedId] = useState<string>("MEC-1001");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [shiftFilter, setShiftFilter] = useState("All Shifts");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Salary state
  const [salaries, setSalaries] = useState<SalaryPaymentData[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_SALARIES_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultSalaries;
  });
  const [selectedSalaryMonth, setSelectedSalaryMonth] = useState<string>("October 2026");
  const [salarySearch, setSalarySearch] = useState<string>("");
  const [salaryStatusFilter, setSalaryStatusFilter] = useState<string>("All Status");
  const [salaryPage, setSalaryPage] = useState(1);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMechanic, setEditingMechanic] = useState<Mechanic | null>(null);
  const [deletingMechanic, setDeletingMechanic] = useState<Mechanic | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [preSelectedMechanicForPay, setPreSelectedMechanicForPay] = useState<string>("");
  const [viewingSlip, setViewingSlip] = useState<SalaryPaymentData | null>(null);
  const [deletingSlip, setDeletingSlip] = useState<SalaryPaymentData | null>(null);

  // Sync mechanics to localStorage & notify other tabs
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_MECHANICS_KEY, JSON.stringify(mechanics));
      window.dispatchEvent(new CustomEvent("garage_mechanics_updated"));
    } catch (e) {
      console.warn("Could not persist mechanics to localStorage:", e);
    }
  }, [mechanics]);

  // Sync salaries to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_SALARIES_KEY, JSON.stringify(salaries));
    } catch (e) {
      console.warn("Could not persist salaries to localStorage:", e);
    }
  }, [salaries]);

  // Fetch mechanics from backend
  useEffect(() => {
    mechanicsApi
      .getAll({ limit: 100 })
      .then((res) => {
        if (res.data && res.data.length > 0) {
          const merged = res.data.map((m: any, idx: number) => ({
            ...m,
            id: m.id || m.mechanicId || `MEC-${1001 + idx}`,
            baseSalary: Number(m.baseSalary || 4500),
            nationalId: m.nationalId || "",
            commissionRate: Number(m.commissionRate || 5),
            assignments: m.assignments || [],
          }));
          setMechanics(merged);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch mechanics from backend:", err);
      });

    // Also attempt to fetch salaries from backend
    mechanicsApi
      .getAllSalaries()
      .then((res: any) => {
        if (res && res.length > 0) {
          setSalaries((prev) => {
            const map = new Map<string, SalaryPaymentData>();
            prev.forEach((s) => map.set(s.slipNo || s.id || "", s));
            res.forEach((s: any) => map.set(s.slipNo || s.id || "", s));
            return Array.from(map.values());
          });
        }
      })
      .catch(() => {});
  }, [refreshTrigger]);

  // Format currency
  const money = (val: number) =>
    `QAR ${Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Save new or updated mechanic
  const handleSaveMechanic = async (data: MechanicFormData) => {
    try {
      if (editingMechanic) {
        const targetId = editingMechanic.id || editingMechanic.mechanicId || "";
        const res = await mechanicsApi.update(targetId, data);
        const updated = res.data || { ...editingMechanic, ...data };
        setMechanics((prev) => prev.map((m) => (m.id === targetId ? { ...m, ...updated } : m)));
        notify(`Technician "${data.name}" updated successfully.`);
      } else {
        const newId = `MEC-${1000 + mechanics.length + 1}`;
        const newMechanic: Mechanic = {
          ...data,
          id: newId,
          mechanicId: newId,
          email: data.email || "",
          initials: data.name
            .split(" ")
            .map((p) => p[0])
            .join("")
            .toUpperCase(),
          status: (data.status as MechanicStatus) || "Available",
          assignedJobs: 0,
          completedJobs: 0,
          rating: 5.0,
          notes: data.notes || "",
          assignments: [],
        };
        try {
          const res = await mechanicsApi.create(newMechanic);
          if (res.data) Object.assign(newMechanic, res.data);
        } catch (e) {
          console.warn("Backend create failed, saved locally:", e);
        }
        setMechanics((prev) => [newMechanic, ...prev]);
        notify(`Technician "${data.name}" added successfully.`);
      }
      setIsAddModalOpen(false);
      setEditingMechanic(null);
    } catch (err: any) {
      console.error("Save mechanic error:", err);
      notify(err.message || "Failed to save technician.");
    }
  };

  // Delete mechanic
  const handleConfirmDeleteMechanic = async () => {
    if (!deletingMechanic) return;
    try {
      const targetId = deletingMechanic.id || deletingMechanic.mechanicId || "";
      await mechanicsApi.delete(targetId);
      setMechanics((prev) => prev.filter((m) => m.id !== targetId));
      if (selectedId === targetId) {
        setSelectedId(mechanics[0]?.id || "");
      }
      notify(`Technician "${deletingMechanic.name}" removed.`);
      setDeletingMechanic(null);
    } catch (err: any) {
      console.error("Delete mechanic error:", err);
      notify(err.message || "Failed to remove mechanic.");
    }
  };

  // Record salary payment
  const handleSaveSalaryPayment = async (paymentData: SalaryPaymentData) => {
    try {
      const slipNumber =
        paymentData.slipNo ||
        `SLIP-${paymentData.month.replace(" ", "")}-${String(salaries.length + 1).padStart(2, "0")}`;
      const record: SalaryPaymentData = {
        ...paymentData,
        id: slipNumber,
        slipNo: slipNumber,
      };

      // Call backend
      try {
        await mechanicsApi.recordSalary(paymentData.mechanicId, record);
      } catch (e) {
        console.warn("Backend recordSalary failed, saved locally:", e);
      }

      setSalaries((prev) => [record, ...prev]);
      notify(`Salary payment of ${money(record.netSalary)} recorded for ${record.mechanicName}.`);
      setIsPayModalOpen(false);
      setViewingSlip(record); // Automatically show the printable slip!
    } catch (err: any) {
      console.error("Record salary error:", err);
      notify(err.message || "Failed to record salary payment.");
    }
  };

  // Delete salary payment record
  const handleConfirmDeleteSalary = () => {
    if (!deletingSlip) return;
    setSalaries((prev) => prev.filter((s) => s.slipNo !== deletingSlip.slipNo && s.id !== deletingSlip.id));
    notify(`Salary slip ${deletingSlip.slipNo} has been removed.`);
    setDeletingSlip(null);
  };

  // Filtered mechanics
  const filteredMechanics = useMemo(() => {
    return mechanics.filter((m) => {
      const term = search.trim().toLowerCase();
      const matchesSearch = `${m.id} ${m.name} ${m.role} ${m.phone} ${m.nationalId || ""}`
        .toLowerCase()
        .includes(term);
      const matchesRole = roleFilter === "All Roles" || m.role === roleFilter;
      const matchesStatus = statusFilter === "All Status" || m.status === statusFilter;
      const matchesShift = shiftFilter === "All Shifts" || m.shift === shiftFilter;
      return matchesSearch && matchesRole && matchesStatus && matchesShift;
    });
  }, [mechanics, search, roleFilter, statusFilter, shiftFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredMechanics.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageMechanics = filteredMechanics.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedMechanic =
    filteredMechanics.find((m) => m.id === selectedId) ??
    filteredMechanics[0] ??
    mechanics.find((m) => m.id === selectedId) ??
    mechanics[0];

  // Technician counts
  const mechanicCounts = {
    total: mechanics.length,
    onDuty: mechanics.filter((m) => m.status === "On Job" || m.status === "Available" || m.status === "Busy" || m.status === "On Duty").length,
    available: mechanics.filter((m) => m.status === "Available").length,
    onJob: mechanics.filter((m) => m.status === "On Job").length,
  };

  // Filtered salaries
  const filteredSalaries = useMemo(() => {
    return salaries.filter((s) => {
      const matchesMonth = selectedSalaryMonth === "All Months" || s.month === selectedSalaryMonth;
      const term = salarySearch.trim().toLowerCase();
      const matchesSearch = `${s.slipNo || ""} ${s.mechanicName || ""} ${s.role || ""} ${s.paymentMethod || ""} ${s.reference || ""}`
        .toLowerCase()
        .includes(term);
      const matchesStatus = salaryStatusFilter === "All Status" || s.status === salaryStatusFilter;
      return matchesMonth && matchesSearch && matchesStatus;
    });
  }, [salaries, selectedSalaryMonth, salarySearch, salaryStatusFilter]);

  const salaryPageCount = Math.max(1, Math.ceil(filteredSalaries.length / pageSize));
  const currentSalaryPage = Math.min(salaryPage, salaryPageCount);
  const pageSalaries = filteredSalaries.slice((currentSalaryPage - 1) * pageSize, currentSalaryPage * pageSize);

  // Salary KPIs for the selected month
  const activeMonthSalaries = useMemo(() => {
    return salaries.filter((s) => selectedSalaryMonth === "All Months" || s.month === selectedSalaryMonth);
  }, [salaries, selectedSalaryMonth]);

  const totalMonthlyPayrollBudget = useMemo(() => {
    return mechanics.reduce((sum, m) => sum + Number(m.baseSalary || 4500), 0);
  }, [mechanics]);

  const totalPaidThisMonth = useMemo(() => {
    return activeMonthSalaries
      .filter((s) => s.status === "Paid")
      .reduce((sum, s) => sum + Number(s.netSalary || 0), 0);
  }, [activeMonthSalaries]);

  const pendingSalaryAmount = Math.max(0, totalMonthlyPayrollBudget - totalPaidThisMonth);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    salaries.forEach((s) => s.month && set.add(s.month));
    set.add("October 2026");
    set.add("November 2026");
    set.add("September 2026");
    return Array.from(set);
  }, [salaries]);

  return (
    <main className="mechanics-management">
      {/* Page Header */}
      <header className="mechanics-page-heading no-print">
        <div className="mechanics-page-title">
          <span>
            <UsersRound size={26} />
          </span>
          <div>
            <h1>Technicians &amp; Payroll Management</h1>
            <p>Manage workshop mechanics, skills, task assignments, and monthly salary payroll calculations.</p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {activeTab === "salary" ? (
            <button
              className="mechanics-create-button"
              onClick={() => {
                setPreSelectedMechanicForPay(mechanics[0]?.id || "");
                setIsPayModalOpen(true);
              }}
            >
              <Coins size={18} />
              <span>Disburse / Pay Salary</span>
            </button>
          ) : (
            <button
              className="mechanics-create-button"
              onClick={() => {
                setEditingMechanic(null);
                setIsAddModalOpen(true);
              }}
            >
              <Plus size={18} />
              <span>Add Mechanic</span>
            </button>
          )}
        </div>
      </header>

      {/* Navigation Tabs */}
      <div
        className="mechanics-tabs-bar no-print"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "14px",
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: "8px",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("technicians")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "8px",
            border: 0,
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            background: activeTab === "technicians" ? "#ff631c" : "transparent",
            color: activeTab === "technicians" ? "#ffffff" : "#475569",
            transition: "all 0.15s ease",
          }}
        >
          <HardHat size={16} />
          <span>Technicians Directory</span>
          <span
            style={{
              padding: "2px 7px",
              borderRadius: "9999px",
              fontSize: "11px",
              fontWeight: 700,
              background: activeTab === "technicians" ? "rgba(255,255,255,0.25)" : "#f1f5f9",
              color: activeTab === "technicians" ? "#ffffff" : "#64748b",
            }}
          >
            {mechanics.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("salary")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "8px",
            border: 0,
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            background: activeTab === "salary" ? "#ff631c" : "transparent",
            color: activeTab === "salary" ? "#ffffff" : "#475569",
            transition: "all 0.15s ease",
          }}
        >
          <Coins size={16} />
          <span>Salary &amp; Payroll Management</span>
          <span
            style={{
              padding: "2px 7px",
              borderRadius: "9999px",
              fontSize: "11px",
              fontWeight: 700,
              background: activeTab === "salary" ? "rgba(255,255,255,0.25)" : "#f1f5f9",
              color: activeTab === "salary" ? "#ffffff" : "#64748b",
            }}
          >
            {salaries.length} slips
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TECHNICIANS DIRECTORY                                              */}
      {/* ========================================================================= */}
      {activeTab === "technicians" && (
        <>
          {/* Technicians Top KPI Cards */}
          <section className="mechanics-metrics" aria-label="Mechanic summary">
            <article>
              <span className="mechanics-metric-icon blue">
                <UsersRound size={21} />
              </span>
              <div>
                <strong>{mechanicCounts.total}</strong>
                <small>Total Mechanics</small>
              </div>
              <Activity size={23} className="mechanics-spark blue-text" />
            </article>
            <article>
              <span className="mechanics-metric-icon green">
                <HardHat size={20} />
              </span>
              <div>
                <strong>{mechanicCounts.onDuty}</strong>
                <small>On Duty</small>
              </div>
              <Activity size={23} className="mechanics-spark green-text" />
            </article>
            <article>
              <span className="mechanics-metric-icon purple">
                <UserRound size={20} />
              </span>
              <div>
                <strong>{mechanicCounts.available}</strong>
                <small>Available</small>
              </div>
              <Activity size={23} className="mechanics-spark purple-text" />
            </article>
            <article>
              <span className="mechanics-metric-icon orange">
                <Wrench size={20} />
              </span>
              <div>
                <strong>{mechanicCounts.onJob}</strong>
                <small>On Job</small>
              </div>
              <Activity size={23} className="mechanics-spark orange-text" />
            </article>
          </section>

          {/* Technicians Layout */}
          <div className="mechanics-management-layout">
            <section className="mechanics-list-card">
              <div className="mechanics-filters">
                <label className="mechanics-search">
                  <Search size={16} />
                  <input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Search by name, ID, specialty, phone, QID..."
                    aria-label="Search mechanics"
                  />
                </label>
                <CustomDropdown
                  value={roleFilter}
                  onChange={(val) => {
                    setRoleFilter(val);
                    setPage(1);
                  }}
                  ariaLabel="Filter by mechanic role"
                  options={["All Roles", ...Array.from(new Set(mechanics.map((m) => m.role)))]}
                />
                <CustomDropdown
                  value={statusFilter}
                  onChange={(val) => {
                    setStatusFilter(val);
                    setPage(1);
                  }}
                  ariaLabel="Filter by mechanic status"
                  options={[
                    { value: "All Status", label: "All Status" },
                    { value: "On Job", label: "On Job", badge: "Busy", badgeColor: "orange" },
                    { value: "Available", label: "Available", badge: "Free", badgeColor: "green" },
                    { value: "Busy", label: "Busy", badge: "Occupied", badgeColor: "orange" },
                    { value: "Off Duty", label: "Off Duty", badge: "Off", badgeColor: "blue" },
                    { value: "On Leave", label: "On Leave", badge: "Leave", badgeColor: "red" },
                  ]}
                />
                <CustomDropdown
                  value={shiftFilter}
                  onChange={(val) => {
                    setShiftFilter(val);
                    setPage(1);
                  }}
                  ariaLabel="Filter by shift"
                  options={["All Shifts", "Morning", "Evening", "Night"]}
                />
              </div>

              <div className="mechanics-table-scroll">
                <table className="mechanics-management-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Mechanic ID</th>
                      <th>Mechanic Name</th>
                      <th>Role / Specialty</th>
                      <th>Contact</th>
                      <th>Monthly Base Salary</th>
                      <th>Assigned Jobs</th>
                      <th>Status</th>
                      <th>Rating</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageMechanics.map((mechanic, index) => (
                      <tr
                        key={mechanic.id}
                        className={selectedMechanic?.id === mechanic.id ? "selected" : ""}
                        onClick={() => setSelectedId(mechanic.id)}
                        style={{ cursor: "pointer" }}
                      >
                        <td>{(currentPage - 1) * pageSize + index + 1}</td>
                        <td>
                          <button
                            className="mechanic-id-link"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedId(mechanic.id);
                            }}
                          >
                            {mechanic.id}
                          </button>
                        </td>
                        <td>
                          <span className="mechanic-name-cell">
                            <span>{mechanic.initials}</span>
                            {mechanic.name}
                          </span>
                        </td>
                        <td>{mechanic.role}</td>
                        <td>{mechanic.phone}</td>
                        <td>
                          <strong style={{ color: "#ea580c" }}>{money(mechanic.baseSalary || 4500)}</strong>
                        </td>
                        <td>{mechanic.assignedJobs}</td>
                        <td>
                          <span className={`mechanic-status-badge ${statusClass[mechanic.status]}`}>
                            {mechanic.status}
                          </span>
                        </td>
                        <td>
                          <span className="mechanic-rating">
                            <Star size={13} fill="currentColor" />
                            {mechanic.rating.toFixed(1)}
                          </span>
                        </td>
                        <td>
                          <div
                            style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="mechanic-row-action"
                              aria-label={`Pay salary to ${mechanic.name}`}
                              title="Disburse / Record Salary"
                              onClick={() => {
                                setPreSelectedMechanicForPay(mechanic.id);
                                setIsPayModalOpen(true);
                              }}
                            >
                              <Coins size={14} style={{ color: "#ea580c" }} />
                            </button>
                            <button
                              type="button"
                              className="mechanic-row-action"
                              aria-label={`Edit ${mechanic.id}`}
                              title="Edit Technician"
                              onClick={() => {
                                setEditingMechanic(mechanic);
                                setIsAddModalOpen(true);
                              }}
                            >
                              <Wrench size={14} style={{ color: "#0284c7" }} />
                            </button>
                            <button
                              type="button"
                              className="mechanic-row-action"
                              aria-label={`Delete ${mechanic.id}`}
                              title="Delete Technician"
                              onClick={() => setDeletingMechanic(mechanic)}
                            >
                              <Trash2 size={14} style={{ color: "#e11d48" }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredMechanics.length === 0 && (
                      <tr>
                        <td colSpan={10} className="mechanics-empty">
                          No mechanics match the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <footer className="mechanics-table-footer">
                <span>
                  Showing {filteredMechanics.length ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
                  {Math.min(currentPage * pageSize, filteredMechanics.length)} of {filteredMechanics.length} mechanics
                </span>
                <div>
                  <button
                    aria-label="Previous page"
                    disabled={currentPage === 1}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      className={currentPage === pageNumber ? "active" : ""}
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  ))}
                  <button
                    aria-label="Next page"
                    disabled={currentPage === pageCount}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </footer>
            </section>

            {/* Selected Mechanic Profile Side Card */}
            {selectedMechanic && (
              <aside className="mechanic-detail-card" aria-label={`Mechanic details for ${selectedMechanic.id}`}>
                <header>
                  <div>
                    <FileText size={16} />
                    <strong>Technician Details</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMechanic(selectedMechanic);
                      setIsAddModalOpen(true);
                    }}
                  >
                    Edit
                  </button>
                </header>

                <div className="mechanic-detail-heading">
                  <span className="mechanic-large-avatar">{selectedMechanic.initials}</span>
                  <div>
                    <strong>{selectedMechanic.name}</strong>
                    <span>Mechanic ID: {selectedMechanic.id}</span>
                  </div>
                  <span className={`mechanic-status-badge ${statusClass[selectedMechanic.status]}`}>
                    {selectedMechanic.status === "On Job" ? "On Duty" : selectedMechanic.status}
                  </span>
                </div>

                <div className="mechanic-detail-facts">
                  <div>
                    <Phone size={14} />
                    <span>Phone:</span>
                    <strong>{selectedMechanic.phone}</strong>
                  </div>
                  <div>
                    <Mail size={14} />
                    <span>Email:</span>
                    <strong>{selectedMechanic.email || "N/A"}</strong>
                  </div>
                  <div>
                    <ShieldCheck size={14} />
                    <span>QID / ID:</span>
                    <strong>{selectedMechanic.nationalId || "Not registered"}</strong>
                  </div>
                  <div>
                    <Wrench size={14} />
                    <span>Specialty:</span>
                    <strong>{selectedMechanic.role}</strong>
                  </div>
                  <div>
                    <Coins size={14} />
                    <span>Base Salary:</span>
                    <strong style={{ color: "#ea580c" }}>{money(selectedMechanic.baseSalary || 4500)}</strong>
                  </div>
                  <div>
                    <TrendingUp size={14} />
                    <span>Commission Rate:</span>
                    <strong>{selectedMechanic.commissionRate || 5}%</strong>
                  </div>
                  <div>
                    <Clock3 size={14} />
                    <span>Experience:</span>
                    <strong>{selectedMechanic.experience} Years</strong>
                  </div>
                  <div>
                    <Clock3 size={14} />
                    <span>Working Hours:</span>
                    <strong>
                      {selectedMechanic.shift === "Morning"
                        ? "8:00 AM – 5:00 PM"
                        : selectedMechanic.shift === "Evening"
                        ? "2:00 PM – 11:00 PM"
                        : "10:00 PM – 7:00 AM"}
                    </strong>
                  </div>
                  <div>
                    <Calendar size={14} />
                    <span>Joining Date:</span>
                    <strong>{selectedMechanic.joiningDate || "2024-01-15"}</strong>
                  </div>
                  {selectedMechanic.emergencyContact && (
                    <div style={{ gridColumn: "1 / -1" }}>
                      <Phone size={14} />
                      <span>Emergency:</span>
                      <strong>{selectedMechanic.emergencyContact}</strong>
                    </div>
                  )}
                  <div>
                    <FileText size={14} />
                    <span>Assigned Jobs:</span>
                    <strong>{selectedMechanic.assignedJobs}</strong>
                  </div>
                  <div>
                    <Check size={14} />
                    <span>Completed Jobs:</span>
                    <strong>{selectedMechanic.completedJobs}</strong>
                  </div>
                  <div>
                    <Star size={14} />
                    <span>Average Rating:</span>
                    <strong>{selectedMechanic.rating.toFixed(1)} / 5.0</strong>
                  </div>
                </div>

                {selectedMechanic.notes && (
                  <section className="mechanic-notes">
                    <p>
                      <strong>
                        <span>
                          <Activity size={15} />
                          Certifications &amp; Notes:
                        </span>
                      </strong>
                      <br />
                      {selectedMechanic.notes}
                    </p>
                  </section>
                )}

                <section className="mechanic-assignments">
                  <h3>
                    <FileText size={15} />
                    Today's Assignments
                    <button onClick={() => notify(`Showing all assignments for ${selectedMechanic.name}.`)}>
                      View All
                    </button>
                  </h3>
                  <div className="mechanic-assignments-scroll">
                    <table style={{ width: "100%", tableLayout: "fixed" }}>
                      <thead>
                        <tr>
                          <th style={{ width: "32%" }}>WO #</th>
                          <th style={{ width: "44%" }}>Vehicle / Job</th>
                          <th style={{ width: "24%", textAlign: "center" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedMechanic.assignments || []).map((assignment) => (
                          <tr key={`${selectedMechanic.id}-${assignment.workOrder}`}>
                            <td style={{ fontWeight: 700, color: "#ea580c" }}>{assignment.workOrder}</td>
                            <td>
                              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {assignment.vehicle}
                              </div>
                              <small>{assignment.service}</small>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span
                                className={`assignment-status ${
                                  assignment.status === "Pending"
                                    ? "pending"
                                    : assignment.status === "Completed"
                                    ? "completed"
                                    : "in-progress"
                                }`}
                              >
                                {assignment.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {(!selectedMechanic.assignments || selectedMechanic.assignments.length === 0) && (
                          <tr>
                            <td colSpan={3} style={{ textAlign: "center", color: "#94a3b8", padding: "16px 8px", fontSize: "11px", whiteSpace: "normal" }}>
                              No active assignments assigned today.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <div className="mechanic-detail-actions" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <button
                    type="button"
                    style={{ color: "#ea580c", fontWeight: 600 }}
                    onClick={() => {
                      setPreSelectedMechanicForPay(selectedMechanic.id);
                      setIsPayModalOpen(true);
                    }}
                  >
                    <Coins size={14} />
                    Pay Salary
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMechanic(selectedMechanic);
                      setIsAddModalOpen(true);
                    }}
                  >
                    <Wrench size={14} />
                    Edit Profile
                  </button>
                </div>
              </aside>
            )}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SALARY & PAYROLL MANAGEMENT                                        */}
      {/* ========================================================================= */}
      {activeTab === "salary" && (
        <section aria-label="Salary and payroll management" className="no-print">
          {/* Top Payroll KPI Cards */}
          <section className="mechanics-metrics no-print" style={{ marginBottom: "14px" }}>
            <article>
              <span className="mechanics-metric-icon blue">
                <DollarSign size={21} />
              </span>
              <div>
                <strong>{money(totalMonthlyPayrollBudget)}</strong>
                <small>Total Monthly Budget</small>
              </div>
              <Activity size={23} className="mechanics-spark blue-text" />
            </article>

            <article>
              <span className="mechanics-metric-icon green">
                <CheckCircle2 size={20} />
              </span>
              <div>
                <strong style={{ color: "#16a34a" }}>{money(totalPaidThisMonth)}</strong>
                <small>Paid This Month ({selectedSalaryMonth})</small>
              </div>
              <Activity size={23} className="mechanics-spark green-text" />
            </article>

            <article>
              <span className="mechanics-metric-icon orange">
                <Coins size={20} />
              </span>
              <div>
                <strong style={{ color: "#ea580c" }}>{money(pendingSalaryAmount)}</strong>
                <small>Pending Salary to Disburse</small>
              </div>
              <Activity size={23} className="mechanics-spark orange-text" />
            </article>

            <article>
              <span className="mechanics-metric-icon purple">
                <UsersRound size={20} />
              </span>
              <div>
                <strong>{mechanics.length} Staff</strong>
                <small>Active Technicians on Payroll</small>
              </div>
              <Activity size={23} className="mechanics-spark purple-text" />
            </article>
          </section>

          {/* Payroll Records Card */}
          <div className="mechanics-list-card" style={{ width: "100%" }}>
            {/* Filter & Action Bar */}
            <div
              className="mechanics-filters"
              style={{
                gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
                alignItems: "center",
              }}
            >
              <label className="mechanics-search">
                <Search size={16} />
                <input
                  value={salarySearch}
                  onChange={(e) => {
                    setSalarySearch(e.target.value);
                    setSalaryPage(1);
                  }}
                  placeholder="Search by slip #, technician name, method, ref..."
                  aria-label="Search salary slips"
                />
              </label>

              <CustomDropdown
                value={selectedSalaryMonth}
                onChange={(val) => {
                  setSelectedSalaryMonth(val);
                  setSalaryPage(1);
                }}
                ariaLabel="Select payroll month"
                options={["All Months", ...availableMonths]}
              />

              <CustomDropdown
                value={salaryStatusFilter}
                onChange={(val) => {
                  setSalaryStatusFilter(val);
                  setSalaryPage(1);
                }}
                ariaLabel="Filter by payment status"
                options={[
                  { value: "All Status", label: "All Status" },
                  { value: "Paid", label: "Paid", badge: "Cleared", badgeColor: "green" },
                  { value: "Pending", label: "Pending", badge: "Due", badgeColor: "orange" },
                ]}
              />

              <button
                type="button"
                onClick={() => {
                  setPreSelectedMechanicForPay(mechanics[0]?.id || "");
                  setIsPayModalOpen(true);
                }}
                style={{
                  height: "36px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "0 14px",
                  borderRadius: "6px",
                  border: 0,
                  background: "linear-gradient(110deg, #ff631c, #ea580c)",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(234, 88, 12, 0.25)",
                }}
              >
                <Plus size={16} />
                <span>Record New Payment</span>
              </button>
            </div>

            {/* Payroll History Table */}
            <div className="mechanics-table-scroll">
              <table className="mechanics-management-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Slip No</th>
                    <th>Technician</th>
                    <th>Salary Month</th>
                    <th>Base Salary</th>
                    <th>Bonus / OT</th>
                    <th>Deductions</th>
                    <th>Net Paid</th>
                    <th>Payment Date</th>
                    <th>Payment Method</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageSalaries.map((slip, index) => (
                    <tr key={slip.slipNo || slip.id || index}>
                      <td>{(currentSalaryPage - 1) * pageSize + index + 1}</td>
                      <td>
                        <button
                          type="button"
                          className="mechanic-id-link"
                          onClick={() => setViewingSlip(slip)}
                          title="View Official Salary Slip"
                        >
                          {slip.slipNo || `SLIP-${index + 1}`}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <strong style={{ color: "#0f172a", fontSize: "12.5px" }}>{slip.mechanicName}</strong>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>{slip.role}</span>
                        </div>
                      </td>
                      <td>
                        <strong>{slip.month}</strong>
                      </td>
                      <td>{money(slip.baseSalary)}</td>
                      <td>
                        <span style={{ color: slip.bonus > 0 ? "#16a34a" : "#64748b", fontWeight: 600 }}>
                          {slip.bonus > 0 ? `+ ${money(slip.bonus)}` : "—"}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: slip.deductions > 0 ? "#dc2626" : "#64748b", fontWeight: 600 }}>
                          {slip.deductions > 0 ? `- ${money(slip.deductions)}` : "—"}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: "#ea580c", fontSize: "13px" }}>{money(slip.netSalary)}</strong>
                      </td>
                      <td>{slip.paymentDate}</td>
                      <td>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 600,
                            background:
                              slip.paymentMethod === "Bank Transfer"
                                ? "#eff6ff"
                                : slip.paymentMethod === "Cash"
                                ? "#f0fdf4"
                                : "#faf5ff",
                            color:
                              slip.paymentMethod === "Bank Transfer"
                                ? "#2563eb"
                                : slip.paymentMethod === "Cash"
                                ? "#16a34a"
                                : "#9333ea",
                            border: `1px solid ${
                              slip.paymentMethod === "Bank Transfer"
                                ? "#bfdbfe"
                                : slip.paymentMethod === "Cash"
                                ? "#bbf7d0"
                                : "#e9d5ff"
                            }`,
                          }}
                        >
                          {slip.paymentMethod}
                        </span>
                      </td>
                      <td>
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
                      </td>
                      <td>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <button
                            type="button"
                            className="mechanic-row-action"
                            title="View &amp; Print Pay Slip"
                            onClick={() => setViewingSlip(slip)}
                          >
                            <Printer size={14} style={{ color: "#ea580c" }} />
                          </button>
                          <button
                            type="button"
                            className="mechanic-row-action"
                            title="Remove Record"
                            onClick={() => setDeletingSlip(slip)}
                          >
                            <Trash2 size={14} style={{ color: "#e11d48" }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredSalaries.length === 0 && (
                    <tr>
                      <td colSpan={12} className="mechanics-empty">
                        No payroll disbursement records found for {selectedSalaryMonth}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <footer className="mechanics-table-footer">
              <span>
                Showing {filteredSalaries.length ? (currentSalaryPage - 1) * pageSize + 1 : 0} to{" "}
                {Math.min(currentSalaryPage * pageSize, filteredSalaries.length)} of {filteredSalaries.length} salary
                records
              </span>
              <div>
                <button
                  aria-label="Previous page"
                  disabled={currentSalaryPage === 1}
                  onClick={() => setSalaryPage(currentSalaryPage - 1)}
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: salaryPageCount }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    className={currentSalaryPage === pageNumber ? "active" : ""}
                    onClick={() => setSalaryPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  aria-label="Next page"
                  disabled={currentSalaryPage === salaryPageCount}
                  onClick={() => setSalaryPage(currentSalaryPage + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </footer>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* MODALS                                                                    */}
      {/* ========================================================================= */}

      {/* Add / Edit Mechanic Modal */}
      <AddMechanicModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingMechanic(null);
        }}
        onSave={handleSaveMechanic}
        notify={notify}
        initialData={editingMechanic as any}
      />

      {/* Pay Salary Modal */}
      <PaySalaryModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        onSave={handleSaveSalaryPayment}
        mechanics={mechanics}
        preSelectedMechanicId={preSelectedMechanicForPay}
        notify={notify}
      />

      {/* Printable Salary Slip Modal */}
      <SalarySlipModal
        isOpen={Boolean(viewingSlip)}
        onClose={() => setViewingSlip(null)}
        slip={viewingSlip}
      />

      {/* Delete Mechanic Confirmation */}
      <ConfirmDeleteModal
        isOpen={Boolean(deletingMechanic)}
        itemId={deletingMechanic?.id || deletingMechanic?.mechanicId || ""}
        itemType="Technician"
        title={`Remove Technician ${deletingMechanic?.name}?`}
        onConfirm={handleConfirmDeleteMechanic}
        onCancel={() => setDeletingMechanic(null)}
        isDeleting={false}
      />

      {/* Delete Salary Slip Confirmation */}
      <ConfirmDeleteModal
        isOpen={Boolean(deletingSlip)}
        itemId={deletingSlip?.slipNo || deletingSlip?.id || ""}
        itemType="Salary Slip"
        title={`Delete Salary Record ${deletingSlip?.slipNo}?`}
        onConfirm={handleConfirmDeleteSalary}
        onCancel={() => setDeletingSlip(null)}
        isDeleting={false}
      />
    </main>
  );
};

export default Mechanics;
