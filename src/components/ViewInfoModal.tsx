import { useEffect, useState } from "react";
import {
  X,
  CarFront,
  UserRound,
  Wrench,
  Clock3,
  CreditCard,
  Layers,
  Activity,
} from "lucide-react";
import {
  customersApi,
  vehiclesApi,
  workOrdersApi,
  invoicesApi,
  quotationsApi,
} from "../lib/api";

export interface ViewInfoTarget {
  type: "customer" | "vehicle" | "invoice";
  data: any;
}

interface ViewInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: ViewInfoTarget | null;
  notify?: (msg: string) => void;
}

const money = (val: number | string) =>
  `QAR ${(Number(val) || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function ViewInfoModal({
  isOpen,
  onClose,
  target,
}: ViewInfoModalProps) {
  const [activeTab, setActiveTab] = useState<"all" | "history" | "parts" | "billing">("all");
  const [isLoading, setIsLoading] = useState(false);

  // Aggregated data state
  const [customerRecord, setCustomerRecord] = useState<any>(null);
  const [vehicleRecord, setVehicleRecord] = useState<any>(null);
  const [workOrdersList, setWorkOrdersList] = useState<any[]>([]);
  const [invoicesList, setInvoicesList] = useState<any[]>([]);
  const [quotationsList, setQuotationsList] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen || !target) return;
    setActiveTab("all");

    const raw = target.data || {};
    const customerQuery = raw.customer || raw.name || raw.customerName || "";
    const plateQuery = raw.plate || raw.plateNumber || "";
    const phoneQuery = raw.phone || raw.mobile || raw.customerPhone || "";
    const vehicleQuery = raw.vehicle || raw.model || raw.carName || "";

    setIsLoading(true);

    Promise.allSettled([
      customersApi.getAll({ search: customerQuery || phoneQuery, limit: 10 }),
      vehiclesApi.getAll({ search: plateQuery || customerQuery, limit: 10 }),
      workOrdersApi.getAll({ search: customerQuery || plateQuery, limit: 50 }),
      invoicesApi.getAll({ search: customerQuery || plateQuery, limit: 50 }),
      quotationsApi.getAll({ search: customerQuery || plateQuery, limit: 50 }),
    ]).then(([custRes, vehRes, woRes, invRes, quoteRes]) => {
      // Find matching customer
      if (custRes.status === "fulfilled" && custRes.value?.data?.length) {
        const found = custRes.value.data.find(
          (c: any) =>
            (customerQuery && c.name?.toLowerCase() === customerQuery.toLowerCase()) ||
            (phoneQuery && c.phone === phoneQuery)
        ) || custRes.value.data[0];
        setCustomerRecord(found);
      } else {
        setCustomerRecord({
          name: customerQuery || "Walk-in Customer",
          phone: phoneQuery || "N/A",
          email: raw.email || "N/A",
          address: raw.address || "Doha, Qatar",
          type: raw.type || "Individual",
          status: raw.status || "Active",
          notes: raw.notes || "",
        });
      }

      // Find matching vehicle
      if (vehRes.status === "fulfilled" && vehRes.value?.data?.length) {
        const found = vehRes.value.data.find(
          (v: any) =>
            (plateQuery && v.plate?.toLowerCase() === plateQuery.toLowerCase()) ||
            (customerQuery && v.customer?.toLowerCase() === customerQuery.toLowerCase())
        ) || vehRes.value.data[0];
        setVehicleRecord(found);
      } else {
        setVehicleRecord({
          plate: plateQuery || "TBD",
          model: vehicleQuery || "Vehicle",
          year: raw.year || "2024",
          color: raw.color || "Standard",
          chassisNumber: raw.chassisNumber || "N/A",
          engineNumber: raw.engineNumber || "N/A",
          mileage: raw.mileage || "0",
          fuel: raw.fuel || raw.fuelType || "Petrol",
          vehicleType: raw.vehicleType || "Sedan",
          bodyType: raw.bodyType || "Standard",
          registrationExpiry: raw.registrationExpiry || "N/A",
          insuranceExpiry: raw.insuranceExpiry || "N/A",
          status: raw.status || "Due",
          notes: raw.notes || "",
        });
      }

      // Filter work orders
      if (woRes.status === "fulfilled" && woRes.value?.data) {
        const filtered = woRes.value.data.filter((wo: any) => {
          const matchCust = customerQuery && wo.customer?.toLowerCase().includes(customerQuery.toLowerCase());
          const matchPlate = plateQuery && wo.plate?.toLowerCase().includes(plateQuery.toLowerCase());
          return matchCust || matchPlate;
        });
        setWorkOrdersList(filtered.length ? filtered : woRes.value.data.slice(0, 3));
      }

      // Filter invoices
      if (invRes.status === "fulfilled" && invRes.value?.data) {
        const filtered = invRes.value.data.filter((inv: any) => {
          const matchCust = customerQuery && inv.customer?.toLowerCase().includes(customerQuery.toLowerCase());
          const matchPlate = plateQuery && inv.plate?.toLowerCase().includes(plateQuery.toLowerCase());
          return matchCust || matchPlate;
        });
        setInvoicesList(filtered.length ? filtered : invRes.value.data.slice(0, 3));
      }

      // Filter quotations
      if (quoteRes.status === "fulfilled" && quoteRes.value?.data) {
        const filtered = quoteRes.value.data.filter((q: any) => {
          const matchCust = customerQuery && q.customer?.toLowerCase().includes(customerQuery.toLowerCase());
          const matchPlate = plateQuery && q.plate?.toLowerCase().includes(plateQuery.toLowerCase());
          return matchCust || matchPlate;
        });
        setQuotationsList(filtered.length ? filtered : quoteRes.value.data.slice(0, 3));
      }

      setIsLoading(false);
    });
  }, [isOpen, target]);

  if (!isOpen || !target) return null;

  const raw = target.data || {};
  const customerName = customerRecord?.name || raw.customer || raw.name || "Customer";
  const vehicleName = vehicleRecord?.model || raw.vehicle || raw.model || "Vehicle";
  const plateNumber = vehicleRecord?.plate || raw.plate || raw.plateNumber || "TBD";
  const yearNumber = vehicleRecord?.year || raw.year || "2024";

  // Aggregate external parts & labour charges across work orders
  const allExternalParts: any[] = [];
  const allLabourCharges: any[] = [];
  workOrdersList.forEach((wo) => {
    if (Array.isArray(wo.externalParts)) {
      wo.externalParts.forEach((p: any) => allExternalParts.push({ ...p, woId: wo.id || wo.workOrderId }));
    }
    if (Array.isArray(wo.labourCharges)) {
      wo.labourCharges.forEach((l: any) => allLabourCharges.push({ ...l, woId: wo.id || wo.workOrderId }));
    }
  });

  const latestOrder = workOrdersList[0];

  return (
    <div className="view-info-backdrop" onClick={onClose}>
      <div className="view-info-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header matching CRM page headings */}
        <div className="view-info-header">
          <div className="view-info-header-identity">
            <span className="view-info-avatar">
              <CarFront size={18} />
            </span>
            <div>
              <div className="view-info-header-titles">
                <h2>Customer &amp; Vehicle File</h2>
              </div>
              <p className="view-info-header-sub">
                Customer: <strong>{customerName}</strong> · Vehicle: {vehicleName} ({yearNumber}) · Plate: <strong>{plateNumber}</strong>
              </p>
            </div>
          </div>

          <div className="view-info-header-actions">
            <button
              type="button"
              className="view-info-close-btn"
              onClick={onClose}
              aria-label="Close dialog"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Tabs Bar styled like .intake-quotation-tabs */}
        <div className="view-info-tabs">
          <button
            type="button"
            className={activeTab === "all" ? "active" : ""}
            onClick={() => setActiveTab("all")}
          >
            <Layers size={13} />
            <span>Intake &amp; Vehicle Dossier</span>
          </button>
          <button
            type="button"
            className={activeTab === "history" ? "active" : ""}
            onClick={() => setActiveTab("history")}
          >
            <Clock3 size={13} />
            <span>Work Orders ({workOrdersList.length})</span>
          </button>
          <button
            type="button"
            className={activeTab === "parts" ? "active" : ""}
            onClick={() => setActiveTab("parts")}
          >
            <Wrench size={13} />
            <span>Parts &amp; Labour</span>
          </button>
          <button
            type="button"
            className={activeTab === "billing" ? "active" : ""}
            onClick={() => setActiveTab("billing")}
          >
            <CreditCard size={13} />
            <span>Invoices &amp; Billing ({invoicesList.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="view-info-body">
          {isLoading && (
            <div className="view-info-loading">
              <Activity size={18} />
              <span>Loading record details...</span>
            </div>
          )}

          {/* TAB 1: ALL INTAKE & FILE INFO */}
          {activeTab === "all" && (
            <div>
              <div className="view-info-grid">
                {/* Customer Information Card */}
                <div className="view-info-card">
                  <div className="view-info-card-title">
                    <UserRound size={14} />
                    <h3>Customer Information</h3>
                  </div>
                  <div className="view-info-fields-grid">
                    <div>
                      <span>Full Name</span>
                      <strong>{customerName}</strong>
                    </div>
                    <div>
                      <span>Phone / Mobile</span>
                      <strong>{customerRecord?.phone || raw.phone || "N/A"}</strong>
                    </div>
                    <div>
                      <span>Email Address</span>
                      <strong>{customerRecord?.email || raw.email || "N/A"}</strong>
                    </div>
                    <div>
                      <span>Customer Type</span>
                      <strong>{customerRecord?.type || "Individual"}</strong>
                    </div>
                    <div>
                      <span>Address / Area</span>
                      <strong>{customerRecord?.address || raw.address || "Doha, Qatar"}</strong>
                    </div>
                    <div>
                      <span>Customer Status</span>
                      <strong style={{ color: "#078348" }}>{customerRecord?.status || "Active"}</strong>
                    </div>
                  </div>
                  {customerRecord?.notes && (
                    <div className="view-info-note-box">
                      <small>Customer Notes</small>
                      <p>{customerRecord.notes}</p>
                    </div>
                  )}
                </div>

                {/* Vehicle Specifications Card */}
                <div className="view-info-card">
                  <div className="view-info-card-title">
                    <CarFront size={14} />
                    <h3>Vehicle Complete Specifications</h3>
                  </div>
                  <div className="view-info-fields-grid three-col">
                    <div>
                      <span>Plate Number</span>
                      <strong>{plateNumber}</strong>
                    </div>
                    <div>
                      <span>Car Name / Model</span>
                      <strong>{vehicleName}</strong>
                    </div>
                    <div>
                      <span>Model Year</span>
                      <strong>{yearNumber}</strong>
                    </div>
                    <div>
                      <span>Color</span>
                      <strong>{vehicleRecord?.color || "Standard"}</strong>
                    </div>
                    <div>
                      <span>Chassis / VIN</span>
                      <strong>{vehicleRecord?.chassisNumber || "N/A"}</strong>
                    </div>
                    <div>
                      <span>Engine Number</span>
                      <strong>{vehicleRecord?.engineNumber || "N/A"}</strong>
                    </div>
                    <div>
                      <span>Mileage (Odometer)</span>
                      <strong>{vehicleRecord?.mileage || "0"} KM</strong>
                    </div>
                    <div>
                      <span>Fuel Type</span>
                      <strong>{vehicleRecord?.fuel || vehicleRecord?.fuelType || "Petrol"}</strong>
                    </div>
                    <div>
                      <span>Vehicle Category</span>
                      <strong>{vehicleRecord?.vehicleType || "Sedan"}</strong>
                    </div>
                    <div>
                      <span>Body Type</span>
                      <strong>{vehicleRecord?.bodyType || "Standard"}</strong>
                    </div>
                    <div>
                      <span>Registration Expiry</span>
                      <strong>{vehicleRecord?.registrationExpiry || "N/A"}</strong>
                    </div>
                    <div>
                      <span>Insurance Expiry</span>
                      <strong>{vehicleRecord?.insuranceExpiry || "N/A"}</strong>
                    </div>
                  </div>
                  {vehicleRecord?.notes && (
                    <div className="view-info-note-box">
                      <small>Vehicle Remarks</small>
                      <p>{vehicleRecord.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Latest Intake Diagnosis & Snapshot Card */}
              <div className="view-info-card full-width">
                <div className="view-info-card-title">
                  <Wrench size={14} />
                  <h3>Latest Intake &amp; Service Snapshot</h3>
                </div>
                {latestOrder ? (
                  <div>
                    <div className="view-info-fields-grid four-col">
                      <div>
                        <span>Current Work Order</span>
                        <strong>{latestOrder.id || latestOrder.workOrderId}</strong>
                      </div>
                      <div>
                        <span>Intake Date</span>
                        <strong>{latestOrder.date || "Recent"}</strong>
                      </div>
                      <div>
                        <span>Service Advisor</span>
                        <strong>{latestOrder.advisor || "Sheikh Ahmed"}</strong>
                      </div>
                      <div>
                        <span>Assigned Mechanic</span>
                        <strong>{latestOrder.mechanic || "Ali Hassan"}</strong>
                      </div>
                      <div>
                        <span>Primary Service</span>
                        <strong>{latestOrder.service || "General Inspection & Repair"}</strong>
                      </div>
                      <div>
                        <span>Work Order Status</span>
                        <strong style={{ color: "#176bd2" }}>{latestOrder.status || "In Progress"}</strong>
                      </div>
                      <div>
                        <span>Job Total (QAR)</span>
                        <strong style={{ color: "#f15a24" }}>{money(latestOrder.total || 0)}</strong>
                      </div>
                      <div>
                        <span>Quotations Linked</span>
                        <strong>{quotationsList.length} Quotes</strong>
                      </div>
                    </div>

                    <div className="view-info-note-box" style={{ marginTop: "10px" }}>
                      <small>Customer Complaints &amp; Instructions</small>
                      <p>{latestOrder.detail || latestOrder.notes || "Standard multi-point inspection and regular maintenance checkup."}</p>
                    </div>
                  </div>
                ) : (
                  <p className="view-info-empty-td" style={{ padding: "12px" }}>
                    No intake work orders currently recorded for this vehicle.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: WORK ORDERS HISTORY */}
          {activeTab === "history" && (
            <div className="view-info-table-wrap">
              <table className="view-info-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Work Order ID</th>
                    <th>Date</th>
                    <th>Service Type</th>
                    <th>Complaints / Description</th>
                    <th>Assigned Mechanic</th>
                    <th>Status</th>
                    <th>Total (QAR)</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrdersList.map((wo: any, index: number) => (
                    <tr key={wo.id || wo.workOrderId || index}>
                      <td>{index + 1}</td>
                      <td><strong>{wo.id || wo.workOrderId}</strong></td>
                      <td>{wo.date || "Recent"}</td>
                      <td>{wo.service || "General Repair"}</td>
                      <td style={{ maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {wo.detail || wo.notes || "Maintenance service"}
                      </td>
                      <td>{wo.mechanic || "Ali Hassan"}</td>
                      <td>
                        <span className={`vehicle-status-badge ${wo.status === "Completed" ? "ready" : "in-service"}`}>
                          {wo.status || "In Progress"}
                        </span>
                      </td>
                      <td><strong style={{ color: "#f15a24" }}>{money(wo.total || 0)}</strong></td>
                    </tr>
                  ))}
                  {workOrdersList.length === 0 && (
                    <tr>
                      <td colSpan={8} className="view-info-empty-td">
                        No work orders recorded for this customer / vehicle yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: PARTS & LABOUR BREAKDOWN */}
          {activeTab === "parts" && (
            <div className="view-info-grid">
              {/* External Parts Card */}
              <div className="view-info-card">
                <div className="view-info-card-title">
                  <Wrench size={14} />
                  <h3>External Parts Replaced</h3>
                </div>
                <div className="view-info-table-wrap">
                  <table className="view-info-table">
                    <thead>
                      <tr>
                        <th>Part Name</th>
                        <th>Supplier</th>
                        <th>Price</th>
                        <th>Commission</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allExternalParts.map((p, idx) => (
                        <tr key={idx}>
                          <td><strong>{p.name}</strong></td>
                          <td>{p.supplier || "Local Store"}</td>
                          <td>{money(p.originalPrice || 0)}</td>
                          <td>+{money(p.commission || 0)}</td>
                          <td><strong>{money((p.originalPrice || 0) + (p.commission || 0))}</strong></td>
                        </tr>
                      ))}
                      {allExternalParts.length === 0 && (
                        <tr>
                          <td colSpan={5} className="view-info-empty-td">No external parts recorded.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Labour Charges Card */}
              <div className="view-info-card">
                <div className="view-info-card-title">
                  <UserRound size={14} />
                  <h3>Labour &amp; Technician Charges</h3>
                </div>
                <div className="view-info-table-wrap">
                  <table className="view-info-table">
                    <thead>
                      <tr>
                        <th>Service</th>
                        <th>Mechanic</th>
                        <th>Hours</th>
                        <th>Rate</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allLabourCharges.map((l, idx) => (
                        <tr key={idx}>
                          <td><strong>{l.service}</strong></td>
                          <td>{l.mechanic || "Ali Hassan"}</td>
                          <td>{l.hours || "1"} hrs</td>
                          <td>{money(l.rate || l.amount)}</td>
                          <td><strong>{money(l.amount)}</strong></td>
                        </tr>
                      ))}
                      {allLabourCharges.length === 0 && (
                        <tr>
                          <td colSpan={5} className="view-info-empty-td">No labour charges recorded.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BILLING & INVOICES */}
          {activeTab === "billing" && (
            <div className="view-info-table-wrap">
              <table className="view-info-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Invoice No.</th>
                    <th>Date</th>
                    <th>Work Order</th>
                    <th>Service Type</th>
                    <th>Payment Status</th>
                    <th>Method</th>
                    <th>Grand Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoicesList.map((inv: any, idx: number) => (
                    <tr key={inv.id || inv.invoiceId || idx}>
                      <td>{idx + 1}</td>
                      <td><strong>{inv.id || inv.invoiceId}</strong></td>
                      <td>{inv.date || "Recent"}</td>
                      <td>#{inv.workOrder || "N/A"}</td>
                      <td>{inv.service || "General Service"}</td>
                      <td>
                        <span className={`vehicle-status-badge ${inv.status === "Paid" ? "ready" : "due"}`}>
                          {inv.status || "Pending"}
                        </span>
                      </td>
                      <td>{inv.paymentMethod || "Cash"}</td>
                      <td><strong style={{ color: "#f15a24" }}>{money(inv.amount || inv.total || 0)}</strong></td>
                    </tr>
                  ))}
                  {invoicesList.length === 0 && (
                    <tr>
                      <td colSpan={8} className="view-info-empty-td">
                        No invoices recorded for this customer / vehicle yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="view-info-footer">
          <span>
            Customer ID: {customerRecord?.id || "CUST"} · Plate: {plateNumber}
          </span>
          <button type="button" className="view-info-dismiss-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
