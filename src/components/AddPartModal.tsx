import React, { useState, useEffect } from "react";
import { X, Plus, Box, Tag, Pencil, Coins } from "lucide-react";

interface AddPartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (partData: any) => Promise<void>;
  notify?: (message: string) => void;
  initialData?: any;
}

// Comprehensive real-world car part presets for quick selection
export const REAL_WORLD_PART_PRESETS = [
  {
    category: "Engine Oil & Lubricants",
    items: [
      { name: "Engine Oil 5W-30 (Fully Synthetic - 4L)", category: "Engine Oil", brand: "Mobil 1", unitCost: 95, sellingPrice: 145, commission: 20, compatibility: "Universal / Multi-Vehicle" },
      { name: "Engine Oil 5W-40 (Fully Synthetic - 4L)", category: "Engine Oil", brand: "Castrol Edge", unitCost: 100, sellingPrice: 155, commission: 20, compatibility: "Universal / Multi-Vehicle" },
      { name: "Engine Oil 0W-20 (Synthetic Eco - 4L)", category: "Engine Oil", brand: "Toyota Genuine", unitCost: 110, sellingPrice: 170, commission: 25, compatibility: "Toyota, Lexus, Honda" },
      { name: "Engine Oil 10W-40 (Semi-Synthetic - 4L)", category: "Engine Oil", brand: "Castrol Magnatec", unitCost: 70, sellingPrice: 110, commission: 15, compatibility: "Universal" },
      { name: "Automatic Transmission Fluid (ATF WS - 4L)", category: "Fluids", brand: "Toyota Genuine", unitCost: 135, sellingPrice: 195, commission: 25, compatibility: "Toyota / Lexus 6-Speed & 8-Speed" },
      { name: "CVT Transmission Fluid (4L)", category: "Fluids", brand: "Nissan NS-3", unitCost: 145, sellingPrice: 210, commission: 25, compatibility: "Nissan, Infiniti, Renault" },
      { name: "Brake Fluid DOT 4 (500ml)", category: "Fluids", brand: "Bosch", unitCost: 25, sellingPrice: 45, commission: 5, compatibility: "Universal All Vehicles" },
      { name: "Radiator Coolant / Antifreeze Long Life (4L)", category: "Fluids", brand: "Toyota Super Long Life", unitCost: 50, sellingPrice: 85, commission: 10, compatibility: "Toyota, Lexus, Multi-Vehicle" },
      { name: "Power Steering Fluid (1L)", category: "Fluids", brand: "Castrol", unitCost: 30, sellingPrice: 55, commission: 10, compatibility: "Universal Hydraulic Steering" },
    ],
  },
  {
    category: "Brake System",
    items: [
      { name: "Front Brake Pads (Ceramic Set)", category: "Brakes", brand: "Brembo", unitCost: 190, sellingPrice: 280, commission: 40, compatibility: "Toyota Land Cruiser, Lexus LX570" },
      { name: "Rear Brake Pads (Ceramic Set)", category: "Brakes", brand: "Brembo", unitCost: 165, sellingPrice: 240, commission: 35, compatibility: "Toyota Land Cruiser, Lexus LX570" },
      { name: "Front Brake Discs / Rotors (Vented Pair)", category: "Brakes", brand: "Brembo", unitCost: 340, sellingPrice: 490, commission: 50, compatibility: "Toyota Land Cruiser, Nissan Patrol" },
      { name: "Rear Brake Discs / Rotors (Solid Pair)", category: "Brakes", brand: "Brembo", unitCost: 290, sellingPrice: 420, commission: 45, compatibility: "Toyota Land Cruiser, Nissan Patrol" },
      { name: "Brake Caliper Assembly (Front Right/Left)", category: "Brakes", brand: "Bosch", unitCost: 360, sellingPrice: 520, commission: 60, compatibility: "Multi-Fit / OEM Spec" },
      { name: "Brake Master Cylinder Assembly", category: "Brakes", brand: "Advics", unitCost: 280, sellingPrice: 410, commission: 45, compatibility: "Toyota Land Cruiser, Prado" },
    ],
  },
  {
    category: "Filters",
    items: [
      { name: "Engine Oil Filter (Spin-on / Cartridge)", category: "Filters", brand: "Mann-Filter", unitCost: 25, sellingPrice: 48, commission: 8, compatibility: "Toyota, Lexus, Nissan, BMW" },
      { name: "Engine Air Intake Filter", category: "Filters", brand: "Mann-Filter", unitCost: 45, sellingPrice: 85, commission: 15, compatibility: "Toyota Land Cruiser, Prado" },
      { name: "AC Cabin Pollen & Carbon Filter", category: "Filters", brand: "Mann-Filter", unitCost: 40, sellingPrice: 80, commission: 15, compatibility: "Toyota, Lexus, Nissan, Honda" },
      { name: "Fuel Filter Assembly (In-Tank)", category: "Filters", brand: "Bosch", unitCost: 75, sellingPrice: 130, commission: 20, compatibility: "Toyota, Nissan, Mitsubishi" },
      { name: "Transmission Filter Kit with Gasket", category: "Filters", brand: "Toyota Genuine", unitCost: 120, sellingPrice: 185, commission: 25, compatibility: "Toyota Land Cruiser A750 / AB60" },
    ],
  },
  {
    category: "Ignition & Electrical",
    items: [
      { name: "Iridium Spark Plugs (Set of 4)", category: "Ignition", brand: "NGK Laser Iridium", unitCost: 130, sellingPrice: 195, commission: 25, compatibility: "Toyota Corolla, Camry, RAV4, Civic" },
      { name: "Iridium Spark Plugs (Set of 6)", category: "Ignition", brand: "NGK Laser Iridium", unitCost: 195, sellingPrice: 290, commission: 35, compatibility: "Toyota Prado V6, Lexus ES, Pajero" },
      { name: "Iridium Spark Plugs (Set of 8)", category: "Ignition", brand: "Denso Iridium Power", unitCost: 260, sellingPrice: 380, commission: 50, compatibility: "Toyota Land Cruiser V8, Patrol V8" },
      { name: "Ignition Coil Pack (Single)", category: "Ignition", brand: "Denso", unitCost: 140, sellingPrice: 220, commission: 30, compatibility: "Toyota 1GR-FE / 3UR-FE" },
      { name: "Car Battery 12V 60Ah (Maintenance Free)", category: "Electrical", brand: "Varta Blue Dynamic", unitCost: 280, sellingPrice: 390, commission: 45, compatibility: "Sedans / Compact SUVs" },
      { name: "Car Battery 12V 70Ah (Heavy Duty)", category: "Electrical", brand: "Varta Silver Dynamic", unitCost: 340, sellingPrice: 480, commission: 55, compatibility: "SUVs / Light Trucks" },
      { name: "Car Battery 12V 80Ah AGM (Stop-Start)", category: "Electrical", brand: "Bosch S5 AGM", unitCost: 520, sellingPrice: 720, commission: 75, compatibility: "BMW, Mercedes, Audi, Lexus" },
      { name: "Alternator 12V 130A Assembly", category: "Electrical", brand: "Denso", unitCost: 680, sellingPrice: 980, commission: 100, compatibility: "Toyota Land Cruiser, Lexus LX" },
      { name: "Starter Motor Assembly 12V", category: "Electrical", brand: "Denso", unitCost: 580, sellingPrice: 840, commission: 90, compatibility: "Toyota Land Cruiser, Prado" },
      { name: "Headlight LED Bulbs Pair (H7/H4/H11)", category: "Electrical", brand: "Philips Ultinon", unitCost: 110, sellingPrice: 185, commission: 30, compatibility: "Universal Bulb Fitment" },
    ],
  },
  {
    category: "Suspension & Steering",
    items: [
      { name: "Front Shock Absorber / Strut (Pair)", category: "Suspension", brand: "KYB Excel-G", unitCost: 460, sellingPrice: 680, commission: 80, compatibility: "Toyota Land Cruiser, Prado" },
      { name: "Rear Shock Absorber (Pair)", category: "Suspension", brand: "KYB Gas-A-Just", unitCost: 380, sellingPrice: 560, commission: 70, compatibility: "Toyota Land Cruiser, Patrol" },
      { name: "Front Lower Control Arm with Ball Joint", category: "Suspension", brand: "555 Japan", unitCost: 250, sellingPrice: 380, commission: 50, compatibility: "Toyota Prado, Hilux, Fortuner" },
      { name: "Tie Rod End Set (Inner + Outer)", category: "Suspension", brand: "555 Japan", unitCost: 130, sellingPrice: 210, commission: 30, compatibility: "Toyota Land Cruiser, Lexus" },
      { name: "Sway Bar Stabilizer Link (Front Pair)", category: "Suspension", brand: "555 Japan", unitCost: 85, sellingPrice: 150, commission: 20, compatibility: "Toyota Land Cruiser, Prado" },
      { name: "Wheel Bearing & Hub Assembly", category: "Suspension", brand: "SKF", unitCost: 240, sellingPrice: 360, commission: 45, compatibility: "Toyota Land Cruiser, Nissan Patrol" },
    ],
  },
  {
    category: "Engine, Belts & Cooling",
    items: [
      { name: "Serpentine Drive Belt (Multi-Ribbed)", category: "Engine", brand: "Gates Micro-V", unitCost: 75, sellingPrice: 125, commission: 20, compatibility: "Toyota 1GR-FE / 2UZ-FE / 3UR" },
      { name: "Timing Belt Kit with Water Pump", category: "Engine", brand: "Gates PowerGrip", unitCost: 320, sellingPrice: 480, commission: 65, compatibility: "Toyota 2UZ-FE V8, Lexus LX470" },
      { name: "Engine Water Pump Assembly", category: "Engine", brand: "GMB Japan", unitCost: 190, sellingPrice: 290, commission: 40, compatibility: "Toyota Land Cruiser, Prado" },
      { name: "Engine Thermostat with Gasket", category: "Cooling", brand: "Tama Japan", unitCost: 65, sellingPrice: 110, commission: 15, compatibility: "Toyota Land Cruiser, Camry" },
      { name: "Aluminum Core Engine Radiator", category: "Cooling", brand: "Denso", unitCost: 420, sellingPrice: 620, commission: 70, compatibility: "Toyota Land Cruiser V8, Patrol" },
      { name: "Valve Cover Gasket Set (Pair)", category: "Engine", brand: "Victor Reinz", unitCost: 95, sellingPrice: 160, commission: 25, compatibility: "Toyota V6 / V8 Engines" },
    ],
  },
  {
    category: "Body & Wipers",
    items: [
      { name: "Front Wiper Blades Pair (22\" + 20\")", category: "Body", brand: "Bosch Aerotwin", unitCost: 50, sellingPrice: 90, commission: 15, compatibility: "Universal Hook Fitment" },
      { name: "Rear Wiper Blade (12\" / 14\")", category: "Body", brand: "Bosch Rear", unitCost: 25, sellingPrice: 45, commission: 8, compatibility: "SUV Hatchback Universal" },
      { name: "Oxygen (O2) Sensor Upstream", category: "Engine", brand: "Denso", unitCost: 220, sellingPrice: 340, commission: 45, compatibility: "Toyota Land Cruiser, Lexus" },
    ],
  },
];

export const CATEGORY_OPTIONS = [
  "Engine Oil",
  "Brakes",
  "Filters",
  "Ignition",
  "Electrical",
  "Suspension",
  "Cooling",
  "Engine",
  "Transmission",
  "Body",
  "Fluids",
  "Other",
];

export const BRAND_OPTIONS = [
  "Toyota Genuine",
  "Mobil 1",
  "Castrol",
  "Bosch",
  "Brembo",
  "Mann-Filter",
  "NGK",
  "Denso",
  "Gates",
  "Varta",
  "KYB",
  "SKF",
  "555 Japan",
  "Liqui Moly",
  "Motul",
  "OEM Genuine",
  "Aftermarket",
];

export default function AddPartModal({ isOpen, onClose, onSave, notify, initialData }: AddPartModalProps) {
  const [selectedPreset, setSelectedPreset] = useState("");
  const [name, setName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [category, setCategory] = useState("Engine Oil");
  const [brand, setBrand] = useState("Mobil 1");
  const [compatibility, setCompatibility] = useState("Universal");
  const [quantity, setQuantity] = useState("10");
  const [lowStockAt, setLowStockAt] = useState("5");
  const [unitCost, setUnitCost] = useState("80");
  const [sellingPrice, setSellingPrice] = useState("120");
  const [commission, setCommission] = useState("15");
  const [supplier, setSupplier] = useState("Al-Futtaim Auto Parts");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setPartNumber(initialData.partNumber || "");
      setCategory(initialData.category || "Engine Oil");
      setBrand(initialData.brand || "Mobil 1");
      setCompatibility(initialData.compatibility || "Universal");
      setQuantity(String(initialData.quantity ?? 10));
      setLowStockAt(String(initialData.lowStockAt ?? 5));
      setUnitCost(String(initialData.unitCost ?? 80));
      setSellingPrice(String(initialData.sellingPrice ?? 120));
      setCommission(String(initialData.commission ?? 15));
      setSupplier(initialData.supplier || "");
      setSelectedPreset("");
    } else {
      setName("");
      setPartNumber("");
      setCategory("Engine Oil");
      setBrand("Mobil 1");
      setCompatibility("Universal");
      setQuantity("10");
      setLowStockAt("5");
      setUnitCost("80");
      setSellingPrice("120");
      setCommission("15");
      setSupplier("Al-Futtaim Auto Parts");
      setSelectedPreset("");
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handlePresetChange = (presetName: string) => {
    setSelectedPreset(presetName);
    if (!presetName) return;

    for (const group of REAL_WORLD_PART_PRESETS) {
      const found = group.items.find((item) => item.name === presetName);
      if (found) {
        setName(found.name);
        setCategory(found.category);
        setBrand(found.brand);
        setUnitCost(String(found.unitCost));
        setSellingPrice(String(found.sellingPrice));
        setCommission(String(found.commission));
        setCompatibility(found.compatibility);
        break;
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      notify?.("Part name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        partNumber: partNumber.trim(),
        category: category.trim(),
        brand: brand.trim(),
        compatibility: compatibility.trim(),
        quantity: Math.max(0, parseInt(quantity, 10) || 0),
        lowStockAt: Math.max(0, parseInt(lowStockAt, 10) || 5),
        unitCost: Math.max(0, parseFloat(unitCost) || 0),
        sellingPrice: Math.max(0, parseFloat(sellingPrice) || 0),
        commission: Math.max(0, parseFloat(commission) || 0),
        supplier: supplier.trim(),
      });
      onClose();
    } catch (err: any) {
      notify?.(`Error saving part: ${err.message || "Failed to save"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="view-info-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <section
        className="view-info-modal-card"
        style={{
          maxWidth: "980px",
          width: "95vw",
          height: "auto",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "8px",
          overflow: "hidden",
        }}
        role="dialog"
        aria-modal="true"
        aria-label={initialData ? "Edit Car Part" : "Add New Car Part"}
        onClick={(e) => e.stopPropagation()}
      >
        {/* CRM Theme Header */}
        <div className="view-info-header">
          <div className="view-info-header-identity">
            <div className="view-info-avatar">
              {initialData ? <Pencil size={17} /> : <Box size={18} />}
            </div>
            <div className="view-info-header-titles">
              <h2>{initialData ? "Edit Car Part" : "Add New Car Part"}</h2>
              <span className="view-info-header-sub">
                {initialData
                  ? "Modify automotive replacement part details and update inventory."
                  : "Enter real-world automotive replacement part details to save in inventory."}
              </span>
            </div>
          </div>
          <div className="view-info-header-actions">
            <button
              type="button"
              className="view-info-close-btn"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
        >
          <div className="view-info-body" style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>
            {/* Quick Real-World Part Preset Picker */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 14px",
                background: "#fff7ed",
                borderRadius: "6px",
                border: "1px solid #fed7aa",
                marginBottom: "14px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#9a3412",
                  fontSize: "11px",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                <Tag size={14} style={{ color: "#ff631c" }} />
                <span>Quick Select Standard Car Part:</span>
              </div>
              <select
                id="part-preset"
                value={selectedPreset}
                onChange={(e) => handlePresetChange(e.target.value)}
                style={{
                  flex: 1,
                  height: "32px",
                  padding: "0 10px",
                  borderRadius: "5px",
                  border: "1px solid #fed7aa",
                  background: "#ffffff",
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "#1e293b",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="">-- Choose from 40+ common workshop parts (or enter custom specifications below) --</option>
                {REAL_WORLD_PART_PRESETS.map((group) => (
                  <optgroup key={group.category} label={`📂 ${group.category}`}>
                    {group.items.map((item) => (
                      <option key={item.name} value={item.name}>
                        {item.name} ({item.brand})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Horizontal 2-Column Grid matching View Info Card structure */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.15fr 1fr",
                gap: "14px",
                alignItems: "stretch",
              }}
            >
              {/* Left Column Card: Part Identification & Specifications */}
              <div
                className="view-info-card"
                style={{ display: "flex", flexDirection: "column", gap: "11px" }}
              >
                <div className="view-info-card-title">
                  <Box size={14} />
                  <h3>Part Identification &amp; Specifications</h3>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "10px", fontWeight: 600, color: "#52647f", marginBottom: "3px" }}>
                      Part Name <span style={{ color: "#e11d48" }}>*</span>
                    </label>
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Front Brake Pads (Ceramic Set)"
                      style={{
                        width: "100%",
                        height: "32px",
                        padding: "0 10px",
                        border: "1px solid #dfe5ee",
                        borderRadius: "5px",
                        fontSize: "11px",
                        color: "#1e293b",
                        background: "#ffffff",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "10px", fontWeight: 600, color: "#52647f", marginBottom: "3px" }}>
                      Part No. / OEM SKU
                    </label>
                    <input
                      value={partNumber}
                      onChange={(e) => setPartNumber(e.target.value)}
                      placeholder="e.g. 04465-35290 / PRT-102"
                      style={{
                        width: "100%",
                        height: "32px",
                        padding: "0 10px",
                        border: "1px solid #dfe5ee",
                        borderRadius: "5px",
                        fontSize: "11px",
                        color: "#1e293b",
                        background: "#ffffff",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "10px", fontWeight: 600, color: "#52647f", marginBottom: "3px" }}>
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      style={{
                        width: "100%",
                        height: "32px",
                        padding: "0 10px",
                        border: "1px solid #dfe5ee",
                        borderRadius: "5px",
                        fontSize: "11px",
                        color: "#1e293b",
                        background: "#ffffff",
                        outline: "none",
                      }}
                    >
                      {CATEGORY_OPTIONS.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "10px", fontWeight: 600, color: "#52647f", marginBottom: "3px" }}>
                      Brand / Manufacturer
                    </label>
                    <input
                      list="brand-suggestions"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="e.g. Toyota Genuine, Brembo"
                      style={{
                        width: "100%",
                        height: "32px",
                        padding: "0 10px",
                        border: "1px solid #dfe5ee",
                        borderRadius: "5px",
                        fontSize: "11px",
                        color: "#1e293b",
                        background: "#ffffff",
                        outline: "none",
                      }}
                    />
                    <datalist id="brand-suggestions">
                      {BRAND_OPTIONS.map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "10px", fontWeight: 600, color: "#52647f", marginBottom: "3px" }}>
                    Vehicle Compatibility / Fitment
                  </label>
                  <input
                    value={compatibility}
                    onChange={(e) => setCompatibility(e.target.value)}
                    placeholder="e.g. Toyota Land Cruiser (2015-2024), Lexus LX570, or Universal"
                    style={{
                      width: "100%",
                      height: "32px",
                      padding: "0 10px",
                      border: "1px solid #dfe5ee",
                      borderRadius: "5px",
                      fontSize: "11px",
                      color: "#1e293b",
                      background: "#ffffff",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "10px", fontWeight: 600, color: "#52647f", marginBottom: "3px" }}>
                    Supplier / Auto Parts Distributor
                  </label>
                  <input
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="e.g. Al-Futtaim Auto Parts Qatar"
                    style={{
                      width: "100%",
                      height: "32px",
                      padding: "0 10px",
                      border: "1px solid #dfe5ee",
                      borderRadius: "5px",
                      fontSize: "11px",
                      color: "#1e293b",
                      background: "#ffffff",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Right Column Card: Inventory Quantities & Pricing Structure */}
              <div
                className="view-info-card"
                style={{ display: "flex", flexDirection: "column", gap: "11px" }}
              >
                <div className="view-info-card-title">
                  <Coins size={14} />
                  <h3>Stock, Pricing &amp; Financial Margin (QAR)</h3>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "10px", fontWeight: 600, color: "#52647f", marginBottom: "3px" }}>
                      Initial Stock Qty
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      style={{
                        width: "100%",
                        height: "32px",
                        padding: "0 10px",
                        border: "1px solid #dfe5ee",
                        borderRadius: "5px",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#1e293b",
                        background: "#ffffff",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "10px", fontWeight: 600, color: "#52647f", marginBottom: "3px" }}>
                      Low Stock Alert Level
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={lowStockAt}
                      onChange={(e) => setLowStockAt(e.target.value)}
                      style={{
                        width: "100%",
                        height: "32px",
                        padding: "0 10px",
                        border: "1px solid #dfe5ee",
                        borderRadius: "5px",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#1e293b",
                        background: "#ffffff",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "10px", fontWeight: 600, color: "#52647f", marginBottom: "3px" }}>
                      Unit Cost (QAR)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={unitCost}
                      onChange={(e) => setUnitCost(e.target.value)}
                      style={{
                        width: "100%",
                        height: "32px",
                        padding: "0 10px",
                        border: "1px solid #dfe5ee",
                        borderRadius: "5px",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#1e293b",
                        background: "#ffffff",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "#ff631c", marginBottom: "3px" }}>
                      Selling Price (QAR) *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      style={{
                        width: "100%",
                        height: "32px",
                        padding: "0 10px",
                        border: "1.5px solid #ff631c",
                        borderRadius: "5px",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#ea580c",
                        background: "#ffffff",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "10px", fontWeight: 600, color: "#52647f", marginBottom: "3px" }}>
                    Commission Margin (QAR)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    placeholder="e.g. 15"
                    style={{
                      width: "100%",
                      height: "32px",
                      padding: "0 10px",
                      border: "1px solid #dfe5ee",
                      borderRadius: "5px",
                      fontSize: "12px",
                      color: "#1e293b",
                      background: "#ffffff",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Live Margin & Profit Calculation Card */}
                <div
                  style={{
                    marginTop: "auto",
                    padding: "10px 12px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderLeft: "3px solid #10b981",
                    borderRadius: "5px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                  }}
                >
                  <div>
                    <span style={{ display: "block", fontSize: "9px", color: "#64748b", fontWeight: 600 }}>Estimated Gross Profit</span>
                    <strong style={{ fontSize: "13px", color: (Number(sellingPrice) - Number(unitCost)) >= 0 ? "#059669" : "#e11d48" }}>
                      QAR {((parseFloat(sellingPrice) || 0) - (parseFloat(unitCost) || 0)).toFixed(2)}
                    </strong>
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: "9px", color: "#64748b", fontWeight: 600 }}>Profit Margin</span>
                    <strong style={{ fontSize: "13px", color: "#0f172a" }}>
                      {parseFloat(sellingPrice) > 0
                        ? `${Math.round((((parseFloat(sellingPrice) || 0) - (parseFloat(unitCost) || 0)) / parseFloat(sellingPrice)) * 100)}%`
                        : "0%"}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CRM Theme Footer Actions */}
          <div
            style={{
              padding: "10px 18px",
              background: "#ffffff",
              borderTop: "1px solid #e9edf3",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "8px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                height: "32px",
                padding: "0 14px",
                borderRadius: "5px",
                border: "1px solid #dfe5ee",
                background: "#ffffff",
                color: "#52647f",
                fontSize: "11px",
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
                height: "32px",
                padding: "0 18px",
                borderRadius: "5px",
                border: "none",
                background: "linear-gradient(110deg, #ff631c, #f04c08)",
                color: "#ffffff",
                fontSize: "11px",
                fontWeight: 700,
                cursor: isSubmitting ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 6px rgba(240, 76, 8, 0.25)",
              }}
            >
              {initialData ? <Pencil size={13} /> : <Plus size={14} />}
              <span>{isSubmitting ? "Saving..." : initialData ? "Update Part Details" : "Save Part to Inventory"}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
