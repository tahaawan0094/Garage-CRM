import { useEffect, useMemo, useState } from "react";
import { workOrdersApi, invoicesApi } from "../lib/api";
import { getNextInvoiceId, commitInvoiceId } from "../lib/sequence";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import {
  Activity,
  CalendarDays,
  CarFront,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  ClipboardList,
  Clock3,
  FileText,
  Printer,
  Search,
  Trash2,
  Wrench,
  UserRound,
} from "lucide-react";

type WorkOrderStatus =
  | "In Progress"
  | "Awaiting Parts"
  | "Ready for Delivery"
  | "Completed"
  | "Invoiced"
  | "Cancelled";

type WorkOrder = {
  id: string;
  workOrderId?: string;
  date?: string;
  customer: string;
  customerPhone?: string;
  vehicle: string;
  plate: string;
  year?: string;
  service: string;
  detail?: string;
  mechanic: string;
  status: WorkOrderStatus;
  total: number;
  externalParts?: any[];
  labourCharges?: any[];
  additionalCharges?: any[];
  notes?: string;
  completionDate?: string;
  vehicleReady?: string;
  createdAt?: string;
};

const statusClass: Record<string, string> = {
  "In Progress": "in-progress",
  "Awaiting Parts": "awaiting",
  "Ready for Delivery": "ready",
  "Completed": "approved",
  "Invoiced": "paid",
  "Cancelled": "rejected",
};

const money = (value: number) =>
  `QAR ${(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function WorkOrders(props: {
  notify: (message: string) => void;
  onNavigateToInvoices?: () => void;
  refreshTrigger?: number;
}) {
  const { notify, refreshTrigger } = props;
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [mechanicFilter, setMechanicFilter] = useState("All Mechanics");
  const [page, setPage] = useState(1);

  // Selected Order Edit States
  const [repairStatus, setRepairStatus] = useState<WorkOrderStatus>("In Progress");
  const [assignedMechanic, setAssignedMechanic] = useState("Ali Hassan");
  const [repairDate, setRepairDate] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [vehicleReady, setVehicleReady] = useState("No - In Progress");
  const [technicianNotes, setTechnicianNotes] = useState("");
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const [deleteModalOrder, setDeleteModalOrder] = useState<WorkOrder | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);

  const handlePrintInvoice = () => {
    if (!selectedOrder) {
      notify("Please select a work order to print invoice.");
      return;
    }
    window.print();
  };

  const fetchOrders = () => {
    workOrdersApi
      .getAll({ limit: 100 })
      .then((res) => {
        const data = (res.data || []) as WorkOrder[];
        setOrders(data);
        if (data.length > 0 && !selectedId) {
          setSelectedId(data[0].id || data[0].workOrderId || "");
        }
      })
      .catch((err) => {
        console.warn("Could not fetch work orders:", err);
      });
  };

  useEffect(() => {
    fetchOrders();
  }, [refreshTrigger]);

  const handleConfirmDeleteOrder = async () => {
    if (!deleteModalOrder) return;
    setIsDeletingOrder(true);
    const idToDelete = deleteModalOrder.workOrderId || deleteModalOrder.id;
    try {
      await workOrdersApi.delete(idToDelete);
      setOrders((current) => current.filter((o) => (o.workOrderId || o.id) !== idToDelete));
      if ((selectedOrder?.workOrderId || selectedOrder?.id) === idToDelete) {
        setSelectedId("");
      }
      notify(`Work order ${idToDelete} deleted successfully.`);
      setDeleteModalOrder(null);
    } catch (err: any) {
      notify(`Failed to delete work order: ${err.message || "Unknown error"}`);
    } finally {
      setIsDeletingOrder(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderId = order.workOrderId || order.id || "";
      const text = `${orderId} ${order.customer} ${order.vehicle} ${order.plate} ${order.service} ${order.mechanic}`.toLowerCase();
      const matchesSearch = text.includes(search.trim().toLowerCase());
      const matchesStatus =
        statusFilter === "All Status" || order.status === statusFilter;
      const matchesMechanic =
        mechanicFilter === "All Mechanics" || order.mechanic === mechanicFilter;
      return matchesSearch && matchesStatus && matchesMechanic;
    });
  }, [orders, search, statusFilter, mechanicFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / 10));
  const currentPage = Math.min(page, pageCount);
  const pageOrders = filteredOrders.slice((currentPage - 1) * 10, currentPage * 10);

  const selectedOrder =
    filteredOrders.find(
      (order) => order.id === selectedId || order.workOrderId === selectedId
    ) ??
    filteredOrders[0] ??
    orders.find(
      (order) => order.id === selectedId || order.workOrderId === selectedId
    );

  // Sync selected order fields to panel state
  useEffect(() => {
    if (!selectedOrder) return;
    setRepairStatus(selectedOrder.status || "In Progress");
    setAssignedMechanic(selectedOrder.mechanic || "Ali Hassan");
    setRepairDate(
      selectedOrder.date ||
        new Date().toISOString().slice(0, 10)
    );
    setCompletionDate(selectedOrder.completionDate || "");
    setVehicleReady(
      selectedOrder.vehicleReady ||
        (selectedOrder.status === "Completed" || selectedOrder.status === "Invoiced"
          ? "Yes - Ready for Pickup"
          : "No - In Progress")
    );
    setTechnicianNotes(selectedOrder.notes || selectedOrder.detail || "");
  }, [selectedOrder?.id, selectedOrder?.workOrderId]);

  const counts = {
    total: orders.length,
    inProgress: orders.filter((o) => o.status === "In Progress").length,
    completed: orders.filter(
      (o) => o.status === "Completed" || o.status === "Ready for Delivery"
    ).length,
    invoiced: orders.filter((o) => o.status === "Invoiced").length,
  };

  // Save Invoice
  const handleSaveInvoice = async () => {
    if (!selectedOrder) return;
    setIsSavingInvoice(true);
    const targetId = selectedOrder.id || selectedOrder.workOrderId || "WO";
    const today = new Date().toISOString().slice(0, 10);

    // Prepare invoice items
    const partsItems = (selectedOrder.externalParts || []).map((p: any) => ({
      name: p.name || "Part",
      quantity: 1,
      unitPrice: (p.originalPrice || 0) + (p.commission || 0),
    }));

    const labourItems = (selectedOrder.labourCharges || []).map((l: any) => ({
      name: l.service || "Labour",
      quantity: l.hours || 1,
      unitPrice: l.amount || 0,
    }));

    const items =
      partsItems.length > 0 || labourItems.length > 0
        ? [...partsItems, ...labourItems]
        : [{ name: selectedOrder.service || "Service & Repair", quantity: 1, unitPrice: selectedOrder.total || 0 }];

    try {
      const nextInvoiceId = getNextInvoiceId();
      // 1. Create Invoice in MongoDB Atlas
      await invoicesApi.create({
        invoiceId: nextInvoiceId,
        customer: selectedOrder.customer || "Customer",
        phone: selectedOrder.customerPhone || "",
        vehicle: selectedOrder.vehicle || "Vehicle",
        plate: selectedOrder.plate || "TBD",
        year: selectedOrder.year || "2024",
        workOrder: targetId,
        service: selectedOrder.service || "General Repair",
        amount: selectedOrder.total || 0,
        status: "Pending",
        advisor: "Ali Hassan",
        items,
        date: today,
        dueDate: today,
      });
      commitInvoiceId(nextInvoiceId);

      // 2. Mark work order status as Invoiced / Completed
      await workOrdersApi.update(targetId, {
        status: "Invoiced",
        mechanic: assignedMechanic,
        completionDate: completionDate || today,
        vehicleReady: "Yes - Ready for Pickup",
        notes: technicianNotes,
      });

      setRepairStatus("Invoiced");
      setOrders((current) =>
        current.map((order) =>
          order.id === targetId || order.workOrderId === targetId
            ? { ...order, status: "Invoiced" }
            : order
        )
      );

      notify(`Invoice saved successfully for ${targetId}!`);
    } catch (err: any) {
      console.warn("Invoice creation error:", err);
      notify(`Failed to save invoice: ${err.message || "Error"}`);
    } finally {
      setIsSavingInvoice(false);
    }
  };

  return (
    <main className="quote-management">
      <header className="quote-page-heading">
        <div className="quote-page-title">
          <span><Wrench size={25} /></span>
          <div>
            <h1>Work Orders</h1>
            <p>Track active repair jobs, update repair status, and generate customer invoices.</p>
          </div>
        </div>
      </header>

      {/* Metrics Bar */}
      <section className="quote-metrics" aria-label="Work orders summary">
        <article>
          <span className="quote-metric-icon blue"><ClipboardList size={20} /></span>
          <div>
            <strong>{counts.total}</strong>
            <small>Total Work Orders</small>
          </div>
          <Activity size={23} className="quote-spark blue-text" />
        </article>
        <article>
          <span className="quote-metric-icon amber"><Clock3 size={19} /></span>
          <div>
            <strong>{counts.inProgress}</strong>
            <small>In Progress</small>
          </div>
          <Activity size={23} className="quote-spark amber-text" />
        </article>
        <article>
          <span className="quote-metric-icon green"><CircleCheck size={20} /></span>
          <div>
            <strong>{counts.completed}</strong>
            <small>Ready / Completed</small>
          </div>
          <Activity size={23} className="quote-spark green-text" />
        </article>
        <article>
          <span className="quote-metric-icon orange"><FileText size={20} /></span>
          <div>
            <strong>{counts.invoiced}</strong>
            <small>Invoiced</small>
          </div>
          <Activity size={23} className="quote-spark orange-text" />
        </article>
      </section>

      {/* Main Layout: Master-Detail */}
      <div className="quote-management-layout">
        {/* Table List Card */}
        <section className="quote-list-card">
          <div className="quote-filters">
            <label className="quote-search">
              <Search size={16} />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by work order ID, customer, vehicle, plate, service..."
                aria-label="Search work orders"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by work order status"
            >
              {[
                "All Status",
                "In Progress",
                "Ready for Delivery",
                "Completed",
                "Invoiced",
                "Awaiting Parts",
              ].map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
            <label className="quote-date-filter">
              <CalendarDays size={15} />
              <span>Active Orders</span>
            </label>
            <select
              value={mechanicFilter}
              onChange={(event) => {
                setMechanicFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by assigned mechanic"
            >
              {[
                "All Mechanics",
                "Ali Hassan",
                "M. Khan",
                "Ali Shah",
                "Sheikh Ahmed",
              ].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="quote-table-scroll">
            <table className="quote-management-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Work Order ID</th>
                  <th>Customer</th>
                  <th>Vehicle &amp; Plate</th>
                  <th>Service</th>
                  <th>Mechanic</th>
                  <th>Status</th>
                  <th>Total (QAR)</th>
                </tr>
              </thead>
              <tbody>
                {pageOrders.map((order, index) => {
                  const orderId = order.workOrderId || order.id;
                  const isSelected =
                    selectedOrder?.id === order.id ||
                    selectedOrder?.workOrderId === order.workOrderId;
                  return (
                    <tr
                      key={order.id || order.workOrderId || index}
                      className={isSelected ? "selected" : ""}
                      onClick={() => setSelectedId(orderId)}
                    >
                      <td>{(currentPage - 1) * 10 + index + 1}</td>
                      <td>
                        <button className="quote-id-link" type="button">
                          {orderId}
                        </button>
                      </td>
                      <td>
                        <strong>{order.customer}</strong>
                        {order.customerPhone && (
                          <small className="quote-muted-line">
                            {order.customerPhone}
                          </small>
                        )}
                      </td>
                      <td>
                        <div className="quote-vehicle-cell">
                          <CarFront size={16} />
                          <span>
                            <strong>{order.vehicle}</strong>
                            <small>Plate: {order.plate || "TBD"}</small>
                          </span>
                        </div>
                      </td>
                      <td>{order.service || "General Service"}</td>
                      <td>{order.mechanic || "Unassigned"}</td>
                      <td>
                        <span
                          className={`quote-status-badge ${
                            statusClass[order.status] || "in-progress"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td>
                        <strong className="quote-amount">
                          {money(order.total)}
                        </strong>
                      </td>
                    </tr>
                  );
                })}

                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="quote-empty">
                      No approved work orders found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <footer className="quote-table-footer">
            <span>
              Showing {filteredOrders.length === 0 ? 0 : (currentPage - 1) * 10 + 1}{" "}
              to {Math.min(currentPage * 10, filteredOrders.length)} of{" "}
              {filteredOrders.length} work orders
            </span>
            <div>
              <button
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
              </button>
              <button className="active">{currentPage}</button>
              <button
                disabled={currentPage === pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                aria-label="Next page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </footer>
        </section>

        {/* Right Side: Repair Done & Invoice Action Panel */}
        {selectedOrder ? (
          <aside className="quote-detail-card" style={{ padding: "12px" }}>
            <header>
              <div>
                <Wrench size={16} />
                <strong>Repair Done Panel</strong>
              </div>
              <span
                className={`quote-status-badge ${
                  statusClass[repairStatus] || "in-progress"
                }`}
              >
                {repairStatus}
              </span>
            </header>

            <div className="quote-detail-number" style={{ marginTop: "10px" }}>
              <div>
                <small style={{ color: "#718099", fontSize: "10px" }}>
                  Work Order No.
                </small>
                <strong style={{ fontSize: "16px", display: "block" }}>
                  {selectedOrder.workOrderId || selectedOrder.id}
                </strong>
              </div>
              <strong style={{ fontSize: "15px", color: "#f15a24" }}>
                {money(selectedOrder.total)}
              </strong>
            </div>

            {/* Customer & Vehicle Info */}
            <div className="quote-detail-block">
              <h3>
                <UserRound size={14} />
                Customer &amp; Vehicle
              </h3>
              <strong>{selectedOrder.customer}</strong>
              <span>
                {selectedOrder.vehicle} · Plate: {selectedOrder.plate || "TBD"}
              </span>
              {selectedOrder.customerPhone && (
                <span style={{ fontSize: "9px", color: "#506982" }}>
                  Phone: {selectedOrder.customerPhone}
                </span>
              )}
            </div>

            {/* Repair Controls Form */}
            <div
              className="quote-detail-block"
              style={{ gap: "8px", borderTop: "1px solid #edf0f4" }}
            >
              <h3>
                <ClipboardList size={14} />
                Repair Information
              </h3>

              <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "9px" }}>
                <span style={{ color: "#52647f", fontWeight: 600 }}>Repair Date</span>
                <input
                  type="date"
                  style={{
                    height: "30px",
                    padding: "0 8px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "4px",
                    fontSize: "10px",
                    background: "#fff",
                  }}
                  value={repairDate}
                  onChange={(e) => setRepairDate(e.target.value)}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "9px" }}>
                <span style={{ color: "#52647f", fontWeight: 600 }}>Assigned Mechanic</span>
                <select
                  style={{
                    height: "30px",
                    padding: "0 8px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "4px",
                    fontSize: "10px",
                    background: "#fff",
                  }}
                  value={assignedMechanic}
                  onChange={(e) => setAssignedMechanic(e.target.value)}
                >
                  <option>Ali Hassan</option>
                  <option>M. Khan</option>
                  <option>Ali Shah</option>
                  <option>Sheikh Ahmed</option>
                </select>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "9px" }}>
                <span style={{ color: "#52647f", fontWeight: 600 }}>Repair Status</span>
                <select
                  style={{
                    height: "30px",
                    padding: "0 8px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "4px",
                    fontSize: "10px",
                    background: "#fff",
                  }}
                  value={repairStatus}
                  onChange={(e) => {
                    const next = e.target.value as WorkOrderStatus;
                    setRepairStatus(next);
                    if (next === "Completed") {
                      setVehicleReady("Yes - Ready for Pickup");
                    }
                  }}
                >
                  <option>In Progress</option>
                  <option>Ready for Delivery</option>
                  <option>Completed</option>
                  <option>Awaiting Parts</option>
                </select>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "9px" }}>
                <span style={{ color: "#52647f", fontWeight: 600 }}>Vehicle Ready</span>
                <select
                  style={{
                    height: "30px",
                    padding: "0 8px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "4px",
                    fontSize: "10px",
                    background: "#fff",
                  }}
                  value={vehicleReady}
                  onChange={(e) => setVehicleReady(e.target.value)}
                >
                  <option>Yes - Ready for Pickup</option>
                  <option>No - In Progress</option>
                  <option>No - Awaiting Parts</option>
                </select>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "9px" }}>
                <span style={{ color: "#52647f", fontWeight: 600 }}>Technician Notes</span>
                <textarea
                  rows={2}
                  value={technicianNotes}
                  onChange={(e) => setTechnicianNotes(e.target.value)}
                  placeholder="Record work completed on vehicle..."
                  style={{
                    padding: "6px",
                    border: "1px solid #dfe5ee",
                    borderRadius: "4px",
                    fontSize: "10px",
                    color: "#263a57",
                    resize: "vertical",
                  }}
                />
              </label>
            </div>

            {/* Repair Confirmation Box */}
            <div
              className={`intake-repair-confirmation ${
                repairStatus === "Completed" || repairStatus === "Invoiced"
                  ? "is-complete"
                  : ""
              }`}
              style={{ margin: "8px 0", padding: "8px" }}
            >
              <span className="intake-repair-confirmation-icon" style={{ width: "24px", height: "24px" }}>
                <Check size={14} />
              </span>
              <div>
                <strong style={{ fontSize: "10px" }}>
                  {repairStatus === "Completed" || repairStatus === "Invoiced"
                    ? "Repair work completed."
                    : "Repair is currently in progress."}
                </strong>
                <p style={{ fontSize: "9px" }}>
                  {vehicleReady.startsWith("Yes")
                    ? "Vehicle is confirmed ready for delivery."
                    : "Verify inspection before customer handover."}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                marginTop: "10px",
                borderTop: "1px solid #edf0f4",
                paddingTop: "10px",
              }}
            >

              <button
                type="button"
                className="intake-action-button orange"
                disabled={isSavingInvoice}
                style={{
                  minHeight: "34px",
                  fontSize: "11px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  background: "linear-gradient(110deg, #ff631c, #f04c08)",
                  color: "#fff",
                  borderRadius: "5px",
                  border: 0,
                  cursor: "pointer",
                }}
                onClick={handleSaveInvoice}
              >
                <FileText size={15} />
                {isSavingInvoice ? "Saving Invoice..." : "Save Invoice"}
              </button>

              <button
                type="button"
                className="intake-action-button"
                style={{
                  minHeight: "34px",
                  fontSize: "11px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  background:
                    repairStatus === "Completed" ||
                    repairStatus === "Invoiced" ||
                    selectedOrder.status === "Invoiced"
                      ? "linear-gradient(110deg, #10b981, #059669)"
                      : "#2563eb",
                  color: "#fff",
                  borderRadius: "5px",
                  border: 0,
                  cursor: "pointer",
                }}
                onClick={handlePrintInvoice}
              >
                <Printer size={14} />
                Print Invoice
              </button>

              <button
                type="button"
                className="intake-action-button outline"
                style={{
                  minHeight: "28px",
                  fontSize: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "5px",
                }}
                onClick={() => window.print()}
              >
                <Printer size={13} />
                Print Job Card
              </button>

              <button
                type="button"
                className="intake-action-button"
                style={{
                  minHeight: "28px",
                  fontSize: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "5px",
                  background: "#fff1f2",
                  color: "#e11d48",
                  border: "1px solid #fecaca",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontWeight: 600,
                  marginTop: "4px",
                }}
                onClick={() => setDeleteModalOrder(selectedOrder)}
              >
                <Trash2 size={13} />
                Delete Work Order
              </button>
            </div>
          </aside>
        ) : (
          <aside className="quote-detail-card" style={{ padding: "20px", textAlign: "center" }}>
            <ClipboardList size={36} style={{ color: "#94a3b8", margin: "0 auto 8px" }} />
            <p style={{ color: "#64748b", fontSize: "11px" }}>
              Select a work order from the list to view repair details and generate invoice.
            </p>
          </aside>
        )}
      </div>

      {/* Off-screen / Print-only Single-Page Tax Invoice */}
      {selectedOrder && (
        <div className="printable-tax-invoice-wrapper" id="printable-tax-invoice">
          <div className="printable-tax-invoice">
            {/* Tax Invoice Document Header */}
            <div className="tax-invoice-header">
              <div className="tax-invoice-brand">
                <h2>GARAGE WORKSPACE</h2>
                <p>Auto Care &amp; Service Center · Doha, Qatar</p>
                <p>Phone: +974 5555 1234 · C.R: 84920/1</p>
              </div>
              <div className="tax-invoice-meta">
                <span className="tax-invoice-badge">TAX INVOICE / فاتورة ضريبية</span>
                <h3>
                  INV-{String((selectedOrder.workOrderId || selectedOrder.id || "1").replace(/^WO-?/, "")).padStart(5, "0")}
                </h3>
                <p>Date: {repairDate || new Date().toLocaleDateString("en-GB")}</p>
                <p>Work Order: #{selectedOrder.workOrderId || selectedOrder.id}</p>
              </div>
            </div>

            {/* Customer & Vehicle Grid */}
            <div className="tax-invoice-grid">
              <div>
                <strong>Billed To Customer</strong>
                <div className="party-name">{selectedOrder.customer}</div>
                <div className="party-detail">Phone: {selectedOrder.customerPhone || "N/A"}</div>
              </div>
              <div>
                <strong>Vehicle Details</strong>
                <div className="party-name">{selectedOrder.vehicle}</div>
                <div className="party-detail">
                  Plate: {selectedOrder.plate || "TBD"} · Mechanic: {assignedMechanic}
                </div>
              </div>
            </div>

            {/* Service & Items Table */}
            <table className="tax-invoice-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Description / Service</th>
                  <th style={{ textAlign: "center", width: "55px" }}>Qty</th>
                  <th style={{ textAlign: "right", width: "115px" }}>Amount (QAR)</th>
                </tr>
              </thead>
              <tbody>
                {((selectedOrder.externalParts && selectedOrder.externalParts.length > 0) ||
                (selectedOrder.labourCharges && selectedOrder.labourCharges.length > 0)) ? (
                  <>
                    {(selectedOrder.externalParts || []).map((part: any, idx: number) => {
                      const price = (part.originalPrice || 0) + (part.commission || 0);
                      return (
                        <tr key={`part-${idx}`}>
                          <td>
                            <div className="item-title">{part.name || "Part"}</div>
                          </td>
                          <td style={{ textAlign: "center" }}>1</td>
                          <td style={{ textAlign: "right", fontWeight: 600 }}>{money(price)}</td>
                        </tr>
                      );
                    })}
                    {(selectedOrder.labourCharges || []).map((labour: any, idx: number) => {
                      const amount = labour.amount || 0;
                      return (
                        <tr key={`labour-${idx}`}>
                          <td>
                            <div className="item-title">{labour.service || "Labour"}</div>
                            {technicianNotes && idx === 0 && (
                              <small className="item-notes">Notes: {technicianNotes}</small>
                            )}
                          </td>
                          <td style={{ textAlign: "center" }}>{labour.hours || 1}</td>
                          <td style={{ textAlign: "right", fontWeight: 600 }}>{money(amount)}</td>
                        </tr>
                      );
                    })}
                  </>
                ) : (
                  <tr>
                    <td>
                      <div className="item-title">{selectedOrder.service || "General Service & Repair"}</div>
                      {technicianNotes && (
                        <small className="item-notes">Notes: {technicianNotes}</small>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>1</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{money(selectedOrder.total)}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Totals Section */}
            <div className="tax-invoice-totals-wrap">
              <div className="tax-invoice-totals">
                <div>
                  <span>Subtotal</span>
                  <strong>{money(selectedOrder.total)}</strong>
                </div>
                <div>
                  <span>VAT (5%)</span>
                  <strong>{money(0)}</strong>
                </div>
                <div className="grand-total-row">
                  <span>Grand Total</span>
                  <span>{money(selectedOrder.total)}</span>
                </div>
              </div>
            </div>

            {/* Footer Notes & Signature */}
            <div className="tax-invoice-footer">
              <div>
                <p className="thank-you">Thank you for your business!</p>
                <p className="warranty">Warranty valid for 30 days or 1,000 km from service date.</p>
              </div>
              <div className="signature-box">
                <div className="signature-line" />
                <span>Authorized Signature</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={!!deleteModalOrder}
        itemType="Work Order"
        itemId={deleteModalOrder?.workOrderId || deleteModalOrder?.id || ""}
        onConfirm={handleConfirmDeleteOrder}
        onCancel={() => setDeleteModalOrder(null)}
        isDeleting={isDeletingOrder}
      />
    </main>
  );
}

export default WorkOrders;
