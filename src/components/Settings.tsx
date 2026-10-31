import React, { useState, useEffect, useRef } from "react";
import {
  Building2,
  Receipt,
  Wrench,
  Users,
  Database,
  Save,
  RotateCcw,
  Download,
  Upload,
  HardDrive,
  MapPin,
  Plus,
  Trash2,
  Check,
  RefreshCw,
  Sliders,
} from "lucide-react";
import { CustomDropdown } from "./CustomDropdown";

export interface GarageSettings {
  // Workshop Profile
  garageName: string;
  facilitySubtitle: string;
  ownerName: string;
  ownerRole: string;
  phone: string;
  whatsapp: string;
  email: string;
  crNumber: string;
  taxNumber: string;
  address: string;
  city: string;
  country: string;
  currency: string;
  operatingHours: string;
  logoUrl: string;

  // Invoicing & Tax
  taxRate: number;
  invoicePrefix: string;
  workOrderPrefix: string;
  quotationPrefix: string;
  quotationValidityDays: number;
  paymentTerms: string;
  showLogoOnPrint: boolean;
  showSignatureLine: boolean;
  showTaxBreakdown: boolean;
  autoInvoiceOnApproval: boolean;
  invoiceFooterNotes: string;
  gatePassDisclaimer: string;

  // Labor & Rates
  laborHourlyRate: number;
  diagnosticFee: number;
  inspectionFee: number;
  acRechargeFee: number;
  alignmentFee: number;

  // Payroll & Staff
  defaultCommissionRate: number;
  defaultBaseSalary: number;
  overtimeMultiplier: number;
  workingDaysPerMonth: number;
  wpsEmployerId: string;
  defaultPaymentMethod: string;
}

export interface ServiceCatalogItem {
  id: string;
  name: string;
  category: string;
  estimatedHours: number;
  standardRate: number;
}

export const SETTINGS_STORAGE_KEY = "garage_crm_settings_v1";
export const SERVICES_STORAGE_KEY = "garage_crm_services_catalog_v1";

export const defaultSettings: GarageSettings = {
  garageName: "Auto Care & Service Hub",
  facilitySubtitle: "Doha Central Workshop Facility · Bays 01–12",
  ownerName: "Sheikh Ahmed",
  ownerRole: "Garage Owner",
  phone: "+974 4455 6677",
  whatsapp: "+974 5512 3456",
  email: "service@dohacentralgarage.qa",
  crNumber: "CR-98412-QA",
  taxNumber: "QA-7749210",
  address: "Industrial Area, Street 24, Main Workshop Complex",
  city: "Doha",
  country: "Qatar",
  currency: "QAR",
  operatingHours: "Sat – Thu: 8:00 AM – 8:00 PM (Friday Closed)",
  logoUrl: "Garage-crm-logo-light.png",

  taxRate: 0,
  invoicePrefix: "INV-",
  workOrderPrefix: "WO-",
  quotationPrefix: "QT-",
  quotationValidityDays: 7,
  paymentTerms: "Due Upon Receipt",
  showLogoOnPrint: true,
  showSignatureLine: true,
  showTaxBreakdown: false,
  autoInvoiceOnApproval: true,
  invoiceFooterNotes:
    "Thank you for choosing Auto Care & Service Hub. All parts and services carry an official 30-day workshop warranty. Payment is due upon delivery.",
  gatePassDisclaimer:
    "The vehicle has passed safety verification inspection and is authorized for release from workshop bays.",

  laborHourlyRate: 150,
  diagnosticFee: 200,
  inspectionFee: 100,
  acRechargeFee: 250,
  alignmentFee: 180,

  defaultCommissionRate: 5,
  defaultBaseSalary: 4500,
  overtimeMultiplier: 1.25,
  workingDaysPerMonth: 26,
  wpsEmployerId: "QNBAQAQA-GARAGE",
  defaultPaymentMethod: "Bank Transfer",
};

export const defaultServicesCatalog: ServiceCatalogItem[] = [
  {
    id: "SRV-001",
    name: "Complete Engine Computer Diagnostics",
    category: "Diagnostics",
    estimatedHours: 1.5,
    standardRate: 200,
  },
  {
    id: "SRV-002",
    name: "Full Brake Pad & Rotor Replacement",
    category: "Brakes",
    estimatedHours: 2.0,
    standardRate: 350,
  },
  {
    id: "SRV-003",
    name: "Air Conditioning Gas Recharge & Leak Test",
    category: "AC & Climate",
    estimatedHours: 1.0,
    standardRate: 250,
  },
  {
    id: "SRV-004",
    name: "4-Wheel Computerized Alignment & Balancing",
    category: "Tyres & Suspension",
    estimatedHours: 1.5,
    standardRate: 180,
  },
  {
    id: "SRV-005",
    name: "Transmission Fluid Flush & Filter Renewal",
    category: "Transmission",
    estimatedHours: 2.5,
    standardRate: 450,
  },
  {
    id: "SRV-006",
    name: "Major Service & 45-Point Vehicle Inspection",
    category: "General Maintenance",
    estimatedHours: 3.0,
    standardRate: 550,
  },
];

type SettingsTab = "profile" | "invoicing" | "services" | "payroll" | "data";

export function SettingsView({ notify }: { notify: (msg: string) => void }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [settings, setSettings] = useState<GarageSettings>(defaultSettings);
  const [services, setServices] = useState<ServiceCatalogItem[]>(defaultServicesCatalog);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New service form modal/inline
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceCategory, setNewServiceCategory] = useState("Mechanical");
  const [newServiceHours, setNewServiceHours] = useState<number>(1.5);
  const [newServiceRate, setNewServiceRate] = useState<number>(200);
  const [showAddServiceForm, setShowAddServiceForm] = useState(false);

  // File import ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // Load persisted settings on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings((prev) => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      console.warn("Could not load settings from localStorage:", e);
    }

    try {
      const savedServices = localStorage.getItem(SERVICES_STORAGE_KEY);
      if (savedServices) {
        const parsedSrv = JSON.parse(savedServices);
        if (Array.isArray(parsedSrv) && parsedSrv.length > 0) {
          setServices(parsedSrv);
        }
      }
    } catch (e) {
      console.warn("Could not load services catalog:", e);
    }
  }, []);

  const handleChange = (key: keyof GarageSettings, value: any) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(
          new CustomEvent("garage-settings-updated", { detail: next })
        );
      } catch (err) {
        console.warn("Auto sync failed:", err);
      }
      return next;
    });
    setSaveSuccess(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      notify("Please select an image file (PNG, JPG, SVG, WebP).");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      notify("Image size is too large. Please select an image under 4 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result as string;
      if (dataUrl) {
        handleChange("logoUrl", dataUrl);
        notify("Company logo updated from computer! Applied across entire CRM.");
      }
    };
    reader.readAsDataURL(file);
    // Reset file input so same file can be selected again if needed
    e.target.value = "";
  };

  const handleResetLogo = () => {
    handleChange("logoUrl", "Garage-crm-logo-light.png");
    notify("Company logo reset to default.");
  };

  const handleSave = () => {
    setIsSaving(true);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(services));

      // Dispatch global event so header, documents and invoices immediately update
      window.dispatchEvent(
        new CustomEvent("garage-settings-updated", { detail: settings })
      );

      setSaveSuccess(true);
      notify("Workshop settings saved and updated successfully.");
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error("Failed to save settings:", err);
      notify(err.message || "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (
      window.confirm(
        "Are you sure you want to reset all workshop configuration fields to factory defaults?"
      )
    ) {
      setSettings(defaultSettings);
      setServices(defaultServicesCatalog);
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(defaultSettings));
      localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(defaultServicesCatalog));
      notify("Settings reset to defaults.");
    }
  };

  // Add new service item
  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;

    const newItem: ServiceCatalogItem = {
      id: `SRV-${String(services.length + 1).padStart(3, "0")}`,
      name: newServiceName.trim(),
      category: newServiceCategory,
      estimatedHours: Number(newServiceHours || 1),
      standardRate: Number(newServiceRate || 100),
    };

    const updated = [...services, newItem];
    setServices(updated);
    localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("garage_services_updated", { detail: updated }));
    setNewServiceName("");
    setShowAddServiceForm(false);
    notify(`Service "${newItem.name}" added to garage catalog.`);
  };

  const handleDeleteService = (id: string) => {
    const updated = services.filter((s) => s.id !== id);
    setServices(updated);
    localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("garage_services_updated", { detail: updated }));
    notify("Service removed from catalog.");
  };

  // Export Complete Backup JSON
  const handleExportBackup = () => {
    try {
      const backupData = {
        exportedAt: new Date().toISOString(),
        version: "1.0.0",
        settings,
        services,
        invoices: JSON.parse(localStorage.getItem("garage-pos-invoices") || "[]"),
        workOrders: JSON.parse(localStorage.getItem("garage_crm_work_orders_v1") || "[]"),
        quotations: JSON.parse(localStorage.getItem("garage_crm_quotations_v1") || "[]"),
        customers: JSON.parse(localStorage.getItem("garage_crm_customers_v1") || "[]"),
        vehicles: JSON.parse(localStorage.getItem("garage_crm_vehicles_v1") || "[]"),
        mechanics: JSON.parse(localStorage.getItem("garage_crm_mechanics_v1") || "[]"),
        salaries: JSON.parse(localStorage.getItem("garage_crm_mechanic_salaries_v1") || "[]"),
        partsInventory: JSON.parse(localStorage.getItem("garage_crm_parts_inventory_v1") || "[]"),
        sequences: {
          wo: localStorage.getItem("garage_work_order_seq"),
          inv: localStorage.getItem("garage_invoice_seq"),
          qt: localStorage.getItem("garage_quotation_seq"),
        },
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute(
        "download",
        `garage-crm-backup-${new Date().toISOString().split("T")[0]}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      notify("Complete CRM database backup downloaded successfully.");
    } catch (e: any) {
      console.error("Backup failed:", e);
      notify("Failed to generate backup JSON: " + e.message);
    }
  };

  // Restore Backup JSON
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json || typeof json !== "object") {
          throw new Error("Invalid backup JSON format.");
        }

        if (json.settings) {
          setSettings(json.settings);
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(json.settings));
          window.dispatchEvent(new CustomEvent("garage-settings-updated", { detail: json.settings }));
        }
        if (Array.isArray(json.services)) {
          setServices(json.services);
          localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(json.services));
          window.dispatchEvent(new CustomEvent("garage_services_updated", { detail: json.services }));
        }
        if (Array.isArray(json.invoices)) {
          localStorage.setItem("garage-pos-invoices", JSON.stringify(json.invoices));
        }
        if (Array.isArray(json.workOrders)) {
          localStorage.setItem("garage_crm_work_orders_v1", JSON.stringify(json.workOrders));
        }
        if (Array.isArray(json.quotations)) {
          localStorage.setItem("garage_crm_quotations_v1", JSON.stringify(json.quotations));
        }
        if (Array.isArray(json.customers)) {
          localStorage.setItem("garage_crm_customers_v1", JSON.stringify(json.customers));
        }
        if (Array.isArray(json.vehicles)) {
          localStorage.setItem("garage_crm_vehicles_v1", JSON.stringify(json.vehicles));
        }
        if (Array.isArray(json.mechanics)) {
          localStorage.setItem("garage_crm_mechanics_v1", JSON.stringify(json.mechanics));
        }
        if (Array.isArray(json.salaries)) {
          localStorage.setItem("garage_crm_mechanic_salaries_v1", JSON.stringify(json.salaries));
        }
        if (Array.isArray(json.partsInventory)) {
          localStorage.setItem("garage_crm_parts_inventory_v1", JSON.stringify(json.partsInventory));
        }
        if (json.sequences) {
          if (json.sequences.wo) localStorage.setItem("garage_work_order_seq", json.sequences.wo);
          if (json.sequences.inv) localStorage.setItem("garage_invoice_seq", json.sequences.inv);
          if (json.sequences.qt) localStorage.setItem("garage_quotation_seq", json.sequences.qt);
        }

        notify("Backup data restored successfully! Refreshing dashboard...");
        setTimeout(() => window.location.reload(), 1500);
      } catch (err: any) {
        console.error("Restore failed:", err);
        notify("Failed to restore backup: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Approximate Storage Calculation
  const getStorageSizeKB = () => {
    let total = 0;
    for (let x in localStorage) {
      if (localStorage.hasOwnProperty(x)) {
        total += ((localStorage[x].length + x.length) * 2);
      }
    }
    return (total / 1024).toFixed(1);
  };

  return (
    <main
      className="settings-page"
      style={{
        maxWidth: "1920px",
        margin: "0 auto",
        padding: "16px 20px 60px",
        color: "#14213a",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          marginBottom: "16px",
          flexWrap: "wrap",
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
              boxShadow: "0 4px 12px rgba(234, 88, 12, 0.25)",
            }}
          >
            <Sliders size={22} />
          </div>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "22px",
                fontWeight: 700,
                color: "#17223a",
              }}
            >
              Settings &amp; Workshop Configuration
            </h1>
            <p style={{ margin: "2px 0 0", color: "#667995", fontSize: "11.5px" }}>
              Configure garage profile, branding, invoice terms, labor rates, and database backups.
            </p>
          </div>
        </div>

        {/* Global Save Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={handleResetDefaults}
            style={{
              height: "38px",
              padding: "0 14px",
              background: "#ffffff",
              border: "1px solid #dfe5ee",
              borderRadius: "8px",
              color: "#64748b",
              fontSize: "12px",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
            }}
          >
            <RotateCcw size={14} />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{
              height: "38px",
              padding: "0 18px",
              background: saveSuccess
                ? "linear-gradient(110deg, #16a34a, #15803d)"
                : "linear-gradient(110deg, #ff631c, #ea580c)",
              border: 0,
              borderRadius: "8px",
              color: "#ffffff",
              fontSize: "12.5px",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              boxShadow: saveSuccess
                ? "0 2px 8px rgba(22, 163, 74, 0.3)"
                : "0 2px 8px rgba(234, 88, 12, 0.3)",
              transition: "all 0.2s ease",
            }}
          >
            {isSaving ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : saveSuccess ? (
              <Check size={16} />
            ) : (
              <Save size={15} />
            )}
            <span>{isSaving ? "Saving..." : saveSuccess ? "Saved Successfully" : "Save Changes"}</span>
          </button>
        </div>
      </header>

      {/* Navigation Sub-Tabs Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          marginBottom: "16px",
          overflowX: "auto",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "7px",
            border: 0,
            fontSize: "12.5px",
            fontWeight: 700,
            cursor: "pointer",
            background: activeTab === "profile" ? "#ff631c" : "transparent",
            color: activeTab === "profile" ? "#ffffff" : "#475569",
            transition: "all 0.15s ease",
            whiteSpace: "nowrap",
          }}
        >
          <Building2 size={16} />
          <span>Workshop Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("invoicing")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "7px",
            border: 0,
            fontSize: "12.5px",
            fontWeight: 700,
            cursor: "pointer",
            background: activeTab === "invoicing" ? "#ff631c" : "transparent",
            color: activeTab === "invoicing" ? "#ffffff" : "#475569",
            transition: "all 0.15s ease",
            whiteSpace: "nowrap",
          }}
        >
          <Receipt size={16} />
          <span>Invoicing, POS &amp; Tax</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("services")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "7px",
            border: 0,
            fontSize: "12.5px",
            fontWeight: 700,
            cursor: "pointer",
            background: activeTab === "services" ? "#ff631c" : "transparent",
            color: activeTab === "services" ? "#ffffff" : "#475569",
            transition: "all 0.15s ease",
            whiteSpace: "nowrap",
          }}
        >
          <Wrench size={16} />
          <span>Labor &amp; Service Rates</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("payroll")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "7px",
            border: 0,
            fontSize: "12.5px",
            fontWeight: 700,
            cursor: "pointer",
            background: activeTab === "payroll" ? "#ff631c" : "transparent",
            color: activeTab === "payroll" ? "#ffffff" : "#475569",
            transition: "all 0.15s ease",
            whiteSpace: "nowrap",
          }}
        >
          <Users size={16} />
          <span>Staff &amp; Payroll Rules</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("data")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "7px",
            border: 0,
            fontSize: "12.5px",
            fontWeight: 700,
            cursor: "pointer",
            background: activeTab === "data" ? "#ff631c" : "transparent",
            color: activeTab === "data" ? "#ffffff" : "#475569",
            transition: "all 0.15s ease",
            whiteSpace: "nowrap",
          }}
        >
          <Database size={16} />
          <span>Backup &amp; System Health</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: WORKSHOP PROFILE & BRANDING                                        */}
      {/* ========================================================================= */}
      {activeTab === "profile" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Card 1: Branding & Identity */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "16px",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "10px",
              }}
            >
              <Building2 size={18} style={{ color: "#ea580c" }} />
              <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#172640" }}>
                Workshop Branding &amp; Commercial Identity
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "16px",
              }}
            >
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#52647f", marginBottom: "5px" }}>
                  Garage / Business Name *
                </label>
                <input
                  type="text"
                  value={settings.garageName}
                  onChange={(e) => handleChange("garageName", e.target.value)}
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    color: "#1e293b",
                    fontWeight: 600,
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#52647f", marginBottom: "5px" }}>
                  Facility / Branch Subtitle
                </label>
                <input
                  type="text"
                  value={settings.facilitySubtitle}
                  onChange={(e) => handleChange("facilitySubtitle", e.target.value)}
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    color: "#1e293b",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#52647f", marginBottom: "5px" }}>
                  Commercial Registration (CR No) *
                </label>
                <input
                  type="text"
                  value={settings.crNumber}
                  onChange={(e) => handleChange("crNumber", e.target.value)}
                  placeholder="e.g. CR-98412-QA"
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    color: "#1e293b",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#52647f", marginBottom: "5px" }}>
                  Tax Identification / TIN Number
                </label>
                <input
                  type="text"
                  value={settings.taxNumber}
                  onChange={(e) => handleChange("taxNumber", e.target.value)}
                  placeholder="e.g. QA-7749210"
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    color: "#1e293b",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#52647f", marginBottom: "5px" }}>
                  Primary Currency *
                </label>
                <CustomDropdown
                  value={settings.currency}
                  onChange={(val) => handleChange("currency", val)}
                  options={[
                    { value: "QAR", label: "QAR (Qatari Riyal)", badge: "Default", badgeColor: "orange" },
                    { value: "USD", label: "USD ($ United States Dollar)", badge: "USD", badgeColor: "blue" },
                    { value: "AED", label: "AED (United Arab Emirates Dirham)", badge: "AED", badgeColor: "green" },
                    { value: "SAR", label: "SAR (Saudi Riyal)", badge: "SAR", badgeColor: "green" },
                  ]}
                />
              </div>

              <div
                style={{
                  gridColumn: "1 / -1",
                  marginTop: "6px",
                  padding: "16px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  border: "1px dashed #cbd5e1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "20px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "8px",
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      display: "grid",
                      placeItems: "center",
                      overflow: "hidden",
                      padding: "4px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    }}
                  >
                    <img
                      src={
                        settings.logoUrl?.startsWith("data:")
                          ? settings.logoUrl
                          : `${import.meta.env.BASE_URL}${settings.logoUrl || "Garage-crm-logo-light.png"}`
                      }
                      alt="Workshop Logo Preview"
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `${import.meta.env.BASE_URL}Garage-crm-logo-light.png`;
                      }}
                    />
                  </div>
                  <div>
                    <strong style={{ display: "block", fontSize: "13px", color: "#1e293b", fontWeight: 700 }}>
                      Official Company Logo
                    </strong>
                    <span style={{ fontSize: "11px", color: "#64748b", display: "block", marginTop: "2px" }}>
                      Upload image from your computer (PNG, JPG, SVG). Automatically updates on Splash Screen, Sidepanel, Quotations, POS &amp; Invoices.
                    </span>
                    <div style={{ display: "flex", gap: "10px", marginTop: "10px", alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={() => logoFileInputRef.current?.click()}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 14px",
                          borderRadius: "6px",
                          background: "#ff631c",
                          color: "#ffffff",
                          fontSize: "12px",
                          fontWeight: 600,
                          border: 0,
                          cursor: "pointer",
                          boxShadow: "0 2px 5px rgba(255, 99, 28, 0.25)",
                        }}
                      >
                        <Upload size={14} />
                        <span>Upload Logo from Computer</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleResetLogo}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          background: "#ffffff",
                          color: "#64748b",
                          fontSize: "12px",
                          fontWeight: 600,
                          border: "1px solid #cbd5e1",
                          cursor: "pointer",
                        }}
                      >
                        <RotateCcw size={13} />
                        <span>Reset Logo</span>
                      </button>

                      <input
                        ref={logoFileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleLogoUpload}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ minWidth: "220px", flex: "1 1 240px", maxWidth: "340px" }}>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#64748b", marginBottom: "4px" }}>
                    Logo Image Source / Path (Optional)
                  </label>
                  <input
                    type="text"
                    value={settings.logoUrl?.startsWith("data:") ? "[Uploaded Custom Logo File]" : settings.logoUrl}
                    onChange={(e) => {
                      if (e.target.value !== "[Uploaded Custom Logo File]") {
                        handleChange("logoUrl", e.target.value);
                      }
                    }}
                    placeholder="Garage-crm-logo-light.png"
                    style={{
                      width: "100%",
                      height: "34px",
                      padding: "0 10px",
                      border: "1px solid #dfe5ee",
                      borderRadius: "6px",
                      fontSize: "12px",
                      color: "#1e293b",
                      background: "#ffffff",
                      outline: "none",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Contact, Address & Management */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "16px",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "10px",
              }}
            >
              <MapPin size={18} style={{ color: "#ea580c" }} />
              <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#172640" }}>
                Contact Details &amp; Physical Workshop Location
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "16px",
              }}
            >
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#52647f", marginBottom: "5px" }}>
                  Workshop Telephone / Hotline *
                </label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    color: "#1e293b",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#52647f", marginBottom: "5px" }}>
                  Customer WhatsApp / Support Mobile
                </label>
                <input
                  type="text"
                  value={settings.whatsapp}
                  onChange={(e) => handleChange("whatsapp", e.target.value)}
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    color: "#1e293b",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#52647f", marginBottom: "5px" }}>
                  Official Email Address *
                </label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    color: "#1e293b",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#52647f", marginBottom: "5px" }}>
                  Operating Schedule / Working Hours
                </label>
                <input
                  type="text"
                  value={settings.operatingHours}
                  onChange={(e) => handleChange("operatingHours", e.target.value)}
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    color: "#1e293b",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#52647f", marginBottom: "5px" }}>
                  Workshop Physical Address (Prints on Invoices &amp; Gate Passes) *
                </label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    color: "#1e293b",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INVOICING, POS & TAX CONFIGURATION                                 */}
      {/* ========================================================================= */}
      {activeTab === "invoicing" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "16px",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "10px",
              }}
            >
              <Receipt size={18} style={{ color: "#ea580c" }} />
              <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#172640" }}>
                Billing, Document Prefixes &amp; Tax Policy
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "16px",
              }}
            >
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#52647f", marginBottom: "5px" }}>
                  Default VAT / Sales Tax Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  value={settings.taxRate}
                  onChange={(e) => handleChange("taxRate", Number(e.target.value))}
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    color: "#1e293b",
                    outline: "none",
                  }}
                />
                <span style={{ fontSize: "10.5px", color: "#64748b" }}>
                  Set to 0% for standard Qatar domestic automotive repair
                </span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#52647f", marginBottom: "5px" }}>
                  Invoice Sequence Prefix
                </label>
                <input
                  type="text"
                  value={settings.invoicePrefix}
                  onChange={(e) => handleChange("invoicePrefix", e.target.value)}
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    color: "#1e293b",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#52647f", marginBottom: "5px" }}>
                  Work Order Sequence Prefix
                </label>
                <input
                  type="text"
                  value={settings.workOrderPrefix}
                  onChange={(e) => handleChange("workOrderPrefix", e.target.value)}
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    color: "#1e293b",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#52647f", marginBottom: "5px" }}>
                  Quotation Sequence Prefix
                </label>
                <input
                  type="text"
                  value={settings.quotationPrefix}
                  onChange={(e) => handleChange("quotationPrefix", e.target.value)}
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    color: "#1e293b",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#52647f", marginBottom: "5px" }}>
                  Quotation Validity (Days)
                </label>
                <CustomDropdown
                  value={String(settings.quotationValidityDays)}
                  onChange={(val) => handleChange("quotationValidityDays", Number(val))}
                  options={[
                    { value: "7", label: "7 Calendar Days" },
                    { value: "14", label: "14 Calendar Days" },
                    { value: "30", label: "30 Calendar Days" },
                  ]}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#52647f", marginBottom: "5px" }}>
                  Default Payment Terms
                </label>
                <CustomDropdown
                  value={settings.paymentTerms}
                  onChange={(val) => handleChange("paymentTerms", val)}
                  options={[
                    { value: "Due Upon Receipt", label: "Due Upon Receipt" },
                    { value: "Net 15 Days", label: "Net 15 Days (Corporate Account)" },
                    { value: "Net 30 Days", label: "Net 30 Days (Fleet Contract)" },
                  ]}
                />
              </div>
            </div>

            {/* Checkbox Toggles */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "12px",
                marginTop: "20px",
                padding: "14px",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12px" }}>
                <input
                  type="checkbox"
                  checked={settings.showLogoOnPrint}
                  onChange={(e) => handleChange("showLogoOnPrint", e.target.checked)}
                  style={{ accentColor: "#ff631c", width: "16px", height: "16px" }}
                />
                <span style={{ fontWeight: 600, color: "#1e293b" }}>
                  Print Company Logo on Invoices &amp; Quotations
                </span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12px" }}>
                <input
                  type="checkbox"
                  checked={settings.showSignatureLine}
                  onChange={(e) => handleChange("showSignatureLine", e.target.checked)}
                  style={{ accentColor: "#ff631c", width: "16px", height: "16px" }}
                />
                <span style={{ fontWeight: 600, color: "#1e293b" }}>
                  Include Customer Sign-off Block on Gate Pass
                </span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12px" }}>
                <input
                  type="checkbox"
                  checked={settings.autoInvoiceOnApproval}
                  onChange={(e) => handleChange("autoInvoiceOnApproval", e.target.checked)}
                  style={{ accentColor: "#ff631c", width: "16px", height: "16px" }}
                />
                <span style={{ fontWeight: 600, color: "#1e293b" }}>
                  Auto-create Tax Invoice when Quotation is Approved
                </span>
              </label>
            </div>

            {/* Terms and Footers Textarea */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px", marginTop: "18px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#52647f", marginBottom: "5px" }}>
                  Standard Invoice Warranty &amp; Footer Terms
                </label>
                <textarea
                  rows={3}
                  value={settings.invoiceFooterNotes}
                  onChange={(e) => handleChange("invoiceFooterNotes", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: "#1e293b",
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#52647f", marginBottom: "5px" }}>
                  Gate Pass Security Disclaimer
                </label>
                <textarea
                  rows={3}
                  value={settings.gatePassDisclaimer}
                  onChange={(e) => handleChange("gatePassDisclaimer", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: "#1e293b",
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LABOR & SERVICE RATES CATALOG                                      */}
      {/* ========================================================================= */}
      {activeTab === "services" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Base rates cards */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "16px",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "10px",
              }}
            >
              <Wrench size={18} style={{ color: "#ea580c" }} />
              <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#172640" }}>
                Default Workshop Hourly &amp; Diagnostic Charges
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "14px",
              }}
            >
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#52647f", marginBottom: "5px" }}>
                  Standard Labor Rate (QAR / Hr) *
                </label>
                <input
                  type="number"
                  min="50"
                  step="10"
                  value={settings.laborHourlyRate}
                  onChange={(e) => handleChange("laborHourlyRate", Number(e.target.value))}
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#0f172a",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#52647f", marginBottom: "5px" }}>
                  Computer Diagnostics Fee (QAR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={settings.diagnosticFee}
                  onChange={(e) => handleChange("diagnosticFee", Number(e.target.value))}
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#0f172a",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#52647f", marginBottom: "5px" }}>
                  AC Recharge &amp; Test (QAR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={settings.acRechargeFee}
                  onChange={(e) => handleChange("acRechargeFee", Number(e.target.value))}
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#0f172a",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#52647f", marginBottom: "5px" }}>
                  Wheel Alignment Charge (QAR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={settings.alignmentFee}
                  onChange={(e) => handleChange("alignmentFee", Number(e.target.value))}
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#0f172a",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Service catalog management table */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "10px",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#172640" }}>
                  Standard Workshop Services Catalog ({services.length} services)
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#64748b" }}>
                  Pre-configured services automatically suggested in New Intake &amp; Quotations
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddServiceForm(!showAddServiceForm)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "6px",
                  background: "#ff631c",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: 0,
                  cursor: "pointer",
                }}
              >
                <Plus size={14} />
                <span>Add Service</span>
              </button>
            </div>

            {/* Inline add service form */}
            {showAddServiceForm && (
              <form
                onSubmit={handleAddService}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "10px",
                  padding: "14px",
                  background: "#fff7ed",
                  border: "1px solid #fed7aa",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  alignItems: "flex-end",
                }}
              >
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#9a3412", marginBottom: "4px" }}>
                    Service Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Engine Valve Clearance Adjustment"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    style={{ width: "100%", height: "34px", padding: "0 8px", borderRadius: "5px", border: "1px solid #fdba74", fontSize: "12px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#9a3412", marginBottom: "4px" }}>
                    Category
                  </label>
                  <input
                    type="text"
                    value={newServiceCategory}
                    onChange={(e) => setNewServiceCategory(e.target.value)}
                    style={{ width: "100%", height: "34px", padding: "0 8px", borderRadius: "5px", border: "1px solid #fdba74", fontSize: "12px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#9a3412", marginBottom: "4px" }}>
                    Est. Hours
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={newServiceHours}
                    onChange={(e) => setNewServiceHours(Number(e.target.value))}
                    style={{ width: "100%", height: "34px", padding: "0 8px", borderRadius: "5px", border: "1px solid #fdba74", fontSize: "12px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#9a3412", marginBottom: "4px" }}>
                    Rate (QAR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={newServiceRate}
                    onChange={(e) => setNewServiceRate(Number(e.target.value))}
                    style={{ width: "100%", height: "34px", padding: "0 8px", borderRadius: "5px", border: "1px solid #fdba74", fontSize: "12px" }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    height: "34px",
                    padding: "0 14px",
                    borderRadius: "5px",
                    background: "#ea580c",
                    color: "#ffffff",
                    border: 0,
                    fontWeight: 600,
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  Save Item
                </button>
              </form>
            )}

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left", color: "#64748b" }}>
                    <th style={{ padding: "8px 10px", fontWeight: 600 }}>Code</th>
                    <th style={{ padding: "8px 10px", fontWeight: 600 }}>Service Description</th>
                    <th style={{ padding: "8px 10px", fontWeight: 600 }}>Department</th>
                    <th style={{ padding: "8px 10px", fontWeight: 600 }}>Est. Time</th>
                    <th style={{ padding: "8px 10px", fontWeight: 600 }}>Standard Charge</th>
                    <th style={{ padding: "8px 10px", fontWeight: 600, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((srv) => (
                    <tr key={srv.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: "#475569" }}>{srv.id}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 600, color: "#0f172a" }}>{srv.name}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <span style={{ padding: "2px 7px", borderRadius: "4px", background: "#f1f5f9", fontSize: "11px", color: "#475569" }}>
                          {srv.category}
                        </span>
                      </td>
                      <td style={{ padding: "8px 10px", color: "#64748b" }}>{srv.estimatedHours} hrs</td>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: "#ea580c" }}>
                        QAR {srv.standardRate.toFixed(2)}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteService(srv.id)}
                          style={{
                            background: "transparent",
                            border: 0,
                            color: "#dc2626",
                            cursor: "pointer",
                            padding: "4px",
                          }}
                          title="Delete Service"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: STAFF & PAYROLL RULES                                              */}
      {/* ========================================================================= */}
      {activeTab === "payroll" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "16px",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "10px",
              }}
            >
              <Users size={18} style={{ color: "#ea580c" }} />
              <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#172640" }}>
                Technician Compensation, Incentive &amp; WPS Configuration
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "16px",
              }}
            >
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#52647f", marginBottom: "5px" }}>
                  Default Job Commission Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  value={settings.defaultCommissionRate}
                  onChange={(e) => handleChange("defaultCommissionRate", Number(e.target.value))}
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    color: "#1e293b",
                    outline: "none",
                  }}
                />
                <span style={{ fontSize: "10.5px", color: "#64748b" }}>
                  Automated incentive bonus percentage for technicians on job completion
                </span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#52647f", marginBottom: "5px" }}>
                  Default Base Monthly Salary (QAR)
                </label>
                <input
                  type="number"
                  min="1000"
                  step="100"
                  value={settings.defaultBaseSalary}
                  onChange={(e) => handleChange("defaultBaseSalary", Number(e.target.value))}
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    color: "#1e293b",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#52647f", marginBottom: "5px" }}>
                  Overtime Pay Multiplier
                </label>
                <CustomDropdown
                  value={String(settings.overtimeMultiplier)}
                  onChange={(val) => handleChange("overtimeMultiplier", Number(val))}
                  options={[
                    { value: "1.25", label: "1.25x Normal Hourly Rate (Standard)" },
                    { value: "1.5", label: "1.50x Normal Hourly Rate (Friday/Weekend)" },
                    { value: "2", label: "2.00x Normal Hourly Rate (Holiday Special)" },
                  ]}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#52647f", marginBottom: "5px" }}>
                  Wage Protection System (WPS) ID
                </label>
                <input
                  type="text"
                  value={settings.wpsEmployerId}
                  onChange={(e) => handleChange("wpsEmployerId", e.target.value)}
                  placeholder="e.g. QNBAQAQA-GARAGE"
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 10px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    color: "#1e293b",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#52647f", marginBottom: "5px" }}>
                  Default Salary Disbursement Method
                </label>
                <CustomDropdown
                  value={settings.defaultPaymentMethod || "Bank Transfer"}
                  onChange={(val) => handleChange("defaultPaymentMethod", val)}
                  options={[
                    { value: "Bank Transfer", label: "Bank Transfer (WPS Direct)", badge: "WPS", badgeColor: "blue" },
                    { value: "Cash", label: "Cash Counter Disbursement", badge: "Cash", badgeColor: "green" },
                    { value: "Cheque", label: "Corporate Bank Cheque", badge: "Cheque", badgeColor: "orange" },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: BACKUP, RESTORE & SYSTEM HEALTH                                    */}
      {/* ========================================================================= */}
      {activeTab === "data" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Backup & restore card */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "16px",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "10px",
              }}
            >
              <Database size={18} style={{ color: "#ea580c" }} />
              <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#172640" }}>
                Database Backup &amp; Instant Snapshot Restoration
              </h2>
            </div>

            <p style={{ margin: "0 0 16px", fontSize: "12px", color: "#64748b" }}>
              Export a standalone snapshot of all workshop invoices, work orders, customers, vehicles,
              mechanics, and stock items. Backups can be archived or restored instantly on any device.
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleExportBackup}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 18px",
                  borderRadius: "7px",
                  background: "linear-gradient(110deg, #ff631c, #ea580c)",
                  color: "#ffffff",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  border: 0,
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(234, 88, 12, 0.25)",
                }}
              >
                <Download size={15} />
                <span>Export Full CRM Backup (JSON)</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 18px",
                  borderRadius: "7px",
                  background: "#f8fafc",
                  color: "#1e293b",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  border: "1px solid #cbd5e1",
                  cursor: "pointer",
                }}
              >
                <Upload size={15} />
                <span>Restore Backup From File</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: "none" }}
                onChange={handleImportBackup}
              />
            </div>
          </div>

          {/* System storage diagnostic card */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "16px",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "10px",
              }}
            >
              <HardDrive size={18} style={{ color: "#2563eb" }} />
              <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#172640" }}>
                System Diagnostics &amp; Storage Footprint
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "12px",
              }}
            >
              <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "11px", color: "#64748b" }}>Local Storage Cache</span>
                <strong style={{ display: "block", fontSize: "16px", color: "#0f172a", marginTop: "2px" }}>
                  {getStorageSizeKB()} KB Used
                </strong>
                <span style={{ fontSize: "10px", color: "#16a34a" }}>Healthy (under 5 MB limit)</span>
              </div>

              <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "11px", color: "#64748b" }}>Active Database Engine</span>
                <strong style={{ display: "block", fontSize: "16px", color: "#0f172a", marginTop: "2px" }}>
                  MongoDB Atlas
                </strong>
                <span style={{ fontSize: "10px", color: "#16a34a" }}>● Cloud Synced</span>
              </div>

              <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "11px", color: "#64748b" }}>Client Version</span>
                <strong style={{ display: "block", fontSize: "16px", color: "#0f172a", marginTop: "2px" }}>
                  Garage Workspace v1.0.0
                </strong>
                <span style={{ fontSize: "10px", color: "#64748b" }}>Production Build</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default SettingsView;
